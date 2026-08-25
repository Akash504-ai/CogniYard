const Truck = require('../models/Truck');
const Dock = require('../models/Dock');
const AuditLog = require('../models/AuditLog');
const Exception = require('../models/Exception');

/**
 * CogniYard Intelligent Yard Simulation Engine
 * In-memory transient state manager for smooth real-time truck movement,
 * state machine transitions, clock acceleration, and milestone persistence.
 */

// Centralized Yard Zone & Polyline Route Definitions
const YARD_ZONES = {
  ORIGIN: [12.9350, 77.5400],
  GATE: [12.9620, 77.5850],
  CHECKPOINT: [12.9670, 77.5890],
  QUEUE: [12.9695, 77.5920],
  DOCK_HUB: [12.9716, 77.5946]
};

// Route polyline coordinates from Origin to Dock Hub
const ROUTE_POINTS = [
  YARD_ZONES.ORIGIN,
  [12.9450, 77.5550],
  [12.9550, 77.5700],
  YARD_ZONES.GATE,
  [12.9645, 77.5870],
  YARD_ZONES.CHECKPOINT,
  YARD_ZONES.QUEUE,
  YARD_ZONES.DOCK_HUB
];

let isRunning = false;
let speedMultiplier = 1; // 1x, 2x, 5x, 10x
let simulationInterval = null;

let stateCache = {
  activeTrucks: [],
  eventLogs: [],
  yardCapacity: { occupied: 0, max: 10 },
  speed: 1,
  isRunning: false
};

// Helper: Linear coordinate interpolation
function interpolate(p1, p2, factor) {
  return [
    p1[0] + (p2[0] - p1[0]) * factor,
    p1[1] + (p2[1] - p1[1]) * factor
  ];
}

// Format minutes into human-readable ETA
function formatEta(minutes, status) {
  if (status === 'COMPLETED') return 'COMPLETED';
  if (minutes <= 0) return 'ARRIVED';
  if (minutes < 1) return '1 min';
  return `${Math.round(minutes)} min`;
}

// Add timestamped event to live feed
function addEvent(text, level = 'info') {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  stateCache.eventLogs.unshift({
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    time: timeStr,
    text,
    level
  });
  if (stateCache.eventLogs.length > 30) {
    stateCache.eventLogs.pop();
  }
}

// Initialize simulation state cache from MongoDB
async function initializeCache() {
  try {
    const trucks = await Truck.find().sort({ truckId: 1 });
    const docks = await Dock.find();

    stateCache.activeTrucks = trucks.map((t, idx) => {
      // Map initial route progress based on status
      let routeIndex = 0;
      let progress = 10;
      let etaMinutes = 15;

      if (t.status === 'AT_GATE') { routeIndex = 3; progress = 50; etaMinutes = 8; }
      else if (t.status === 'IN_YARD') { routeIndex = 5; progress = 70; etaMinutes = 4; }
      else if (t.status === 'AT_DOCK' || t.status === 'UNLOADING') { routeIndex = 7; progress = 90; etaMinutes = 0; }
      else if (t.status === 'COMPLETED') { routeIndex = 7; progress = 100; etaMinutes = 0; }
      else if (t.status === 'DELAYED') { routeIndex = 2; progress = 35; etaMinutes = 25; }

      const pos = ROUTE_POINTS[Math.min(routeIndex, ROUTE_POINTS.length - 1)];

      return {
        _id: t._id.toString(),
        truckId: t.truckId,
        trailerId: t.trailerId,
        poNumber: t.poNumber,
        shipmentId: t.shipmentId,
        driverName: t.driverName,
        driverPhone: t.driverPhone,
        licensePlate: t.licensePlate,
        driverIdSerial: t.driverIdSerial,
        gateVerification: t.gateVerification?.toObject ? t.gateVerification.toObject() : t.gateVerification,
        priority: t.priority,
        loadType: t.loadType,
        latitude: t.latitude || pos[0],
        longitude: t.longitude || pos[1],
        status: t.status,
        progress,
        routeSegment: routeIndex,
        segmentProgress: 0,
        etaMinutes,
        eta: formatEta(etaMinutes),
        yardLocation: t.yardLocation || 'In Transit to Yard',
        assignedDock: t.assignedDock || null,
        unloadingProgress: t.status === 'UNLOADING' ? 50 : 0,
        delayMinutes: t.status === 'DELAYED' ? 15 : 0,
        delayReason: t.status === 'DELAYED' ? 'Traffic Congestion & Gate Queue' : null
      };
    });

    const occupiedCount = stateCache.activeTrucks.filter(t => ['IN_YARD', 'AT_DOCK', 'UNLOADING'].includes(t.status)).length;
    stateCache.yardCapacity = { occupied: occupiedCount, max: 10 };
    stateCache.speed = speedMultiplier;
    stateCache.isRunning = isRunning;

    addEvent('Yard simulation state engine initialized.', 'info');
  } catch (err) {
    console.error('Simulation cache init error:', err.message);
  }
}

// Perform single tick calculation for all trucks
async function tick() {
  if (!isRunning) return;

  const stepFactor = 0.05 * speedMultiplier;
  let updatedAnyMilestone = false;

  for (let truck of stateCache.activeTrucks) {
    if (truck.status === 'COMPLETED' || truck.status === 'DELAYED') continue;

    // The animation can bring a truck to the gate, but it must wait there
    // until real camera OCR approves both the plate and the driver's ID.
    if (truck.status === 'AT_GATE') {
      truck.routeSegment = 3;
      truck.segmentProgress = 0;
      truck.progress = 50;
      truck.latitude = YARD_ZONES.GATE[0];
      truck.longitude = YARD_ZONES.GATE[1];
      const identityApproved = truck.gateVerification?.status === 'APPROVED';
      truck.eta = identityApproved ? 'READY TO PROCEED' : 'IDENTITY CHECK';
      truck.yardLocation = identityApproved
        ? 'Gate 1 · Both Checks Passed · Awaiting Proceed'
        : 'Gate 1 · Awaiting Plate & Driver OCR';
      continue;
    }

    // Advance segment progress
    truck.segmentProgress += stepFactor;

    if (truck.segmentProgress >= 1) {
      truck.segmentProgress = 0;
      truck.routeSegment = Math.min(ROUTE_POINTS.length - 1, truck.routeSegment + 1);
    }

    const currentPt = ROUTE_POINTS[Math.min(truck.routeSegment, ROUTE_POINTS.length - 1)];
    const nextPt = ROUTE_POINTS[Math.min(truck.routeSegment + 1, ROUTE_POINTS.length - 1)];
    const coords = interpolate(currentPt, nextPt, truck.segmentProgress);

    truck.latitude = coords[0];
    truck.longitude = coords[1];

    // Compute progress & ETA
    const totalSegments = ROUTE_POINTS.length - 1;
    const currentTotalIndex = truck.routeSegment + truck.segmentProgress;
    truck.progress = Math.min(100, Math.round((currentTotalIndex / totalSegments) * 100));

    truck.etaMinutes = Math.max(0, Math.round((1 - truck.progress / 100) * 20));
    truck.eta = formatEta(truck.etaMinutes);

    // State Machine Transitions
    let oldStatus = truck.status;

    if (truck.progress >= 95 && truck.status === 'UNLOADING') {
      truck.unloadingProgress = Math.min(100, truck.unloadingProgress + (10 * speedMultiplier));
      if (truck.unloadingProgress >= 100 && !truck.unloadingReady) {
        truck.unloadingReady = true;
        addEvent(`Truck ${truck.truckId} completed unloading at ${truck.assignedDock || 'Dock Bay'}. Ready for warehouse receiving.`, 'success');
      }
    } else if (truck.progress >= 85 && (truck.status === 'IN_YARD' || truck.status === 'WAITING_FOR_DOCK')) {
      if (truck.assignedDock) {
        truck.status = 'AT_DOCK';
        truck.yardLocation = `Dock Bay ${truck.assignedDock}`;
        addEvent(`Truck ${truck.truckId} docked at Bay ${truck.assignedDock}. Unloading initiated.`, 'info');
      } else {
        truck.status = 'WAITING_FOR_DOCK';
        truck.yardLocation = 'Yard Waiting Zone B';
      }
    } else if (truck.progress >= 40 && truck.status === 'IN_TRANSIT') {
      truck.status = 'AT_GATE';
      truck.yardLocation = 'Gate 1 Checkpoint';
      addEvent(`Truck ${truck.truckId} arrived at Gate 1 Checkpoint.`, 'info');
    }

    // Persist milestone status change to MongoDB
    if (oldStatus !== truck.status) {
      updatedAnyMilestone = true;
      try {
        await Truck.findOneAndUpdate(
          { truckId: truck.truckId },
          {
            status: truck.status,
            latitude: truck.latitude,
            longitude: truck.longitude,
            yardLocation: truck.yardLocation,
            eta: truck.eta,
            assignedDock: truck.assignedDock
          }
        );
      } catch (e) {
        console.error('Milestone DB sync error:', e.message);
      }
    }
  }

  // Update overall capacity
  const occupiedCount = stateCache.activeTrucks.filter(t => ['IN_YARD', 'AT_DOCK', 'UNLOADING'].includes(t.status)).length;
  stateCache.yardCapacity = { occupied: occupiedCount, max: 10 };
}

// Controller Methods
exports.startSimulation = (speed = 1) => {
  speedMultiplier = Number(speed) || 1;
  isRunning = true;
  stateCache.isRunning = true;
  stateCache.speed = speedMultiplier;

  if (simulationInterval) clearInterval(simulationInterval);
  simulationInterval = setInterval(tick, 1000);

  addEvent(`▶ Live yard simulation STARTED at ${speedMultiplier}x speed.`, 'success');
  return exports.getState();
};

exports.pauseSimulation = () => {
  isRunning = false;
  stateCache.isRunning = false;

  if (simulationInterval) clearInterval(simulationInterval);
  simulationInterval = null;

  addEvent('⏸ Live yard simulation PAUSED.', 'warning');
  return exports.getState();
};

exports.resetSimulation = async () => {
  exports.pauseSimulation();
  await initializeCache();
  addEvent('↻ Yard simulation reset to baseline telemetry state.', 'info');
  return exports.getState();
};

exports.setSpeed = (speed) => {
  speedMultiplier = Number(speed) || 1;
  stateCache.speed = speedMultiplier;
  addEvent(`Clock speed updated to ${speedMultiplier}x.`, 'info');
  return exports.getState();
};

exports.triggerDelay = async (truckId, delayMinutes = 15, delayReason = 'Gate Congestion') => {
  const truck = stateCache.activeTrucks.find(t => t.truckId === truckId);
  if (truck) {
    truck.status = 'DELAYED';
    truck.delayMinutes = delayMinutes;
    truck.delayReason = delayReason;
    truck.etaMinutes += delayMinutes;
    truck.eta = formatEta(truck.etaMinutes);

    addEvent(`⚠️ Truck ${truckId} DELAYED by ${delayMinutes} min (${delayReason}).`, 'error');

    // MongoDB sync
    await Truck.findOneAndUpdate(
      { truckId },
      { status: 'DELAYED', eta: truck.eta }
    );
  }
  return exports.getState();
};

exports.syncTruckState = (truckId, updates = {}) => {
  const truck = stateCache.activeTrucks.find(t => t.truckId === truckId);
  if (truck) {
    if (updates.status) {
      truck.status = updates.status;
      if (updates.status === 'COMPLETED') {
        truck.progress = 100;
        truck.eta = 'COMPLETED';
        truck.etaMinutes = 0;
        truck.assignedDock = null;
      } else if (updates.status === 'AT_DOCK') {
        truck.progress = Math.max(truck.progress, 85);
      }
    }
    if (updates.assignedDock !== undefined) truck.assignedDock = updates.assignedDock;
    if (updates.yardLocation) truck.yardLocation = updates.yardLocation;
    if (updates.latitude !== undefined) truck.latitude = updates.latitude;
    if (updates.longitude !== undefined) truck.longitude = updates.longitude;
    if (updates.eta) truck.eta = updates.eta;
    if (updates.licensePlate !== undefined) truck.licensePlate = updates.licensePlate;
    if (updates.driverIdSerial !== undefined) truck.driverIdSerial = updates.driverIdSerial;
    if (updates.gateVerification !== undefined) truck.gateVerification = updates.gateVerification;
  }
  const occupiedCount = stateCache.activeTrucks.filter(t => ['IN_YARD', 'AT_DOCK', 'UNLOADING'].includes(t.status)).length;
  stateCache.yardCapacity = { occupied: occupiedCount, max: 10 };
  return exports.getState();
};

exports.registerTruck = (t) => {
  if (!t || !t.truckId) return null;
  const existing = stateCache.activeTrucks.find(item => item.truckId === t.truckId);
  if (existing) return existing;

  const pos = ROUTE_POINTS[0];
  const simTruck = {
    _id: t._id ? t._id.toString() : `${Date.now()}`,
    truckId: t.truckId,
    trailerId: t.trailerId || `TRL-${Math.floor(1000 + Math.random() * 9000)}`,
    poNumber: t.poNumber,
    shipmentId: t.shipmentId,
    driverName: t.driverName || 'CogniYard Express Driver',
    driverPhone: t.driverPhone || '+1-555-0199',
    licensePlate: t.licensePlate || '',
    driverIdSerial: t.driverIdSerial || '',
    gateVerification: t.gateVerification?.toObject ? t.gateVerification.toObject() : (t.gateVerification || { status: 'PENDING', plateMatched: false, driverMatched: false }),
    priority: t.priority || 'HIGH',
    loadType: t.loadType || 'DRY_VAN',
    latitude: t.latitude || pos[0],
    longitude: t.longitude || pos[1],
    status: t.status || 'IN_TRANSIT',
    progress: 10,
    routeSegment: 0,
    segmentProgress: 0,
    etaMinutes: 15,
    eta: formatEta(15, t.status),
    yardLocation: t.yardLocation || 'In Transit to Yard Gate',
    assignedDock: t.assignedDock || null,
    unloadingProgress: 0,
    unloadingReady: false,
    delayMinutes: 0,
    delayReason: null
  };

  stateCache.activeTrucks.unshift(simTruck);
  const occupiedCount = stateCache.activeTrucks.filter(item => ['IN_YARD', 'AT_DOCK', 'UNLOADING'].includes(item.status)).length;
  stateCache.yardCapacity = { occupied: occupiedCount, max: 10 };

  addEvent(`✨ New inbound shipment ${t.truckId} registered for PO ${t.poNumber}.`, 'success');
  return simTruck;
};

exports.syncWithDatabase = async () => {
  try {
    const dbTrucks = await Truck.find();
    for (const t of dbTrucks) {
      const exists = stateCache.activeTrucks.find(item => item.truckId === t.truckId);
      if (!exists) {
        exports.registerTruck(t);
      }
    }
  } catch (err) {
    console.error('syncWithDatabase error:', err.message);
  }
};

exports.getState = () => {
  return {
    success: true,
    isRunning,
    speed: speedMultiplier,
    yardCapacity: stateCache.yardCapacity,
    eventLogs: stateCache.eventLogs,
    trucks: stateCache.activeTrucks,
    routePoints: ROUTE_POINTS,
    zones: YARD_ZONES
  };
};

// Initialize cache on startup
initializeCache();
