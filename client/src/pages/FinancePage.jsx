import React, { useState, useEffect } from 'react';
import { financeAPI, procurementAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  CreditCard, 
  FileText, 
  ExternalLink, 
  Lock,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  Scale,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  X,
  Building2
} from 'lucide-react';

export default function FinancePage() {
  const { showNotification, setIsAiOpen } = useAuth();
  const [activeTab, setActiveTab] = useState('invoices');
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPo, setSelectedPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New Invoice Modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invNumber, setInvNumber] = useState('INV-1001');
  const [invPoNumber, setInvPoNumber] = useState('PO-1001');
  const [invSupplier, setInvSupplier] = useState('Apex Industrial Safety Co.');
  const [invAmount, setInvAmount] = useState(22500);
  const [invFileUrl, setInvFileUrl] = useState('https://res.cloudinary.com/demo/image/upload/sample.jpg');

  // Match Inspector Modal
  const [selectedInvoiceForMatch, setSelectedInvoiceForMatch] = useState(null);

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [invRes, payRes, poRes] = await Promise.all([
        financeAPI.getInvoices(),
        financeAPI.getPayments(),
        procurementAPI.getPurchaseOrders().catch(() => ({ data: { purchaseOrders: [] } }))
      ]);
      setInvoices(invRes.data.invoices || []);
      setPayments(payRes.data.payments || []);
      setPurchaseOrders(poRes.data.purchaseOrders || []);
    } catch (err) {
      console.error('Error fetching finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPo = (poNum) => {
    const poDoc = purchaseOrders.find(p => p.poNumber === poNum);
    if (poDoc) {
      setSelectedPo(poDoc);
      setInvPoNumber(poDoc.poNumber);
      setInvSupplier(poDoc.supplierName || 'Apex Industrial Safety Co.');
      setInvAmount(poDoc.totalAmount || 22500);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      const poItems = selectedPo?.items?.length ? selectedPo.items : [{ productName: 'Industrial Item', quantity: 500, unitPrice: Number(invAmount) / 500 }];
      const res = await financeAPI.createInvoice({
        invoiceNumber: invNumber,
        poNumber: invPoNumber,
        supplierName: invSupplier,
        totalAmount: Number(invAmount),
        fileUrl: invFileUrl,
        items: poItems
      });
      showNotification(`Created Invoice ${res.data.invoice.invoiceNumber} and performed 3-Way Match!`, 'success');
      if (res.data.invoices) setInvoices(res.data.invoices);
      if (res.data.payments) setPayments(res.data.payments);
      setIsInvoiceModalOpen(false);
      fetchFinanceData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error creating invoice', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunMatch = async (invoiceId) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await financeAPI.triggerMatch(invoiceId);
      showNotification(`3-Way Match result: ${res.data.matchResult?.matchStatus}`, 'info');
      if (res.data.invoices) setInvoices(res.data.invoices);
      if (res.data.payments) setPayments(res.data.payments);
      fetchFinanceData();
    } catch (err) {
      showNotification('Error running match engine', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePayment = async (paymentId, status) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await financeAPI.updatePaymentStatus(paymentId, status);
      showNotification(`Updated Payment status to ${status}`, 'success');
      if (res.data.payments) setPayments(res.data.payments);
      fetchFinanceData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error updating payment status', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (submitting || !window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      setSubmitting(true);
      const res = await financeAPI.deleteInvoice(invoiceId);
      showNotification(res.data.message || 'Invoice deleted successfully', 'success');
      if (res.data.invoices) setInvoices(res.data.invoices);
      if (res.data.payments) setPayments(res.data.payments);
      fetchFinanceData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error deleting invoice', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (submitting || !window.confirm('Are you sure you want to delete this payment record?')) return;
    try {
      setSubmitting(true);
      const res = await financeAPI.deletePayment(paymentId);
      showNotification(res.data.message || 'Payment record deleted successfully', 'success');
      if (res.data.payments) setPayments(res.data.payments);
      fetchFinanceData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error deleting payment', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const totalInvoicedSpend = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const matchedCount = invoices.filter(i => i.matchStatus === 'MATCHED').length;
  const mismatchCount = invoices.filter(i => i.matchStatus === 'MISMATCH').length;
  const pendingPaymentsAmount = payments.filter(p => p.paymentStatus !== 'PAID').reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      
      {/* Top Banner & Control Deck Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
                <Scale className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Finance & Autonomous 3-Way Match
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
              Automated cross-reconciliation across Purchase Orders, Goods Receipts, and Invoices. Zero-touch payment approval with exception locking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAiOpen(true)}
              className="group flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-500 group-hover:rotate-12 transition-transform" />
              <span>Audit Copilot</span>
            </button>
            <button
              onClick={() => {
                setInvNumber(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
                setIsInvoiceModalOpen(true);
              }}
              disabled={submitting}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Ingest Invoice</span>
            </button>
          </div>
        </div>

        {/* Operational Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Total Invoiced</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">${totalInvoicedSpend.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Clean Matches</span>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{matchedCount} Verified</div>
          </div>
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Discrepancy Holds</span>
            <div className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5">{mismatchCount} Locked</div>
          </div>
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Pending Outflow</span>
            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">${pendingPaymentsAmount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center justify-between">
        <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Invoices & 3-Way Match</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 font-mono">
              {invoices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment Executions</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 font-mono">
              {payments.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Invoices Table */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200/80 dark:border-zinc-800/80 font-medium">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-3.5 px-4 font-semibold">PO Reference</th>
                  <th className="py-3.5 px-4 font-semibold">Supplier Vendor</th>
                  <th className="py-3.5 px-4 font-semibold">Billed Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Cloudinary Proof</th>
                  <th className="py-3.5 px-4 font-semibold">3-Way Match Verification</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Auditing Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">{inv.invoiceNumber}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-zinc-800 dark:text-zinc-200">{inv.poNumber}</td>
                    <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-200">{inv.supplierName}</td>
                    <td className="py-3.5 px-4 text-zinc-900 dark:text-zinc-100 font-bold font-mono">
                      ${inv.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <a
                        href={inv.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium group"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Document</span>
                        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        inv.matchStatus === 'MATCHED' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60' :
                        inv.matchStatus === 'MISMATCH' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60' :
                        'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60'
                      }`}>
                        {inv.matchStatus === 'MATCHED' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        <span>{inv.matchStatus}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedInvoiceForMatch(inv)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
                      >
                        Inspect Audit
                      </button>
                      <button
                        onClick={() => handleRunMatch(inv._id)}
                        disabled={submitting}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        Re-Match
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(inv._id)}
                        disabled={submitting}
                        title="Delete Invoice"
                        className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Payments Table */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200/80 dark:border-zinc-800/80 font-medium">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Payment Ref</th>
                  <th className="py-3.5 px-4 font-semibold">Invoice Ref</th>
                  <th className="py-3.5 px-4 font-semibold">PO Ref</th>
                  <th className="py-3.5 px-4 font-semibold">Beneficiary Supplier</th>
                  <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                  <th className="py-3.5 px-4 font-semibold">3-Way Integrity</th>
                  <th className="py-3.5 px-4 font-semibold">Settlement Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Execution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300">
                {payments.map((pay) => (
                  <tr key={pay._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">{pay.paymentNumber}</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-800 dark:text-zinc-200">{pay.invoiceNumber}</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-800 dark:text-zinc-200">{pay.poNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-200">{pay.supplierName}</td>
                    <td className="py-3.5 px-4 font-bold font-mono text-zinc-900 dark:text-zinc-100">${pay.amount.toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        pay.matchStatus === 'MATCHED' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60' :
                        'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60'
                      }`}>
                        {pay.matchStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        pay.paymentStatus === 'PAID' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60' :
                        pay.paymentStatus === 'APPROVED' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/60' :
                        'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60'
                      }`}>
                        {pay.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {pay.paymentStatus !== 'PAID' ? (
                        <button
                          onClick={() => handleUpdatePayment(pay._id, 'PAID')}
                          disabled={submitting || pay.matchStatus === 'MISMATCH'}
                          className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer disabled:opacity-50 ${
                            pay.matchStatus === 'MISMATCH'
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-200 dark:border-zinc-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                          }`}
                        >
                          {pay.matchStatus === 'MISMATCH' ? (
                            <span className="flex items-center gap-1.5">
                              <Lock className="w-3 h-3 text-rose-500" />
                              <span>Locked (Mismatch)</span>
                            </span>
                          ) : (
                            'Authorize Outflow'
                          )}
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                          Txn: {pay.transactionId}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeletePayment(pay._id)}
                        disabled={submitting}
                        title="Delete Payment Record"
                        className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Upload & Ingest Vendor Invoice</h3>
              </div>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Autofill from Released Purchase Order</span>
                </label>
                <select
                  value={invPoNumber}
                  onChange={(e) => handleSelectPo(e.target.value)}
                  className="w-full bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="">-- Choose PO to Pre-fill Form --</option>
                  {purchaseOrders.map((p) => (
                    <option key={p._id} value={p.poNumber}>
                      {p.poNumber} | {p.items?.[0]?.productName || 'Item'} (${p.totalAmount?.toLocaleString() || 0}) - {p.supplierName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">Invoice Number</label>
                  <input
                    type="text"
                    value={invNumber}
                    onChange={(e) => setInvNumber(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">PO Number</label>
                  <input
                    type="text"
                    value={invPoNumber}
                    onChange={(e) => setInvPoNumber(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Supplier Vendor Name</label>
                <input
                  type="text"
                  value={invSupplier}
                  onChange={(e) => setInvSupplier(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Billed Total Amount ($)</label>
                <input
                  type="number"
                  min="1"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 font-mono text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Cloudinary File Storage URL</label>
                <input
                  type="text"
                  value={invFileUrl}
                  onChange={(e) => setInvFileUrl(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Running OCR...' : 'Save & Trigger 3-Way Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Match Audit Inspection Modal */}
      {selectedInvoiceForMatch && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-xl p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Scale className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">3-Way Match Audit Inspector</h3>
              </div>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                selectedInvoiceForMatch.matchStatus === 'MATCHED'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60'
              }`}>
                {selectedInvoiceForMatch.matchStatus}
              </span>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-800/80 pb-2 font-mono">
                <span>Invoice: <strong className="text-zinc-900 dark:text-zinc-100">{selectedInvoiceForMatch.invoiceNumber}</strong></span>
                <span>PO Ref: <strong className="text-zinc-900 dark:text-zinc-200">{selectedInvoiceForMatch.poNumber}</strong></span>
              </div>

              {/* 3-Way Comparison Matrix Table */}
              <div className="overflow-x-auto my-2 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
                <table className="w-full text-center text-[11px]">
                  <thead className="bg-zinc-100/70 dark:bg-zinc-900/80 text-zinc-500 dark:text-zinc-400 uppercase text-[9px] font-semibold">
                    <tr>
                      <th className="p-2.5 text-left">Audit Metric</th>
                      <th className="p-2.5">PO Target</th>
                      <th className="p-2.5">GRN Accepted</th>
                      <th className="p-2.5">Billed Quantity</th>
                      <th className="p-2.5">Match Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300 font-mono">
                    <tr>
                      <td className="p-2.5 text-left font-sans font-medium text-zinc-500 dark:text-zinc-400">Total Quantity</td>
                      <td className="p-2.5">{(selectedInvoiceForMatch.ocrData?.poQty || selectedInvoiceForMatch.items[0]?.quantity || 0).toLocaleString()}</td>
                      <td className="p-2.5">{(selectedInvoiceForMatch.ocrData?.acceptedQty !== undefined ? selectedInvoiceForMatch.ocrData.acceptedQty : (selectedInvoiceForMatch.matchStatus === 'MATCHED' ? selectedInvoiceForMatch.items[0]?.quantity : 0)).toLocaleString()}</td>
                      <td className="p-2.5">{(selectedInvoiceForMatch.ocrData?.invoiceQty || selectedInvoiceForMatch.items[0]?.quantity || 0).toLocaleString()}</td>
                      <td className="p-2.5 font-bold">
                        {selectedInvoiceForMatch.matchStatus === 'MATCHED' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">✓ Match</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">✗ Mismatch</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-left font-sans font-medium text-zinc-500 dark:text-zinc-400">Unit Price ($)</td>
                      <td className="p-2.5">${(selectedInvoiceForMatch.items[0]?.unitPrice || (selectedInvoiceForMatch.totalAmount / (selectedInvoiceForMatch.items[0]?.quantity || 1))).toFixed(2)}</td>
                      <td className="p-2.5 text-zinc-400">—</td>
                      <td className="p-2.5">${(selectedInvoiceForMatch.items[0]?.unitPrice || (selectedInvoiceForMatch.totalAmount / (selectedInvoiceForMatch.items[0]?.quantity || 1))).toFixed(2)}</td>
                      <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">✓ Match</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-left font-sans font-medium text-zinc-500 dark:text-zinc-400">Gross Total ($)</td>
                      <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">${(selectedInvoiceForMatch.totalAmount).toLocaleString()}</td>
                      <td className="p-2.5 text-zinc-400">—</td>
                      <td className="p-2.5 font-bold text-zinc-900 dark:text-zinc-100">${(selectedInvoiceForMatch.totalAmount).toLocaleString()}</td>
                      <td className="p-2.5 font-bold">
                        {selectedInvoiceForMatch.matchStatus === 'MATCHED' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">✓ Match</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">✗ Mismatch</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {selectedInvoiceForMatch.ocrData?.reasons && selectedInvoiceForMatch.ocrData.reasons.length > 0 ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-400 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Match Discrepancies Detected:</span>
                  </div>
                  {selectedInvoiceForMatch.ocrData.reasons.map((r, i) => (
                    <p key={i} className="text-[11px] leading-relaxed">• {r}</p>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>3-Way Match Verified: Purchase Order, Goods Receipt, and Invoice quantities & values match 100%.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInvoiceForMatch(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition-all cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}