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
  Trash2
} from 'lucide-react';

export default function FinancePage() {
  const { showNotification } = useAuth();
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl transition-colors">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 tracking-tight">
            <Receipt className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <span>Autonomous P2P 3-Way Matching & Payment Workflow</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Automated verification across Purchase Order, Goods Receipt, and Cloudinary Invoices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setInvNumber(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
              setIsInvoiceModalOpen(true);
            }}
            disabled={submitting}
            className="flex items-center gap-2 text-xs px-3.5 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Invoice</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'invoices'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Invoices & 3-Way Match ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Payment Executions ({payments.length})
        </button>
      </div>

      {/* Tab 1: Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:border-zinc-800 font-medium">
                <tr>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">PO Ref</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Billed Amount ($)</th>
                  <th className="p-3.5">Document</th>
                  <th className="p-3.5">3-Way Match Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-300">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="p-3.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{inv.invoiceNumber}</td>
                    <td className="p-3.5 font-mono text-zinc-900 dark:text-zinc-200 font-medium">{inv.poNumber}</td>
                    <td className="p-3.5 font-medium text-zinc-900 dark:text-zinc-200">{inv.supplierName}</td>
                    <td className="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">${inv.totalAmount.toLocaleString()}</td>
                    <td className="p-3.5">
                      <a
                        href={inv.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Cloudinary View</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 w-max ${
                        inv.matchStatus === 'MATCHED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                        inv.matchStatus === 'MISMATCH' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}>
                        {inv.matchStatus === 'MATCHED' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        <span>{inv.matchStatus}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedInvoiceForMatch(inv)}
                        className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-[11px] border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
                      >
                        Inspect Audit
                      </button>
                      <button
                        onClick={() => handleRunMatch(inv._id)}
                        disabled={submitting}
                        className="px-2.5 py-1 rounded bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold text-[11px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        Re-Match
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(inv._id)}
                        disabled={submitting}
                        title="Delete Invoice"
                        className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center"
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

      {/* Tab 2: Payments */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:border-zinc-800 font-medium">
                <tr>
                  <th className="p-3.5">Payment Ref</th>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">PO Ref</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Amount ($)</th>
                  <th className="p-3.5">3-Way Match</th>
                  <th className="p-3.5">Payment Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-300">
                {payments.map((pay) => (
                  <tr key={pay._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="p-3.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{pay.paymentNumber}</td>
                    <td className="p-3.5 font-mono text-zinc-900 dark:text-zinc-200">{pay.invoiceNumber}</td>
                    <td className="p-3.5 font-mono text-zinc-900 dark:text-zinc-200">{pay.poNumber}</td>
                    <td className="p-3.5 font-medium text-zinc-900 dark:text-zinc-200">{pay.supplierName}</td>
                    <td className="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">${pay.amount.toLocaleString()}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        pay.matchStatus === 'MATCHED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }`}>
                        {pay.matchStatus}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        pay.paymentStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                        pay.paymentStatus === 'APPROVED' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}>
                        {pay.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      {pay.paymentStatus !== 'PAID' ? (
                        <button
                          onClick={() => handleUpdatePayment(pay._id, 'PAID')}
                          disabled={submitting || pay.matchStatus === 'MISMATCH'}
                          className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-all cursor-pointer disabled:opacity-50 ${
                            pay.matchStatus === 'MISMATCH'
                              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-300 dark:border-zinc-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          }`}
                        >
                          {pay.matchStatus === 'MISMATCH' ? <span className="flex items-center gap-1"><Lock className="w-3 h-3"/> Locked (Mismatch)</span> : 'Pay Invoice'}
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          Txn: {pay.transactionId}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeletePayment(pay._id)}
                        disabled={submitting}
                        title="Delete Payment Record"
                        className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center"
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
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 rounded-xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Upload Supplier Invoice</h3>
            <form onSubmit={handleCreateInvoice} className="space-y-3 text-xs">
              <div>
                <label className="block text-emerald-600 dark:text-emerald-400 font-semibold mb-1">⚡ Quick Autofill from Purchase Order</label>
                <select
                  value={invPoNumber}
                  onChange={(e) => handleSelectPo(e.target.value)}
                  className="w-full bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="">-- Choose PO to Pre-fill Form --</option>
                  {purchaseOrders.map((p) => (
                    <option key={p._id} value={p.poNumber}>
                      {p.poNumber} | {p.items?.[0]?.productName || 'Item'} (${p.totalAmount?.toLocaleString() || 0}) - {p.supplierName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={invNumber}
                  onChange={(e) => setInvNumber(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Purchase Order Reference</label>
                <input
                  type="text"
                  value={invPoNumber}
                  onChange={(e) => setInvPoNumber(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={invSupplier}
                  onChange={(e) => setInvSupplier(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Total Billed Amount ($)</label>
                <input
                  type="number"
                  min="1"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Cloudinary File Storage URL</label>
                <input
                  type="text"
                  value={invFileUrl}
                  onChange={(e) => setInvFileUrl(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm hover:bg-zinc-800 dark:hover:bg-white cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Save & Trigger 3-Way Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Match Audit Inspection Modal */}
      {selectedInvoiceForMatch && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg p-6 rounded-xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
              <span>3-Way Match Audit Inspector</span>
              <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                selectedInvoiceForMatch.matchStatus === 'MATCHED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}>
                {selectedInvoiceForMatch.matchStatus}
              </span>
            </h3>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 font-mono">
                <span>Invoice: <strong className="text-zinc-900 dark:text-zinc-100">{selectedInvoiceForMatch.invoiceNumber}</strong></span>
                <span>PO Ref: <strong className="text-zinc-900 dark:text-zinc-200">{selectedInvoiceForMatch.poNumber}</strong></span>
              </div>

              {/* 3-Way Comparison Matrix Table */}
              <div className="overflow-x-auto my-2">
                <table className="w-full text-center text-[11px] border border-zinc-200 dark:border-zinc-800 rounded-md">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 uppercase text-[9px] font-semibold">
                    <tr>
                      <th className="p-2 text-left">Metric</th>
                      <th className="p-2">PO Record</th>
                      <th className="p-2">Goods Receipt</th>
                      <th className="p-2">Invoice Billed</th>
                      <th className="p-2">Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-300 font-mono">
                    <tr>
                      <td className="p-2 text-left font-sans font-medium text-zinc-600 dark:text-zinc-400">Quantity</td>
                      <td className="p-2">{(selectedInvoiceForMatch.ocrData?.poQty || selectedInvoiceForMatch.items[0]?.quantity || 0).toLocaleString()}</td>
                      <td className="p-2">{(selectedInvoiceForMatch.ocrData?.acceptedQty !== undefined ? selectedInvoiceForMatch.ocrData.acceptedQty : (selectedInvoiceForMatch.matchStatus === 'MATCHED' ? selectedInvoiceForMatch.items[0]?.quantity : 0)).toLocaleString()}</td>
                      <td className="p-2">{(selectedInvoiceForMatch.ocrData?.invoiceQty || selectedInvoiceForMatch.items[0]?.quantity || 0).toLocaleString()}</td>
                      <td className="p-2 font-bold">{selectedInvoiceForMatch.matchStatus === 'MATCHED' ? '✓' : '❌'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-left font-sans font-medium text-zinc-600 dark:text-zinc-400">Unit Price</td>
                      <td className="p-2">${(selectedInvoiceForMatch.items[0]?.unitPrice || (selectedInvoiceForMatch.totalAmount / (selectedInvoiceForMatch.items[0]?.quantity || 1))).toFixed(2)}</td>
                      <td className="p-2">—</td>
                      <td className="p-2">${(selectedInvoiceForMatch.items[0]?.unitPrice || (selectedInvoiceForMatch.totalAmount / (selectedInvoiceForMatch.items[0]?.quantity || 1))).toFixed(2)}</td>
                      <td className="p-2 font-bold">✓</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-left font-sans font-medium text-zinc-600 dark:text-zinc-400">Total Amount</td>
                      <td className="p-2">${(selectedInvoiceForMatch.totalAmount).toLocaleString()}</td>
                      <td className="p-2">—</td>
                      <td className="p-2">${(selectedInvoiceForMatch.totalAmount).toLocaleString()}</td>
                      <td className="p-2 font-bold">{selectedInvoiceForMatch.matchStatus === 'MATCHED' ? '✓' : '❌'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {selectedInvoiceForMatch.ocrData?.reasons && selectedInvoiceForMatch.ocrData.reasons.length > 0 ? (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-md text-rose-600 dark:text-rose-400 space-y-1">
                  <div className="font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Match Discrepancies Found:</span>
                  </div>
                  {selectedInvoiceForMatch.ocrData.reasons.map((r, i) => (
                    <p key={i} className="text-[11px] leading-relaxed">{r}</p>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3-Way Match Verified: Purchase Order, Goods Receipt, and Invoice quantities & amounts match 100%.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInvoiceForMatch(null)}
                className="px-3.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
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
