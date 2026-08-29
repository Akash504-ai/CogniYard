const express = require('express');
const router = express.Router();
const logistics = require('../controllers/logisticsController');
const { protect, authorize } = require('../middleware/auth');

// Trucks & Yard Logistics & Real-Time Simulation
router.get('/trucks', protect, authorize('warehouse_manager', 'admin'), logistics.getTrucks);
router.patch('/trucks/:truckId', protect, authorize('warehouse_manager', 'admin'), logistics.updateTruckStatus);
router.post('/trucks/:truckId/gate-verification', protect, authorize('warehouse_manager', 'admin'), logistics.verifyGateIdentity);
router.post('/trucks/:truckId/gate-proceed', protect, authorize('warehouse_manager', 'admin'), logistics.proceedThroughGate);
router.post('/trucks/simulate', protect, authorize('warehouse_manager', 'admin'), logistics.simulateMovement);
router.post('/trucks/:truckId/delay', protect, authorize('warehouse_manager', 'admin'), logistics.simulateDelay);

// Yard Simulation Controls
router.get('/trucks/simulation/state', protect, authorize('warehouse_manager', 'admin'), logistics.getSimulationState);
router.post('/trucks/simulation/start', protect, authorize('warehouse_manager', 'admin'), logistics.startSimulation);
router.post('/trucks/simulation/pause', protect, authorize('warehouse_manager', 'admin'), logistics.pauseSimulation);
router.post('/trucks/simulation/reset', protect, authorize('warehouse_manager', 'admin'), logistics.resetSimulation);
router.post('/trucks/simulation/speed', protect, authorize('warehouse_manager', 'admin'), logistics.setSimulationSpeed);

// Docks & Recommendation Engine
router.get('/docks', protect, authorize('warehouse_manager', 'admin'), logistics.getDocks);
router.get('/docks/recommend/:truckId', protect, authorize('warehouse_manager', 'admin'), logistics.recommendDock);
router.post('/docks/assign', protect, authorize('warehouse_manager', 'admin'), logistics.assignDock);
router.post('/docks/release', protect, authorize('warehouse_manager', 'admin'), logistics.releaseDock);
router.post('/trucks/:truckId/preempt-dock', protect, authorize('warehouse_manager', 'admin'), logistics.preemptAndAssignDock);
router.post('/docks/preempt', protect, authorize('warehouse_manager', 'admin'), logistics.preemptAndAssignDock);

// ASN
router.get('/asn', protect, authorize('warehouse_manager', 'procurement_manager', 'admin'), logistics.getASNs);
router.post('/asn', protect, authorize('warehouse_manager', 'procurement_manager', 'admin'), logistics.createASN);

// Receiving & Goods Receipt
router.get('/receiving', protect, authorize('warehouse_manager', 'finance_user', 'admin'), logistics.getGoodsReceipts);
router.post('/receiving', protect, authorize('warehouse_manager', 'admin'), logistics.processReceiving);

// Inventory
router.get('/inventory', protect, authorize('warehouse_manager', 'admin'), logistics.getInventory);

module.exports = router;
