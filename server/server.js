const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env'), override: false });

const app = express();
const PORT = process.env.PORT || 5000;
const APP_VERSION = '2.3.1';

// Middleware
const allowedOrigins = String(process.env.CLIENT_URL || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173')
  .split(',').map(value => value.trim()).filter(Boolean);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      workerSrc: ["'self'", 'blob:', 'https://cdn.jsdelivr.net'],
      connectSrc: ["'self'", 'https:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'data:']
    }
  }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not permitted by CORS policy.'));
  },
  credentials: true
}));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 150, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { fallthrough: false, maxAge: '1h' }));

// MongoDB Connection
const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/cogniyard';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully to CogniYard Database'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api', require('./routes/procurementRoutes'));
app.use('/api', require('./routes/logisticsRoutes'));
app.use('/api', require('./routes/financeRoutes'));
app.use('/api', require('./routes/supplierRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/exceptions', require('./routes/exceptionRoutes'));
app.use('/api/inventory-planning', require('./routes/inventoryPlanningRoutes'));
app.use('/api/vision', require('./routes/visionRoutes'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? 'online' : 'degraded',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    app: 'CogniYard',
    version: APP_VERSION
  });
});

// 404 Route Handler for unknown API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`
  });
});

if (process.env.NODE_ENV === 'production') {
  const clientDirectory = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDirectory));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    res.sendFile(path.join(clientDirectory, 'index.html'));
  });
}

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('API Error:', { message: err.message, method: req.method, path: req.originalUrl });

  // Invalid Mongoose ObjectId format (CastError)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid resource ID format: ${err.value}`
    });
  }

  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'The invoice file exceeds the 10 MB upload limit.'
      : 'The invoice upload could not be accepted.';
    return res.status(400).json({ success: false, message });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      success: false,
      message
    });
  }

  // Duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered.'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }

  // Default internal server error (no raw stack trace in response)
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && !err.expose ? 'The server could not complete this request. Please try again or contact an administrator.' : (err.message || 'Request failed.')
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CogniYard v${APP_VERSION} Backend Server running on http://localhost:${PORT}`);
});

module.exports = app;
