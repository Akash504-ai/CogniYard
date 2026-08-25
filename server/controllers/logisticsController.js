const Truck = require('../models/Truck');
const Dock = require('../models/Dock');
const ASN = require('../models/ASN');
const GoodsReceipt = require('../models/GoodsReceipt');
const Inventory = require('../models/Inventory');
const PurchaseOrder = require('../models/PurchaseOrder');
const AuditLog = require('../models/AuditLog');
const Exception = require('../models/Exception');
const yardSimulationService = require('../services/yardSimulationService');
const { compareOcrText, deriveTruckIdentity } = require('../services/gateVerificationService');

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

    const validStatuses = ['SCHEDULED', 'IN_TRANSIT', 'AT_GATE', 'IN_YARD', 'WAITING_FOR_DOCK', 'AT_DOCK', 'UNLOADING', 'COMPLETED', 'DELAYED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status '${status}'.` });
    }

    if (status === 'COMPLETED') {
      const hasReceipt = await GoodsReceipt.exists({ poNumber: truck.poNumber });
      if (!hasReceipt) {
        return res.status(409).json({ success: false, message: 'Truck cannot be completed before a Goods Receipt (GRN) is recorded.' });
      }
    }

    if (status === 'IN_YARD' && truck.gateVerification?.status !== 'APPROVED') {
      return res.status(409).json({ success: false, message: 'Number plate and driver ID must both pass the live camera gate check before this truck can enter the yard.' });
    }

    if (status) {
      truck.status = status;
      if (status === 'AT_GATE' && !truck.arrivedAt) truck.arrivedAt = new Date();
      if (status === 'UNLOADING' && !truck.unloadingStartedAt) truck.unloadingStartedAt = new Date();
      if (status === 'COMPLETED') truck.completedAt = new Date();
    }
    if (yardLocation) truck.yardLocation = yardLocation;
    if (assignedDock !== undefined) truck.assignedDock = assignedDock;
    if (latitude !== undefined) truck.latitude = latitude;
    if (longitude !== undefined) truck.longitude = longitude;
    if (eta) truck.eta = eta;

    await truck.save();
    yardSimulationService.syncTruckState(truck.truckId, { status: truck.status, yardLocation: truck.yardLocation, assignedDock: truck.assignedDock, latitude: truck.latitude, longitude: truck.longitude, eta: truck.eta });
    res.json({ success: true, truck });
  } catch (error) {
    next(error);
  }
};

exports.verifyGateIdentity = async (req, res, next) => {
  try {
    const stage = String(req.body.stage || '').trim().toUpperCase();
    const capturedText = String(req.body.capturedText || '').trim().slice(0, 500);
    const confidence = Math.max(0, Math.min(100, Number(req.body.confidence || 0)));
    const detectedObjects = Array.isArray(req.body.detectedObjects)
      ? req.body.detectedObjects.map(value => String(value).toLowerCase()).filter(Boolean).slice(0, 10)
      : [];

    if (!['PLATE', 'DRIVER_ID'].includes(stage)) {
      return res.status(400).json({ success: false, message: 'Verification stage must be PLATE or DRIVER_ID.' });
    }
    if (!capturedText) {
      return res.status(400).json({ success: false, message: 'OCR did not capture any text. Hold the document inside the purple guide and scan again.' });
    }

    const truck = await Truck.findOne({ truckId: req.params.truckId });
    if (!truck) return res.status(404).json({ success: false, message: 'Truck not found in the yard log.' });

    const identity = deriveTruckIdentity(truck);
    if (!truck.licensePlate) truck.licensePlate = identity.licensePlate;
    if (!truck.driverIdSerial) truck.driverIdSerial = identity.driverIdSerial;

    if (stage === 'DRIVER_ID' && !truck.gateVerification?.plateMatched) {
      return res.status(409).json({ success: false, message: 'Verify the number plate first.' });
    }

    const expected = stage === 'PLATE' ? identity.licensePlate : identity.driverIdSerial;
    const comparison = compareOcrText(capturedText, expected);
    const gateVerification = truck.gateVerification || {};
    gateVerification.detectedObjects = detectedObjects;
    gateVerification.verifiedBy = req.user._id;

    if (stage === 'PLATE') {
      gateVerification.plateCapturedText = capturedText;
      gateVerification.plateConfidence = confidence;
      gateVerification.plateMatched = comparison.matched;
      gateVerification.driverCapturedText = '';
      gateVerification.driverConfidence = 0;
      gateVerification.driverMatched = false;
      gateVerification.verifiedAt = null;
      gateVerification.status = comparison.matched ? 'PLATE_VERIFIED' : 'REJECTED';
    } else {
      gateVerification.driverCapturedText = capturedText;
      gateVerification.driverConfidence = confidence;
      gateVerification.driverMatched = comparison.matched;
      gateVerification.status = comparison.matched ? 'APPROVED' : 'REJECTED';
      gateVerification.verifiedAt = comparison.matched ? new Date() : null;
      if (comparison.matched && ['SCHEDULED', 'IN_TRANSIT', 'DELAYED'].includes(truck.status)) {
        truck.status = 'AT_GATE';
        truck.arrivedAt = truck.arrivedAt || new Date();
        truck.yardLocation = 'Gate OCR & Driver ID Verified';
      }
    }

    truck.gateVerification = gateVerification;
    await truck.save();
    yardSimulationService.syncTruckState(truck.truckId, {
      status: truck.status,
      yardLocation: truck.yardLocation,
      licensePlate: truck.licensePlate,
      driverIdSerial: truck.driverIdSerial,
      gateVerification: truck.gateVerification?.toObject ? truck.gateVerification.toObject() : truck.gateVerification
    });

    await AuditLog.create({
      user: req.user?.name || 'Warehouse Gate Operator',
      role: req.user?.role || 'warehouse_manager',
      action: stage === 'PLATE' ? 'VERIFY_LICENSE_PLATE_OCR' : 'VERIFY_DRIVER_ID_OCR',
      entity: 'Truck',
      entityId: truck.truckId,
      details: `${stage} OCR ${comparison.matched ? 'MATCHED' : 'MISMATCHED'} for ${truck.truckId} at ${confidence.toFixed(0)}% OCR confidence.`
    });

    res.json({
      success: true,
      matched: comparison.matched,
      stage,
      capturedText,
      expected,
      gateStatus: gateVerification.status,
      truck,
      message: comparison.matched
        ? (stage === 'PLATE' ? 'Number plate matched. Now scan the driver ID card.' : 'Driver ID matched. Gate entry is approved.')
        : `${stage === 'PLATE' ? 'Number plate' : 'Driver ID'} did not match the selected truck record. Reposition and scan again.`
    });
  } catch (error) {
    next(error);
  }
};

exports.proceedThroughGate = async (req, res, next) => {
  try {
    const truck = await Truck.findOne({ truckId: req.params.truckId });
    if (!truck) return res.status(404).json({ success: false, message: 'Truck not found in the yard log.' });
    if (truck.gateVerification?.status !== 'APPROVED') {
      return res.status(409).json({ success: false, message: 'Both number plate and driver ID must match before gate entry.' });
    }

    if (!['AT_DOCK', 'UNLOADING', 'COMPLETED'].includes(truck.status)) {
      truck.status = 'IN_YARD';
      truck.yardLocation = 'Verified Entry · Yard Queue';
      truck.arrivedAt = truck.arrivedAt || new Date();
      await truck.save();
      yardSimulationService.syncTruckState(truck.truckId, {
        status: truck.status,
        yardLocation: truck.yardLocation,
        gateVerification: truck.gateVerification?.toObject ? truck.gateVerification.toObject() : truck.gateVerification
      });
    }
    res.json({ success: true, truck, message: `${truck.truckId} passed both camera checks and may proceed to the yard.` });
  } catch (error) {
    next(error);
  }
};

exports.simulateMovement = async (req, res, next) => {
  try {
    const simState = yardSimulationService.startSimulation(req.body.speed || 1);
    res.json({ success: true, count: simState.trucks.length, trucks: simState.trucks, simState });
  } catch (error) {
    next(error);
  }
};

exports.simulateDelay = async (req, res, next) => {
  try {
    const { truckId } = req.params;
    const delayMinutes = Number(req.body.delayMinutes) || 15;
    const delayReason = req.body.delayReason || 'Traffic Congestion & Gate Queue';

    const truck = await Truck.findOne({ truckId });
    if (!truck) {
      return res.status(404).json({ success: false, message: 'Truck not found in yard log.' });
    }

    truck.status = 'DELAYED';
    truck.eta = '12:15 PM';
    await truck.save();

    // Auto-create/ensure DELAYED_TRUCK exception in Exception Center
    const existingEx = await Exception.findOne({
      sourceId: truckId,
      type: 'DELAYED_TRUCK',
      status: { $ne: 'RESOLVED' }
    });

    if (!existingEx) {
      await Exception.create({
        type: 'DELAYED_TRUCK',
        category: 'TRUCK',
        severity: 'CRITICAL',
        title: `Truck ${truckId} Delayed`,
        description: `PO Ref: ${truck.poNumber} | Driver: ${truck.driverName} | Delay Reason: ${delayReason}`,
        sourceType: 'Truck',
        sourceId: truckId,
        metadata: { truckId, poNumber: truck.poNumber, delayMinutes, delayReason }
      });
    }

    await AuditLog.create({
      user: req.user?.name || 'Warehouse Manager',
      role: req.user?.role || 'warehouse_manager',
      action: 'SIMULATE_DELAY',
      entity: 'Truck',
      entityId: truckId,
      details: `Simulated delay for Truck ${truckId} (${delayMinutes} min). Reason: ${delayReason}`
    });

    const simState = await yardSimulationService.triggerDelay(truckId, delayMinutes, delayReason);

    res.json({
      success: true,
      truck,
      simState,
      alertMessage: `⚠️ Truck ${truckId} delayed by ${delayMinutes} min (${delayReason}).`
    });
  } catch (error) {
    next(error);
  }
};

// --- Yard Simulation Control Endpoints ---
exports.startSimulation = async (req, res, next) => {
  try {
    const speed = req.body.speed || 1;
    const state = yardSimulationService.startSimulation(speed);
    res.json({ success: true, state });
  } catch (error) {
    next(error);
  }
};

exports.pauseSimulation = async (req, res, next) => {
  try {
    const state = yardSimulationService.pauseSimulation();
    res.json({ success: true, state });
  } catch (error) {
    next(error);
  }
};

exports.resetSimulation = async (req, res, next) => {
  try {
    const state = await yardSimulationService.resetSimulation();
    res.json({ success: true, state });
  } catch (error) {
    next(error);
  }
};

exports.setSimulationSpeed = async (req, res, next) => {
  try {
    const speed = req.body.speed || 1;
    const state = yardSimulationService.setSpeed(speed);
    res.json({ success: true, state });
  } catch (error) {
    next(error);
  }
};

exports.getSimulationState = async (req, res, next) => {
  try {
    const state = yardSimulationService.getState();
    res.json({ success: true, state });
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

    if (truck.status !== 'COMPLETED' && truck.gateVerification?.status !== 'APPROVED') {
      return res.status(409).json({ success: false, message: `Complete the live number-plate and driver-ID camera verification for ${truckId} before requesting a dock.` });
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

    if (truck.status !== 'COMPLETED' && truck.gateVerification?.status !== 'APPROVED') {
      return res.status(409).json({ success: false, message: `Complete the live number-plate and driver-ID camera verification for ${truckId} before assigning a dock.` });
    }

    dock.status = 'OCCUPIED';
    dock.currentTruckId = truckId;
    dock.assignedShipmentId = truck.shipmentId;
    await dock.save();

    truck.status = 'UNLOADING';
    truck.assignedDock = dockNumber;
    truck.unloadingStartedAt = new Date();
    await truck.save();

    yardSimulationService.syncTruckState(truckId, { status: 'UNLOADING', assignedDock: dockNumber, yardLocation: `Dock Bay ${dockNumber}` });

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

    if (assignedTruckId) {
      const assignedTruck = await Truck.findOne({ truckId: assignedTruckId });
      const hasReceipt = assignedTruck ? await GoodsReceipt.exists({ poNumber: assignedTruck.poNumber }) : false;
      if (assignedTruck && !hasReceipt) {
        return res.status(409).json({ success: false, message: `Create a Goods Receipt for ${assignedTruck.poNumber} before releasing this dock.` });
      }
    }

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
        truck.completedAt = new Date();
        await truck.save();
        yardSimulationService.syncTruckState(assignedTruckId, { status: 'COMPLETED', assignedDock: null });
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

    const inboundTruck = await Truck.findOne({ poNumber });
    if (inboundTruck && inboundTruck.status !== 'COMPLETED' && inboundTruck.gateVerification?.status !== 'APPROVED') {
      return res.status(409).json({ success: false, message: `Verify ${inboundTruck.truckId}'s number plate and driver ID with the live camera before receiving goods.` });
    }

    // Calculate total ordered quantity for this PO
    const totalOrdered = po.items.reduce((sum, i) => sum + i.quantity, 0);

    // Calculate previously received quantity for this PO across existing Goods Receipts
    const previousReceipts = await GoodsReceipt.find({ poNumber });
    const previouslyReceived = previousReceipts.reduce((sum, gr) => {
      return sum + gr.items.reduce((subSum, item) => subSum + item.receivedQuantity, 0);
    }, 0);
    const previouslyReceivedByItem = new Map();
    previousReceipts.forEach(receipt => receipt.items.forEach(item => {
      const key = String(item.productName || '').trim().toLowerCase();
      previouslyReceivedByItem.set(key, (previouslyReceivedByItem.get(key) || 0) + Number(item.receivedQuantity || 0));
    }));

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
      const poItem = po.items.find(candidate => candidate.productName.toLowerCase() === String(item.productName || '').trim().toLowerCase());
      if (!poItem) {
        return res.status(400).json({ success: false, message: `Item '${item.productName || 'unknown'}' does not exist on ${poNumber}.` });
      }
      const ordered = Number(poItem.quantity);
      const received = Number(item.receivedQuantity);
      const damaged = Number(item.damagedQuantity || 0);
      const itemAlreadyReceived = previouslyReceivedByItem.get(poItem.productName.toLowerCase()) || 0;
      const itemRemaining = Math.max(0, ordered - itemAlreadyReceived);

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
      if (received > itemRemaining) {
        return res.status(400).json({ success: false, message: `Received quantity (${received}) exceeds remaining quantity (${itemRemaining}) for '${poItem.productName}'.` });
      }

      const accepted = received - damaged;
      if (accepted < 0) {
        return res.status(400).json({ success: false, message: 'Accepted quantity cannot be negative.' });
      }

      currentBatchReceived += received;
      currentBatchAccepted += accepted;

      processedItems.push({
        product: poItem.product || null,
        productName: poItem.productName,
        orderedQuantity: ordered,
        receivedQuantity: received,
        damagedQuantity: damaged,
        acceptedQuantity: accepted,
        unitPrice: Number(poItem.unitPrice),
        totalPrice: Number((accepted * Number(poItem.unitPrice)).toFixed(2))
      });
    }

    const count = await GoodsReceipt.countDocuments();
    const receiptNumber = `GR-${1000 + count + 1}-${Math.floor(100 + Math.random() * 900)}`;

    const goodsReceipt = new GoodsReceipt({
      receiptNumber,
      poNumber,
      purchaseOrder: po._id,
      supplier: po.supplier,
      supplierName: po.supplierName,
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
        truck.completedAt = new Date();
        await truck.save();

        yardSimulationService.syncTruckState(truck.truckId, { status: 'COMPLETED', assignedDock: null });

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
