const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Truck = require('../models/Truck');
const Dock = require('../models/Dock');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const GoodsReceipt = require('../models/GoodsReceipt');
const User = require('../models/User');

exports.getAnalytics = async (req, res) => {
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

    // Chart mock dataset generators for Recharts visualizations
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
    res.status(500).json({ success: false, message: error.message });
  }
};
