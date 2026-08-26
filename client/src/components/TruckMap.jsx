import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Clock,
  Radio,
  Layers,
  User,
  Truck,
  Building2,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Helper component to force Leaflet to recalculate size on mount
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

/* Radar Marker for Central Hub */
const warehouseIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 bg-green-500/20 rounded-full animate-ping"></div>
      <div class="w-8 h-8 rounded-xs bg-[#1C201E] text-white border-2 border-[#15803D] flex items-center justify-center shadow-md font-mono text-xs font-bold">
        HUB
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
      <div class="px-1.5 py-0.5 rounded-xs bg-[#D97706] text-white font-mono font-bold text-[9px] shadow-md border border-white">
        GATE 1
      </div>
    </div>
  `,
  className: 'custom-gate-icon',
  iconSize: [40, 20],
  iconAnchor: [20, 10]
});

/* Dynamic Status Markers with Status Ring */
const createTruckIcon = (status, truckId) => {
  const statusStyles = {
    DELAYED: { bg: 'bg-[#DC2626]', text: 'text-white' },
    COMPLETED: { bg: 'bg-[#15803D]', text: 'text-white' },
    UNLOADING: { bg: 'bg-[#7C3AED]', text: 'text-white' },
    AT_DOCK: { bg: 'bg-[#2563EB]', text: 'text-white' },
    IN_YARD: { bg: 'bg-[#0284C7]', text: 'text-white' },
    AT_GATE: { bg: 'bg-[#D97706]', text: 'text-white' },
    IN_TRANSIT: { bg: 'bg-[#2563EB]', text: 'text-white' }
  };

  const current = statusStyles[status] || statusStyles.IN_TRANSIT;

  return L.divIcon({
    html: `
      <div class="relative flex flex-col items-center justify-center group cursor-pointer">
        <div class="px-1.5 py-0.5 rounded-xs ${current.bg} text-white font-mono font-bold text-[9px] shadow-lg border border-white/80 flex items-center gap-1">
          <span>🚛</span>
          <span>${truckId}</span>
        </div>
      </div>
    `,
    className: 'custom-truck-icon',
    iconSize: [60, 24],
    iconAnchor: [30, 12]
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

  // Fallback demo fleet if trucks array is empty
  const displayTrucks = trucks.length > 0 ? trucks : [
    {
      truckId: 'TRK-1001',
      latitude: 12.9680,
      longitude: 77.5900,
      status: 'IN_YARD',
      poNumber: 'PO-78432',
      yardLocation: 'BAY-A02',
      driverName: 'Rajesh Kumar',
      eta: 'In Yard (0m)'
    },
    {
      truckId: 'TRK-1002',
      latitude: 12.9620,
      longitude: 77.5850,
      status: 'AT_GATE',
      poNumber: 'PO-78415',
      yardLocation: 'Security Gate',
      driverName: 'Vikram Singh',
      eta: 'At Gate (2m)'
    },
    {
      truckId: 'TRK-1003',
      latitude: 12.9550,
      longitude: 77.5700,
      status: 'IN_TRANSIT',
      poNumber: 'PO-78398',
      yardLocation: 'Outer Ring Rd',
      driverName: 'Sunil Sharma',
      eta: '12 min'
    },
    {
      truckId: 'TRK-1004',
      latitude: 12.9450,
      longitude: 77.5550,
      status: 'IN_TRANSIT',
      poNumber: 'PO-78364',
      yardLocation: 'Highway NH-48',
      driverName: 'Amit Patel',
      eta: '25 min'
    },
    {
      truckId: 'TRK-1007',
      latitude: 12.9716,
      longitude: 77.5946,
      status: 'AT_DOCK',
      poNumber: 'PO-78450',
      yardLocation: 'DOCK-01',
      driverName: 'Prakash Rao',
      eta: 'Unloading (85%)'
    }
  ];

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const delayedCount = displayTrucks.filter(t => t.status === 'DELAYED').length;

  return (
    <div className="relative w-full h-[520px] rounded-xs overflow-hidden border border-[#E3DDD1] dark:border-[#2B3835] shadow-md bg-[#F4EFE6] dark:bg-[#161D1B]">
      
      {/* Telemetry HUD - Top Left */}
      <div className="absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-2">
        <div className="bg-[#FCFAF4]/90 dark:bg-[#1B2422]/90 backdrop-blur-md border border-[#E3DDD1] dark:border-[#2B3835] px-3 py-1.5 rounded-xs text-xs flex items-center gap-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#1C201E] dark:text-[#F5F7F6]">
            <Radio className={`w-3.5 h-3.5 ${isRunning ? 'text-[#15803D] animate-pulse' : 'text-[#8E9793]'}`} />
            <span>{isRunning ? `GPS SIMULATION (${speed}x)` : 'SIMULATION STANDBY'}</span>
          </div>

          <div className="h-3 w-px bg-[#E3DDD1] dark:bg-[#2B3835]" />

          <div className="flex items-center gap-2 text-[#68716D] dark:text-[#8E9C97] font-mono text-[11px]">
            <span>Fleet: <strong className="text-[#1C201E] dark:text-[#F5F7F6]">{displayTrucks.length} Active</strong></span>
            {delayedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-xs bg-[#FEE2E2] text-[#DC2626] font-bold">
                {delayedCount} Delayed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Map Control Info - Top Right */}
      <div className="absolute top-3 right-3 z-[400] hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#FCFAF4]/90 dark:bg-[#1B2422]/90 backdrop-blur-md border border-[#E3DDD1] dark:border-[#2B3835] text-[10px] font-mono text-[#68716D] dark:text-[#8E9C97] shadow-sm">
        <Layers className="w-3.5 h-3.5 text-[#15803D]" />
        <span>Yard Zone Polyline & Gate Checkpoint Active</span>
      </div>

      {/* Leaflet Map Canvas */}
      <MapContainer
        center={WAREHOUSE_LOCATION}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <MapResizer />

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url={tileUrl}
        />

        {/* Yard Inbound Route Polyline */}
        <Polyline
          positions={INBOUND_ROUTE}
          pathOptions={{ color: '#15803D', weight: 3, opacity: 0.8, dashArray: '6, 6' }}
        />

        {/* Yard Perimeter Overlay */}
        <Polygon
          positions={YARD_ZONE_POLYGON}
          pathOptions={{ color: '#22C55E', fillColor: '#22C55E', fillOpacity: 0.1, weight: 1.5 }}
        />

        {/* Gate Checkpoint Marker */}
        <Marker position={GATE_LOCATION} icon={gateIcon}>
          <Popup className="custom-popup">
            <div className="p-1.5 text-xs font-mono text-[#1C201E]">
              <strong>Security Gate 1 ANPR Checkpoint</strong>
              <div className="text-[10px] text-[#68716D] mt-0.5">Automated Optical Character Recognition</div>
            </div>
          </Popup>
        </Marker>

        {/* Central Hub Marker */}
        <Marker position={WAREHOUSE_LOCATION} icon={warehouseIcon}>
          <Popup className="custom-popup">
            <div className="p-2 space-y-1 min-w-[180px] font-mono text-xs">
              <div className="flex items-center gap-1.5 text-[#15803D] font-bold">
                <Building2 className="w-4 h-4" />
                <span>Central Logistics Hub</span>
              </div>
              <div className="text-[11px] text-[#68716D]">
                <div>Dock Bays: <strong>12 Total (6 In Use)</strong></div>
                <div>Turnaround Rate: <strong className="text-[#15803D]">94.2%</strong></div>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Live Truck Telemetry Markers */}
        {displayTrucks.map((truck) => (
          <Marker
            key={truck.truckId}
            position={[truck.latitude || WAREHOUSE_LOCATION[0], truck.longitude || WAREHOUSE_LOCATION[1]]}
            icon={createTruckIcon(truck.status, truck.truckId)}
            eventHandlers={{
              click: () => onSelectTruck && onSelectTruck(truck)
            }}
          >
            <Popup className="custom-popup">
              <div className="p-2 space-y-1.5 min-w-[200px] font-mono text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-[#E3DDD1]">
                  <div className="flex items-center gap-1 font-bold text-[#15803D]">
                    <Truck className="w-3.5 h-3.5" />
                    <span>{truck.truckId}</span>
                  </div>
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-xs bg-[#DCFCE7] text-[#15803D]">
                    {truck.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="p-1 rounded-xs bg-[#F4EFE6]">
                    <span className="text-[#68716D] block">PO REF</span>
                    <strong>{truck.poNumber || 'PO-78432'}</strong>
                  </div>
                  <div className="p-1 rounded-xs bg-[#F4EFE6]">
                    <span className="text-[#68716D] block">LOCATION</span>
                    <strong>{truck.yardLocation || 'In Transit'}</strong>
                  </div>
                </div>

                <div className="text-[10px] space-y-0.5 text-[#68716D]">
                  <div>Driver: <strong className="text-[#1C201E]">{truck.driverName || 'Operator'}</strong></div>
                  <div>ETA: <strong className="text-[#15803D]">{truck.eta || 'On Schedule'}</strong></div>
                </div>

                {onSelectTruck && (
                  <button
                    type="button"
                    onClick={() => onSelectTruck(truck)}
                    className="w-full mt-1 py-1 rounded-xs bg-[#15803D] text-white font-bold text-[10px] flex items-center justify-center gap-1"
                  >
                    <span>Inspect Vehicle Telemetry</span>
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