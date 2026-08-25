const crypto = require("crypto");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const PurchaseOrder = require("../models/PurchaseOrder");
const GoodsReceipt = require("../models/GoodsReceipt");
const Supplier = require("../models/Supplier");
const AuditLog = require("../models/AuditLog");
const { generateInvoicePdf } = require("./invoicePdfService");
const { storeDocument } = require("./documentStorage");

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
const moneyEqual = (left, right) =>
  Math.abs(Number(left || 0) - Number(right || 0)) < 0.01;
const numberEqual = (left, right) => Number(left || 0) === Number(right || 0);

function createReference(prefix) {
  return `${prefix}-${Date.now().toString().slice(-8)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

function parseItems(rawItems, purchaseOrder) {
  let items = rawItems;
  if (typeof rawItems === "string" && rawItems.trim()) {
    try {
      items = JSON.parse(rawItems);
    } catch (error) {
      const parseError = new Error("Invoice items must be valid JSON.");
      parseError.statusCode = 400;
      throw parseError;
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    items = purchaseOrder.items.map((item) => ({
      product: item.product,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
  }

  return items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (
      !item.productName ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      const validationError = new Error(
        "Every invoice line requires an item, quantity greater than 0, and price per unit greater than 0.",
      );
      validationError.statusCode = 400;
      throw validationError;
    }
    return {
      product: item.product || null,
      productName: String(item.productName).trim(),
      description: String(item.description || item.productName).trim(),
      quantity,
      unitPrice: roundMoney(unitPrice),
      totalPrice: roundMoney(quantity * unitPrice),
    };
  });
}

async function getInvoiceContext(poNumber) {
  const normalizedPoNumber = String(poNumber || "")
    .trim()
    .toUpperCase();
  if (!normalizedPoNumber) {
    const error = new Error("Purchase Order number is required.");
    error.statusCode = 400;
    throw error;
  }

  const purchaseOrder = await PurchaseOrder.findOne({
    poNumber: normalizedPoNumber,
  }).populate("supplier");
  if (!purchaseOrder) {
    const error = new Error(
      `Purchase Order '${normalizedPoNumber}' was not found.`,
    );
    error.statusCode = 404;
    throw error;
  }

  const supplier =
    purchaseOrder.supplier ||
    (await Supplier.findOne({ name: purchaseOrder.supplierName }));
  if (!supplier) {
    const error = new Error(
      `Supplier master record for '${purchaseOrder.supplierName}' was not found.`,
    );
    error.statusCode = 409;
    throw error;
  }

  const goodsReceipts = await GoodsReceipt.find({
    poNumber: normalizedPoNumber,
  }).sort({ receivedDate: 1 });
  return { purchaseOrder, supplier, goodsReceipts };
}

function receivedItemsForPurchaseOrder(purchaseOrder, goodsReceipts) {
  const receivedByName = new Map();
  goodsReceipts.forEach((receipt) => {
    receipt.items.forEach((item) => {
      const key = normalizeText(item.productName);
      const current = receivedByName.get(key) || 0;
      receivedByName.set(key, current + Number(item.acceptedQuantity || 0));
    });
  });

  return purchaseOrder.items
    .map((item) => ({
      product: item.product,
      productName: item.productName,
      description: item.productName,
      quantity: receivedByName.get(normalizeText(item.productName)) || 0,
      unitPrice: roundMoney(item.unitPrice),
      totalPrice: roundMoney(
        (receivedByName.get(normalizeText(item.productName)) || 0) *
          item.unitPrice,
      ),
    }))
    .filter((item) => item.quantity > 0);
}

async function createGeneratedInvoice({
  poNumber,
  taxRate = 0,
  shippingAmount = 0,
  sourceType,
  user,
  publicBaseUrl,
}) {
  const { purchaseOrder, supplier, goodsReceipts } =
    await getInvoiceContext(poNumber);
  if (
    !goodsReceipts.length ||
    !["PARTIALLY_RECEIVED", "RECEIVED", "COMPLETED"].includes(
      purchaseOrder.status,
    )
  ) {
    const error = new Error(
      "An invoice can be generated only after the warehouse has received goods and a GRN exists.",
    );
    error.statusCode = 409;
    throw error;
  }

  if (
    user?.role === "supplier" &&
    String(user.supplier) !== String(supplier._id)
  ) {
    const error = new Error(
      "This Purchase Order is not assigned to your supplier account.",
    );
    error.statusCode = 403;
    throw error;
  }

  const existing = await Invoice.findOne({
    purchaseOrder: purchaseOrder._id,
    sourceType,
    submissionStatus: { $ne: "REJECTED" },
  });
  if (existing) {
    const error = new Error(
      `A ${sourceType === "SUPPLIER_GENERATED" ? "supplier" : "final"} invoice already exists for ${purchaseOrder.poNumber}. Open REAL INVOICE to view it.`,
    );
    error.statusCode = 409;
    throw error;
  }

  const items = receivedItemsForPurchaseOrder(purchaseOrder, goodsReceipts);
  if (!items.length) {
    const error = new Error(
      "The GRN contains no accepted quantity, so an invoice cannot be generated.",
    );
    error.statusCode = 409;
    throw error;
  }

  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.totalPrice, 0),
  );
  const safeTaxRate = Math.max(0, Number(taxRate || 0));
  const taxAmount = roundMoney((subtotal * safeTaxRate) / 100);
  const safeShipping = Math.max(0, roundMoney(shippingAmount));
  const invoiceNumber = createReference(
    sourceType === "SUPPLIER_GENERATED" ? "SINV" : "FINV",
  );

  const invoice = new Invoice({
    invoiceNumber,
    purchaseOrder: purchaseOrder._id,
    supplier: supplier._id,
    supplierUser: user?.role === "supplier" ? user._id : null,
    supplierName: supplier.name,
    poNumber: purchaseOrder.poNumber,
    items,
    subtotal,
    taxRate: safeTaxRate,
    taxAmount,
    shippingAmount: safeShipping,
    totalAmount: roundMoney(subtotal + taxAmount + safeShipping),
    paymentTerms: supplier.paymentTerms || "Net 30",
    sourceType,
    submissionStatus:
      sourceType === "SUPPLIER_GENERATED" ? "DRAFT" : "SUBMITTED",
    submittedBy: user?._id || null,
    submittedAt: sourceType === "SUPPLIER_GENERATED" ? null : new Date(),
    matchStatus: "PENDING",
    notes: "Generated from actual PO and accepted GRN quantities.",
  });

  const pdfBuffer = await generateInvoicePdf(invoice, purchaseOrder, supplier);
  const storedDocument = await storeDocument(pdfBuffer, {
    originalName: `${invoiceNumber}.pdf`,
    mimeType: "application/pdf",
    fallbackExtension: ".pdf",
    publicBaseUrl,
    requireCloudinary: false,
  });
  invoice.document = storedDocument;
  invoice.fileUrl = storedDocument.url;
  await invoice.save();

  await AuditLog.create({
    user: user?.name || "System",
    role: user?.role || "finance_user",
    action: "GENERATE_FINAL_INVOICE",
    entity: "Invoice",
    entityId: invoice.invoiceNumber,
    details: `Generated ${invoice.invoiceNumber} for ${purchaseOrder.poNumber}; stored via ${storedDocument.storageProvider}.`,
  });

  return invoice;
}

async function createUploadedInvoice({
  file,
  body,
  sourceType,
  user,
  publicBaseUrl,
}) {
  const { purchaseOrder, supplier, goodsReceipts } = await getInvoiceContext(
    body.poNumber,
  );
  if (
    sourceType === "SUPPLIER_UPLOAD" &&
    (!goodsReceipts.length ||
      !["PARTIALLY_RECEIVED", "RECEIVED", "COMPLETED"].includes(
        purchaseOrder.status,
      ))
  ) {
    const error = new Error(
      "The supplier invoice can be uploaded only after the warehouse has completed receiving and created a GRN.",
    );
    error.statusCode = 409;
    throw error;
  }
  if (
    user?.role === "supplier" &&
    String(user.supplier) !== String(supplier._id)
  ) {
    const error = new Error(
      "This Purchase Order is not assigned to your supplier account.",
    );
    error.statusCode = 403;
    throw error;
  }

  const invoiceNumber = String(body.invoiceNumber || "")
    .trim()
    .toUpperCase();
  if (!invoiceNumber) {
    const error = new Error("Invoice number is required.");
    error.statusCode = 400;
    throw error;
  }
  if (await Invoice.exists({ invoiceNumber })) {
    const error = new Error(`Invoice '${invoiceNumber}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const items = parseItems(body.items, purchaseOrder);
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.totalPrice, 0),
  );
  const taxRate = Math.max(0, Number(body.taxRate || 0));
  const taxAmount = roundMoney(
    body.taxAmount !== undefined ? body.taxAmount : (subtotal * taxRate) / 100,
  );
  const shippingAmount = Math.max(0, roundMoney(body.shippingAmount || 0));
  const calculatedTotal = roundMoney(subtotal + taxAmount + shippingAmount);
  const suppliedTotal =
    body.totalAmount === undefined || body.totalAmount === ""
      ? calculatedTotal
      : roundMoney(body.totalAmount);
  if (!moneyEqual(suppliedTotal, calculatedTotal)) {
    const error = new Error(
      `Invoice total ${suppliedTotal} does not equal lines + tax + shipping (${calculatedTotal}).`,
    );
    error.statusCode = 400;
    throw error;
  }

  const storedDocument = await storeDocument(file.buffer, {
    originalName: file.originalname,
    mimeType: file.mimetype,
    fallbackExtension: ".bin",
    publicBaseUrl,
    requireCloudinary: false,
  });

  const invoice = await Invoice.create({
    invoiceNumber,
    purchaseOrder: purchaseOrder._id,
    supplier: supplier._id,
    supplierUser: user?.role === "supplier" ? user._id : null,
    supplierName: supplier.name,
    poNumber: purchaseOrder.poNumber,
    invoiceDate: body.invoiceDate || new Date(),
    fileUrl: storedDocument.url,
    document: storedDocument,
    items,
    subtotal,
    taxRate,
    taxAmount,
    shippingAmount,
    totalAmount: calculatedTotal,
    paymentTerms: body.paymentTerms || supplier.paymentTerms || "Net 30",
    sourceType,
    submissionStatus: sourceType === "SUPPLIER_UPLOAD" ? "DRAFT" : "SUBMITTED",
    submittedBy: user?._id || null,
    submittedAt: sourceType === "SUPPLIER_UPLOAD" ? null : new Date(),
    matchStatus: "PENDING",
    notes: body.notes || "",
  });

  await AuditLog.create({
    user: user?.name || "System",
    role: user?.role || "finance_user",
    action: "UPLOAD_INVOICE",
    entity: "Invoice",
    entityId: invoice.invoiceNumber,
    details: `Uploaded ${file.originalname} for ${purchaseOrder.poNumber}; stored via ${storedDocument.storageProvider}.`,
  });
  return invoice;
}

function calculateThreeWayMatch(purchaseOrder, goodsReceipts, invoice) {
  const comparisons = [];
  const reasons = [];
  const addComparison = (
    field,
    poValue,
    grnValue,
    invoiceValue,
    matches,
    critical = false,
  ) => {
    const result = matches ? "MATCH" : "MISMATCH";
    const row = {
      field,
      po: poValue,
      grn: grnValue,
      invoice: invoiceValue,
      result,
      critical,
    };
    comparisons.push(row);
    if (!matches)
      reasons.push(
        `${field}: PO=${poValue ?? "N/A"}, GRN=${grnValue ?? "N/A"}, Invoice=${invoiceValue ?? "N/A"}`,
      );
  };

  if (!purchaseOrder) {
    return {
      status: "MISMATCHED",
      comparisons: [
        {
          field: "Purchase Order",
          po: "NOT FOUND",
          grn: "N/A",
          invoice: invoice.poNumber,
          result: "MISMATCH",
          critical: true,
        },
      ],
      reasons: [`Purchase Order '${invoice.poNumber}' was not found.`],
      summary: { matched: 0, mismatched: 1, total: 1 },
    };
  }
  if (!goodsReceipts.length) {
    return {
      status: "MISMATCHED",
      comparisons: [
        {
          field: "Goods Receipt / GRN",
          po: purchaseOrder.poNumber,
          grn: "NOT FOUND",
          invoice: invoice.invoiceNumber,
          result: "MISMATCH",
          critical: true,
        },
      ],
      reasons: [`No Goods Receipt exists for '${purchaseOrder.poNumber}'.`],
      summary: { matched: 0, mismatched: 1, total: 1 },
    };
  }

  const grnSupplierNames = [
    ...new Set(
      goodsReceipts.map((receipt) => receipt.supplierName).filter(Boolean),
    ),
  ];
  const supplierMatches =
    normalizeText(purchaseOrder.supplierName) ===
      normalizeText(invoice.supplierName) &&
    (grnSupplierNames.length === 0 ||
      grnSupplierNames.every(
        (name) =>
          normalizeText(name) === normalizeText(purchaseOrder.supplierName),
      ));
  addComparison(
    "Supplier",
    purchaseOrder.supplierName,
    grnSupplierNames.join(", ") || purchaseOrder.supplierName,
    invoice.supplierName,
    supplierMatches,
    true,
  );
  addComparison(
    "PO Number",
    purchaseOrder.poNumber,
    goodsReceipts.map((r) => r.poNumber).join(", "),
    invoice.poNumber,
    purchaseOrder.poNumber === invoice.poNumber &&
      goodsReceipts.every((r) => r.poNumber === purchaseOrder.poNumber),
    true,
  );

  const receivedByName = new Map();
  goodsReceipts.forEach((receipt) =>
    receipt.items.forEach((item) => {
      const key = normalizeText(item.productName);
      const current = receivedByName.get(key) || { quantity: 0, unitPrice: 0 };
      current.quantity += Number(item.acceptedQuantity || 0);
      if (Number(item.unitPrice) > 0)
        current.unitPrice = Number(item.unitPrice);
      receivedByName.set(key, current);
    }),
  );

  const invoiceByName = new Map();
  invoice.items.forEach((item) => {
    const key = normalizeText(item.productName);
    const current = invoiceByName.get(key) || {
      quantity: 0,
      unitPrice: Number(item.unitPrice || 0),
      total: 0,
      displayName: item.productName,
    };
    current.quantity += Number(item.quantity || 0);
    current.total += Number(item.totalPrice || 0);
    current.unitPrice = Number(item.unitPrice || current.unitPrice);
    invoiceByName.set(key, current);
  });

  purchaseOrder.items.forEach((poItem) => {
    const key = normalizeText(poItem.productName);
    const received = receivedByName.get(key) || { quantity: 0, unitPrice: 0 };
    const billed = invoiceByName.get(key) || {
      quantity: 0,
      unitPrice: 0,
      total: 0,
    };
    addComparison(
      `Quantity · ${poItem.productName}`,
      poItem.quantity,
      received.quantity,
      billed.quantity,
      numberEqual(poItem.quantity, received.quantity) &&
        numberEqual(received.quantity, billed.quantity),
    );
    addComparison(
      `Price / Unit · ${poItem.productName}`,
      roundMoney(poItem.unitPrice),
      received.unitPrice ? roundMoney(received.unitPrice) : "PO reference",
      roundMoney(billed.unitPrice),
      moneyEqual(poItem.unitPrice, billed.unitPrice),
    );
    invoiceByName.delete(key);
  });

  invoiceByName.forEach((item, key) => {
    addComparison(
      `Unexpected Invoice Item · ${item.displayName || key}`,
      "NOT ON PO",
      "NOT RECEIVED",
      item.quantity,
      false,
      true,
    );
  });

  const expectedSubtotal = roundMoney(
    purchaseOrder.items.reduce(
      (sum, item) => sum + Number(item.totalPrice || 0),
      0,
    ),
  );
  addComparison(
    "Subtotal",
    expectedSubtotal,
    roundMoney(
      goodsReceipts.reduce(
        (sum, receipt) =>
          sum +
          receipt.items.reduce(
            (lineSum, item) =>
              lineSum +
              Number(item.acceptedQuantity || 0) *
                Number(
                  item.unitPrice ||
                    purchaseOrder.items.find(
                      (po) =>
                        normalizeText(po.productName) ===
                        normalizeText(item.productName),
                    )?.unitPrice ||
                    0,
                ),
            0,
          ),
        0,
      ),
    ),
    roundMoney(
      invoice.subtotal ||
        invoice.items.reduce((sum, item) => sum + item.totalPrice, 0),
    ),
    moneyEqual(
      expectedSubtotal,
      invoice.subtotal ||
        invoice.items.reduce((sum, item) => sum + item.totalPrice, 0),
    ),
  );

  const matched = comparisons.filter((row) => row.result === "MATCH").length;
  const mismatched = comparisons.length - matched;
  const hasCriticalMismatch = comparisons.some(
    (row) => row.critical && row.result === "MISMATCH",
  );
  const status =
    mismatched === 0
      ? "MATCHED"
      : hasCriticalMismatch || matched === 0
        ? "MISMATCHED"
        : "PARTIALLY_MATCHED";
  return {
    status,
    comparisons,
    reasons,
    summary: { matched, mismatched, total: comparisons.length },
  };
}

async function runThreeWayMatch(invoice, user) {
  if (!["SUPPLIER_GENERATED", "SUPPLIER_UPLOAD"].includes(invoice.sourceType)) {
    const error = new Error(
      "3-way matching accepts only the supplier-generated or supplier-uploaded invoice linked to this Purchase Order.",
    );
    error.statusCode = 409;
    throw error;
  }
  if (!isStoredSupplierDocument(invoice)) {
    const error = new Error(
      "The supplier invoice must have a real stored document before 3-way matching can run.",
    );
    error.statusCode = 409;
    throw error;
  }
  if (
    invoice.submissionStatus !== "SUBMITTED" &&
    invoice.submissionStatus !== "VALIDATED"
  ) {
    const error = new Error(
      "Only a submitted invoice can be used for 3-way matching.",
    );
    error.statusCode = 409;
    throw error;
  }

  const latestSupplierInvoice = await Invoice.findOne({
    poNumber: invoice.poNumber,
    sourceType: { $in: ["SUPPLIER_GENERATED", "SUPPLIER_UPLOAD"] },
    submissionStatus: { $in: ["SUBMITTED", "VALIDATED"] },
  })
    .sort({ submittedAt: -1, createdAt: -1 })
    .select("_id invoiceNumber");
  if (
    latestSupplierInvoice &&
    String(latestSupplierInvoice._id) !== String(invoice._id)
  ) {
    const error = new Error(
      `Use supplier invoice ${latestSupplierInvoice.invoiceNumber}; it is the latest submitted invoice for ${invoice.poNumber}.`,
    );
    error.statusCode = 409;
    throw error;
  }

  const purchaseOrder = await PurchaseOrder.findOne({
    poNumber: invoice.poNumber,
  });
  const goodsReceipts = await GoodsReceipt.find({ poNumber: invoice.poNumber });
  const result = calculateThreeWayMatch(purchaseOrder, goodsReceipts, invoice);

  invoice.matchStatus = result.status;
  invoice.submissionStatus =
    result.status === "MATCHED" ? "VALIDATED" : "SUBMITTED";
  invoice.matchDetails = {
    comparisons: result.comparisons,
    reasons: result.reasons,
    summary: result.summary,
    goodsReceiptNumbers: goodsReceipts.map((receipt) => receipt.receiptNumber),
    matchedAt: new Date(),
  };
  invoice.ocrData = {
    matched: result.status === "MATCHED",
    reasons: result.reasons,
    timestamp: new Date(),
    extractionSource: "Persisted invoice lines",
  };
  if (!invoice.purchaseOrder && purchaseOrder)
    invoice.purchaseOrder = purchaseOrder._id;
  if (!invoice.supplier && purchaseOrder)
    invoice.supplier = purchaseOrder.supplier;
  if (!invoice.subtotal)
    invoice.subtotal = roundMoney(
      invoice.items.reduce((sum, item) => sum + item.totalPrice, 0),
    );
  await invoice.save();

  const existingPayment = await Payment.findOne({
    invoiceNumber: invoice.invoiceNumber,
  });
  const payment =
    existingPayment ||
    new Payment({
      paymentNumber: createReference("PAY"),
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      poNumber: invoice.poNumber,
      supplierName: invoice.supplierName,
      amount: invoice.totalAmount,
    });
  payment.matchStatus = result.status;
  if (payment.paymentStatus !== "PAID")
    payment.paymentStatus =
      result.status === "MATCHED" ? "APPROVED" : "ON_HOLD";
  await payment.save();

  await AuditLog.create({
    user: user?.name || "System 3-Way Match Engine",
    role: user?.role || "finance_user",
    action: "THREE_WAY_MATCH",
    entity: "Invoice",
    entityId: invoice.invoiceNumber,
    details: `${result.status}: ${result.summary.matched}/${result.summary.total} comparison checks matched.`,
  });

  return { ...result, payment };
}

function isStoredSupplierDocument(invoice) {
  return Boolean(
    invoice?.fileUrl &&
    ["cloudinary", "local"].includes(invoice?.document?.storageProvider),
  );
}

module.exports = {
  createGeneratedInvoice,
  createUploadedInvoice,
  calculateThreeWayMatch,
  runThreeWayMatch,
  getInvoiceContext,
  isStoredSupplierDocument,
  parseItems,
  roundMoney,
};
