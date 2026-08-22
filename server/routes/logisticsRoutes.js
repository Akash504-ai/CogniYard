const express = require('express');
const router = express.Router();
const logistics = require('../controllers/logisticsController');
const { protect, authorize } = require('../middleware/auth');

// Trucks
router.get('/trucks', protect, logistics.getTrucks);
router.patch('/trucks/:truckId', protect, authorize('warehouse_manager', 'admin'), logistics.updateTruckStatus);
router.post('/trucks/simulate', protect, authorize('warehouse_manager', 'admin'), logistics.simulateMovement);

// Docks
router.get('/docks', protect, logistics.getDocks);
router.get('/docks/recommend/:truckId', protect, authorize('warehouse_manager', 'admin'), logistics.recommendDock);
router.post('/docks/assign', protect, authorize('warehouse_manager', 'admin'), logistics.assignDock);

// ASN
router.get('/asn', protect, logistics.getASNs);
router.post('/asn', protect, authorize('warehouse_manager', 'procurement_manager', 'admin'), logistics.createASN);

// Receiving & Goods Receipt
router.get('/receiving', protect, logistics.getGoodsReceipts);
router.post('/receiving', protect, authorize('warehouse_manager', 'admin'), logistics.processReceiving);

// Inventory
router.get('/inventory', protect, logistics.getInventory);

module.exports = router;
