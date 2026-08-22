const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const PurchaseOrder = require('../models/PurchaseOrder');
const GoodsReceipt = require('../models/GoodsReceipt');
const AuditLog = require('../models/AuditLog');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary if keys present
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// --- Invoices ---
exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json({ success: true, count: invoices.length, invoices });
  } catch (error) {
    next(error);
  }
};

exports.createInvoice = async (req, res, next) => {
  try {
    const { invoiceNumber, supplierName, poNumber, items, totalAmount, fileUrl, notes } = req.body;

    if (!invoiceNumber || !invoiceNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Invoice number is required.' });
    }

    if (!poNumber || !poNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Purchase Order number is required.' });
    }

    // Verify PO exists
    const po = await PurchaseOrder.findOne({ poNumber: poNumber.trim().toUpperCase() });
    if (!po) {
      return res.status(400).json({ success: false, message: `Referenced Purchase Order '${poNumber}' not found in system.` });
    }

    // Check duplicate invoice number
    const existingInvoice = await Invoice.findOne({ invoiceNumber: invoiceNumber.trim() });
    if (existingInvoice) {
      return res.status(400).json({ success: false, message: `An invoice with number '${invoiceNumber}' already exists.` });
    }

    const finalAmount = Number(totalAmount || 0);
    if (finalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Total invoice amount must be greater than 0.' });
    }

    const poQty = po.items.reduce((sum, item) => sum + item.quantity, 0);
    const poUnitPrice = po.items[0]?.unitPrice || (po.totalAmount / (poQty || 1));
    const billedQty = poUnitPrice > 0 ? Math.round(finalAmount / poUnitPrice) : poQty;

    const processedItems = [{
      productName: po.items[0]?.productName || 'Industrial Item',
      quantity: billedQty,
      unitPrice: poUnitPrice,
      totalPrice: finalAmount
    }];

    const invoice = new Invoice({
      invoiceNumber: invoiceNumber.trim(),
      supplierName: supplierName || po.supplierName || 'Supplier',
      poNumber: po.poNumber,
      items: processedItems,
      totalAmount: finalAmount,
      fileUrl: fileUrl || 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      matchStatus: 'PENDING',
      notes: notes || ''
    });

    await invoice.save();

    // Trigger 3-Way Match calculation
    const matchResult = await runThreeWayMatch(invoice);

    const invoices = await Invoice.find().sort({ createdAt: -1 });
    const payments = await Payment.find().sort({ createdAt: -1 });

    res.status(201).json({ success: true, invoice, matchResult, invoices, payments });
  } catch (error) {
    if (error.message && error.message.includes('must be greater than 0')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    await Invoice.findByIdAndDelete(req.params.id);
    await Payment.deleteMany({ invoiceNumber: invoice.invoiceNumber });

    await AuditLog.create({
      user: req.user?.name || 'Finance User',
      role: req.user?.role || 'finance_user',
      action: 'DELETE_INVOICE',
      entity: 'Invoice',
      entityId: invoice.invoiceNumber,
      details: `Deleted Invoice ${invoice.invoiceNumber}`
    });

    const invoices = await Invoice.find().sort({ createdAt: -1 });
    const payments = await Payment.find().sort({ createdAt: -1 });

    res.json({ success: true, message: `Deleted invoice ${invoice.invoiceNumber}`, invoices, payments });
  } catch (error) {
    next(error);
  }
};

// --- Autonomous 3-Way Match Core Engine ---
const runThreeWayMatch = async (invoice) => {
  try {
    const po = await PurchaseOrder.findOne({ poNumber: invoice.poNumber });
    const receipts = await GoodsReceipt.find({ poNumber: invoice.poNumber });

    let matchStatus = 'PENDING';
    let mismatchReasons = [];
    let poQty = 0;
    let acceptedQty = 0;
    let invoiceQty = 0;

    if (!po) {
      mismatchReasons.push(`Purchase Order '${invoice.poNumber}' not found in system.`);
    }

    if (!receipts || receipts.length === 0) {
      mismatchReasons.push(`Goods Receipt not found for '${invoice.poNumber}' (Goods have not been received at yard dock yet).`);
    }

    if (po && receipts && receipts.length > 0) {
      poQty = po.items.reduce((sum, item) => sum + item.quantity, 0);
      const poUnitPrice = po.items[0]?.unitPrice || (po.totalAmount / (poQty || 1));

      acceptedQty = receipts.reduce((sum, gr) => {
        return sum + gr.items.reduce((sub, item) => sub + item.acceptedQuantity, 0);
      }, 0);

      const invoiceQty = invoice.items.length > 0 
        ? invoice.items.reduce((sum, item) => sum + item.quantity, 0)
        : poQty;
      const invoiceUnitPrice = invoice.items[0]?.unitPrice || (invoice.totalAmount / (invoiceQty || 1));
      const invoiceAmount = invoice.totalAmount;

      const qtyMatch = invoiceQty === acceptedQty;
      const priceMatch = Math.abs(invoiceUnitPrice - poUnitPrice) < 0.01;
      const expectedAmount = acceptedQty * poUnitPrice;
      const amountMatch = Math.abs(invoiceAmount - expectedAmount) < 1.0;

      if (qtyMatch && priceMatch && amountMatch) {
        matchStatus = 'MATCHED';
      } else {
        matchStatus = 'MISMATCH';
        if (!qtyMatch) {
          mismatchReasons.push(`❌ Quantity Mismatch: PO: ${poQty}, Received/Accepted: ${acceptedQty}, Invoice Billed: ${invoiceQty}`);
        }
        if (!priceMatch) {
          mismatchReasons.push(`❌ Price Mismatch: PO Unit Price: $${poUnitPrice.toFixed(2)}, Invoice Unit Price: $${invoiceUnitPrice.toFixed(2)}`);
        }
        if (!amountMatch) {
          mismatchReasons.push(`❌ Total Amount Mismatch: Expected $${expectedAmount.toLocaleString()}, Invoice Total Billed $${invoiceAmount.toLocaleString()}`);
        }
      }
    } else {
      matchStatus = 'MISMATCH';
    }

    invoice.matchStatus = matchStatus;
    invoice.ocrData = {
      matched: matchStatus === 'MATCHED',
      acceptedQty: acceptedQty || 0,
      poQty: poQty || 0,
      invoiceQty: invoiceQty || 0,
      reasons: mismatchReasons,
      timestamp: new Date()
    };
    await invoice.save();

    const count = await Payment.countDocuments();
    const paymentNumber = `PAY-${1000 + count + 1}`;

    let payment = await Payment.findOne({ invoiceNumber: invoice.invoiceNumber });
    const initialPaymentStatus = matchStatus === 'MATCHED' ? 'APPROVED' : 'ON_HOLD';

    if (!payment) {
      payment = new Payment({
        paymentNumber,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        poNumber: invoice.poNumber,
        supplierName: invoice.supplierName,
        amount: invoice.totalAmount,
        matchStatus: matchStatus,
        paymentStatus: initialPaymentStatus
      });
    } else {
      payment.matchStatus = matchStatus;
      if (payment.paymentStatus !== 'PAID') {
        payment.paymentStatus = initialPaymentStatus;
      }
    }
    await payment.save();

    await AuditLog.create({
      user: 'System 3-Way Match Engine',
      role: 'finance_user',
      action: 'THREE_WAY_MATCH',
      entity: 'Invoice',
      entityId: invoice.invoiceNumber,
      details: `3-Way Match for ${invoice.invoiceNumber} result: ${matchStatus}. Payment status set to ${payment.paymentStatus}`
    });

    return { matchStatus, paymentStatus: payment.paymentStatus, mismatchReasons, payment };
  } catch (err) {
    console.error('Error running 3-way match:', err);
    throw err;
  }
};

exports.triggerMatch = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found in system.' });
    }
    const result = await runThreeWayMatch(invoice);
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json({ success: true, invoice, matchResult: result, invoices, payments });
  } catch (error) {
    next(error);
  }
};

// --- Payments ---
exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    next(error);
  }
};

exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    const validPaymentStatuses = ['PENDING', 'APPROVED', 'ON_HOLD', 'PROCESSING', 'PAID'];
    if (!validPaymentStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid payment status '${status}'.` });
    }

    if (payment.matchStatus === 'MISMATCH' && ['PAID', 'PROCESSING', 'APPROVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Payment cannot be processed for an invoice with MISMATCH status. Payment is locked ON_HOLD.'
      });
    }

    if (payment.paymentStatus === 'ON_HOLD' && status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Payment is currently ON_HOLD due to a 3-way match discrepancy and cannot be marked PAID directly.'
      });
    }

    if (payment.paymentStatus === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been completed for this invoice.'
      });
    }

    payment.paymentStatus = status;
    if (status === 'PAID') {
      payment.paymentDate = new Date();
      payment.transactionId = `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;
    }
    await payment.save();

    await AuditLog.create({
      user: req.user?.name || 'Finance User',
      role: req.user?.role || 'finance_user',
      action: 'UPDATE_PAYMENT_STATUS',
      entity: 'Payment',
      entityId: payment.paymentNumber,
      details: `Updated payment status for ${payment.paymentNumber} to ${status}`
    });

    const payments = await Payment.find().sort({ createdAt: -1 });

    res.json({ success: true, payment, payments });
  } catch (error) {
    next(error);
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    await Payment.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      user: req.user?.name || 'Finance User',
      role: req.user?.role || 'finance_user',
      action: 'DELETE_PAYMENT',
      entity: 'Payment',
      entityId: payment.paymentNumber,
      details: `Deleted payment record ${payment.paymentNumber}`
    });

    const payments = await Payment.find().sort({ createdAt: -1 });

    res.json({ success: true, message: `Deleted payment record ${payment.paymentNumber}`, payments });
  } catch (error) {
    next(error);
  }
};
