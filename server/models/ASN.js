const mongoose = require('mongoose');

const asnItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  lotNumber: { type: String, default: 'LOT-2026-001' }
});

const asnSchema = new mongoose.Schema({
  asnNumber: { type: String, required: true, unique: true },
  poNumber: { type: String, required: true },
  shipmentId: { type: String, required: true },
  supplierName: { type: String, required: true },
  expectedDeliveryDate: { type: Date, default: Date.now },
  items: [asnItemSchema],
  status: {
    type: String,
    enum: ['CREATED', 'IN_TRANSIT', 'RECEIVED'],
    default: 'IN_TRANSIT'
  }
}, { timestamps: true });

module.exports = mongoose.model('ASN', asnSchema);
