import React from 'react';
import { ShoppingCart, CheckCircle2, FileText, Building2, Truck, ShieldCheck, PackageCheck } from 'lucide-react';

export default function ProcurementTimeline({ po, activeStep = 3 }) {
  const steps = [
    { label: 'Requisition', desc: 'PR Approved', icon: ShoppingCart },
    { label: 'PO Issued', desc: po?.poNumber || 'PO Generated', icon: FileText },
    { label: 'Supplier Ack', desc: 'Confirmed', icon: Building2 },
    { label: 'In Transit', desc: 'GPS Dispatched', icon: Truck },
    { label: 'Gate Arrival', desc: 'OCR Verified', icon: ShieldCheck },
    { label: 'GRN Receiving', desc: 'Stock Added', icon: PackageCheck }
  ];

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between relative overflow-x-auto min-w-[600px] pb-1">
        {steps.map((step, idx) => {
          const isPassed = idx < activeStep;
          const isCurrent = idx === activeStep;
          const Icon = step.icon;

          return (
            <div key={step.label} className="flex-1 flex flex-col items-center text-center relative group">
              <div className={`w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold transition-transform shadow-2xs z-10 ${
                isPassed
                  ? 'bg-[#15803D] text-white border border-[#166534]'
                  : isCurrent
                  ? 'bg-[#FBFAF5] dark:bg-[#181D1C] text-[#15803D] border-2 border-[#15803D] ring-2 ring-[#15803D]/20 animate-pulse'
                  : 'bg-[#EAE7DC] dark:bg-[#252D2B] text-[#8A908B] dark:text-[#707A76] border border-[#DDD9CF] dark:border-[#2B3533]'
              }`}>
                {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </div>

              <span className="font-mono text-[10px] font-bold mt-1 text-[#1A1F1D] dark:text-[#F2F4F3]">
                {step.label}
              </span>
              <span className="font-mono text-[9px] text-[#5D6560] dark:text-[#A3ACA8] truncate max-w-20">
                {step.desc}
              </span>

              {idx < steps.length - 1 && (
                <div className={`h-0.5 absolute left-[50%] right-[-50%] top-3.5 z-0 ${
                  isPassed ? 'bg-[#15803D]' : 'bg-[#DDD9CF] dark:bg-[#2B3533]'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
