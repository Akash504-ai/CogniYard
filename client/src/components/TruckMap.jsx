import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, Circle } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Clock,
  Navigation,
  Zap,
  ShieldCheck,
  User,
  Truck,
  Building2,
  Radio,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/* Enterprise Radar Marker for Central Hub */
const warehouseIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-10 h-10 bg-indigo-500/20 rounded-full animate-ping"></div>
      <div class="w-8 h-8 rounded-xl bg-zinc-900 text-white border-2 border-indigo-400 flex items-center justify-center shadow-xl">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
        </svg>
      </div>
    </div>
  `,
  className: 'custom-hub-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

/* Gate Checkpoint Icon */
const gateIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-7 h-7 rounded-lg bg-zinc-900 text-amber-400 border border-amber-400/60 shadow-lg flex items-center justify-center font-mono font-bold text-[10px]">
        GATE
      </div>
    </div>
  `,
  className: 'custom-gate-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

/* Dynamic Status Markers with Status Ring */
const createTruckIcon = (status, truckId) => {
  const statusStyles = {
    DELAYED: { bg: 'bg-rose-500', ring: 'ring-rose-500/30', text: 'text-rose-100' },
    COMPLETED: { bg: 'bg-emerald-500', ring: 'ring-emerald-500/30', text: 'text-emerald-100' },
    UNLOADING: { bg: 'bg-purple-500', ring: 'ring-purple-500/30', text: 'text-purple-100' },
    AT_DOCK: { bg: 'bg-indigo-600', ring: 'ring-indigo-500/30', text: 'text-indigo-100' },
    IN_YARD: { bg: 'bg-sky-500', ring: 'ring-sky-500/30', text: 'text-sky-100' },
    AT_GATE: { bg: 'bg-amber-500', ring: 'ring-amber-500/30', text: 'text-amber-100' },
    IN_TRANSIT: { bg: 'bg-blue-500', ring: 'ring-blue-500/30', text: 'text-blue-100' }
  };

  const current = statusStyles[status] || statusStyles.IN_TRANSIT;

  return L.divIcon({
    html: `
      <div class="relative flex flex-col items-center justify-center group cursor-pointer">
        <div class="w-8 h-8 rounded-xl ${current.bg} text-white ring-4 ${current.ring} border border-white/80 shadow-xl flex items-center justify-center transition-transform transform group-hover:scale-110">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-4v10"/>
            <circle cx="7" cy="18" r="2"/>
            <circle cx="17" cy="18" r="2"/>
          </svg>
        </div>
        <div class="mt-0.5 px-1.5 py-0.2 rounded bg-zinc-900/90 text-[9px] font-mono font-bold text-white shadow-xs border border-zinc-700">
          ${truckId}
        </div>
      </div>
    `,
    className: 'custom-truck-icon',
    iconSize: [36, 42],
    iconAnchor: [18, 21]
  });
};

const WAREHOUSE_LOCATION = [12.9716, 77.5946];
const GATE_LOCATION = [12.9620, 77.5850];

// Polyline Route from Origin -> Gate -> Checkpoint -> Queue -> Docks
const INBOUND_ROUTE = [
  [12.9350, 77.5400],
  [12.9450, 77.5550],
  [12.9550, 77.5700],
  [12.9620, 77.5850], // Gate
  [12.9645, 77.5870],
  [12.9670, 77.5890], // Checkpoint
  [12.9695, 77.5920], // Queue
  [12.9716, 77.5946]  // Dock
];

// Polygon boundaries for Yard Zones
const YARD_ZONE_POLYGON = [
  [12.9610, 77.5830],
  [12.9630, 77.5870],
  [12.9730, 77.5970],
  [12.9700, 77.5990]
];

export default function TruckMap({ trucks = [], onSimulateStep, isRunning = false, speed = 1, onSelectTruck }) {
  const { isDark } = useTheme();

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const delayedCount = trucks.filter(t => t.status === 'DELAYED').length;

  return (
    <div className="relative w-full h-[480px] rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-xl bg-zinc-100 dark:bg-zinc-950">
      
      {/* Telemetry HUD - Top Left */}
      <div className="absolute top-4 left-4 z-[400] flex flex-wrap items-center gap-2">
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 px-3.5 py-2 rounded-xl text-xs flex items-center gap-3 shadow-lg">
          <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
            <Radio className={`w-3.5 h-3.5 ${isRunning ? 'text-emerald-500 animate-pulse' : 'text-zinc-400'}`} />
            <span>{isRunning ? `SIMULATED GPS TELEMETRY (${speed}x)` : 'SIMULATION PAUSED'}</span>
          </div>

          <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-800" />

          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
            <span>Active: <strong className="text-zinc-900 dark:text-zinc-100">{trucks.length}</strong></span>
            {delayedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200/50 dark:border-rose-900/40">
                {delayedCount} Delayed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Map Control Info - Top Right */}
      <div className="absolute top-4 right-4 z-[400] hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 shadow-md">
        <Layers className="w-3.5 h-3.5 text-indigo-500" />
        <span>Yard Zone Polyline & Gate Checkpoint Active</span>
      </div>

      {/* Leaflet Map Canvas */}
      <MapContainer
        center={WAREHOUSE_LOCATION}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrl}
        />

        {/* Yard Inbound Route Polyline */}
        <Polyline
          positions={INBOUND_ROUTE}
          pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.6, dashArray: '8, 8' }}
        />

        {/* Yard Perimeter Overlay */}
        <Polygon
          positions={YARD_ZONE_POLYGON}
          pathOptions={{ color: '#818cf8', fillColor: '#818cf8', fillOpacity: 0.08, weight: 1.5 }}
        />

        {/* Gate Checkpoint Marker */}
        <Marker position={GATE_LOCATION} icon={gateIcon}>
          <Popup className="custom-popup">
            <div className="p-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100">
              <strong>Yard Gate 1 Checkpoint</strong>
              <div className="text-[10px] text-zinc-400 mt-0.5">Automated ANPR & Permit Verification</div>
            </div>
          </Popup>
        </Marker>

        {/* Central Hub Marker */}
        <Marker position={WAREHOUSE_LOCATION} icon={warehouseIcon}>
          <Popup className="custom-popup">
            <div className="p-2 space-y-1.5 min-w-[180px]">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-xs text-zinc-900 dark:text-zinc-100 leading-tight">
                    Central Distribution Hub
                  </strong>
                  <span className="text-[10px] text-zinc-400 font-mono">ID: HUB-BLR-01</span>
                </div>
              </div>
              <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[11px] space-y-0.5 text-zinc-600 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Dock Capacity:</span>
                  <strong className="text-zinc-900 dark:text-zinc-200 font-mono">4 / 4 Active</strong>
                </div>
                <div className="flex justify-between">
                  <span>Turnaround Rate:</span>
                  <strong className="text-emerald-600 font-mono">94.2%</strong>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Live Truck Telemetry Markers */}
        {trucks.map((truck) => (
          <Marker
            key={truck.truckId}
            position={[truck.latitude || WAREHOUSE_LOCATION[0], truck.longitude || WAREHOUSE_LOCATION[1]]}
            icon={createTruckIcon(truck.status, truck.truckId)}
            eventHandlers={{
              click: () => onSelectTruck && onSelectTruck(truck)
            }}
          >
            <Popup className="custom-popup">
              <div className="p-2 space-y-2 min-w-[220px]">
                {/* Truck Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-bold font-mono text-xs text-zinc-900 dark:text-zinc-100">
                      {truck.truckId}
                    </span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    truck.status === 'DELAYED'
                      ? 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                      : truck.status === 'COMPLETED'
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                      : 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                  }`}>
                    {truck.status}
                  </span>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-1.5 rounded border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[9px] uppercase tracking-wider block text-zinc-400">PO Ref</span>
                    <strong className="font-mono text-zinc-800 dark:text-zinc-200">{truck.poNumber}</strong>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-1.5 rounded border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[9px] uppercase tracking-wider block text-zinc-400">Location</span>
                    <strong className="font-mono text-zinc-800 dark:text-zinc-200">{truck.yardLocation}</strong>
                  </div>
                </div>

                {/* Driver & ETA row */}
                <div className="space-y-1 text-[11px] pt-0.5">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {truck.driverName}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">Dock: {truck.assignedDock || 'Unassigned'}</span>
                  </div>

                  <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 font-medium">
                    <span className="flex items-center gap-1 text-zinc-500">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      ETA
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{truck.eta}</span>
                  </div>
                </div>

                {onSelectTruck && (
                  <button
                    onClick={() => onSelectTruck(truck)}
                    className="w-full mt-1 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition flex items-center justify-center gap-1"
                  >
                    <span>View Telemetry Drawer</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}