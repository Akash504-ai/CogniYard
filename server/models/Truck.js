const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  truckId: { type: String, required: true, unique: true },
  trailerId: { type: String, required: true },
  shipmentId: { type: String, required: true },
  poNumber: { type: String, required: true },
  driverName: { type: String, default: 'Driver' },
  driverPhone: { type: String, default: '+1-555-0199' },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  status: {
    type: String,
    enum: ['SCHEDULED', 'IN_TRANSIT', 'AT_GATE', 'IN_YARD', 'AT_DOCK', 'UNLOADING', 'COMPLETED', 'DELAYED'],
    default: 'IN_TRANSIT'
  },
  eta: { type: String, default: '10:30 AM' },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
  appointmentTime: { type: String, default: '11:00 AM' },
  loadType: { type: String, enum: ['DRY_VAN', 'REFRIGERATED', 'HAZMAT', 'FLATBED'], default: 'DRY_VAN' },
  yardLocation: { type: String, default: 'Zone A - Gate 1' },
  assignedDock: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Truck', truckSchema);
