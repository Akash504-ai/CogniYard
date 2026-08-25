import React, { useEffect, useState } from 'react';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Activity, BarChart3, Boxes, Building2, IndianRupee, PackageCheck,
  Receipt, RefreshCw, ShoppingCart, Truck, Users, Sparkles
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Label, LabelList, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';

const CARD_ICONS = [ShoppingCart, Truck, PackageCheck, IndianRupee, Building2, Users, Receipt, Boxes];
const COLORS = ['#9333ea', '#0ea5e9', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6'];
const currency = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const compactNumber = value => Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));

export default function Dashboard() {
  const { currentRole, showNotification, setIsAiOpen } = useAuth();
  const { isDark } = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = async (quiet = false) => {
    try {
      quiet ? setRefreshing(true) : setLoading(true);
      setError('');
      const response = await analyticsAPI.getAnalytics();
      setDashboard(response.data.dashboard);
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Dashboard data could not be loaded.';
      setError(message);
      if (quiet) showNotification(message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [currentRole]);

  const tooltipStyle = {
    backgroundColor: isDark ? '#09090b' : '#ffffff',
    borderColor: isDark ? '#3f3f46' : '#e4e4e7',
    borderRadius: 12,
    color: isDark ? '#f4f4f5' : '#18181b',
    fontSize: 11
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-zinc-500">
        <div className="w-9 h-9 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <span className="text-xs font-semibold">Loading real operational data…</span>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-8 min-h-[70vh] flex items-center justify-center">
        <div className="max-w-md text-center rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6">
          <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error || 'No dashboard data available.'}</p>
          <button onClick={() => loadDashboard()} className="mt-4 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold">Try again</button>
        </div>
      </div>
    );
  }

  const renderChart = chart => {
    const chartData = chart.data || [];
    const hasValues = chartData.some(row => Number(row[chart.dataKey] || 0) !== 0);
    if (!chartData.length || !hasValues) {
      return <div className="h-60 flex items-center justify-center text-xs text-zinc-400">No data available</div>;
    }

    const total = chartData.reduce((sum, row) => sum + Number(row[chart.dataKey] || 0), 0);
    const formatValue = value => chart.format === 'currency'
      ? currency(value)
      : `${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}${chart.suffix || ''}`;
    const axisValue = value => chart.format === 'currency' ? `₹${compactNumber(value)}` : compactNumber(value);

    if (chart.type === 'pie') {
      return (
        <div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={chart.dataKey}
                nameKey="name"
                innerRadius={52}
                outerRadius={84}
                paddingAngle={3}
                labelLine={false}
                label={({ percent }) => `${Math.round(percent * 100)}%`}
              >
                {chartData.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatValue(value), name]} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2" aria-label={`${chart.title} distribution labels`}>
            {chartData.map((row, index) => (
              <div key={`${row.name}-distribution`} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 text-[10px]">
                <span className="inline-flex items-center gap-2 font-semibold"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />{row.name}</span>
                <span className="font-mono font-bold">{formatValue(row[chart.dataKey])} · {total ? Math.round(Number(row[chart.dataKey] || 0) / total * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const Chart = chart.type === 'line' ? LineChart : BarChart;
    return (
      <ResponsiveContainer width="100%" height={240}>
        <Chart data={chartData} margin={{ top: 20, right: 18, left: 14, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#27272a' : '#f4f4f5'} />
          <XAxis dataKey="name" height={48} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} stroke={isDark ? '#71717a' : '#a1a1aa'}>
            <Label value={chart.xAxisLabel || 'Category'} position="insideBottom" offset={-8} style={{ fontSize: 10, fill: isDark ? '#a1a1aa' : '#71717a', fontWeight: 700 }} />
          </XAxis>
          <YAxis width={74} tickFormatter={axisValue} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} stroke={isDark ? '#71717a' : '#a1a1aa'}>
            <Label value={chart.yAxisLabel || chart.valueLabel || 'Value'} angle={-90} position="insideLeft" offset={8} style={{ textAnchor: 'middle', fontSize: 10, fill: isDark ? '#a1a1aa' : '#71717a', fontWeight: 700 }} />
          </YAxis>
          <Tooltip contentStyle={tooltipStyle} formatter={value => [formatValue(value), chart.valueLabel || 'Value']} />
          {chart.type === 'line'
            ? <Line type="monotone" dataKey={chart.dataKey} name={chart.valueLabel || 'Value'} stroke="#9333ea" strokeWidth={2.5} dot={{ r: 3 }}><LabelList dataKey={chart.dataKey} position="top" formatter={axisValue} style={{ fontSize: 9, fill: isDark ? '#d4d4d8' : '#52525b' }} /></Line>
            : <Bar dataKey={chart.dataKey} name={chart.valueLabel || 'Value'} fill="#9333ea" radius={[6, 6, 0, 0]}><LabelList dataKey={chart.dataKey} position="top" formatter={axisValue} style={{ fontSize: 9, fill: isDark ? '#d4d4d8' : '#52525b' }} /></Bar>}
        </Chart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      <section className="rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center"><Activity className="w-4.5 h-4.5" /></span>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{dashboard.title}</h1>
              <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Database live
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">{dashboard.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* <button
              type="button"
              onClick={() => setIsAiOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask Copilot
            </button> */}

            <button
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh data'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {dashboard.kpis.map((kpi, index) => {
          const Icon = CARD_ICONS[index % CARD_ICONS.length];
          return (
            <article key={kpi.label} className="rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{kpi.label}</span>
                <span className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center"><Icon className="w-4 h-4" /></span>
              </div>
              <div className="mt-3 text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {kpi.format === 'currency' ? currency(kpi.value) : `${Number(kpi.value || 0).toLocaleString('en-IN')}${kpi.suffix || ''}`}
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">{kpi.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {dashboard.charts.map(chart => (
          <article key={chart.title} className="rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-5 shadow-sm">
            <div className="flex items-center gap-2 pb-3 mb-2 border-b border-zinc-100 dark:border-zinc-800">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">{chart.title}</h2>
            </div>
            <p className="text-[10px] text-zinc-500 mb-2">{chart.description || `${chart.valueLabel || 'Values'} distributed across ${chart.xAxisLabel || 'categories'}.`}</p>
            {renderChart(chart)}
          </article>
        ))}
      </section>
    </div>
  );
}
