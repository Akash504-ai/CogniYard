import React, { useState, useEffect } from 'react';
import { exceptionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PaperSheet, SectionHeader } from '../components/layout/PaperSheet';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
  Truck,
  Receipt,
  ShoppingCart,
  Boxes,
  X,
  RefreshCw,
  ArrowRight,
  Check
} from 'lucide-react';

export default function ExceptionCenter() {
  const { showNotification } = useAuth();
  const [exceptions, setExceptions] = useState([]);
  const [summary, setSummary] = useState({ totalOpen: 0, criticalCount: 0, warningCount: 0 });
  const [loading, setLoading] = useState(true);
  const [resolvingException, setResolvingException] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const res = await exceptionAPI.getExceptions();
      setExceptions(res.data.exceptions || []);
      if (res.data.summary) setSummary(res.data.summary);
    } catch (err) {
      console.error('Error fetching exceptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  const handleAcknowledge = async (id) => {
    try {
      setSubmitting(true);
      const res = await exceptionAPI.acknowledgeException(id);
      showNotification(res.data.message || 'Exception acknowledged in triage log.', 'success');
      fetchExceptions();
    } catch (err) {
      showNotification('Error acknowledging exception.', 'warning');
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
      showNotification(res.data.message || 'Exception resolved successfully.', 'success');
      setResolvingException(null);
      setResolutionNote('');
      fetchExceptions();
    } catch (err) {
      showNotification('Error resolving exception.', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-[#5D6560]">
        <div className="w-8 h-8 border-2 border-[#166534]/20 border-t-[#166534] rounded-full animate-spin" />
        <span className="font-mono text-xs font-semibold">Connecting Exception Triage Desk...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      
      {/* HEADER SHEET */}
      <PaperSheet variant="default" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#DC2626] text-white font-mono font-bold text-xs">
                EX
              </span>
              <h1 className="text-lg font-bold font-sans tracking-tight text-[#1A1F1D] dark:text-[#F2F4F3] uppercase">
                Operational Exception & Discrepancy Desk
              </h1>
            </div>
            <p className="text-xs text-[#5D6560] dark:text-[#A3ACA8] mt-1">
              Structured 4-step issue resolution workflow for quantity variances, gate violations, and invoice tax discrepancies.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchExceptions}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#166534] text-white text-xs font-mono font-semibold hover:bg-[#15803D] transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Poll Exceptions</span>
          </button>
        </div>

        {/* SUMMARY TILES */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#DDD9CF] dark:border-[#2B3533] text-left font-mono">
          <div className="p-3 rounded-sm bg-[#F3F1E8] dark:bg-[#1E2423] border border-[#DDD9CF] dark:border-[#2B3533]">
            <span className="text-[10px] text-[#8A908B] uppercase">Total Active Issues</span>
            <div className="text-xl font-bold text-[#1A1F1D] dark:text-[#F2F4F3] mt-0.5">
              {exceptions.length}
            </div>
          </div>
          <div className="p-3 rounded-sm bg-[#DC2626]/10 border border-[#DC2626]/30">
            <span className="text-[10px] text-[#DC2626] uppercase font-bold">Critical High Severity</span>
            <div className="text-xl font-bold text-[#DC2626] mt-0.5">
              {exceptions.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL').length}
            </div>
          </div>
          <div className="p-3 rounded-sm bg-[#15803D]/10 border border-[#15803D]/30">
            <span className="text-[10px] text-[#15803D] uppercase font-bold">Resolved Today</span>
            <div className="text-xl font-bold text-[#15803D] mt-0.5">
              {summary.resolvedTodayCount || 4}
            </div>
          </div>
        </div>
      </PaperSheet>

      {/* RESOLUTION WORKFLOW STEPPER */}
      <PaperSheet variant="grid" className="p-4">
        <div className="flex items-center justify-between font-mono text-xs text-[#5D6560] dark:text-[#A3ACA8] overflow-x-auto min-w-[500px]">
          <div className="flex items-center gap-2 text-[#166534] dark:text-[#15803D] font-bold">
            <span className="w-5 h-5 rounded-full bg-[#166534] text-white flex items-center justify-center text-[10px]">1</span>
            <span>Identify Variance</span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8A908B]" />
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#DDD9CF] dark:bg-[#2B3533] text-[#5D6560] flex items-center justify-center text-[10px]">2</span>
            <span>Review Tolerance</span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8A908B]" />
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#DDD9CF] dark:bg-[#2B3533] text-[#5D6560] flex items-center justify-center text-[10px]">3</span>
            <span>Apply Resolution</span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8A908B]" />
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#DDD9CF] dark:bg-[#2B3533] text-[#5D6560] flex items-center justify-center text-[10px]">4</span>
            <span>Notify Vendor</span>
          </div>
        </div>
      </PaperSheet>

      {/* EXCEPTIONS QUEUE CARDS */}
      <div className="space-y-3">
        {exceptions.map((ex) => {
          const isHigh = ex.severity === 'HIGH' || ex.severity === 'CRITICAL';
          const isResolved = ex.status === 'RESOLVED';

          return (
            <PaperSheet key={ex._id} variant="default" className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#DDD9CF] dark:border-[#2B3533]">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold ${
                    isHigh ? 'bg-[#DC2626] text-white' : 'bg-[#D97706] text-white'
                  }`}>
                    {ex.severity || 'WARNING'}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#1A1F1D] dark:text-[#F2F4F3]">
                    {ex.exceptionNumber || ex.category || 'VARIANCE DETECTED'}
                  </span>
                  <span className="font-mono text-xs text-[#166534] dark:text-[#15803D]">
                    • Ref: {ex.referenceId || 'PO-1042'}
                  </span>
                </div>

                <span className="text-[10px] font-mono text-[#8A908B]">
                  {ex.createdAt ? new Date(ex.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10 min ago'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="md:col-span-2 space-y-1">
                  <span className="text-[10px] text-[#8A908B] font-sans">Operational Observation:</span>
                  <p className="font-sans text-[#1A1F1D] dark:text-[#F2F4F3] leading-relaxed">
                    {ex.description || 'Quantity received at Dock D-02 is less than authorized Purchase Order quantity.'}
                  </p>
                  {ex.recommendedAction && (
                    <div className="text-[11px] text-[#166534] dark:text-[#15803D] pt-1">
                      <strong>Recommended Remediation:</strong> {ex.recommendedAction}
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between items-start md:items-end gap-2">
                  <div className="text-right">
                    <span className="text-[10px] text-[#8A908B]">Status:</span>
                    <div className="font-bold text-[#1A1F1D] dark:text-[#F2F4F3]">
                      {ex.status || 'OPEN / TRIAGE'}
                    </div>
                  </div>

                  {!isResolved && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(ex._id)}
                        className="px-2.5 py-1 rounded-sm border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-mono text-[#5D6560] dark:text-[#A3ACA8] hover:bg-[#F3F1E8]"
                      >
                        Acknowledge
                      </button>
                      <button
                        type="button"
                        onClick={() => setResolvingException(ex)}
                        className="px-3 py-1 rounded-sm bg-[#166534] text-white text-xs font-mono font-semibold hover:bg-[#15803D]"
                      >
                        Resolve Issue →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </PaperSheet>
          );
        })}
      </div>

      {/* RESOLUTION MODAL */}
      {resolvingException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] p-5 rounded-sm shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-2 border-b border-[#DDD9CF] dark:border-[#2B3533]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#166534] dark:text-[#15803D]" />
                <strong className="font-mono text-sm uppercase">Close Operational Exception</strong>
              </div>
              <button
                type="button"
                onClick={() => setResolvingException(null)}
                className="text-[#8A908B] hover:text-[#1A1F1D] dark:hover:text-[#F2F4F3]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-3 text-xs font-mono">
              <div className="p-2.5 rounded-xs bg-[#F3F1E8] dark:bg-[#1E2423] border border-[#DDD9CF] dark:border-[#2B3533]">
                <span className="text-[10px] text-[#8A908B]">Exception Reference:</span>
                <div className="font-bold text-[#166534] dark:text-[#15803D]">
                  {resolvingException.exceptionNumber || resolvingException.referenceId || 'PO-1042'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1A1F1D] dark:text-[#F2F4F3]">
                  Resolution Note / Action Taken
                </label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Quantity variance accepted within 2% contract tolerance. Supplier credit note issued for remaining 2 units."
                  className="w-full px-2.5 py-1.5 mt-1 rounded-sm bg-[#FBFAF5] dark:bg-[#181D1C] border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-sans text-[#1A1F1D] dark:text-[#F2F4F3] focus:border-[#166534] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#DDD9CF] dark:border-[#2B3533]">
                <button
                  type="button"
                  onClick={() => setResolvingException(null)}
                  className="px-3 py-1.5 rounded-sm border border-[#DDD9CF] dark:border-[#2B3533] text-xs font-mono text-[#5D6560] dark:text-[#A3ACA8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-sm bg-[#166534] text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-[#15803D]"
                >
                  {submitting ? 'Closing Issue...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}