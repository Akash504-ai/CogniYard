import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Clock } from 'lucide-react';

const warehouseIcon = L.divIcon({
  html: `<div style="background:#27272a;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #f4f4f5;box-shadow:0 4px 10px rgba(0,0,0,0.5);color:white;font-size:14px;">🏢</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const createTruckIcon = (status) => {
  const bg = status === 'DELAYED' ? '#ef4444' : status === 'COMPLETED' ? '#10b981' : status === 'UNLOADING' ? '#a855f7' : '#f59e0b';
  return L.divIcon({
    html: `<div style="background:${bg};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #18181b;box-shadow:0 4px 8px rgba(0,0,0,0.5);color:white;font-size:12px;">🚚</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const WAREHOUSE_LOCATION = [12.9716, 77.5946];

export default function TruckMap({ trucks = [], onSimulateStep }) {
  return (
    <div className="relative w-full h-[420px] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl">
      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 rounded-lg text-xs flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
          <MapPin className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <span>CogniYard Hub Live Tracking</span>
        </div>
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <span className="text-zinc-500 dark:text-zinc-400">Active Trucks: <strong className="text-zinc-900 dark:text-zinc-100">{trucks.length}</strong></span>
        {onSimulateStep && (
          <button
            onClick={onSimulateStep}
            className="ml-2 text-[11px] px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-medium transition-all cursor-pointer"
          >
            Simulate Movement ⚡
          </button>
        )}
      </div>

      {/* Leaflet Map Component */}
      <MapContainer
        center={WAREHOUSE_LOCATION}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Central Warehouse Location Marker */}
        <Marker position={WAREHOUSE_LOCATION} icon={warehouseIcon}>
          <Popup>
            <div className="p-1">
              <strong className="block text-xs">CogniYard Central Hub</strong>
              <p className="text-[11px] opacity-70">Main Logistics Facility</p>
              <p className="text-[10px] opacity-60 mt-1">4 Active Dock Bays</p>
            </div>
          </Popup>
        </Marker>

        {/* Live Truck Markers */}
        {trucks.map((truck) => (
          <Marker
            key={truck.truckId}
            position={[truck.latitude, truck.longitude]}
            icon={createTruckIcon(truck.status)}
          >
            <Popup>
              <div className="p-1 text-xs space-y-1">
                <div className="flex items-center justify-between border-b pb-1 border-zinc-200 dark:border-zinc-800">
                  <strong className="font-mono">{truck.truckId}</strong>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                    {truck.status}
                  </span>
                </div>
                <div className="text-[11px]">PO Ref: <strong>{truck.poNumber}</strong></div>
                <div className="text-[11px]">Trailer: {truck.trailerId}</div>
                <div className="text-[11px]">Driver: {truck.driverName}</div>
                <div className="text-[11px] flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span>ETA: <strong>{truck.eta}</strong></span>
                </div>
                <div className="text-[10px] opacity-60">Zone: {truck.yardLocation}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
