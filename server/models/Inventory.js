const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  warehouseLocation: { type: String, default: 'Aisle A-01' },
  quantityOnHand: { type: Number, default: 0 },
  allocatedQuantity: { type: Number, default: 0 },
  availableQuantity: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
