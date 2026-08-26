import React from 'react';
import { Truck } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function DockStatusBoard({ queueData = [] }) {
  const defaultQueue = [
    { truck: 'WB 25 AB 1234', status: 'At Gate', badgeColor: 'bg-[#FEF3C7] text-[#D97706]', eta: '10 min' },
    { truck: 'WB 11 CD 5678', status: 'Docked - D1', badgeColor: 'bg-[#DBEAFE] text-[#2563EB]', eta: '--' },
    { truck: 'WB 19 EF 9012', status: 'Docked - D4', badgeColor: 'bg-[#DBEAFE] text-[#2563EB]', eta: '--' },
    { truck: 'WB 21 GH 3456', status: 'In Queue', badgeColor: 'bg-[#FFEDD5] text-[#EA580C]', eta: '25 min' },
    { truck: 'WB 17 IJ 6789', status: 'In Queue', badgeColor: 'bg-[#FFEDD5] text-[#EA580C]', eta: '40 min' }
  ];

  const items = queueData.length > 0 ? queueData : defaultQueue;

  return (
    <div className="rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] p-4 shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-2 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[#E3DDD1] dark:border-[#2B3835]">
        <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
          Dock Queue
        </h3>
        <NavLink to="/logistics" className="text-xs font-sans text-[#2563EB] hover:underline">
          View All
        </NavLink>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-[#E3DDD1] dark:border-[#2B3835] text-[10px] text-[#68716D] dark:text-[#8E9C97]">
              <th className="py-1.5 font-semibold">Truck / Vehicle</th>
              <th className="py-1.5 font-semibold">Status</th>
              <th className="py-1.5 font-semibold text-right">ETA / Wait</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3DDD1]/60 dark:divide-[#2B3835]/60">
            {items.map((row, idx) => (
              <tr key={idx} className="hover:bg-[#F4EFE6]/50 transition-colors">
                <td className="py-2 flex items-center gap-1.5 font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                  <Truck className="w-3.5 h-3.5 text-[#68716D]" />
                  <span>{row.truck}</span>
                </td>
                <td className="py-2">
                  <span className={`px-1.5 py-0.5 rounded-[2px] text-[8px] sm:text-[9px] font-bold ${row.badgeColor}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-2 text-right text-[#68716D] dark:text-[#8E9C97]">
                  {row.eta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
