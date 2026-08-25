const test = require('node:test');
const assert = require('node:assert/strict');
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

test('Copilot handles Logistics query from warehouse_manager role', async () => {
  const req = {
    body: { message: 'Show delayed trucks' },
    user: { name: 'Warehouse Manager', role: 'warehouse_manager' }
  };
  const res = createResponse();

  await aiController.chat(req, res, error => { throw error; });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.tool, 'getDelayedTrucks');
  assert.equal(res.body.success, true);
});

test('Copilot handles Finance query from finance_user role', async () => {
  const req = {
    body: { message: 'Why are payments on hold?' },
    user: { name: 'Finance AP User', role: 'finance_user' }
  };
  const res = createResponse();

  await aiController.chat(req, res, error => { throw error; });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.tool, 'getPaymentsOnHold');
  assert.equal(res.body.success, true);
});

test('Copilot blocks unauthorized action for warehouse_manager role (RBAC preserved)', async () => {
  const req = {
    body: {
      message: 'Confirm Action',
      confirmed: true,
      params: {
        __tool: 'createPurchaseRequisition',
        item: 'Safety Helmet',
        quantity: 500,
        estimatedPrice: 250
      }
    },
    user: { name: 'Warehouse Manager', role: 'warehouse_manager' }
  };
  const res = createResponse();

  await aiController.chat(req, res, error => { throw error; });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.toolResult.success, false);
  assert.match(res.body.toolResult.message, /not authorized|forbidden/i);
});
