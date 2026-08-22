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
exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json({ success: true, count: invoices.length, invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const { invoiceNumber, supplierName, poNumber, items, totalAmount, fileUrl, notes } = req.body;
    
    // Auto-generate invoice number if missing
    const invNum = invoiceNumber || `INV-${Math.floor(10000 + Math.random() * 90000)}`;

    const processedItems = (items || []).map(item => ({
      productName: item.productName,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.quantity) * Number(item.unitPrice)
    }));

    const calculatedTotal = processedItems.length > 0 
      ? processedItems.reduce((sum, i) => sum + i.totalPrice, 0)
      : Number(totalAmount || 0);

    const invoice = new Invoice({
      invoiceNumber: invNum,
      supplierName: supplierName || 'Supplier',
      poNumber,
      items: processedItems,
      totalAmount: calculatedTotal,
      fileUrl: fileUrl || 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      matchStatus: 'PENDING',
      notes: notes || ''
    });

    await invoice.save();

    // Trigger automatic 3-Way Matching check!
    await runThreeWayMatch(invoice);

    res.status(201).json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 3-Way Matching Core Logic ---
const runThreeWayMatch = async (invoice) => {
  try {
    const po = await PurchaseOrder.findOne({ poNumber: invoice.poNumber });
    const receipt = await GoodsReceipt.findOne({ poNumber: invoice.poNumber });

    let matchStatus = 'PENDING';
    let mismatchReasons = [];

    if (!po) {
      mismatchReasons.push('Purchase Order not found in system.');
    }

    if (!receipt) {
      mismatchReasons.push('Goods Receipt not found (Goods have not been received yet).');
    }

    if (po && receipt) {
      // Calculate total PO quantity and total Goods Receipt accepted quantity
      const poQty = po.items.reduce((sum, item) => sum + item.quantity, 0);
      const receiptQty = receipt.items.reduce((sum, item) => sum + item.acceptedQuantity, 0);
      const invoiceQty = invoice.items.length > 0 
        ? invoice.items.reduce((sum, item) => sum + item.quantity, 0)
        : poQty; // Fallback if invoice items summary

      const poAmount = po.totalAmount;
      const invoiceAmount = invoice.totalAmount;

      const qtyMatch = receiptQty === invoiceQty && poQty === invoiceQty;
      const amountMatch = Math.abs(poAmount - invoiceAmount) < 1.0;

      if (qtyMatch && amountMatch) {
        matchStatus = 'MATCHED';
      } else {
        matchStatus = 'MISMATCH';
        if (receiptQty !== invoiceQty) {
          mismatchReasons.push(`Quantity Mismatch: Received/Accepted ${receiptQty} units, but Invoice billed for ${invoiceQty} units (PO was ${poQty} units).`);
        }
        if (!amountMatch) {
          mismatchReasons.push(`Amount Mismatch: PO Total \$${poAmount}, Invoice Total \$${invoiceAmount}.`);
        }
      }
    } else {
      matchStatus = 'MISMATCH';
    }

    invoice.matchStatus = matchStatus;
    invoice.ocrData = {
      matched: matchStatus === 'MATCHED',
      reasons: mismatchReasons,
      timestamp: new Date()
    };
    await invoice.save();

    // Create or update Payment record
    const count = await Payment.countDocuments();
    const paymentNumber = `PAY-${1000 + count + 1}`;
    
    let payment = await Payment.findOne({ invoiceNumber: invoice.invoiceNumber });
    if (!payment) {
      payment = new Payment({
        paymentNumber,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        poNumber: invoice.poNumber,
        supplierName: invoice.supplierName,
        amount: invoice.totalAmount,
        matchStatus: matchStatus,
        paymentStatus: matchStatus === 'MATCHED' ? 'APPROVED' : 'ON_HOLD'
      });
    } else {
      payment.matchStatus = matchStatus;
      payment.paymentStatus = matchStatus === 'MATCHED' ? 'APPROVED' : 'ON_HOLD';
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

    return { matchStatus, payment };
  } catch (err) {
    console.error('Error running 3-way match:', err);
  }
};

exports.triggerMatch = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const result = await runThreeWayMatch(invoice);
    res.json({ success: true, invoice, matchResult: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Payments ---
exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    payment.paymentStatus = status;
    if (status === 'PAID') {
      payment.paymentDate = new Date();
      payment.transactionId = `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;
    }
    await payment.save();

    await AuditLog.create({
      user: req.user?.name || 'Finance Manager',
      role: req.user?.role || 'finance_user',
      action: 'UPDATE_PAYMENT_STATUS',
      entity: 'Payment',
      entityId: payment.paymentNumber,
      details: `Updated payment status for ${payment.paymentNumber} to ${status}`
    });

    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
