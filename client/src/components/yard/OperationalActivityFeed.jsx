import React from 'react';
import { NavLink } from 'react-router-dom';

export default function OperationalActivityFeed({ movesData = [] }) {
  const defaultMoves = [
    { time: '10:25 AM', lpn: 'LPN-0004521', from: 'D1', to: 'YARD A - A05', by: 'Rohit' },
    { time: '10:18 AM', lpn: 'PAL-009812', from: 'YARD B - B12', to: 'D4', by: 'Vikram' },
    { time: '10:11 AM', lpn: 'LPN-0004518', from: 'QC Hold', to: 'YARD C - C02', by: 'Neha' },
    { time: '10:03 AM', lpn: 'PAL-009801', from: 'YARD A - A02', to: 'YARD B - B07', by: 'Rohit' },
    { time: '09:58 AM', lpn: 'LPN-0004512', from: 'D2', to: 'YARD B - B03', by: 'Vikram' }
  ];

  const items = movesData.length > 0 ? movesData : defaultMoves;

  return (
    <div className="rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] p-4 shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-2 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[#E3DDD1] dark:border-[#2B3835]">
        <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
          Recent Moves
        </h3>
        <NavLink to="/inventory" className="text-xs font-sans text-[#2563EB] hover:underline">
          View All
        </NavLink>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-[#E3DDD1] dark:border-[#2B3835] text-[10px] text-[#68716D] dark:text-[#8E9C97]">
              <th className="py-1.5 font-semibold">Time</th>
              <th className="py-1.5 font-semibold">LPN / Pallet</th>
              <th className="py-1.5 font-semibold">From</th>
              <th className="py-1.5 font-semibold">To</th>
              <th className="py-1.5 font-semibold text-right">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3DDD1]/60 dark:divide-[#2B3835]/60">
            {items.map((m, idx) => (
              <tr key={idx} className="hover:bg-[#F4EFE6]/50 transition-colors">
                <td className="py-2 text-[#68716D] dark:text-[#8E9C97]">
                  {m.time}
                </td>
                <td className="py-2 font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                  {m.lpn}
                </td>
                <td className="py-2 text-[#68716D] dark:text-[#8E9C97]">
                  {m.from}
                </td>
                <td className="py-2 font-semibold text-[#15803D] dark:text-[#22C55E]">
                  {m.to}
                </td>
                <td className="py-2 text-right font-sans text-[#1C201E] dark:text-[#F5F7F6]">
                  {m.by}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
