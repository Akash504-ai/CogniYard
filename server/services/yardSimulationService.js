const Truck = require('../models/Truck');
const Dock = require('../models/Dock');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const AuditLog = require('../models/AuditLog');
const Exception = require('../models/Exception');

/**
 * CogniYard Intelligent Yard Simulation Engine
 * In-memory transient state manager for smooth real-time truck movement,
 * state machine transitions, clock acceleration, and milestone persistence.
 */

// Multi-Corridor Road Geometry from Real CogniYard Suppliers
const FREIGHT_CORRIDORS = {
  CORR_APEX: {
    id: 'CORR_APEX',
    name: 'Apex Industrial Safety Co. (Peenya Plant)',
    supplierName: 'Apex Industrial Safety Co.',
    vendorCode: 'SUP-1001',
    facility: 'Peenya Industrial Complex, Bengaluru',
    color: '#15803D',
    points: [
      [12.9240, 77.5210], // Apex Manufacturing Plant
      [12.9310, 77.5340],
      [12.9385, 77.5460], // Western Flyover
      [12.9440, 77.5540],
      [12.9495, 77.5620], // Outer Ring Junction
      [12.9540, 77.5695],
      [12.9580, 77.5770], // Logistics Approach Rd
      [12.9620, 77.5850], // Gate 1 ANPR Station
      [12.9650, 77.5878], // Axle Weighbridge
      [12.9680, 77.5905], // Yard Staging Queue
      [12.9692, 77.5918], // Holding Bay A-02
      [12.9705, 77.5932], // Apron Access Lane
      [12.9716, 77.5946]  // CogniYard Central Docks
    ],
    gateIndex: 7
  },
  CORR_HRISI: {
    id: 'CORR_HRISI',
    name: 'Hrisi HD (Electronic City Works)',
    supplierName: 'Hrisi HD',
    vendorCode: 'SUP-1005',
    facility: 'Electronic City Phase II, Bengaluru',
    color: '#7C3AED',
    points: [
      [13.0120, 77.6180], // Hrisi HD Central Works
      [13.0020, 77.6100],
      [12.9910, 77.6030], // North Expressway Flyover
      [12.9820, 77.5960],
      [12.9740, 77.5900], // Inner Bypass
      [12.9680, 77.5865],
      [12.9620, 77.5850], // Gate 1 ANPR Station
      [12.9650, 77.5878], // Axle Weighbridge
      [12.9680, 77.5905], // Yard Staging Queue
      [12.9692, 77.5918], // Holding Bay A-02
      [12.9705, 77.5932], // Apron Access Lane
      [12.9716, 77.5946]  // CogniYard Central Docks
    ],
    gateIndex: 6
  },
  CORR_PRADIP: {
    id: 'CORR_PRADIP',
    name: 'Pradip Steel (Hosur Freight Yard)',
    supplierName: 'Pradip Steel',
    vendorCode: 'SUP-1004',
    facility: 'Hosur Industrial Freight Corridor',
    color: '#0284C7',
    points: [
      [12.9510, 77.6620], // Pradip Steel Logistics Center
      [12.9550, 77.6470],
      [12.9580, 77.6320], // Rail Freight Siding
      [12.9605, 77.6170],
      [12.9615, 77.6010], // East Ring Road
      [12.9618, 77.5910],
      [12.9620, 77.5850], // Gate 1 ANPR Station
      [12.9650, 77.5878], // Axle Weighbridge
      [12.9680, 77.5905], // Yard Staging Queue
      [12.9692, 77.5918], // Holding Bay A-02
      [12.9705, 77.5932], // Apron Access Lane
      [12.9716, 77.5946]  // CogniYard Central Docks
    ],
    gateIndex: 6
  },
  CORR_AKASH: {
    id: 'CORR_AKASH',
    name: 'Akash (Whitefield Distribution)',
    supplierName: 'Akash',
    vendorCode: 'SUP-1003',
    facility: 'Whitefield Logistics Hub, Bengaluru',
    color: '#D97706',
    points: [
      [12.9780, 77.6450], // Akash Terminal
      [12.9730, 77.6280],
      [12.9680, 77.6110],
      [12.9640, 77.5960],
      [12.9620, 77.5850], // Gate 1 ANPR Station
      [12.9650, 77.5878], // Axle Weighbridge
      [12.9680, 77.5905], // Yard Staging Queue
      [12.9692, 77.5918], // Holding Bay A-02
      [12.9705, 77.5932], // Apron Access Lane
      [12.9716, 77.5946]  // CogniYard Central Docks
    ],
    gateIndex: 4
  },
  CORR_YOYO: {
    id: 'CORR_YOYO',
    name: 'YO-YO (Bommasandra Plant)',
    supplierName: 'YO-YO',
    vendorCode: 'SUP-1002',
    facility: 'Bommasandra Industrial Area',
    color: '#E11D48',
    points: [
      [12.9350, 77.5890], // YO-YO Plant
      [12.9430, 77.5870],
      [12.9520, 77.5860],
      [12.9620, 77.5850], // Gate 1 ANPR Station
      [12.9650, 77.5878], // Axle Weighbridge
      [12.9680, 77.5905], // Yard Staging Queue
      [12.9692, 77.5918], // Holding Bay A-02
      [12.9705, 77.5932], // Apron Access Lane
      [12.9716, 77.5946]  // CogniYard Central Docks
    ],
    gateIndex: 3
  },
  CORR_DEMO: {
    id: 'CORR_DEMO',
    name: 'CogniYard Demo Supplier (Outer Ring Rd)',
    supplierName: 'CogniYard Demo Supplier',
    vendorCode: 'SUP-DEMO',
    facility: 'Outer Ring Road Terminal',
    color: '#0D9488',
    points: [
      [12.9495, 77.5620],
      [12.9540, 77.5695],
      [12.9580, 77.5770],
      [12.9620, 77.5850], // Gate 1 ANPR Station
      [12.9650, 77.5878], // Axle Weighbridge
      [12.9680, 77.5905], // Yard Staging Queue
      [12.9692, 77.5918], // Holding Bay A-02
      [12.9705, 77.5932], // Apron Access Lane
      [12.9716, 77.5946]  // CogniYard Central Docks
    ],
    gateIndex: 3
  }
};

// Aliases for backward compatibility
FREIGHT_CORRIDORS.HIGHWAY_NH48 = FREIGHT_CORRIDORS.CORR_APEX;
FREIGHT_CORRIDORS.NORTH_AIRPORT = FREIGHT_CORRIDORS.CORR_HRISI;
FREIGHT_CORRIDORS.EAST_BELT = FREIGHT_CORRIDORS.CORR_PRADIP;
FREIGHT_CORRIDORS.APEX_PLANT = FREIGHT_CORRIDORS.CORR_APEX;
FREIGHT_CORRIDORS.HRISI_SUPPLY_HUB = FREIGHT_CORRIDORS.CORR_HRISI;
FREIGHT_CORRIDORS.VANGUARD_DEPOT = FREIGHT_CORRIDORS.CORR_PRADIP;

const DOCK_COORDINATES = {
  'DOCK-01': [12.9712, 77.5942],
  'DOCK-02': [12.9716, 77.5946],
  'DOCK-03': [12.9720, 77.5950],
  'DOCK-04': [12.9724, 77.5954],
  'DOCK-05': [12.9728, 77.5958],
  'DOCK-06': [12.9732, 77.5962]
};

const YARD_ZONES = {
  ORIGIN: [12.9240, 77.5210],
  GATE: [12.9620, 77.5850],
  CHECKPOINT: [12.9650, 77.5878],
  QUEUE: [12.9680, 77.5905],
  HOLDING_BAY: [12.9692, 77.5918],
  DOCK_HUB: [12.9716, 77.5946]
};

const ROUTE_POINTS = FREIGHT_CORRIDORS.CORR_APEX.points;

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

// Helper: Bearing / Heading calculation
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const toDeg = rad => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return Math.round((toDeg(theta) + 360) % 360);
}

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

const VENDOR_MATRIX = {
  'SUP-1005': { code: 'SUP-1005', name: 'Hrisi HD', email: 'hrisihd18@gmail.com', rating: 4.5, otdScore: 94, facility: 'Electronic City Phase II, Bengaluru' },
  'SUP-1004': { code: 'SUP-1004', name: 'Pradip Steel', email: 'contact@pradip.com', rating: 4.5, otdScore: 94, facility: 'Hosur Industrial Freight Corridor' },
  'SUP-1003': { code: 'SUP-1003', name: 'Akash', email: 'akash@cogniyard.com', rating: 4.5, otdScore: 94, facility: 'Whitefield Logistics Hub, Bengaluru' },
  'SUP-1002': { code: 'SUP-1002', name: 'YO-YO', email: 'supplier@cogniyard.com', rating: 4.4, otdScore: 94, facility: 'Bommasandra Industrial Area' },
  'SUP-1001': { code: 'SUP-1001', name: 'Apex Industrial Safety Co.', email: 'supplier@cogniyard.com', rating: 4.9, otdScore: 94, facility: 'Peenya Industrial Complex, Bengaluru' },
  'SUP-DEMO': { code: 'SUP-DEMO', name: 'CogniYard Demo Supplier', email: 'supplier@cogniyard.com', rating: 4.8, otdScore: 94, facility: 'Outer Ring Road Terminal' }
};

function resolveVendorForPoOrTruck(poNumber, rawSupplierName, vendorCode, truckId, index = 0) {
  const normPo = String(poNumber || '').toUpperCase().trim();
  const normSup = String(rawSupplierName || '').toLowerCase().trim();
  const normCode = String(vendorCode || '').toUpperCase().trim();
  const normTrk = String(truckId || '').toUpperCase().trim();

  if (normCode === 'SUP-1005' || normPo.includes('1005') || normSup.includes('hrisi') || normTrk.includes('1005') || normTrk.includes('1002')) {
    return VENDOR_MATRIX['SUP-1005'];
  }
  if (normCode === 'SUP-1004' || normPo.includes('1004') || normSup.includes('pradip') || normSup.includes('steel') || normTrk.includes('1004') || normTrk.includes('9002')) {
    return VENDOR_MATRIX['SUP-1004'];
  }
  if (normCode === 'SUP-1003' || normPo.includes('1003') || normSup.includes('akash') || normTrk.includes('1003')) {
    return VENDOR_MATRIX['SUP-1003'];
  }
  if (normCode === 'SUP-1002' || normPo.includes('1002') || normSup.includes('yo-yo') || normTrk.includes('1007')) {
    return VENDOR_MATRIX['SUP-1002'];
  }
  if (normCode === 'SUP-DEMO' || normPo.includes('DEMO') || normSup.includes('demo')) {
    return VENDOR_MATRIX['SUP-DEMO'];
  }
  if (normCode === 'SUP-1001' || normPo.includes('1001') || normSup.includes('apex') || normTrk.includes('9001')) {
    return VENDOR_MATRIX['SUP-1001'];
  }

  const list = Object.values(VENDOR_MATRIX);
  return list[index % list.length];
}

// Initialize simulation state cache from MongoDB
async function initializeCache() {
  try {
    const trucks = await Truck.find().sort({ truckId: 1 });
    const pos = await PurchaseOrder.find().lean();
    const poMap = new Map(pos.map(p => [p.poNumber, p]));
    const suppliers = await Supplier.find().lean();
    const supplierByName = new Map(suppliers.map(s => [s.name.toLowerCase().trim(), s]));
    const supplierByCode = new Map(suppliers.map(s => [s.code.toUpperCase().trim(), s]));

    stateCache.activeTrucks = trucks.map((t, idx) => {
      const po = poMap.get(t.poNumber);
      const rawSupplier = po?.supplierName || t.supplierName;
      const vendorCodeParam = t.vendorCode || po?.supplier?.code;
      
      const matchedVendor = resolveVendorForPoOrTruck(t.poNumber, rawSupplier, vendorCodeParam, t.truckId, idx);
      const matchedDbSupplier = supplierByName.get(matchedVendor.name.toLowerCase()) || supplierByCode.get(matchedVendor.code);

      const supplierName = matchedDbSupplier?.name || matchedVendor.name;
      const vendorCode = matchedDbSupplier?.code || matchedVendor.code;
      const contactEmail = matchedDbSupplier?.email || matchedVendor.email;
      const performanceScore = `${matchedDbSupplier?.rating || matchedVendor.rating}★ (OTD: ${matchedDbSupplier?.otdScore || matchedVendor.otdScore}%)`;

      // Map corridor strictly based on the specific supplier
      let corridorId = 'CORR_APEX';
      const normSup = String(supplierName).toLowerCase();
      const code = String(vendorCode).toUpperCase();

      if (code === 'SUP-1005' || normSup.includes('hrisi')) {
        corridorId = 'CORR_HRISI';
      } else if (code === 'SUP-1004' || normSup.includes('pradip') || normSup.includes('steel')) {
        corridorId = 'CORR_PRADIP';
      } else if (code === 'SUP-1003' || normSup.includes('akash')) {
        corridorId = 'CORR_AKASH';
      } else if (code === 'SUP-1002' || normSup.includes('yo-yo')) {
        corridorId = 'CORR_YOYO';
      } else if (code === 'SUP-DEMO' || normSup.includes('demo')) {
        corridorId = 'CORR_DEMO';
      } else {
        corridorId = 'CORR_APEX';
      }

      const corridor = FREIGHT_CORRIDORS[corridorId] || FREIGHT_CORRIDORS.CORR_APEX;
      const points = corridor.points;

      // Map initial route progress based on status
      let routeIndex = 0;
      let progress = 10;
      let etaMinutes = 15;
      let speedKmH = 48;

      if (t.status === 'AT_GATE') {
        routeIndex = corridor.gateIndex;
        progress = 50;
        etaMinutes = 0;
        speedKmH = 0;
      } else if (t.status === 'IN_YARD' || t.status === 'WAITING_FOR_DOCK') {
        routeIndex = Math.min(points.length - 2, corridor.gateIndex + 2);
        progress = 75;
        etaMinutes = 2;
        speedKmH = 15;
      } else if (t.status === 'AT_DOCK' || t.status === 'UNLOADING') {
        routeIndex = points.length - 1;
        progress = 90;
        etaMinutes = 0;
        speedKmH = 0;
      } else if (t.status === 'COMPLETED') {
        routeIndex = points.length - 1;
        progress = 100;
        etaMinutes = 0;
        speedKmH = 0;
      } else if (t.status === 'DELAYED') {
        routeIndex = Math.max(1, corridor.gateIndex - 2);
        progress = 30;
        etaMinutes = 25;
        speedKmH = 8;
      }

      const posCoord = points[Math.min(routeIndex, points.length - 1)];
      const nextCoord = points[Math.min(routeIndex + 1, points.length - 1)];
      const heading = calculateBearing(posCoord[0], posCoord[1], nextCoord[0], nextCoord[1]);

      return {
        _id: t._id.toString(),
        truckId: t.truckId,
        trailerId: t.trailerId,
        poNumber: t.poNumber,
        shipmentId: t.shipmentId,
        supplierName,
        vendorCode,
        contactEmail,
        performanceScore,
        originFacility: corridor.facility,
        driverName: t.driverName,
        driverPhone: t.driverPhone,
        licensePlate: t.licensePlate,
        driverIdSerial: t.driverIdSerial,
        gateVerification: t.gateVerification?.toObject ? t.gateVerification.toObject() : t.gateVerification,
        priority: t.priority,
        loadType: t.loadType,
        corridorId,
        latitude: t.latitude || posCoord[0],
        longitude: t.longitude || posCoord[1],
        heading,
        speedKmH,
        status: t.status,
        progress,
        routeSegment: routeIndex,
        segmentProgress: 0,
        etaMinutes,
        eta: formatEta(etaMinutes),
        yardLocation: t.yardLocation || 'En Route to Facility Gate',
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

    addEvent('Yard simulation engine initialized with real-time supplier telemetry.', 'info');
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
    if (truck.status === 'COMPLETED') continue;

    // Dynamically enforce corridor ID matching the specific supplier
    let corridorId = truck.corridorId;
    const code = String(truck.vendorCode || '').toUpperCase().trim();
    const normSup = String(truck.supplierName || '').toLowerCase().trim();
    const normPo = String(truck.poNumber || '').toUpperCase().trim();
    const normTrk = String(truck.truckId || '').toUpperCase().trim();

    if (code === 'SUP-1005' || normSup.includes('hrisi') || normPo.includes('1005') || normTrk.includes('1005') || normTrk.includes('1002')) {
      corridorId = 'CORR_HRISI';
    } else if (code === 'SUP-1004' || normSup.includes('pradip') || normSup.includes('steel') || normPo.includes('1004') || normTrk.includes('1004') || normTrk.includes('9002')) {
      corridorId = 'CORR_PRADIP';
    } else if (code === 'SUP-1003' || normSup.includes('akash') || normPo.includes('1003') || normTrk.includes('1003')) {
      corridorId = 'CORR_AKASH';
    } else if (code === 'SUP-1002' || normSup.includes('yo-yo') || normPo.includes('1002') || normTrk.includes('1007')) {
      corridorId = 'CORR_YOYO';
    } else if (code === 'SUP-DEMO' || normSup.includes('demo') || normPo.includes('DEMO')) {
      corridorId = 'CORR_DEMO';
    } else {
      corridorId = 'CORR_APEX';
    }
    truck.corridorId = corridorId;

    const corridor = FREIGHT_CORRIDORS[corridorId] || FREIGHT_CORRIDORS.CORR_APEX;
    const points = corridor.points;

    // Handle DELAYED Trucks: Crawl slowly and auto-recover after delay duration
    if (truck.status === 'DELAYED') {
      truck.delayTicks = (truck.delayTicks || 0) + (1 * speedMultiplier);
      const maxTicks = truck.maxDelayTicks || 8;

      // Allow delayed truck to creep forward through congestion
      truck.segmentProgress += stepFactor * 0.3;
      if (truck.segmentProgress >= 1) {
        truck.segmentProgress = 0;
        truck.routeSegment = Math.min(points.length - 1, truck.routeSegment + 1);
      }

      const currentPt = points[Math.min(truck.routeSegment, points.length - 1)];
      const nextPt = points[Math.min(truck.routeSegment + 1, points.length - 1)];
      const coords = interpolate(currentPt, nextPt, truck.segmentProgress);

      truck.latitude = coords[0];
      truck.longitude = coords[1];
      truck.heading = calculateBearing(currentPt[0], currentPt[1], nextPt[0], nextPt[1]);
      truck.speedKmH = Math.round(12 + Math.sin(Date.now() / 1000) * 4); // Crawling speed
      truck.progress = Math.min(100, Math.round(((truck.routeSegment + truck.segmentProgress) / (points.length - 1)) * 100));

      // Auto-resolve delay after time window passes
      if (truck.delayTicks >= maxTicks) {
        truck.status = 'IN_TRANSIT';
        truck.delayMinutes = 0;
        truck.delayReason = null;
        truck.delayTicks = 0;
        addEvent(`🟢 Congestion cleared for Truck ${truck.truckId}. Resuming regular transit velocity.`, 'success');
      } else {
        truck.etaMinutes = Math.max(2, Math.round((1 - truck.progress / 100) * 20) + Math.round((maxTicks - truck.delayTicks) * 1.5));
        truck.eta = `Delayed (${truck.etaMinutes} min)`;
        continue;
      }
    }

    // Gate Holding & OCR clearance check
    if (truck.status === 'AT_GATE') {
      truck.routeSegment = corridor.gateIndex;
      truck.segmentProgress = 0;
      truck.progress = 50;
      truck.speedKmH = 0;
      truck.latitude = points[corridor.gateIndex][0];
      truck.longitude = points[corridor.gateIndex][1];
      const identityApproved = truck.gateVerification?.status === 'APPROVED';
      truck.eta = identityApproved ? 'READY TO PROCEED' : 'IDENTITY CHECK';
      truck.yardLocation = identityApproved
        ? 'Gate 1 · Dual Verification Approved · Awaiting Dock Entry'
        : 'Gate 1 · Awaiting License Plate & Driver ID Check';

      // If approved, automatically proceed into the yard after brief gate clearance
      if (identityApproved) {
        truck.gatePassedTicks = (truck.gatePassedTicks || 0) + (1 * speedMultiplier);
        if (truck.gatePassedTicks >= 4) {
          truck.status = 'IN_YARD';
          truck.yardLocation = 'Yard Staging Lane A-02';
          truck.routeSegment = corridor.gateIndex + 1;
          truck.gatePassedTicks = 0;
          addEvent(`Truck ${truck.truckId} cleared Gate 1 ANPR and entered the yard.`, 'success');
        }
      }
      continue;
    }

    // Advance segment progress along corridor
    truck.segmentProgress += stepFactor;

    if (truck.segmentProgress >= 1) {
      truck.segmentProgress = 0;
      truck.routeSegment = Math.min(points.length - 1, truck.routeSegment + 1);
    }

    const currentPt = points[Math.min(truck.routeSegment, points.length - 1)];
    const nextPt = points[Math.min(truck.routeSegment + 1, points.length - 1)];
    const coords = interpolate(currentPt, nextPt, truck.segmentProgress);

    truck.latitude = coords[0];
    truck.longitude = coords[1];
    truck.heading = calculateBearing(currentPt[0], currentPt[1], nextPt[0], nextPt[1]);

    // Compute dynamic speed and ETA
    const totalSegments = points.length - 1;
    const currentTotalIndex = truck.routeSegment + truck.segmentProgress;
    truck.progress = Math.min(100, Math.round((currentTotalIndex / totalSegments) * 100));

    if (truck.status === 'IN_TRANSIT') {
      truck.speedKmH = Math.round(44 + Math.sin(Date.now() / 1000) * 8);
    } else if (truck.status === 'IN_YARD') {
      truck.speedKmH = 15;
    } else {
      truck.speedKmH = 0;
    }

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
    truck.delayTicks = 0;
    truck.maxDelayTicks = Math.max(6, Math.round(delayMinutes / 2));
    truck.etaMinutes += delayMinutes;
    truck.eta = `Delayed (${truck.etaMinutes} min)`;

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

exports.registerTruck = (t, supplierParam = null) => {
  if (!t || !t.truckId) return null;
  const existing = stateCache.activeTrucks.find(item => item.truckId === t.truckId);
  if (existing) return existing;

  const rawSupplier = supplierParam?.name || t.supplierName;
  const rawCode = supplierParam?.code || t.vendorCode;
  const matchedVendor = resolveVendorForPoOrTruck(t.poNumber, rawSupplier, rawCode, t.truckId);

  const supplierName = matchedVendor.name;
  const vendorCode = matchedVendor.code;
  const contactEmail = matchedVendor.email;
  const performanceScore = `${matchedVendor.rating}★ (OTD: ${matchedVendor.otdScore}%)`;

  let corridorId = 'CORR_APEX';
  const code = String(vendorCode).toUpperCase();
  const normSup = String(supplierName).toLowerCase();

  if (code === 'SUP-1005' || normSup.includes('hrisi')) {
    corridorId = 'CORR_HRISI';
  } else if (code === 'SUP-1004' || normSup.includes('pradip') || normSup.includes('steel')) {
    corridorId = 'CORR_PRADIP';
  } else if (code === 'SUP-1003' || normSup.includes('akash')) {
    corridorId = 'CORR_AKASH';
  } else if (code === 'SUP-1002' || normSup.includes('yo-yo')) {
    corridorId = 'CORR_YOYO';
  } else if (code === 'SUP-DEMO' || normSup.includes('demo')) {
    corridorId = 'CORR_DEMO';
  } else {
    corridorId = 'CORR_APEX';
  }

  const corridor = FREIGHT_CORRIDORS[corridorId] || FREIGHT_CORRIDORS.CORR_APEX;
  const points = corridor.points;
  const originPos = points[0];

  const simTruck = {
    _id: t._id ? t._id.toString() : `${Date.now()}`,
    truckId: t.truckId,
    trailerId: t.trailerId || `TRL-${Math.floor(1000 + Math.random() * 9000)}`,
    poNumber: t.poNumber,
    shipmentId: t.shipmentId,
    supplierName,
    vendorCode,
    contactEmail,
    performanceScore,
    originFacility: matchedVendor.facility || corridor.facility,
    corridorId,
    driverName: t.driverName || 'CogniYard Express Driver',
    driverPhone: t.driverPhone || '+1-555-0199',
    licensePlate: t.licensePlate || '',
    driverIdSerial: t.driverIdSerial || '',
    gateVerification: t.gateVerification?.toObject ? t.gateVerification.toObject() : (t.gateVerification || { status: 'PENDING', plateMatched: false, driverMatched: false }),
    priority: t.priority || 'HIGH',
    loadType: t.loadType || 'DRY_VAN',
    latitude: t.latitude || originPos[0],
    longitude: t.longitude || originPos[1],
    heading: calculateBearing(points[0][0], points[0][1], points[1][0], points[1][1]),
    speedKmH: 48,
    status: t.status || 'IN_TRANSIT',
    progress: 5,
    routeSegment: 0,
    segmentProgress: 0,
    etaMinutes: 15,
    eta: formatEta(15, t.status),
    yardLocation: `In Transit from ${supplierName} (${vendorCode})`,
    assignedDock: t.assignedDock || null,
    unloadingProgress: 0,
    unloadingReady: false,
    delayMinutes: 0,
    delayReason: null
  };

  stateCache.activeTrucks.unshift(simTruck);
  const occupiedCount = stateCache.activeTrucks.filter(item => ['IN_YARD', 'AT_DOCK', 'UNLOADING'].includes(item.status)).length;
  stateCache.yardCapacity = { occupied: occupiedCount, max: 10 };

  addEvent(`✨ Inbound shipment ${t.truckId} departing from ${supplierName} (${vendorCode}) along ${corridor.name}.`, 'success');
  return simTruck;
};

exports.preemptDockInSimulation = (highPriorityTruckId, targetDockNumber, preemptedTruckId) => {
  const highTruck = stateCache.activeTrucks.find(t => t.truckId === highPriorityTruckId);
  const lowTruck = preemptedTruckId ? stateCache.activeTrucks.find(t => t.truckId === preemptedTruckId) : null;

  if (lowTruck) {
    lowTruck.assignedDock = null;
    lowTruck.status = 'WAITING_FOR_DOCK';
    lowTruck.yardLocation = 'Yard Holding Bay A-02 (Preempted)';
    lowTruck.preempted = true;
    addEvent(`⚠️ Dock Bay ${targetDockNumber} preempted: Truck ${lowTruck.truckId} relocated to Holding Bay A-02.`, 'warning');
  }

  if (highTruck) {
    highTruck.assignedDock = targetDockNumber;
    highTruck.status = 'UNLOADING';
    highTruck.yardLocation = `Dock Bay ${targetDockNumber} (Priority Preemption)`;
    highTruck.unloadingProgress = 25;
    const dockCoord = DOCK_COORDINATES[targetDockNumber] || YARD_ZONES.DOCK_HUB;
    highTruck.latitude = dockCoord[0];
    highTruck.longitude = dockCoord[1];
    addEvent(`⚡ High-Priority Shipment ${highTruck.truckId} assigned to Dock ${targetDockNumber} with expedited unloading active.`, 'success');
  }

  const occupiedCount = stateCache.activeTrucks.filter(t => ['IN_YARD', 'AT_DOCK', 'UNLOADING'].includes(t.status)).length;
  stateCache.yardCapacity = { occupied: occupiedCount, max: 10 };
  return exports.getState();
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
    corridors: FREIGHT_CORRIDORS,
    dockCoordinates: DOCK_COORDINATES,
    zones: YARD_ZONES
  };
};

// Initialize cache on startup
initializeCache();

