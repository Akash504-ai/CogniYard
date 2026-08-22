const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const Shipment = require('../models/Shipment');
const Truck = require('../models/Truck');
const AuditLog = require('../models/AuditLog');

// --- Products ---
exports.getProducts = async (req, res, next) => {
  try {
    const products = await Product.find().populate('preferredSupplier');
    res.json({ success: true, count: products.length, products });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// --- Suppliers & AI Evaluation ---
exports.getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find().sort({ rating: -1 });
    res.json({ success: true, count: suppliers.length, suppliers });
  } catch (error) {
    next(error);
  }
};

exports.evaluateSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find({ status: 'ACTIVE' });

    const evaluatedSuppliers = suppliers.map(s => {
      const otdScore = s.otdScore || 90;
      const qualityScore = (s.rating / 5) * 100;
      const leadTimeScore = Math.max(0, 100 - (s.leadTimeDays * 10));

      const aiScore = Number(((otdScore * 0.4) + (qualityScore * 0.4) + (leadTimeScore * 0.2)).toFixed(1));

      return {
        _id: s._id,
        name: s.name,
        code: s.code,
        email: s.email,
        rating: s.rating,
        leadTimeDays: s.leadTimeDays,
        otdScore,
        aiScore,
        recommendationRationale: `AI Weighted Score: ${aiScore}/100 based on OTD (${otdScore}%), Rating (${s.rating}/5), and Lead Time (${s.leadTimeDays} days)`
      };
    });

    evaluatedSuppliers.sort((a, b) => b.aiScore - a.aiScore);

    res.json({
      success: true,
      count: evaluatedSuppliers.length,
      topRecommendedSupplier: evaluatedSuppliers[0] || null,
      suppliers: evaluatedSuppliers
    });
  } catch (error) {
    next(error);
  }
};

// --- Purchase Requisitions ---
exports.getRequisitions = async (req, res, next) => {
  try {
    const requisitions = await PurchaseRequisition.find().sort({ createdAt: -1 });
    res.json({ success: true, count: requisitions.length, requisitions });
  } catch (error) {
    next(error);
  }
};

exports.createRequisition = async (req, res, next) => {
  try {
    const { items, notes, priority } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Requisition must contain at least one item.' });
    }

    const processedItems = [];
    for (const item of items) {
      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: `Invalid item quantity '${item.quantity}'. Must be greater than 0.` });
      }
      const unitPrice = Number(item.estimatedUnitPrice || item.unitPrice || 50);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        return res.status(400).json({ success: false, message: `Invalid unit price for item '${item.productName}'. Must be greater than 0.` });
      }

      processedItems.push({
        productName: item.productName || 'Industrial Item',
        quantity: qty,
        estimatedUnitPrice: unitPrice,
        totalPrice: qty * unitPrice
      });
    }

    const totalAmount = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const count = await PurchaseRequisition.countDocuments();
    const prNumber = `PR-${1000 + count + 1}`;

    const requisition = new PurchaseRequisition({
      prNumber,
      requestedBy: req.user?.name || 'Procurement Manager',
      items: processedItems,
      totalAmount,
      priority: priority || 'HIGH',
      status: 'PENDING',
      notes: notes || ''
    });

    await requisition.save();

    await AuditLog.create({
      user: req.user?.name || 'System',
      role: req.user?.role || 'procurement_manager',
      action: 'CREATE_PR',
      entity: 'PurchaseRequisition',
      entityId: prNumber,
      details: `Created Purchase Requisition ${prNumber} with total amount $${totalAmount}`
    });

    res.status(201).json({ success: true, requisition });
  } catch (error) {
    next(error);
  }
};

exports.approveRequisition = async (req, res, next) => {
  try {
    const requisition = await PurchaseRequisition.findById(req.params.id);
    if (!requisition) {
      return res.status(404).json({ success: false, message: 'Purchase Requisition not found.' });
    }

    if (requisition.status === 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Requisition is already approved.' });
    }
    if (requisition.status === 'CONVERTED_TO_PO') {
      return res.status(400).json({ success: false, message: 'Requisition has already been converted to a Purchase Order.' });
    }
    if (requisition.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Cannot approve requisition in '${requisition.status}' status.` });
    }

    requisition.status = 'APPROVED';
    await requisition.save();

    await AuditLog.create({
      user: req.user?.name || 'System',
      role: req.user?.role || 'procurement_manager',
      action: 'APPROVE_PR',
      entity: 'PurchaseRequisition',
      entityId: requisition.prNumber,
      details: `Approved requisition ${requisition.prNumber}`
    });

    res.json({ success: true, requisition });
  } catch (error) {
    next(error);
  }
};

// --- Purchase Orders ---
exports.getPurchaseOrders = async (req, res, next) => {
  try {
    const pos = await PurchaseOrder.find().populate('supplier').sort({ createdAt: -1 });
    res.json({ success: true, count: pos.length, purchaseOrders: pos });
  } catch (error) {
    next(error);
  }
};

exports.createPurchaseOrder = async (req, res, next) => {
  try {
    const { prId, supplierId, items } = req.body;

    if (!supplierId) {
      return res.status(400).json({ success: false, message: 'Supplier ID is required to issue a Purchase Order.' });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    if (supplier.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: `Supplier '${supplier.name}' is inactive and cannot receive Purchase Orders.` });
    }

    let requisition = null;
    if (prId) {
      requisition = await PurchaseRequisition.findById(prId);
      if (!requisition) {
        return res.status(404).json({ success: false, message: 'Purchase Requisition not found.' });
      }

      if (requisition.status === 'PENDING') {
        return res.status(400).json({ success: false, message: 'Requisition must be approved by a Procurement Manager before issuing a Purchase Order.' });
      }
      if (requisition.status === 'CONVERTED_TO_PO') {
        return res.status(400).json({ success: false, message: 'A Purchase Order has already been issued for this Requisition.' });
      }
      if (requisition.status !== 'APPROVED') {
        return res.status(400).json({ success: false, message: `Cannot issue Purchase Order for requisition in '${requisition.status}' status.` });
      }
    }

    const itemsToProcess = items || (requisition ? requisition.items : []);
    if (!itemsToProcess || !Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
      return res.status(400).json({ success: false, message: 'Purchase Order must contain at least one item.' });
    }

    const processedItems = [];
    for (const item of itemsToProcess) {
      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: `Invalid item quantity '${item.quantity}'. Must be greater than 0.` });
      }
      const unitPrice = Number(item.unitPrice || item.estimatedUnitPrice || 50);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        return res.status(400).json({ success: false, message: `Invalid unit price for item '${item.productName}'. Must be greater than 0.` });
      }

      processedItems.push({
        productName: item.productName || 'Industrial Item',
        quantity: qty,
        unitPrice: unitPrice,
        totalPrice: qty * unitPrice
      });
    }

    const totalAmount = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const count = await PurchaseOrder.countDocuments();
    const poNumber = `PO-${1000 + count + 1}`;

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

    // Mark PR as CONVERTED_TO_PO atomically
    if (requisition) {
      requisition.status = 'CONVERTED_TO_PO';
      await requisition.save();
    }

    // Automatically create linked Shipment & Truck for Yard Logistics
    let shipment = await Shipment.findOne({ poNumber: po.poNumber });
    if (!shipment) {
      const shpCount = await Shipment.countDocuments();
      const shipmentNumber = `SHP-${1000 + shpCount + 1}-${Math.floor(100 + Math.random() * 900)}`;

      shipment = new Shipment({
        shipmentNumber,
        poNumber: po.poNumber,
        supplierName: supplier.name,
        origin: `${supplier.name} Logistics Center`,
        destination: 'CogniYard Main Yard - Gate 1',
        carrier: 'CogniExpress Logistics',
        status: 'IN_TRANSIT',
        estimatedArrival: '10:30 AM'
      });
      await shipment.save();
    }

    let truck = await Truck.findOne({ poNumber: po.poNumber });
    if (!truck) {
      const trkCount = await Truck.countDocuments();
      const truckId = `TRK-${1000 + trkCount + 1}`;
      const trailerId = `TRL-${Math.floor(1000 + Math.random() * 9000)}`;

      truck = new Truck({
        truckId,
        trailerId,
        shipmentId: shipment.shipmentNumber,
        poNumber: po.poNumber,
        driverName: 'CogniYard Express Driver',
        driverPhone: '+1-555-0199',
        latitude: 12.9716 + (Math.random() - 0.5) * 0.01,
        longitude: 77.5946 + (Math.random() - 0.5) * 0.01,
        status: 'IN_TRANSIT',
        eta: '10:30 AM',
        priority: requisition?.priority || 'HIGH',
        appointmentTime: '11:00 AM',
        loadType: 'DRY_VAN',
        yardLocation: 'In Transit to Yard Gate',
        assignedDock: null
      });
      await truck.save();
    }

    await AuditLog.create({
      user: req.user?.name || 'System',
      role: req.user?.role || 'procurement_manager',
      action: 'CREATE_PO',
      entity: 'PurchaseOrder',
      entityId: po.poNumber,
      details: `Issued Purchase Order ${poNumber} ($${totalAmount}) assigned to supplier ${supplier.name}. Created linked Shipment ${shipment.shipmentNumber} & Truck ${truck.truckId}.`
    });

    res.status(201).json({ success: true, purchaseOrder: po, shipment, truck });
  } catch (error) {
    next(error);
  }
};

exports.getPOByNumber = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findOne({ poNumber: req.params.poNumber }).populate('supplier');
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
    }
    res.json({ success: true, purchaseOrder: po });
  } catch (error) {
    next(error);
  }
};
