const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Truck = require('../models/Truck');
const Dock = require('../models/Dock');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const GoodsReceipt = require('../models/GoodsReceipt');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Shipment = require('../models/Shipment');

exports.getAnalytics = async (req, res, next) => {
  try {
    const openPRs = await PurchaseRequisition.countDocuments({ status: 'PENDING' });
    const pendingPOs = await PurchaseOrder.countDocuments({ status: { $in: ['ISSUED', 'SHIPPED'] } });
    
    const pos = await PurchaseOrder.find();
    const totalSpend = pos.reduce((sum, p) => sum + p.totalAmount, 0);

    const activeTrucks = await Truck.countDocuments({ status: { $in: ['IN_TRANSIT', 'AT_GATE', 'IN_YARD', 'AT_DOCK', 'UNLOADING'] } });
    const delayedTrucks = await Truck.countDocuments({ status: 'DELAYED' });

    const totalDocks = await Dock.countDocuments();
    const availableDocks = await Dock.countDocuments({ status: 'AVAILABLE' });
    const occupiedDocks = await Dock.countDocuments({ status: 'OCCUPIED' });

    const pendingInvoices = await Invoice.countDocuments({ matchStatus: 'PENDING' });
    const matchedInvoices = await Invoice.countDocuments({ matchStatus: 'MATCHED' });
    const exceptionInvoices = await Invoice.countDocuments({ matchStatus: 'MISMATCH' });

    const payments = await Payment.find();
    const totalPaid = payments.filter(p => p.paymentStatus === 'PAID').reduce((sum, p) => sum + p.amount, 0);
    const onHoldAmount = payments.filter(p => p.paymentStatus === 'ON_HOLD').reduce((sum, p) => sum + p.amount, 0);

    const suppliersCount = await Supplier.countDocuments();
    const usersCount = await User.countDocuments();
    const receiptsCount = await GoodsReceipt.countDocuments();

    const spendByCategory = [
      { name: 'Safety Equipment', spend: 42000 },
      { name: 'Industrial Tools', spend: 28000 },
      { name: 'Raw Materials', spend: 65000 },
      { name: 'Logistics Services', spend: 19000 },
      { name: 'Packaging', spend: 12000 }
    ];

    const yardActivityTrends = [
      { time: '08:00', trucksIn: 4, trucksOut: 2 },
      { time: '10:00', trucksIn: 9, trucksOut: 5 },
      { time: '12:00', trucksIn: 14, trucksOut: 10 },
      { time: '14:00', trucksIn: 11, trucksOut: 12 },
      { time: '16:00', trucksIn: 7, trucksOut: 8 }
    ];

    const matchRateDistribution = [
      { name: '3-Way Matched', value: matchedInvoices || 8 },
      { name: 'Exceptions (Mismatch)', value: exceptionInvoices || 2 },
      { name: 'Pending Review', value: pendingInvoices || 3 }
    ];

    res.json({
      success: true,
      metrics: {
        procurement: { openPRs, pendingPOs, totalSpend, suppliersCount },
        logistics: { activeTrucks, delayedTrucks, totalDocks, availableDocks, occupiedDocks, receiptsCount },
        finance: { pendingInvoices, matchedInvoices, exceptionInvoices, totalPaid, onHoldAmount },
        admin: { usersCount, suppliersCount, totalPOs: pos.length }
      },
      charts: {
        spendByCategory,
        yardActivityTrends,
        matchRateDistribution
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getControlTower = async (req, res, next) => {
  try {
    // 1. Top KPI Cards
    const activeTrucks = await Truck.countDocuments({ status: { $ne: 'COMPLETED' } });
    const delayedTrucks = await Truck.countDocuments({ status: 'DELAYED' });
    const delayedPct = activeTrucks > 0 ? Math.round((delayedTrucks / activeTrucks) * 100) : 0;

    const openPRs = await PurchaseRequisition.countDocuments({ status: 'PENDING' });
    const approvedPRs = await PurchaseRequisition.countDocuments({ status: 'APPROVED' });

    const pendingPOs = await PurchaseOrder.countDocuments({ status: { $in: ['ISSUED', 'SHIPPED', 'PARTIALLY_RECEIVED'] } });
    const completedPOs = await PurchaseOrder.countDocuments({ status: { $in: ['RECEIVED', 'COMPLETED'] } });

    const inventoryItems = await Inventory.find();
    const inventoryAlertsCount = inventoryItems.filter(i => i.quantityOnHand <= 500 || i.availableQuantity <= 500).length;

    const paymentsOnHoldCount = await Payment.countDocuments({ paymentStatus: 'ON_HOLD' });
    const mismatchInvoicesCount = await Invoice.countDocuments({ matchStatus: 'MISMATCH' });

    // 2. Supply Chain Flow Stage Live Counts
    const flowCounts = {
      suppliers: await Supplier.countDocuments(),
      prs: await PurchaseRequisition.countDocuments(),
      pos: await PurchaseOrder.countDocuments(),
      shipments: await Shipment.countDocuments(),
      trucks: activeTrucks,
      yard: await Truck.countDocuments({ status: { $in: ['IN_YARD', 'AT_GATE'] } }),
      dock: await Dock.countDocuments({ status: 'OCCUPIED' }),
      receiving: await GoodsReceipt.countDocuments(),
      inventory: inventoryItems.length,
      invoices: await Invoice.countDocuments(),
      threeWayMatch: await Invoice.countDocuments({ matchStatus: 'MATCHED' }),
      payment: await Payment.countDocuments({ paymentStatus: 'PAID' })
    };

    // 3. Critical Exceptions Panel (Derived from MongoDB data)
    const exceptions = [];

    const delayedTruckDocs = await Truck.find({ status: 'DELAYED' }).limit(5);
    delayedTruckDocs.forEach(trk => {
      exceptions.push({
        id: `EX-TRK-${trk._id}`,
        severity: 'CRITICAL',
        type: 'Delayed Truck',
        title: `Truck ${trk.truckId} Delayed`,
        description: `PO Ref: ${trk.poNumber} | Driver: ${trk.driverName} | ETA: ${trk.eta}`,
        badge: 'CRITICAL'
      });
    });

    const mismatchInvoiceDocs = await Invoice.find({ matchStatus: 'MISMATCH' }).limit(5);
    mismatchInvoiceDocs.forEach(inv => {
      const reasonStr = inv.ocrData?.reasons?.[0] || 'Quantity or amount mismatch';
      exceptions.push({
        id: `EX-INV-${inv._id}`,
        severity: 'CRITICAL',
        type: '3-Way Match Discrepancy',
        title: `Invoice ${inv.invoiceNumber} Mismatch`,
        description: `PO Ref: ${inv.poNumber} | ${reasonStr}`,
        badge: 'CRITICAL'
      });
    });

    const onHoldPaymentDocs = await Payment.find({ paymentStatus: 'ON_HOLD' }).limit(5);
    onHoldPaymentDocs.forEach(pay => {
      if (!exceptions.some(e => e.title.includes(pay.invoiceNumber))) {
        exceptions.push({
          id: `EX-PAY-${pay._id}`,
          severity: 'WARNING',
          type: 'Payment Locked',
          title: `Payment ${pay.paymentNumber} On Hold`,
          description: `Invoice: ${pay.invoiceNumber} | Total Billed: $${pay.amount.toLocaleString()}`,
          badge: 'WARNING'
        });
      }
    });

    const pendingPrDocs = await PurchaseRequisition.find({ status: 'PENDING' }).limit(5);
    pendingPrDocs.forEach(pr => {
      exceptions.push({
        id: `EX-PR-${pr._id}`,
        severity: 'WARNING',
        type: 'Requisition Approval',
        title: `PR ${pr.prNumber} Awaiting Approval`,
        description: `Scope: ${pr.items[0]?.productName || 'Equipment'} | Est: $${pr.totalAmount.toLocaleString()}`,
        badge: 'WARNING'
      });
    });

    const occupiedDockDocs = await Dock.find({ status: 'OCCUPIED' }).limit(5);
    occupiedDockDocs.forEach(dock => {
      exceptions.push({
        id: `EX-DCK-${dock._id}`,
        severity: 'INFO',
        type: 'Dock Status',
        title: `Dock Bay ${dock.dockNumber} Occupied`,
        description: `Currently servicing Truck: ${dock.currentTruckId || 'Inbound Vehicle'}`,
        badge: 'INFO'
      });
    });

    // 4. Recent Activity (AuditLog)
    const recentActivity = await AuditLog.find().sort({ createdAt: -1 }).limit(10);

    // 5. Operational Snapshots
    const snapshots = {
      procurement: {
        pendingPRs: openPRs,
        approvedPRs,
        activePOs: pendingPOs,
        completedPOs
      },
      yard: {
        inTransit: await Truck.countDocuments({ status: 'IN_TRANSIT' }),
        atGate: await Truck.countDocuments({ status: 'AT_GATE' }),
        inYard: await Truck.countDocuments({ status: 'IN_YARD' }),
        atDock: await Truck.countDocuments({ status: 'AT_DOCK' }),
        unloading: await Truck.countDocuments({ status: 'UNLOADING' }),
        delayed: delayedTrucks,
        completed: await Truck.countDocuments({ status: 'COMPLETED' })
      },
      finance: {
        invoicesTotal: await Invoice.countDocuments(),
        matched: await Invoice.countDocuments({ matchStatus: 'MATCHED' }),
        mismatched: mismatchInvoicesCount,
        onHold: paymentsOnHoldCount,
        paid: await Payment.countDocuments({ paymentStatus: 'PAID' })
      },
      inventory: {
        totalItems: inventoryItems.length,
        totalStockOnHand: inventoryItems.reduce((sum, i) => sum + i.quantityOnHand, 0),
        lowStockItems: inventoryAlertsCount
      }
    };

    // 6. Charts for Recharts
    const charts = {
      pipeline: [
        { name: 'Open PRs', count: openPRs },
        { name: 'Approved PRs', count: approvedPRs },
        { name: 'Active POs', count: pendingPOs },
        { name: 'Received POs', count: completedPOs }
      ],
      truckStatus: [
        { name: 'In Transit', count: snapshots.yard.inTransit },
        { name: 'At Gate', count: snapshots.yard.atGate },
        { name: 'In Yard', count: snapshots.yard.inYard },
        { name: 'At Dock', count: snapshots.yard.atDock },
        { name: 'Delayed', count: snapshots.yard.delayed },
        { name: 'Completed', count: snapshots.yard.completed }
      ],
      financeStatus: [
        { name: 'Matched', count: snapshots.finance.matched },
        { name: 'Mismatch', count: snapshots.finance.mismatched },
        { name: 'On Hold', count: snapshots.finance.onHold },
        { name: 'Paid', count: snapshots.finance.paid }
      ]
    };

    res.json({
      success: true,
      kpis: {
        activeTrucks,
        delayedTrucks,
        delayedPct,
        openPRs,
        pendingPOs,
        inventoryAlertsCount,
        paymentsOnHoldCount
      },
      flowCounts,
      exceptions,
      recentActivity,
      snapshots,
      charts
    });
  } catch (error) {
    next(error);
  }
};
