const express = require('express');
const router = express.Router();
const visionController = require('../controllers/visionController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/cameras', visionController.getCameras);
router.get('/cameras/:id', visionController.getDetections);
router.get('/status', visionController.getVisionStatus);
router.get('/detections', visionController.getDetections);
router.get('/events', visionController.getVisionEvents);
router.get('/alerts', visionController.getVisionAlerts);
router.get('/congestion', visionController.getCongestion);
router.post('/events', visionController.createVisionEvent);

module.exports = router;
