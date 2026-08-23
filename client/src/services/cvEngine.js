// Client-Side Pixel Computer Vision Engine & IoU Object Tracker

let cocoModel = null;
let isModelLoading = false;
let trackHistory = new Map(); // Store persistent IoU object tracking states
let nextTrackNumber = 1;

// Initialize TensorFlow.js COCO-SSD model
export const loadCVModel = async () => {
  if (cocoModel) return cocoModel;
  if (isModelLoading) return null;

  isModelLoading = true;
  try {
    if (window.cocoSsd) {
      console.log('⚡ Loading TensorFlow.js COCO-SSD Object Detection Model...');
      cocoModel = await window.cocoSsd.load();
      console.log('✅ COCO-SSD Computer Vision Model loaded successfully!');
    } else {
      console.warn('⚠️ window.cocoSsd CDN not found. Real CV model pending initialization.');
    }
  } catch (err) {
    console.error('❌ Error loading COCO-SSD model:', err.message);
  } finally {
    isModelLoading = false;
  }
  return cocoModel;
};

// Calculate Intersection over Union (IoU) between two bounding boxes
const calculateIoU = (boxA, boxB) => {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const boxAArea = boxA.width * boxA.height;
  const boxBArea = boxB.width * boxB.height;

  const iou = interArea / (boxAArea + boxBArea - interArea);
  return isNaN(iou) ? 0 : iou;
};

// Perform Real-Time Object Detection on HTML5 Video or Canvas Element
export const detectObjectsInVideo = async (videoOrCanvasElement) => {
  if (!videoOrCanvasElement) return [];

  let rawDetections = [];

  // Execute genuine TensorFlow.js COCO-SSD model inference on video frame pixels
  if (cocoModel && videoOrCanvasElement.readyState >= 2) {
    try {
      const predictions = await cocoModel.detect(videoOrCanvasElement);
      const vehicleClasses = ['truck', 'car', 'bus', 'motorcycle', 'person'];

      rawDetections = predictions
        .filter(p => vehicleClasses.includes(p.class.toLowerCase()) && p.score > 0.45)
        .map(p => {
          const [x, y, w, h] = p.bbox;
          return {
            objectType: p.class.toLowerCase(),
            confidence: Math.round(p.score * 100) / 100,
            boundingBox: { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) },
            centroid: { x: Math.round(x + w / 2), y: Math.round(y + h / 2) },
            source: 'REAL_CV'
          };
        });
    } catch (err) {
      console.warn('COCO-SSD inference error:', err.message);
    }
  }

  // If no model or 0 predictions, return empty array without fake fallback bounding boxes
  if (rawDetections.length === 0) {
    return [];
  }

  // Perform IoU Object Tracking to maintain persistent Tracking IDs (e.g., T-01, T-02)
  const trackedDetections = [];
  const updatedTrackHistory = new Map();

  for (const det of rawDetections) {
    let bestMatchId = null;
    let maxIoU = 0.25; // Minimum IoU threshold for object match

    // Compare with existing tracked objects
    for (const [trackId, prevDet] of trackHistory.entries()) {
      const iou = calculateIoU(det.boundingBox, prevDet.boundingBox);
      if (iou > maxIoU) {
        maxIoU = iou;
        bestMatchId = trackId;
      }
    }

    if (!bestMatchId) {
      const prefix = det.objectType === 'person' ? 'P' : 'T';
      bestMatchId = `${prefix}-${String(nextTrackNumber++).padStart(2, '0')}`;
    }

    const trackedObj = {
      ...det,
      trackId: bestMatchId,
      lastSeen: Date.now()
    };

    trackedDetections.push(trackedObj);
    updatedTrackHistory.set(bestMatchId, trackedObj);
  }

  trackHistory = updatedTrackHistory;
  return trackedDetections;
};

// Check if tracked vehicle centroid crosses virtual gate line (e.g., Y = 45% of video height)
export const checkVirtualGateCrossing = (trackedObjects, gateLineY = 150) => {
  const events = [];

  for (const obj of trackedObjects) {
    if (obj.objectType === 'truck' || obj.objectType === 'car' || obj.objectType === 'bus') {
      const prevPos = trackHistory.get(obj.trackId);
      if (prevPos && prevPos.centroid) {
        const prevY = prevPos.centroid.y;
        const currY = obj.centroid.y;

        // Inbound crossing: Top -> Bottom across Gate Line
        if (prevY < gateLineY && currY >= gateLineY) {
          events.push({
            type: 'TRUCK_GATE_ENTRY',
            trackId: obj.trackId,
            objectType: obj.objectType,
            confidence: obj.confidence,
            direction: 'INBOUND',
            source: 'REAL_CV',
            timestamp: new Date()
          });
        }
      }
    }
  }

  return events;
};

// License Plate Identification & Demo Mapping Helper (Explicitly Labeled as Demo Association)
export const matchTruckIdentity = (trackId, truckList = []) => {
  if (!truckList || truckList.length === 0) {
    return {
      identified: false,
      truckId: 'UNKNOWN_VEHICLE',
      poNumber: 'N/A',
      associationType: 'DEMO_VEHICLE_ASSOCIATION',
      confidence: 0,
      status: 'UNMATCHED'
    };
  }

  // Match with first active truck in transit or at gate
  const activeTruck = truckList.find(t => t.status === 'IN_TRANSIT' || t.status === 'AT_GATE') || truckList[0];
  const cleanId = activeTruck.truckId.replace('TRK-', '');

  return {
    identified: true,
    truckId: activeTruck.truckId,
    poNumber: activeTruck.poNumber,
    licensePlate: `DEMO-${cleanId}`,
    associationType: 'DEMO_VEHICLE_ASSOCIATION',
    status: 'MATCHED'
  };
};
