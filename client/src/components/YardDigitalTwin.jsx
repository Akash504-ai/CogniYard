import React, { useState, useEffect } from 'react';
import {
  Truck,
  Building2,
  Boxes,
  Zap,
  PackageCheck,
  LogOut,
  Camera,
  X,
  Gauge,
  Activity,
  Navigation
} from 'lucide-react';

export default function YardDigitalTwin({
  trucks = [],
  docks = [],
  simRunning = false,
  simSpeed = 1,
  yardCapacity = { occupied: 4, max: 10 },
  eventLogs = [],
  onSelectTruck,
  onSelectDock,
  onRecommendDock,
  onReceiveGoods,
  onReleaseDock
}) {
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [activeToast, setActiveToast] = useState(null);

  // Active non-completed trucks for display
  const activeTrucks = trucks.filter(t => t.status !== 'COMPLETED');
  const waitingTrucks = activeTrucks.filter(t => ['IN_TRANSIT', 'AT_GATE', 'IN_YARD', 'WAITING_FOR_DOCK'].includes(t.status));

  // Trigger floating milestone toasts on eventLog updates
  useEffect(() => {
    if (eventLogs && eventLogs.length > 0) {
      const latestLog = eventLogs[0];
      if (latestLog && latestLog.text) {
        setActiveToast(latestLog.text);
        const timer = setTimeout(() => setActiveToast(null), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [eventLogs]);

  // Heatmap zone risk calculations
  const gateCount = activeTrucks.filter(t => t.status === 'AT_GATE' || (t.progress >= 20 && t.progress <= 35)).length;
  const queueCount = activeTrucks.filter(t => t.status === 'IN_YARD' || t.status === 'WAITING_FOR_DOCK').length;
  const dockOccupiedCount = docks.filter(d => d.status === 'OCCUPIED').length;

  const getHeatmapLevel = (count, maxThreshold) => {
    const ratio = count / maxThreshold;
    if (ratio > 0.8) return { label: 'Critical', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900' };
    if (ratio > 0.5) return { label: 'High', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900' };
    if (ratio > 0.2) return { label: 'Moderate', bg: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700' };
    return { label: 'Low', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900' };
  };

  const gateHeatmap = getHeatmapLevel(gateCount, 4);
  const queueHeatmap = getHeatmapLevel(queueCount, 5);
  const dockHeatmap = getHeatmapLevel(dockOccupiedCount, docks.length || 4);

  // Helper to resolve Target Dock X % position
  const getDockTargetX = (dockNum) => {
    switch (dockNum) {
      case 'DOCK-01': return 16;
      case 'DOCK-02': return 38;
      case 'DOCK-03': return 61;
      case 'DOCK-04': return 84;
      default: return 38;
    }
  };

  // Helper: Calculate 2D schematic coordinates (X%, Y%) from progress & status
  const getTruckCoordinates = (truck, index = 0) => {
    if (truck.status === 'AT_DOCK' || truck.status === 'UNLOADING') {
      const targetX = getDockTargetX(truck.assignedDock);
      return { x: targetX, y: 70, stage: 'DOCKED' };
    }

    const prog = Math.min(100, Math.max(0, truck.progress || 0));

    // Phase 1: Inbound Highway (0% -> 25%)
    if (prog <= 25) {
      const factor = prog / 25;
      return { x: 5 + factor * 18, y: 15, stage: 'HIGHWAY' };
    }

    // Phase 2: Gate 1 Barrier Approach (25% -> 38%)
    if (prog <= 38) {
      const factor = (prog - 25) / 13;
      return { x: 23 + factor * 10, y: 15 + factor * 16, stage: 'GATE' };
    }

    // Phase 3: Yard Holding Queue Stalls (38% -> 65%)
    if (prog <= 65) {
      const factor = (prog - 38) / 27;
      const stallOffsetX = (index % 4) * 4;
      return { x: 33 + factor * 12 + stallOffsetX, y: 31 + factor * 16, stage: 'QUEUE' };
    }

    // Phase 4: Dock Approach Lane (65% -> 85%)
    if (prog <= 85) {
      const factor = (prog - 65) / 20;
      const targetX = getDockTargetX(truck.assignedDock);
      return { x: 45 + factor * (targetX - 45), y: 47 + factor * 23, stage: 'APPROACH' };
    }

    // Phase 5: Docked (85% -> 100%)
    const targetX = getDockTargetX(truck.assignedDock);
    return { x: targetX, y: 70, stage: 'DOCKED' };
  };

  const isGateActive = activeTrucks.some(t => t.status === 'AT_GATE' || (t.progress >= 24 && t.progress <= 36));

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
      <div className="flex flex-col gap-4 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <Building2 className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">Yard digital twin</h2>
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500" role="status" aria-live="polite">
                <span className={`h-2 w-2 rounded-full ${simRunning ? 'bg-emerald-500' : 'bg-zinc-400'}`} aria-hidden="true" />
                {simRunning ? `Running at ${simSpeed}x` : 'Paused'}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Top-down yard position, queue pressure, dock status and truck movement.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCameraModal(true)}
          className="inline-flex min-h-9 items-center gap-2 self-start rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 lg:self-auto"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          Camera feeds
        </button>
      </div>

      <dl className="grid grid-cols-1 gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <dt className="text-[11px] font-medium text-zinc-500">Gate zone</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">{gateCount} inbound</dd>
            </div>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${gateHeatmap.bg}`}>{gateHeatmap.label}</span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <dt className="text-[11px] font-medium text-zinc-500">Queue zone</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">{queueCount} waiting</dd>
            </div>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${queueHeatmap.bg}`}>{queueHeatmap.label}</span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <dt className="text-[11px] font-medium text-zinc-500">Dock bays</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">{dockOccupiedCount}/{docks.length || 0} occupied</dd>
            </div>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${dockHeatmap.bg}`}>{dockHeatmap.label}</span>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <dt className="text-[11px] font-medium text-zinc-500">Yard capacity</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">{yardCapacity.occupied}/{yardCapacity.max} slots</dd>
            </div>
            <Gauge className="h-4 w-4 text-zinc-400" aria-hidden="true" />
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden="true">
            <div className="h-full rounded-full bg-purple-600 transition-[width] duration-300" style={{ width: `${Math.min(100, (yardCapacity.occupied / Math.max(yardCapacity.max, 1)) * 100)}%` }} />
          </div>
        </div>
      </dl>

      {activeToast && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2.5 text-xs text-purple-800 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-300" role="status">
          <Activity className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{activeToast}</span>
        </div>
      )}

      <div className="overflow-x-auto p-4">
      {/* 2D SCHEMATIC VISUAL CONTROL CANVAS CONTAINER */}
      <div className="relative h-[660px] min-w-[920px] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        
        <div className="absolute inset-0 bg-zinc-950" />

        {/* 1. INBOUND HIGHWAY ROADWAY (TOP) */}
        <div className="absolute top-[5%] left-[2%] right-[2%] h-[14%] rounded-lg bg-zinc-950/90 border-2 border-dashed border-amber-500/30 flex items-center justify-between px-6 shadow-inner ">
          <div className="flex items-center gap-2.5 text-xs font-mono font-bold text-amber-400 tracking-wider">
            <Navigation className="w-4 h-4 rotate-90 text-amber-400" />
            <span>Inbound lane</span>
          </div>
          <div className="absolute inset-x-0 top-1/2 border-b-2 border-dashed border-amber-500/20 pointer-events-none" />
          <span className="text-[10px] font-mono text-zinc-500 font-semibold bg-zinc-900 px-2 py-1 rounded border border-zinc-800 z-10">Speed limit 25 km/h</span>
        </div>

        {/* 2. Gate 1 & BARRIER ARM */}
        <div className="absolute top-[25%] left-[26%] w-[180px] h-[90px] rounded-lg bg-zinc-950/95 border border-zinc-800/90 p-3 flex flex-col justify-between  z-10 ">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <strong className="text-amber-400 font-bold tracking-wider">Gate 1</strong>
            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${isGateActive ? 'bg-amber-950/80 text-amber-300 border-amber-800/80' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'}`}>
              {isGateActive ? 'Busy' : 'Ready'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
            <span className="text-[9px] font-mono text-zinc-400">Barrier arm</span>
            <div className={`h-1.5 w-20 rounded-full transition-all duration-500 origin-left  ${
              isGateActive ? '-rotate-45 bg-emerald-400 shadow-emerald-500/50' : 'rotate-0 bg-rose-500 shadow-rose-500/50'
            }`} />
          </div>
        </div>

        {/* 3. YARD HOLDING QUEUE STALLS (ZONE B) */}
        <div className="absolute top-[37%] left-[44%] right-[2%] h-[100px] rounded-lg bg-zinc-950/80 border border-zinc-800/80 p-3.5 flex flex-col justify-between shadow-inner ">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-purple-400 font-bold tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-purple-400" aria-hidden="true" />
              Holding queue · Bays 1–4
            </span>
            <span className="text-zinc-500">Priority queue</span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 pt-1">
            {[1, 2, 3, 4].map((stallNum) => (
              <div key={stallNum} className="h-11 rounded-xl bg-zinc-900/40 border border-dashed border-amber-500/25 flex items-center justify-center text-[9px] font-mono text-zinc-500 font-bold tracking-wider hover:border-amber-500/50 transition">
                Bay {stallNum}
              </div>
            ))}
          </div>
        </div>

        {/* 4. DOCK APPROACH & APRON LANES */}
        <div className="absolute bottom-[28%] inset-x-[2%] h-[10%] border-t-2 border-dashed border-zinc-800/80 flex items-center justify-around text-[10px] font-mono text-zinc-600 tracking-wider">
          <span>Lane 01</span>
          <span>Lane 02</span>
          <span>Lane 03</span>
          <span>Lane 04</span>
        </div>

        {/* 5. ROUTE PATH OVERLAY */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <path d="M 5% 12% L 26% 12% L 34% 29% L 48% 46% L 48% 68%" fill="none" stroke="#71717a" strokeWidth="2" strokeDasharray="6 6"  />
        </svg>

        {/* 6. TRUCK MARKERS */}
        {activeTrucks.map((truck, idx) => {
          const coords = getTruckCoordinates(truck, idx);
          const isDelayed = truck.status === 'DELAYED';
          const isDocked = truck.status === 'AT_DOCK' || truck.status === 'UNLOADING';

          return (
            <div
              key={truck._id || truck.truckId}
              onClick={() => onSelectTruck && onSelectTruck(truck)}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && onSelectTruck) {
                  event.preventDefault();
                  onSelectTruck(truck);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Open ${truck.truckId} details`}
              style={{
                left: `${coords.x}%`,
                top: `${coords.y}%`
              }}
              className="group absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-[left,top] duration-500"
            >
              <div className="relative flex items-center gap-3">
                {/* Truck Top-Down Vehicle Graphic */}
                <div className="relative w-14 h-7 flex items-center justify-center">
                  <img
                    src="/truck.png"
                    alt={`${truck.truckId} truck`}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>

                {/* Vehicle telemetry */}
                <div className={`flex items-center gap-2 rounded-md border px-2.5 py-2 ${
                  isDelayed
                    ? 'border-rose-700 bg-zinc-950 text-rose-100'
                    : isDocked
                    ? 'border-purple-700 bg-zinc-950 text-purple-100'
                    : 'border-zinc-700 bg-zinc-950 text-zinc-100'
                }`}>
                  <div className={`rounded p-1 ${isDelayed ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <div className="text-[10px] font-mono leading-tight">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-white font-bold">{truck.truckId}</strong>
                      <span className="text-[8px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 font-bold border border-zinc-700">
                        {truck.priority || 'HIGH'}
                      </span>
                    </div>
                    <div className="text-[9px] text-zinc-400 font-medium mt-0.5">
                      {truck.poNumber} • {truck.status} ({truck.progress || 0}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* 7. WAREHOUSE DOCK BAYS MATRIX (BOTTOM DOCK WALL) */}
        <div className="absolute bottom-[2%] inset-x-[2%] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 z-20">
          {docks.map((dock) => {
            const dockedTruck = activeTrucks.find(t => t.assignedDock === dock.dockNumber || t.truckId === dock.currentTruckId);
            const isOccupied = dock.status === 'OCCUPIED' || dockedTruck?.status === 'AT_DOCK' || dockedTruck?.status === 'UNLOADING';
            const isUnloading = dockedTruck?.status === 'UNLOADING' || dock.status === 'UNLOADING';
            const isMaintenance = dock.status === 'MAINTENANCE';

            return (
              <div
                key={dock._id || dock.dockNumber}
                onClick={() => onSelectDock && onSelectDock(dock)}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && onSelectDock) {
                    event.preventDefault();
                    onSelectDock(dock);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open ${dock.dockNumber} details`}
                className={`relative flex cursor-pointer flex-col justify-between space-y-2 rounded-lg border bg-zinc-950 p-3 transition-colors ${
                  isMaintenance
                    ? 'border-rose-500/30 bg-zinc-950/80'
                    : dock.status === 'AVAILABLE'
                    ? 'border-emerald-500/30 hover:border-emerald-400/60'
                    : isUnloading
                    ? 'border-purple-500/40 hover:border-purple-400/60'
                    : isOccupied
                    ? 'border-purple-500/40 hover:border-purple-400/60'
                    : 'border-zinc-800'
                }`}
              >
                {/* Dock Header */}
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold px-2 py-0.5 rounded-lg bg-zinc-900 text-zinc-100 border border-zinc-800">
                    {dock.dockNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                    isMaintenance ? 'bg-rose-950/80 text-rose-400 border-rose-800/80' :
                    dock.status === 'AVAILABLE' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80' :
                    isUnloading ? 'bg-purple-950/80 text-purple-400 border-purple-800/80' :
                    isOccupied ? 'bg-purple-950/80 text-purple-400 border-purple-800/80' :
                    'bg-zinc-900 text-zinc-400 border-zinc-700'
                  }`}>
                    {dock.status}
                  </span>
                </div>

                {/* Pneumatic Door Visualizer */}
                <div className="relative h-12 w-full rounded-xl bg-zinc-900/80 border border-zinc-800 p-2 flex items-center justify-between overflow-hidden text-[10px] font-mono shadow-inner">
                  <span className="text-zinc-400 font-medium">Dock door</span>
                  <strong className={isMaintenance ? 'text-rose-400' : isOccupied ? 'text-rose-400' : 'text-emerald-400'}>
                    {isMaintenance ? 'Locked' : isOccupied ? 'Sealed' : 'Open'}
                  </strong>

                  {/* Unloading Package Stream Animation */}
                  {isUnloading && (
                    <div className="absolute inset-0 bg-purple-950/95 border border-purple-800/80 flex items-center justify-center gap-1.5 text-purple-200 font-bold  z-10 ">
                      <Boxes className="w-4 h-4 text-purple-400" aria-hidden="true" />
                      <span className="text-[10px] tracking-wider">Unloading</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-0.5">
                  {isMaintenance ? (
                    <button disabled className="min-h-8 w-full rounded-md border border-rose-950 bg-zinc-900 px-2 text-[10px] font-medium text-rose-400/80">
                      Maintenance
                    </button>
                  ) : isOccupied ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onReceiveGoods && dockedTruck) {
                            onReceiveGoods(dockedTruck.poNumber);
                          }
                        }}
                        className="flex min-h-8 w-full items-center justify-center gap-1 rounded-md bg-purple-600 px-2 text-[10px] font-medium text-white hover:bg-purple-700"
                      >
                        <PackageCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Receive goods</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onReleaseDock) onReleaseDock(dock.dockNumber);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        title="Release dock"
                        aria-label={`Release ${dock.dockNumber}`}
                      >
                        <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onRecommendDock && activeTrucks.length > 0) {
                          onRecommendDock(activeTrucks[0]);
                        }
                      }}
                      className="flex min-h-8 w-full items-center justify-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-[10px] font-medium text-zinc-300 hover:bg-zinc-800"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                      <span>Recommend dock</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
      </div>

      {showCameraModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="yard-camera-title"
        >
          <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <h3 id="yard-camera-title" className="text-base font-semibold text-zinc-950 dark:text-zinc-100">Camera feeds</h3>
                <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">Gate and dock cameras used for operational verification.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCameraModal(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Close camera feeds"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              {[
                { id: 'CAM-01', name: 'Gate entry', purpose: 'Number plate verification' },
                { id: 'CAM-02', name: 'Dock hub', purpose: 'Dock door monitoring' }
              ].map((camera) => (
                <section key={camera.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{camera.name}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{camera.id} · 1080p · 30 fps</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                      Online
                    </span>
                  </div>
                  <div className="mt-4 flex h-28 items-center justify-center rounded-md border border-dashed border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="text-center">
                      <Camera className="mx-auto h-5 w-5 text-zinc-400" aria-hidden="true" />
                      <p className="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">{camera.purpose}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">Live feed ready</p>
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <div className="flex justify-end border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowCameraModal(false)}
                className="min-h-9 rounded-md bg-purple-600 px-4 text-xs font-medium text-white hover:bg-purple-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}