import React, { useState, useEffect } from 'react';
import {
  Truck,
  Building2,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  PackageCheck,
  LogOut,
  Camera,
  Layers,
  Radio,
  User,
  ShieldCheck,
  ChevronRight,
  X,
  Gauge,
  Activity,
  ArrowDown,
  Navigation,
  Sparkles,
  ShieldAlert,
  ArrowRight
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
    if (ratio > 0.8) return { label: 'CRITICAL', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-rose-500/10' };
    if (ratio > 0.5) return { label: 'HIGH', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10' };
    if (ratio > 0.2) return { label: 'MODERATE', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-indigo-500/10' };
    return { label: 'LOW', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10' };
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
    <div className="relative w-full rounded-3xl overflow-hidden border border-zinc-800/80 bg-zinc-950 text-zinc-100 p-6 space-y-6 shadow-2xl backdrop-blur-3xl font-sans">
      
      {/* DIGITAL TWIN HEADER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-extrabold text-white tracking-tight font-mono">
                CogniYard Digital Twin
              </h2>
              <span className="text-xs font-mono text-zinc-500 hidden sm:inline">|</span>
              <span className="text-xs font-mono text-zinc-400 font-semibold uppercase tracking-wider">Fleet Simulation Console</span>
              
              <span className={`inline-flex items-center gap-1.5 text-[10px] px-3 py-1 rounded-full font-mono font-bold tracking-wider border shadow-sm ${
                simRunning
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-emerald-500/10'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700/80'
              }`}>
                <span className={`w-2 h-2 rounded-full ${simRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                {simRunning ? `SIMULATION ACTIVE (${simSpeed}x)` : 'PAUSED'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-1">
              Real-time telemetry, top-down 2D yard schematic, automated gate barriers & pneumatic bay tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCameraModal(true)}
            className="flex items-center gap-2 text-xs font-bold font-mono px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 transition-all duration-200 shadow-md hover:shadow-indigo-500/10 cursor-pointer active:scale-95"
          >
            <Camera className="w-4 h-4 text-indigo-400" />
            <span>CCTV FEEDS (PHASE 4)</span>
          </button>
        </div>
      </div>

      {/* CONGESTION HEATMAP & TELEMETRY ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Gate Zone Risk */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-md hover:border-zinc-700 transition">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">Gate Zone Risk</span>
            <span className="text-sm font-bold text-zinc-100 font-mono block">{gateCount} Vehicles Inbound</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border shadow-sm ${gateHeatmap.bg}`}>
            {gateHeatmap.label}
          </span>
        </div>

        {/* Queue Zone Risk */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-md hover:border-zinc-700 transition">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">Queue Zone Risk</span>
            <span className="text-sm font-bold text-zinc-100 font-mono block">{queueCount} Vehicles Waiting</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border shadow-sm ${queueHeatmap.bg}`}>
            {queueHeatmap.label}
          </span>
        </div>

        {/* Dock Bays Risk */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-md hover:border-zinc-700 transition">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">Dock Bays Risk</span>
            <span className="text-sm font-bold text-zinc-100 font-mono block">{dockOccupiedCount} / {docks.length} Occupied</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border shadow-sm ${dockHeatmap.bg}`}>
            {dockHeatmap.label}
          </span>
        </div>

        {/* Yard Capacity */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-md hover:border-zinc-700 transition">
          <div className="space-y-1 w-full mr-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">Yard Slot Capacity</span>
              <span className="text-[11px] font-bold text-indigo-400 font-mono">
                {Math.round((yardCapacity.occupied / yardCapacity.max) * 100)}%
              </span>
            </div>
            <span className="text-sm font-bold text-zinc-100 font-mono block">{yardCapacity.occupied} / {yardCapacity.max} Slots</span>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500" 
                style={{ width: `${(yardCapacity.occupied / yardCapacity.max) * 100}%` }}
              />
            </div>
          </div>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FLOATING REAL-TIME MILESTONE EVENT TOAST */}
      {activeToast && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/90 border border-indigo-500/40 text-indigo-200 text-xs font-mono font-medium flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-lg">
          <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sparkles className="w-4 h-4 animate-spin" />
          </div>
          <span>{activeToast}</span>
        </div>
      )}

      {/* 2D SCHEMATIC VISUAL CONTROL CANVAS CONTAINER */}
      <div className="relative w-full h-[660px] rounded-3xl bg-[#090a0f] border border-zinc-800/90 overflow-hidden shadow-2xl">
        
        {/* Dark Tactical Asphalt Surface Background */}
        <div className="absolute inset-0 bg-[#0c0d12] bg-[radial-gradient(#1f222e_1px,transparent_1px)] [background-size:20px_20px] opacity-70" />

        {/* 1. INBOUND HIGHWAY ROADWAY (TOP) */}
        <div className="absolute top-[5%] left-[2%] right-[2%] h-[14%] rounded-2xl bg-zinc-950/90 border-2 border-dashed border-amber-500/30 flex items-center justify-between px-6 shadow-inner backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-xs font-mono font-bold text-amber-400 tracking-wider">
            <Navigation className="w-4 h-4 rotate-90 text-amber-400" />
            <span>INBOUND HIGHWAY ROADWAY (LANE 1)</span>
          </div>
          <div className="absolute inset-x-0 top-1/2 border-b-2 border-dashed border-amber-500/20 pointer-events-none" />
          <span className="text-[10px] font-mono text-zinc-500 font-semibold bg-zinc-900 px-2 py-1 rounded border border-zinc-800 z-10">SPEED LIMIT: 25 KM/H</span>
        </div>

        {/* 2. GATE 1 CHECKPOINT & BARRIER ARM */}
        <div className="absolute top-[25%] left-[26%] w-[180px] h-[90px] rounded-2xl bg-zinc-950/95 border border-zinc-800/90 p-3 flex flex-col justify-between shadow-2xl z-10 backdrop-blur-md">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <strong className="text-amber-400 font-bold tracking-wider">GATE 1 CHECKPOINT</strong>
            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${isGateActive ? 'bg-amber-950/80 text-amber-300 border-amber-800/80' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'}`}>
              {isGateActive ? 'BUSY' : 'READY'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
            <span className="text-[9px] font-mono text-zinc-400">Barrier Arm:</span>
            <div className={`h-1.5 w-20 rounded-full transition-all duration-500 origin-left shadow-lg ${
              isGateActive ? '-rotate-45 bg-emerald-400 shadow-emerald-500/50' : 'rotate-0 bg-rose-500 shadow-rose-500/50'
            }`} />
          </div>
        </div>

        {/* 3. YARD HOLDING QUEUE STALLS (ZONE B) */}
        <div className="absolute top-[37%] left-[44%] right-[2%] h-[100px] rounded-2xl bg-zinc-950/80 border border-zinc-800/80 p-3.5 flex flex-col justify-between shadow-inner backdrop-blur-md">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-indigo-400 font-bold tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-400" />
              YARD HOLDING QUEUE STALLS (PARKING BAY 1–4)
            </span>
            <span className="text-zinc-500">PRIORITY QUEUEING BUFFER</span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 pt-1">
            {[1, 2, 3, 4].map((stallNum) => (
              <div key={stallNum} className="h-11 rounded-xl bg-zinc-900/40 border border-dashed border-amber-500/25 flex items-center justify-center text-[9px] font-mono text-zinc-500 font-bold tracking-wider hover:border-amber-500/50 transition">
                STALL {stallNum}
              </div>
            ))}
          </div>
        </div>

        {/* 4. DOCK APPROACH & APRON LANES */}
        <div className="absolute bottom-[28%] inset-x-[2%] h-[10%] border-t-2 border-dashed border-zinc-800/80 flex items-center justify-around text-[10px] font-mono text-zinc-600 tracking-wider">
          <span>LANE 01</span>
          <span>LANE 02</span>
          <span>LANE 03</span>
          <span>LANE 04</span>
        </div>

        {/* 5. SVG ANIMATED NEON ROUTE PATH OVERLAYS */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="neonPathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <path d="M 5% 12% L 26% 12% L 34% 29% L 48% 46% L 48% 68%" fill="none" stroke="url(#neonPathGrad)" strokeWidth="2" strokeDasharray="6 6" className="animate-pulse" />
        </svg>

        {/* 6. DYNAMICALLY ANIMATED TRUCK MARKERS WITH REAL TRUCK GRAPHIC */}
        {activeTrucks.map((truck, idx) => {
          const coords = getTruckCoordinates(truck, idx);
          const isDelayed = truck.status === 'DELAYED';
          const isDocked = truck.status === 'AT_DOCK' || truck.status === 'UNLOADING';

          return (
            <div
              key={truck._id || truck.truckId}
              onClick={() => onSelectTruck && onSelectTruck(truck)}
              style={{
                left: `${coords.x}%`,
                top: `${coords.y}%`
              }}
              className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out cursor-pointer group"
            >
              {/* Headlight Cone Glow */}
              <div className="absolute top-1/2 -right-10 -translate-y-1/2 w-12 h-6 bg-amber-400/15 filter blur-sm rounded-r-full pointer-events-none opacity-80" />

              <div className="relative flex items-center gap-3">
                {/* Truck Top-Down Vehicle Graphic */}
                <div className="relative w-14 h-7 flex items-center justify-center">
                  <img
                    src="/truck.png"
                    alt="Semi Truck"
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] group-hover:scale-110 transition-transform"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>

                {/* Glassmorphic Vehicle Telemetry Badge */}
                <div className={`p-2.5 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-2.5 transition-all duration-200 group-hover:scale-105 ${
                  isDelayed
                    ? 'bg-rose-950/90 border-rose-500/80 text-rose-100 shadow-rose-950/50'
                    : isDocked
                    ? 'bg-indigo-950/90 border-indigo-500/80 text-indigo-100 shadow-indigo-950/50'
                    : 'bg-zinc-950/90 border-emerald-500/80 text-emerald-100 shadow-emerald-950/50'
                }`}>
                  <div className={`p-1.5 rounded-xl ${isDelayed ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    <Truck className="w-3.5 h-3.5" />
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
                className={`relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer bg-zinc-950/90 backdrop-blur-md flex flex-col justify-between space-y-2 shadow-xl ${
                  isMaintenance
                    ? 'border-rose-500/30 bg-zinc-950/80'
                    : dock.status === 'AVAILABLE'
                    ? 'border-emerald-500/30 hover:border-emerald-400/60'
                    : isUnloading
                    ? 'border-purple-500/40 hover:border-purple-400/60'
                    : isOccupied
                    ? 'border-indigo-500/40 hover:border-indigo-400/60'
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
                    isOccupied ? 'bg-indigo-950/80 text-indigo-400 border-indigo-800/80' :
                    'bg-zinc-900 text-zinc-400 border-zinc-700'
                  }`}>
                    {dock.status}
                  </span>
                </div>

                {/* Pneumatic Door Visualizer */}
                <div className="relative h-12 w-full rounded-xl bg-zinc-900/80 border border-zinc-800 p-2 flex items-center justify-between overflow-hidden text-[10px] font-mono shadow-inner">
                  <span className="text-zinc-400 font-medium">Pneumatic Door:</span>
                  <strong className={isMaintenance ? 'text-rose-400' : isOccupied ? 'text-rose-400' : 'text-emerald-400'}>
                    {isMaintenance ? 'LOCKED' : isOccupied ? 'SEALED' : 'OPEN'}
                  </strong>

                  {/* Unloading Package Stream Animation */}
                  {isUnloading && (
                    <div className="absolute inset-0 bg-purple-950/95 border border-purple-800/80 flex items-center justify-center gap-1.5 text-purple-200 font-bold animate-pulse z-10 shadow-lg">
                      <Boxes className="w-4 h-4 text-purple-400" />
                      <span className="text-[10px] tracking-wider">UNLOADING CARGO...</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-0.5">
                  {isMaintenance ? (
                    <button disabled className="w-full py-1.5 rounded-xl bg-zinc-900/80 text-rose-400/80 text-[10px] border border-rose-950 font-mono font-semibold cursor-not-allowed">
                      MAINTENANCE LOCKED
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
                        className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] font-mono transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-md shadow-indigo-600/20"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Receive Goods</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onReleaseDock) onReleaseDock(dock.dockNumber);
                        }}
                        className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer active:scale-95"
                        title="Release Dock Bay"
                      >
                        <LogOut className="w-3.5 h-3.5" />
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
                      className="w-full py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-[10px] font-mono border border-zinc-800 transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Recommend Dock</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* CCTV CAMERA FEEDS MODAL */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl p-6 rounded-3xl shadow-2xl space-y-5 text-zinc-100 font-sans">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">CCTV Security Vision Feed</h3>
                  <p className="text-[10px] text-zinc-400 font-mono">Phase 4 AI Computer Vision Subsystem</p>
                </div>
              </div>
              <button
                onClick={() => setShowCameraModal(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 p-4 space-y-2 text-center h-44 flex flex-col justify-between overflow-hidden shadow-inner">
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 z-10">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    CAM-01 • GATE ENTRY
                  </span>
                  <span>1080p • 30 FPS</span>
                </div>
                <div className="my-auto space-y-1 z-10">
                  <Camera className="w-8 h-8 text-indigo-400/40 mx-auto" />
                  <p className="text-xs font-mono font-bold text-zinc-300">ANPR License Plate Scanner</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Ready for Phase 4 Computer Vision</p>
                </div>
              </div>

              <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 p-4 space-y-2 text-center h-44 flex flex-col justify-between overflow-hidden shadow-inner">
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 z-10">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    CAM-02 • DOCK HUB
                  </span>
                  <span>1080p • 30 FPS</span>
                </div>
                <div className="my-auto space-y-1 z-10">
                  <Camera className="w-8 h-8 text-indigo-400/40 mx-auto" />
                  <p className="text-xs font-mono font-bold text-zinc-300">Dock Door Visual Monitor</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Ready for Phase 4 Computer Vision</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowCameraModal(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs font-mono transition cursor-pointer active:scale-95 shadow-md shadow-indigo-600/20"
              >
                Close Camera View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}