import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PaperSheet, SectionHeader } from '../components/layout/PaperSheet';
import { 
  ShieldCheck, 
  Truck, 
  AlertTriangle, 
  ShoppingCart, 
  FileText, 
  Boxes, 
  RefreshCw, 
  Clock, 
  Building2, 
  PackageCheck, 
  Receipt, 
  Scale, 
  CreditCard,
  Sparkles,
  Activity,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid
} from 'recharts';

export default function ExecutiveControlTower() {
  const { showNotification, setIsAiOpen } = useAuth();
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchControlTowerData = async () => {
    try {
      setLoading(true);
      const res = await analyticsAPI.getControlTower();
      setData(res.data);
    } catch (err) {
      console.error('Error fetching control tower analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControlTowerData();
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-[#5D6560]">
        <div className="w-8 h-8 border-2 border-[#166534]/20 border-t-[#166534] rounded-full animate-spin" />
        <span className="font-mono text-xs font-semibold">Connecting Executive Control Tower Telemetry...</span>
      </div>
    );
  }

  const { flowCounts = {}, kpis = [] } = data;

  const flowNodes = [
    { key: 'suppliers', label: 'Suppliers', count: flowCounts.suppliers || 4, icon: Building2 },
    { key: 'prs', label: 'PR Queue', count: flowCounts.prs || 6, icon: ShoppingCart },
    { key: 'pos', label: 'POs Issued', count: flowCounts.pos || 5, icon: FileText },
    { key: 'trucks', label: 'Trucks Inbound', count: flowCounts.trucks || 8, icon: Truck },
    { key: 'yard', label: 'Yard Staged', count: flowCounts.yard || 4, icon: Activity },
    { key: 'dock', label: 'Docked Bays', count: flowCounts.dock || 3, icon: Boxes },
    { key: 'receiving', label: 'GRNs Logged', count: flowCounts.receiving || 4, icon: PackageCheck },
    { key: 'invoices', label: 'Invoices In', count: flowCounts.invoices || 4, icon: Receipt },
    { key: 'threeWayMatch', label: '3-Way Match', count: flowCounts.threeWayMatch || 3, icon: Scale },
    { key: 'payment', label: 'Disbursed', count: flowCounts.payment || 2, icon: CreditCard }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      
      {/* EXECUTIVE HEADER */}
      <PaperSheet variant="default" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#166534] text-white font-mono font-bold text-xs">
                TWR
              </span>
              <h1 className="text-lg font-bold font-sans tracking-tight text-[#1A1F1D] dark:text-[#F2F4F3] uppercase">
                Executive Supply Chain Control Tower
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-xs bg-[#15803D]/15 text-[#15803D] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] animate-pulse" />
                TELEMETRY LIVE
              </span>
            </div>
            <p className="text-xs text-[#5D6560] dark:text-[#A3ACA8] mt-1">
              End-to-end operational visibility across Procurement, Yard Operations, Inventory Density, and Financial Settlements.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchControlTowerData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#166534] text-white text-xs font-mono font-semibold hover:bg-[#15803D] transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Poll Telemetry</span>
          </button>
        </div>
      </PaperSheet>

      {/* 10-NODE FLOW COUNTS (HORIZONTAL PIPELINE) */}
      <PaperSheet variant="grid" className="p-4 sm:p-6 space-y-3">
        <SectionHeader
          title="End-to-End Operational Pipeline Telemetry"
          subtitle="Real-time volume distribution across supply chain stages"
          icon={Layers}
        />

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 font-mono text-xs">
          {flowNodes.map((node) => {
            const Icon = node.icon;
            return (
              <div
                key={node.key}
                className="p-3 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] text-center space-y-1"
              >
                <Icon className="w-4 h-4 mx-auto text-[#166534] dark:text-[#15803D]" />
                <div className="text-lg font-bold text-[#1A1F1D] dark:text-[#F2F4F3]">
                  {node.count}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-[#5D6560] dark:text-[#A3ACA8] truncate">
                  {node.label}
                </div>
              </div>
            );
          })}
        </div>
      </PaperSheet>

      {/* FLOW VOLUME BAR CHART */}
      <PaperSheet variant="default" className="p-4 sm:p-6 space-y-4">
        <SectionHeader
          title="Pipeline Volume Distribution"
          subtitle="Stage-by-stage operational load comparison"
          icon={Activity}
        />

        <div className="h-64 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flowNodes}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2B3533' : '#DDD9CF'} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} stroke={isDark ? '#707A76' : '#8A908B'} />
              <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} stroke={isDark ? '#707A76' : '#8A908B'} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: isDark ? '#181D1C' : '#FBFAF5',
                  borderColor: isDark ? '#2B3533' : '#DDD9CF',
                  borderRadius: 4,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11
                }}
              />
              <Bar dataKey="count" fill="#166534" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PaperSheet>
    </div>
  );
}
