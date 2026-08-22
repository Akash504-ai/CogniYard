const Truck = require('../models/Truck');
const Dock = require('../models/Dock');
const ASN = require('../models/ASN');
const GoodsReceipt = require('../models/GoodsReceipt');
const Inventory = require('../models/Inventory');
const PurchaseOrder = require('../models/PurchaseOrder');
const AuditLog = require('../models/AuditLog');

// --- Trucks & Yard ---
exports.getTrucks = async (req, res, next) => {
  try {
    const trucks = await Truck.find().sort({ updatedAt: -1 });
    res.json({ success: true, count: trucks.length, trucks });
  } catch (error) {
    next(error);
  }
};

exports.updateTruckStatus = async (req, res, next) => {
  try {
    const { status, yardLocation, assignedDock, latitude, longitude, eta } = req.body;
    const truck = await Truck.findOne({ truckId: req.params.truckId });
    if (!truck) {
      return res.status(404).json({ success: false, message: 'Truck not found in yard log.' });
    }

    // Latitude & Longitude validation
    if (latitude !== undefined && (typeof latitude !== 'number' || latitude < -90 || latitude > 90)) {
      return res.status(400).json({ success: false, message: 'Latitude must be a valid number between -90 and 90.' });
    }
    if (longitude !== undefined && (typeof longitude !== 'number' || longitude < -180 || longitude > 180)) {
      return res.status(400).json({ success: false, message: 'Longitude must be a valid number between -180 and 180.' });
    }

    const validStatuses = ['SCHEDULED', 'IN_TRANSIT', 'AT_GATE', 'IN_YARD', 'AT_DOCK', 'UNLOADING', 'COMPLETED', 'DELAYED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status '${status}'.` });
    }

    if (status) truck.status = status;
    if (yardLocation) truck.yardLocation = yardLocation;
    if (assignedDock !== undefined) truck.assignedDock = assignedDock;
    if (latitude !== undefined) truck.latitude = latitude;
    if (longitude !== undefined) truck.longitude = longitude;
    if (eta) truck.eta = eta;

    await truck.save();
    res.json({ success: true, truck });
  } catch (error) {
    next(error);
  }
};

exports.simulateMovement = async (req, res, next) => {
  try {
    const trucks = await Truck.find({ status: { $ne: 'COMPLETED' } });
    const updatedTrucks = [];

    for (let truck of trucks) {
      const latDelta = (Math.random() - 0.5) * 0.004;
      const lngDelta = (Math.random() - 0.5) * 0.004;
      truck.latitude = Math.max(-90, Math.min(90, truck.latitude + latDelta));
      truck.longitude = Math.max(-180, Math.min(180, truck.longitude + lngDelta));

      if (truck.status === 'IN_TRANSIT' && Math.random() > 0.5) {
        truck.status = 'AT_GATE';
      } else if (truck.status === 'AT_GATE' && Math.random() > 0.5) {
        truck.status = 'IN_YARD';
      }

      await truck.save();
      updatedTrucks.push(truck);
    }

    res.json({ success: true, count: updatedTrucks.length, trucks: updatedTrucks });
  } catch (error) {
    next(error);
  }
};

exports.simulateDelay = async (req, res, next) => {
  try {
    const { truckId } = req.params;
    const truck = await Truck.findOne({ truckId });
    if (!truck) {
      return res.status(404).json({ success: false, message: 'Truck not found in yard log.' });
    }

    truck.status = 'DELAYED';
    truck.eta = '12:15 PM';
    await truck.save();

    await AuditLog.create({
      user: req.user?.name || 'Warehouse Manager',
      role: req.user?.role || 'warehouse_manager',
      action: 'SIMULATE_DELAY',
      entity: 'Truck',
      entityId: truckId,
      details: `Simulated delay for Truck ${truckId}. Status set to DELAYED, new ETA: 12:15 PM`
    });

    res.json({
      success: true,
      truck,
      alertMessage: '⚠️ Truck delayed. Dock planning may require reassignment.'
    });
  } catch (error) {
    next(error);
  }
};

// --- Dock Management & Recommendation Engine ---
exports.getDocks = async (req, res, next) => {
  try {
    const docks = await Dock.find().sort({ dockNumber: 1 });
    res.json({ success: true, count: docks.length, docks });
  } catch (error) {
    next(error);
  }
};

exports.recommendDock = async (req, res, next) => {
  try {
    const { truckId } = req.params;
    const truck = await Truck.findOne({ truckId });
    if (!truck) {
      return res.status(404).json({ success: false, message: 'Truck not found in yard log.' });
    }

    const availableDocks = await Dock.find({ status: 'AVAILABLE' });

    if (!availableDocks || availableDocks.length === 0) {
      return res.json({
        success: true,
        recommendedDock: null,
        reason: 'No docks are currently available. All docks are OCCUPIED or under MAINTENANCE.'
      });
    }

    const scoredDocks = availableDocks.map(dock => {
      let score = 50;
      const rationale = ['✓ Available'];

      if (!dock.suitableLoadTypes || dock.suitableLoadTypes.length === 0 || dock.suitableLoadTypes.includes(truck.loadType)) {
        score += 30;
        rationale.push(`✓ Compatible load type (${truck.loadType})`);
      } else {
        rationale.push(`⚠ Load type mismatch (${truck.loadType})`);
      }

      if (['HIGH', 'URGENT'].includes(truck.priority)) {
        score += 15;
        rationale.push(`✓ High-priority truck (${truck.priority})`);
      }

      score += 9;
      rationale.push('✓ Suitable for arrival window');

      return {
        dockNumber: dock.dockNumber,
        name: dock.name,
        status: dock.status,
        suitableLoadTypes: dock.suitableLoadTypes,
        score: Math.min(100, score),
        rationale
      };
    });

    scoredDocks.sort((a, b) => b.score - a.score);
    const topDock = scoredDocks[0];

    res.json({
      success: true,
      truckId: truck.truckId,
      poNumber: truck.poNumber,
      priority: truck.priority,
      loadType: truck.loadType,
      eta: truck.eta,
      recommendedDock: topDock,
      reason: `Dock ${topDock.dockNumber} recommended (Score ${topDock.score}/100): ${topDock.rationale.join(' | ')}`
    });
  } catch (error) {
    next(error);
  }
};

exports.assignDock = async (req, res, next) => {
  try {
    const { dockNumber, truckId } = req.body;
    if (!dockNumber || !truckId) {
      return res.status(400).json({ success: false, message: 'Both dockNumber and truckId are required.' });
    }

    const dock = await Dock.findOne({ dockNumber });
    if (!dock) {
      return res.status(404).json({ success: false, message: `Dock '${dockNumber}' not found.` });
    }

    if (dock.status === 'OCCUPIED') {
      return res.status(400).json({ success: false, message: `Dock '${dockNumber}' is already OCCUPIED by Truck ${dock.currentTruckId}.` });
    }
    if (dock.status === 'MAINTENANCE') {
      return res.status(400).json({ success: false, message: `Dock '${dockNumber}' is currently under MAINTENANCE.` });
    }

    const truck = await Truck.findOne({ truckId });
    if (!truck) {
      return res.status(404).json({ success: false, message: `Truck '${truckId}' not found.` });
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
      details: `Assigned Truck ${truckId} to Dock ${dockNumber} (Status: OCCUPIED)`
    });

    res.json({ success: true, dock, truck });
  } catch (error) {
    next(error);
  }
};

exports.releaseDock = async (req, res, next) => {
  try {
    const { dockNumber, truckId } = req.body;
    let dock = null;

    if (dockNumber) {
      dock = await Dock.findOne({ dockNumber });
    } else if (truckId) {
      dock = await Dock.findOne({ currentTruckId: truckId });
    }

    if (!dock) {
      return res.status(404).json({ success: false, message: 'Dock not found or no dock is assigned to this truck.' });
    }

    if (dock.status !== 'OCCUPIED') {
      return res.status(400).json({ success: false, message: `Dock '${dock.dockNumber}' is not currently occupied.` });
    }

    const assignedTruckId = dock.currentTruckId;

    dock.status = 'AVAILABLE';
    dock.currentTruckId = null;
    dock.assignedShipmentId = null;
    await dock.save();

    let truck = null;
    if (assignedTruckId) {
      truck = await Truck.findOne({ truckId: assignedTruckId });
      if (truck) {
        truck.status = 'COMPLETED';
        truck.assignedDock = null;
        await truck.save();
      }
    }

    await AuditLog.create({
      user: req.user?.name || 'Warehouse Manager',
      role: req.user?.role || 'warehouse_manager',
      action: 'RELEASE_DOCK',
      entity: 'Dock',
      entityId: dock.dockNumber,
      details: `Released Dock ${dock.dockNumber}. Truck ${assignedTruckId || 'Unknown'} status updated to COMPLETED.`
    });

    res.json({
      success: true,
      dock,
      truck,
      message: `Dock ${dock.dockNumber} released successfully and marked AVAILABLE.`
    });
  } catch (error) {
    next(error);
  }
};

// --- ASN ---
exports.getASNs = async (req, res, next) => {
  try {
    const asns = await ASN.find().sort({ createdAt: -1 });
    res.json({ success: true, count: asns.length, asns });
  } catch (error) {
    next(error);
  }
};

exports.createASN = async (req, res, next) => {
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
    next(error);
  }
};

// --- Receiving & Goods Receipt ---
exports.getGoodsReceipts = async (req, res, next) => {
  try {
    const receipts = await GoodsReceipt.find().sort({ createdAt: -1 });
    res.json({ success: true, count: receipts.length, receipts });
  } catch (error) {
    next(error);
  }
};

exports.processReceiving = async (req, res, next) => {
  try {
    const { poNumber, asnNumber, items, remarks } = req.body;

    if (!poNumber) {
      return res.status(400).json({ success: false, message: 'Purchase Order number is required.' });
    }

    const po = await PurchaseOrder.findOne({ poNumber });
    if (!po) {
      return res.status(404).json({ success: false, message: `Purchase Order '${poNumber}' not found.` });
    }

    // Calculate total ordered quantity for this PO
    const totalOrdered = po.items.reduce((sum, i) => sum + i.quantity, 0);

    // Calculate previously received quantity for this PO across existing Goods Receipts
    const previousReceipts = await GoodsReceipt.find({ poNumber });
    const previouslyReceived = previousReceipts.reduce((sum, gr) => {
      return sum + gr.items.reduce((subSum, item) => subSum + item.receivedQuantity, 0);
    }, 0);

    const remainingQuantity = Math.max(0, totalOrdered - previouslyReceived);

    if (po.status === 'COMPLETED' || (po.status === 'RECEIVED' && remainingQuantity <= 0)) {
      return res.status(400).json({ success: false, message: `Purchase Order '${poNumber}' is already fully received.` });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Receiving process must contain at least one item.' });
    }

    // Duplicate Submission Protection (Lock Window: 3 seconds)
    const recentDuplicate = await GoodsReceipt.findOne({
      poNumber,
      createdAt: { $gte: new Date(Date.now() - 3000) }
    });
    if (recentDuplicate) {
      return res.status(400).json({ success: false, message: 'Duplicate receiving submission detected. Please wait a moment.' });
    }

    const processedItems = [];
    let currentBatchReceived = 0;
    let currentBatchAccepted = 0;

    for (const item of items) {
      const ordered = Number(item.orderedQuantity || item.quantity || totalOrdered);
      const received = Number(item.receivedQuantity);
      const damaged = Number(item.damagedQuantity || 0);

      // Validate quantities
      if (isNaN(received) || received < 0) {
        return res.status(400).json({ success: false, message: 'Received quantity cannot be negative.' });
      }
      if (isNaN(damaged) || damaged < 0) {
        return res.status(400).json({ success: false, message: 'Damaged quantity cannot be negative.' });
      }
      if (damaged > received) {
        return res.status(400).json({ success: false, message: `Damaged quantity (${damaged}) cannot exceed received quantity (${received}).` });
      }
      if (received > remainingQuantity) {
        return res.status(400).json({ success: false, message: `Received quantity (${received}) exceeds remaining unreceived PO quantity (${remainingQuantity}).` });
      }

      const accepted = received - damaged;
      if (accepted < 0) {
        return res.status(400).json({ success: false, message: 'Accepted quantity cannot be negative.' });
      }

      currentBatchReceived += received;
      currentBatchAccepted += accepted;

      processedItems.push({
        productName: item.productName || po.items[0]?.productName || 'Industrial Item',
        orderedQuantity: ordered,
        receivedQuantity: received,
        damagedQuantity: damaged,
        acceptedQuantity: accepted
      });
    }

    const count = await GoodsReceipt.countDocuments();
    const receiptNumber = `GR-${1000 + count + 1}-${Math.floor(100 + Math.random() * 900)}`;

    const goodsReceipt = new GoodsReceipt({
      receiptNumber,
      poNumber,
      asnNumber: asnNumber || null,
      receivedBy: req.user?.name || 'Warehouse Manager',
      items: processedItems,
      remarks: remarks || 'Receiving completed at dock'
    });

    await goodsReceipt.save();

    // Determine new PO status (PARTIALLY_RECEIVED vs RECEIVED)
    const newTotalReceived = previouslyReceived + currentBatchReceived;
    if (newTotalReceived >= totalOrdered) {
      po.status = 'RECEIVED';
    } else {
      po.status = 'PARTIALLY_RECEIVED';
    }
    await po.save();

    // Update Inventory strictly by acceptedQuantity!
    for (let item of processedItems) {
      if (item.acceptedQuantity > 0) {
        let inv = await Inventory.findOne({ 
          productName: { $regex: new RegExp(item.productName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i') } 
        });
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
            warehouseLocation: 'Zone C - General Storage'
          });
        }
      }
    }

    await AuditLog.create({
      user: req.user?.name || 'Warehouse Manager',
      role: req.user?.role || 'warehouse_manager',
      action: 'PROCESS_RECEIVING',
      entity: 'GoodsReceipt',
      entityId: receiptNumber,
      details: `Processed receiving for ${poNumber}. Goods Receipt ${receiptNumber} (Accepted: ${currentBatchAccepted}, PO Status: ${po.status})`
    });

    // If PO is fully received, automatically complete the truck and release assigned dock
    if (po.status === 'RECEIVED') {
      const truck = await Truck.findOne({ poNumber });
      if (truck) {
        const assignedDockNumber = truck.assignedDock;
        truck.status = 'COMPLETED';
        truck.assignedDock = null;
        await truck.save();

        if (assignedDockNumber) {
          const dock = await Dock.findOne({ dockNumber: assignedDockNumber });
          if (dock) {
            dock.status = 'AVAILABLE';
            dock.currentTruckId = null;
            await dock.save();
          }
        }
      }
    }

    const updatedTrucks = await Truck.find().sort({ updatedAt: -1 });
    const updatedDocks = await Dock.find().sort({ dockNumber: 1 });
    const updatedInventory = await Inventory.find().sort({ productName: 1 });
    const updatedReceipts = await GoodsReceipt.find().sort({ createdAt: -1 });

    res.status(201).json({
      success: true,
      goodsReceipt,
      poStatus: po.status,
      totalOrdered,
      previouslyReceived,
      newTotalReceived,
      remainingQuantity: Math.max(0, totalOrdered - newTotalReceived),
      trucks: updatedTrucks,
      docks: updatedDocks,
      inventory: updatedInventory,
      receipts: updatedReceipts
    });
  } catch (error) {
    next(error);
  }
};

// --- Inventory ---
exports.getInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.find().sort({ productName: 1 });
    res.json({ success: true, count: inventory.length, inventory });
  } catch (error) {
    next(error);
  }
};
