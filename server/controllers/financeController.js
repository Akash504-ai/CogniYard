const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const PurchaseOrder = require('../models/PurchaseOrder');
const GoodsReceipt = require('../models/GoodsReceipt');
const AuditLog = require('../models/AuditLog');
const {
  calculateThreeWayMatch,
  runThreeWayMatch
} = require('../services/invoiceService');

async function invoiceList() {
  const invoices = await Invoice.find({
    submissionStatus: { $ne: 'REJECTED' }
  })
    .populate('supplier', 'code name companyName')
    .populate('submittedBy', 'name role')
    .populate('payment')
    .sort({ submittedAt: -1, createdAt: -1 });

  // Synchronize 3-way matching & OCR telemetry for any pending / unreconciled invoices
  for (const inv of invoices) {
    if (inv.matchStatus !== 'MANUALLY_APPROVED' && (!inv.matchDetails?.comparisons?.length || inv.matchStatus === 'PENDING' || !inv.matchStatus)) {
      try {
        let purchaseOrder = await PurchaseOrder.findOne({ 
          $or: [{ poNumber: inv.poNumber }, { _id: inv.purchaseOrder }] 
        });
        let goodsReceipts = await GoodsReceipt.find({ 
          $or: [{ poNumber: inv.poNumber }, ...(purchaseOrder ? [{ purchaseOrder: purchaseOrder._id }] : [])]
        });

        if (!purchaseOrder) {
          purchaseOrder = {
            poNumber: inv.poNumber || 'PO-1028',
            supplierName: inv.supplierName || inv.supplier?.name || 'CogniYard Demo Supplier',
            items: (inv.items || []).map(it => ({
              productName: it.productName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalPrice: it.totalPrice || (it.quantity * it.unitPrice)
            }))
          };
        }

        if (!goodsReceipts.length) {
          goodsReceipts = [{
            poNumber: purchaseOrder.poNumber,
            supplierName: purchaseOrder.supplierName,
            grnNumber: inv.grnNumber || 'GRN-5011',
            receivedDate: new Date(),
            items: (purchaseOrder.items || []).map(it => ({
              productName: it.productName,
              orderedQuantity: it.quantity,
              receivedQuantity: it.quantity,
              acceptedQuantity: it.quantity,
              rejectedQuantity: 0,
              unitPrice: it.unitPrice
            }))
          }];
        }

        const matchResult = calculateThreeWayMatch(purchaseOrder, goodsReceipts, inv);
        inv.matchStatus = matchResult.status;
        inv.submissionStatus = matchResult.status === 'MATCHED' ? 'VALIDATED' : 'SUBMITTED';
        inv.paymentStatus = matchResult.status === 'MATCHED' ? 'APPROVED' : 'ON_HOLD';
        inv.matchDetails = {
          comparisons: matchResult.comparisons,
          reasons: matchResult.reasons,
          summary: matchResult.summary,
          aiVerdict: matchResult.aiVerdict,
          aiReasoning: matchResult.aiReasoning,
          autoApproved: matchResult.autoApproved,
          matchedAt: new Date()
        };
        inv.ocrData = matchResult.ocrData;
        if (inv.save) await inv.save();
      } catch (err) {
        console.error('3-Way Match calculation error for invoice:', inv.invoiceNumber, err);
      }
    }
  }

  const payments = await Payment.find({
    invoiceId: { $in: invoices.map(i => i._id) }
  }).lean();
  const paymentByInvoiceId = new Map();
  payments.forEach(p => paymentByInvoiceId.set(String(p.invoiceId), p));

  return invoices.map(inv => {
    const invObj = inv.toObject ? inv.toObject() : { ...inv };
    const p = paymentByInvoiceId.get(String(inv._id)) || invObj.payment || null;
    const isManuallyApproved = invObj.matchStatus === 'MANUALLY_APPROVED' || Boolean(invObj.manualApproval);
    return {
      ...invObj,
      payment: p,
      matchStatus: isManuallyApproved ? 'MANUALLY_APPROVED' : invObj.matchStatus,
      status: invObj.status || (isManuallyApproved || invObj.matchStatus === 'MATCHED' ? 'APPROVED' : invObj.matchStatus === 'MISMATCHED' || invObj.matchStatus === 'MISMATCH_QTY' ? 'ON_HOLD' : 'APPROVED'),
      paymentStatus: p?.paymentStatus || invObj.paymentStatus || (isManuallyApproved || invObj.matchStatus === 'MATCHED' ? 'APPROVED' : invObj.matchStatus === 'MISMATCHED' || invObj.matchStatus === 'MISMATCH_QTY' ? 'ON_HOLD' : 'APPROVED')
    };
  });
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
    const invoices = await invoiceList();
    const invoiceIds = invoices.map(invoice => invoice._id);
    const invoiceNumbers = invoices.map(invoice => invoice.invoiceNumber);
    const payments = await Payment.find({ 
      $or: [
        { invoiceId: { $in: invoiceIds } },
        { invoiceNumber: { $in: invoiceNumbers } }
      ]
    }).sort({ createdAt: -1 });
    res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    next(error);
  }
};

exports.updatePaymentStatus = async (req, res, next) => {
  try {
    let { status } = req.body;
    if (!status || status === 'COMPLETED' || status === 'DISBURSED') status = 'PAID';
    const validStatuses = ['PENDING', 'APPROVED', 'ON_HOLD', 'PROCESSING', 'PAID'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid payment status.' });

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(req.params.id));
    let payment = null;

    if (isObjectId) {
      payment = await Payment.findById(req.params.id);
    }
    if (!payment) {
      payment = await Payment.findOne({
        $or: [
          ...(isObjectId ? [{ invoiceId: req.params.id }] : []),
          { invoiceNumber: req.params.id },
          { paymentNumber: req.params.id },
          { paymentReference: req.params.id }
        ]
      });
    }

    if (!payment) {
      // Find matching invoice
      let invoice = null;
      if (isObjectId) {
        invoice = await Invoice.findById(req.params.id);
      }
      if (!invoice) {
        invoice = await Invoice.findOne({ invoiceNumber: req.params.id });
      }

      if (invoice) {
        payment = await Payment.create({
          paymentNumber: `PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
          paymentReference: `PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          poNumber: invoice.poNumber,
          supplierName: invoice.supplierName || invoice.supplier?.name || 'CogniYard Demo Supplier',
          vendorName: invoice.supplierName || invoice.supplier?.name || 'CogniYard Demo Supplier',
          amount: invoice.totalAmount || invoice.amount || 0,
          paymentMethod: 'RTGS / Automated ACH',
          matchStatus: invoice.matchStatus || 'MATCHED',
          paymentStatus: status,
          status: status === 'PAID' ? 'COMPLETED' : 'AUTHORIZED'
        });
      }
    }

    const txnId = `TXN-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (payment) {
      // Guard: Do not allow disbursement of payments that are on AP Hold or have unapproved variances
      if (
        (payment.paymentStatus === 'ON_HOLD' || ['PARTIALLY_MATCHED', 'MISMATCHED', 'MISMATCH_QTY'].includes(payment.matchStatus)) &&
        payment.matchStatus !== 'MANUALLY_APPROVED' &&
        status === 'PAID'
      ) {
        return res.status(409).json({
          success: false,
          message: 'Disbursement blocked: Payment voucher is locked ON_HOLD due to active 3-Way Match variance. Manual AP approval override is required before funds can be disbursed.'
        });
      }

      payment.paymentStatus = status;
      payment.status = status === 'PAID' ? 'COMPLETED' : status;
      if (status === 'PAID') {
        payment.paymentDate = new Date();
        payment.disbursementDate = new Date().toLocaleDateString();
        payment.transactionId = payment.transactionId || txnId;
      }
      await payment.save();

      if (payment.invoiceId) {
        await Invoice.findByIdAndUpdate(payment.invoiceId, {
          paymentStatus: status,
          status: status === 'PAID' ? 'PAID' : status,
          disbursedAt: status === 'PAID' ? new Date() : null,
          transactionId: payment.transactionId || txnId,
          payment: payment._id
        });
      }
    }

    const invoices = await invoiceList();
    const payments = await Payment.find({}).sort({ createdAt: -1 });

    res.json({ success: true, payment, invoices, payments, transactionId: txnId });
  } catch (error) {
    next(error);
  }
};

exports.manualApproveInvoice = async (req, res, next) => {
  try {
    let invoice = null;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(req.params.id));
    if (isObjectId) {
      invoice = await Invoice.findById(req.params.id);
    }
    if (!invoice) {
      invoice = await Invoice.findOne({ invoiceNumber: req.params.id });
    }
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    invoice.matchStatus = 'MANUALLY_APPROVED';
    invoice.submissionStatus = 'VALIDATED';
    invoice.paymentStatus = 'APPROVED';
    invoice.status = 'APPROVED';
    invoice.manualApproval = {
      approvedBy: req.user?.name || 'AP Finance Manager',
      approvedAt: new Date(),
      notes: req.body.notes || 'Manual AP override approval granted after variance review.'
    };

    let payment = await Payment.findOne({
      $or: [{ invoiceId: invoice._id }, { invoiceNumber: invoice.invoiceNumber }]
    });
    if (!payment) {
      const payRef = `PAY-${(invoice.poNumber || '2025').replace(/[^0-9]/g, '') || Date.now().toString().slice(-6)}`;
      payment = new Payment({
        paymentNumber: payRef,
        paymentReference: payRef,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        poNumber: invoice.poNumber,
        supplierName: invoice.supplierName || invoice.supplier?.name || 'CogniYard Demo Supplier',
        vendorName: invoice.supplierName || invoice.supplier?.name || 'CogniYard Demo Supplier',
        amount: invoice.totalAmount || invoice.amount || 0,
        paymentMethod: 'RTGS / Automated ACH',
        status: 'AUTHORIZED',
        paymentStatus: 'APPROVED',
        matchStatus: 'MANUALLY_APPROVED',
        disbursementDate: 'Queued (Auto-Approved)'
      });
    } else {
      payment.matchStatus = 'MANUALLY_APPROVED';
      if (payment.paymentStatus !== 'PAID' && payment.status !== 'COMPLETED') {
        payment.paymentStatus = 'APPROVED';
        payment.status = 'AUTHORIZED';
        payment.disbursementDate = 'Queued (Auto-Approved)';
      }
    }
    await payment.save();

    invoice.payment = payment._id;
    await invoice.save();

    await AuditLog.create({
      user: req.user?.name || 'AP Finance Manager',
      role: req.user?.role || 'finance_user',
      action: 'MANUAL_APPROVE_INVOICE',
      entity: 'Invoice',
      entityId: invoice.invoiceNumber,
      details: `Manual AP override approval granted for invoice ${invoice.invoiceNumber}. Variance accepted. Ready for disbursement in payment ledger.`
    });

    const invoices = await invoiceList();
    const invoiceIds = invoices.map(row => row._id);
    const invoiceNumbers = invoices.map(row => row.invoiceNumber);
    const payments = await Payment.find({
      $or: [
        { invoiceId: { $in: invoiceIds } },
        { invoiceNumber: { $in: invoiceNumbers } }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      invoice,
      payment,
      invoices,
      payments,
      message: `Invoice ${invoice.invoiceNumber} manually approved. Voucher authorized for disbursement in Payment Ledger.`
    });
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
