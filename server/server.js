const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cogniyard';

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
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/exceptions', require('./routes/exceptionRoutes'));
app.use('/api/inventory-planning', require('./routes/inventoryPlanningRoutes'));
app.use('/api/vision', require('./routes/visionRoutes'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'CogniYard MVP'
  });
});

// 404 Route Handler for unknown API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err.message);

  // Invalid Mongoose ObjectId format (CastError)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid resource ID format: ${err.value}`
    });
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
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CogniYard Backend Server running on http://localhost:${PORT}`);
});
