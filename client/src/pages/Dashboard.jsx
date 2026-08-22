import React, { useState, useEffect } from 'react';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { analyticsAPI } from '../services/api';
import { 
  ShoppingCart, 
  Truck, 
  Receipt, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Boxes, 
  ArrowUpRight,
  RefreshCw,
  Activity,
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  CartesianGrid
} from 'recharts';

export default function Dashboard() {
  const { currentRole, setIsAiOpen } = useAuth();
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [currentRole]);

  const fetchDashboardData = async () => {
    try {
      setIsRefreshing(true);
      const res = await analyticsAPI.getAnalytics();
      setData(res.data);
    } catch (err) {
      console.error('Error loading dashboard analytics:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Modern Indigo-Zinc dynamic color palette
  const PIE_COLORS = isDark 
    ? ['#6366f1', '#a855f7', '#38bdf8', '#f43f5e']
    : ['#4f46e5', '#9333ea', '#0284c7', '#e11d48'];

  if (loading || !data) {
    return (
      <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center min-h-[70vh] relative overflow-hidden">
        <div className="absolute w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-mono tracking-tight">
            Syncing Supply Chain Control Tower Telemetry...
          </p>
        </div>
      </div>
    );
  }

  const { metrics, charts } = data;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      
      {/* Top Banner & Telemetry Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <span>{ROLE_LABELS?.[currentRole] || currentRole} Command Center</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-mono font-medium border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Procure-to-Pay (PR2) & Yard Inbound Logistics (E2) Operational Telemetry
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAiOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Ask Grok</span>
            </button>

            <button
              onClick={fetchDashboardData}
              disabled={isRefreshing}
              className="text-xs px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh Feed'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Procurement */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl space-y-3 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Open PR Pipelines
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {metrics.procurement.openPRs}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
            <span>Pending Approvals</span>
          </div>
        </div>

        {/* KPI 2: Logistics */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl space-y-3 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Active Yard Trucks
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {metrics.logistics.activeTrucks}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{metrics.logistics.delayedTrucks} Delayed in Transit</span>
          </div>
        </div>

        {/* KPI 3: Dock Operations */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl space-y-3 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Dock Availability
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {metrics.logistics.availableDocks} <span className="text-zinc-400 text-lg font-normal">/ {metrics.logistics.totalDocks}</span>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {metrics.logistics.occupiedDocks} Active Unloadings
          </div>
        </div>

        {/* KPI 4: 3-Way Match */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl space-y-3 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Invoice Exceptions
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {metrics.finance.exceptionInvoices}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
            Action Required • Payments On Hold
          </div>
        </div>

      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Spend Distribution Bar Chart */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Procurement Spend Breakdown ($)
              </h3>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">By Product Category</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.spendByCategory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#27272a' : '#f4f4f5'} />
                <XAxis 
                  dataKey="name" 
                  stroke={isDark ? '#71717a' : '#a1a1aa'} 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke={isDark ? '#71717a' : '#a1a1aa'} 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  cursor={{ fill: isDark ? '#27272a40' : '#f4f4f580' }}
                  contentStyle={{
                    backgroundColor: isDark ? '#09090b' : '#ffffff',
                    borderColor: isDark ? '#27272a' : '#e4e4e7',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    color: isDark ? '#f4f4f5' : '#09090b',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                />
                <Bar 
                  dataKey="spend" 
                  fill={isDark ? '#6366f1' : '#4f46e5'} 
                  radius={[6, 6, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3-Way Match Status Donut Chart */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-purple-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                3-Way Match Integrity
              </h3>
            </div>
          </div>

          <div className="h-48 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.matchRateDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {charts.matchRateDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={PIE_COLORS[index % PIE_COLORS.length]} 
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#09090b' : '#ffffff',
                    borderColor: isDark ? '#27272a' : '#e4e4e7',
                    borderRadius: '12px',
                    color: isDark ? '#f4f4f5' : '#09090b',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
            <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/60">
              <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Fully Matched</span>
              </span>
              <strong className="font-mono text-zinc-900 dark:text-zinc-100">{metrics.finance.matchedInvoices}</strong>
            </div>
            <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/60">
              <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Exceptions</span>
              </span>
              <strong className="font-mono text-rose-500">{metrics.finance.exceptionInvoices}</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}