function normalizeOcrText(value) {
  return String(value || '')
    .normalize('NFKD')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function deriveTruckIdentity(truck) {
  const suffix = String(truck?.truckId || '0000').replace(/\D/g, '').slice(-6) || '0000';
  return {
    licensePlate: String(truck?.licensePlate || `CY-${suffix}`).trim().toUpperCase(),
    driverIdSerial: String(truck?.driverIdSerial || `DRV-${suffix}`).trim().toUpperCase()
  };
}

function compareOcrText(capturedText, expectedText) {
  const captured = normalizeOcrText(capturedText);
  const expected = normalizeOcrText(expectedText);
  const matched = expected.length >= 4 && (captured === expected || captured.includes(expected));
  return { captured, expected, matched };
}

module.exports = {
  compareOcrText,
  deriveTruckIdentity,
  normalizeOcrText
};
