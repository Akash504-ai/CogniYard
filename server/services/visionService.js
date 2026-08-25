const yardSimulationService = require('./yardSimulationService');
const Truck = require('../models/Truck');
const Dock = require('../models/Dock');
const VisionEvent = require('../models/VisionEvent');
const AuditLog = require('../models/AuditLog');

const CAMERA_CHANNELS = [
  {
    id: 'CAM-01',
    name: 'Gate Entry',
    location: 'Main Gate 1 Inbound Checkpoint',
    type: 'ANPR & Vehicle Detection',
    status: 'ONLINE',
    fps: 30,
    resolution: '1080p Full HD'
  },
  {
    id: 'CAM-02',
    name: 'Yard Queue',
    location: 'Yard Holding Zone B (Stalls 1–4)',
    type: 'Queue & Congestion Monitor',
    status: 'ONLINE',
    fps: 30,
    resolution: '1080p Full HD'
  },
  {
    id: 'CAM-03',
    name: 'Dock Hub',
    location: 'Main Warehouse Dock Apron (Bays 1–4)',
    type: 'Pneumatic Door & Unloading Monitor',
    status: 'ONLINE',
    fps: 30,
    resolution: '1080p Full HD'
  },
  {
    id: 'CAM-04',
    name: 'Warehouse Receiving',
    location: 'Goods Receiving Bay & Staging',
    type: 'Pallet & Receiving Inspection',
    status: 'ONLINE',
    fps: 30,
    resolution: '1080p Full HD'
  }
];

// Calculate congestion score (0-100)
exports.calculateCongestionScore = async () => {
  const simState = yardSimulationService.getState();
  const activeTrucks = (simState.trucks || []).filter(t => t.status !== 'COMPLETED');
  const waitingTrucks = activeTrucks.filter(t => ['IN_TRANSIT', 'AT_GATE', 'IN_YARD', 'WAITING_FOR_DOCK'].includes(t.status));
  const occupiedDocks = (await Dock.countDocuments({ status: 'OCCUPIED' })) || 0;
  const totalDocks = (await Dock.countDocuments()) || 4;

  let score = 20;
  score += waitingTrucks.length * 15;
  score += (occupiedDocks / totalDocks) * 35;
  if (activeTrucks.some(t => t.status === 'DELAYED')) score += 15;

  const finalScore = Math.min(100, Math.round(score));
  const riskLevel = finalScore > 80 ? 'CRITICAL' : finalScore > 50 ? 'HIGH' : finalScore > 25 ? 'MODERATE' : 'LOW';
  
  let primaryCause = 'Normal yard operations within optimal throughput thresholds.';
  let recommendedAction = 'Maintain current dock assignment schedules.';

  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    if (waitingTrucks.length > 0) {
      primaryCause = `${waitingTrucks.length} vehicle(s) waiting in inbound gate holding queue.`;
    } else if (occupiedDocks > 0) {
      primaryCause = `Elevated dock occupancy (${occupiedDocks}/${totalDocks} bays occupied).`;
    } else {
      primaryCause = `High volume of active yard vehicles (${activeTrucks.length} active).`;
    }
    recommendedAction = 'Prioritize dock allocation for waiting inbound vehicles to reduce queue dwell time.';
  } else if (riskLevel === 'MODERATE') {
    primaryCause = `Moderate yard activity with ${waitingTrucks.length} waiting vehicle(s) and ${occupiedDocks}/${totalDocks} docks occupied.`;
    recommendedAction = 'Monitor dock turnaround times and gate queue flow.';
  }

  return {
    score: finalScore,
    riskLevel,
    primaryCause,
    recommendedAction,
    waitingVehicles: waitingTrucks.length,
    occupiedDocks,
    totalDocks,
    activeTrucksCount: activeTrucks.length
  };
};

exports.getCameras = async () => {
  const simState = yardSimulationService.getState();
  const activeTrucks = (simState.trucks || []).filter(t => t.status !== 'COMPLETED');

  const gateTrucks = activeTrucks.filter(t => t.status === 'AT_GATE' || (t.progress >= 20 && t.progress <= 38));
  const queueTrucks = activeTrucks.filter(t => t.status === 'IN_YARD' || t.status === 'WAITING_FOR_DOCK');
  const dockTrucks = activeTrucks.filter(t => t.status === 'AT_DOCK' || t.status === 'UNLOADING');

  return CAMERA_CHANNELS.map(cam => {
    let detectedVehicles = [];
    let risk = 'LOW';

    if (cam.id === 'CAM-01') {
      detectedVehicles = gateTrucks;
      risk = gateTrucks.length > 2 ? 'HIGH' : gateTrucks.length > 0 ? 'MODERATE' : 'LOW';
    } else if (cam.id === 'CAM-02') {
      detectedVehicles = queueTrucks;
      risk = queueTrucks.length > 2 ? 'HIGH' : queueTrucks.length > 0 ? 'MODERATE' : 'LOW';
    } else if (cam.id === 'CAM-03') {
      detectedVehicles = dockTrucks;
      risk = dockTrucks.length >= 3 ? 'HIGH' : dockTrucks.length > 0 ? 'MODERATE' : 'LOW';
    } else if (cam.id === 'CAM-04') {
      detectedVehicles = activeTrucks.filter(t => t.status === 'UNLOADING');
      risk = 'LOW';
    }

    return {
      ...cam,
      vehiclesDetectedCount: detectedVehicles.length,
      currentDetectedVehicles: detectedVehicles.map(t => ({
        truckId: t.truckId,
        poNumber: t.poNumber,
        status: t.status,
        confidence: 0.94,
        licensePlate: `DEMO-${t.truckId.replace('TRK-', '')}`
      })),
      risk,
      lastUpdated: new Date()
    };
  });
};

exports.getDetections = async (cameraId = 'CAM-01') => {
  const simState = yardSimulationService.getState();
  const activeTrucks = (simState.trucks || []).filter(t => t.status !== 'COMPLETED');

  let activeTruck = activeTrucks[0] || null;
  if (cameraId === 'CAM-01') {
    activeTruck = activeTrucks.find(t => t.status === 'AT_GATE' || t.status === 'IN_TRANSIT') || activeTrucks[0];
  } else if (cameraId === 'CAM-02') {
    activeTruck = activeTrucks.find(t => t.status === 'IN_YARD' || t.status === 'WAITING_FOR_DOCK') || activeTrucks[0];
  } else if (cameraId === 'CAM-03' || cameraId === 'CAM-04') {
    activeTruck = activeTrucks.find(t => t.status === 'AT_DOCK' || t.status === 'UNLOADING') || activeTrucks[0];
  }

  const detections = [];
  if (activeTruck) {
    detections.push({
      id: `det-${activeTruck.truckId}`,
      objectType: 'TRUCK',
      confidence: 0.94,
      truckId: activeTruck.truckId,
      poNumber: activeTruck.poNumber,
      licensePlate: `DEMO-${activeTruck.truckId.replace('TRK-', '')}`,
      boundingBox: { x: 140, y: 90, width: 260, height: 160 },
      timestamp: new Date()
    });

    detections.push({
      id: `det-person-${activeTruck.truckId}`,
      objectType: 'PERSON',
      confidence: 0.88,
      safetyHelmet: true,
      boundingBox: { x: 420, y: 160, width: 45, height: 90 },
      timestamp: new Date()
    });
  }

  return {
    cameraId,
    activeTruck,
    detections,
    totalCount: detections.length
  };
};

exports.recordVisionEvent = async (eventData) => {
  const newEvent = new VisionEvent({
    cameraId: eventData.cameraId || 'CAM-01',
    cameraLocation: eventData.cameraLocation || 'Gate Entry',
    eventType: eventData.eventType || 'VEHICLE_DETECTED',
    objectType: eventData.objectType || 'TRUCK',
    truckId: eventData.truckId || 'TRK-9001',
    licensePlate: eventData.licensePlate || `DEMO-${(eventData.truckId || '9001').replace('TRK-', '')}`,
    confidence: eventData.confidence || 0.93,
    boundingBox: eventData.boundingBox || { x: 120, y: 80, width: 240, height: 150 },
    severity: eventData.severity || 'INFO',
    source: eventData.source || 'REAL_CV',
    metadata: eventData.metadata || {}
  });

  await newEvent.save();

  // Execute Authoritative State Transition upon Virtual Gate Line Crossing
  if (newEvent.eventType === 'TRUCK_GATE_ENTRY' && newEvent.truckId) {
    try {
      const truckDoc = await Truck.findOne({ truckId: newEvent.truckId });
      if (truckDoc && (truckDoc.status === 'IN_TRANSIT' || truckDoc.status === 'DELAYED')) {
        truckDoc.status = 'AT_GATE';
        await truckDoc.save();
        yardSimulationService.syncTruckState(newEvent.truckId, { status: 'AT_GATE', progress: 30 });
      }
    } catch (err) {
      console.error('Error updating truck status on gate entry:', err);
    }
  }

  await AuditLog.create({
    user: 'AI Computer Vision Subsystem',
    role: 'admin',
    action: 'VISION_EVENT_LOGGED',
    entity: 'VisionEvent',
    entityId: newEvent._id.toString(),
    details: `Camera ${newEvent.cameraId} logged ${newEvent.eventType} for Vehicle ${newEvent.truckId} (${newEvent.licensePlate}) with confidence ${(newEvent.confidence * 100).toFixed(0)}%.`
  });

  return newEvent;
};
