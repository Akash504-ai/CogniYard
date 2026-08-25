const path = require('path');
const multer = require('multer');

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.html', '.htm',
  '.doc', '.docx', '.xls', '.xlsx', '.csv'
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/html',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'application/octet-stream'
]);

function validateInvoiceFile(file) {
  if (!file) return { valid: false, message: 'Please choose an invoice file.' };
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return { valid: false, message: `Unsupported invoice file type '${extension || 'unknown'}'.` };
  }
  if (!ALLOWED_MIME_TYPES.has((file.mimetype || '').toLowerCase())) {
    return { valid: false, message: `Unsupported invoice MIME type '${file.mimetype || 'unknown'}'.` };
  }
  return { valid: true, extension };
}

function validateInvoiceBuffer(file) {
  const metadataResult = validateInvoiceFile(file);
  if (!metadataResult.valid) return metadataResult;
  if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    return { valid: false, message: 'The invoice file is empty.' };
  }

  const { extension } = metadataResult;
  const buffer = file.buffer;
  const startsWith = bytes => bytes.every((byte, index) => buffer[index] === byte);
  const textSample = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('utf8').trimStart().toLowerCase();
  const isZip = startsWith([0x50, 0x4b, 0x03, 0x04]) || startsWith([0x50, 0x4b, 0x05, 0x06]) || startsWith([0x50, 0x4b, 0x07, 0x08]);
  const isOle = startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

  const contentMatches = {
    '.pdf': buffer.subarray(0, 5).toString('ascii') === '%PDF-',
    '.jpg': startsWith([0xff, 0xd8, 0xff]),
    '.jpeg': startsWith([0xff, 0xd8, 0xff]),
    '.png': startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    '.webp': buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP',
    '.html': textSample.startsWith('<!doctype html') || textSample.startsWith('<html') || textSample.includes('<body'),
    '.htm': textSample.startsWith('<!doctype html') || textSample.startsWith('<html') || textSample.includes('<body'),
    '.doc': isOle,
    '.xls': isOle,
    '.docx': isZip,
    '.xlsx': isZip,
    '.csv': !buffer.includes(0) && textSample.length > 0
  };

  if (!contentMatches[extension]) {
    return { valid: false, message: `The contents of this file do not match the '${extension}' format.` };
  }
  return { valid: true, extension };
}

const invoiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    const result = validateInvoiceFile(file);
    if (!result.valid) {
      const error = new Error(result.message);
      error.statusCode = 400;
      return callback(error);
    }
    callback(null, true);
  }
});

function validateUploadedInvoice(req, res, next) {
  if (!req.file) return next();
  const result = validateInvoiceBuffer(req.file);
  if (!result.valid) {
    const error = new Error(result.message);
    error.statusCode = 400;
    return next(error);
  }
  next();
}

module.exports = {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  invoiceUpload,
  validateInvoiceFile,
  validateInvoiceBuffer,
  validateUploadedInvoice
};
