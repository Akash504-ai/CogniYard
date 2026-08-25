const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  truckId: { type: String, required: true, unique: true },
  trailerId: { type: String, required: true },
  shipmentId: { type: String, required: true },
  poNumber: { type: String, required: true },
  driverName: { type: String, default: 'Driver' },
  driverPhone: { type: String, default: '+1-555-0199' },
  licensePlate: { type: String, default: '' },
  driverIdSerial: { type: String, default: '' },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  status: {
    type: String,
    enum: ['SCHEDULED', 'IN_TRANSIT', 'AT_GATE', 'IN_YARD', 'WAITING_FOR_DOCK', 'AT_DOCK', 'UNLOADING', 'COMPLETED', 'DELAYED'],
    default: 'IN_TRANSIT'
  },
  eta: { type: String, default: '10:30 AM' },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
  appointmentTime: { type: String, default: '11:00 AM' },
  loadType: { type: String, enum: ['DRY_VAN', 'REFRIGERATED', 'HAZMAT', 'FLATBED'], default: 'DRY_VAN' },
  yardLocation: { type: String, default: 'Zone A - Gate 1' },
  assignedDock: { type: String, default: null },
  arrivedAt: { type: Date, default: null },
  unloadingStartedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  gateVerification: {
    status: { type: String, enum: ['PENDING', 'PLATE_VERIFIED', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    plateCapturedText: { type: String, default: '' },
    plateMatched: { type: Boolean, default: false },
    plateConfidence: { type: Number, default: 0 },
    driverCapturedText: { type: String, default: '' },
    driverMatched: { type: Boolean, default: false },
    driverConfidence: { type: Number, default: 0 },
    detectedObjects: [{ type: String }],
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  }
}, { timestamps: true });

module.exports = mongoose.model('Truck', truckSchema);
