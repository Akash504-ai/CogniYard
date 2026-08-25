const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateThreeWayMatch, isStoredSupplierDocument, parseItems, runThreeWayMatch } = require('../services/invoiceService');

const purchaseOrder = {
  poNumber: 'PO-TEST-1',
  supplierName: 'Acme Safety',
  items: [{ productName: 'Safety Helmet', quantity: 100, unitPrice: 250, totalPrice: 25000 }],
  subtotal: 25000,
  taxAmount: 0,
  totalAmount: 25000
};

const receipt = {
  receiptNumber: 'GR-TEST-1',
  poNumber: 'PO-TEST-1',
  supplierName: 'Acme Safety',
  items: [{ productName: 'Safety Helmet', acceptedQuantity: 100, unitPrice: 250 }]
};

const invoice = {
  invoiceNumber: 'INV-TEST-1',
  poNumber: 'PO-TEST-1',
  supplierName: 'Acme Safety',
  items: [{ productName: 'Safety Helmet', quantity: 100, unitPrice: 250, totalPrice: 25000 }],
  subtotal: 25000,
  taxAmount: 0,
  totalAmount: 25000
};

test('3-way matching returns MATCHED only when PO, GRN and invoice lines agree', () => {
  const result = calculateThreeWayMatch(purchaseOrder, [receipt], invoice);
  assert.equal(result.status, 'MATCHED');
  assert.equal(result.summary.mismatched, 0);
  assert.ok(result.comparisons.every(row => row.result === 'MATCH'));
});

test('3-way matching reports exact partial quantity and subtotal differences', () => {
  const shortInvoice = {
    ...invoice,
    items: [{ productName: 'Safety Helmet', quantity: 95, unitPrice: 250, totalPrice: 23750 }],
    subtotal: 23750,
    totalAmount: 23750
  };
  const result = calculateThreeWayMatch(purchaseOrder, [receipt], shortInvoice);
  assert.equal(result.status, 'PARTIALLY_MATCHED');
  assert.ok(result.reasons.some(reason => reason.includes('Quantity · Safety Helmet')));
  assert.ok(result.reasons.some(reason => reason.includes('Subtotal')));
  assert.equal(result.comparisons.some(row => /Line Total|Tax Amount|Grand Total/i.test(row.field)), false);
});

test('3-way matching rejects an invoice for the wrong supplier', () => {
  const unrelatedInvoice = { ...invoice, supplierName: 'Unrelated Supplier' };
  const result = calculateThreeWayMatch(purchaseOrder, [receipt], unrelatedInvoice);
  assert.equal(result.status, 'MISMATCHED');
  assert.equal(result.comparisons.find(row => row.field === 'Supplier').result, 'MISMATCH');
});

test('invoice parsing requires a human-entered unit price', () => {
  assert.throws(
    () => parseItems([{ productName: 'Safety Helmet', quantity: 100 }], purchaseOrder),
    /price per unit greater than 0/i
  );
});

test('3-way matching rejects a Finance-created invoice before any database comparison', async () => {
  await assert.rejects(
    () => runThreeWayMatch({ ...invoice, sourceType: 'FINANCE_UPLOAD', submissionStatus: 'SUBMITTED' }),
    /only the supplier-generated or supplier-uploaded invoice/i
  );
});

test('Cloudinary and built-in local documents are both valid supplier documents', () => {
  assert.equal(isStoredSupplierDocument({ fileUrl: 'https://res.cloudinary.com/demo/invoice.pdf', document: { storageProvider: 'cloudinary' } }), true);
  assert.equal(isStoredSupplierDocument({ fileUrl: 'http://localhost:5000/uploads/invoice.pdf', document: { storageProvider: 'local' } }), true);
  assert.equal(isStoredSupplierDocument({ fileUrl: 'https://untrusted.example/invoice.pdf', document: { storageProvider: 'external' } }), false);
  assert.equal(isStoredSupplierDocument({ fileUrl: '', document: { storageProvider: 'local' } }), false);
});
