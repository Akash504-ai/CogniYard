import React from 'react';
import { Building2, Award, Star } from 'lucide-react';

export default function SupplierScorecard({ supplier }) {
  const metrics = [
    { label: 'On-Time Delivery (OTD)', val: supplier?.otd || 94, target: '90%' },
    { label: 'Quality Acceptance Rate', val: supplier?.quality || 97, target: '95%' },
    { label: 'Invoice Accuracy Score', val: supplier?.invoiceAccuracy || 91, target: '88%' },
    { label: 'Contract Price Stability', val: supplier?.priceStability || 88, target: '85%' }
  ];

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#DDD9CF] dark:border-[#2B3533]">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#166534] dark:text-[#15803D]" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1A1F1D] dark:text-[#F2F4F3]">
            Supplier Matrix Performance
          </h4>
        </div>
        <span className="font-mono text-xs font-bold text-[#166534] dark:text-[#15803D] flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-current" />
          {supplier?.rating || '4.8★'} Tier 1
        </span>
      </div>

      <div className="space-y-2.5">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#5D6560] dark:text-[#A3ACA8] font-sans">{m.label}</span>
              <strong className="text-[#1A1F1D] dark:text-[#F2F4F3]">{m.val}%</strong>
            </div>
            <div className="w-full h-1.5 rounded-xs bg-[#EAE7DC] dark:bg-[#252D2B] overflow-hidden">
              <div
                className="h-full rounded-xs bg-[#15803D]"
                style={{ width: `${m.val}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
