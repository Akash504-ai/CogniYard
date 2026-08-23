const visionService = require('../services/visionService');
const VisionEvent = require('../models/VisionEvent');

exports.getCameras = async (req, res, next) => {
  try {
    const cameras = await visionService.getCameras();
    res.json({ success: true, count: cameras.length, cameras });
  } catch (error) {
    next(error);
  }
};

exports.getVisionStatus = async (req, res, next) => {
  try {
    const cameras = await visionService.getCameras();
    const congestion = await visionService.calculateCongestionScore();
    const activeAlerts = await VisionEvent.countDocuments({ status: 'OPEN', severity: { $in: ['CRITICAL', 'WARNING'] } });

    res.json({
      success: true,
      status: 'online',
      camerasOnline: cameras.filter(c => c.status === 'ONLINE').length,
      totalCameras: cameras.length,
      totalVehiclesDetected: cameras.reduce((sum, c) => sum + c.vehiclesDetectedCount, 0),
      congestionScore: congestion.score,
      congestionRisk: congestion.riskLevel,
      visionAlertsCount: activeAlerts
    });
  } catch (error) {
    next(error);
  }
};

exports.getDetections = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await visionService.getDetections(id || 'CAM-01');
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

exports.getVisionEvents = async (req, res, next) => {
  try {
    const events = await VisionEvent.find().sort({ createdAt: -1 }).limit(30);
    res.json({ success: true, count: events.length, events });
  } catch (error) {
    next(error);
  }
};

exports.getVisionAlerts = async (req, res, next) => {
  try {
    const alerts = await VisionEvent.find({ severity: { $in: ['CRITICAL', 'WARNING'] } }).sort({ createdAt: -1 }).limit(15);
    res.json({ success: true, count: alerts.length, alerts });
  } catch (error) {
    next(error);
  }
};

exports.getCongestion = async (req, res, next) => {
  try {
    const congestion = await visionService.calculateCongestionScore();
    res.json({ success: true, congestion });
  } catch (error) {
    next(error);
  }
};

exports.createVisionEvent = async (req, res, next) => {
  try {
    const event = await visionService.recordVisionEvent(req.body);
    res.status(201).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};
