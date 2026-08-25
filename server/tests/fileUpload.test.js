const test = require('node:test');
const assert = require('node:assert/strict');
const { validateInvoiceFile, validateInvoiceBuffer } = require('../middleware/fileUpload');

const supported = [
  ['invoice.pdf', 'application/pdf'],
  ['invoice.jpg', 'image/jpeg'],
  ['invoice.jpeg', 'image/jpeg'],
  ['invoice.png', 'image/png'],
  ['invoice.webp', 'image/webp'],
  ['invoice.html', 'text/html'],
  ['invoice.doc', 'application/msword'],
  ['invoice.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['invoice.xls', 'application/vnd.ms-excel'],
  ['invoice.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['invoice.csv', 'text/csv']
];

test('all required invoice document formats pass backend validation', () => {
  supported.forEach(([originalname, mimetype]) => {
    assert.equal(validateInvoiceFile({ originalname, mimetype }).valid, true, originalname);
  });
});

test('executable files are rejected even when uploaded through the invoice endpoint', () => {
  const result = validateInvoiceFile({ originalname: 'malware.exe', mimetype: 'application/octet-stream' });
  assert.equal(result.valid, false);
  assert.match(result.message, /unsupported invoice file type/i);
});

test('a renamed executable is rejected when its content does not match PDF', () => {
  const result = validateInvoiceBuffer({
    originalname: 'renamed.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('MZ executable content')
  });
  assert.equal(result.valid, false);
  assert.match(result.message, /do not match/i);
});

test('a PDF signature passes content validation', () => {
  const result = validateInvoiceBuffer({
    originalname: 'invoice.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\ninvoice')
  });
  assert.equal(result.valid, true);
});
