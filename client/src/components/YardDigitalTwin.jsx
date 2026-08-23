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
  ShieldAlert
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
    if (ratio > 0.8) return { label: 'CRITICAL', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40' };
    if (ratio > 0.5) return { label: 'HIGH', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
    if (ratio > 0.2) return { label: 'MODERATE', bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' };
    return { label: 'LOW', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
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

  // Check if any truck is currently processing at Gate 1
  const isGateActive = activeTrucks.some(t => t.status === 'AT_GATE' || (t.progress >= 24 && t.progress <= 36));

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 p-6 space-y-6">
      
      {/* DIGITAL TWIN HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2.5 font-mono">
              <span>CogniYard Digital Twin — Fleet Simulation Console</span>
              <span className={`inline-flex items-center gap-1.5 text-[10px] px-3 py-0.5 rounded-full font-semibold border shadow-sm ${
                simRunning
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/80'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${simRunning ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'}`} />
                {simRunning ? `SIMULATION ACTIVE (${simSpeed}x)` : 'PAUSED'}
              </span>
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Live top-down 2D yard telemetry, realistic 18-wheeler vehicle assets, animated gate barrier, pneumatic dock doors & unloading cargo streams.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCameraModal(true)}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-indigo-400 border border-indigo-500/30 transition shadow-md cursor-pointer active:scale-95"
          >
            <Camera className="w-4 h-4 text-indigo-400" />
            <span>📷 CCTV Feeds (Phase 4 Ready)</span>
          </button>
        </div>
      </div>

      {/* CONGESTION HEATMAP & TELEMETRY ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-mono text-zinc-400 block tracking-wider">Gate Zone Risk</span>
            <span className="text-xs font-bold text-zinc-100 font-mono mt-0.5 block">{gateCount} Vehicles Inbound</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg border ${gateHeatmap.bg}`}>
            {gateHeatmap.label}
          </span>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-mono text-zinc-400 block tracking-wider">Queue Zone Risk</span>
            <span className="text-xs font-bold text-zinc-100 font-mono mt-0.5 block">{queueCount} Vehicles Waiting</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg border ${queueHeatmap.bg}`}>
            {queueHeatmap.label}
          </span>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-mono text-zinc-400 block tracking-wider">Dock Bays Risk</span>
            <span className="text-xs font-bold text-zinc-100 font-mono mt-0.5 block">{dockOccupiedCount} / {docks.length} Occupied</span>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg border ${dockHeatmap.bg}`}>
            {dockHeatmap.label}
          </span>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-mono text-zinc-400 block tracking-wider">Yard Slot Capacity</span>
            <span className="text-xs font-bold text-indigo-400 font-mono mt-0.5 block">{yardCapacity.occupied} / {yardCapacity.max} ({Math.round((yardCapacity.occupied / yardCapacity.max) * 100)}%)</span>
          </div>
          <Gauge className="w-5 h-5 text-indigo-400" />
        </div>
      </div>

      {/* FLOATING REAL-TIME MILESTONE EVENT TOAST */}
      {activeToast && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/90 border border-indigo-500/40 text-indigo-200 text-xs font-mono font-semibold flex items-center gap-2.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
          <span>{activeToast}</span>
        </div>
      )}

      {/* 2D SCHEMATIC VISUAL CONTROL CANVAS CONTAINER */}
      <div className="relative w-full h-[650px] rounded-3xl bg-[#0f1013] border border-zinc-800/90 overflow-hidden shadow-2xl">
        
        {/* Dark Charcoal Asphalt Surface Background */}
        <div className="absolute inset-0 bg-[#121316] bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-80" />

        {/* 1. INBOUND HIGHWAY ROADWAY (TOP) */}
        <div className="absolute top-[6%] left-[2%] right-[2%] h-[14%] rounded-2xl bg-zinc-950/90 border-y-2 border-dashed border-amber-500/50 flex items-center justify-between px-6 shadow-inner">
          <div className="flex items-center gap-2.5 text-xs font-mono font-bold text-amber-400">
            <Navigation className="w-4 h-4 rotate-90 text-amber-400" />
            <span>INBOUND HIGHWAY ROADWAY (LANE 1)</span>
          </div>
          {/* Yellow Centerline Dashes */}
          <div className="absolute inset-x-0 top-1/2 border-b-2 border-dashed border-amber-500/40 pointer-events-none" />
          <span className="text-[10px] font-mono text-zinc-500">Speed Limit: 25 km/h</span>
        </div>

        {/* 2. GATE 1 CHECKPOINT & BARRIER ARM */}
        <div className="absolute top-[26%] left-[26%] w-[170px] h-[85px] rounded-2xl bg-zinc-950 border border-zinc-800 p-3 flex flex-col justify-between shadow-2xl z-10">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <strong className="text-amber-400 font-bold">GATE 1 CHECKPOINT</strong>
            <span className={`px-1.5 py-0.2 rounded-full font-bold ${isGateActive ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
              {isGateActive ? '🚧 PROCESSING' : '🟢 READY'}
            </span>
          </div>

          {/* Barrier Arm Animation */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[9px] font-mono text-zinc-400">Barrier Gate Arm:</span>
            <div className={`h-2 w-20 rounded-full transition-transform duration-500 origin-left shadow-lg ${
              isGateActive ? '-rotate-45 bg-emerald-500 shadow-emerald-500/60' : 'rotate-0 bg-rose-500 shadow-rose-500/60'
            }`} />
          </div>
        </div>

        {/* 3. YARD HOLDING QUEUE STALLS (ZONE B) */}
        <div className="absolute top-[38%] left-[44%] right-[4%] h-[95px] rounded-2xl bg-zinc-950/80 border border-zinc-800/80 p-3 flex flex-col justify-between shadow-inner">
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span className="text-indigo-400 font-bold flex items-center gap-1.5">
              <Boxes className="w-4 h-4" />
              YARD HOLDING QUEUE STALLS (PARKING BAY 1–4)
            </span>
            <span>Priority Queueing Buffer</span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {[1, 2, 3, 4].map((stallNum) => (
              <div key={stallNum} className="h-11 rounded-xl bg-zinc-900/60 border border-dashed border-amber-500/30 flex items-center justify-center text-[9px] font-mono text-zinc-500 font-bold">
                STALL {stallNum}
              </div>
            ))}
          </div>
        </div>

        {/* 4. DOCK APPROACH & APRON LANES */}
        <div className="absolute bottom-[28%] inset-x-[2%] h-[12%] border-t-2 border-dashed border-zinc-800 flex items-center justify-around text-[10px] font-mono text-zinc-600">
          <span>Approach Lane 1</span>
          <span>Approach Lane 2</span>
          <span>Approach Lane 3</span>
          <span>Approach Lane 4</span>
        </div>

        {/* 5. SVG ANIMATED NEON ROUTE PATH OVERLAYS */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="neonPathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <path d="M 5% 13% L 26% 13% L 34% 30% L 48% 46% L 48% 70%" fill="none" stroke="url(#neonPathGrad)" strokeWidth="2.5" strokeDasharray="6 6" className="animate-pulse" />
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
              {/* Headlight Beam Light Cone Glow */}
              <div className="absolute top-1/2 -right-12 -translate-y-1/2 w-16 h-8 bg-amber-400/20 filter blur-md rounded-r-full pointer-events-none opacity-80 animate-pulse" />

              {/* REAL SEMI-TRUCK VISUAL ASSET CONTAINER */}
              <div className="relative flex items-center gap-3">
                {/* Truck Top-Down Vehicle Graphic Component */}
                <div className="relative w-16 h-8 flex items-center justify-center">
                  <img
                    src="/truck.png"
                    alt="Semi Truck"
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform"
                    onError={(e) => {
                      // Fallback SVG top-down semi-truck graphic if image file load fails
                      e.target.style.display = 'none';
                    }}
                  />
                </div>

                {/* Glassmorphic Vehicle Telemetry Badge */}
                <div className={`p-2.5 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-2.5 transition-all group-hover:scale-105 ${
                  isDelayed
                    ? 'bg-rose-950/90 border-rose-500 text-rose-100 shadow-rose-950/50'
                    : isDocked
                    ? 'bg-indigo-950/90 border-indigo-500 text-indigo-100 shadow-indigo-950/50'
                    : 'bg-zinc-950/90 border-emerald-500/80 text-emerald-100 shadow-emerald-950/50'
                }`}>
                  <div className={`p-1.5 rounded-xl ${isDelayed ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    <Truck className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="text-[11px] font-mono leading-tight">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-white font-bold">{truck.truckId}</strong>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-300 font-semibold">
                        {truck.priority || 'HIGH'}
                      </span>
                    </div>
                    <div className="text-[9px] text-zinc-400 mt-0.5">
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
                className={`relative p-4 rounded-2xl border transition-all cursor-pointer bg-zinc-950/95 flex flex-col justify-between space-y-2.5 shadow-2xl ${
                  isMaintenance
                    ? 'border-rose-500/40 bg-zinc-950 opacity-85'
                    : dock.status === 'AVAILABLE'
                    ? 'border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-500/20'
                    : isUnloading
                    ? 'border-purple-500/50 hover:border-purple-400 hover:shadow-purple-500/20'
                    : isOccupied
                    ? 'border-indigo-500/50 hover:border-indigo-400 hover:shadow-indigo-500/20'
                    : 'border-zinc-800 opacity-60'
                }`}
              >
                {/* Dock Header */}
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold px-2.5 py-0.5 rounded-lg bg-zinc-900 text-zinc-100 border border-zinc-800">
                    {dock.dockNumber}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] border ${
                    isMaintenance ? 'bg-rose-950 text-rose-400 border-rose-800' :
                    dock.status === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                    isUnloading ? 'bg-purple-950 text-purple-400 border-purple-800' :
                    isOccupied ? 'bg-indigo-950 text-indigo-400 border-indigo-800' :
                    'bg-zinc-900 text-zinc-400 border-zinc-700'
                  }`}>
                    {dock.status}
                  </span>
                </div>

                {/* Metallic Pneumatic Dock Door & Unloading Stream */}
                <div className="relative h-14 w-full rounded-xl bg-zinc-900 border border-zinc-800 p-2 flex items-center justify-between overflow-hidden text-[10px] font-mono shadow-inner">
                  <span className="text-zinc-400">Pneumatic Door:</span>
                  <strong className={isMaintenance ? 'text-rose-400' : isOccupied ? 'text-rose-400' : 'text-emerald-400'}>
                    {isMaintenance ? '🔧 LOCKED' : isOccupied ? '🚪 SEALED' : '🚪 OPEN'}
                  </strong>

                  {/* Animated Package Box Stream during Unloading */}
                  {isUnloading && (
                    <div className="absolute inset-0 bg-purple-950/95 border border-purple-800 flex items-center justify-center gap-1.5 text-purple-200 font-bold animate-bounce z-10 shadow-lg">
                      <Boxes className="w-4 h-4 text-purple-400" />
                      <span>UNLOADING 📦📦📦</span>
                    </div>
                  )}
                </div>

                {/* Dock Operational Actions */}
                <div className="pt-0.5">
                  {isMaintenance ? (
                    <button disabled className="w-full py-1.5 rounded-xl bg-zinc-900 text-rose-400/80 text-[10px] border border-rose-950 font-mono font-semibold cursor-not-allowed">
                      🔧 MAINTENANCE — LOCKED
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
                        className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-md"
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
                      className="w-full py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-[10px] border border-zinc-800 transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
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

      {/* CCTV CAMERA FEEDS PLACEHOLDER MODAL (PHASE 4 READY) */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl p-6 rounded-3xl shadow-2xl space-y-5 text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">CCTV Security Camera Vision Panel</h3>
                  <p className="text-[10px] text-zinc-400 font-mono">Phase 4 Computer Vision System Integration Placeholder</p>
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
              {/* CAM 01 */}
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
                  <p className="text-xs font-mono font-bold text-zinc-300">ANPR License Plate Scanner Stream</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Camera AI Stream Ready for Phase 4 Computer Vision</p>
                </div>
              </div>

              {/* CAM 02 */}
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
                  <p className="text-xs font-mono font-bold text-zinc-300">Dock Door & Unloading Visual Stream</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Camera AI Stream Ready for Phase 4 Computer Vision</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowCameraModal(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer active:scale-95"
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
