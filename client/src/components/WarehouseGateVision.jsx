import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  IdCard,
  LoaderCircle,
  ScanLine,
  ShieldAlert,
  SquareParking,
  StopCircle,
  Truck,
  Video
} from 'lucide-react';
import { logisticsAPI } from '../services/api';
import { detectObjectsInVideo, loadCVModel } from '../services/cvEngine';
import { recognizeTextFromVideo } from '../services/ocrEngine';
import { useAuth } from '../context/AuthContext';

const progressedStatuses = new Set(['IN_YARD', 'WAITING_FOR_DOCK', 'AT_DOCK', 'UNLOADING', 'COMPLETED']);

function identityFor(truck) {
  const suffix = String(truck?.truckId || '0000').replace(/\D/g, '').slice(-6) || '0000';
  return {
    plate: truck?.licensePlate || `CY-${suffix}`,
    driverId: truck?.driverIdSerial || `DRV-${suffix}`
  };
}

export function truckHasPassedGate(truck) {
  return truck?.gateVerification?.status === 'APPROVED' || truck?.status === 'COMPLETED';
}

export default function WarehouseGateVision({ trucks = [], docks = [], onUpdated }) {
  const { showNotification } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [detections, setDetections] = useState([]);
  const [verification, setVerification] = useState(null);
  const [scanStage, setScanStage] = useState('PLATE');
  const [busyStage, setBusyStage] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [lastCapture, setLastCapture] = useState(null);

  const activeTrucks = useMemo(
    () => trucks.filter(truck => truck.status !== 'COMPLETED'),
    [trucks]
  );
  const dockCameras = useMemo(() => {
    const knownDocks = docks.length
      ? docks
      : ['DOCK-01', 'DOCK-02', 'DOCK-03', 'DOCK-04'].map(dockNumber => ({ dockNumber }));
    const count = Math.max(4, knownDocks.length);
    return Array.from({ length: count }, (_, index) => ({
      cameraNumber: index + 1,
      dockNumber: knownDocks[index]?.dockNumber || `DOCK-${String(index + 1).padStart(2, '0')}`,
      isPrimary: index === 0
    }));
  }, [docks]);
  const selectedTruck = activeTrucks.find(truck => truck.truckId === selectedTruckId) || activeTrucks[0] || null;
  const expected = identityFor(selectedTruck);
  const gate = verification || selectedTruck?.gateVerification || {};
  const platePassed = Boolean(gate.plateMatched);
  const driverPassed = Boolean(gate.driverMatched && gate.status === 'APPROVED');
  const mayProceed = driverPassed || truckHasPassedGate(selectedTruck);

  useEffect(() => {
    if (!selectedTruckId && activeTrucks[0]) setSelectedTruckId(activeTrucks[0].truckId);
    if (selectedTruckId && !activeTrucks.some(truck => truck.truckId === selectedTruckId)) {
      setSelectedTruckId(activeTrucks[0]?.truckId || '');
    }
  }, [activeTrucks, selectedTruckId]);

  useEffect(() => {
    setVerification(selectedTruck?.gateVerification || null);
    setLastCapture(null);
    setScanStage(selectedTruck?.gateVerification?.plateMatched ? 'DRIVER_ID' : 'PLATE');
  }, [selectedTruckId]);

  useEffect(() => {
    let mounted = true;

    loadCVModel()
      .then(model => {
        console.log('CV MODEL RESULT:', model);
        if (mounted) setModelReady(Boolean(model));
      })
      .catch(error => {
        console.error('CV MODEL LOAD FAILED:', error);
        if (mounted) setModelReady(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setDetections([]);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (!cameraActive) return undefined;
    let running = true;
    let timer;
    const detect = async () => {
      if (!running) return;
      const objects = await detectObjectsInVideo(videoRef.current);
      if (running) setDetections(objects);
      timer = window.setTimeout(detect, 650);
    };
    detect();
    return () => {
      running = false;
      window.clearTimeout(timer);
    };
  }, [cameraActive]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showNotification('This browser cannot open a live camera. Use current Chrome or Edge on localhost/HTTPS.', 'error');
      return;
    }
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (constraintErr) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
      showNotification('Live gate camera started. Object detection is running continuously.', 'success');
    } catch (error) {
      showNotification('Camera permission was denied. Please allow camera access in your browser address bar and try again.', 'error');
    }
  };

  const scan = async stage => {
    if (!selectedTruck) return showNotification('Choose a truck first.', 'error');
    if (!cameraActive) return showNotification('Start the live camera first.', 'error');
    try {
      setBusyStage(stage);
      setScanStage(stage);
      setOcrProgress(0);
      const capture = await recognizeTextFromVideo(
        videoRef.current,
        {
          stage,
          onProgress: setOcrProgress,
          expectedText: stage === 'PLATE' ? expected.plate : expected.driverId
        }
      );
      setLastCapture({ ...capture, stage });
      if (!capture.text) throw new Error('No readable text was captured. Move closer, improve lighting and scan again.');
      const response = await logisticsAPI.verifyGateIdentity(selectedTruck.truckId, {
        stage,
        capturedText: capture.text,
        confidence: capture.confidence,
        detectedObjects: [...new Set(detections.map(object => object.objectType))]
      });
      setVerification(response.data.truck.gateVerification);
      if (response.data.matched && stage === 'PLATE') setScanStage('DRIVER_ID');
      showNotification(response.data.message, response.data.matched ? 'success' : 'error');
      await onUpdated?.();
    } catch (error) {
      showNotification(error.response?.data?.message || error.message || 'Live OCR scan failed.', 'error');
    } finally {
      setBusyStage('');
      setOcrProgress(0);
    }
  };

  const proceed = async () => {
    if (!selectedTruck) return;
    try {
      setBusyStage('PROCEED');
      const response = await logisticsAPI.proceedThroughGate(selectedTruck.truckId);
      showNotification(response.data.message, 'success');
      await onUpdated?.();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Gate entry could not be approved.', 'error');
    } finally {
      setBusyStage('');
    }
  };

  return (
    <section className="gate-vision rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <ScanLine className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">Automatic truck and driver verification</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Verify the number plate first, then the driver ID. A truck can enter the yard only after both checks pass.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-zinc-500" role="status" aria-live="polite">
          <span className={`h-2 w-2 rounded-full ${cameraActive ? 'bg-emerald-500' : 'bg-zinc-400'}`} aria-hidden="true" />
          {cameraActive ? 'Camera active' : 'Camera off'}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-lg border border-zinc-300 bg-zinc-950 dark:border-zinc-700">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
                <Video className="h-9 w-9" aria-hidden="true" />
                <strong className="text-sm font-medium text-white">Camera is off</strong>
                <small className="text-xs">Start the camera to verify an arriving truck.</small>
              </div>
            )}
            {cameraActive && (
              <div
                className={`gate-ocr-guide ${scanStage === 'DRIVER_ID'
                  ? 'is-driver'
                  : 'is-plate'
                  }`}
              >
                <div className="gate-ocr-guide-frame">
                  <span className="gate-ocr-guide-label">
                    {scanStage === 'DRIVER_ID'
                      ? 'PLACE DRIVER ID SERIAL INSIDE THIS BOX'
                      : 'PLACE NUMBER PLATE INSIDE THIS BOX'}
                  </span>
                </div>
              </div>
            )}
            {cameraActive && detections.map(object => {
              const width = videoRef.current?.videoWidth || 1;
              const height = videoRef.current?.videoHeight || 1;
              const box = object.boundingBox;
              return (
                <div
                  key={object.trackId}
                  className="pointer-events-none absolute rounded border-2 border-emerald-400"
                  style={{ left: `${box.x / width * 100}%`, top: `${box.y / height * 100}%`, width: `${box.width / width * 100}%`, height: `${box.height / height * 100}%` }}
                >
                  <span className="absolute -top-5 left-0 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    {object.objectType} {Math.round(object.confidence * 100)}%
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-700"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                Start camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <StopCircle className="h-4 w-4" aria-hidden="true" />
                Stop camera
              </button>
            )}
            <span className="text-xs text-zinc-500">
              Object detector: {modelReady ? `${detections.length} object${detections.length === 1 ? '' : 's'} detected` : 'loading'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Truck arriving at gate</span>
            <select
              value={selectedTruck?.truckId || ''}
              onChange={event => setSelectedTruckId(event.target.value)}
              className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              disabled={activeTrucks.length === 0}
            >
              {activeTrucks.map(truck => <option key={truck.truckId} value={truck.truckId}>{truck.truckId} · PO {truck.poNumber}</option>)}
            </select>
          </label>

          {selectedTruck ? (
            <>
              <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="flex items-center gap-2 text-xs text-zinc-500"><SquareParking className="h-4 w-4" aria-hidden="true" /> Expected plate</dt>
                  <dd className="font-mono text-xs font-semibold text-zinc-950 dark:text-zinc-100">{expected.plate}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <dt className="flex items-center gap-2 text-xs text-zinc-500"><IdCard className="h-4 w-4" aria-hidden="true" /> Expected driver ID</dt>
                  <dd className="font-mono text-xs font-semibold text-zinc-950 dark:text-zinc-100">{expected.driverId}</dd>
                </div>
              </dl>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={!cameraActive || Boolean(busyStage)}
                  onClick={() => scan('PLATE')}
                  className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium disabled:opacity-45 ${platePassed ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-purple-600 bg-purple-600 text-white hover:bg-purple-700'}`}
                >
                  {busyStage === 'PLATE' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : platePassed ? <CheckCircle2 className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />}
                  {platePassed ? '1. Number plate matched' : busyStage === 'PLATE' ? `Reading plate… ${ocrProgress}%` : '1. Scan number plate'}
                </button>
                <button
                  type="button"
                  disabled={!cameraActive || !platePassed || Boolean(busyStage)}
                  onClick={() => scan('DRIVER_ID')}
                  className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium disabled:opacity-45 ${driverPassed ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900'}`}
                >
                  {busyStage === 'DRIVER_ID' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : driverPassed ? <BadgeCheck className="h-4 w-4" /> : <IdCard className="h-4 w-4" />}
                  {driverPassed ? '2. Driver ID matched' : busyStage === 'DRIVER_ID' ? `Reading ID… ${ocrProgress}%` : '2. Verify driver ID'}
                </button>
                <button
                  type="button"
                  disabled={!mayProceed || Boolean(busyStage) || progressedStatuses.has(selectedTruck.status)}
                  onClick={proceed}
                  className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                >
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  {progressedStatuses.has(selectedTruck.status) ? `Proceeded · ${selectedTruck.status}` : busyStage === 'PROCEED' ? 'Opening gate…' : '3. Approve yard entry'}
                </button>
              </div>

              {lastCapture && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                  <strong className="font-medium text-zinc-800 dark:text-zinc-200">OCR capture</strong>
                  <span className="mt-1 block break-words font-mono text-zinc-900 dark:text-zinc-100">{lastCapture.text || 'No readable text'}</span>
                  <small className="mt-1 block text-zinc-500">Confidence: {lastCapture.confidence}%</small>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              No active truck requires gate verification.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Dock camera network</h3>
          <p className="mt-1 text-xs text-zinc-500">Camera 1 uses the browser camera for this demonstration. Additional dock feeds remain clearly marked as unavailable.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {dockCameras.map(camera => (
            <article key={camera.dockNumber} className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-zinc-950 text-zinc-500">
                <Video className={`h-7 w-7 ${camera.isPrimary && cameraActive ? 'text-emerald-400' : 'text-zinc-500'}`} aria-hidden="true" />
                <span className="text-[10px] font-medium text-zinc-400">
                  {camera.isPrimary ? (cameraActive ? 'Primary feed live' : 'Primary feed ready') : 'Camera not connected'}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 text-[11px]">
                <strong className="font-medium text-zinc-800 dark:text-zinc-200">CAM-{String(camera.cameraNumber).padStart(2, '0')}</strong>
                <span className="font-mono text-zinc-500">{camera.dockNumber}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
