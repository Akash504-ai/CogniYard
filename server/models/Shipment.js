const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  shipmentNumber: { type: String, required: true, unique: true },
  poNumber: { type: String, required: true },
  supplierName: { type: String, required: true },
  origin: { type: String, default: 'Supplier Hub' },
  destination: { type: String, default: 'CogniYard Logistics Center' },
  carrier: { type: String, default: 'CogniExpress Logistics' },
  status: {
    type: String,
    enum: ['PLANNED', 'IN_TRANSIT', 'DELIVERED', 'DELAYED'],
    default: 'IN_TRANSIT'
  },
  estimatedArrival: { type: String, default: '10:30 AM' }
}, { timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);
