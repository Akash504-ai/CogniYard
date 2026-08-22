const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: String, default: 'System' },
  role: { type: String, default: 'System' },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
