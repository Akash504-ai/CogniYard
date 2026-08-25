const bcrypt = require('bcryptjs');
const Supplier = require('../models/Supplier');
const User = require('../models/User');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const {
  createGeneratedInvoice,
  createUploadedInvoice,
  getInvoiceContext,
  parseItems,
  roundMoney
} = require('../services/invoiceService');
const { generateInvoicePdf } = require('../services/invoicePdfService');
const { hasCloudinaryConfiguration, storeDocument } = require('../services/documentStorage');

const SUPPLIER_INVOICE_SOURCES = ['SUPPLIER_GENERATED', 'SUPPLIER_UPLOAD'];

async function activateSupplierInvoice(invoice, user) {
  if (!SUPPLIER_INVOICE_SOURCES.includes(invoice.sourceType)) {
    const error = new Error('Only a supplier-generated or supplier-uploaded invoice can be sent to Finance.');
    error.statusCode = 409;
    throw error;
  }
  if (!invoice.fileUrl || !['cloudinary', 'local'].includes(invoice.document?.storageProvider)) {
    const error = new Error('The supplier invoice must have a real stored document before it can be sent to Finance.');
    error.statusCode = 409;
    throw error;
  }
  await Invoice.updateMany({
    _id: { $ne: invoice._id },
    supplier: user.supplier,
    poNumber: invoice.poNumber,
    sourceType: { $in: SUPPLIER_INVOICE_SOURCES },
    submissionStatus: { $in: ['DRAFT', 'SUBMITTED'] }
  }, {
    $set: { submissionStatus: 'REJECTED', notes: 'Superseded by a newer supplier invoice submission.' }
  });
  invoice.submissionStatus = 'SUBMITTED';
  invoice.submittedBy = user._id;
  invoice.submittedAt = new Date();
  invoice.matchStatus = 'PENDING';
  await invoice.save();
  return invoice;
}

function cleanSupplierPayload(body) {
  const name = String(body.name || '').trim();
  const companyName = String(body.companyName || name).trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const address = String(body.address || '').trim();
  if (!name || !companyName || !phone || !email || !address) {
    const error = new Error('Supplier name, company name, phone number, business email and address are required.');
    error.statusCode = 400;
    throw error;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error('Enter a valid business email address.');
    error.statusCode = 400;
    throw error;
  }

  return {
    name,
    companyName,
    contactPerson: name,
    email,
    phone,
    address,
    taxId: String(body.taxId || '').trim(),
    category: String(body.category || 'General Procurement').trim(),
    paymentTerms: String(body.paymentTerms || 'Net 30').trim(),
    rating: Math.min(5, Math.max(1, Number(body.rating || 4.5))),
    leadTimeDays: Math.max(1, Number(body.leadTimeDays || 3)),
    otdScore: Math.min(100, Math.max(0, Number(body.otdScore || 95))),
    status: ['ACTIVE', 'INACTIVE', 'UNDER_REVIEW'].includes(body.status) ? body.status : 'ACTIVE',
    bankDetails: {
      accountName: String(body.bankDetails?.accountName || body.accountName || '').trim(),
      bankName: String(body.bankDetails?.bankName || body.bankName || '').trim(),
      accountLast4: String(body.bankDetails?.accountLast4 || body.accountLast4 || '').replace(/\D/g, '').slice(-4),
      ifscOrSwift: String(body.bankDetails?.ifscOrSwift || body.ifscOrSwift || '').trim()
    }
  };
}

async function nextSupplierCode() {
  const suppliers = await Supplier.find({ code: /^SUP-\d+$/ })
    .select('code')
    .lean();

  const maxNumber = suppliers.reduce((max, supplier) => {
    const number = Number(supplier.code.replace('SUP-', ''));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 1000);

  return `SUP-${maxNumber + 1}`;
}

exports.getAdminSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find().populate('userAccount', 'name email role isActive').sort({ createdAt: -1 });
    res.json({ success: true, count: suppliers.length, suppliers });
  } catch (error) {
    next(error);
  }
};

exports.createSupplier = async (req, res, next) => {
  let supplier;
  try {
    const payload = cleanSupplierPayload(req.body);
    const requestedCode = String(req.body.code || '').trim().toUpperCase();
    const code = requestedCode || await nextSupplierCode();
    if (!/^SUP-[A-Z0-9-]{2,20}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Supplier ID must use the format SUP-XXXX.' });
    }

    supplier = await Supplier.create({ ...payload, code });
    const portalEmail = String(req.body.portalEmail || '').trim().toLowerCase();
    const portalPassword = String(req.body.portalPassword || '');
    let portalUser = null;

    if (!portalEmail || portalPassword.length < 8) {
      await Supplier.findByIdAndDelete(supplier._id);
      return res.status(400).json({ success: false, message: 'Supplier login email and a password of at least 8 characters are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(portalEmail)) {
      await Supplier.findByIdAndDelete(supplier._id);
      return res.status(400).json({ success: false, message: 'Enter a valid supplier login email.' });
    }
    if (await User.exists({ email: portalEmail })) {
      await Supplier.findByIdAndDelete(supplier._id);
      return res.status(409).json({ success: false, message: `A user already exists with '${portalEmail}'.` });
    }
    portalUser = await User.create({
      name: payload.name,
      email: portalEmail,
      password: await bcrypt.hash(portalPassword, 10),
      role: 'supplier',
      department: payload.companyName,
      supplier: supplier._id,
      isActive: payload.status === 'ACTIVE'
    });
    supplier.userAccount = portalUser._id;
    await supplier.save();

    await AuditLog.create({
      user: req.user.name,
      role: req.user.role,
      action: 'CREATE_SUPPLIER',
      entity: 'Supplier',
      entityId: supplier.code,
      details: `Created supplier ${supplier.name}${portalUser ? ' with a supplier portal account' : ''}.`
    });

    const populated = await Supplier.findById(supplier._id).populate('userAccount', 'name email role isActive');
    res.status(201).json({ success: true, supplier: populated });
  } catch (error) {
    if (supplier?._id && !supplier.userAccount) await Supplier.findByIdAndDelete(supplier._id).catch(() => {});
    next(error);
  }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    const payload = cleanSupplierPayload({ ...supplier.toObject(), ...req.body });
    Object.assign(supplier, payload);

    if (supplier.userAccount) {
      const user = await User.findById(supplier.userAccount);
      if (user) {
        user.name = payload.name;
        user.department = payload.companyName;
        user.isActive = payload.status === 'ACTIVE';
        if (req.body.portalEmail && String(req.body.portalEmail).trim().toLowerCase() !== user.email) {
          const portalEmail = String(req.body.portalEmail).trim().toLowerCase();
          if (await User.exists({ email: portalEmail, _id: { $ne: user._id } })) {
            return res.status(409).json({ success: false, message: `A user already exists with '${portalEmail}'.` });
          }
          user.email = portalEmail;
        }
        if (req.body.portalPassword) {
          if (String(req.body.portalPassword).length < 8) {
            return res.status(400).json({ success: false, message: 'New portal password must be at least 8 characters.' });
          }
          user.password = await bcrypt.hash(String(req.body.portalPassword), 10);
        }
        await user.save();
      }
    } else if (req.body.portalEmail || req.body.portalPassword) {
      const portalEmail = String(req.body.portalEmail || '').trim().toLowerCase();
      const portalPassword = String(req.body.portalPassword || '');
      if (!portalEmail || portalPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'Portal email and a password of at least 8 characters are required to create supplier login.' });
      }
      if (await User.exists({ email: portalEmail })) {
        return res.status(409).json({ success: false, message: `A user already exists with '${portalEmail}'.` });
      }
      const portalUser = await User.create({
        name: payload.name,
        email: portalEmail,
        password: await bcrypt.hash(portalPassword, 10),
        role: 'supplier',
        department: payload.companyName,
        supplier: supplier._id,
        isActive: payload.status === 'ACTIVE'
      });
      supplier.userAccount = portalUser._id;
    }
    await supplier.save();

    await AuditLog.create({
      user: req.user.name,
      role: req.user.role,
      action: 'UPDATE_SUPPLIER',
      entity: 'Supplier',
      entityId: supplier.code,
      details: `Updated supplier ${supplier.name}.`
    });
    const populated = await Supplier.findById(supplier._id).populate('userAccount', 'name email role isActive');
    res.json({ success: true, supplier: populated });
  } catch (error) {
    next(error);
  }
};

exports.setSupplierStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE', 'UNDER_REVIEW'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier status.' });
    }
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    supplier.status = status;
    await supplier.save();
    if (supplier.userAccount) await User.findByIdAndUpdate(supplier.userAccount, { isActive: status === 'ACTIVE' });
    res.json({ success: true, supplier });
  } catch (error) {
    next(error);
  }
};

exports.deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    const purchaseOrderCount = await PurchaseOrder.countDocuments({ supplier: supplier._id });
    if (purchaseOrderCount > 0) {
      return res.status(409).json({ success: false, message: 'This supplier has Purchase Orders and cannot be deleted. Deactivate it to preserve the audit history.' });
    }
    if (supplier.userAccount) await User.findByIdAndDelete(supplier.userAccount);
    await supplier.deleteOne();
    res.json({ success: true, message: `Supplier ${supplier.code} deleted.` });
  } catch (error) {
    next(error);
  }
};

exports.getSupplierProfile = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.user.supplier).populate('userAccount', 'name email isActive');
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier account is not linked to a supplier master record.' });
    const cloudinaryReady = hasCloudinaryConfiguration();
    res.json({
      success: true,
      supplier,
      cloudinaryReady,
      uploadReady: true,
      storageMode: cloudinaryReady ? 'cloudinary' : 'local_demo'
    });
  } catch (error) {
    next(error);
  }
};

exports.getSupplierPurchaseOrders = async (req, res, next) => {
  try {
    const purchaseOrders = await PurchaseOrder.find({ supplier: req.user.supplier }).sort({ createdAt: -1 });
    res.json({ success: true, count: purchaseOrders.length, purchaseOrders });
  } catch (error) {
    next(error);
  }
};

exports.getSupplierInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find({
      supplier: req.user.supplier,
      sourceType: { $in: SUPPLIER_INVOICE_SOURCES },
      'document.storageProvider': { $in: ['cloudinary', 'local'] }
    }).sort({ createdAt: -1 });
    res.json({ success: true, count: invoices.length, invoices });
  } catch (error) {
    next(error);
  }
};

exports.generateSupplierInvoice = async (req, res, next) => {
  try {
    let invoice = await createGeneratedInvoice({
      poNumber: req.params.poNumber,
      taxRate: req.body.taxRate,
      shippingAmount: req.body.shippingAmount,
      sourceType: 'SUPPLIER_GENERATED',
      user: req.user,
      publicBaseUrl: `${req.protocol}://${req.get('host')}`
    });
    invoice = await activateSupplierInvoice(invoice, req.user);
    const destination = invoice.document?.storageProvider === 'cloudinary' ? 'Cloudinary' : 'the built-in demo document store';
    res.status(201).json({ success: true, invoice, message: `Invoice generated, saved to ${destination} and sent automatically to Finance.` });
  } catch (error) {
    next(error);
  }
};

exports.uploadSupplierInvoice = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please choose an invoice document.' });
    let invoice = await createUploadedInvoice({
      file: req.file,
      body: req.body,
      sourceType: 'SUPPLIER_UPLOAD',
      user: req.user,
      publicBaseUrl: `${req.protocol}://${req.get('host')}`
    });
    invoice = await activateSupplierInvoice(invoice, req.user);
    const destination = invoice.document?.storageProvider === 'cloudinary' ? 'Cloudinary' : 'the built-in demo document store';
    res.status(201).json({ success: true, invoice, message: `Invoice uploaded to ${destination} and sent automatically to Finance.` });
  } catch (error) {
    next(error);
  }
};

exports.updateSupplierInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      supplier: req.user.supplier,
      sourceType: { $in: SUPPLIER_INVOICE_SOURCES }
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found in your supplier account.' });

    const payment = await Payment.findOne({ $or: [{ invoiceId: invoice._id }, { invoiceNumber: invoice.invoiceNumber }] });
    if (payment?.paymentStatus === 'PAID') {
      return res.status(409).json({ success: false, message: 'A paid invoice is locked and cannot be edited.' });
    }

    const { purchaseOrder, supplier } = await getInvoiceContext(invoice.poNumber);
    const invoiceNumber = String(req.body.invoiceNumber || invoice.invoiceNumber).trim().toUpperCase();
    if (!invoiceNumber) return res.status(400).json({ success: false, message: 'Invoice number is required.' });
    if (await Invoice.exists({ invoiceNumber, _id: { $ne: invoice._id } })) {
      return res.status(409).json({ success: false, message: `Invoice '${invoiceNumber}' already exists.` });
    }

    const items = parseItems(req.body.items || invoice.items, purchaseOrder);
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.totalPrice, 0));
    const taxRate = Math.max(0, Number(req.body.taxRate ?? invoice.taxRate ?? 0));
    const taxAmount = roundMoney(subtotal * taxRate / 100);
    const shippingAmount = Math.max(0, roundMoney(req.body.shippingAmount ?? invoice.shippingAmount ?? 0));
    const oldInvoiceNumber = invoice.invoiceNumber;

    invoice.invoiceNumber = invoiceNumber;
    invoice.invoiceDate = req.body.invoiceDate || invoice.invoiceDate || new Date();
    invoice.items = items;
    invoice.subtotal = subtotal;
    invoice.taxRate = taxRate;
    invoice.taxAmount = taxAmount;
    invoice.shippingAmount = shippingAmount;
    invoice.totalAmount = roundMoney(subtotal + taxAmount + shippingAmount);
    invoice.paymentTerms = String(req.body.paymentTerms || invoice.paymentTerms || supplier.paymentTerms || 'Net 30').trim();
    invoice.matchStatus = 'PENDING';
    invoice.matchDetails = {};
    invoice.ocrData = {};
    invoice.notes = String(req.body.notes || 'Supplier corrected the invoice; Finance validation was reset.').trim();

    let storedDocument;
    if (req.file) {
      storedDocument = await storeDocument(req.file.buffer, {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fallbackExtension: '.bin',
        publicBaseUrl: `${req.protocol}://${req.get('host')}`,
        requireCloudinary: false
      });
    } else {
      const pdfBuffer = await generateInvoicePdf(invoice, purchaseOrder, supplier);
      storedDocument = await storeDocument(pdfBuffer, {
        originalName: `${invoiceNumber}.pdf`,
        mimeType: 'application/pdf',
        fallbackExtension: '.pdf',
        publicBaseUrl: `${req.protocol}://${req.get('host')}`,
        requireCloudinary: false
      });
    }
    invoice.document = storedDocument;
    invoice.fileUrl = storedDocument.url;
    await invoice.save();
    await activateSupplierInvoice(invoice, req.user);

    if (payment) {
      payment.invoiceNumber = invoice.invoiceNumber;
      payment.amount = invoice.totalAmount;
      payment.matchStatus = 'PENDING';
      payment.paymentStatus = 'ON_HOLD';
      await payment.save();
    }

    await AuditLog.create({
      user: req.user.name,
      role: req.user.role,
      action: 'SUPPLIER_EDIT_INVOICE',
      entity: 'Invoice',
      entityId: invoice.invoiceNumber,
      details: `Corrected ${oldInvoiceNumber} for ${invoice.poNumber}; regenerated/stored the real document and reset Finance matching.`
    });

    const destination = storedDocument.storageProvider === 'cloudinary' ? 'Cloudinary' : 'the built-in demo document store';
    res.json({ success: true, invoice, message: `Invoice corrected, saved to ${destination}, and refreshed automatically in Finance.` });
  } catch (error) {
    next(error);
  }
};

exports.submitSupplierInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      supplier: req.user.supplier,
      sourceType: { $in: SUPPLIER_INVOICE_SOURCES }
    });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found in your supplier account.' });
    await activateSupplierInvoice(invoice, req.user);
    res.json({ success: true, invoice, message: 'Invoice submitted to Finance for validation.' });
  } catch (error) {
    next(error);
  }
};
