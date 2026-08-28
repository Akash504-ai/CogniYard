import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PalletSummary({ data }) {
  const inYard = data?.inYard !== undefined ? Number(data.inYard) : 154;
  const docked = data?.docked !== undefined ? Number(data.docked) : 48;
  const qcHold = data?.qcHold !== undefined ? Number(data.qcHold) : 15;
  const inTransit = data?.inTransit !== undefined ? Number(data.inTransit) : 21;

  const totalPallets = inYard + docked + qcHold + inTransit;
  const safeTotal = totalPallets > 0 ? totalPallets : 1;

  const chartData = [
    { name: 'In Yard', value: inYard, percentage: `${Math.round((inYard / safeTotal) * 100)}%`, color: '#15803D' },
    { name: 'Docked', value: docked, percentage: `${Math.round((docked / safeTotal) * 100)}%`, color: '#2563EB' },
    { name: 'QC Hold', value: qcHold, percentage: `${Math.round((qcHold / safeTotal) * 100)}%`, color: '#7C3AED' },
    { name: 'In Transit', value: inTransit, percentage: `${Math.round((inTransit / safeTotal) * 100)}%`, color: '#F97316' }
  ];

  return (
    <div className="rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] p-4 shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-2 select-none">
      
      {/* Header */}
      <div className="pb-1 border-b border-[#E3DDD1] dark:border-[#2B3835]">
        <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
          Pallet Summary
        </h3>
      </div>

      {/* Donut Chart & Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        {/* Donut Chart with Center Text */}
        <div className="relative w-32 h-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={36}
                outerRadius={54}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#FCFAF4" strokeWidth={1} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Donut Metric */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6] leading-none">
              {totalPallets}
            </span>
            <span className="text-[9px] font-mono text-[#68716D] dark:text-[#8E9C97] mt-0.5">
              Total Pallets
            </span>
          </div>
        </div>

        {/* Legend Breakdown */}
        <div className="space-y-1.5 font-sans text-xs flex-1">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[#1C201E] dark:text-[#F5F7F6] font-medium">{item.name}</span>
              </div>
              <span className="font-mono text-[#68716D] dark:text-[#8E9C97]">
                {item.value} ({item.percentage})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
