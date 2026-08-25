const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const PurchaseOrder = require('../models/PurchaseOrder');
const GoodsReceipt = require('../models/GoodsReceipt');
const AuditLog = require('../models/AuditLog');
const {
  runThreeWayMatch
} = require('../services/invoiceService');

async function invoiceList() {
  const invoices = await Invoice.find({
    sourceType: { $in: ['SUPPLIER_GENERATED', 'SUPPLIER_UPLOAD'] },
    submissionStatus: { $in: ['SUBMITTED', 'VALIDATED'] },
    'document.storageProvider': { $in: ['cloudinary', 'local'] }
  })
    .populate('supplier', 'code name companyName')
    .populate('submittedBy', 'name role')
    .sort({ submittedAt: -1, createdAt: -1 });
  const latestByPo = new Map();
  invoices.forEach(invoice => {
    if (!latestByPo.has(invoice.poNumber)) latestByPo.set(invoice.poNumber, invoice);
  });
  return [...latestByPo.values()];
}

exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await invoiceList();
    res.json({ success: true, count: invoices.length, invoices });
  } catch (error) {
    next(error);
  }
};

exports.getReadyPurchaseOrders = async (req, res, next) => {
  try {
    const purchaseOrders = await PurchaseOrder.find({ status: { $in: ['RECEIVED', 'COMPLETED'] } })
      .populate('supplier', 'code name companyName paymentTerms')
      .sort({ updatedAt: -1 });
    const receiptPoNumbers = new Set((await GoodsReceipt.find({ poNumber: { $in: purchaseOrders.map(po => po.poNumber) } }).select('poNumber').lean()).map(row => row.poNumber));
    const poNumbers = purchaseOrders.map(po => po.poNumber);
    const existing = await Invoice.find({
      $or: [
        { purchaseOrder: { $in: purchaseOrders.map(po => po._id) } },
        { poNumber: { $in: poNumbers } }
      ],
      submissionStatus: { $in: ['SUBMITTED', 'VALIDATED'] },
      sourceType: { $in: ['SUPPLIER_GENERATED', 'SUPPLIER_UPLOAD'] },
      'document.storageProvider': { $in: ['cloudinary', 'local'] }
    })
      .sort({ submittedAt: -1, createdAt: -1 })
      .select('purchaseOrder poNumber invoiceNumber sourceType submissionStatus matchStatus totalAmount fileUrl document submittedAt').lean();
    const invoiceByPo = new Map();
    existing.forEach(invoice => {
      const key = invoice.purchaseOrder ? String(invoice.purchaseOrder) : invoice.poNumber;
      if (!invoiceByPo.has(key)) invoiceByPo.set(key, invoice);
    });
    const readyPurchaseOrders = purchaseOrders
      .filter(po => receiptPoNumbers.has(po.poNumber))
      .map(po => ({
        ...po.toObject(),
        invoice: invoiceByPo.get(String(po._id)) || invoiceByPo.get(po.poNumber) || null
      }));
    res.json({ success: true, count: readyPurchaseOrders.length, purchaseOrders: readyPurchaseOrders });
  } catch (error) {
    next(error);
  }
};

exports.getInvoiceDocument = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).select('fileUrl document');
    if (!invoice || !invoice.fileUrl) {
      return res.status(404).json({ success: false, message: 'Invoice not generated/uploaded yet.' });
    }
    res.redirect(invoice.fileUrl);
  } catch (error) {
    next(error);
  }
};

exports.triggerMatch = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    if (!['SUPPLIER_GENERATED', 'SUPPLIER_UPLOAD'].includes(invoice.sourceType)) {
      return res.status(409).json({ success: false, message: 'Finance can match only the invoice submitted by the supplier for this Purchase Order.' });
    }
    const matchResult = await runThreeWayMatch(invoice, req.user);
    const invoices = await invoiceList();
    const payments = await Payment.find({ invoiceId: { $in: invoices.map(row => row._id) } }).sort({ createdAt: -1 });
    res.json({ success: true, invoice, matchResult, invoices, payments });
  } catch (error) {
    next(error);
  }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    const paidPayment = await Payment.findOne({ invoiceId: invoice._id, paymentStatus: 'PAID' });
    if (paidPayment) return res.status(409).json({ success: false, message: 'A paid invoice cannot be deleted.' });
    await Payment.deleteMany({ invoiceId: invoice._id });
    await invoice.deleteOne();
    await AuditLog.create({
      user: req.user.name,
      role: req.user.role,
      action: 'DELETE_INVOICE',
      entity: 'Invoice',
      entityId: invoice.invoiceNumber,
      details: `Deleted invoice record ${invoice.invoiceNumber}; external document retention follows storage policy.`
    });
    res.json({ success: true, message: `Invoice ${invoice.invoiceNumber} deleted.` });
  } catch (error) {
    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const matchableInvoiceIds = (await invoiceList()).map(invoice => invoice._id);
    const payments = await Payment.find({ invoiceId: { $in: matchableInvoiceIds } }).sort({ createdAt: -1 });
    res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    next(error);
  }
};

exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'APPROVED', 'ON_HOLD', 'PROCESSING', 'PAID'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid payment status.' });
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });
    if (payment.matchStatus !== 'MATCHED' && ['APPROVED', 'PROCESSING', 'PAID'].includes(status)) {
      return res.status(409).json({ success: false, message: 'Only a fully MATCHED invoice can be approved or paid.' });
    }
    if (payment.paymentStatus === 'PAID') return res.status(409).json({ success: false, message: 'Payment is already complete.' });
    payment.paymentStatus = status;
    if (status === 'PAID') {
      payment.paymentDate = new Date();
      payment.transactionId = `TXN-${Date.now().toString().slice(-10)}`;
    }
    await payment.save();
    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });
    if (payment.paymentStatus === 'PAID') return res.status(409).json({ success: false, message: 'A completed payment cannot be deleted.' });
    await payment.deleteOne();
    res.json({ success: true, message: `Payment ${payment.paymentNumber} deleted.` });
  } catch (error) {
    next(error);
  }
};
