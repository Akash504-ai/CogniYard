const mongoose = require('mongoose');

const dockSchema = new mongoose.Schema({
  dockNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'],
    default: 'AVAILABLE'
  },
  currentTruckId: { type: String, default: null },
  assignedShipmentId: { type: String, default: null },
  suitableLoadTypes: [{ type: String }],
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Dock', dockSchema);
