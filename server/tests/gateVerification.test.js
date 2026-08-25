const test = require('node:test');
const assert = require('node:assert/strict');
const { compareOcrText, deriveTruckIdentity, normalizeOcrText } = require('../services/gateVerificationService');

test('live OCR normalization removes spaces and punctuation without inventing text', () => {
  assert.equal(normalizeOcrText(' Plate: CY-9001\n'), 'PLATECY9001');
});

test('number plate and driver serial match when the expected value is present in OCR output', () => {
  assert.equal(compareOcrText('INDIA CY 9001', 'CY-9001').matched, true);
  assert.equal(compareOcrText('Driver ID: DRV-9001', 'DRV-9001').matched, true);
  assert.equal(compareOcrText('CY-9002', 'CY-9001').matched, false);
});

test('existing trucks receive deterministic verification identities', () => {
  assert.deepEqual(deriveTruckIdentity({ truckId: 'TRK-1042' }), {
    licensePlate: 'CY-1042',
    driverIdSerial: 'DRV-1042'
  });
});
