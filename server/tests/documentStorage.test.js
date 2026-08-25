const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { getCloudinaryCredentials, storeDocument, uploadsDirectory } = require('../services/documentStorage');

test('one CLOUDINARY_URL is parsed into server-side credentials', () => {
  const original = process.env.CLOUDINARY_URL;
  const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const originalApiKey = process.env.CLOUDINARY_API_KEY;
  const originalApiSecret = process.env.CLOUDINARY_API_SECRET;
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  process.env.CLOUDINARY_URL = 'cloudinary://demo-key:demo-secret@purple-demo';
  try {
    assert.deepEqual(getCloudinaryCredentials(), {
      api_key: 'demo-key',
      api_secret: 'demo-secret',
      cloud_name: 'purple-demo'
    });
  } finally {
    if (original === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = original;
    if (originalCloudName !== undefined) process.env.CLOUDINARY_CLOUD_NAME = originalCloudName;
    if (originalApiKey !== undefined) process.env.CLOUDINARY_API_KEY = originalApiKey;
    if (originalApiSecret !== undefined) process.env.CLOUDINARY_API_SECRET = originalApiSecret;
  }
});

test('supplier document storage remains usable with persistent local demo storage when Cloudinary is missing', async () => {
  const original = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    cloudinaryUrl: process.env.CLOUDINARY_URL
  };
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  delete process.env.CLOUDINARY_URL;
  const originalStrict = process.env.CLOUDINARY_REQUIRED;
  process.env.CLOUDINARY_REQUIRED = 'false';

  try {
    const stored = await storeDocument(Buffer.from('%PDF-test'), {
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
      requireCloudinary: false,
      publicBaseUrl: 'http://localhost:5000'
    });
    assert.equal(stored.storageProvider, 'local');
    assert.match(stored.url, /^http:\/\/localhost:5000\/uploads\//);
    await fs.promises.unlink(path.join(uploadsDirectory, stored.publicId));
  } finally {
    if (original.cloudName !== undefined) process.env.CLOUDINARY_CLOUD_NAME = original.cloudName;
    if (original.apiKey !== undefined) process.env.CLOUDINARY_API_KEY = original.apiKey;
    if (original.apiSecret !== undefined) process.env.CLOUDINARY_API_SECRET = original.apiSecret;
    if (original.cloudinaryUrl !== undefined) process.env.CLOUDINARY_URL = original.cloudinaryUrl;
    if (originalStrict === undefined) delete process.env.CLOUDINARY_REQUIRED;
    else process.env.CLOUDINARY_REQUIRED = originalStrict;
  }
});
