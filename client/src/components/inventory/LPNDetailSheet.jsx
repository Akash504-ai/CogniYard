import React from 'react';
import {
  X,
  Package,
  Layers,
  MapPin,
  Barcode,
  Calendar,
  Thermometer,
  ShieldCheck,
  Truck,
  ArrowRight,
  Clock,
  Building2,
  CheckCircle2
} from 'lucide-react';

export default function LPNDetailSheet({ lpn, isOpen, onClose }) {
  if (!isOpen || !lpn) return null;

  const lpnId = typeof lpn === 'string' ? lpn : lpn.lpnId || lpn.lpn || lpn.id || 'LPN-90428-A';
  const sku = lpn.sku || 'SKU-BRG-6204';
  const productName = lpn.productName || lpn.name || 'Precision Steel Bearings (SKF-6204)';
  const quantity = lpn.quantity || lpn.currentStock || 500;
  const unit = lpn.unit || 'Units';
  const binLocation = lpn.binLocation || lpn.location || 'Aisle 04 · Rack B · Shelf 02';
  const lotNumber = lpn.lotNumber || 'LOT-2026-08-41A';
  const status = lpn.status || 'STORED';
  const qcStatus = lpn.qcStatus || 'QC_PASSED';
  const receivedAt = lpn.receivedAt || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const supplierName = lpn.supplierName || 'Acme Steel Pvt Ltd';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs font-sans">
      <div className="w-full max-w-lg h-full bg-[#FCFAF4] dark:bg-[#1B2422] border-l border-[#E3DDD1] dark:border-[#2B3835] shadow-2xl p-5 sm:p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
        
        {/* Header Drawer Control */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E3DDD1] dark:border-[#2B3835]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xs bg-[#DCFCE7] dark:bg-[#163824] text-[#15803D] dark:text-[#22C55E]">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#15803D] font-bold">
                PALLET & LPN TELEMETRY
              </span>
              <h2 className="text-base font-bold font-mono text-[#1C201E] dark:text-[#F5F7F6]">
                {lpnId}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xs text-[#68716D] hover:text-[#1C201E] hover:bg-[#F4EFE6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LPN Barcode Badge */}
        <div className="p-4 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] text-center space-y-2">
          <div className="font-mono text-xl tracking-[0.3em] font-bold text-[#1C201E] dark:text-[#F5F7F6] py-1 border-y border-dashed border-[#8E9C97]">
            ||| | |||| | ||||| || |||
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#68716D]">Serial: <strong>{lpnId}</strong></span>
            <span className="px-2 py-0.5 rounded-xs bg-[#DCFCE7] text-[#15803D] font-bold text-[10px] uppercase">
              {status}
            </span>
          </div>
        </div>

        {/* Material & SKU Specifications */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase text-[#68716D] tracking-wider">
            Material Specifications
          </h3>

          <div className="p-3.5 rounded-xs bg-white dark:bg-[#181D1C] border border-[#E3DDD1] dark:border-[#2B3835] space-y-2.5 text-xs font-mono">
            <div className="flex justify-between pb-1.5 border-b border-[#E3DDD1]/60">
              <span className="text-[#68716D]">Product Name:</span>
              <span className="font-sans font-bold text-[#1C201E] dark:text-[#F5F7F6] text-right">{productName}</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-[#E3DDD1]/60">
              <span className="text-[#68716D]">Master SKU:</span>
              <span className="font-bold text-[#15803D]">{sku}</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-[#E3DDD1]/60">
              <span className="text-[#68716D]">Stored Quantity:</span>
              <span className="font-bold text-[#1C201E] dark:text-[#F5F7F6]">{quantity.toLocaleString('en-IN')} {unit}</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-[#E3DDD1]/60">
              <span className="text-[#68716D]">Production Lot:</span>
              <span className="text-[#1C201E] dark:text-[#F5F7F6]">{lotNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#68716D]">Supplier / Vendor:</span>
              <span className="font-sans text-[#1C201E] dark:text-[#F5F7F6]">{supplierName}</span>
            </div>
          </div>
        </div>

        {/* Storage Location & Environment */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase text-[#68716D] tracking-wider">
            Storage Location & Telemetry
          </h3>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="p-3 rounded-xs bg-white dark:bg-[#181D1C] border border-[#E3DDD1] dark:border-[#2B3835] space-y-1">
              <div className="flex items-center gap-1.5 text-[#15803D]">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">BIN ALLOCATION</span>
              </div>
              <p className="font-bold text-xs text-[#1C201E] dark:text-[#F5F7F6]">{binLocation}</p>
            </div>

            <div className="p-3 rounded-xs bg-white dark:bg-[#181D1C] border border-[#E3DDD1] dark:border-[#2B3835] space-y-1">
              <div className="flex items-center gap-1.5 text-[#2563EB]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">QC VERIFICATION</span>
              </div>
              <p className="font-bold text-xs text-[#15803D]">Passed (100% Valid)</p>
            </div>
          </div>
        </div>

        {/* Pallet Movement Custody Ledger */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase text-[#68716D] tracking-wider">
            Chain of Custody History
          </h3>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-xs bg-white dark:bg-[#181D1C] border border-[#E3DDD1] dark:border-[#2B3835] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#15803D]" />
                <span className="font-bold text-[#1C201E] dark:text-[#F5F7F6]">Stored at Bin Rack B-02</span>
              </div>
              <span className="text-[10px] text-[#68716D]">Today, 14:22</span>
            </div>

            <div className="p-2.5 rounded-xs bg-white dark:bg-[#181D1C] border border-[#E3DDD1] dark:border-[#2B3835] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                <span className="font-bold text-[#1C201E] dark:text-[#F5F7F6]">Inbound Inspection & GRN</span>
              </div>
              <span className="text-[10px] text-[#68716D]">Today, 11:05</span>
            </div>

            <div className="p-2.5 rounded-xs bg-white dark:bg-[#181D1C] border border-[#E3DDD1] dark:border-[#2B3835] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                <span className="font-bold text-[#1C201E] dark:text-[#F5F7F6]">Gate Inbound OCR Intake</span>
              </div>
              <span className="text-[10px] text-[#68716D]">Today, 09:40</span>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="pt-3 border-t border-[#E3DDD1] dark:border-[#2B3835]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xs bg-[#15803D] text-white text-xs font-mono font-bold hover:bg-[#166534] transition-colors shadow-2xs"
          >
            Close Telemetry Sheet
          </button>
        </div>

      </div>
    </div>
  );
}
