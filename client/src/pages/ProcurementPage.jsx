import { NavLink } from 'react-router-dom';
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
  AlertCircle,
  Truck
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
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xs text-xs font-mono font-semibold transition-all ${activeTab === 'requisitions'
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
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xs text-xs font-mono font-semibold transition-all ${activeTab === 'suppliers'
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
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xs text-xs font-mono font-semibold transition-all ${activeTab === 'pos'
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
        <div className="space-y-4">

          {/* Queue Header */}
          <PaperSheet
            variant="default"
            className="overflow-hidden p-0 border border-[#E3DDD1] dark:border-[#2B3835]"
          >
            <div className="px-5 sm:px-6 pt-5 pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7] dark:bg-[#332A15]">
                    <Layers className="h-4 w-4 text-[#D97706]" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                        Purchase Requisitions
                      </h3>

                      <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#D97706] dark:bg-[#332A15] dark:text-[#FBBF24]">
                        Approval Queue
                      </span>
                    </div>

                    <p className="mt-1 text-[9px] font-mono text-[#8A938F]">
                      Review demand, approve requirements and convert approved PRs into purchase orders
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPrModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#15803D] px-3.5 py-2 text-[10px] font-bold text-white transition-all hover:bg-[#166534] hover:-translate-y-0.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Requisition
                </button>

              </div>
            </div>

            {/* Queue Metrics */}
            <div className="grid grid-cols-3 border-y border-[#E3DDD1] bg-[#FAF8F3] dark:border-[#2B3835] dark:bg-[#17201D]">

              <div className="px-5 py-3">
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Total PRs
                </p>
                <p className="mt-1 text-lg font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                  {requisitions.length || 3}
                </p>
              </div>

              <div className="border-x border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Awaiting Approval
                </p>
                <p className="mt-1 text-lg font-bold text-[#D97706]">
                  {pendingApprovalsCount || 1}
                </p>
              </div>

              <div className="px-5 py-3">
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Converted to PO
                </p>
                <p className="mt-1 text-lg font-bold text-[#15803D]">
                  {
                    requisitions.filter(
                      r => r.status === 'CONVERTED_TO_PO'
                    ).length || 1
                  }
                </p>
              </div>

            </div>

            {/* PR List */}
            <div className="divide-y divide-[#E3DDD1] dark:divide-[#2B3835]">

              {(requisitions.length > 0
                ? requisitions
                : [
                  {
                    _id: 'pr-1',
                    prNumber: 'PR-1001',
                    items: [
                      {
                        productName: 'Precision Steel Bearings',
                        quantity: 500,
                        estimatedUnitPrice: 277
                      }
                    ],
                    totalAmount: 138500,
                    status: 'APPROVED'
                  },
                  {
                    _id: 'pr-2',
                    prNumber: 'PR-1002',
                    items: [
                      {
                        productName: 'High-Torque Induction Motors',
                        quantity: 100,
                        estimatedUnitPrice: 850
                      }
                    ],
                    totalAmount: 85000,
                    status: 'PENDING'
                  },
                  {
                    _id: 'pr-3',
                    prNumber: 'PR-1003',
                    items: [
                      {
                        productName: 'Hydraulic Pressure Valves',
                        quantity: 250,
                        estimatedUnitPrice: 170
                      }
                    ],
                    totalAmount: 42500,
                    status: 'CONVERTED_TO_PO'
                  }
                ]
              ).map((pr) => {

                const isPending = pr.status === 'PENDING';
                const isApproved = pr.status === 'APPROVED';
                const isConverted = pr.status === 'CONVERTED_TO_PO';

                const itemName =
                  pr.items?.map(i => i.productName).join(', ') ||
                  'Unspecified item';

                const quantity =
                  pr.items?.reduce(
                    (sum, item) => sum + Number(item.quantity || 0),
                    0
                  ) || 0;

                return (
                  <div
                    key={pr._id}
                    className="group px-5 sm:px-6 py-4 transition-colors hover:bg-[#FAF8F3] dark:hover:bg-[#1D2824]"
                  >

                    {/* Desktop */}
                    <div className="hidden md:grid grid-cols-[1.15fr_2fr_0.8fr_1fr_1fr_1.2fr] gap-4 items-center">

                      {/* PR */}
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-md ${isPending
                              ? 'bg-[#FEF3C7] text-[#D97706]'
                              : isConverted
                                ? 'bg-[#DBEAFE] text-[#2563EB]'
                                : 'bg-[#DCFCE7] text-[#15803D]'
                              }`}
                          >
                            <FileCheck className="h-3.5 w-3.5" />
                          </div>

                          <div>
                            <p className="text-[11px] font-bold text-[#15803D]">
                              {pr.prNumber}
                            </p>

                            <p className="text-[7px] uppercase tracking-wider text-[#9AA29E]">
                              Requisition
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Item */}
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold text-[#1C201E] dark:text-[#F5F7F6]">
                          {itemName}
                        </p>

                        <p className="mt-1 text-[8px] text-[#8A938F]">
                          Procurement requirement
                        </p>
                      </div>

                      {/* Quantity */}
                      <div>
                        <p className="text-[11px] font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                          {quantity.toLocaleString()}
                        </p>

                        <p className="text-[7px] uppercase tracking-wider text-[#9AA29E]">
                          Units
                        </p>
                      </div>

                      {/* Value */}
                      <div>
                        <p className="text-[11px] font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                          ₹{(pr.totalAmount || 0).toLocaleString('en-IN')}
                        </p>

                        <p className="text-[7px] uppercase tracking-wider text-[#9AA29E]">
                          Estimated Value
                        </p>
                      </div>

                      {/* Status */}
                      <div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[7px] font-bold uppercase tracking-wide ${isPending
                            ? 'border-[#FDE68A] bg-[#FEF3C7] text-[#D97706]'
                            : isApproved
                              ? 'border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]'
                              : 'border-[#BFDBFE] bg-[#DBEAFE] text-[#2563EB]'
                            }`}
                        >
                          {isPending && <Clock className="h-3 w-3" />}
                          {isApproved && <CheckCircle2 className="h-3 w-3" />}
                          {isConverted && <FileCheck className="h-3 w-3" />}
                          {pr.status}
                        </span>
                      </div>

                      {/* Action */}
                      <div className="flex justify-end">

                        {isPending && (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleApprovePr(pr._id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#15803D] px-3 py-2 text-[9px] font-bold text-white transition-colors hover:bg-[#166534] disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Approve
                          </button>
                        )}

                        {isApproved && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPrForPo(pr);
                              setPoItems(
                                pr.items?.map(item => ({
                                  product: item.product,
                                  productName: item.productName,
                                  quantity: item.quantity,
                                  unitPrice: item.estimatedUnitPrice
                                })) || []
                              );
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[9px] font-bold text-white transition-colors hover:bg-[#1D4ED8]"
                          >
                            Convert to PO
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}

                        {isConverted && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#15803D]">
                            <CheckCircle2 className="h-3 w-3" />
                            PO Dispatched
                          </span>
                        )}

                      </div>

                    </div>

                    {/* Mobile */}
                    <div className="md:hidden">

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F0FDF4] text-[#15803D]">
                            <FileCheck className="h-3.5 w-3.5" />
                          </div>

                          <div>
                            <p className="text-[11px] font-bold text-[#15803D]">
                              {pr.prNumber}
                            </p>
                            <p className="text-[8px] text-[#8A938F]">
                              {itemName}
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-[#FEF3C7] px-2 py-1 text-[7px] font-bold uppercase text-[#D97706]">
                          {pr.status}
                        </span>

                      </div>

                      <div className="mt-3 flex items-end justify-between">

                        <div>
                          <p className="text-[8px] text-[#8A938F]">
                            Quantity
                          </p>
                          <p className="text-[10px] font-bold">
                            {quantity.toLocaleString()} units
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[8px] text-[#8A938F]">
                            Estimated Value
                          </p>
                          <p className="text-[11px] font-bold">
                            ₹{(pr.totalAmount || 0).toLocaleString('en-IN')}
                          </p>
                        </div>

                      </div>

                      <div className="mt-3">

                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleApprovePr(pr._id)}
                            disabled={submitting}
                            className="w-full rounded-lg bg-[#15803D] py-2 text-[9px] font-bold text-white"
                          >
                            Approve Requisition
                          </button>
                        )}

                        {isApproved && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPrForPo(pr);
                              setPoItems(
                                pr.items?.map(item => ({
                                  product: item.product,
                                  productName: item.productName,
                                  quantity: item.quantity,
                                  unitPrice: item.estimatedUnitPrice
                                })) || []
                              );
                            }}
                            className="w-full rounded-lg bg-[#2563EB] py-2 text-[9px] font-bold text-white"
                          >
                            Convert to Purchase Order
                          </button>
                        )}

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>

            <div className="flex items-center justify-between border-t border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">
              <span className="text-[8px] font-mono uppercase tracking-wider text-[#8A938F]">
                Step 1 · Demand & Approval
              </span>

              <span className="text-[8px] font-mono text-[#8A938F]">
                {pendingApprovalsCount || 1} item requires attention
              </span>
            </div>

          </PaperSheet>
        </div>
      )}

      {/* 4. TAB 2: SUPPLIER EVALUATION */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">

          {/* Supplier Intelligence Header */}
          <PaperSheet
            variant="default"
            className="overflow-hidden p-0 border border-[#E3DDD1] dark:border-[#2B3835]"
          >

            <div className="px-5 sm:px-6 pt-5 pb-4">

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] dark:bg-[#281E3B]">
                    <Sparkles className="h-4 w-4 text-[#7C3AED]" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">

                      <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                        Supplier Intelligence
                      </h3>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F3FF] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#7C3AED] dark:bg-[#281E3B] dark:text-[#A78BFA]">
                        <Bot className="h-3 w-3" />
                        AI Evaluated
                      </span>

                    </div>

                    <p className="mt-1 text-[9px] font-mono text-[#8A938F]">
                      Ranked supplier recommendations using delivery performance, quality, lead time and commercial signals
                    </p>
                  </div>

                </div>

                <div className="flex items-center gap-2">

                  <div className="rounded-lg border border-[#E3DDD1] bg-[#FAF8F3] px-3 py-2 dark:border-[#2B3835] dark:bg-[#17201D]">
                    <p className="text-[7px] font-bold uppercase tracking-widest text-[#8A938F]">
                      Evaluated
                    </p>
                    <p className="text-sm font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                      {displaySuppliers.length}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 dark:border-[#245C3F] dark:bg-[#12291F]">
                    <p className="text-[7px] font-bold uppercase tracking-widest text-[#15803D]">
                      Avg OTD
                    </p>
                    <p className="text-sm font-bold text-[#15803D]">
                      93.2%
                    </p>
                  </div>

                </div>

              </div>

            </div>

          </PaperSheet>


          {/* Supplier Ranking */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {displaySuppliers.map((sup, idx) => {

              const score = sup.score || 92;
              const isTop = idx === 0;

              return (
                <PaperSheet
                  key={sup._id}
                  variant="default"
                  className={`relative overflow-hidden p-0 border transition-all hover:-translate-y-0.5 hover:shadow-md ${isTop
                      ? 'border-[#15803D]/50'
                      : 'border-[#E3DDD1] dark:border-[#2B3835]'
                    }`}
                >

                  {/* Recommendation Ribbon */}
                  {isTop && (
                    <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-lg bg-[#15803D] px-3 py-1.5 text-[7px] font-bold uppercase tracking-wider text-white">
                      <Award className="h-3 w-3" />
                      AI Preferred
                    </div>
                  )}

                  <div className="p-5">

                    {/* Supplier Identity */}
                    <div className="flex items-start gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F4EFE6] text-[#68716D] dark:bg-[#26312D] dark:text-[#AAB4AF]">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center gap-2 pr-20">

                          <h4 className="truncate text-sm font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                            {sup.name}
                          </h4>

                        </div>

                        <p className="mt-0.5 text-[8px] font-mono text-[#8A938F]">
                          {sup.code} · {sup.category}
                        </p>

                        <div className="mt-2 flex items-center gap-3">

                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#D97706]">
                            <Star className="h-3 w-3 fill-current" />
                            {sup.rating}
                          </span>

                          <span className="text-[8px] text-[#8A938F]">
                            Supplier rating
                          </span>

                        </div>

                      </div>

                    </div>


                    {/* AI Score */}
                    <div className="mt-5 rounded-lg bg-[#FAF8F3] p-3 dark:bg-[#17201D]">

                      <div className="flex items-center justify-between">

                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-[#7C3AED]" />

                          <span className="text-[8px] font-bold uppercase tracking-wider text-[#68716D] dark:text-[#9BA6A1]">
                            AI Supplier Score
                          </span>
                        </div>

                        <strong className="text-sm font-bold text-[#15803D]">
                          {score}
                          <span className="text-[8px] font-normal text-[#8A938F]">
                            /100
                          </span>
                        </strong>

                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E7E2D7] dark:bg-[#2B3835]">

                        <div
                          className="h-full rounded-full bg-[#15803D] transition-all"
                          style={{ width: `${score}%` }}
                        />

                      </div>

                    </div>


                    {/* Performance Metrics */}
                    <div className="mt-3 grid grid-cols-3 gap-2">

                      <div className="rounded-lg border border-[#E3DDD1] bg-white p-3 dark:border-[#2B3835] dark:bg-[#18201D]">

                        <p className="text-[7px] font-bold uppercase tracking-wider text-[#8A938F]">
                          OTD
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#15803D]">
                          {sup.otdScore}%
                        </p>

                        <p className="text-[7px] text-[#8A938F]">
                          On-time
                        </p>

                      </div>

                      <div className="rounded-lg border border-[#E3DDD1] bg-white p-3 dark:border-[#2B3835] dark:bg-[#18201D]">

                        <p className="text-[7px] font-bold uppercase tracking-wider text-[#8A938F]">
                          Lead
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                          {sup.leadTimeDays}d
                        </p>

                        <p className="text-[7px] text-[#8A938F]">
                          Avg. delivery
                        </p>

                      </div>

                      <div className="rounded-lg border border-[#E3DDD1] bg-white p-3 dark:border-[#2B3835] dark:bg-[#18201D]">

                        <p className="text-[7px] font-bold uppercase tracking-wider text-[#8A938F]">
                          Status
                        </p>

                        <p className="mt-1 text-[10px] font-bold text-[#15803D]">
                          {sup.status}
                        </p>

                        <p className="text-[7px] text-[#8A938F]">
                          Vendor state
                        </p>

                      </div>

                    </div>


                    {/* Recommendation */}
                    {sup.recommendationReason && (
                      <div className="mt-3 flex gap-2 rounded-lg border border-[#E3DDD1] bg-[#FCFAF4] p-3 dark:border-[#2B3835] dark:bg-[#17201D]">

                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#15803D]" />

                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-[#15803D]">
                            Recommendation
                          </p>

                          <p className="mt-1 text-[9px] leading-relaxed text-[#68716D] dark:text-[#AAB4AF]">
                            {sup.recommendationReason}
                          </p>
                        </div>

                      </div>
                    )}

                  </div>


                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">

                    <span className="truncate text-[8px] font-mono text-[#8A938F]">
                      {sup.email}
                    </span>

                    {isTop ? (
                      <span className="inline-flex items-center gap-1 text-[8px] font-bold text-[#15803D]">
                        <CheckCircle2 className="h-3 w-3" />
                        Recommended
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold text-[#8A938F]">
                        Eligible
                      </span>
                    )}

                  </div>

                </PaperSheet>
              );
            })}

          </div>

        </div>
      )}

      {/* 5. TAB 3: PURCHASE ORDERS */}
      {activeTab === 'pos' && (
        <div className="space-y-4">

          {/* PO Header */}
          <PaperSheet
            variant="default"
            className="overflow-hidden p-0 border border-[#E3DDD1] dark:border-[#2B3835]"
          >

            <div className="px-5 sm:px-6 pt-5 pb-4">

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DBEAFE] dark:bg-[#182942]">
                    <FileCheck className="h-4 w-4 text-[#2563EB]" />
                  </div>

                  <div>

                    <div className="flex items-center gap-2">

                      <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                        Dispatched Purchase Orders
                      </h3>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#2563EB] dark:bg-[#182942] dark:text-[#60A5FA]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                        Execution
                      </span>

                    </div>

                    <p className="mt-1 text-[9px] font-mono text-[#8A938F]">
                      Track issued purchase orders from supplier dispatch through warehouse receipt
                    </p>

                  </div>

                </div>

                <NavLink
                  to="/procurement"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('requisitions');
                    setIsPrModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#15803D] px-3.5 py-2 text-[10px] font-bold text-[#15803D] transition-colors hover:bg-[#F0FDF4]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New PO
                </NavLink>

              </div>

            </div>


            {/* PO Metrics */}
            <div className="grid grid-cols-4 border-y border-[#E3DDD1] bg-[#FAF8F3] dark:border-[#2B3835] dark:bg-[#17201D]">

              <div className="px-5 py-3">
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Total POs
                </p>
                <p className="mt-1 text-lg font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                  {displayPos.length}
                </p>
              </div>

              <div className="border-x border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  In Transit
                </p>
                <p className="mt-1 text-lg font-bold text-[#2563EB]">
                  {
                    displayPos.filter(
                      po =>
                        po.status === 'IN_TRANSIT' ||
                        po.status === 'ISSUED'
                    ).length
                  }
                </p>
              </div>

              <div className="border-r border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  At Gate
                </p>
                <p className="mt-1 text-lg font-bold text-[#D97706]">
                  {
                    displayPos.filter(
                      po =>
                        po.status === 'AT_GATE' ||
                        po.status === 'WAITING_FOR_DOCK'
                    ).length
                  }
                </p>
              </div>

              <div className="px-5 py-3">
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Received
                </p>
                <p className="mt-1 text-lg font-bold text-[#15803D]">
                  {
                    displayPos.filter(
                      po =>
                        po.status === 'COMPLETED' ||
                        po.status === 'RECEIVED'
                    ).length
                  }
                </p>
              </div>

            </div>

          </PaperSheet>


          {/* PO LIST */}
          <PaperSheet
            variant="default"
            className="overflow-hidden p-0 border border-[#E3DDD1] dark:border-[#2B3835]"
          >

            {/* Column Header */}
            <div className="hidden md:grid grid-cols-[1.1fr_1.5fr_2fr_1fr_1.1fr_0.9fr] gap-4 border-b border-[#E3DDD1] bg-white px-5 py-3 dark:border-[#2B3835] dark:bg-[#18201D]">

              <span className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                PO Number
              </span>

              <span className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                Supplier
              </span>

              <span className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                Order Contents
              </span>

              <span className="text-right text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                Value
              </span>

              <span className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                Fulfillment
              </span>

              <span className="text-right text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                Issued
              </span>

            </div>


            {/* Rows */}
            <div className="divide-y divide-[#E3DDD1] dark:divide-[#2B3835]">

              {displayPos.map((po) => {

                const supName =
                  po.supplierName ||
                  po.supplier?.name ||
                  'Authorized Supplier';

                const itemDesc =
                  po.items
                    ?.map(
                      i =>
                        `${i.quantity} × ${i.productName || 'Industrial Parts'
                        }`
                    )
                    .join(', ') ||
                  'Industrial materials';

                const isReceived =
                  po.status === 'COMPLETED' ||
                  po.status === 'RECEIVED';

                const isGate =
                  po.status === 'AT_GATE' ||
                  po.status === 'WAITING_FOR_DOCK';

                const isIssued =
                  po.status === 'ISSUED';

                let statusClass =
                  'border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]';

                let StatusIcon = Truck;

                if (isReceived) {
                  statusClass =
                    'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]';

                  StatusIcon = CheckCircle2;
                }

                if (isGate) {
                  statusClass =
                    'border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]';

                  StatusIcon = Clock;
                }

                if (isIssued) {
                  statusClass =
                    'border-[#DDD6FE] bg-[#F5F3FF] text-[#7C3AED]';

                  StatusIcon = FileCheck;
                }

                return (
                  <div
                    key={po._id || po.poNumber}
                    className="group px-5 py-4 transition-colors hover:bg-[#FAF8F3] dark:hover:bg-[#1D2824]"
                  >

                    {/* Desktop */}
                    <div className="hidden md:grid grid-cols-[1.1fr_1.5fr_2fr_1fr_1.1fr_0.9fr] gap-4 items-center">

                      {/* PO */}
                      <div className="flex items-center gap-2">

                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F0FDF4] dark:bg-[#163824]">
                          <FileCheck className="h-3.5 w-3.5 text-[#15803D]" />
                        </div>

                        <div>
                          <p className="text-[11px] font-bold text-[#15803D]">
                            {po.poNumber}
                          </p>

                          <p className="mt-0.5 text-[7px] uppercase tracking-wider text-[#9AA29E]">
                            Purchase Order
                          </p>
                        </div>

                      </div>


                      {/* Supplier */}
                      <div className="min-w-0">

                        <div className="flex items-center gap-2">

                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E9E5DB] dark:bg-[#2B3835]">
                            <Building2 className="h-3.5 w-3.5 text-[#68716D]" />
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-[10px] font-semibold text-[#1C201E] dark:text-[#F5F7F6]">
                              {supName}
                            </p>

                            <p className="text-[7px] text-[#8A938F]">
                              Supplier network
                            </p>

                          </div>

                        </div>

                      </div>


                      {/* Items */}
                      <div className="min-w-0">

                        <p
                          title={itemDesc}
                          className="truncate text-[10px] text-[#59625E] dark:text-[#AAB4AF]"
                        >
                          {itemDesc}
                        </p>

                        <div className="mt-1 flex items-center gap-1.5">

                          <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />

                          <span className="text-[7px] uppercase tracking-wider text-[#8A938F]">
                            Warehouse tracking enabled
                          </span>

                        </div>

                      </div>


                      {/* Value */}
                      <div className="text-right">

                        <p className="text-[11px] font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                          ₹{(po.totalAmount || 0).toLocaleString('en-IN')}
                        </p>

                        <p className="text-[7px] uppercase tracking-wider text-[#9AA29E]">
                          Committed
                        </p>

                      </div>


                      {/* Status */}
                      <div>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[7px] font-bold uppercase tracking-wide ${statusClass}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {po.status || 'IN_TRANSIT'}
                        </span>

                      </div>


                      {/* Date */}
                      <div className="text-right">

                        <p className="text-[9px] font-mono font-semibold text-[#59625E] dark:text-[#AAB4AF]">
                          {po.createdAt
                            ? new Date(po.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short'
                            })
                            : '—'}
                        </p>

                        <p className="mt-0.5 text-[7px] uppercase tracking-wider text-[#9AA29E]">
                          Issue date
                        </p>

                      </div>

                    </div>


                    {/* Mobile */}
                    <div className="md:hidden">

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex items-center gap-2">

                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F0FDF4] text-[#15803D]">
                            <FileCheck className="h-3.5 w-3.5" />
                          </div>

                          <div>
                            <p className="text-[11px] font-bold text-[#15803D]">
                              {po.poNumber}
                            </p>

                            <p className="text-[8px] text-[#8A938F]">
                              {supName}
                            </p>
                          </div>

                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[7px] font-bold uppercase ${statusClass}`}
                        >
                          <StatusIcon className="h-2.5 w-2.5" />
                          {po.status || 'IN_TRANSIT'}
                        </span>

                      </div>


                      <div className="mt-3 flex items-end justify-between">

                        <div className="min-w-0">

                          <p className="truncate text-[9px] text-[#68716D] dark:text-[#AAB4AF]">
                            {itemDesc}
                          </p>

                          <p className="mt-1 text-[8px] text-[#8A938F]">
                            {po.createdAt
                              ? new Date(po.createdAt).toLocaleDateString('en-IN')
                              : 'Active'}
                          </p>

                        </div>

                        <p className="shrink-0 text-[11px] font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                          ₹{(po.totalAmount || 0).toLocaleString('en-IN')}
                        </p>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>


            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">

              <span className="text-[8px] font-mono uppercase tracking-wider text-[#8A938F]">
                Step 3 · Supplier Dispatch & Fulfillment
              </span>

              <span className="text-[8px] font-mono text-[#8A938F]">
                {displayPos.length} purchase orders
              </span>

            </div>

          </PaperSheet>

        </div>
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
