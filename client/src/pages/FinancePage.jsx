import React, { useEffect, useMemo, useState } from 'react';
import { financeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CreditCard,
  Download,
  FileText,
  Lock,
  RefreshCw,
  Scale,
  Trash2,
  X
} from 'lucide-react';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusStyle = status => {
  if (['MATCHED', 'VALIDATED', 'PAID', 'APPROVED'].includes(status)) return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  if (['MISMATCHED', 'MISMATCH', 'ON_HOLD', 'REJECTED'].includes(status)) return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
};

export default function FinancePage() {
  const { showNotification } = useAuth();
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
        financeAPI.getInvoices(), financeAPI.getPayments(), financeAPI.getReadyPurchaseOrders()
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

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-xs text-zinc-400">Loading supplier invoices from Finance…</div>;

  return (
    <div className="p-5 md:p-8 space-y-7 max-w-6xl mx-auto min-h-screen">
      <section className="rounded-2xl bg-white/90 dark:bg-zinc-900/85 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
        <span className="mx-auto w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center"><Scale className="w-6 h-6" /></span>
        <h1 className="text-2xl font-extrabold mt-3">Finance: Invoice Match & Payment</h1>
        <p className="text-sm text-zinc-500 mt-1">Only the supplier invoice linked to the correct PO is fetched and matched.</p>
        <button onClick={loadFinance} className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
          {[
            ['Supplier invoices', metrics.incoming, FileText],
            ['Waiting for match', metrics.pending, AlertTriangle],
            ['Fully matched', metrics.matched, CheckCircle2],
            ['On-hold amount', money(metrics.onHold), Lock]
          ].map(([label, value, Icon]) => <div key={label} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"><Icon className="w-4 h-4 mx-auto text-purple-500" /><p className="text-[10px] uppercase tracking-wider text-zinc-400 mt-2">{label}</p><div className="font-mono font-bold mt-1">{value}</div></div>)}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          ['1', 'Invoice fetched', 'The supplier uploads or generates it. Its secure document link appears here automatically.', Cloud],
          ['2', 'Run 3-way match', 'The server compares the correct PO + GRN + supplier invoice.', Scale],
          ['3', 'Pay only if matched', 'Mismatch payments remain locked until the data is corrected.', CreditCard]
        ].map(([number, title, description, Icon]) => <div key={number} className="rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 p-5"><span className="mx-auto w-8 h-8 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">{number}</span><Icon className="w-5 h-5 mx-auto mt-3 text-purple-500" /><h2 className="font-bold text-sm mt-2">{title}</h2><p className="text-[11px] text-zinc-500 mt-1">{description}</p></div>)}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-extrabold">Step 1 & 2 — Incoming Supplier Invoice</h2>
        <p className="text-xs text-zinc-500">The link below is fetched by PO. Finance cannot replace it with an unrelated invoice.</p>
        {readyOrders.length === 0 && <div className="p-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-400">No received Purchase Order with a GRN is available yet.</div>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {readyOrders.map(po => (
            <article key={po._id} className="rounded-2xl bg-white/95 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400">Purchase Order + GRN ready</span>
              <h3 className="font-mono font-extrabold text-lg mt-1">{po.poNumber}</h3>
              <p className="font-semibold text-sm mt-1">{po.supplierName}</p>
              <div className="mt-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs">
                {(po.items || []).map(item => <p key={item.productName}>{item.productName} · {item.quantity} × {money(item.unitPrice)}</p>)}
                <p className="font-bold mt-2">PO value: {money(po.totalAmount)}</p>
              </div>
              {po.invoice ? (
                <div className="mt-4 p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <Cloud className="w-5 h-5 mx-auto text-emerald-600" />
                  <p className="font-mono font-bold text-sm mt-2">{po.invoice.invoiceNumber}</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">Supplier invoice fetched · {po.invoice.document?.storageProvider === 'cloudinary' ? 'Cloudinary link saved' : 'Built-in demo document link saved'} · {po.invoice.submissionStatus}</p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <a href={po.invoice.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold"><Download className="w-3.5 h-3.5" /> REAL INVOICE</a>
                    <button disabled={busy} onClick={() => runMatch(po.invoice)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold disabled:opacity-40"><Scale className="w-3.5 h-3.5" /> {busy ? 'Checking…' : 'Run 3-Way Match'}</button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-5 h-5 mx-auto text-amber-600" />
                  <p className="text-xs font-bold mt-2">Waiting for supplier invoice</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">Matching stays locked. Ask the supplier to upload or generate the invoice for {po.poNumber}.</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white/95 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800"><h2 className="text-base font-extrabold">Match Results</h2><p className="text-xs text-zinc-500 mt-1">Every row below came from the real supplier document linked to its Purchase Order.</p></div>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="p-4">Invoice</th><th className="p-4">PO / Supplier</th><th className="p-4">Storage</th><th className="p-4">Amount</th><th className="p-4">Match result</th><th className="p-4">Actions</th></tr></thead><tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{invoices.map(invoice => <tr key={invoice._id}><td className="p-4 font-mono font-bold">{invoice.invoiceNumber}</td><td className="p-4"><strong>{invoice.poNumber}</strong><small className="block text-zinc-400 mt-1">{invoice.supplierName}</small></td><td className="p-4"><span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><Cloud className="w-3.5 h-3.5" /> {invoice.document?.storageProvider === 'cloudinary' ? 'CLOUDINARY' : 'DEMO STORE'}</span></td><td className="p-4 font-mono font-bold">{money(invoice.totalAmount)}</td><td className="p-4"><span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${statusStyle(invoice.matchStatus)}`}>{invoice.matchStatus}</span></td><td className="p-4"><div className="flex items-center justify-center gap-1.5"><a href={invoice.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 font-semibold"><Download className="w-3 h-3" /> REAL INVOICE</a><button onClick={() => setAuditInvoice(invoice)} className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 font-semibold">View checks</button><button disabled={busy} onClick={() => runMatch(invoice)} className="px-2.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold disabled:opacity-40">Match</button><button disabled={busy} onClick={() => deleteInvoice(invoice)} className="p-1.5 rounded-lg border border-rose-200 text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button></div></td></tr>)}{invoices.length === 0 && <tr><td colSpan="6" className="p-10 text-zinc-400">No supplier invoice has reached Finance yet.</td></tr>}</tbody></table></div>
      </section>

      <section className="rounded-2xl bg-white/95 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800"><h2 className="text-base font-extrabold">Step 3 — Payment</h2><p className="text-xs text-zinc-500 mt-1">Only a fully MATCHED invoice unlocks payment.</p></div>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="p-4">Payment</th><th className="p-4">Invoice / PO</th><th className="p-4">Supplier</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{payments.map(payment => <tr key={payment._id}><td className="p-4 font-mono font-bold">{payment.paymentNumber}</td><td className="p-4">{payment.invoiceNumber}<small className="block text-zinc-400">{payment.poNumber}</small></td><td className="p-4">{payment.supplierName}</td><td className="p-4 font-mono font-bold">{money(payment.amount)}</td><td className="p-4"><span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${statusStyle(payment.paymentStatus)}`}>{payment.paymentStatus}</span></td><td className="p-4">{payment.paymentStatus !== 'PAID' ? <button disabled={busy || payment.matchStatus !== 'MATCHED'} onClick={() => updatePayment(payment)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold disabled:bg-zinc-200 disabled:text-zinc-400"><CreditCard className="w-3.5 h-3.5" /> {payment.matchStatus === 'MATCHED' ? 'Pay now' : 'Locked: fix mismatch'}</button> : <span className="text-emerald-600 font-mono text-[10px]">PAID · {payment.transactionId}</span>}</td></tr>)}{payments.length === 0 && <tr><td colSpan="6" className="p-10 text-zinc-400">Payments appear after the first 3-way match.</td></tr>}</tbody></table></div>
      </section>

      {auditInvoice && <div className="fixed inset-0 z-50 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4"><button onClick={() => setAuditInvoice(null)} className="ml-auto block"><X className="w-5 h-5 text-zinc-400" /></button><Scale className="w-8 h-8 mx-auto text-purple-500" /><h2 className="text-lg font-extrabold">3-Way Match Details</h2><p className="text-xs text-zinc-500">PO + GRN + supplier invoice · {auditInvoice.invoiceNumber}</p>{auditInvoice.matchDetails?.comparisons?.length ? <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800"><table className="w-full text-xs"><thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="p-3">Field</th><th className="p-3">PO</th><th className="p-3">GRN</th><th className="p-3">Supplier Invoice</th><th className="p-3">Result</th></tr></thead><tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{auditInvoice.matchDetails.comparisons.filter(row => !/Line Total|Tax Amount|Grand Total/i.test(row.field)).map((row, index) => <tr key={`${row.field}-${index}`}><td className="p-3 font-semibold">{row.field}</td><td className="p-3 font-mono">{String(row.po ?? 'N/A')}</td><td className="p-3 font-mono">{String(row.grn ?? 'N/A')}</td><td className="p-3 font-mono">{String(row.invoice ?? 'N/A')}</td><td className={`p-3 font-bold ${row.result === 'MATCH' ? 'text-emerald-600' : 'text-rose-600'}`}>{row.result}</td></tr>)}</tbody></table></div> : <div className="p-8 rounded-xl bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-400">No match has been run yet. Close this box and click Run 3-Way Match.</div>}<span className={`inline-block px-3 py-1.5 rounded-full border text-xs font-bold ${statusStyle(auditInvoice.matchStatus)}`}>{auditInvoice.matchStatus}</span></div></div>}
    </div>
  );
}
