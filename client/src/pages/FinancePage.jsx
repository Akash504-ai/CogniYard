import React, { useEffect, useMemo, useState } from 'react';
import { financeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cloud,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Lock,
  RefreshCw,
  Scale,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getStatusBadge = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (['MATCHED', 'VALIDATED', 'PAID', 'APPROVED'].includes(normalized)) {
    return {
      label: normalized,
      icon: CheckCircle2,
      style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    };
  }
  if (['MISMATCHED', 'MISMATCH', 'ON_HOLD', 'REJECTED'].includes(normalized)) {
    return {
      label: normalized,
      icon: AlertTriangle,
      style: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    };
  }
  return {
    label: normalized || 'PENDING',
    icon: Clock,
    style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  };
};

export default function FinancePage() {
  const { showNotification, setIsAiOpen } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [auditInvoice, setAuditInvoice] = useState(null);

  const loadFinance = async () => {
    try {
      setLoading(true);
      const [invoiceResponse, paymentResponse, orderResponse] = await Promise.all([
        financeAPI.getInvoices(), 
        financeAPI.getPayments(), 
        financeAPI.getReadyPurchaseOrders()
      ]);
      setInvoices(invoiceResponse.data.invoices || []);
      setPayments(paymentResponse.data.payments || []);
      setReadyOrders(orderResponse.data.purchaseOrders || []);
    } catch (error) {
      showNotification(error.response?.data?.message || 'Finance data could not be loaded.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFinance(); }, []);

  const metrics = useMemo(() => ({
    incoming: invoices.length,
    pending: invoices.filter(invoice => invoice.matchStatus === 'PENDING').length,
    matched: invoices.filter(invoice => invoice.matchStatus === 'MATCHED').length,
    onHold: payments.filter(payment => payment.paymentStatus === 'ON_HOLD').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  }), [invoices, payments]);

  const runMatch = async invoice => {
    if (!invoice?.fileUrl) return showNotification('The supplier has not uploaded/generated an invoice for this PO yet.', 'error');
    try {
      setBusy(true);
      const response = await financeAPI.triggerMatch(invoice._id);
      const result = response.data.matchResult;
      showNotification(`3-way match: ${result.status} · ${result.summary.matched}/${result.summary.total} checks passed.`, result.status === 'MATCHED' ? 'success' : 'warning');
      setAuditInvoice(response.data.invoice);
      await loadFinance();
    } catch (error) {
      showNotification(error.response?.data?.message || '3-way matching failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const updatePayment = async payment => {
    try {
      setBusy(true);
      await financeAPI.updatePaymentStatus(payment._id, 'PAID');
      showNotification('Payment completed successfully.', 'success');
      await loadFinance();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Payment could not be completed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const deleteInvoice = async invoice => {
    if (!window.confirm(`Delete invoice record ${invoice.invoiceNumber}? This does not delete its stored document.`)) return;
    try {
      setBusy(true);
      await financeAPI.deleteInvoice(invoice._id);
      showNotification('Invoice record deleted.', 'success');
      await loadFinance();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Invoice could not be deleted.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
        <span className="text-sm font-medium text-zinc-500">Loading financial records...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-7xl mx-auto min-h-screen text-zinc-900 dark:text-zinc-100">
      
      {/* Header Banner */}
      <header className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 lg:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Scale className="w-3.5 h-3.5" />
              <span>Automated 3-Way Reconciliation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Finance & Invoice Matching</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Verify incoming supplier invoices against Purchase Orders (PO) and Goods Received Notes (GRN) before unlocking automated payment disbursements.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsAiOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Ask Copilot</span>
            </button>
            <button
              onClick={loadFinance}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          {[
            ['Supplier Invoices', metrics.incoming, FileText, 'Total received'],
            ['Pending Verification', metrics.pending, Clock, 'Awaiting match'],
            ['Fully Matched', metrics.matched, CheckCircle2, 'Ready for payout'],
            ['On-Hold Amount', money(metrics.onHold), Lock, 'Blocked funds']
          ].map(([label, value, Icon, subtext]) => (
            <div key={label} className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
                <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                  <Icon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold font-mono tracking-tight">{value}</div>
                <span className="text-[11px] text-zinc-400 mt-0.5 block">{subtext}</span>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Workflow Steps */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          ['01', 'Fetch Supplier Document', 'Supplier uploads or generates an invoice linked directly to an approved Purchase Order.', Cloud],
          ['02', 'Execute 3-Way Match', 'Automated engine verifies item lines, unit prices, tax, and quantities across PO, GRN, and Invoice.', Scale],
          ['03', 'Unlock Payment', 'Disbursements are enabled exclusively for matched records. Mismatched funds remain locked.', CreditCard]
        ].map(([step, title, description, Icon]) => (
          <div key={step} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-start gap-4">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center justify-center font-mono border border-purple-500/20">
              {step}
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span>{title}</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Section 1 & 2: POs Ready for Matching */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Active Orders & Incoming Invoices</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">POs with logged GRNs available for 3-way validation.</p>
        </div>

        {readyOrders.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-400 space-y-2">
            <FileCheck2 className="w-8 h-8 mx-auto stroke-1 text-zinc-400" />
            <p className="text-sm font-medium">No purchase orders with completed GRNs are ready for matching.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readyOrders.map(po => (
              <article key={po._id} className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-base text-purple-600 dark:text-purple-400">{po.poNumber}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      GRN Verified
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{po.supplierName}</h3>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/80 text-xs space-y-2">
                    <div className="space-y-1">
                      {(po.items || []).map(item => (
                        <div key={item.productName} className="flex justify-between text-zinc-600 dark:text-zinc-400">
                          <span className="truncate pr-2">{item.productName}</span>
                          <span className="font-mono whitespace-nowrap">{item.quantity} × {money(item.unitPrice)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex justify-between font-semibold text-zinc-900 dark:text-zinc-100">
                      <span>Total Value</span>
                      <span className="font-mono">{money(po.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                {po.invoice ? (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <Cloud className="w-3.5 h-3.5" /> {po.invoice.invoiceNumber}
                      </span>
                      <span className="text-[10px] text-emerald-600/80 uppercase tracking-wider font-semibold">Invoice Fetched</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <a 
                        href={po.invoice.fileUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> View Doc
                      </a>
                      <button 
                        disabled={busy} 
                        onClick={() => runMatch(po.invoice)} 
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                      >
                        <Scale className="w-3.5 h-3.5" /> {busy ? 'Processing...' : 'Run Match'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-xs">
                      <p className="font-semibold text-amber-700 dark:text-amber-300">Awaiting Supplier Invoice</p>
                      <p className="text-amber-600/80 dark:text-amber-400/80">Matching process remains locked until the supplier uploads their document.</p>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Section: Match Results Table */}
      <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Match Verification Records</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Live reconciliation results against supplier documents.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="p-4 font-semibold">Invoice Ref</th>
                <th className="p-4 font-semibold">PO / Supplier</th>
                <th className="p-4 font-semibold">Storage</th>
                <th className="p-4 font-semibold">Total Amount</th>
                <th className="p-4 font-semibold">Match Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {invoices.map(invoice => {
                const status = getStatusBadge(invoice.matchStatus);
                const StatusIcon = status.icon;
                return (
                  <tr key={invoice._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">{invoice.invoiceNumber}</td>
                    <td className="p-4">
                      <span className="font-mono font-medium block">{invoice.poNumber}</span>
                      <span className="text-[11px] text-zinc-400">{invoice.supplierName}</span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-medium">
                        <Cloud className="w-3.5 h-3.5 text-purple-500" />
                        {invoice.document?.storageProvider === 'cloudinary' ? 'Cloudinary' : 'Demo Storage'}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold">{money(invoice.totalAmount)}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-semibold ${status.style}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a 
                          href={invoice.fileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                          title="View Invoice Document"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button 
                          onClick={() => setAuditInvoice(invoice)} 
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          Audit
                        </button>
                        <button 
                          disabled={busy} 
                          onClick={() => runMatch(invoice)} 
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold disabled:opacity-40 transition-colors"
                        >
                          Re-match
                        </button>
                        <button 
                          disabled={busy} 
                          onClick={() => deleteInvoice(invoice)} 
                          className="p-1.5 rounded-lg border border-rose-200/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-zinc-400">No supplier invoices recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section: Payment Execution Table */}
      <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-base font-bold">Payment Disbursements</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Executing payout transactions for verified matches.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="p-4 font-semibold">Payment ID</th>
                <th className="p-4 font-semibold">Invoice / PO</th>
                <th className="p-4 font-semibold">Supplier</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payments.map(payment => {
                const status = getStatusBadge(payment.paymentStatus);
                const StatusIcon = status.icon;
                const isMatched = payment.matchStatus === 'MATCHED';
                const isPaid = payment.paymentStatus === 'PAID';

                return (
                  <tr key={payment._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">{payment.paymentNumber}</td>
                    <td className="p-4">
                      <span className="font-mono font-medium block">{payment.invoiceNumber}</span>
                      <span className="text-[11px] text-zinc-400">{payment.poNumber}</span>
                    </td>
                    <td className="p-4 font-medium">{payment.supplierName}</td>
                    <td className="p-4 font-mono font-bold">{money(payment.amount)}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-semibold ${status.style}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {!isPaid ? (
                        <button 
                          disabled={busy || !isMatched} 
                          onClick={() => updatePayment(payment)} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 disabled:border border-transparent disabled:border-zinc-200 dark:disabled:border-zinc-700 transition-all"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> 
                          {isMatched ? 'Execute Pay' : 'Locked'}
                        </button>
                      ) : (
                        <div className="inline-flex flex-col items-end">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400">{payment.transactionId}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-zinc-400">No payment records available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Modal */}
      {auditInvoice && (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">3-Way Reconciliation Audit</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Invoice: {auditInvoice.invoiceNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setAuditInvoice(null)} 
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {auditInvoice.matchDetails?.comparisons?.length ? (
              <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                    <tr>
                      <th className="p-3.5 font-semibold">Field</th>
                      <th className="p-3.5 font-semibold">PO Data</th>
                      <th className="p-3.5 font-semibold">GRN Data</th>
                      <th className="p-3.5 font-semibold">Invoice Data</th>
                      <th className="p-3.5 font-semibold text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                    {auditInvoice.matchDetails.comparisons
                      .filter(row => !/Line Total|Tax Amount|Grand Total/i.test(row.field))
                      .map((row, index) => {
                        const isMatched = row.result === 'MATCH';
                        return (
                          <tr key={`${row.field}-${index}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/40">
                            <td className="p-3.5 font-sans font-semibold text-zinc-900 dark:text-zinc-100">{row.field}</td>
                            <td className="p-3.5 text-zinc-600 dark:text-zinc-400">{String(row.po ?? 'N/A')}</td>
                            <td className="p-3.5 text-zinc-600 dark:text-zinc-400">{String(row.grn ?? 'N/A')}</td>
                            <td className="p-3.5 text-zinc-600 dark:text-zinc-400">{String(row.invoice ?? 'N/A')}</td>
                            <td className="p-3.5 text-right font-sans">
                              <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${isMatched ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isMatched ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                {row.result}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-400 border border-zinc-200/60 dark:border-zinc-800">
                No detailed audit comparisons available. Trigger a match to populate this ledger.
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-zinc-500">Overall Verification Result</span>
              {(() => {
                const status = getStatusBadge(auditInvoice.matchStatus);
                const StatusIcon = status.icon;
                return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${status.style}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.label}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}