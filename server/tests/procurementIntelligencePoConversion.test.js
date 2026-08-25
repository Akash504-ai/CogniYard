const test = require('node:test');
const assert = require('node:assert/strict');
const Truck = require('../models/Truck');
const Dock = require('../models/Dock');
const Shipment = require('../models/Shipment');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');

Truck.find = () => ({ sort: async () => [] });
Dock.find = async () => [];

const procurementController = require('../controllers/procurementController');
const servicePath = require.resolve('../services/procurementIntelligenceService');

function loadServiceWithCreatePurchaseOrder(createPurchaseOrder) {
  delete require.cache[servicePath];
  procurementController.createPurchaseOrder = createPurchaseOrder;
  return require('../services/procurementIntelligenceService');
}

function createApprovedPr() {
  return {
    _id: { toString: () => 'pr-id-1009' },
    prNumber: 'PR-1009',
    status: 'APPROVED',
    recommendedSupplier: { _id: { toString: () => 'supplier-id-1' }, name: 'Apex Industrial Safety Co.' },
    recommendedSupplierName: 'Apex Industrial Safety Co.',
    totalAmount: 125000,
    items: [{
      product: 'product-id-helmet',
      productName: 'Safety Helmet - High Visibility Yellow',
      quantity: 500,
      estimatedUnitPrice: 250,
      totalPrice: 125000
    }]
  };
}

test('approved recommendation PR converts through existing createPurchaseOrder lifecycle', async () => {
  const originalPrFindOne = PurchaseRequisition.findOne;
  const originalPoFindOne = PurchaseOrder.findOne;
  const originalShipmentFindOne = Shipment.findOne;
  const originalTruckFindOne = Truck.findOne;
  const originalCreatePo = procurementController.createPurchaseOrder;
  const requisition = createApprovedPr();
  let createPurchaseOrderCalls = 0;

  PurchaseRequisition.findOne = () => ({ populate: async () => requisition });
  PurchaseOrder.findOne = async () => null;
  Shipment.findOne = async () => null;
  Truck.findOne = async () => null;

  const service = loadServiceWithCreatePurchaseOrder(async (req, res) => {
    createPurchaseOrderCalls += 1;
    assert.equal(req.body.prId, 'pr-id-1009');
    assert.equal(req.body.supplierId, 'supplier-id-1');
    assert.equal(req.body.items[0].product, 'product-id-helmet');
    assert.equal(req.body.items[0].quantity, 500);
    assert.equal(req.body.items[0].unitPrice, 250);

    requisition.status = 'CONVERTED_TO_PO';
    return res.status(201).json({
      success: true,
      purchaseOrder: {
        poNumber: 'PO-1010',
        supplierName: 'Apex Industrial Safety Co.',
        totalAmount: 125000,
        items: [{ productName: requisition.items[0].productName, quantity: 500, unitPrice: 250, totalPrice: 125000 }]
      },
      shipment: { shipmentNumber: 'SHP-1010-123' },
      truck: { truckId: 'TRK-1010' }
    });
  });

  try {
    const result = await service.convertApprovedRecommendationToPurchaseOrder(
      { prNumber: 'PR-1009' },
      { name: 'Procurement Manager', role: 'procurement_manager' }
    );

    assert.equal(createPurchaseOrderCalls, 1);
    assert.equal(requisition.status, 'CONVERTED_TO_PO');
    assert.equal(result.success, true);
    assert.equal(result.action, 'CREATED_PO');
    assert.equal(result.prNumber, 'PR-1009');
    assert.equal(result.poNumber, 'PO-1010');
    assert.equal(result.supplierName, 'Apex Industrial Safety Co.');
    assert.equal(result.quantity, 500);
    assert.equal(result.unitPrice, 250);
    assert.equal(result.totalAmount, 125000);
    assert.equal(result.shipmentNumber, 'SHP-1010-123');
    assert.equal(result.truckId, 'TRK-1010');
  } finally {
    PurchaseRequisition.findOne = originalPrFindOne;
    PurchaseOrder.findOne = originalPoFindOne;
    Shipment.findOne = originalShipmentFindOne;
    Truck.findOne = originalTruckFindOne;
    procurementController.createPurchaseOrder = originalCreatePo;
    delete require.cache[servicePath];
  }
});

test('duplicate Copilot PO conversion returns existing PO without creating another one', async () => {
  const originalPrFindOne = PurchaseRequisition.findOne;
  const originalPoFindOne = PurchaseOrder.findOne;
  const originalShipmentFindOne = Shipment.findOne;
  const originalTruckFindOne = Truck.findOne;
  const originalCreatePo = procurementController.createPurchaseOrder;
  const requisition = createApprovedPr();
  requisition.status = 'CONVERTED_TO_PO';
  let createPurchaseOrderCalls = 0;

  PurchaseRequisition.findOne = () => ({ populate: async () => requisition });
  PurchaseOrder.findOne = async () => ({
    poNumber: 'PO-1010',
    supplierName: 'Apex Industrial Safety Co.',
    totalAmount: 125000,
    items: [{ productName: requisition.items[0].productName, quantity: 500, unitPrice: 250, totalPrice: 125000 }]
  });
  Shipment.findOne = async () => ({ shipmentNumber: 'SHP-1010-123' });
  Truck.findOne = async () => ({ truckId: 'TRK-1010' });

  const service = loadServiceWithCreatePurchaseOrder(async () => {
    createPurchaseOrderCalls += 1;
    throw new Error('Duplicate execution must not call createPurchaseOrder.');
  });

  try {
    const result = await service.convertApprovedRecommendationToPurchaseOrder(
      { prNumber: 'PR-1009' },
      { name: 'Procurement Manager', role: 'procurement_manager' }
    );

    assert.equal(createPurchaseOrderCalls, 0);
    assert.equal(result.success, true);
    assert.equal(result.duplicateSuppressed, true);
    assert.equal(result.poNumber, 'PO-1010');
    assert.equal(result.shipmentNumber, 'SHP-1010-123');
    assert.equal(result.truckId, 'TRK-1010');
  } finally {
    PurchaseRequisition.findOne = originalPrFindOne;
    PurchaseOrder.findOne = originalPoFindOne;
    Shipment.findOne = originalShipmentFindOne;
    Truck.findOne = originalTruckFindOne;
    procurementController.createPurchaseOrder = originalCreatePo;
    delete require.cache[servicePath];
  }
});
