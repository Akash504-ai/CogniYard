const express = require('express');
const router = express.Router();
const finance = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/auth');

// Invoices
router.get('/invoices', protect, authorize('finance_user', 'admin'), finance.getInvoices);
router.get('/invoices/ready-purchase-orders', protect, authorize('finance_user', 'admin'), finance.getReadyPurchaseOrders);
router.get('/invoices/:id/document', protect, authorize('finance_user', 'admin'), finance.getInvoiceDocument);
router.post('/invoices/:id/match', protect, authorize('finance_user', 'admin'), finance.triggerMatch);
router.post('/invoices/:id/manual-approve', protect, authorize('finance_user', 'admin'), finance.manualApproveInvoice);
router.delete('/invoices/:id', protect, authorize('finance_user', 'admin'), finance.deleteInvoice);

// Payments
router.get('/payments', protect, authorize('finance_user', 'admin'), finance.getPayments);
router.patch('/payments/:id/status', protect, authorize('finance_user', 'admin'), finance.updatePaymentStatus);
router.delete('/payments/:id', protect, authorize('finance_user', 'admin'), finance.deletePayment);

module.exports = router;
