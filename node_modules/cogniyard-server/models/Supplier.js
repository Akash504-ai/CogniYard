const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  companyName: { type: String, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  contactPerson: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String },
  address: { type: String },
  taxId: { type: String, trim: true },
  paymentTerms: { type: String, default: 'Net 30' },
  bankDetails: {
    accountName: { type: String },
    bankName: { type: String },
    accountLast4: { type: String, maxlength: 4 },
    ifscOrSwift: { type: String }
  },
  userAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  category: { type: String, default: 'Industrial Safety' },
  rating: { type: Number, default: 4.5, min: 1, max: 5 },
  leadTimeDays: { type: Number, default: 3 },
  otdScore: { type: Number, default: 95 }, // On Time Delivery percentage
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'UNDER_REVIEW'], default: 'ACTIVE' }
}, { timestamps: true });

supplierSchema.virtual('supplierId').get(function getSupplierId() {
  return this.code;
});

supplierSchema.set('toJSON', { virtuals: true });
supplierSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Supplier', supplierSchema);
