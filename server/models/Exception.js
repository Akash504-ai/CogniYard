const mongoose = require('mongoose');

const ExceptionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['DELAYED_TRUCK', 'INVOICE_MISMATCH', 'PAYMENT_ON_HOLD', 'PENDING_PR', 'DOCK_OCCUPIED']
  },
  category: {
    type: String,
    required: true,
    enum: ['TRUCK', 'FINANCE', 'PROCUREMENT', 'DOCK']
  },
  severity: {
    type: String,
    required: true,
    enum: ['CRITICAL', 'WARNING', 'INFO']
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  sourceType: {
    type: String,
    required: true
  },
  sourceId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'],
    default: 'OPEN'
  },
  assignedTo: {
    type: String,
    default: ''
  },
  acknowledgedBy: {
    type: String,
    default: ''
  },
  acknowledgedAt: {
    type: Date
  },
  resolvedBy: {
    type: String,
    default: ''
  },
  resolvedAt: {
    type: Date
  },
  resolutionNote: {
    type: String,
    default: ''
  },
  metadata: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

ExceptionSchema.index({ sourceType: 1, sourceId: 1, type: 1 });

module.exports = mongoose.model('Exception', ExceptionSchema);
