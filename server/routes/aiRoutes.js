const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

router.post('/chat', protect, authorize('procurement_manager', 'admin'), aiController.chat);

module.exports = router;
