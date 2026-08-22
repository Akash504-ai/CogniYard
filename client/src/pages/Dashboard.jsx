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
  RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const { currentRole } = useAuth();
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [currentRole]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await analyticsAPI.getAnalytics();
      setData(res.data);
    } catch (err) {
      console.error('Error loading dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Monochromatic neutral chart color tokens
  const PIE_COLORS = isDark 
    ? ['#e4e4e7', '#a1a1aa', '#71717a', '#3f3f46']
    : ['#18181b', '#52525b', '#a1a1aa', '#d4d4d8'];

  if (loading || !data) {
    return (
      <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-medium">Loading SCM Control Tower...</p>
      </div>
    );
  }

  const { metrics, charts } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl transition-colors">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <span>{ROLE_LABELS[currentRole]} Control Tower</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
              Live Sync
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Procure-to-Pay (PR2) & Yard Logistics (E2) Analytics Overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="text-xs px-3 py-1.5 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl space-y-2 transition-colors">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Open Requisitions</span>
            <ShoppingCart className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{metrics.procurement.openPRs}</div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
            <span>Pending Manager Approval</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl space-y-2 transition-colors">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Active Yard Trucks</span>
            <Truck className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{metrics.logistics.activeTrucks}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{metrics.logistics.delayedTrucks} Delayed in Transit</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl space-y-2 transition-colors">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Dock Availability</span>
            <Boxes className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {metrics.logistics.availableDocks} / {metrics.logistics.totalDocks}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {metrics.logistics.occupiedDocks} Occupied Bay(s)
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl space-y-2 transition-colors">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>3-Way Match Exceptions</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{metrics.finance.exceptionInvoices}</div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
            Payment ON_HOLD
          </div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Spend by Category */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl transition-colors">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>Procurement Spend Distribution ($)</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.spendByCategory}>
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#18181b' : '#ffffff',
                    borderColor: isDark ? '#27272a' : '#e4e4e7',
                    borderRadius: '6px',
                    color: isDark ? '#f4f4f5' : '#09090b',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="spend" fill={isDark ? '#a1a1aa' : '#18181b'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: 3-Way Match Status */}
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl flex flex-col justify-between transition-colors">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>3-Way Invoice Match Status</span>
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.matchRateDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {charts.matchRateDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#18181b' : '#ffffff',
                    borderColor: isDark ? '#27272a' : '#e4e4e7',
                    borderRadius: '6px',
                    color: isDark ? '#f4f4f5' : '#09090b',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400"><span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-200"></span> Matched Invoices</span>
              <strong className="text-zinc-900 dark:text-zinc-100">{metrics.finance.matchedInvoices}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Mismatches</span>
              <strong className="text-rose-500">{metrics.finance.exceptionInvoices}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
