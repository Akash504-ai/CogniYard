const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: 'General' },
  unit: { type: String, default: 'pcs' },
  defaultPrice: { type: Number, required: true },
  currentStock: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 50 },
  preferredSupplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
