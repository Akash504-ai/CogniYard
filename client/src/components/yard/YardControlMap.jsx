import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Minus,
  Maximize2,
  Crosshair,
  ArrowRight,
  ArrowDown,
  Boxes,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';

export default function YardControlMap({ onSelectTruck, selectedTruck, docksData = [], trucksData = [], zonesData = [] }) {
  const [activeTruck, setActiveTruck] = useState(null);

  // 6 Docks matching live docksData or fallback
  const docks = docksData.length > 0
    ? docksData.slice(0, 6).map(d => {
        const assignedTruck = trucksData.find(t => t.assignedDock === d.dockNumber);
        const truckId = d.currentTruckId || assignedTruck?.licensePlate || assignedTruck?.truckId || null;
        const isOccupied = d.status === 'OCCUPIED' || Boolean(truckId);
        return {
          id: d.dockNumber,
          label: d.dockNumber,
          status: isOccupied ? 'IN USE' : 'AVAILABLE',
          truck: truckId,
          badge: truckId ? `At ${d.dockNumber}` : null
        };
      })
    : [
        { id: 'D1', label: 'D1', status: 'IN USE', truck: 'WB 11 CD 5678', badge: 'At D1' },
        { id: 'D2', label: 'D2', status: 'IN USE', truck: null, badge: null },
        { id: 'D3', label: 'D3', status: 'AVAILABLE', truck: null, badge: null },
        { id: 'D4', label: 'D4', status: 'IN USE', truck: 'WB 19 EF 9012', badge: 'At D4' },
        { id: 'D5', label: 'D5', status: 'AVAILABLE', truck: null, badge: null },
        { id: 'D6', label: 'D6', status: 'AVAILABLE', truck: null, badge: null }
      ];

  // Inbound truck at gate
  const gateTruck = trucksData.find(t => t.status === 'AT_GATE' || t.status === 'IN_YARD') || {
    truckId: 'TRK-9001',
    licensePlate: 'WB 25 AB 1234',
    status: 'AT_GATE'
  };

  // 4 Bottom Storage Zones
  const zones = zonesData.length > 0 ? zonesData : [
    {
      id: 'YARD A',
      title: 'YARD A',
      lpns: '35 LPNS',
      pallets: '65 Pallets',
      color: '#15803D',
      palletFill: 'bg-[#15803D]',
      dotCount: 24
    },
    {
      id: 'YARD B',
      title: 'YARD B',
      lpns: '48 LPNS',
      pallets: '92 Pallets',
      color: '#D97706',
      palletFill: 'bg-[#D97706]',
      dotCount: 24
    },
    {
      id: 'YARD C',
      title: 'YARD C',
      lpns: '20 LPNS',
      pallets: '38 Pallets',
      color: '#2563EB',
      palletFill: 'bg-[#2563EB]',
      dotCount: 24
    },
    {
      id: 'QC HOLD AREA',
      title: 'QC HOLD AREA',
      lpns: '8 LPNS',
      pallets: '15 Pallets',
      color: '#7C3AED',
      palletFill: 'bg-[#7C3AED]',
      dotCount: 16
    }
  ];

  return (
    <div className="relative rounded-[3px] border border-[#E3DDD1] dark:border-[#2B3835] bg-[#FCFAF4] dark:bg-[#1B2422] bg-grid-paper p-4 sm:p-6 overflow-hidden select-none shadow-[0_1px_3px_rgba(35,30,25,0.04)]">
      
      {/* Pinned Paper Tape Tab: "Live Yard Map" */}
      <div className="absolute top-3 left-4 z-10 px-3 py-1 rounded-[2px] bg-[#FCF2CD] dark:bg-[#292E22] border border-[#EEDBA5] dark:border-[#3F4735] shadow-[0_2px_4px_rgba(50,40,20,0.08)] transform -rotate-1">
        <span className="font-handwriting text-lg sm:text-xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
          Live Yard Map
        </span>
      </div>

      {/* Floating Zoom & Map Controls Pill */}
      <div className="absolute left-4 top-24 z-10 flex flex-col gap-1 p-1 rounded-sm bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-sm text-[#68716D]">
        <button type="button" className="p-1 hover:text-[#1C201E] hover:bg-[#F4EFE6] rounded-xs"><Plus className="w-3.5 h-3.5" /></button>
        <button type="button" className="p-1 hover:text-[#1C201E] hover:bg-[#F4EFE6] rounded-xs"><Minus className="w-3.5 h-3.5" /></button>
        <button type="button" className="p-1 hover:text-[#1C201E] hover:bg-[#F4EFE6] rounded-xs"><Maximize2 className="w-3.5 h-3.5" /></button>
        <button type="button" className="p-1 hover:text-[#1C201E] hover:bg-[#F4EFE6] rounded-xs"><Crosshair className="w-3.5 h-3.5" /></button>
      </div>

      {/* MAIN SCHEMATIC CANVAS */}
      <div className="pt-8 pb-4 space-y-6">
        
        {/* TOP DOCKS ROW (D1 - D6) */}
        <div className="grid grid-cols-6 gap-2 sm:gap-3 max-w-4xl mx-auto">
          {docks.map((dock) => {
            const isAvailable = dock.status === 'AVAILABLE';

            return (
              <div key={dock.id} className="flex flex-col items-center space-y-1">
                {/* Dock Label & Status Badge */}
                <div className="text-center font-mono">
                  <div className="font-bold text-xs text-[#1C201E] dark:text-[#F5F7F6]">{dock.label}</div>
                  <span className={`px-1.5 py-0.2 rounded-[2px] text-[8px] sm:text-[9px] font-bold ${
                    isAvailable
                      ? 'bg-[#E3DDD1] text-[#68716D]'
                      : 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                  }`}>
                    {dock.status}
                  </span>
                </div>

                {/* Dock Door Apron Graphic */}
                <div className="w-full h-8 sm:h-10 rounded-t-[2px] bg-[#E3DDD1] dark:bg-[#2B3835] border-t-2 border-x-2 border-[#1C201E] relative flex items-center justify-center">
                  <div className="w-4/5 h-2 bg-[#68716D]/30 border-b border-[#68716D]" />
                </div>

                {/* Docked Truck Visual if present */}
                {dock.truck && (
                  <div 
                    onClick={() => {
                      const matchedTruck = trucksData.find(t => t.truckId === dock.truck || t.licensePlate === dock.truck || t.assignedDock === dock.id);
                      const targetInfo = {
                        id: dock.truck,
                        status: dock.badge || 'Docked',
                        location: `Dock ${dock.id}`,
                        supplierName: matchedTruck?.supplierName || 'Verified Supplier',
                        poNumber: matchedTruck?.poNumber || 'PO-1030',
                        priority: matchedTruck?.priority || 'MEDIUM',
                        loadType: matchedTruck?.loadType || 'DRY_VAN'
                      };
                      setActiveTruck(targetInfo);
                      onSelectTruck?.(targetInfo);
                    }}
                    className="w-11 sm:w-14 h-20 sm:h-24 rounded-sm bg-[#D4CABE] dark:bg-[#374642] border border-[#A89F91] p-1 flex flex-col justify-between items-center cursor-pointer hover:border-[#15803D] transition-colors shadow-xs"
                  >
                    <div className="w-full h-4 rounded-xs bg-[#B8ADA0] border-b border-[#A89F91]" />
                    <div className="text-center">
                      <div className="text-[7px] sm:text-[8px] font-mono font-bold text-[#1C201E] dark:text-[#F5F7F6] leading-tight truncate max-w-[50px]">
                        {dock.truck}
                      </div>
                      <span className="px-1 py-0.2 rounded-xs bg-[#DBEAFE] text-[#2563EB] text-[7px] font-mono font-bold">
                        {dock.badge}
                      </span>
                    </div>
                    <div className="w-3 h-1.5 rounded-full bg-[#1C201E]/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* YARD DRIVING APRON & LANES */}
        <div className="relative min-h-[140px] sm:min-h-[160px] border-y border-dashed border-[#D4CABE] dark:border-[#374642] flex items-center justify-between px-6 sm:px-12">
          
          {/* Inbound Truck at Left Gate */}
          <div className="flex flex-col items-center space-y-1">
            <div className="text-[9px] font-mono text-[#68716D] flex items-center gap-1">
              <ArrowDown className="w-3.5 h-3.5 text-[#D97706]" />
              <span>ENTRY LANE</span>
            </div>

            <div 
              onClick={() => {
                const targetId = gateTruck.licensePlate || gateTruck.truckId || 'WB 25 AB 1234';
                const targetInfo = {
                  id: targetId,
                  status: gateTruck.status || 'At Gate',
                  location: 'Gate 01 ANPR Station',
                  supplierName: gateTruck.supplierName || 'Verified Supplier',
                  poNumber: gateTruck.poNumber || 'PO-1002',
                  priority: gateTruck.priority || 'HIGH',
                  loadType: gateTruck.loadType || 'DRY_VAN'
                };
                setActiveTruck(targetInfo);
                onSelectTruck?.(targetInfo);
              }}
              className="w-12 sm:w-14 h-22 sm:h-26 rounded-sm bg-[#FAF7F0] dark:bg-[#1E2825] border-2 border-[#D97706] p-1 flex flex-col justify-between items-center cursor-pointer shadow-md hover:scale-105 transition-transform"
            >
              <div className="w-full h-5 rounded-xs bg-[#EEDBA5] border-b border-[#D97706] flex items-center justify-center">
                <Truck className="w-3.5 h-3.5 text-[#D97706]" />
              </div>
              <div className="text-center font-mono">
                <div className="text-[8px] font-bold text-[#1C201E] dark:text-[#F5F7F6] truncate max-w-[50px]">
                  {gateTruck.licensePlate || gateTruck.truckId || 'WB 25 AB 1234'}
                </div>
                <span className="px-1 py-0.2 rounded-xs bg-[#FEF3C7] text-[#D97706] text-[7px] font-bold">
                  {gateTruck.status === 'AT_GATE' ? 'At Gate' : (gateTruck.status === 'IN_YARD' ? 'In Yard' : 'Scheduled')}
                </span>
              </div>
              <div className="w-3 h-1.5 rounded-full bg-[#D97706]/40" />
            </div>
          </div>

          {/* Direction Movement Arrows (Schematic Route) */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 px-4">
            <div className="flex items-center gap-6 text-[#A89F91] text-xs">
              <span className="flex items-center gap-1 font-mono text-[9px]">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>UNLOAD LANE</span>
              </span>
            </div>

            {/* Central Forklift Schematic Graphic */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-2xs font-mono text-[10px] text-[#1C201E] dark:text-[#F5F7F6]">
              <svg className="w-5 h-5 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 17h14v-5H9l-4-4v9Z" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="17" cy="18" r="2" />
                <path d="M19 12h3v5" />
              </svg>
              <span>FORKLIFT 02 • TRANSIT</span>
            </div>
          </div>
        </div>

        {/* 4 BOTTOM STORAGE ZONES (YARD A, YARD B, YARD C, QC HOLD) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="p-3 rounded-sm border border-[#E3DDD1] dark:border-[#2B3835] bg-[#FCFAF4] dark:bg-[#1E2825] space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between font-mono pb-1 border-b border-[#E3DDD1] dark:border-[#2B3835]">
                <strong className="text-xs font-bold text-[#1C201E] dark:text-[#F5F7F6]">{zone.title}</strong>
                <span className="text-[9px] text-[#68716D]">{zone.lpns}</span>
              </div>
              <div className="text-[10px] font-mono text-[#15803D] font-bold">
                {zone.pallets} Staged
              </div>
              <div className="grid grid-cols-6 gap-1 pt-1">
                {Array.from({ length: zone.dotCount }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-[1px] ${zone.palletFill} opacity-85 shadow-2xs`}
                    title={`Pallet Unit #${i + 1}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* BOTTOM SCHEMATIC STATUS LEGEND */}
        <div className="pt-2 border-t border-[#E3DDD1] dark:border-[#2B3835] flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-mono text-[10px] text-[#68716D] dark:text-[#8E9C97]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#D97706]" />
            <span>At Gate Checkpoint</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]" />
            <span>Dock Intake</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#15803D]" />
            <span>Yard Inventory Staged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#7C3AED]" />
            <span>QC Inspection Hold</span>
          </div>
        </div>
      </div>

      {/* TRUCK TELEMETRY INSPECTOR MODAL */}
      {activeTruck && (
        <div className="absolute right-4 bottom-4 z-20 w-72 p-3.5 rounded-sm bg-[#FCFAF4] dark:bg-[#1B2422] border-2 border-[#15803D] shadow-xl font-mono text-xs space-y-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E3DDD1]">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#15803D]" />
              <strong className="text-[#15803D]">{activeTruck.id}</strong>
            </div>
            <button type="button" onClick={() => setActiveTruck(null)} className="text-[#68716D] hover:text-[#1C201E]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1 text-[11px] text-[#1C201E] dark:text-[#F5F7F6]">
            <div>Supplier: <strong className="text-[#15803D]">{activeTruck.supplierName || 'Verified Supplier'}</strong></div>
            <div>PO Reference: <strong className="text-zinc-700 dark:text-zinc-300">{activeTruck.poNumber || 'PO-1030'}</strong></div>
            <div>Location: <strong>{activeTruck.location}</strong></div>
            <div>Status: <strong>{activeTruck.status}</strong></div>
            <div>Priority: <strong className="text-amber-600">{activeTruck.priority || 'MEDIUM'}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
