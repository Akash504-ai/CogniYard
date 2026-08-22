import React, { useState, useEffect } from 'react';
import { procurementAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingCart, 
  Plus, 
  CheckCircle2, 
  Users, 
  Star, 
  ArrowRight,
  Bot,
  Award,
  Clock,
  DollarSign,
  Layers,
  FileCheck,
  TrendingUp,
  X,
  Building2,
  Sparkles,
  Search,
  ChevronRight
} from 'lucide-react';

export default function ProcurementPage() {
  const { showNotification, setIsAiOpen } = useAuth();
  const [activeTab, setActiveTab] = useState('requisitions');
  const [requisitions, setRequisitions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New PR Modal State
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [newPrItem, setNewPrItem] = useState('');
  const [newPrQty, setNewPrQty] = useState(500);
  const [newPrPrice, setNewPrPrice] = useState(45);

  // Convert to PO Modal State
  const [selectedPrForPo, setSelectedPrForPo] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  useEffect(() => {
    fetchProcurementData();
  }, []);

  const fetchProcurementData = async () => {
    try {
      setLoading(true);
      const [prRes, supRes, poRes, prodRes] = await Promise.all([
        procurementAPI.getRequisitions(),
        procurementAPI.evaluateSuppliers(),
        procurementAPI.getPurchaseOrders(),
        procurementAPI.getProducts()
      ]);
      setRequisitions(prRes.data.requisitions || []);
      setSuppliers(supRes.data.suppliers || []);
      setPurchaseOrders(poRes.data.purchaseOrders || []);
      setProducts(prodRes.data.products || []);
    } catch (err) {
      console.error('Error fetching procurement data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePr = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!newPrItem.trim()) {
      showNotification('Please enter a valid item description', 'warning');
      return;
    }
    if (Number(newPrQty) <= 0) {
      showNotification('Quantity must be greater than 0', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await procurementAPI.createRequisition({
        items: [{
          productName: newPrItem.trim(),
          quantity: Number(newPrQty),
          estimatedUnitPrice: Number(newPrPrice)
        }],
        priority: 'HIGH'
      });
      showNotification(`Created Requisition ${res.data.requisition.prNumber}`, 'success');
      setIsPrModalOpen(false);
      setNewPrItem('');
      fetchProcurementData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to create requisition', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePr = async (prId) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await procurementAPI.approveRequisition(prId);
      showNotification('Requisition approved successfully!', 'success');
      fetchProcurementData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error approving requisition', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (submitting || !selectedPrForPo || !selectedSupplierId) return;

    try {
      setSubmitting(true);
      const res = await procurementAPI.createPurchaseOrder({
        prId: selectedPrForPo._id,
        supplierId: selectedSupplierId,
        items: selectedPrForPo.items
      });
      showNotification(`Purchase Order ${res.data.purchaseOrder.poNumber} issued successfully!`, 'success');
      setSelectedPrForPo(null);
      setSelectedSupplierId('');
      fetchProcurementData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error issuing Purchase Order', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCommittedSpend = purchaseOrders.reduce((acc, po) => acc + (po.totalAmount || 0), 0);
  const pendingApprovalsCount = requisitions.filter(r => r.status === 'PENDING').length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      
      {/* Top Banner & Action Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
                <ShoppingCart className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Procurement & Sourcing Hub
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
              Full lifecycle Procure-to-Pay (P2P): Auto-generate purchase requisitions, analyze supplier performance metrics, and issue POs with audit trails.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAiOpen(true)}
              className="group flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-500 group-hover:rotate-12 transition-transform" />
              <span>Ask Copilot</span>
            </button>
            <button
              onClick={() => setIsPrModalOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Requisition</span>
            </button>
          </div>
        </div>

        {/* Quick Operational Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Total PO Spend</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">${totalCommittedSpend.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Active PRs</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">{requisitions.length}</div>
          </div>
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Pending Approval</span>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">{pendingApprovalsCount}</div>
          </div>
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Vendor Network</span>
            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{suppliers.length} Certified</div>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center justify-between">
        <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <button
            onClick={() => setActiveTab('requisitions')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'requisitions'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Requisitions</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 font-mono">
              {requisitions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Supplier Matrix</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 font-mono">
              {suppliers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'pos'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Purchase Orders</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 font-mono">
              {purchaseOrders.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Requisitions Table */}
      {activeTab === 'requisitions' && (
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200/80 dark:border-zinc-800/80 font-medium">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">PR Identifier</th>
                  <th className="py-3.5 px-4 font-semibold">Requested Scope</th>
                  <th className="py-3.5 px-4 font-semibold">Quantity</th>
                  <th className="py-3.5 px-4 font-semibold">Est. Total Value</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Origin</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Operational Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300">
                {requisitions.map((pr) => (
                  <tr key={pr._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">{pr.prNumber}</td>
                    <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-200">
                      {pr.items.map(i => i.productName).join(', ')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium">
                      {pr.items.reduce((s, i) => s + i.quantity, 0).toLocaleString()} units
                    </td>
                    <td className="py-3.5 px-4 text-zinc-900 dark:text-zinc-100 font-bold font-mono">
                      ${pr.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        pr.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60' :
                        pr.status === 'CONVERTED_TO_PO' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/60' :
                        'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60'
                      }`}>
                        {pr.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                        {pr.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {pr.aiGenerated ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 font-mono font-medium">
                          <Bot className="w-3 h-3" /> Grok AI
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-mono">Manual Input</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {pr.status === 'PENDING' && (
                        <button
                          onClick={() => handleApprovePr(pr._id)}
                          disabled={submitting}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold text-xs transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          Approve PR
                        </button>
                      )}
                      {pr.status === 'APPROVED' && (
                        <button
                          onClick={() => setSelectedPrForPo(pr)}
                          disabled={submitting}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-semibold text-xs border border-indigo-200/80 dark:border-indigo-800/80 transition-all inline-flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <span>Convert to PO</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {pr.status === 'CONVERTED_TO_PO' && (
                        <span className="text-[11px] text-zinc-400 font-mono font-medium">✓ Dispatched</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Supplier Matrix Grid */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suppliers.map((sup, idx) => (
            <div key={sup._id} className="relative bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm group">
              
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">{sup.name}</h4>
                      {idx === 0 && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1 uppercase tracking-wider">
                          <Award className="w-3 h-3" /> Preferred
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">{sup.code} • {sup.category}</span>
                  </div>

                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{sup.rating}</span>
                  </div>
                </div>

                {/* Score / Performance Bar */}
                {sup.score && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] font-medium text-zinc-500">
                      <span>Evaluation Index</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{sup.score} / 100</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${sup.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Performance Metrics Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-50 dark:bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">OTD Score</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm">{sup.otdScore}%</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">Avg Lead Time</span>
                  <strong className="text-zinc-800 dark:text-zinc-200 font-mono font-bold text-sm">{sup.leadTimeDays} Days</strong>
                </div>
              </div>

              {/* Rationale Explanation */}
              {sup.recommendationReason && (
                <div className="p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                  {sup.recommendationReason}
                </div>
              )}

              <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 font-mono">
                <span className="truncate max-w-[160px]">{sup.email}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{sup.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Purchase Orders Table */}
      {activeTab === 'pos' && (
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200/80 dark:border-zinc-800/80 font-medium">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">PO Number</th>
                  <th className="py-3.5 px-4 font-semibold">Dispatched Supplier</th>
                  <th className="py-3.5 px-4 font-semibold">Line Items Summary</th>
                  <th className="py-3.5 px-4 font-semibold">Committed Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Fulfillment State</th>
                  <th className="py-3.5 px-4 font-semibold">Date Dispatched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300">
                {purchaseOrders.map((po) => (
                  <tr key={po._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">{po.poNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-200">{po.supplierName}</td>
                    <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 font-mono">
                      {po.items.map(i => `${i.quantity} × ${i.productName}`).join(', ')}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-900 dark:text-zinc-100 font-bold font-mono">
                      ${po.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        po.status === 'RECEIVED' || po.status === 'COMPLETED' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60' :
                        po.status === 'PARTIALLY_RECEIVED' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60' :
                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                      {new Date(po.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New PR Modal */}
      {isPrModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Draft Purchase Requisition</h3>
              </div>
              <button
                onClick={() => setIsPrModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePr} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Item Specification / Description</label>
                <input
                  type="text"
                  value={newPrItem}
                  onChange={(e) => setNewPrItem(e.target.value)}
                  placeholder="e.g. Industrial Safety Helmets"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">Required Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newPrQty}
                    onChange={(e) => setNewPrQty(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">Est. Unit Price ($)</label>
                  <input
                    type="number"
                    min="1"
                    value={newPrPrice}
                    onChange={(e) => setNewPrPrice(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Total Calculation Preview */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Estimated Expenditure:</span>
                <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  ${(Number(newPrQty || 0) * Number(newPrPrice || 0)).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPrModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Issue Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert PR to PO Modal */}
      {selectedPrForPo && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <FileCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Convert to Purchase Order</h3>
              </div>
              <button
                onClick={() => setSelectedPrForPo(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Assign Certified Supplier</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  required
                >
                  <option value="">-- Choose Evaluated Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} (Index: {s.score}/100 • OTD: {s.otdScore}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Target PR Summary Box */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl space-y-2 text-zinc-700 dark:text-zinc-300">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-zinc-400">Target Requisition:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{selectedPrForPo.prNumber}</strong>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Scope:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedPrForPo.items[0]?.productName}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
                  <span className="text-zinc-500 font-medium">Total PO Commitment:</span>
                  <strong className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                    ${selectedPrForPo.totalAmount.toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPrForPo(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedSupplierId}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Generating PO...' : 'Dispatch Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}