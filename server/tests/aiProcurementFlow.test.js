const test = require('node:test');
const assert = require('node:assert/strict');
const Truck = require('../models/Truck');
const Dock = require('../models/Dock');

Truck.find = () => ({ sort: async () => [] });
Dock.find = async () => [];

const procurementIntelligence = require('../services/procurementIntelligenceService');
const aiController = require('../controllers/aiController');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('Copilot routes complete procurement request to intelligence preview before PR creation', async () => {
  const originalBuild = procurementIntelligence.buildProcurementPreview;
  const originalCreate = procurementIntelligence.createPrFromRecommendation;
  const message = 'Emergency floor shortage: We need 500 safety helmets. Unit price approved at ₹250 each. This is a high priority requirement.';
  let previewParams;
  let createCalled = false;

  procurementIntelligence.buildProcurementPreview = async params => {
    previewParams = params;
    return {
      success: true,
      action: 'PROCUREMENT_INTELLIGENCE_PREVIEW',
      procurementPreview: {
        requirement: {
          productName: 'Safety Helmet',
          sku: 'SKU-HLMT-01',
          quantity: 500,
          unitPrice: 250,
          priority: 'HIGH',
          estimatedTotalValue: 125000,
          reason: 'Emergency floor shortage'
        },
        supplierIntelligence: {
          topSupplier: {
            _id: 'supplier-1',
            name: 'Ranked Supplier',
            score: 97,
            otdScore: 98,
            rating: 4.8,
            leadTimeDays: 2
          },
          rationale: 'Ranked Supplier leads on existing supplier score.'
        },
        planningValidation: {
          available: true,
          eoq: 300,
          requestedQuantity: 500,
          comparison: 'ABOVE_EOQ',
          recommendation: 'Keep the requested quantity because urgency justifies review.'
        }
      },
      params: {
        item: 'Safety Helmet',
        productId: 'product-1',
        sku: 'SKU-HLMT-01',
        quantity: 500,
        estimatedPrice: 250,
        priority: 'HIGH',
        reason: 'Emergency floor shortage',
        supplierId: 'supplier-1',
        supplierName: 'Ranked Supplier',
        intelligenceId: 'intel-1'
      },
      confirmationPrompt: 'Approve Procurement Recommendation'
    };
  };
  procurementIntelligence.createPrFromRecommendation = async () => {
    createCalled = true;
    return { success: false, message: 'Should not create PR before confirmation.' };
  };

  try {
    const req = {
      body: { message },
      user: { name: 'Procurement Manager', role: 'procurement_manager' }
    };
    const res = createResponse();

    await aiController.chat(req, res, error => { throw error; });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.tool, 'prepareProcurementIntelligence');
    assert.equal(res.body.requiresConfirmation, true);
    assert.equal(res.body.actionType, 'APPROVE_PROCUREMENT_RECOMMENDATION');
    assert.equal(res.body.reply, 'Approve Procurement Recommendation');
    assert.equal(res.body.toolResult.procurementPreview.requirement.productName, 'Safety Helmet');
    assert.equal(res.body.toolResult.procurementPreview.requirement.quantity, 500);
    assert.equal(res.body.toolResult.procurementPreview.requirement.unitPrice, 250);
    assert.equal(res.body.toolResult.procurementPreview.requirement.priority, 'HIGH');
    assert.equal(res.body.toolResult.procurementPreview.requirement.estimatedTotalValue, 125000);
    assert.equal(res.body.toolResult.procurementPreview.supplierIntelligence.topSupplier.otdScore, 98);
    assert.equal(res.body.toolResult.procurementPreview.supplierIntelligence.topSupplier.rating, 4.8);
    assert.equal(res.body.toolResult.procurementPreview.supplierIntelligence.topSupplier.leadTimeDays, 2);
    assert.equal(res.body.toolResult.procurementPreview.planningValidation.eoq, 300);
    assert.equal(res.body.toolResult.procurementPreview.planningValidation.requestedQuantity, 500);
    assert.equal(previewParams.item.toLowerCase(), 'safety helmets');
    assert.equal(previewParams.quantity, 500);
    assert.equal(previewParams.estimatedPrice, 250);
    assert.equal(previewParams.priority, 'HIGH');
    assert.equal(previewParams.reason, 'Emergency floor shortage');
    assert.equal(createCalled, false);
  } finally {
    procurementIntelligence.buildProcurementPreview = originalBuild;
    procurementIntelligence.createPrFromRecommendation = originalCreate;
  }
});

test('Copilot confirmation creates PR from approved procurement recommendation', async () => {
  const originalBuild = procurementIntelligence.buildProcurementPreview;
  const originalCreate = procurementIntelligence.createPrFromRecommendation;
  let confirmedParams;

  procurementIntelligence.buildProcurementPreview = async () => {
    throw new Error('Preview should not be rebuilt during confirmation.');
  };
  procurementIntelligence.createPrFromRecommendation = async (params) => {
    confirmedParams = params;
    return {
      success: true,
      action: 'CREATED_PR',
      prNumber: 'PR-1001',
      status: 'PENDING',
      supplierName: 'Ranked Supplier',
      totalAmount: 125000,
      details: 'Purchase Requisition PR-1001 created from the approved recommendation.'
    };
  };

  try {
    const req = {
      body: {
        message: 'Confirm Action',
        confirmed: true,
        params: {
          __tool: 'prepareProcurementIntelligence',
          item: 'Safety Helmet',
          productId: 'product-1',
          sku: 'SKU-HLMT-01',
          quantity: 500,
          estimatedPrice: 250,
          priority: 'HIGH',
          reason: 'Emergency floor shortage',
          supplierId: 'supplier-1',
          supplierName: 'Ranked Supplier',
          intelligenceId: 'intel-1'
        }
      },
      user: { name: 'Procurement Manager', role: 'procurement_manager' }
    };
    const res = createResponse();

    await aiController.chat(req, res, error => { throw error; });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.tool, 'prepareProcurementIntelligence');
    assert.equal(res.body.intent, 'confirmed_prepareProcurementIntelligence');
    assert.equal(res.body.toolResult.action, 'CREATED_PR');
    assert.equal(res.body.toolResult.prNumber, 'PR-1001');
    assert.equal(confirmedParams.quantity, 500);
    assert.equal(confirmedParams.estimatedPrice, 250);
    assert.equal(confirmedParams.priority, 'HIGH');
    assert.equal(confirmedParams.reason, 'Emergency floor shortage');
  } finally {
    procurementIntelligence.buildProcurementPreview = originalBuild;
    procurementIntelligence.createPrFromRecommendation = originalCreate;
  }
});

test('Copilot prepares approved recommendation PO conversion before execution', async () => {
  const message = 'Approve Recommendation & Create PO for PR-1009';
  const req = {
    body: { message },
    user: { name: 'Procurement Manager', role: 'procurement_manager' }
  };
  const res = createResponse();

  await aiController.chat(req, res, error => { throw error; });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.tool, 'convertApprovedRecommendationToPurchaseOrder');
  assert.equal(res.body.requiresConfirmation, true);
  assert.equal(res.body.actionType, 'CREATE_PO_FROM_APPROVED_RECOMMENDATION');
  assert.equal(res.body.params.prNumber, 'PR-1009');
});
