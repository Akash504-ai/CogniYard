import React from 'react';
import { 
  Boxes, 
  X, 
  MapPin, 
  FileText, 
  Clock, 
  ArrowRight, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  Building2 
} from 'lucide-react';

export default function LPNDetailSheet({ lpn, isOpen, onClose }) {
  if (!isOpen || !lpn) return null;

  const movementHistory = [
    { time: '10:25 AM', action: 'Relocated to Rack Slot', from: 'DOCK D-01', to: lpn.location || 'YARD-A-05', by: 'Forklift Op #3' },
    { time: '09:40 AM', action: 'Goods Receipt Note Generated', from: 'TRK-WB25AB', to: 'RECEIVING DOCK', by: 'Inspector Verma' },
    { time: '09:15 AM', action: 'Gate OCR Checkpoint Inbound', from: 'HIGHWAY GATE 01', to: 'IN YARD', by: 'Auto Scanner' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
      <div 
        className="h-full w-full max-w-md bg-[#FBFAF5] dark:bg-[#181D1C] border-l border-[#DDD9CF] dark:border-[#2B3533] p-5 overflow-y-auto text-[#1A1F1D] dark:text-[#F2F4F3] shadow-2xl flex flex-col justify-between space-y-6 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#DDD9CF] dark:border-[#2B3533]">
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#166534] dark:text-[#15803D]" />
              <div>
                <h3 className="font-mono text-sm font-bold tracking-wider uppercase">
                  LPN Inventory Record
                </h3>
                <span className="font-mono text-xs text-[#166534] dark:text-[#15803D] font-bold">
                  {lpn.lpnId || lpn.id || 'LPN-0004521'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-sm text-[#8A908B] hover:text-[#1A1F1D] dark:hover:text-[#F2F4F3]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-sm bg-[#F3F1E8] dark:bg-[#1E2423] border border-[#DDD9CF] dark:border-[#2B3533]">
              <span className="text-[10px] font-mono text-[#8A908B]">Current Location:</span>
              <p className="font-mono text-xs font-bold text-[#166534] dark:text-[#15803D] mt-0.5">
                {lpn.location || 'YARD-A-05'}
              </p>
            </div>
            <div className="p-3 rounded-sm bg-[#F3F1E8] dark:bg-[#1E2423] border border-[#DDD9CF] dark:border-[#2B3533]">
              <span className="text-[10px] font-mono text-[#8A908B]">Pallet Count:</span>
              <p className="font-mono text-xs font-bold text-[#1A1F1D] dark:text-[#F2F4F3] mt-0.5">
                {lpn.pallets || 24} Pallets
              </p>
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-xs bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533]">
              <span className="text-[#5D6560] dark:text-[#A3ACA8]">Associated PO:</span>
              <strong className="text-[#166534] dark:text-[#15803D]">{lpn.po || 'PO-78342'}</strong>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xs bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533]">
              <span className="text-[#5D6560] dark:text-[#A3ACA8]">Supplier Vendor:</span>
              <span className="font-sans font-semibold truncate max-w-44 text-right">
                {lpn.supplier || 'Acme Steel Pvt Ltd'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xs bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533]">
              <span className="text-[#5D6560] dark:text-[#A3ACA8]">Status:</span>
              <span className="px-1.5 py-0.2 rounded-xs text-[10px] bg-[#15803D]/15 text-[#15803D] font-bold">
                {lpn.status || 'STORED / ACTIVE'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xs bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533]">
              <span className="text-[#5D6560] dark:text-[#A3ACA8]">Item Description:</span>
              <span className="font-sans font-semibold truncate max-w-44 text-right">
                {lpn.item || 'Industrial Precision Bearings'}
              </span>
            </div>
          </div>

          {/* Movement Audit Log */}
          <div className="space-y-2">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#5D6560] dark:text-[#A3ACA8]">
              Chain of Custody History
            </h4>
            <div className="space-y-2">
              {movementHistory.map((h, i) => (
                <div key={i} className="p-2.5 rounded-sm bg-[#F3F1E8] dark:bg-[#1E2423] border border-[#DDD9CF] dark:border-[#2B3533] text-[11px] space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#8A908B]">
                    <span>{h.time}</span>
                    <span>{h.by}</span>
                  </div>
                  <div className="font-semibold text-[#1A1F1D] dark:text-[#F2F4F3]">{h.action}</div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-[#5D6560] dark:text-[#A3ACA8]">
                    <span>{h.from}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-bold text-[#166534] dark:text-[#15803D]">{h.to}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#DDD9CF] dark:border-[#2B3533] space-y-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-sm bg-[#166534] text-white text-xs font-mono font-semibold hover:bg-[#15803D] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print LPN Barcode Label</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-sm border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-mono text-[#5D6560] dark:text-[#A3ACA8] hover:bg-[#F3F1E8]"
          >
            Close Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
