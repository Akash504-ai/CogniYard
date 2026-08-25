const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  orderedQuantity: { type: Number, required: true },
  receivedQuantity: { type: Number, required: true },
  damagedQuantity: { type: Number, default: 0 },
  acceptedQuantity: { type: Number, required: true },
  unitPrice: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 }
});

const goodsReceiptSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },
  poNumber: { type: String, required: true },
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  supplierName: { type: String, default: '' },
  asnNumber: { type: String },
  receivedBy: { type: String, default: 'Warehouse Manager' },
  receivedDate: { type: Date, default: Date.now },
  items: [receiptItemSchema],
  remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('GoodsReceipt', goodsReceiptSchema);
