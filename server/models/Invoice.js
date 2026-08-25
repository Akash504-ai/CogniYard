const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  description: { type: String },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  supplierUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  supplierName: { type: String, required: true },
  poNumber: { type: String, required: true },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date, default: () => new Date(Date.now() + 30*24*60*60*1000) },
  fileUrl: { type: String },
  document: {
    url: { type: String },
    publicId: { type: String },
    resourceType: { type: String },
    format: { type: String },
    originalName: { type: String },
    mimeType: { type: String },
    bytes: { type: Number },
    storageProvider: { type: String, enum: ['cloudinary', 'local', 'external'], default: 'local' }
  },
  items: [invoiceItemSchema],
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  shippingAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentTerms: { type: String, default: 'Net 30' },
  sourceType: {
    type: String,
    enum: ['GENERATED_FINAL', 'SUPPLIER_GENERATED', 'SUPPLIER_UPLOAD', 'FINANCE_UPLOAD'],
    default: 'FINANCE_UPLOAD'
  },
  submissionStatus: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'VALIDATED', 'REJECTED'],
    default: 'SUBMITTED'
  },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  submittedAt: { type: Date, default: Date.now },
  ocrData: { type: Object, default: {} },
  matchDetails: { type: Object, default: {} },
  matchStatus: {
    type: String,
    enum: ['PENDING', 'MATCHED', 'PARTIALLY_MATCHED', 'MISMATCHED', 'MISMATCH', 'EXEMPT'],
    default: 'PENDING'
  },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
