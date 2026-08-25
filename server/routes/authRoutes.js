const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// Public Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);

// Protected Auth Routes
router.get('/me', protect, authController.getMe);

// Admin-Only User Management Routes
router.get('/users', protect, authorize('admin'), authController.getUsers);
router.patch('/users/:id/role', protect, authorize('admin'), authController.updateUserRole);
router.patch('/users/:id/status', protect, authorize('admin'), authController.toggleUserStatus);

module.exports = router;
