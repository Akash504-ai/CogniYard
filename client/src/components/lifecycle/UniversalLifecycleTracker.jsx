import React, { useState } from 'react';
import { 
  ShoppingCart, 
  FileText, 
  Truck, 
  ShieldCheck, 
  Route, 
  Boxes, 
  PackageCheck, 
  Receipt, 
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  ExternalLink
} from 'lucide-react';

const STAGES = [
  { key: 'PR', label: 'Requisition', code: 'PR-1002', icon: ShoppingCart, defaultStatus: 'COMPLETED', time: '09:30 AM', detail: '500 Bearings Approved' },
  { key: 'PO', label: 'Purchase Order', code: 'PO-4001', icon: FileText, defaultStatus: 'COMPLETED', time: '10:15 AM', detail: 'Dispatched to Acme Steel' },
  { key: 'TRANSIT', label: 'Inbound Transit', code: 'TRK-1007', icon: Truck, defaultStatus: 'COMPLETED', time: '01:45 PM', detail: 'GPS Geofence Cleared' },
  { key: 'GATE', label: 'Gate Verification', code: 'GATE-01', icon: ShieldCheck, defaultStatus: 'COMPLETED', time: '02:10 PM', detail: 'Plate & Driver Verified' },
  { key: 'YARD', label: 'Yard Staging', code: 'STALL-02', icon: Route, defaultStatus: 'CURRENT', time: '02:25 PM', detail: 'Waiting for Dock D-02' },
  { key: 'DOCK', label: 'Dock Unloading', code: 'DOCK-02', icon: Boxes, defaultStatus: 'PENDING', time: 'Est. 02:40 PM', detail: 'Bay Ready' },
  { key: 'GRN', label: 'Goods Receipt', code: 'GRN-5011', icon: PackageCheck, defaultStatus: 'PENDING', time: 'Est. 03:05 PM', detail: 'Quality Check & Stock' },
  { key: 'INVOICE', label: 'Supplier Invoice', code: 'INV-8810', icon: Receipt, defaultStatus: 'PENDING', time: 'Est. 03:30 PM', detail: 'Cloud Invoice Uploaded' },
  { key: 'PAYMENT', label: '3-Way Match & Pay', code: 'PAY-904', icon: CreditCard, defaultStatus: 'PENDING', time: 'Est. 04:00 PM', detail: 'Auto-Matched & Paid' }
];

export default function UniversalLifecycleTracker({ 
  activeStage = 'YARD',
  poNumber = 'PO-4001',
  vendorName = 'Acme Steel Pvt Ltd',
  customStages = null
}) {
  const [selectedStage, setSelectedStage] = useState(null);
  const stages = customStages || STAGES;

  const getStageStatus = (stageIndex, activeKey) => {
    const activeIndex = stages.findIndex(s => s.key === activeKey);
    if (stageIndex < activeIndex) return 'COMPLETED';
    if (stageIndex === activeIndex) return 'CURRENT';
    return 'PENDING';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return {
          badge: 'bg-[#15803D] text-[#FBFAF5] border-[#166534]',
          line: 'bg-[#15803D]',
          text: 'text-[#15803D] dark:text-[#15803D]'
        };
      case 'CURRENT':
        return {
          badge: 'bg-[#FBFAF5] dark:bg-[#181D1C] text-[#15803D] border-2 border-[#15803D] ring-2 ring-[#15803D]/20 animate-pulse',
          line: 'bg-[#DDD9CF] dark:bg-[#2B3533]',
          text: 'text-[#1A1F1D] dark:text-[#F2F4F3] font-bold'
        };
      case 'EXCEPTION':
        return {
          badge: 'bg-[#DC2626] text-[#FBFAF5] border-[#DC2626]',
          line: 'bg-[#DC2626]',
          text: 'text-[#DC2626]'
        };
      default:
        return {
          badge: 'bg-[#EAE7DC] dark:bg-[#252D2B] text-[#8A908B] dark:text-[#707A76] border-[#DDD9CF] dark:border-[#2B3533]',
          line: 'bg-[#DDD9CF] dark:bg-[#2B3533]',
          text: 'text-[#8A908B] dark:text-[#707A76]'
        };
    }
  };

  return (
    <div className="w-full">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[#DDD9CF] dark:border-[#2B3533]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5D6560] dark:text-[#A3ACA8]">
            Order Lifecycle Route
          </span>
          <span className="font-mono text-xs font-bold px-1.5 py-0.2 rounded-sm bg-[#166534]/10 text-[#166534] dark:bg-[#15803D]/20 dark:text-[#15803D]">
            {poNumber}
          </span>
          <span className="text-xs text-[#5D6560] dark:text-[#A3ACA8]">
            • {vendorName}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#8A908B]">
          Click any stage for operational telemetry
        </span>
      </div>

      {/* Horizontal Process Strip */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[760px] flex items-center justify-between relative py-2">
          {stages.map((stage, idx) => {
            const status = stage.status || getStageStatus(idx, activeStage);
            const style = getStatusColor(status);
            const Icon = stage.icon;
            const isLast = idx === stages.length - 1;

            return (
              <div key={stage.key} className="flex-1 flex items-center relative group">
                {/* Node Button */}
                <button
                  type="button"
                  onClick={() => setSelectedStage(stage)}
                  className="flex flex-col items-center text-center focus:outline-none z-10 mx-auto"
                >
                  <div className={`w-8 h-8 rounded-sm flex items-center justify-center transition-transform transform group-hover:scale-105 shadow-xs ${style.badge}`}>
                    {status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  
                  <span className="font-mono text-[10px] font-bold mt-1.5 truncate max-w-20 text-[#1A1F1D] dark:text-[#F2F4F3]">
                    {stage.label}
                  </span>
                  <span className="font-mono text-[9px] text-[#5D6560] dark:text-[#A3ACA8] truncate max-w-20">
                    {stage.code}
                  </span>
                </button>

                {/* Connecting Route Line */}
                {!isLast && (
                  <div className={`h-0.5 absolute left-[50%] right-[-50%] top-4 z-0 ${style.line}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Dialog Drawer */}
      {selectedStage && (
        <div className="mt-3 p-3.5 rounded-sm bg-[#F3F1E8] dark:bg-[#1E2423] border border-[#DDD9CF] dark:border-[#2B3533] flex items-start justify-between gap-4 animate-in fade-in duration-150 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold uppercase text-[#166534] dark:text-[#15803D]">
                Stage: {selectedStage.label} ({selectedStage.code})
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm bg-[#DDD9CF] dark:bg-[#2B3533] text-[#5D6560] dark:text-[#A3ACA8]">
                {selectedStage.time}
              </span>
            </div>
            <p className="text-[#5D6560] dark:text-[#A3ACA8]">
              {selectedStage.detail}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedStage(null)}
            className="text-[#8A908B] hover:text-[#1A1F1D] dark:hover:text-[#F2F4F3] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
