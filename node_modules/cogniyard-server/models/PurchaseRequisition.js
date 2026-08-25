const mongoose = require('mongoose');

const prItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  estimatedUnitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
});

const purchaseRequisitionSchema = new mongoose.Schema({
  prNumber: { type: String, required: true, unique: true },
  requestedBy: { type: String, required: true, default: 'Procurement Manager' },
  items: [prItemSchema],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PO'],
    default: 'PENDING'
  },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
  aiGenerated: { type: Boolean, default: false },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseRequisition', purchaseRequisitionSchema);
