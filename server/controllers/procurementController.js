const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const AuditLog = require('../models/AuditLog');

// --- Products ---
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('preferredSupplier');
    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Suppliers ---
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json({ success: true, count: suppliers.length, suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.evaluateSuppliers = async (req, res) => {
  try {
    const { category, minRating } = req.query;
    const filter = {};
    if (category) filter.category = new RegExp(category, 'i');
    if (minRating) filter.rating = { $gte: parseFloat(minRating) };

    const suppliers = await Supplier.find(filter).sort({ rating: -1, otdScore: -1 });
    res.json({ success: true, suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Purchase Requisitions ---
exports.getRequisitions = async (req, res) => {
  try {
    const requisitions = await PurchaseRequisition.find().sort({ createdAt: -1 });
    res.json({ success: true, count: requisitions.length, requisitions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createRequisition = async (req, res) => {
  try {
    const { items, requestedBy, priority, aiGenerated, notes } = req.body;
    const count = await PurchaseRequisition.countDocuments();
    const prNumber = `PR-${1000 + count + 1}`;

    const processedItems = items.map(item => ({
      productName: item.productName,
      quantity: Number(item.quantity),
      estimatedUnitPrice: Number(item.estimatedUnitPrice || item.unitPrice || 50),
      totalPrice: Number(item.quantity) * Number(item.estimatedUnitPrice || item.unitPrice || 50)
    }));

    const totalAmount = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const requisition = new PurchaseRequisition({
      prNumber,
      requestedBy: requestedBy || req.user?.name || 'Procurement Manager',
      items: processedItems,
      totalAmount,
      priority: priority || 'MEDIUM',
      aiGenerated: !!aiGenerated,
      notes: notes || ''
    });

    await requisition.save();

    await AuditLog.create({
      user: req.user?.name || 'System',
      role: req.user?.role || 'procurement_manager',
      action: 'CREATE_PR',
      entity: 'PurchaseRequisition',
      entityId: requisition.prNumber,
      details: `Created requisition ${prNumber} for ${totalAmount}`
    });

    res.status(201).json({ success: true, requisition });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveRequisition = async (req, res) => {
  try {
    const requisition = await PurchaseRequisition.findById(req.params.id);
    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }
    requisition.status = 'APPROVED';
    await requisition.save();

    res.json({ success: true, requisition });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Purchase Orders ---
exports.getPurchaseOrders = async (req, res) => {
  try {
    const pos = await PurchaseOrder.find().populate('supplier').sort({ createdAt: -1 });
    res.json({ success: true, count: pos.length, purchaseOrders: pos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const { prId, supplierId, items } = req.body;
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const count = await PurchaseOrder.countDocuments();
    const poNumber = `PO-${1000 + count + 1}`;

    const processedItems = items.map(item => ({
      productName: item.productName,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice || item.estimatedUnitPrice || 50),
      totalPrice: Number(item.quantity) * Number(item.unitPrice || item.estimatedUnitPrice || 50)
    }));

    const totalAmount = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const po = new PurchaseOrder({
      poNumber,
      prId: prId || null,
      supplier: supplier._id,
      supplierName: supplier.name,
      items: processedItems,
      totalAmount,
      status: 'ISSUED'
    });

    await po.save();

    if (prId) {
      await PurchaseRequisition.findByIdAndUpdate(prId, { status: 'CONVERTED_TO_PO' });
    }

    await AuditLog.create({
      user: req.user?.name || 'System',
      role: req.user?.role || 'procurement_manager',
      action: 'CREATE_PO',
      entity: 'PurchaseOrder',
      entityId: po.poNumber,
      details: `Created Purchase Order ${poNumber} assigned to ${supplier.name}`
    });

    res.status(201).json({ success: true, purchaseOrder: po });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPOByNumber = async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ poNumber: req.params.poNumber }).populate('supplier');
    if (!po) {
      return res.status(404).json({ success: false, message: 'PO not found' });
    }
    res.json({ success: true, purchaseOrder: po });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
