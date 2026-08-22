const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },
  googleId: { type: String, default: null },
  avatar: { type: String, default: '' },
  role: {
    type: String,
    enum: ['procurement_manager', 'warehouse_manager', 'finance_user', 'admin'],
    default: 'procurement_manager'
  },
  department: { type: String, default: 'Supply Chain' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
