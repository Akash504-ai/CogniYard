const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  supplierName: { type: String, required: true },
  poNumber: { type: String, required: true },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date, default: () => new Date(Date.now() + 30*24*60*60*1000) },
  fileUrl: { type: String },
  items: [invoiceItemSchema],
  totalAmount: { type: Number, required: true },
  ocrData: { type: Object, default: {} },
  matchStatus: {
    type: String,
    enum: ['PENDING', 'MATCHED', 'MISMATCH', 'EXEMPT'],
    default: 'PENDING'
  },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
