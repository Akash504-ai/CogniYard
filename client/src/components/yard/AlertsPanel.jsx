import React from 'react';
import { AlertTriangle, Clock, Layers, ShieldAlert } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function AlertsPanel({ alertsData = [] }) {
  const defaultAlerts = [
    {
      id: '1',
      title: 'High Dwell Time',
      description: 'Truck WB 21 GH 3456 waiting for 45+ min',
      time: '10 min ago',
      icon: AlertTriangle,
      bg: 'bg-[#FEE2E2] dark:bg-[#351C1C]',
      border: 'border-[#FECACA] dark:border-[#522525]',
      iconColor: 'text-[#DC2626]',
      titleColor: 'text-[#DC2626]'
    },
    {
      id: '2',
      title: 'LPN Unassigned',
      description: '12 LPNS are not assigned to any location',
      time: '25 min ago',
      icon: Layers,
      bg: 'bg-[#FEF3C7] dark:bg-[#332A15]',
      border: 'border-[#FDE68A] dark:border-[#4D3F1D]',
      iconColor: 'text-[#D97706]',
      titleColor: 'text-[#D97706]'
    },
    {
      id: '3',
      title: 'QC Hold',
      description: '8 LPNS in QC Hold for more than 12 hrs',
      time: '1 hr ago',
      icon: ShieldAlert,
      bg: 'bg-[#EDE9FE] dark:bg-[#281E3B]',
      border: 'border-[#DDD6FE] dark:border-[#3D2C5E]',
      iconColor: 'text-[#7C3AED]',
      titleColor: 'text-[#7C3AED]'
    }
  ];

  const items = alertsData.length > 0 ? alertsData : defaultAlerts;

  return (
    <div className="rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] p-4 shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-2 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[#E3DDD1] dark:border-[#2B3835]">
        <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
          Alerts
        </h3>
        <NavLink to="/exceptions" className="text-xs font-sans text-[#2563EB] hover:underline">
          View All
        </NavLink>
      </div>

      {/* Alert Items List */}
      <div className="space-y-2">
        {items.map((alert) => {
          const Icon = alert.icon || AlertTriangle;
          return (
            <div
              key={alert.id}
              className={`p-2.5 rounded-[2px] border ${alert.bg} ${alert.border} flex items-start gap-2.5 transition-colors`}
            >
              <div className={`p-1 rounded-xs ${alert.iconColor} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 font-sans">
                <div className="flex items-center justify-between gap-1">
                  <span className={`font-bold text-xs ${alert.titleColor}`}>
                    {alert.title}
                  </span>
                  <span className="text-[10px] font-mono text-[#68716D] dark:text-[#8E9C97] shrink-0">
                    {alert.time}
                  </span>
                </div>
                <p className="text-[11px] text-[#1C201E] dark:text-[#F5F7F6] leading-tight mt-0.5">
                  {alert.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
