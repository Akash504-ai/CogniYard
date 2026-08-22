const Truck = require('../models/Truck');
const Dock = require('../models/Dock');
const ASN = require('../models/ASN');
const GoodsReceipt = require('../models/GoodsReceipt');
const Inventory = require('../models/Inventory');
const PurchaseOrder = require('../models/PurchaseOrder');
const AuditLog = require('../models/AuditLog');

// --- Trucks & Yard ---
exports.getTrucks = async (req, res) => {
  try {
    const trucks = await Truck.find().sort({ updatedAt: -1 });
    res.json({ success: true, count: trucks.length, trucks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTruckStatus = async (req, res) => {
  try {
    const { status, yardLocation, assignedDock, latitude, longitude } = req.body;
    const truck = await Truck.findOne({ truckId: req.params.truckId });
    if (!truck) {
      return res.status(404).json({ success: false, message: 'Truck not found' });
    }
    if (status) truck.status = status;
    if (yardLocation) truck.yardLocation = yardLocation;
    if (assignedDock) truck.assignedDock = assignedDock;
    if (latitude) truck.latitude = latitude;
    if (longitude) truck.longitude = longitude;

    await truck.save();
    res.json({ success: true, truck });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.simulateMovement = async (req, res) => {
  try {
    const trucks = await Truck.find({ status: { $ne: 'COMPLETED' } });
    const updatedTrucks = [];

    for (let truck of trucks) {
      // Simulate minor step towards warehouse location (Lat: 12.9716, Lng: 77.5946 or custom coordinates)
      const latDelta = (Math.random() - 0.5) * 0.005;
      const lngDelta = (Math.random() - 0.5) * 0.005;
      truck.latitude += latDelta;
      truck.longitude += lngDelta;

      // Random status transition if near gate
      if (truck.status === 'IN_TRANSIT' && Math.random() > 0.6) {
        truck.status = 'AT_GATE';
      } else if (truck.status === 'AT_GATE' && Math.random() > 0.6) {
        truck.status = 'IN_YARD';
      }

      await truck.save();
      updatedTrucks.push(truck);
    }

    res.json({ success: true, count: updatedTrucks.length, trucks: updatedTrucks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Dock Management ---
exports.getDocks = async (req, res) => {
  try {
    const docks = await Dock.find().sort({ dockNumber: 1 });
    res.json({ success: true, count: docks.length, docks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.recommendDock = async (req, res) => {
  try {
    const { truckId } = req.params;
    const truck = await Truck.findOne({ truckId });
    if (!truck) {
      return res.status(404).json({ success: false, message: 'Truck not found' });
    }

    // Find available dock suitable for load type
    const availableDocks = await Dock.find({ status: 'AVAILABLE' });
    let recommendedDock = availableDocks.find(d => 
      !d.suitableLoadTypes || d.suitableLoadTypes.length === 0 || d.suitableLoadTypes.includes(truck.loadType)
    );

    if (!recommendedDock && availableDocks.length > 0) {
      recommendedDock = availableDocks[0];
    }

    if (!recommendedDock) {
      return res.json({
        success: true,
        recommendedDock: null,
        reason: 'No docks are currently available. All docks are OCCUPIED or in MAINTENANCE.'
      });
    }

    res.json({
      success: true,
      truckId: truck.truckId,
      poNumber: truck.poNumber,
      priority: truck.priority,
      loadType: truck.loadType,
      eta: truck.eta,
      recommendedDock: {
        dockNumber: recommendedDock.dockNumber,
        name: recommendedDock.name,
        status: recommendedDock.status
      },
      reason: `Dock ${recommendedDock.dockNumber} is AVAILABLE, currently unoccupied, and optimized for ${truck.loadType} shipments with ${truck.priority} priority.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignDock = async (req, res) => {
  try {
    const { dockNumber, truckId } = req.body;
    const dock = await Dock.findOne({ dockNumber });
    const truck = await Truck.findOne({ truckId });

    if (!dock || !truck) {
      return res.status(404).json({ success: false, message: 'Dock or Truck not found' });
    }

    dock.status = 'OCCUPIED';
    dock.currentTruckId = truckId;
    dock.assignedShipmentId = truck.shipmentId;
    await dock.save();

    truck.status = 'AT_DOCK';
    truck.assignedDock = dockNumber;
    await truck.save();

    await AuditLog.create({
      user: req.user?.name || 'Warehouse Manager',
      role: req.user?.role || 'warehouse_manager',
      action: 'ASSIGN_DOCK',
      entity: 'Dock',
      entityId: dockNumber,
      details: `Assigned Truck ${truckId} to Dock ${dockNumber}`
    });

    res.json({ success: true, dock, truck });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- ASN ---
exports.getASNs = async (req, res) => {
  try {
    const asns = await ASN.find().sort({ createdAt: -1 });
    res.json({ success: true, count: asns.length, asns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createASN = async (req, res) => {
  try {
    const { poNumber, shipmentId, supplierName, items } = req.body;
    const count = await ASN.countDocuments();
    const asnNumber = `ASN-${1000 + count + 1}`;

    const asn = new ASN({
      asnNumber,
      poNumber,
      shipmentId: shipmentId || `SHP-${1000 + count + 1}`,
      supplierName,
      items: items || [],
      status: 'IN_TRANSIT'
    });

    await asn.save();
    res.status(201).json({ success: true, asn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Receiving & Goods Receipt ---
exports.getGoodsReceipts = async (req, res) => {
  try {
    const receipts = await GoodsReceipt.find().sort({ createdAt: -1 });
    res.json({ success: true, count: receipts.length, receipts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.processReceiving = async (req, res) => {
  try {
    const { poNumber, asnNumber, items, remarks } = req.body;
    const po = await PurchaseOrder.findOne({ poNumber });
    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    const count = await GoodsReceipt.countDocuments();
    const receiptNumber = `GR-${1000 + count + 1}`;

    const processedItems = items.map(item => {
      const ordered = Number(item.orderedQuantity || item.quantity || 0);
      const received = Number(item.receivedQuantity || 0);
      const damaged = Number(item.damagedQuantity || 0);
      const accepted = Math.max(0, received - damaged);
      return {
        productName: item.productName,
        orderedQuantity: ordered,
        receivedQuantity: received,
        damagedQuantity: damaged,
        acceptedQuantity: accepted
      };
    });

    const goodsReceipt = new GoodsReceipt({
      receiptNumber,
      poNumber,
      asnNumber: asnNumber || null,
      receivedBy: req.user?.name || 'Warehouse Manager',
      items: processedItems,
      remarks: remarks || 'Receiving completed at dock'
    });

    await goodsReceipt.save();

    // Update PO status
    po.status = 'RECEIVED';
    await po.save();

    // Update Inventory
    for (let item of processedItems) {
      let inv = await Inventory.findOne({ productName: item.productName });
      if (inv) {
        inv.quantityOnHand += item.acceptedQuantity;
        inv.availableQuantity += item.acceptedQuantity;
        inv.lastUpdated = new Date();
        await inv.save();
      } else {
        await Inventory.create({
          sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          productName: item.productName,
          quantityOnHand: item.acceptedQuantity,
          availableQuantity: item.acceptedQuantity,
          warehouseLocation: 'Zone A - Shelf 1'
        });
      }
    }

    await AuditLog.create({
      user: req.user?.name || 'Warehouse Manager',
      role: req.user?.role || 'warehouse_manager',
      action: 'PROCESS_RECEIVING',
      entity: 'GoodsReceipt',
      entityId: receiptNumber,
      details: `Processed receiving for ${poNumber}. Goods Receipt: ${receiptNumber}`
    });

    res.status(201).json({ success: true, goodsReceipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Inventory ---
exports.getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find().sort({ productName: 1 });
    res.json({ success: true, count: inventory.length, inventory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
