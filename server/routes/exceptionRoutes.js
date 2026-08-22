const express = require('express');
const router = express.Router();
const exceptionController = require('../controllers/exceptionController');
const { protect } = require('../middleware/auth');

router.get('/', protect, exceptionController.getExceptions);
router.get('/:id', protect, exceptionController.getExceptionById);
router.patch('/:id/acknowledge', protect, exceptionController.acknowledgeException);
router.patch('/:id/resolve', protect, exceptionController.resolveException);

module.exports = router;
