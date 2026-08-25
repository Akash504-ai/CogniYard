const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventoryPlanningController');
const { protect, authorize } = require('../middleware/auth');

router.get('/summary', protect, authorize('admin'), controller.getPlanningSummary);
router.get('/products', protect, authorize('admin'), controller.getPlanningProducts);
router.get('/products/:id', protect, authorize('admin'), controller.getPlanningProductById);

module.exports = router;
