const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, analyticsController.getAnalytics);
router.get('/control-tower', protect, authorize('admin'), analyticsController.getControlTower);

module.exports = router;
