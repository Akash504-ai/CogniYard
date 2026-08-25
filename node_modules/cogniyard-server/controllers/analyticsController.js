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

const MATCHABLE_SUPPLIER_INVOICES = {
  sourceType: { $in: ['SUPPLIER_GENERATED', 'SUPPLIER_UPLOAD'] },
  submissionStatus: { $in: ['SUBMITTED', 'VALIDATED'] },
  'document.storageProvider': { $in: ['cloudinary', 'local'] }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const [purchaseOrders, suppliers, trucks, docks, receipts, invoices, allPayments, users] = await Promise.all([
      PurchaseOrder.find().lean(),
      Supplier.find().lean(),
      Truck.find().lean(),
      Dock.find().lean(),
      GoodsReceipt.find().lean(),
      Invoice.find(MATCHABLE_SUPPLIER_INVOICES).lean(),
      Payment.find().lean(),
      User.find().lean()
    ]);
    const matchableInvoiceIds = new Set(invoices.map(invoice => String(invoice._id)));
    const payments = allPayments.filter(payment => matchableInvoiceIds.has(String(payment.invoiceId)));

    const countBy = (records, selector) => {
      const grouped = new Map();
      records.forEach(record => {
        const key = selector(record);
        grouped.set(key, (grouped.get(key) || 0) + 1);
      });
      return [...grouped.entries()].map(([name, value]) => ({ name, value }));
    };
    const sumBy = (records, keySelector, valueSelector) => {
      const grouped = new Map();
      records.forEach(record => {
        const key = keySelector(record);
        grouped.set(key, (grouped.get(key) || 0) + Number(valueSelector(record) || 0));
      });
      return [...grouped.entries()].map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
    };
    const monthName = value => new Date(value).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const dayName = value => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const totalSpend = purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);
    const pendingPoStatuses = ['ISSUED', 'SHIPPED', 'PARTIALLY_RECEIVED'];
    const completedPoStatuses = ['RECEIVED', 'COMPLETED'];
    const activeTruckStatuses = ['SCHEDULED', 'IN_TRANSIT', 'AT_GATE', 'IN_YARD', 'WAITING_FOR_DOCK', 'AT_DOCK', 'UNLOADING', 'DELAYED'];
    const mismatchStatuses = ['MISMATCH', 'MISMATCHED', 'PARTIALLY_MATCHED'];

    const procurementDashboard = {
      title: 'Procurement Command Center',
      subtitle: 'Live supplier, Purchase Order and spend intelligence',
      kpis: [
        { label: 'Total Purchase Orders', value: purchaseOrders.length, detail: 'Persisted orders' },
        { label: 'Pending Purchase Orders', value: purchaseOrders.filter(po => pendingPoStatuses.includes(po.status)).length, detail: 'Awaiting full receipt' },
        { label: 'Completed Purchase Orders', value: purchaseOrders.filter(po => completedPoStatuses.includes(po.status)).length, detail: 'Received or completed' },
        { label: 'Total Procurement Spend', value: totalSpend, format: 'currency', detail: 'Actual PO values' },
        { label: 'Pending Supplier Deliveries', value: purchaseOrders.filter(po => pendingPoStatuses.includes(po.status)).length, detail: 'Inbound orders' },
        { label: 'Active Suppliers', value: suppliers.filter(supplier => supplier.status === 'ACTIVE').length, detail: 'Supplier master' }
      ],
      charts: [
        { title: 'Procurement Spend Distribution by Supplier', type: 'bar', data: sumBy(purchaseOrders, po => po.supplierName || 'Unknown', po => po.totalAmount), dataKey: 'value', xAxisLabel: 'Supplier', yAxisLabel: 'Committed Spend (INR)', valueLabel: 'Committed Spend', format: 'currency', description: 'Distribution of actual Purchase Order value across suppliers.' },
        { title: 'Purchase Order Status Distribution', type: 'pie', data: countBy(purchaseOrders, po => po.status), dataKey: 'value', valueLabel: 'Purchase Orders', description: 'Share and count of Purchase Orders in each fulfillment status.' },
        { title: 'Monthly Procurement Spend Distribution', type: 'line', data: sumBy(purchaseOrders, po => monthName(po.createdAt), po => po.totalAmount), dataKey: 'value', xAxisLabel: 'Month', yAxisLabel: 'Committed Spend (INR)', valueLabel: 'Monthly Spend', format: 'currency', description: 'Month-by-month distribution of committed Purchase Order spend.' },
        { title: 'Supplier Performance Score Distribution', type: 'bar', data: suppliers.filter(s => s.status === 'ACTIVE').map(s => ({ name: s.name, value: Math.round(((Number(s.otdScore || 0) * 0.4) + ((Number(s.rating || 0) / 5) * 100 * 0.4) + (Math.max(0, 100 - Number(s.leadTimeDays || 0) * 10) * 0.2)) * 10) / 10 })), dataKey: 'value', xAxisLabel: 'Supplier', yAxisLabel: 'Performance Score', valueLabel: 'Performance Score', suffix: '/100', description: 'Weighted score distribution using on-time delivery, rating and lead time.' }
      ]
    };

    const totalAccepted = receipts.reduce((sum, receipt) => sum + receipt.items.reduce((itemSum, item) => itemSum + Number(item.acceptedQuantity || 0), 0), 0);
    const warehouseDashboard = {
      title: 'Warehouse & Dock Command Center',
      subtitle: 'Live receiving, truck lifecycle and dock utilization',
      kpis: [
        { label: 'Total Trucks', value: trucks.length, detail: 'All tracked vehicles' },
        { label: 'Trucks Arriving', value: trucks.filter(truck => ['SCHEDULED', 'IN_TRANSIT', 'AT_GATE'].includes(truck.status)).length, detail: 'Scheduled or inbound' },
        { label: 'Trucks Unloading', value: trucks.filter(truck => ['AT_DOCK', 'UNLOADING'].includes(truck.status)).length, detail: 'At active docks' },
        { label: 'Trucks Completed', value: trucks.filter(truck => truck.status === 'COMPLETED').length, detail: 'Receiving complete' },
        { label: 'Dock Utilization', value: docks.length ? Math.round(docks.filter(dock => dock.status === 'OCCUPIED').length / docks.length * 100) : 0, suffix: '%', detail: 'Occupied capacity' },
        { label: 'Received Quantity', value: totalAccepted, detail: 'Accepted GRN units' },
        { label: 'Gate OCR Approved', value: trucks.filter(truck => truck.gateVerification?.status === 'APPROVED').length, detail: 'Plate + driver identity passed' }
      ],
      charts: [
        { title: 'Truck Status Distribution', type: 'pie', data: countBy(trucks, truck => truck.status), dataKey: 'value', valueLabel: 'Trucks', description: 'Distribution of tracked trucks across lifecycle statuses.' },
        { title: 'Dock Status Distribution', type: 'bar', data: countBy(docks, dock => dock.status), dataKey: 'value', xAxisLabel: 'Dock Status', yAxisLabel: 'Number of Docks', valueLabel: 'Docks', description: 'Distribution of dock bays by availability and operating status.' },
        { title: 'Daily Truck Arrival Distribution', type: 'line', data: countBy(trucks, truck => dayName(truck.arrivedAt || truck.createdAt)), dataKey: 'value', xAxisLabel: 'Arrival Date', yAxisLabel: 'Number of Trucks', valueLabel: 'Truck Arrivals', description: 'Daily distribution of truck arrivals recorded by the yard.' },
        { title: 'Goods Received Distribution Over Time', type: 'bar', data: sumBy(receipts, receipt => dayName(receipt.receivedDate || receipt.createdAt), receipt => receipt.items.reduce((sum, item) => sum + Number(item.acceptedQuantity || 0), 0)), dataKey: 'value', xAxisLabel: 'Receipt Date', yAxisLabel: 'Accepted Quantity', valueLabel: 'Accepted Units', description: 'Distribution of accepted GRN quantity by receiving date.' },
        { title: 'Gate Verification Status Distribution', type: 'pie', data: countBy(trucks, truck => truck.gateVerification?.status || 'PENDING'), dataKey: 'value', valueLabel: 'Trucks', description: 'Distribution of trucks by live number-plate and driver-ID verification status.' }
      ]
    };

    const financeDashboard = {
      title: 'Finance & Accounts Payable',
      subtitle: 'Real invoice, 3-way match and payment status',
      kpis: [
        { label: 'Total Invoices', value: invoices.length, detail: 'Generated and uploaded' },
        { label: 'Pending Validation', value: invoices.filter(invoice => invoice.matchStatus === 'PENDING').length, detail: 'Awaiting 3-way match' },
        { label: 'Fully Matched', value: invoices.filter(invoice => invoice.matchStatus === 'MATCHED').length, detail: 'Payment eligible' },
        { label: 'Match Exceptions', value: invoices.filter(invoice => mismatchStatuses.includes(invoice.matchStatus)).length, detail: 'Review required' },
        { label: 'Paid Amount', value: payments.filter(payment => payment.paymentStatus === 'PAID').reduce((sum, payment) => sum + Number(payment.amount || 0), 0), format: 'currency', detail: 'Completed settlement' },
        { label: 'On-Hold Amount', value: payments.filter(payment => payment.paymentStatus === 'ON_HOLD').reduce((sum, payment) => sum + Number(payment.amount || 0), 0), format: 'currency', detail: 'Blocked by exceptions' }
      ],
      charts: [
        { title: 'Invoice Match Status Distribution', type: 'pie', data: countBy(invoices, invoice => invoice.matchStatus), dataKey: 'value', valueLabel: 'Invoices', description: 'Distribution of supplier invoices by 3-way match result.' },
        { title: 'Monthly Invoice Value Distribution', type: 'line', data: sumBy(invoices, invoice => monthName(invoice.invoiceDate || invoice.createdAt), invoice => invoice.totalAmount), dataKey: 'value', xAxisLabel: 'Month', yAxisLabel: 'Invoice Value (INR)', valueLabel: 'Invoice Value', format: 'currency', description: 'Month-by-month distribution of submitted supplier invoice value.' },
        { title: 'Payment Status Distribution', type: 'bar', data: countBy(payments, payment => payment.paymentStatus), dataKey: 'value', xAxisLabel: 'Payment Status', yAxisLabel: 'Number of Payments', valueLabel: 'Payments', description: 'Distribution of payment records across approval and settlement statuses.' }
      ]
    };

    const adminDashboard = {
      title: 'System Administration Overview',
      subtitle: 'Connected users, suppliers and end-to-end records',
      kpis: [
        { label: 'Active Users', value: users.filter(user => user.isActive).length, detail: 'Enabled accounts' },
        { label: 'Active Suppliers', value: suppliers.filter(supplier => supplier.status === 'ACTIVE').length, detail: 'Supplier master' },
        { label: 'Purchase Orders', value: purchaseOrders.length, detail: 'End-to-end records' },
        { label: 'Active Trucks', value: trucks.filter(truck => activeTruckStatuses.includes(truck.status)).length, detail: 'Current yard pipeline' },
        { label: 'Invoices', value: invoices.length, detail: 'Stored documents' },
        { label: 'Completed Payments', value: payments.filter(payment => payment.paymentStatus === 'PAID').length, detail: 'Settled transactions' }
      ],
      charts: [
        { title: 'User Role Distribution', type: 'bar', data: countBy(users, user => user.role), dataKey: 'value', xAxisLabel: 'User Role', yAxisLabel: 'Number of Users', valueLabel: 'Users', description: 'Distribution of active and inactive accounts across system roles.' },
        { title: 'End-to-End Record Volume Distribution', type: 'bar', data: [
          { name: 'Suppliers', value: suppliers.length },
          { name: 'POs', value: purchaseOrders.length },
          { name: 'GRNs', value: receipts.length },
          { name: 'Invoices', value: invoices.length },
          { name: 'Payments', value: payments.length }
        ], dataKey: 'value', xAxisLabel: 'Business Record', yAxisLabel: 'Record Count', valueLabel: 'Records', description: 'Distribution of persisted records across the end-to-end workflow.' }
      ]
    };

    const byRole = {
      procurement_manager: procurementDashboard,
      warehouse_manager: warehouseDashboard,
      finance_user: financeDashboard,
      admin: adminDashboard
    };
    res.json({ success: true, role: req.user.role, dashboard: byRole[req.user.role] || adminDashboard });
  } catch (error) {
    next(error);
  }
};

exports.getControlTower = async (req, res, next) => {
  try {
    const matchableInvoiceIds = await Invoice.find(MATCHABLE_SUPPLIER_INVOICES).distinct('_id');
    const matchablePaymentFilter = { invoiceId: { $in: matchableInvoiceIds } };
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

    const paymentsOnHoldCount = await Payment.countDocuments({ ...matchablePaymentFilter, paymentStatus: 'ON_HOLD' });
    const mismatchInvoicesCount = await Invoice.countDocuments({ ...MATCHABLE_SUPPLIER_INVOICES, matchStatus: { $in: ['MISMATCH', 'MISMATCHED', 'PARTIALLY_MATCHED'] } });

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
      invoices: await Invoice.countDocuments(MATCHABLE_SUPPLIER_INVOICES),
      threeWayMatch: await Invoice.countDocuments({ ...MATCHABLE_SUPPLIER_INVOICES, matchStatus: 'MATCHED' }),
      payment: await Payment.countDocuments({ ...matchablePaymentFilter, paymentStatus: 'PAID' })
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

    const mismatchInvoiceDocs = await Invoice.find({ ...MATCHABLE_SUPPLIER_INVOICES, matchStatus: { $in: ['MISMATCH', 'MISMATCHED', 'PARTIALLY_MATCHED'] } }).limit(5);
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

    const onHoldPaymentDocs = await Payment.find({ ...matchablePaymentFilter, paymentStatus: 'ON_HOLD' }).limit(5);
    onHoldPaymentDocs.forEach(pay => {
      if (!exceptions.some(e => e.title.includes(pay.invoiceNumber))) {
        exceptions.push({
          id: `EX-PAY-${pay._id}`,
          severity: 'WARNING',
          type: 'Payment Locked',
          title: `Payment ${pay.paymentNumber} On Hold`,
          description: `Invoice: ${pay.invoiceNumber} | Total Billed: ₹${pay.amount.toLocaleString('en-IN')}`,
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
        description: `Scope: ${pr.items[0]?.productName || 'Equipment'} | Est: ₹${pr.totalAmount.toLocaleString('en-IN')}`,
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
        invoicesTotal: await Invoice.countDocuments(MATCHABLE_SUPPLIER_INVOICES),
        matched: await Invoice.countDocuments({ ...MATCHABLE_SUPPLIER_INVOICES, matchStatus: 'MATCHED' }),
        mismatched: mismatchInvoicesCount,
        onHold: paymentsOnHoldCount,
        paid: await Payment.countDocuments({ ...matchablePaymentFilter, paymentStatus: 'PAID' })
      },
      inventory: {
        totalItems: inventoryItems.length,
        totalStockOnHand: inventoryItems.reduce((sum, i) => sum + i.quantityOnHand, 0),
        lowStockItems: inventoryAlertsCount
      },
      inventoryPlanning: {
        totalMonitored: inventoryItems.length,
        urgentCount: inventoryItems.filter(i => (i.quantityOnHand || 0) < 100).length,
        reorderCount: inventoryItems.filter(i => (i.quantityOnHand || 0) >= 100 && (i.quantityOnHand || 0) < 300).length,
        healthyCount: inventoryItems.filter(i => (i.quantityOnHand || 0) >= 300).length
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
