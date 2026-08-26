import React, { useState, useEffect } from 'react';
import { procurementAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PaperSheet } from '../components/layout/PaperSheet';
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
  ChevronRight,
  ShieldCheck,
  AlertCircle
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
  const [newPrQty, setNewPrQty] = useState('');
  const [newPrPrice, setNewPrPrice] = useState('');

  // Convert to PO Modal State
  const [selectedPrForPo, setSelectedPrForPo] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poItems, setPoItems] = useState([]);

  useEffect(() => {
    fetchProcurementData();
  }, []);

  const fetchProcurementData = async () => {
    try {
      setLoading(true);
      const [prRes, supRes, poRes, prodRes] = await Promise.all([
        procurementAPI.getRequisitions().catch(() => ({ data: { requisitions: [] } })),
        procurementAPI.evaluateSuppliers().catch(() => ({ data: { suppliers: [] } })),
        procurementAPI.getPurchaseOrders().catch(() => ({ data: { purchaseOrders: [] } })),
        procurementAPI.getProducts().catch(() => ({ data: { products: [] } }))
      ]);

      const fetchedPrs = prRes.data?.requisitions || [];
      const fetchedSups = supRes.data?.suppliers || [];
      const fetchedPos = poRes.data?.purchaseOrders || [];
      const fetchedProds = prodRes.data?.products || [];

      setRequisitions(fetchedPrs);
      setSuppliers(fetchedSups);
      setPurchaseOrders(fetchedPos);
      setProducts(fetchedProds);
    } catch (err) {
      console.error('Error fetching procurement data:', err);
      showNotification('Error loading procurement data. Using localized cache.', 'warning');
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
    if (Number(newPrPrice) <= 0) {
      showNotification('Price per unit must be greater than 0', 'warning');
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
      showNotification(`Created Requisition ${res.data?.requisition?.prNumber || 'PR-1001'}`, 'success');
      setIsPrModalOpen(false);
      setNewPrItem('');
      setNewPrQty('');
      setNewPrPrice('');
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
    if (submitting || !selectedPrForPo) return;
    if (!selectedSupplierId) {
      showNotification('Select an evaluated supplier before dispatching the Purchase Order.', 'warning');
      return;
    }
    if (poItems.some(item => Number(item.quantity) <= 0 || Number(item.unitPrice) <= 0)) {
      showNotification('Every PO line needs a quantity and price per unit greater than 0.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await procurementAPI.createPurchaseOrder({
        prId: selectedPrForPo._id,
        supplierId: selectedSupplierId,
        items: poItems
      });
      showNotification(`Purchase Order ${res.data?.purchaseOrder?.poNumber || 'PO-78440'} issued successfully!`, 'success');
      setSelectedPrForPo(null);
      setSelectedSupplierId('');
      setPoItems([]);
      setActiveTab('pos');
      fetchProcurementData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error issuing Purchase Order', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  // Fallback demo POs if backend returns 0
  const displayPos = purchaseOrders.length > 0 ? purchaseOrders : [
    {
      _id: 'po-1',
      poNumber: 'PO-78432',
      supplierName: 'Acme Steel Pvt Ltd',
      items: [{ productName: 'Precision Bearings', quantity: 500 }],
      totalAmount: 138768,
      status: 'IN_TRANSIT',
      createdAt: new Date().toISOString()
    },
    {
      _id: 'po-2',
      poNumber: 'PO-78415',
      supplierName: 'TechCorp Solutions',
      items: [{ productName: 'High-Speed Motors', quantity: 100 }],
      totalAmount: 85000,
      status: 'AT_GATE',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      _id: 'po-3',
      poNumber: 'PO-78398',
      supplierName: 'Apex Fasteners Ltd',
      items: [{ productName: 'Hydraulic Valves', quantity: 250 }],
      totalAmount: 42500,
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
      _id: 'po-4',
      poNumber: 'PO-78364',
      supplierName: 'Alpha Logistics Tech',
      items: [{ productName: 'Safety Gear Kits', quantity: 120 }],
      totalAmount: 36000,
      status: 'ISSUED',
      createdAt: new Date(Date.now() - 259200000).toISOString()
    }
  ];

  // Fallback demo Suppliers if backend returns 0
  const displaySuppliers = suppliers.length > 0 ? suppliers : [
    {
      _id: 'sup-1',
      name: 'Acme Steel Pvt Ltd',
      code: 'SUP-001',
      category: 'Raw Metals & Bearings',
      rating: 4.9,
      score: 96,
      otdScore: 97,
      leadTimeDays: 3,
      status: 'ACTIVE',
      email: 'orders@acmesteel.com',
      recommendationReason: 'AI Preferred: Highest historical on-time delivery score (97%) and rapid 3-day lead time.'
    },
    {
      _id: 'sup-2',
      name: 'TechCorp Solutions',
      code: 'SUP-002',
      category: 'Industrial Electronics',
      rating: 4.7,
      score: 91,
      otdScore: 94,
      leadTimeDays: 5,
      status: 'ACTIVE',
      email: 'procurement@techcorp.com',
      recommendationReason: 'Certified ISO-9001 supplier for high-speed industrial motor assemblies.'
    },
    {
      _id: 'sup-3',
      name: 'Apex Fasteners Ltd',
      code: 'SUP-003',
      category: 'Valves & Hydraulic Fittings',
      rating: 4.6,
      score: 88,
      otdScore: 92,
      leadTimeDays: 4,
      status: 'ACTIVE',
      email: 'sales@apexfasteners.com',
      recommendationReason: 'Consistent price stability with sub-1% defect rate across 40 batches.'
    },
    {
      _id: 'sup-4',
      name: 'Alpha Logistics Tech',
      code: 'SUP-004',
      category: 'Packaging & Warehouse Consumables',
      rating: 4.5,
      score: 85,
      otdScore: 90,
      leadTimeDays: 2,
      status: 'ACTIVE',
      email: 'contact@alphatech.com',
      recommendationReason: 'Rapid turnaround vendor for facility safety kits and consumable supplies.'
    }
  ];

  const totalCommittedSpend = displayPos.reduce((acc, po) => acc + (po.totalAmount || 0), 0);
  const pendingApprovalsCount = requisitions.filter(r => r.status === 'PENDING').length;

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 max-w-[1680px] mx-auto min-h-screen">
      
      {/* 1. TOP BANNER & METRICS ROW */}
      <PaperSheet variant="default" className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xs bg-[#DCFCE7] dark:bg-[#163824] text-[#15803D] dark:text-[#22C55E]">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h2 className="font-handwriting text-2xl sm:text-3xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                Procurement & Purchase Order Workspace
              </h2>
            </div>
            <p className="text-xs text-[#68716D] dark:text-[#8E9C97] font-sans">
              Manage purchase requisitions, certified supplier matrices, and dispatched Purchase Orders.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAiOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xs bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] text-xs font-sans text-[#1C201E] dark:text-[#F5F7F6] hover:border-[#15803D] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#15803D]" />
              <span>Ask Copilot</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPrModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xs bg-[#15803D] text-white text-xs font-sans font-bold hover:bg-[#166534] transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Draft Requisition (PR)</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E3DDD1] dark:border-[#2B3835]">
          <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] space-y-0.5">
            <span className="text-[10px] font-mono text-[#68716D] uppercase">Committed PO Spend</span>
            <div className="text-base font-bold font-mono text-[#1C201E] dark:text-[#F5F7F6]">
              ₹{totalCommittedSpend.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] space-y-0.5">
            <span className="text-[10px] font-mono text-[#68716D] uppercase">Active Requisitions</span>
            <div className="text-base font-bold font-mono text-[#1C201E] dark:text-[#F5F7F6]">
              {requisitions.length || 3}
            </div>
          </div>
          <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] space-y-0.5">
            <span className="text-[10px] font-mono text-[#D97706] uppercase">Pending Approval</span>
            <div className="text-base font-bold font-mono text-[#D97706]">
              {pendingApprovalsCount || 1}
            </div>
          </div>
          <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] space-y-0.5">
            <span className="text-[10px] font-mono text-[#15803D] uppercase">Certified Suppliers</span>
            <div className="text-base font-bold font-mono text-[#15803D]">
              {displaySuppliers.length} Active
            </div>
          </div>
        </div>
      </PaperSheet>

      {/* 2. SEGMENTED TAB NAVIGATION */}
      <div className="flex items-center gap-1 p-1 rounded-xs bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('requisitions')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xs text-xs font-mono font-semibold transition-all ${
            activeTab === 'requisitions'
              ? 'bg-[#15803D] text-white shadow-xs'
              : 'text-[#68716D] dark:text-[#8E9C97] hover:text-[#1C201E]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>1. Requisitions</span>
          <span className="px-1.5 py-0.2 rounded-xs bg-black/20 text-[10px]">
            {requisitions.length || 3}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xs text-xs font-mono font-semibold transition-all ${
            activeTab === 'suppliers'
              ? 'bg-[#15803D] text-white shadow-xs'
              : 'text-[#68716D] dark:text-[#8E9C97] hover:text-[#1C201E]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>2. Evaluated Suppliers</span>
          <span className="px-1.5 py-0.2 rounded-xs bg-black/20 text-[10px]">
            {displaySuppliers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xs text-xs font-mono font-semibold transition-all ${
            activeTab === 'pos'
              ? 'bg-[#15803D] text-white shadow-xs'
              : 'text-[#68716D] dark:text-[#8E9C97] hover:text-[#1C201E]'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>3. Dispatched POs</span>
          <span className="px-1.5 py-0.2 rounded-xs bg-black/20 text-[10px]">
            {displayPos.length}
          </span>
        </button>
      </div>

      {/* 3. TAB 1: REQUISITIONS */}
      {activeTab === 'requisitions' && (
        <PaperSheet variant="default" className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#E3DDD1] dark:border-[#2B3835]">
            <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
              Purchase Requisitions Queue
            </h3>
            <span className="text-[10px] font-mono text-[#68716D]">Step 1: PR Creation & Approval</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#E3DDD1] dark:border-[#2B3835] text-[10px] text-[#68716D]">
                  <th className="py-2.5 font-semibold">PR Identifier</th>
                  <th className="py-2.5 font-semibold">Requested Items</th>
                  <th className="py-2.5 font-semibold">Quantity</th>
                  <th className="py-2.5 font-semibold text-right">Est. Value</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold text-right">Operational Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3DDD1]/60">
                {(requisitions.length > 0 ? requisitions : [
                  {
                    _id: 'pr-1',
                    prNumber: 'PR-1001',
                    items: [{ productName: 'Precision Steel Bearings', quantity: 500, estimatedUnitPrice: 277 }],
                    totalAmount: 138500,
                    status: 'APPROVED'
                  },
                  {
                    _id: 'pr-2',
                    prNumber: 'PR-1002',
                    items: [{ productName: 'High-Torque Induction Motors', quantity: 100, estimatedUnitPrice: 850 }],
                    totalAmount: 85000,
                    status: 'PENDING'
                  },
                  {
                    _id: 'pr-3',
                    prNumber: 'PR-1003',
                    items: [{ productName: 'Hydraulic Pressure Valves', quantity: 250, estimatedUnitPrice: 170 }],
                    totalAmount: 42500,
                    status: 'CONVERTED_TO_PO'
                  }
                ]).map((pr) => (
                  <tr key={pr._id} className="hover:bg-[#F4EFE6]/50 transition-colors">
                    <td className="py-3 font-bold text-[#15803D]">{pr.prNumber}</td>
                    <td className="py-3 font-sans font-medium text-[#1C201E] dark:text-[#F5F7F6]">
                      {pr.items?.map(i => i.productName).join(', ')}
                    </td>
                    <td className="py-3 font-mono">
                      {pr.items?.reduce((s, i) => s + i.quantity, 0).toLocaleString()} units
                    </td>
                    <td className="py-3 text-right font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                      ₹{(pr.totalAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-xs text-[8px] font-bold uppercase ${
                        pr.status === 'APPROVED' ? 'bg-[#DCFCE7] text-[#15803D]' :
                        pr.status === 'CONVERTED_TO_PO' ? 'bg-[#DBEAFE] text-[#2563EB]' :
                        'bg-[#FEF3C7] text-[#D97706]'
                      }`}>
                        {pr.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {pr.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleApprovePr(pr._id)}
                          disabled={submitting}
                          className="px-2.5 py-1 rounded-xs bg-[#15803D] text-white text-[10px] font-bold hover:bg-[#166534]"
                        >
                          Approve PR
                        </button>
                      )}
                      {pr.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPrForPo(pr);
                            setPoItems(pr.items?.map(item => ({
                              product: item.product,
                              productName: item.productName,
                              quantity: item.quantity,
                              unitPrice: item.estimatedUnitPrice
                            })) || []);
                          }}
                          className="px-2.5 py-1 rounded-xs bg-[#2563EB] text-white text-[10px] font-bold hover:bg-[#1D4ED8] inline-flex items-center gap-1"
                        >
                          <span>Convert to PO</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {pr.status === 'CONVERTED_TO_PO' && (
                        <span className="text-[10px] text-[#68716D] font-bold">✓ PO Dispatched</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PaperSheet>
      )}

      {/* 4. TAB 2: SUPPLIERS MATRIX */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {displaySuppliers.map((sup, idx) => (
            <PaperSheet key={sup._id} variant="default" className="p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <h4 className="font-sans font-bold text-sm text-[#1C201E] dark:text-[#F5F7F6]">
                      {sup.name}
                    </h4>
                    <span className="text-[10px] font-mono text-[#68716D]">{sup.code} • {sup.category}</span>
                  </div>
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-xs bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{sup.rating}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-[#68716D]">
                    <span>AI Supplier Rating</span>
                    <strong className="text-[#15803D]">{sup.score || 92} / 100</strong>
                  </div>
                  <div className="w-full h-1.5 rounded-xs bg-[#EAE7DC] dark:bg-[#252D2B] overflow-hidden">
                    <div className="h-full rounded-xs bg-[#15803D]" style={{ width: `${sup.score || 92}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B]">
                    <span className="text-[9px] text-[#68716D] block">OTD SCORE</span>
                    <strong className="text-[#15803D] font-bold">{sup.otdScore}%</strong>
                  </div>
                  <div className="p-2 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B]">
                    <span className="text-[9px] text-[#68716D] block">LEAD TIME</span>
                    <strong className="text-[#1C201E] dark:text-[#F5F7F6] font-bold">{sup.leadTimeDays} Days</strong>
                  </div>
                </div>

                {sup.recommendationReason && (
                  <p className="p-2 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] text-[10px] text-[#68716D] dark:text-[#8E9C97] leading-relaxed">
                    {sup.recommendationReason}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-[#E3DDD1] dark:border-[#2B3835] flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#68716D] truncate max-w-[140px]">{sup.email}</span>
                <span className="text-[#15803D] font-bold">{sup.status}</span>
              </div>
            </PaperSheet>
          ))}
        </div>
      )}

      {/* 5. TAB 3: PURCHASE ORDERS */}
      {activeTab === 'pos' && (
        <PaperSheet variant="default" className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#E3DDD1] dark:border-[#2B3835]">
            <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
              All Dispatched Purchase Orders
            </h3>
            <span className="text-[10px] font-mono text-[#68716D]">Step 3: Dispatched PO Pipeline</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#E3DDD1] dark:border-[#2B3835] text-[10px] text-[#68716D]">
                  <th className="py-2.5 font-semibold">PO Number</th>
                  <th className="py-2.5 font-semibold">Dispatched Supplier</th>
                  <th className="py-2.5 font-semibold">Line Items Specification</th>
                  <th className="py-2.5 font-semibold text-right">Committed Value</th>
                  <th className="py-2.5 font-semibold">Fulfillment State</th>
                  <th className="py-2.5 font-semibold">Issue Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3DDD1]/60">
                {displayPos.map((po) => {
                  const supName = po.supplierName || po.supplier?.name || 'Authorized Supplier';
                  const itemDesc = po.items?.map(i => `${i.quantity} × ${i.productName || 'Industrial Parts'}`).join(', ') || '500 units';

                  let badge = 'bg-[#DBEAFE] text-[#2563EB]';
                  if (po.status === 'COMPLETED' || po.status === 'RECEIVED') badge = 'bg-[#DCFCE7] text-[#15803D]';
                  if (po.status === 'AT_GATE' || po.status === 'WAITING_FOR_DOCK') badge = 'bg-[#FEF3C7] text-[#D97706]';

                  return (
                    <tr key={po._id || po.poNumber} className="hover:bg-[#F4EFE6]/50 transition-colors">
                      <td className="py-3 font-bold text-[#15803D]">{po.poNumber}</td>
                      <td className="py-3 font-sans font-medium text-[#1C201E] dark:text-[#F5F7F6]">{supName}</td>
                      <td className="py-3 font-sans text-[#68716D] dark:text-[#8E9C97]">{itemDesc}</td>
                      <td className="py-3 text-right font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                        ₹{(po.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-xs text-[8px] font-bold uppercase ${badge}`}>
                          {po.status || 'IN_TRANSIT'}
                        </span>
                      </td>
                      <td className="py-3 text-[#68716D] text-[10px]">
                        {po.createdAt ? new Date(po.createdAt).toLocaleDateString() : 'Active'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PaperSheet>
      )}

      {/* MODAL: DRAFT REQUISITION */}
      {isPrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] rounded-xs p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3DDD1] dark:border-[#2B3835]">
              <h3 className="font-handwriting text-xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                Draft Purchase Requisition (PR)
              </h3>
              <button type="button" onClick={() => setIsPrModalOpen(false)} className="text-[#68716D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePr} className="space-y-3 text-xs font-sans">
              <div className="space-y-1">
                <label className="font-semibold text-[#1C201E] dark:text-[#F5F7F6]">Item Specification / SKU</label>
                <input
                  type="text"
                  value={newPrItem}
                  onChange={(e) => setNewPrItem(e.target.value)}
                  placeholder="e.g. Precision Ball Bearings"
                  className="w-full px-3 py-2 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] focus:outline-none focus:border-[#15803D]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#1C201E] dark:text-[#F5F7F6]">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newPrQty}
                    onChange={(e) => setNewPrQty(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] focus:outline-none focus:border-[#15803D]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#1C201E] dark:text-[#F5F7F6]">Unit Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={newPrPrice}
                    onChange={(e) => setNewPrPrice(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] focus:outline-none focus:border-[#15803D]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3DDD1] dark:border-[#2B3835]">
                <button
                  type="button"
                  onClick={() => setIsPrModalOpen(false)}
                  className="px-3 py-1.5 rounded-xs border border-[#E3DDD1] text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xs bg-[#15803D] text-white text-xs font-mono font-bold hover:bg-[#166534] disabled:opacity-50"
                >
                  {submitting ? 'Creating PR...' : 'Submit Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONVERT PR TO PO */}
      {selectedPrForPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] rounded-xs p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3DDD1] dark:border-[#2B3835]">
              <div>
                <h3 className="font-handwriting text-xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                  Convert {selectedPrForPo.prNumber} to Purchase Order
                </h3>
                <p className="text-[10px] font-mono text-[#68716D]">Step 2: Assign Certified Supplier & Dispatch</p>
              </div>
              <button type="button" onClick={() => setSelectedPrForPo(null)} className="text-[#68716D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-3 text-xs font-sans">
              <div className="space-y-1">
                <label className="font-semibold text-[#1C201E] dark:text-[#F5F7F6]">Select Certified Supplier</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] focus:outline-none focus:border-[#15803D]"
                  required
                >
                  <option value="">-- Choose Evaluated Vendor --</option>
                  {displaySuppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code} • OTD: {s.otdScore}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] space-y-1">
                <span className="text-[10px] font-mono text-[#68716D] uppercase">PO Items</span>
                {poItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between font-mono text-xs">
                    <span>{item.quantity} × {item.productName}</span>
                    <strong>₹{((item.quantity || 1) * (item.unitPrice || 1)).toLocaleString('en-IN')}</strong>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3DDD1] dark:border-[#2B3835]">
                <button
                  type="button"
                  onClick={() => setSelectedPrForPo(null)}
                  className="px-3 py-1.5 rounded-xs border border-[#E3DDD1] text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedSupplierId}
                  className="px-4 py-1.5 rounded-xs bg-[#15803D] text-white text-xs font-mono font-bold hover:bg-[#166534] disabled:opacity-50"
                >
                  {submitting ? 'Dispatching PO...' : 'Dispatch Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
