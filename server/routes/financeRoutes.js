const express = require('express');
const router = express.Router();
const finance = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/auth');

// Invoices
router.get('/invoices', protect, finance.getInvoices);
router.post('/invoices', protect, authorize('finance_user', 'admin'), finance.createInvoice);
router.post('/invoices/:id/match', protect, authorize('finance_user', 'admin'), finance.triggerMatch);

// Payments
router.get('/payments', protect, finance.getPayments);
router.patch('/payments/:id/status', protect, authorize('finance_user', 'admin'), finance.updatePaymentStatus);

module.exports = router;
