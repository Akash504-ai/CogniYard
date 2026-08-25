const mongoose = require('mongoose');

const visionEventSchema = new mongoose.Schema({
  cameraId: { type: String, required: true, index: true },
  cameraLocation: { type: String, required: true },
  eventType: {
    type: String,
    enum: [
      'VEHICLE_DETECTED',
      'TRUCK_GATE_ENTRY',
      'TRUCK_GATE_EXIT',
      'DOCK_UNLOADING',
      'VISION_CONGESTION_ALERT',
      'PPE_SAFETY_WARNING',
      'UNKNOWN_VEHICLE'
    ],
    default: 'VEHICLE_DETECTED',
    index: true
  },
  objectType: { type: String, enum: ['TRUCK', 'CAR', 'PERSON'], default: 'TRUCK' },
  truckId: { type: String, index: true },
  licensePlate: { type: String },
  confidence: { type: Number, default: 0.92 },
  boundingBox: {
    x: { type: Number, default: 120 },
    y: { type: Number, default: 80 },
    width: { type: Number, default: 240 },
    height: { type: Number, default: 150 }
  },
  severity: { type: String, enum: ['CRITICAL', 'WARNING', 'INFO'], default: 'INFO' },
  status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
  metadata: { type: Object, default: {} },
  source: { type: String, enum: ['REAL_CV', 'SIMULATION', 'FALLBACK', 'AI Computer Vision Subsystem'], default: 'REAL_CV' }
}, { timestamps: true });

module.exports = mongoose.model('VisionEvent', visionEventSchema);
