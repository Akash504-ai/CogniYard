const express = require('express');
const router = express.Router();
const procurement = require('../controllers/procurementController');
const { protect, authorize } = require('../middleware/auth');

// Products
router.get('/products', protect, procurement.getProducts);
router.post('/products', protect, authorize('procurement_manager', 'admin'), procurement.createProduct);

// Suppliers
router.get('/suppliers', protect, procurement.getSuppliers);
router.get('/suppliers/evaluate', protect, procurement.evaluateSuppliers);

// Requisitions
router.get('/requisitions', protect, procurement.getRequisitions);
router.post('/requisitions', protect, authorize('procurement_manager', 'admin'), procurement.createRequisition);
router.patch('/requisitions/:id/approve', protect, authorize('procurement_manager', 'admin'), procurement.approveRequisition);

// Purchase Orders
router.get('/purchase-orders', protect, procurement.getPurchaseOrders);
router.post('/purchase-orders', protect, authorize('procurement_manager', 'admin'), procurement.createPurchaseOrder);
router.get('/purchase-orders/:poNumber', protect, procurement.getPOByNumber);

module.exports = router;
