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
    enum: ['PENDING', 'MATCHED', 'PARTIALLY_MATCHED', 'MISMATCHED', 'MISMATCH', 'MANUALLY_APPROVED'],
    default: 'PENDING'
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'ON_HOLD', 'PROCESSING', 'PAID', 'AUTHORIZED', 'DISBURSED'],
    default: 'PENDING'
  },
  status: {
    type: String,
    enum: ['PENDING', 'AUTHORIZED', 'ON_HOLD', 'PROCESSING', 'COMPLETED', 'PAID'],
    default: 'AUTHORIZED'
  },
  paymentReference: { type: String },
  vendorName: { type: String },
  paymentMethod: { type: String, default: 'RTGS / Automated ACH' },
  disbursementDate: { type: String },
  manualApproval: {
    approvedBy: { type: String },
    approvedAt: { type: Date },
    notes: { type: String }
  },
  paymentDate: { type: Date },
  transactionId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
