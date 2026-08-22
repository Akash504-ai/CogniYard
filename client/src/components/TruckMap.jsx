import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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
  Radio
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

/* Dynamic Status Markers with Status Ring */
const createTruckIcon = (status) => {
  const statusStyles = {
    DELAYED: { bg: 'bg-rose-500', ring: 'ring-rose-500/30', border: 'border-rose-300' },
    COMPLETED: { bg: 'bg-emerald-500', ring: 'ring-emerald-500/30', border: 'border-emerald-300' },
    UNLOADING: { bg: 'bg-purple-500', ring: 'ring-purple-500/30', border: 'border-purple-300' },
    IN_TRANSIT: { bg: 'bg-amber-500', ring: 'ring-amber-500/30', border: 'border-amber-300' }
  };

  const current = statusStyles[status] || statusStyles.IN_TRANSIT;

  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center group">
        <div class="w-7 h-7 rounded-xl ${current.bg} text-white ring-4 ${current.ring} border border-white/60 shadow-lg flex items-center justify-center transition-transform transform group-hover:scale-110">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-4v10"/>
            <circle cx="7" cy="18" r="2"/>
            <circle cx="17" cy="18" r="2"/>
          </svg>
        </div>
      </div>
    `,
    className: 'custom-truck-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const WAREHOUSE_LOCATION = [12.9716, 77.5946];

export default function TruckMap({ trucks = [], onSimulateStep }) {
  const { isDark } = useTheme();

  // Switch to dark mode tiles seamlessly if theme is active
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const delayedCount = trucks.filter(t => t.status === 'DELAYED').length;

  return (
    <div className="relative w-full h-[460px] rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-xl bg-zinc-100 dark:bg-zinc-950">
      
      {/* Telemetry HUD - Top Left */}
      <div className="absolute top-4 left-4 z-[400] flex flex-wrap items-center gap-2">
        <div className="bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 px-3.5 py-2 rounded-xl text-xs flex items-center gap-3 shadow-lg">
          <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
            <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            <span>Yard Telemetry Live</span>
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

        {onSimulateStep && (
          <button
            onClick={onSimulateStep}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 border border-zinc-700/50 dark:border-zinc-300 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Simulate Step</span>
          </button>
        )}
      </div>

      {/* Map Control Info - Top Right */}
      <div className="absolute top-4 right-4 z-[400] hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 shadow-md">
        <Navigation className="w-3 h-3 text-indigo-500" />
        <span>Dock Gates 1–4 Auto-Routing</span>
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
            position={[truck.latitude, truck.longitude]}
            icon={createTruckIcon(truck.status)}
          >
            <Popup className="custom-popup">
              <div className="p-2 space-y-2 min-w-[210px]">
                {/* Truck Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-zinc-500" />
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
                    <span className="text-[9px] uppercase tracking-wider block text-zinc-400">Yard Zone</span>
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
                    <span className="font-mono text-[10px] text-zinc-400">({truck.trailerId})</span>
                  </div>

                  <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800 font-medium">
                    <span className="flex items-center gap-1 text-zinc-500">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      ETA
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{truck.eta}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}