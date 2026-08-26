import React from 'react';
import {
  FileText,
  Truck,
  Move,
  Printer,
  ClipboardCheck
} from 'lucide-react';

export default function QuickActionsSheet({ onAction }) {
  const actions = [
    { id: 'create_lpn', label: 'Create LPN', icon: FileText },
    { id: 'receive_inbound', label: 'Receive Inbound', icon: Truck },
    { id: 'move_relocate', label: 'Move / Relocate', icon: Move },
    { id: 'print_label', label: 'Print LPN Label', icon: Printer },
    { id: 'yard_audit', label: 'Yard Audit', icon: ClipboardCheck }
  ];

  return (
    <div className="relative rounded-[3px] bg-[#FCF2CD] dark:bg-[#292E22] border border-[#EEDBA5] dark:border-[#3F4735] p-4 shadow-[0_2px_5px_rgba(50,40,20,0.06)] space-y-3 select-none">
      
      {/* Attached Metallic Paperclip SVG graphic at top right */}
      <div className="absolute -top-2 right-4 z-10 w-5 h-8 pointer-events-none">
        <svg viewBox="0 0 20 36" fill="none" className="w-full h-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
          <path
            d="M 6 12 L 6 26 A 4 4 0 0 0 14 26 L 14 8 A 6 6 0 0 0 2 8 L 2 24 A 8 8 0 0 0 18 24 L 18 10"
            stroke="#9CA3AF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Note Header */}
      <div className="pb-1 border-b border-[#EEDBA5] dark:border-[#3F4735]">
        <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
          Quick Actions
        </h3>
      </div>

      {/* Action Items List */}
      <div className="space-y-2 font-sans text-xs">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={() => onAction?.(act.id)}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xs text-[#1C201E] dark:text-[#F5F7F6] hover:bg-[#F8EBB8] dark:hover:bg-[#32392A] transition-colors text-left group"
            >
              <div className="p-1 rounded-xs bg-[#F4E4A8] dark:bg-[#3B4431] border border-[#EEDBA5] dark:border-[#4A553E] text-[#1C201E] dark:text-[#F5F7F6] group-hover:scale-105 transition-transform">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="font-handwriting text-base font-semibold tracking-wide border-b border-dashed border-[#B8ADA0] group-hover:border-[#1C201E]">
                {act.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
