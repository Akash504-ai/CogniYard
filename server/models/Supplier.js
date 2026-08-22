const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  email: { type: String },
  phone: { type: String },
  category: { type: String, default: 'Industrial Safety' },
  rating: { type: Number, default: 4.5, min: 1, max: 5 },
  leadTimeDays: { type: Number, default: 3 },
  otdScore: { type: Number, default: 95 }, // On Time Delivery percentage
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'UNDER_REVIEW'], default: 'ACTIVE' }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
