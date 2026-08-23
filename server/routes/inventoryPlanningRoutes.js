const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventoryPlanningController');
const { protect, authorize } = require('../middleware/auth');

const allowedRoles = ['procurement_manager', 'warehouse_manager', 'finance_user', 'admin'];

router.get('/summary', protect, authorize(...allowedRoles), controller.getPlanningSummary);
router.get('/products', protect, authorize(...allowedRoles), controller.getPlanningProducts);
router.get('/products/:id', protect, authorize(...allowedRoles), controller.getPlanningProductById);

module.exports = router;
