const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentNumber: { type: String, required: true, unique: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  invoiceNumber: { type: String, required: true },
  poNumber: { type: String, required: true },
  supplierName: { type: String, required: true },
  amount: { type: Number, required: true },
  matchStatus: {
    type: String,
    enum: ['MATCHED', 'MISMATCH'],
    default: 'MATCHED'
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'ON_HOLD', 'PROCESSING', 'PAID'],
    default: 'PENDING'
  },
  paymentDate: { type: Date },
  transactionId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
