import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  ShieldCheck, 
  Truck, 
  AlertTriangle, 
  ShoppingCart, 
  FileText, 
  Boxes, 
  Lock, 
  RefreshCw, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  PackageCheck, 
  Receipt, 
  Scale, 
  CreditCard,
  Sparkles,
  Activity,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Radio
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

export default function ExecutiveControlTower() {
  const { showNotification, setIsAiOpen } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState('Today');

  useEffect(() => {
    fetchControlTowerData();
  }, []);

  const fetchControlTowerData = async () => {
    try {
      setIsRefreshing(true);
      const res = await analyticsAPI.getControlTower();
      setData(res.data);
    } catch (err) {
      console.error('Error fetching control tower analytics:', err);
      showNotification('Error fetching Control Tower telemetry', 'warning');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const PIE_COLORS = isDark 
    ? ['#10b981', '#f43f5e', '#f59e0b', '#6366f1'] 
    : ['#059669', '#e11d48', '#d97706', '#4f46e5'];

  if (loading || !data) {
    return (
      <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center min-h-[75vh] relative overflow-hidden">
        <div className="absolute w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-mono tracking-tight">
            Connecting Executive Control Tower Telemetry...
          </p>
        </div>
      </div>
    );
  }

  const { kpis, flowCounts, exceptions, recentActivity, snapshots, charts } = data;

  const flowNodes = [
    { key: 'suppliers', label: 'Supplier', count: flowCounts.suppliers, icon: Building2 },
    { key: 'prs', label: 'PRs', count: flowCounts.prs, icon: ShoppingCart },
    { key: 'pos', label: 'POs', count: flowCounts.pos, icon: FileText },
    { key: 'shipments', label: 'Shipments', count: flowCounts.shipments, icon: Layers },
    { key: 'trucks', label: 'Trucks', count: flowCounts.trucks, icon: Truck },
    { key: 'yard', label: 'Yard', count: flowCounts.yard, icon: Activity },
    { key: 'dock', label: 'Docks', count: flowCounts.dock, icon: Boxes },
    { key: 'receiving', label: 'Receiving', count: flowCounts.receiving, icon: PackageCheck },
    { key: 'inventory', label: 'Stock', count: flowCounts.inventory, icon: Boxes },
    { key: 'invoices', label: 'Invoices', count: flowCounts.invoices, icon: Receipt },
    { key: 'threeWayMatch', label: '3-Way Match', count: flowCounts.threeWayMatch, icon: Scale },
    { key: 'payment', label: 'Paid', count: flowCounts.payment, icon: CreditCard },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <span>Executive Supply Chain Control Tower</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-mono font-medium border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Operational Telemetry
                </span>
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Unified real-time operational dashboard monitoring end-to-end Procurement, Yard Logistics, Dock Turnarounds, Inventory Levels, and Autonomous 3-Way Matching.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time Filter Controls */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
              {['Today', '7 Days', '30 Days'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    timeFilter === filter
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsAiOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Ask Copilot</span>
            </button>

            <button
              onClick={fetchControlTowerData}
              disabled={isRefreshing}
              className="text-xs px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP 6 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* KPI 1: Active Trucks */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4.5 rounded-2xl space-y-2.5 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Active Trucks
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {kpis.activeTrucks}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            Inbound & Yard Fleet
          </div>
        </div>

        {/* KPI 2: Delayed Trucks */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4.5 rounded-2xl space-y-2.5 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Delayed Trucks
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tracking-tight">
            {kpis.delayedTrucks}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold font-mono">
            {kpis.delayedPct}% of active fleet
          </div>
        </div>

        {/* KPI 3: Open PRs */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4.5 rounded-2xl space-y-2.5 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Open PRs
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {kpis.openPRs}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            Awaiting Approval
          </div>
        </div>

        {/* KPI 4: Pending POs */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4.5 rounded-2xl space-y-2.5 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Pending POs
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {kpis.pendingPOs}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            Active Fulfillment
          </div>
        </div>

        {/* KPI 5: Inventory Alerts */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4.5 rounded-2xl space-y-2.5 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Stock Alerts
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {kpis.inventoryAlertsCount}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            Items Requiring Stocking
          </div>
        </div>

        {/* KPI 6: Payments On Hold */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4.5 rounded-2xl space-y-2.5 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Payments On Hold
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tracking-tight">
            {kpis.paymentsOnHoldCount}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
            3-Way Discrepancy Lock
          </div>
        </div>

      </div>

      {/* SUPPLY CHAIN PROCESS FLOW VISUALIZATION */}
      <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              End-to-End Supply Chain Process Flow Telemetry
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">12 Operational Milestones Connected</span>
        </div>

        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex items-center gap-2 min-w-max">
            {flowNodes.map((node, index) => {
              const Icon = node.icon;
              return (
                <React.Fragment key={node.key}>
                  <div className="flex flex-col items-center p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 min-w-[105px] text-center space-y-1.5 hover:border-indigo-500/40 transition-all shadow-2xs">
                    <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight block">
                      {node.label}
                    </span>
                    <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800">
                      {node.count}
                    </span>
                  </div>

                  {index < flowNodes.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* CRITICAL EXCEPTIONS & RECENT ACTIVITY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CRITICAL EXCEPTIONS PANEL (2 COLS) */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Critical Exceptions Panel — What Needs Attention Now
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400 font-mono">{exceptions.length} Active Items</span>
              <button
                onClick={() => navigate('/exceptions')}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All Exceptions</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {exceptions.length > 0 ? (
              exceptions.map((ex) => (
                <div
                  key={ex.id}
                  className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 transition-all ${
                    ex.severity === 'CRITICAL'
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                      : ex.severity === 'WARNING'
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
                      : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border ${
                        ex.severity === 'CRITICAL'
                          ? 'bg-rose-500 text-white border-rose-600'
                          : ex.severity === 'WARNING'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-indigo-500 text-white border-indigo-600'
                      }`}>
                        {ex.severity}
                      </span>
                      <span className="text-zinc-900 dark:text-zinc-100">{ex.title}</span>
                    </div>
                    <p className="text-[11px] opacity-80 leading-relaxed font-mono">{ex.description}</p>
                  </div>
                  <span className="text-[10px] opacity-60 font-mono uppercase tracking-wider shrink-0 mt-0.5">
                    {ex.type}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-400 font-mono text-xs">
                ✅ No critical supply chain exceptions detected.
              </div>
            )}
          </div>
        </div>

        {/* RECENT ACTIVITY TIMELINE FEED (1 COL) */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Recent Supply Chain Audit Feed
              </h3>
            </div>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {recentActivity.map((log) => (
              <div key={log._id} className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{log.user || 'System'}</span>
                  <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-[11px]">{log.action}</div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">{log.details}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* OPERATIONAL SNAPSHOTS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Procurement Snapshot */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
            <ShoppingCart className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Procurement Snapshot
            </h4>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-500">Pending PRs:</span>
              <strong className="text-amber-600 dark:text-amber-400">{snapshots.procurement.pendingPRs}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Approved PRs:</span>
              <strong className="text-emerald-600 dark:text-emerald-400">{snapshots.procurement.approvedPRs}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Active POs:</span>
              <strong className="text-indigo-600 dark:text-indigo-400">{snapshots.procurement.activePOs}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Completed POs:</span>
              <strong className="text-zinc-900 dark:text-zinc-100">{snapshots.procurement.completedPOs}</strong>
            </div>
          </div>
        </div>

        {/* Yard Snapshot */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
            <Truck className="w-4 h-4 text-sky-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Yard & Fleet Snapshot
            </h4>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-500">In Transit:</span>
              <strong className="text-amber-600">{snapshots.yard.inTransit}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">At Gate / Yard:</span>
              <strong className="text-sky-600">{snapshots.yard.atGate + snapshots.yard.inYard}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">At Dock / Unloading:</span>
              <strong className="text-purple-600">{snapshots.yard.atDock + snapshots.yard.unloading}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Delayed:</span>
              <strong className="text-rose-600">{snapshots.yard.delayed}</strong>
            </div>
          </div>
        </div>

        {/* Finance Snapshot */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
            <Receipt className="w-4 h-4 text-purple-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Finance & AP Snapshot
            </h4>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-500">Invoices Ingested:</span>
              <strong className="text-zinc-900 dark:text-zinc-100">{snapshots.finance.invoicesTotal}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Matched 3-Way:</span>
              <strong className="text-emerald-600 dark:text-emerald-400">{snapshots.finance.matched}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Mismatches / On Hold:</span>
              <strong className="text-rose-600 dark:text-rose-400">{snapshots.finance.mismatched}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Settled (Paid):</span>
              <strong className="text-indigo-600 dark:text-indigo-400">{snapshots.finance.paid}</strong>
            </div>
          </div>
        </div>

        {/* Inventory Snapshot */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5 justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Inventory Stock Snapshot
              </h4>
            </div>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-500">Catalog SKUs:</span>
              <strong className="text-zinc-900 dark:text-zinc-100">{snapshots.inventory.totalItems}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Stock On Hand:</span>
              <strong className="text-emerald-600 dark:text-emerald-400">{snapshots.inventory.totalStockOnHand.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Low Stock Alerts:</span>
              <strong className="text-amber-600 dark:text-amber-400">{snapshots.inventory.lowStockItems}</strong>
            </div>
          </div>
        </div>

        {/* Inventory Planning Intelligence Snapshot */}
        <div 
          onClick={() => navigate('/inventory-planning')}
          className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent backdrop-blur-xl border border-indigo-500/30 p-5 rounded-2xl space-y-3 shadow-sm hover:border-indigo-500/60 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Inventory Intelligence
              </h4>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-500">Monitored:</span>
              <strong className="text-zinc-900 dark:text-zinc-100">{snapshots.inventoryPlanning?.totalMonitored || 3} SKUs</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Urgent Reorder:</span>
              <strong className="text-rose-600 dark:text-rose-400">{snapshots.inventoryPlanning?.urgentCount || 1}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-semibold text-indigo-600 dark:text-indigo-400">View Planning Engine →</span>
            </div>
          </div>
        </div>

      </div>

      {/* RECHARTS VISUALIZATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Pipeline Breakdown */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Procurement Pipeline Dynamics
            </h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.pipeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#27272a' : '#f4f4f5'} />
                <XAxis dataKey="name" stroke={isDark ? '#71717a' : '#a1a1aa'} fontSize={10} tickLine={false} />
                <YAxis stroke={isDark ? '#71717a' : '#a1a1aa'} fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#09090b' : '#ffffff',
                    borderColor: isDark ? '#27272a' : '#e4e4e7',
                    borderRadius: '12px',
                    color: isDark ? '#f4f4f5' : '#09090b',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill={isDark ? '#6366f1' : '#4f46e5'} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Fleet Status Distribution */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Fleet Status Distribution
            </h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.truckStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#27272a' : '#f4f4f5'} />
                <XAxis dataKey="name" stroke={isDark ? '#71717a' : '#a1a1aa'} fontSize={10} tickLine={false} />
                <YAxis stroke={isDark ? '#71717a' : '#a1a1aa'} fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#09090b' : '#ffffff',
                    borderColor: isDark ? '#27272a' : '#e4e4e7',
                    borderRadius: '12px',
                    color: isDark ? '#f4f4f5' : '#09090b',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill={isDark ? '#38bdf8' : '#0284c7'} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Finance Match Integrity */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              3-Way Match & Settlement Ratio
            </h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.financeStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {charts.financeStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
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
        </div>

      </div>

    </div>
  );
}