const express = require('express');
const router = express.Router();
const exceptionController = require('../controllers/exceptionController');
const { protect, authorize } = require('../middleware/auth');

const adminOnly = authorize('admin');

router.get('/', protect, adminOnly, exceptionController.getExceptions);
router.get('/:id', protect, adminOnly, exceptionController.getExceptionById);
router.patch('/:id/acknowledge', protect, adminOnly, exceptionController.acknowledgeException);
router.patch('/:id/resolve', protect, adminOnly, exceptionController.resolveException);

module.exports = router;
