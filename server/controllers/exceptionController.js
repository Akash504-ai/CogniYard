const Exception = require('../models/Exception');
const Truck = require('../models/Truck');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const Dock = require('../models/Dock');
const AuditLog = require('../models/AuditLog');

// Synchronize exceptions from operational MongoDB collections (Deduplicated)
const syncExceptionsFromCollections = async () => {
  try {
    // 1. Delayed Trucks (CRITICAL)
    const delayedTrucks = await Truck.find({ status: 'DELAYED' });
    for (const trk of delayedTrucks) {
      const exists = await Exception.findOne({
        sourceType: 'TRUCK',
        sourceId: trk._id.toString(),
        type: 'DELAYED_TRUCK',
        status: { $ne: 'RESOLVED' }
      });
      if (!exists) {
        const newEx = await Exception.create({
          type: 'DELAYED_TRUCK',
          category: 'TRUCK',
          severity: 'CRITICAL',
          title: `Truck ${trk.truckId} Delayed in Transit`,
          description: `Inbound Truck ${trk.truckId} (PO Ref: ${trk.poNumber}) driven by ${trk.driverName} is delayed. Current ETA: ${trk.eta}.`,
          sourceType: 'TRUCK',
          sourceId: trk._id.toString(),
          status: 'OPEN',
          metadata: { truckId: trk.truckId, poNumber: trk.poNumber, driverName: trk.driverName, eta: trk.eta, trailerId: trk.trailerId }
        });
        await AuditLog.create({
          user: 'System Exception Engine',
          role: 'admin',
          action: 'EXCEPTION_CREATED',
          entity: 'Exception',
          entityId: newEx._id.toString(),
          details: `Generated CRITICAL exception for delayed truck ${trk.truckId}`
        });
      }
    }

    // Auto-resolve delayed truck exceptions when truck is no longer DELAYED
    const openDelayedExceptions = await Exception.find({ type: 'DELAYED_TRUCK', status: { $ne: 'RESOLVED' } });
    for (const ex of openDelayedExceptions) {
      const trk = await Truck.findOne({ truckId: ex.metadata?.truckId });
      if (trk && trk.status !== 'DELAYED') {
        ex.status = 'RESOLVED';
        ex.resolvedBy = 'System Exception Engine';
        ex.resolvedAt = new Date();
        ex.resolutionNote = `Truck delay cleared automatically. Vehicle resumed operational transit (Status: ${trk.status}).`;
        await ex.save();
      }
    }

    // 2. Invoice Mismatches (CRITICAL)
    const mismatchInvoices = await Invoice.find({ matchStatus: 'MISMATCH' });
    for (const inv of mismatchInvoices) {
      const exists = await Exception.findOne({
        sourceType: 'INVOICE',
        sourceId: inv._id.toString(),
        type: 'INVOICE_MISMATCH',
        status: { $ne: 'RESOLVED' }
      });
      if (!exists) {
        const reason = inv.ocrData?.reasons?.[0] || 'Quantity or amount discrepancy against PO & Goods Receipt';
        const newEx = await Exception.create({
          type: 'INVOICE_MISMATCH',
          category: 'FINANCE',
          severity: 'CRITICAL',
          title: `3-Way Match Failed on Invoice ${inv.invoiceNumber}`,
          description: `Invoice ${inv.invoiceNumber} for PO ${inv.poNumber} failed 3-Way verification. Billed Total: $${inv.totalAmount.toLocaleString()}. ${reason}`,
          sourceType: 'INVOICE',
          sourceId: inv._id.toString(),
          status: 'OPEN',
          metadata: { invoiceNumber: inv.invoiceNumber, poNumber: inv.poNumber, totalAmount: inv.totalAmount, reasons: inv.ocrData?.reasons }
        });
        await AuditLog.create({
          user: 'System Exception Engine',
          role: 'admin',
          action: 'EXCEPTION_CREATED',
          entity: 'Exception',
          entityId: newEx._id.toString(),
          details: `Generated CRITICAL exception for invoice mismatch ${inv.invoiceNumber}`
        });
      }
    }

    // 5. Vision AI High Yard Congestion Alert
    try {
      const visionService = require('../services/visionService');
      const congestion = await visionService.calculateCongestionScore();
      if (congestion.score > 80) {
        const exists = await Exception.findOne({ type: 'YARD_CONGESTION_HIGH', status: { $ne: 'RESOLVED' } });
        if (!exists) {
          await Exception.create({
            type: 'YARD_CONGESTION_HIGH',
            category: 'SYSTEM',
            severity: 'CRITICAL',
            title: `High Yard Congestion Alert (${congestion.score}/100)`,
            description: `Smart CCTV Vision AI detected critical yard congestion: ${congestion.primaryCause}`,
            sourceType: 'SYSTEM',
            sourceId: 'CAM-02',
            status: 'OPEN',
            metadata: { congestionScore: congestion.score, cause: congestion.primaryCause }
          });
        }
      }
    } catch (e) {
      // Ignore if vision service init fails
    }

    // 3. Payments On Hold (WARNING)
    const onHoldPayments = await Payment.find({ paymentStatus: 'ON_HOLD' });
    for (const pay of onHoldPayments) {
      const exists = await Exception.findOne({
        sourceType: 'PAYMENT',
        sourceId: pay._id.toString(),
        type: 'PAYMENT_ON_HOLD',
        status: { $ne: 'RESOLVED' }
      });
      if (!exists) {
        const newEx = await Exception.create({
          type: 'PAYMENT_ON_HOLD',
          category: 'FINANCE',
          severity: 'WARNING',
          title: `Payment ${pay.paymentNumber} Locked ON_HOLD`,
          description: `Payment ${pay.paymentNumber} for Invoice ${pay.invoiceNumber} (${pay.supplierName}) is locked ON_HOLD. Amount: $${pay.amount.toLocaleString()}.`,
          sourceType: 'PAYMENT',
          sourceId: pay._id.toString(),
          status: 'OPEN',
          metadata: { paymentNumber: pay.paymentNumber, invoiceNumber: pay.invoiceNumber, poNumber: pay.poNumber, amount: pay.amount }
        });
        await AuditLog.create({
          user: 'System Exception Engine',
          role: 'admin',
          action: 'EXCEPTION_CREATED',
          entity: 'Exception',
          entityId: newEx._id.toString(),
          details: `Generated WARNING exception for payment on hold ${pay.paymentNumber}`
        });
      }
    }

    // 4. Pending Purchase Requisitions (WARNING)
    const pendingPRs = await PurchaseRequisition.find({ status: 'PENDING' });
    for (const pr of pendingPRs) {
      const exists = await Exception.findOne({
        sourceType: 'REQUISITION',
        sourceId: pr._id.toString(),
        type: 'PENDING_PR',
        status: { $ne: 'RESOLVED' }
      });
      if (!exists) {
        const itemName = pr.items[0]?.productName || 'Industrial Item';
        const newEx = await Exception.create({
          type: 'PENDING_PR',
          category: 'PROCUREMENT',
          severity: 'WARNING',
          title: `Requisition ${pr.prNumber} Awaiting Manager Approval`,
          description: `Purchase Requisition ${pr.prNumber} for ${itemName} ($${pr.totalAmount.toLocaleString()}) requires procurement authorization.`,
          sourceType: 'REQUISITION',
          sourceId: pr._id.toString(),
          status: 'OPEN',
          metadata: { prNumber: pr.prNumber, totalAmount: pr.totalAmount, items: pr.items }
        });
        await AuditLog.create({
          user: 'System Exception Engine',
          role: 'admin',
          action: 'EXCEPTION_CREATED',
          entity: 'Exception',
          entityId: newEx._id.toString(),
          details: `Generated WARNING exception for pending PR ${pr.prNumber}`
        });
      }
    }

    // 5. Occupied Dock Bays (INFO)
    const occupiedDocks = await Dock.find({ status: 'OCCUPIED' });
    for (const dock of occupiedDocks) {
      const exists = await Exception.findOne({
        sourceType: 'DOCK',
        sourceId: dock._id.toString(),
        type: 'DOCK_OCCUPIED',
        status: { $ne: 'RESOLVED' }
      });
      if (!exists) {
        const newEx = await Exception.create({
          type: 'DOCK_OCCUPIED',
          category: 'DOCK',
          severity: 'INFO',
          title: `Dock Bay ${dock.dockNumber} Currently Occupied`,
          description: `Dock Bay ${dock.dockNumber} (${dock.name}) is actively unloading truck ${dock.currentTruckId || 'Inbound Vehicle'}.`,
          sourceType: 'DOCK',
          sourceId: dock._id.toString(),
          status: 'OPEN',
          metadata: { dockNumber: dock.dockNumber, truckId: dock.currentTruckId }
        });
        await AuditLog.create({
          user: 'System Exception Engine',
          role: 'admin',
          action: 'EXCEPTION_CREATED',
          entity: 'Exception',
          entityId: newEx._id.toString(),
          details: `Generated INFO exception for occupied dock ${dock.dockNumber}`
        });
      }
    }
  } catch (err) {
    console.error('Error syncing exceptions:', err);
  }
};

exports.getExceptions = async (req, res, next) => {
  try {
    // Run sync before returning
    await syncExceptionsFromCollections();

    const role = req.user.role;
    let query = {};

    // Departmental RBAC filtering
    if (role === 'procurement_manager') {
      query.category = 'PROCUREMENT';
    } else if (role === 'warehouse_manager') {
      query.category = { $in: ['TRUCK', 'DOCK'] };
    } else if (role === 'finance_user') {
      query.category = 'FINANCE';
    }
    // Admin sees all categories (query remains {})

    const exceptions = await Exception.find(query).sort({ createdAt: -1 });

    const totalOpen = exceptions.filter(e => e.status !== 'RESOLVED').length;
    const criticalCount = exceptions.filter(e => e.status !== 'RESOLVED' && e.severity === 'CRITICAL').length;
    const warningCount = exceptions.filter(e => e.status !== 'RESOLVED' && e.severity === 'WARNING').length;
    const infoCount = exceptions.filter(e => e.status !== 'RESOLVED' && e.severity === 'INFO').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedTodayCount = exceptions.filter(e => e.status === 'RESOLVED' && e.resolvedAt >= today).length;

    res.json({
      success: true,
      summary: {
        totalOpen,
        criticalCount,
        warningCount,
        infoCount,
        resolvedTodayCount
      },
      count: exceptions.length,
      exceptions
    });
  } catch (error) {
    next(error);
  }
};

exports.getExceptionById = async (req, res, next) => {
  try {
    const exception = await Exception.findById(req.params.id);
    if (!exception) {
      return res.status(404).json({ success: false, message: 'Exception record not found.' });
    }
    res.json({ success: true, exception });
  } catch (error) {
    next(error);
  }
};

exports.acknowledgeException = async (req, res, next) => {
  try {
    const exception = await Exception.findById(req.params.id);
    if (!exception) {
      return res.status(404).json({ success: false, message: 'Exception record not found.' });
    }

    // Check RBAC permission for acknowledging
    const userRole = req.user.role;
    if (userRole !== 'admin') {
      if (userRole === 'procurement_manager' && exception.category !== 'PROCUREMENT') {
        return res.status(403).json({ success: false, message: 'Forbidden: You cannot modify procurement exceptions outside your department.' });
      }
      if (userRole === 'warehouse_manager' && !['TRUCK', 'DOCK'].includes(exception.category)) {
        return res.status(403).json({ success: false, message: 'Forbidden: You cannot modify yard/dock exceptions outside your department.' });
      }
      if (userRole === 'finance_user' && exception.category !== 'FINANCE') {
        return res.status(403).json({ success: false, message: 'Forbidden: You cannot modify finance exceptions outside your department.' });
      }
    }

    exception.status = 'ACKNOWLEDGED';
    exception.acknowledgedBy = req.user.name || 'User';
    exception.acknowledgedAt = new Date();
    await exception.save();

    await AuditLog.create({
      user: req.user.name || 'User',
      role: req.user.role,
      action: 'EXCEPTION_ACKNOWLEDGED',
      entity: 'Exception',
      entityId: exception._id.toString(),
      details: `Acknowledged ${exception.severity} exception: ${exception.title}`
    });

    res.json({ success: true, message: `Acknowledged exception ${exception.title}`, exception });
  } catch (error) {
    next(error);
  }
};

exports.resolveException = async (req, res, next) => {
  try {
    const { resolutionNote } = req.body;
    const exception = await Exception.findById(req.params.id);
    if (!exception) {
      return res.status(404).json({ success: false, message: 'Exception record not found.' });
    }

    // Check RBAC permission for resolving
    const userRole = req.user.role;
    if (userRole !== 'admin') {
      if (userRole === 'procurement_manager' && exception.category !== 'PROCUREMENT') {
        return res.status(403).json({ success: false, message: 'Forbidden: You cannot resolve exceptions outside your department.' });
      }
      if (userRole === 'warehouse_manager' && !['TRUCK', 'DOCK'].includes(exception.category)) {
        return res.status(403).json({ success: false, message: 'Forbidden: You cannot resolve exceptions outside your department.' });
      }
      if (userRole === 'finance_user' && exception.category !== 'FINANCE') {
        return res.status(403).json({ success: false, message: 'Forbidden: You cannot resolve exceptions outside your department.' });
      }
    }

    exception.status = 'RESOLVED';
    exception.resolvedBy = req.user.name || 'User';
    exception.resolvedAt = new Date();
    exception.resolutionNote = resolutionNote || 'Resolved by operational manager.';
    await exception.save();

    await AuditLog.create({
      user: req.user.name || 'User',
      role: req.user.role,
      action: 'EXCEPTION_RESOLVED',
      entity: 'Exception',
      entityId: exception._id.toString(),
      details: `Resolved ${exception.severity} exception: ${exception.title}. Rationale: ${exception.resolutionNote}`
    });

    res.json({ success: true, message: `Resolved exception ${exception.title}`, exception });
  } catch (error) {
    next(error);
  }
};
