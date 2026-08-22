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
  Bot
} from 'lucide-react';

export default function ProcurementPage() {
  const { showNotification, setIsAiOpen } = useAuth();
  const [activeTab, setActiveTab] = useState('requisitions');
  const [requisitions, setRequisitions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // New PR Modal State
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [newPrItem, setNewPrItem] = useState('');
  const [newPrQty, setNewPrQty] = useState(100);
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
        procurementAPI.getSuppliers(),
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
    try {
      const res = await procurementAPI.createRequisition({
        items: [{
          productName: newPrItem || 'Safety Helmets',
          quantity: Number(newPrQty),
          estimatedUnitPrice: Number(newPrPrice)
        }],
        priority: 'HIGH'
      });
      showNotification(`Created Requisition ${res.data.requisition.prNumber}`, 'success');
      setIsPrModalOpen(false);
      fetchProcurementData();
    } catch (err) {
      showNotification('Failed to create requisition', 'warning');
    }
  };

  const handleApprovePr = async (prId) => {
    try {
      await procurementAPI.approveRequisition(prId);
      showNotification('Requisition approved!', 'success');
      fetchProcurementData();
    } catch (err) {
      showNotification('Error approving requisition', 'warning');
    }
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (!selectedPrForPo || !selectedSupplierId) return;

    try {
      const res = await procurementAPI.createPurchaseOrder({
        prId: selectedPrForPo._id,
        supplierId: selectedSupplierId,
        items: selectedPrForPo.items
      });
      showNotification(`Purchase Order ${res.data.purchaseOrder.poNumber} issued successfully!`, 'success');
      setSelectedPrForPo(null);
      fetchProcurementData();
    } catch (err) {
      showNotification('Error issuing Purchase Order', 'warning');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl transition-colors">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 tracking-tight">
            <ShoppingCart className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <span>Procurement Lifecycle Management (P2P)</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage Purchase Requisitions, Supplier Evaluations, and Purchase Orders.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAiOpen(true)}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 font-medium transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>AI Assistant</span>
          </button>
          <button
            onClick={() => setIsPrModalOpen(true)}
            className="flex items-center gap-2 text-xs px-3.5 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Requisition</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
        <button
          onClick={() => setActiveTab('requisitions')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'requisitions'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Requisitions ({requisitions.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Supplier Matrix ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            activeTab === 'pos'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Purchase Orders ({purchaseOrders.length})
        </button>
      </div>

      {/* Tab 1: Requisitions */}
      {activeTab === 'requisitions' && (
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:border-zinc-800 font-medium">
                <tr>
                  <th className="p-3.5">PR Number</th>
                  <th className="p-3.5">Requested Item</th>
                  <th className="p-3.5">Quantity</th>
                  <th className="p-3.5">Est. Total ($)</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Source</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-300">
                {requisitions.map((pr) => (
                  <tr key={pr._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="p-3.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{pr.prNumber}</td>
                    <td className="p-3.5 font-medium text-zinc-900 dark:text-zinc-200">
                      {pr.items.map(i => i.productName).join(', ')}
                    </td>
                    <td className="p-3.5 font-medium">{pr.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="p-3.5 text-zinc-900 dark:text-zinc-100 font-semibold">${pr.totalAmount.toLocaleString()}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        pr.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                        pr.status === 'CONVERTED_TO_PO' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}>
                        {pr.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {pr.aiGenerated ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono">
                          Grok AI
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">Manual</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      {pr.status === 'PENDING' && (
                        <button
                          onClick={() => handleApprovePr(pr._id)}
                          className="px-2.5 py-1 rounded bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold text-[11px] transition-all cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                      {pr.status === 'APPROVED' && (
                        <button
                          onClick={() => setSelectedPrForPo(pr)}
                          className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-medium text-[11px] border border-zinc-200 dark:border-zinc-700 transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Convert to PO</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Suppliers Matrix */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((sup) => (
            <div key={sup._id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl space-y-3 transition-colors">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{sup.name}</h4>
                  <span className="text-[10px] font-mono text-zinc-500">{sup.code} • {sup.category}</span>
                </div>
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>{sup.rating} / 5.0</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">On-Time Delivery (OTD)</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">{sup.otdScore}%</strong>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Lead Time</span>
                  <strong className="text-zinc-800 dark:text-zinc-200 font-semibold text-sm">{sup.leadTimeDays} Days</strong>
                </div>
              </div>
              <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-1">
                <span>Email: {sup.email}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{sup.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Purchase Orders */}
      {activeTab === 'pos' && (
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:border-zinc-800 font-medium">
                <tr>
                  <th className="p-3.5">PO Number</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Items Summary</th>
                  <th className="p-3.5">Total Amount ($)</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Issued Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-300">
                {purchaseOrders.map((po) => (
                  <tr key={po._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="p-3.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{po.poNumber}</td>
                    <td className="p-3.5 font-medium text-zinc-900 dark:text-zinc-200">{po.supplierName}</td>
                    <td className="p-3.5 text-zinc-500 dark:text-zinc-400">{po.items.map(i => `${i.quantity} x ${i.productName}`).join(', ')}</td>
                    <td className="p-3.5 text-zinc-900 dark:text-zinc-100 font-bold">${po.totalAmount.toLocaleString()}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        po.status === 'RECEIVED' || po.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                        po.status === 'PARTIALLY_RECEIVED' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-zinc-500 text-[11px]">{new Date(po.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New PR Modal */}
      {isPrModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 rounded-xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Create Purchase Requisition</h3>
            <form onSubmit={handleCreatePr} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Item Description</label>
                <input
                  type="text"
                  value={newPrItem}
                  onChange={(e) => setNewPrItem(e.target.value)}
                  placeholder="e.g. Safety Helmet - High Visibility Yellow"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newPrQty}
                    onChange={(e) => setNewPrQty(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Est. Unit Price ($)</label>
                  <input
                    type="number"
                    value={newPrPrice}
                    onChange={(e) => setNewPrPrice(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPrModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 font-semibold hover:bg-zinc-800 dark:hover:bg-white shadow-sm cursor-pointer"
                >
                  Submit PR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert PR to PO Modal */}
      {selectedPrForPo && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 rounded-xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Issue PO for {selectedPrForPo.prNumber}</h3>
            <form onSubmit={handleCreatePo} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Select Supplier</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                  required
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} (Rating: {s.rating} | OTD: {s.otdScore}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-1 text-zinc-700 dark:text-zinc-300">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">Item: {selectedPrForPo.items[0]?.productName}</div>
                <div>Quantity: {selectedPrForPo.items[0]?.quantity}</div>
                <div className="text-zinc-900 dark:text-zinc-100 font-bold">Total PO Amount: ${selectedPrForPo.totalAmount.toLocaleString()}</div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPrForPo(null)}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 font-semibold hover:bg-zinc-800 dark:hover:bg-white shadow-sm cursor-pointer"
                >
                  Issue Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
