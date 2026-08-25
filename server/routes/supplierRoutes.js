const express = require('express');
const supplier = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/auth');
const { invoiceUpload, validateUploadedInvoice } = require('../middleware/fileUpload');

const router = express.Router();

router.get('/admin/suppliers', protect, authorize('admin'), supplier.getAdminSuppliers);
router.post('/admin/suppliers', protect, authorize('admin'), supplier.createSupplier);
router.patch('/admin/suppliers/:id', protect, authorize('admin'), supplier.updateSupplier);
router.patch('/admin/suppliers/:id/status', protect, authorize('admin'), supplier.setSupplierStatus);
router.delete('/admin/suppliers/:id', protect, authorize('admin'), supplier.deleteSupplier);

router.get('/supplier/profile', protect, authorize('supplier'), supplier.getSupplierProfile);
router.get('/supplier/purchase-orders', protect, authorize('supplier'), supplier.getSupplierPurchaseOrders);
router.get('/supplier/invoices', protect, authorize('supplier'), supplier.getSupplierInvoices);
router.post('/supplier/invoices/generate/:poNumber', protect, authorize('supplier'), supplier.generateSupplierInvoice);
router.post('/supplier/invoices/upload', protect, authorize('supplier'), invoiceUpload.single('file'), validateUploadedInvoice, supplier.uploadSupplierInvoice);
router.patch('/supplier/invoices/:id', protect, authorize('supplier'), invoiceUpload.single('file'), validateUploadedInvoice, supplier.updateSupplierInvoice);
router.post('/supplier/invoices/:id/submit', protect, authorize('supplier'), supplier.submitSupplierInvoice);

module.exports = router;
