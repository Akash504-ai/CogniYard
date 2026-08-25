const mongoose = require('mongoose');

const demandHistorySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  period: { type: String, required: true }, // Format: "YYYY-MM" (e.g. "2026-03")
  monthName: { type: String, required: true }, // Format: "March", "April", etc.
  quantity: { type: Number, required: true }
}, { timestamps: true });

demandHistorySchema.index({ product: 1, period: 1 });

module.exports = mongoose.model('DemandHistory', demandHistorySchema);
