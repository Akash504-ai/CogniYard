import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exceptionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Eye, 
  Filter, 
  RefreshCw, 
  ShieldAlert, 
  Sparkles, 
  Truck, 
  Receipt, 
  ShoppingCart, 
  Boxes, 
  X,
  Check,
  UserCheck,
  Building2,
  Lock,
  Layers,
  Activity,
  AlertCircle
} from 'lucide-react';

export default function ExceptionCenter() {
  const { currentUser, showNotification, setIsAiOpen } = useAuth();
  const navigate = useNavigate();

  const [exceptions, setExceptions] = useState([]);
  const [summary, setSummary] = useState({ totalOpen: 0, criticalCount: 0, warningCount: 0, infoCount: 0, resolvedTodayCount: 0 });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Open');
  const [sortOrder, setSortOrder] = useState('Newest');

  // Modals
  const [selectedExceptionDetail, setSelectedExceptionDetail] = useState(null);
  const [resolvingException, setResolvingException] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    fetchExceptions();
  }, []);

  const fetchExceptions = async () => {
    try {
      setIsRefreshing(true);
      const res = await exceptionAPI.getExceptions();
      setExceptions(res.data.exceptions || []);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching exceptions:', err);
      showNotification('Error loading Exception Center feed', 'warning');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleAcknowledge = async (id) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await exceptionAPI.acknowledgeException(id);
      showNotification(res.data.message || 'Exception acknowledged', 'success');
      fetchExceptions();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error acknowledging exception', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolvingException || submitting) return;

    try {
      setSubmitting(true);
      const res = await exceptionAPI.resolveException(resolvingException._id, resolutionNote);
      showNotification(res.data.message || 'Exception resolved successfully', 'success');
      setResolvingException(null);
      setResolutionNote('');
      fetchExceptions();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error resolving exception', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSource = (category) => {
    if (category === 'TRUCK' || category === 'DOCK') {
      navigate('/logistics');
    } else if (category === 'PROCUREMENT') {
      navigate('/procurement');
    } else if (category === 'FINANCE') {
      navigate('/finance');
    } else {
      navigate('/logistics');
    }
  };

  // Filtered & Sorted Exceptions
  const filteredExceptions = exceptions.filter(item => {
    if (severityFilter !== 'All' && item.severity !== severityFilter.toUpperCase()) return false;
    if (categoryFilter !== 'All' && item.category !== categoryFilter.toUpperCase()) return false;
    if (statusFilter === 'Open' && item.status === 'RESOLVED') return false;
    if (statusFilter === 'Acknowledged' && item.status !== 'ACKNOWLEDGED') return false;
    if (statusFilter === 'Resolved' && item.status !== 'RESOLVED') return false;
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'Highest Priority') {
      const priorityMap = { CRITICAL: 3, WARNING: 2, INFO: 1 };
      return (priorityMap[b.severity] || 0) - (priorityMap[a.severity] || 0);
    } else if (sortOrder === 'Oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center min-h-[75vh] relative overflow-hidden">
        <div className="absolute w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-mono tracking-tight">
            Gathering Operational Exception Telemetry...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 shadow-2xs">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <span>Operational Exception & Alert Center</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-mono font-medium border border-rose-200/60 dark:border-rose-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Real-time Audited
                </span>
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
              Centralized exception triage system: Inspect, acknowledge, and resolve active operational anomalies across Procurement, Yard Logistics, and 3-Way Finance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAiOpen(true)}
              className="group flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-500 group-hover:rotate-12 transition-transform" />
              <span>Ask Copilot</span>
            </button>
            <button
              onClick={fetchExceptions}
              disabled={isRefreshing}
              className="text-xs px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh Feed'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl space-y-1.5 shadow-2xs">
          <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Total Open</span>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{summary.totalOpen}</div>
        </div>
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl space-y-1.5 shadow-2xs">
          <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider block">Critical</span>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">{summary.criticalCount}</div>
        </div>
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl space-y-1.5 shadow-2xs">
          <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider block">Warnings</span>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{summary.warningCount}</div>
        </div>
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl space-y-1.5 shadow-2xs">
          <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider block">Info</span>
          <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">{summary.infoCount}</div>
        </div>
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl space-y-1.5 shadow-2xs">
          <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider block">Resolved Today</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{summary.resolvedTodayCount}</div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Severity & Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Severity Pills */}
          <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            {['All', 'Critical', 'Warning', 'Info'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            <option value="All">All Categories</option>
            <option value="Trucks">Trucks & Fleet</option>
            <option value="Procurement">Procurement</option>
            <option value="Finance">Finance & 3-Way</option>
            <option value="Dock">Docks & Bays</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            <option value="Open">Open Exceptions</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
            <option value="All">All Statuses</option>
          </select>
        </div>

        {/* Right: Sort Order */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400 font-mono">Sort:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            <option value="Newest">Newest First</option>
            <option value="Highest Priority">Highest Severity</option>
            <option value="Oldest">Oldest First</option>
          </select>
        </div>

      </div>

      {/* EXCEPTION CARDS TABLE */}
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Active Exception Queue ({filteredExceptions.length})
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">Department Filter: {currentUser?.role}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200/80 dark:border-zinc-800/80 font-medium">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Severity</th>
                <th className="py-3.5 px-4 font-semibold">Exception Title</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Description</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300">
              {filteredExceptions.map((ex) => (
                <tr key={ex._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                  
                  {/* Severity Badge */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border ${
                      ex.severity === 'CRITICAL'
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                        : ex.severity === 'WARNING'
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                        : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        ex.severity === 'CRITICAL' ? 'bg-rose-500' : ex.severity === 'WARNING' ? 'bg-amber-500' : 'bg-purple-500'
                      }`} />
                      {ex.severity}
                    </span>
                  </td>

                  {/* Title */}
                  <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100 max-w-[200px] truncate">
                    {ex.title}
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono font-semibold">
                      {ex.category}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 font-mono text-[11px] max-w-[320px] truncate">
                    {ex.description}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      ex.status === 'RESOLVED'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                        : ex.status === 'ACKNOWLEDGED'
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                    }`}>
                      {ex.status === 'RESOLVED' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3" />}
                      {ex.status}
                    </span>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3.5 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => setSelectedExceptionDetail(ex)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 inline mr-1" />
                      Details
                    </button>

                    <button
                      onClick={() => handleViewSource(ex.category)}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-600 dark:text-purple-400 font-semibold text-xs border border-purple-200/60 dark:border-purple-900/50 transition-all inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Source</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>

                    {ex.status === 'OPEN' && (
                      <button
                        onClick={() => handleAcknowledge(ex._id)}
                        disabled={submitting}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-200 dark:border-amber-900 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Acknowledge
                      </button>
                    )}

                    {ex.status !== 'RESOLVED' && (
                      <button
                        onClick={() => {
                          setResolvingException(ex);
                          setResolutionNote('');
                        }}
                        disabled={submitting}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESOLVE EXCEPTION MODAL */}
      {resolvingException && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Resolve Operational Exception</h3>
              </div>
              <button
                onClick={() => setResolvingException(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl space-y-1">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">{resolvingException.title}</div>
                <p className="text-[11px] text-zinc-500 font-mono">{resolvingException.description}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Resolution Rationale / Action Note</label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Driver contacted, revised ETA confirmed for 15:10."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all h-20 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingException(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEPTION DETAIL INSPECTOR MODAL */}
      {selectedExceptionDetail && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Exception Inspector & Related Records</h3>
              </div>
              <button
                onClick={() => setSelectedExceptionDetail(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-mono block">Severity Level</span>
                  <strong className={`font-mono text-xs ${
                    selectedExceptionDetail.severity === 'CRITICAL' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {selectedExceptionDetail.severity}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-mono block">Status</span>
                  <strong className="font-mono text-xs text-zinc-900 dark:text-zinc-100">{selectedExceptionDetail.status}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-mono block">Category</span>
                  <strong className="font-mono text-xs text-purple-600 dark:text-purple-400">{selectedExceptionDetail.category}</strong>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">{selectedExceptionDetail.title}</div>
                <p className="text-[11px] text-zinc-500 font-mono leading-relaxed">{selectedExceptionDetail.description}</p>
              </div>

              {/* Related Metadata Parameters */}
              {selectedExceptionDetail.metadata && (
                <div className="p-3.5 bg-zinc-50/70 dark:bg-zinc-950/70 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Related Application Metadata</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    {Object.entries(selectedExceptionDetail.metadata).map(([k, v]) => (
                      <div key={k} className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
                        <span className="text-zinc-400 block text-[9px] uppercase">{k}</span>
                        <strong className="text-zinc-800 dark:text-zinc-200 truncate block">{Array.isArray(v) ? v.join(', ') : String(v)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit / Resolution Trail */}
              {selectedExceptionDetail.resolutionNote && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-emerald-700 dark:text-emerald-300 text-[11px] space-y-1">
                  <div className="font-bold">Resolution Note (By {selectedExceptionDetail.resolvedBy}):</div>
                  <p className="font-mono">{selectedExceptionDetail.resolutionNote}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    handleViewSource(selectedExceptionDetail.category);
                    setSelectedExceptionDetail(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-600 dark:text-purple-400 font-semibold text-xs border border-purple-200/60 dark:border-purple-900/50 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Go to Operational Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedExceptionDetail(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}