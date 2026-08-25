const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

const uploadsDirectory = path.join(__dirname, '..', 'uploads');

function hasCloudinaryConfiguration() {
  return Boolean(getCloudinaryCredentials());
}

function getCloudinaryCredentials() {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    return {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    };
  }

  const cloudinaryUrl = String(process.env.CLOUDINARY_URL || '').trim();
  const match = cloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/]+)\/?$/i);
  if (!match) return null;
  return {
    api_key: decodeURIComponent(match[1]),
    api_secret: decodeURIComponent(match[2]),
    cloud_name: decodeURIComponent(match[3])
  };
}

function configureCloudinary() {
  const credentials = getCloudinaryCredentials();
  if (!credentials) return false;
  cloudinary.config({
    ...credentials,
    secure: true
  });
  return true;
}

function safeFileName(originalName, fallbackExtension = '.bin') {
  const extension = path.extname(originalName || '') || fallbackExtension;
  const baseName = path.basename(originalName || 'invoice', extension)
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'invoice';
  return `${baseName}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${extension.toLowerCase()}`;
}

async function uploadToCloudinary(buffer, options) {
  configureCloudinary();
  const originalName = options.originalName || 'invoice.pdf';
  const publicId = path.basename(safeFileName(originalName), path.extname(originalName));

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: 'auto',
      folder: process.env.CLOUDINARY_INVOICE_FOLDER || 'cogniyard/invoices',
      public_id: publicId,
      overwrite: false,
      use_filename: true,
      unique_filename: true
    }, (error, uploaded) => {
      if (error) return reject(error);
      resolve(uploaded);
    });
    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format || path.extname(originalName).slice(1),
    originalName,
    mimeType: options.mimeType || '',
    bytes: result.bytes || buffer.length,
    storageProvider: 'cloudinary'
  };
}

async function saveLocally(buffer, options) {
  await fs.promises.mkdir(uploadsDirectory, { recursive: true });
  const fileName = safeFileName(options.originalName, options.fallbackExtension);
  await fs.promises.writeFile(path.join(uploadsDirectory, fileName), buffer, { flag: 'wx' });
  const publicBaseUrl = String(options.publicBaseUrl || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

  return {
    url: `${publicBaseUrl}/uploads/${encodeURIComponent(fileName)}`,
    publicId: fileName,
    resourceType: 'raw',
    format: path.extname(fileName).slice(1),
    originalName: options.originalName || fileName,
    mimeType: options.mimeType || 'application/octet-stream',
    bytes: buffer.length,
    storageProvider: 'local'
  };
}

async function storeDocument(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const error = new Error('The invoice document is empty.');
    error.statusCode = 400;
    throw error;
  }

  const cloudinaryRequired = options.requireCloudinary || String(process.env.CLOUDINARY_REQUIRED).toLowerCase() === 'true';
  if (cloudinaryRequired && !hasCloudinaryConfiguration()) {
    const configurationError = new Error('Cloudinary strict mode is enabled but no credentials are configured. Add CLOUDINARY_URL or the three Cloudinary values in .env, then restart CogniYard.');
    configurationError.statusCode = 503;
    configurationError.expose = true;
    throw configurationError;
  }

  if (hasCloudinaryConfiguration()) {
    try {
      return await uploadToCloudinary(buffer, options);
    } catch (error) {
      if (cloudinaryRequired) {
        console.error('Required Cloudinary upload failed:', error.message);
        const uploadError = new Error('The invoice could not be saved to Cloudinary. Check the Cloudinary credentials and internet connection, then try again.');
        uploadError.statusCode = 502;
        uploadError.expose = true;
        throw uploadError;
      }
      console.error('Cloudinary upload failed; using local development storage:', error.message);
    }
  }

  return saveLocally(buffer, options);
}

module.exports = {
  hasCloudinaryConfiguration,
  getCloudinaryCredentials,
  storeDocument,
  uploadsDirectory
};
