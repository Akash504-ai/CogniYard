const test = require('node:test');
const assert = require('node:assert/strict');
const { parseProcurementRequest } = require('../services/procurementIntentService');

test('extracts uppercase natural-language order without contaminating the item', () => {
  const result = parseProcurementRequest('I WANT TO ORDER 80 BANANA AT RS 5 PER UNIT');
  assert.equal(result.item, 'BANANA');
  assert.equal(result.quantity, 80);
  assert.equal(result.estimatedPrice, 5);
});

test('extracts a multi-word product, quantity and rupee price', () => {
  const result = parseProcurementRequest('Create a PR for 500 safety helmets at ₹250 each');
  assert.equal(result.item.toLowerCase(), 'safety helmets');
  assert.equal(result.quantity, 500);
  assert.equal(result.estimatedPrice, 250);
});

test('keeps the item but reports a missing human unit price', () => {
  const result = parseProcurementRequest('Buy 25 reflective safety jackets');
  assert.equal(result.item.toLowerCase(), 'reflective safety jackets');
  assert.equal(result.quantity, 25);
  assert.equal(result.estimatedPrice, null);
});

test('does not interpret a general supply-chain question as procurement creation', () => {
  const result = parseProcurementRequest('Where is truck TRK-1005?');
  assert.equal(result.isProcurementIntent, false);
});

test('extracts procurement intelligence priority and business reason', () => {
  const result = parseProcurementRequest('Emergency floor shortage: We need 10,000 micro-connector pins for our clinic assembly line. Unit price approved at ₹5.00.');
  assert.equal(result.item.toLowerCase(), 'micro-connector pins');
  assert.equal(result.quantity, 10000);
  assert.equal(result.estimatedPrice, 5);
  assert.equal(result.priority, 'HIGH');
  assert.equal(result.reason, 'Emergency floor shortage');
});

test('extracts exact emergency helmet request without turning sentence into product', () => {
  const result = parseProcurementRequest('Emergency floor shortage: We need 500 safety helmets. Unit price approved at ₹250 each. This is a high priority requirement.');
  assert.equal(result.item.toLowerCase(), 'safety helmets');
  assert.equal(result.quantity, 500);
  assert.equal(result.estimatedPrice, 250);
  assert.equal(result.priority, 'HIGH');
  assert.equal(result.reason, 'Emergency floor shortage');
});

test('preserves full SKU references', () => {
  const result = parseProcurementRequest('Create a PR for 250 units of SKU-HLMT-01 at Rs 45 each');
  assert.equal(result.sku, 'SKU-HLMT-01');
  assert.equal(result.quantity, 250);
  assert.equal(result.estimatedPrice, 45);
});
