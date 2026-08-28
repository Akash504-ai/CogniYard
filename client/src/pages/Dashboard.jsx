import React, { useState, useEffect } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { procurementAPI, financeAPI, logisticsAPI } from '../services/api';
import { useAuth, ROLES } from '../context/AuthContext';
import { PaperSheet } from '../components/layout/PaperSheet';
import YardControlMap from '../components/yard/YardControlMap';
import PalletSummary from '../components/yard/PalletSummary';
import DockStatusBoard from '../components/yard/DockStatusBoard';
import AlertsPanel from '../components/yard/AlertsPanel';
import OperationalActivityFeed from '../components/yard/OperationalActivityFeed';
import QuickActionsSheet from '../components/yard/QuickActionsSheet';
import LPNDetailSheet from '../components/inventory/LPNDetailSheet';
import SupplierScorecard from '../components/procurement/SupplierScorecard';
import ThreeWayMatchDiff from '../components/finance/ThreeWayMatchDiff';
import {
  Truck,
  Boxes,
  Package,
  DoorOpen,
  Clock,
  ShoppingCart,
  Receipt,
  ReceiptText,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileText,
  CreditCard,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Plus,
  ArrowRight,
  Scale,
  X,
  GitCompare,
  Search,
  Move,
  Printer,
  ClipboardCheck,
  Barcode,
  MapPin,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Layers,
  ShieldAlert
} from 'lucide-react';

export default function Dashboard() {
  const { currentRole, showNotification } = useAuth();
  const navigate = useNavigate();
  const [selectedLpn, setSelectedLpn] = useState(null);
  const [selectedFinanceAuditInvoice, setSelectedFinanceAuditInvoice] = useState(null);

  // State for live procurement data
  const [livePos, setLivePos] = useState([]);
  const [livePrs, setLivePrs] = useState([]);
  const [liveSuppliers, setLiveSuppliers] = useState([]);
  const [procLoading, setProcLoading] = useState(false);

  // State for live finance data
  const [liveInvoices, setLiveInvoices] = useState([]);
  const [livePayments, setLivePayments] = useState([]);
  const [financeManualApprovals, setFinanceManualApprovals] = useState(() => new Map());

  // State for live warehouse & yard logistics data
  const [liveTrucks, setLiveTrucks] = useState([]);
  const [liveDocks, setLiveDocks] = useState([]);
  const [liveInventory, setLiveInventory] = useState([]);
  const [liveGoodsReceipts, setLiveGoodsReceipts] = useState([]);
  const [customCreatedLpns, setCustomCreatedLpns] = useState([]);
  const [relocatedLocations, setRelocatedLocations] = useState(() => new Map());
  const [yardLoading, setYardLoading] = useState(false);

  // Modals for Quick Actions
  const [isCreateLpnOpen, setIsCreateLpnOpen] = useState(false);
  const [isRelocateOpen, setIsRelocateOpen] = useState(false);
  const [isPrintLabelOpen, setIsPrintLabelOpen] = useState(false);
  const [selectedPrintLpn, setSelectedPrintLpn] = useState(null);

  useEffect(() => {
    if (currentRole === ROLES.PROCUREMENT) {
      fetchProcurementDashboard();
    } else if (currentRole === ROLES.FINANCE) {
      fetchFinanceDashboard();
    } else {
      fetchYardDashboard();
    }
  }, [currentRole]);

  const fetchYardDashboard = async () => {
    try {
      setYardLoading(true);
      const [truckRes, dockRes, invRes, grRes, poRes, simRes] = await Promise.all([
        logisticsAPI.getTrucks().catch(() => ({ data: { trucks: [] } })),
        logisticsAPI.getDocks().catch(() => ({ data: { docks: [] } })),
        logisticsAPI.getInventory().catch(() => ({ data: { inventory: [] } })),
        logisticsAPI.getGoodsReceipts().catch(() => ({ data: { receipts: [] } })),
        procurementAPI.getPurchaseOrders().catch(() => ({ data: { purchaseOrders: [] } })),
        logisticsAPI.getSimulationState().catch(() => null)
      ]);

      const trucks = simRes?.data?.state?.trucks || truckRes.data?.trucks || [];
      const docks = dockRes.data?.docks || [];
      const inv = invRes.data?.inventory || [];
      const grs = grRes.data?.receipts || [];
      const pos = poRes.data?.purchaseOrders || [];

      setLiveTrucks(trucks);
      setLiveDocks(docks);
      setLiveInventory(inv);
      setLiveGoodsReceipts(grs);
      setLivePos(pos);
    } catch (err) {
      console.error('Error fetching yard dashboard data:', err);
    } finally {
      setYardLoading(false);
    }
  };

  const fetchFinanceDashboard = async () => {
    try {
      const [invRes, payRes] = await Promise.all([
        financeAPI.getInvoices().catch(() => ({ data: { invoices: [] } })),
        financeAPI.getPayments().catch(() => ({ data: { payments: [] } }))
      ]);
      setLiveInvoices(invRes.data?.invoices || []);
      setLivePayments(payRes.data?.payments || []);
    } catch (err) {
      console.error('Error fetching finance dashboard data:', err);
    }
  };

  const handleDashboardManualApprove = async (inv, notes = '') => {
    try {
      const approvalData = {
        approvedBy: 'AP Finance Manager',
        approvedAt: new Date().toISOString(),
        notes: notes || 'Manual AP override approval granted after variance review.'
      };

      setFinanceManualApprovals(prev => {
        const next = new Map(prev);
        if (inv.invoiceNumber) next.set(inv.invoiceNumber, approvalData);
        if (inv._id) next.set(String(inv._id), approvalData);
        return next;
      });

      const isMock = !inv._id || String(inv._id).startsWith('inv-');
      const identifier = inv._id || inv.invoiceNumber;
      if (identifier && !isMock) {
        await financeAPI.manualApprove(identifier, { notes }).catch(err => {
          console.warn('Backend manual approval handled with optimistic state:', err?.message || err);
        });
      }
      showNotification(`Invoice ${inv.invoiceNumber} manually approved. Voucher authorized for disbursement.`, 'success');
      await fetchFinanceDashboard();
    } catch (err) {
      showNotification(`Invoice ${inv.invoiceNumber} manual AP approval saved.`, 'success');
    }
  };

  const fetchProcurementDashboard = async () => {
    try {
      setProcLoading(true);
      const [poRes, prRes, supRes] = await Promise.all([
        procurementAPI.getPurchaseOrders().catch(() => ({ data: { purchaseOrders: [] } })),
        procurementAPI.getRequisitions().catch(() => ({ data: { requisitions: [] } })),
        procurementAPI.evaluateSuppliers().catch(() => ({ data: { suppliers: [] } }))
      ]);

      const pos = poRes.data?.purchaseOrders || [];
      const prs = prRes.data?.requisitions || [];
      const sups = supRes.data?.suppliers || [];

      setLivePos(pos);
      setLivePrs(prs);
      setLiveSuppliers(sups);
    } catch (err) {
      console.error('Error fetching procurement dashboard data:', err);
    } finally {
      setProcLoading(false);
    }
  };

  // If supplier accidentally hits dashboard, redirect immediately
  if (currentRole === ROLES.SUPPLIER) {
    return <Navigate to="/supplier" replace />;
  }

  // -------------------------------------------------------------
  // PROCUREMENT MANAGER DASHBOARD (WITH CHARTS & PIE-CHARTS)
  // -------------------------------------------------------------
  if (currentRole === ROLES.PROCUREMENT) {
    // Commodity Spend Data for Donut Chart
    const commoditySpendData = [
      { name: 'Mechanical Parts', value: 180000, color: '#15803D' },
      { name: 'Electrical Motors', value: 110000, color: '#2563EB' },
      { name: 'Precision Valves', value: 85000, color: '#D97706' },
      { name: 'Safety & Fasteners', value: 53000, color: '#7C3AED' }
    ];

    // Monthly Spend vs Budget Data for Bar Chart
    const monthlySpendData = [
      { month: 'Jan', Spent: 3.2, Budget: 4.0 },
      { month: 'Feb', Spent: 3.8, Budget: 4.0 },
      { month: 'Mar', Spent: 4.1, Budget: 4.5 },
      { month: 'Apr', Spent: 3.5, Budget: 4.5 },
      { month: 'May', Spent: 4.28, Budget: 5.0 }
    ];

    // Fallback POs if DB is freshly seeded or empty
    const displayPos = livePos.length > 0 ? livePos : [
      {
        _id: '1',
        poNumber: 'PO-78432',
        supplierName: 'Acme Steel Pvt Ltd',
        items: [{ productName: 'Precision Bearings', quantity: 500 }],
        totalAmount: 138768,
        status: 'IN_TRANSIT'
      },
      {
        _id: '2',
        poNumber: 'PO-78415',
        supplierName: 'TechCorp Solutions',
        items: [{ productName: 'High-Speed Motors', quantity: 100 }],
        totalAmount: 85000,
        status: 'AT_GATE'
      },
      {
        _id: '3',
        poNumber: 'PO-78398',
        supplierName: 'Apex Fasteners Ltd',
        items: [{ productName: 'Hydraulic Valves', quantity: 250 }],
        totalAmount: 42500,
        status: 'COMPLETED'
      },
      {
        _id: '4',
        poNumber: 'PO-78364',
        supplierName: 'Alpha Logistics Tech',
        items: [{ productName: 'Safety Gear Kits', quantity: 120 }],
        totalAmount: 36000,
        status: 'ISSUED'
      }
    ];

    const totalCommittedValue = displayPos.reduce((acc, p) => acc + (p.totalAmount || 0), 0);

    return (
      <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 max-w-[1680px] mx-auto min-h-screen">

        {/* 1. TOP PROCUREMENT KPI STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
            <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
              <span className="text-[10px] sm:text-[11px] font-sans font-medium">Active Purchase Orders</span>
              <div className="p-1 rounded-xs bg-[#DCFCE7] dark:bg-[#163824] text-[#15803D] dark:text-[#22C55E]">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6]">
              {displayPos.length}
            </div>
            <span className="text-[10px] font-mono text-[#15803D] font-semibold">▲ 4 issued this cycle</span>
          </div>

          <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
            <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
              <span className="text-[10px] sm:text-[11px] font-sans font-medium">Pending Requisitions (PR)</span>
              <div className="p-1 rounded-xs bg-[#FEF3C7] dark:bg-[#332A15] text-[#D97706]">
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6]">
              {livePrs.filter(p => p.status === 'PENDING').length || 3}
            </div>
            <span className="text-[10px] font-mono text-[#D97706] font-semibold">Awaiting PO Conversion</span>
          </div>

          <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
            <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
              <span className="text-[10px] sm:text-[11px] font-sans font-medium">Certified Tier 1 Suppliers</span>
              <div className="p-1 rounded-xs bg-[#DBEAFE] dark:bg-[#182942] text-[#2563EB]">
                <Building2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6]">
              {liveSuppliers.length || 8}
            </div>
            <span className="text-[10px] font-mono text-[#2563EB] font-semibold">Avg OTD: 94.2%</span>
          </div>

          <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
            <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
              <span className="text-[10px] sm:text-[11px] font-sans font-medium">Committed PO Spend</span>
              <div className="p-1 rounded-xs bg-[#EDE9FE] dark:bg-[#281E3B] text-[#7C3AED]">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6]">
              ₹{(totalCommittedValue / 100000).toFixed(2)}L
            </div>
            <span className="text-[10px] font-mono text-[#68716D]">Current Billing Cycle</span>
          </div>
        </div>

        {/* 2. CHARTS & GRAPHS SECTION: PIE-CHART & SPEND BAR GRAPH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Commodity Spend Distribution (Donut / Pie Chart) */}
          <div className="lg:col-span-5">
            <PaperSheet variant="default" className="p-4 sm:p-5 space-y-3 h-full">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3DDD1] dark:border-[#2B3835]">
                <div className="flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-[#15803D]" />
                  <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                    Spend Distribution by Category
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#68716D] dark:text-[#8E9C97]">Live Telemetry</span>
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={commoditySpendData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {commoditySpendData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#FCFAF4" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                      contentStyle={{
                        backgroundColor: '#FCFAF4',
                        borderColor: '#E3DDD1',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart Legend Badges */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E3DDD1] dark:border-[#2B3835] text-[11px] font-sans">
                {commoditySpendData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate text-[#68716D] dark:text-[#8E9C97]">{item.name}</span>
                    <strong className="ml-auto font-mono text-[#1C201E] dark:text-[#F5F7F6]">
                      ₹{(item.value / 1000).toFixed(0)}k
                    </strong>
                  </div>
                ))}
              </div>
            </PaperSheet>
          </div>

          {/* Monthly Procurement Spend vs Budget */}
          <div className="lg:col-span-7">
            <PaperSheet
              variant="default"
              className="h-full overflow-hidden border border-[#E3DDD1] dark:border-[#2B3835]"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DBEAFE] dark:bg-[#182942]">
                      <BarChart3 className="h-4 w-4 text-[#2563EB]" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                          Procurement Spend
                        </h3>

                        <span className="rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#15803D] dark:bg-[#12291F] dark:text-[#4ADE80]">
                          FY 2026
                        </span>
                      </div>

                      <p className="mt-0.5 text-[9px] font-mono text-[#8A938F]">
                        Monthly committed spend against approved budget
                      </p>
                    </div>
                  </div>

                  {/* Current performance */}
                  <div className="sm:text-right">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                      Current Month
                    </p>

                    <p className="mt-0.5 text-lg font-bold text-[#15803D]">
                      ₹4.28L
                    </p>

                    <p className="text-[8px] font-mono text-[#68716D]">
                      of ₹5.00L budget
                    </p>
                  </div>

                </div>
              </div>


              {/* Legend */}
              <div className="flex items-center gap-5 border-y border-[#E3DDD1] bg-[#FAF8F3] px-5 py-2.5 dark:border-[#2B3835] dark:bg-[#17201D]">

                <span className="flex items-center gap-1.5 text-[9px] font-mono text-[#59625E] dark:text-[#AAB4AF]">
                  <span className="h-2 w-2 rounded-sm bg-[#15803D]" />
                  Actual Spend
                </span>

                <span className="flex items-center gap-1.5 text-[9px] font-mono text-[#59625E] dark:text-[#AAB4AF]">
                  <span className="h-2 w-2 rounded-sm bg-[#D4CABE]" />
                  Approved Budget
                </span>

                <span className="ml-auto hidden sm:block text-[8px] font-mono uppercase tracking-wider text-[#8A938F]">
                  ₹ Lakhs
                </span>

              </div>


              {/* Chart */}
              <div className="h-[250px] w-full px-3 pt-4">

                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlySpendData}
                    margin={{
                      top: 12,
                      right: 16,
                      left: 0,
                      bottom: 4
                    }}
                    barGap={5}
                  >

                    <CartesianGrid
                      vertical={false}
                      stroke="#E3DDD1"
                      strokeDasharray="3 4"
                      opacity={0.7}
                    />

                    <XAxis
                      dataKey="month"
                      xAxisLabel="Month"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: '#68716D',
                        fontSize: 10,
                        fontFamily: 'monospace'
                      }}
                      dy={8}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: '#68716D',
                        fontSize: 9,
                        fontFamily: 'monospace'
                      }}
                      tickFormatter={(value) => `₹${value}L`}
                      width={42}
                    />

                    <Tooltip
                      cursor={{ fill: '#F4EFE6', opacity: 0.5 }}
                      formatter={(value, name) => [
                        `₹${Number(value).toFixed(2)}L`,
                        name === 'Spent' ? 'Actual Spend' : 'Approved Budget'
                      ]}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{
                        backgroundColor: '#FCFAF4',
                        border: '1px solid #E3DDD1',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        boxShadow: '0 4px 12px rgba(35,30,25,0.08)'
                      }}
                    />

                    <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />

                    {/* Budget */}
                    <Bar
                      dataKey="Budget"
                      name="Budget"
                      fill="#D4CABE"
                      radius={[4, 4, 0, 0]}
                      barSize={18}
                    />

                    {/* Actual */}
                    <Bar
                      dataKey="Spent"
                      name="Spent"
                      fill="#15803D"
                      radius={[4, 4, 0, 0]}
                      barSize={18}
                    />

                  </BarChart>
                </ResponsiveContainer>

              </div>


              {/* Bottom analytics */}
              <div className="grid grid-cols-3 border-t border-[#E3DDD1] dark:border-[#2B3835]">

                <div className="px-5 py-3">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                    YTD Spend
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                    ₹18.88L
                  </p>
                </div>

                <div className="border-x border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                    Budget Utilized
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#2563EB]">
                    86.2%
                  </p>
                </div>

                <div className="px-5 py-3">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                    Current Variance
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#15803D]">
                    -14.4%
                  </p>
                </div>

              </div>


              {/* Insight */}
              {/* <div className="mx-5 mb-5 mt-3 flex items-center gap-2 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2.5 dark:border-[#245C3F] dark:bg-[#12291F]">

                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#15803D] dark:text-[#4ADE80]" />

                <div>
                  <p className="text-[9px] font-bold text-[#15803D] dark:text-[#4ADE80]">
                    Capital efficiency is on target
                  </p>

                  <p className="mt-0.5 text-[8px] text-[#68716D] dark:text-[#9BA6A1]">
                    Current procurement commitments remain below the approved monthly allocation.
                  </p>
                </div>

              </div> */}

            </PaperSheet>
          </div>
        </div>

        {/* 3. PURCHASE ORDER PIPELINE + SUPPLIER SCORECARD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* PO PIPELINE */}
          <div className="lg:col-span-8">
            <PaperSheet
              variant="default"
              className="overflow-hidden p-0 border border-[#E3DDD1] dark:border-[#2B3835]"
            >

              {/* ───────── HEADER ───────── */}
              <div className="px-5 sm:px-6 pt-5 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DCFCE7] dark:bg-[#163824]">
                        <Truck className="h-4 w-4 text-[#15803D] dark:text-[#4ADE80]" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                            Purchase Order Pipeline
                          </h3>

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#15803D] dark:bg-[#12291F] dark:text-[#4ADE80]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                            Live
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-2 ml-[42px] text-[10px] font-mono text-[#68716D] dark:text-[#8E9C97]">
                      Real-time fulfillment visibility across supplier and warehouse networks
                    </p>
                  </div>

                  <NavLink
                    to="/procurement"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#15803D] px-3.5 py-2 text-[10px] font-bold text-white transition-all hover:bg-[#166534] hover:-translate-y-0.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create PO
                  </NavLink>

                </div>
              </div>


              {/* ───────── MINI SUMMARY ───────── */}
              <div className="grid grid-cols-3 border-y border-[#E3DDD1] bg-[#FAF8F3] dark:border-[#2B3835] dark:bg-[#17201D]">

                <div className="px-5 py-3">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                    Total Orders
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                    {displayPos.length}
                  </p>
                </div>

                <div className="border-x border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                    In Fulfillment
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#2563EB]">
                    {
                      displayPos.filter(
                        po =>
                          po.status !== 'COMPLETED' &&
                          po.status !== 'RECEIVED'
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


              {/* ───────── COLUMN LABELS ───────── */}
              <div className="hidden md:grid grid-cols-[1.2fr_1.45fr_1.8fr_0.9fr_1.15fr] gap-4 px-5 py-2.5 border-b border-[#E3DDD1] dark:border-[#2B3835] bg-white dark:bg-[#18201D]">

                <span className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Purchase Order
                </span>

                <span className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Supplier
                </span>

                <span className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Shipment
                </span>

                <span className="text-right text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Value
                </span>

                <span className="text-right text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  State
                </span>

              </div>


              {/* ───────── PO ROWS ───────── */}
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
                    '500 units';

                  const isCompleted =
                    po.status === 'COMPLETED' ||
                    po.status === 'RECEIVED';

                  const isWaiting =
                    po.status === 'AT_GATE' ||
                    po.status === 'WAITING_FOR_DOCK';

                  const statusLabel =
                    po.status || 'IN_TRANSIT';

                  let statusClass =
                    'bg-[#DBEAFE] text-[#2563EB] border-[#BFDBFE]';

                  let StatusIcon = Truck;

                  if (isCompleted) {
                    statusClass =
                      'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]';

                    StatusIcon = CheckCircle2;
                  }

                  if (isWaiting) {
                    statusClass =
                      'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]';

                    StatusIcon = Clock;
                  }

                  return (
                    <div
                      key={po._id || po.poNumber}
                      className="group px-5 py-4 transition-all hover:bg-[#FAF8F3] dark:hover:bg-[#1D2824]"
                    >

                      {/* DESKTOP */}
                      <div className="hidden md:grid grid-cols-[1.2fr_1.45fr_1.8fr_0.9fr_1.15fr] gap-4 items-center">

                        {/* PO */}
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F0FDF4] dark:bg-[#163824]">
                              <FileText className="h-3.5 w-3.5 text-[#15803D]" />
                            </div>

                            <div>
                              <p className="text-[11px] font-bold text-[#15803D] dark:text-[#4ADE80]">
                                {po.poNumber}
                              </p>

                              <p className="mt-0.5 text-[7px] uppercase tracking-wider text-[#9AA29E]">
                                Purchase Order
                              </p>
                            </div>
                          </div>
                        </div>


                        {/* SUPPLIER */}
                        <div className="min-w-0">

                          <div className="flex items-center gap-2">

                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E9E5DB] dark:bg-[#2B3835]">
                              <Building2 className="h-3.5 w-3.5 text-[#68716D] dark:text-[#AAB4AF]" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-[10px] font-semibold text-[#1C201E] dark:text-[#F5F7F6]">
                                {supName}
                              </p>

                              <p className="mt-0.5 text-[7px] text-[#8A938F]">
                                Verified supplier
                              </p>
                            </div>

                          </div>

                        </div>


                        {/* SHIPMENT */}
                        <div className="min-w-0">

                          <p
                            title={itemDesc}
                            className="truncate text-[10px] text-[#59625E] dark:text-[#AAB4AF]"
                          >
                            {itemDesc}
                          </p>

                          <div className="mt-1 flex items-center gap-1.5">

                            <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />

                            <span className="text-[7px] font-bold uppercase tracking-wider text-[#8A938F]">
                              Shipment tracked
                            </span>

                          </div>

                        </div>


                        {/* VALUE */}
                        <div className="text-right">
                          <p className="text-[11px] font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                            ₹{(po.totalAmount || 0).toLocaleString('en-IN')}
                          </p>

                          <p className="mt-0.5 text-[7px] uppercase tracking-wider text-[#9AA29E]">
                            PO Value
                          </p>
                        </div>


                        {/* STATUS */}
                        <div className="flex justify-end">

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[7px] font-bold uppercase tracking-wide ${statusClass}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusLabel}
                          </span>

                        </div>

                      </div>


                      {/* MOBILE */}
                      <div className="md:hidden">

                        <div className="flex items-start justify-between gap-3">

                          <div className="flex items-center gap-2">

                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F0FDF4] dark:bg-[#163824]">
                              <FileText className="h-3.5 w-3.5 text-[#15803D]" />
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
                            {statusLabel}
                          </span>

                        </div>

                        <div className="mt-3 flex items-end justify-between gap-4">

                          <div className="min-w-0">
                            <p className="truncate text-[9px] text-[#68716D] dark:text-[#9BA6A1]">
                              {itemDesc}
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

                {displayPos.length === 0 && (
                  <div className="px-5 py-12 text-center">

                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#F4EFE6] dark:bg-[#26312D]">
                      <FileText className="h-4 w-4 text-[#8A938F]" />
                    </div>

                    <p className="mt-3 text-xs font-semibold text-[#59625E] dark:text-[#B8C1BD]">
                      No purchase orders found
                    </p>

                    <p className="mt-1 text-[9px] text-[#8A938F]">
                      Create a purchase order to begin tracking fulfillment.
                    </p>

                  </div>
                )}

              </div>


              {/* ───────── FOOTER ───────── */}
              <div className="flex items-center justify-between border-t border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">

                <span className="text-[8px] font-mono uppercase tracking-wider text-[#8A938F]">
                  {displayPos.length} active purchase orders
                </span>

                <NavLink
                  to="/procurement"
                  className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#15803D] transition-colors hover:text-[#166534]"
                >
                  Procurement workspace
                  <ArrowRight className="h-3 w-3" />
                </NavLink>

              </div>

            </PaperSheet>
          </div>


          {/* ───────── SUPPLIER SCORECARD ───────── */}
          <div className="lg:col-span-4">
            <PaperSheet
              variant="default"
              className="h-full p-4 sm:p-5 border border-[#E3DDD1] dark:border-[#2B3835]"
            >
              <SupplierScorecard />
            </PaperSheet>
          </div>

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FINANCE & AP USER DASHBOARD
  // -------------------------------------------------------------
  if (currentRole === ROLES.FINANCE) {
    const getInvoiceAuditStatus = (inv) => {
      if (!inv) {
        return { isMatched: true, isManuallyApproved: false, hasVariance: false, statusLabel: 'Matched · AI Auto-Approved', subLabel: 'PO · GRN · Invoice aligned' };
      }
      const manualApprovalData = financeManualApprovals.get(inv.invoiceNumber) || (inv._id ? financeManualApprovals.get(String(inv._id)) : null) || inv.manualApproval;
      const isManuallyApproved = inv.matchStatus === 'MANUALLY_APPROVED' || Boolean(manualApprovalData);

      if (isManuallyApproved) {
        return { isMatched: false, isManuallyApproved: true, hasVariance: false, statusLabel: 'Manually Approved', subLabel: 'Override approved by AP', manualApproval: manualApprovalData };
      }
      if (inv.invoiceNumber === 'INV-8812' || inv.poNumber === 'PO-78415') {
        return { isMatched: false, isManuallyApproved: false, hasVariance: true, statusLabel: 'Variance Flagged', subLabel: 'Variance requires review' };
      }
      if (inv.matchDetails?.comparisons?.length) {
        const hasMismatch = inv.matchDetails.comparisons.some(c => c.result === 'MISMATCH');
        if (hasMismatch) {
          return { isMatched: false, isManuallyApproved: false, hasVariance: true, statusLabel: 'Variance Flagged', subLabel: 'Variance requires review' };
        }
        return { isMatched: true, isManuallyApproved: false, hasVariance: false, statusLabel: 'Matched · AI Auto-Approved', subLabel: 'PO · GRN · Invoice aligned' };
      }
      if (inv.items?.length) {
        const hasLineMismatch = inv.items.some(it => {
          const poQty = it.poQty !== undefined ? Number(it.poQty) : (it.ordered !== undefined ? Number(it.ordered) : (it.quantity !== undefined ? Number(it.quantity) : null));
          const grnQty = it.grnQty !== undefined ? Number(it.grnQty) : (it.received !== undefined ? Number(it.received) : (it.acceptedQuantity !== undefined ? Number(it.acceptedQuantity) : poQty));
          const invQty = it.invQty !== undefined ? Number(it.invQty) : (it.quantity !== undefined ? Number(it.quantity) : poQty);
          const qtyMismatch = poQty !== null && grnQty !== null && invQty !== null && (poQty !== grnQty || invQty !== grnQty || poQty !== invQty);
          const poPrice = it.poPrice !== undefined ? Number(it.poPrice) : Number(it.unitPrice || 0);
          const invPrice = it.invPrice !== undefined ? Number(it.invPrice) : Number(it.unitPrice || 0);
          const priceMismatch = poPrice > 0 && invPrice > 0 && Math.abs(poPrice - invPrice) > 0.01;
          return qtyMismatch || priceMismatch;
        });
        if (hasLineMismatch) {
          return { isMatched: false, isManuallyApproved: false, hasVariance: true, statusLabel: 'Variance Flagged', subLabel: 'Variance requires review' };
        }
      }
      const isExplicitMismatch =
        inv.matchStatus === 'MISMATCH' ||
        inv.matchStatus === 'MISMATCHED' ||
        inv.matchStatus === 'MISMATCH_QTY' ||
        inv.matchStatus === 'QTY_MISMATCH' ||
        inv.matchStatus === 'PARTIAL_MATCH';
      if (isExplicitMismatch) {
        return { isMatched: false, isManuallyApproved: false, hasVariance: true, statusLabel: 'Variance Flagged', subLabel: 'Variance requires review' };
      }
      return { isMatched: true, isManuallyApproved: false, hasVariance: false, statusLabel: 'Matched · AI Auto-Approved', subLabel: 'PO · GRN · Invoice aligned' };
    };

    const financeMatchData = [
      { name: 'Exact Match (100%)', value: 75, amount: 213000, color: '#15803D' },
      { name: 'Within ±2% Tolerance', value: 18, amount: 51000, color: '#2563EB' },
      { name: 'Variance / Discrepancy', value: 7, amount: 20000, color: '#DC2626' }
    ];

    const weeklyFinanceCashflow = [
      { week: 'Wk 1', billed: 185000, settled: 185000 },
      { week: 'Wk 2', billed: 240000, settled: 215000 },
      { week: 'Wk 3', billed: 190000, settled: 190000 },
      { week: 'Wk 4', billed: 320000, settled: 295000 },
      { week: 'Wk 5', billed: 284000, settled: 199000 }
    ];

    const baselineInvoices = [
      {
        _id: 'inv-8810',
        invoiceNumber: 'INV-8810',
        poNumber: 'PO-78432',
        grnNumber: 'GRN-5011',
        supplierName: 'Acme Steel Pvt Ltd',
        amount: 138768,
        totalAmount: 138768,
        matchStatus: 'MATCHED',
        status: 'APPROVED',
        paymentStatus: 'APPROVED',
        matchDetails: {
          autoApproved: true,
          aiVerdict: 'AI 3-Way Reconciliation Verified: 100% Alignment across Purchase Order (PO-78432), Goods Receipt (GRN-5011), and Supplier Invoice (INV-8810). Zero variance in quantities, rates, and tax calculations. Payment auto-approved.',
          comparisons: [
            { field: 'Supplier Vendor', po: 'Acme Steel Pvt Ltd', grn: 'Acme Steel Pvt Ltd', invoice: 'Acme Steel Pvt Ltd', result: 'MATCH', critical: true },
            { field: 'PO Number', po: 'PO-78432', grn: 'PO-78432', invoice: 'PO-78432', result: 'MATCH', critical: true },
            { field: 'Quantity · Precision Steel Bearings', po: '500 units', grn: '500 units', invoice: '500 units', result: 'MATCH', critical: true },
            { field: 'Price / Unit · Bearings', po: '₹277.53', grn: '₹277.53', invoice: '₹277.53', result: 'MATCH', critical: false },
            { field: 'Line Subtotal', po: '₹1,38,768.00', grn: '₹1,38,768.00', invoice: '₹1,38,768.00', result: 'MATCH', critical: true },
            { field: 'GST Tax (18%)', po: '₹24,978.24', grn: '₹24,978.24', invoice: '₹24,978.24', result: 'MATCH', critical: false },
            { field: 'Grand Total Payable', po: '₹1,63,746.24', grn: '₹1,63,746.24', invoice: '₹1,63,746.24', result: 'MATCH', critical: true }
          ]
        },
        items: [
          {
            productName: 'Precision Steel Bearings',
            poQty: 500,
            grnQty: 500,
            invQty: 500,
            unitPrice: 277.53,
            poPrice: 277.53,
            grnPrice: 277.53,
            invPrice: 277.53,
            taxRate: 18,
            varianceReason: 'Exact match across PO, GRN, and Supplier Invoice'
          }
        ]
      },
      {
        _id: 'inv-8812',
        invoiceNumber: 'INV-8812',
        poNumber: 'PO-78415',
        grnNumber: 'GRN-5012',
        supplierName: 'TechCorp Solutions',
        amount: 85000,
        totalAmount: 85000,
        matchStatus: 'MISMATCH_QTY',
        status: 'ON_HOLD',
        paymentStatus: 'ON_HOLD',
        matchDetails: {
          autoApproved: false,
          aiVerdict: 'AI 3-Way Reconciliation Flagged Discrepancy: Physical warehouse intake received 98 units (-2 damaged), but invoice billed 100 units. Payment placed on AP Hold to protect against overpayment.',
          comparisons: [
            { field: 'Supplier Vendor', po: 'TechCorp Solutions', grn: 'TechCorp Solutions', invoice: 'TechCorp Solutions', result: 'MATCH', critical: true },
            { field: 'PO Number', po: 'PO-78415', grn: 'PO-78415', invoice: 'PO-78415', result: 'MATCH', critical: true },
            { field: 'Quantity · High-Speed Induction Motors', po: '100 units', grn: '98 units', invoice: '100 units', result: 'MISMATCH', critical: true, note: 'Billed 100, physical warehouse GRN received 98 (-2 damaged)' },
            { field: 'Price / Unit · Motors', po: '₹850.00', grn: '₹850.00', invoice: '₹850.00', result: 'MATCH', critical: false },
            { field: 'Line Subtotal', po: '₹85,000.00', grn: '₹83,300.00', invoice: '₹85,000.00', result: 'MISMATCH', critical: true, note: '₹1,700.00 discrepancy due to missing 2 units' },
            { field: 'GST Tax (18%)', po: '₹15,300.00', grn: '₹14,994.00', invoice: '₹15,300.00', result: 'MISMATCH', critical: false },
            { field: 'Grand Total Payable', po: '₹1,00,300.00', grn: '₹98,294.00', invoice: '₹1,00,300.00', result: 'MISMATCH', critical: true, note: 'Net overbilled variance: +₹2,006.00' }
          ]
        },
        items: [
          {
            productName: 'High-Speed Induction Motors',
            poQty: 100,
            grnQty: 98,
            invQty: 100,
            unitPrice: 850,
            poPrice: 850,
            grnPrice: 850,
            invPrice: 850,
            taxRate: 18,
            varianceReason: 'Billed 100 units, but physical warehouse GRN recorded 98 units (-2 damaged)'
          }
        ]
      },
      {
        _id: 'inv-8809',
        invoiceNumber: 'INV-8809',
        poNumber: 'PO-78398',
        grnNumber: 'GRN-5009',
        supplierName: 'Apex Fasteners Ltd',
        amount: 42500,
        totalAmount: 42500,
        matchStatus: 'MATCHED',
        status: 'PAID',
        paymentStatus: 'PAID',
        disbursedAt: new Date(Date.now() - 86400000).toISOString(),
        transactionId: 'TXN-90281039',
        items: [
          {
            productName: 'Hydraulic Pressure Valves',
            poQty: 250,
            grnQty: 250,
            invQty: 250,
            unitPrice: 170,
            poPrice: 170,
            grnPrice: 170,
            invPrice: 170,
            taxRate: 18,
            varianceReason: 'Reconciled and disbursed via RTGS'
          }
        ]
      }
    ];

    const rawQueueInvoices = liveInvoices.length > 0
      ? [...liveInvoices, ...baselineInvoices.filter(b => !liveInvoices.some(li => li.invoiceNumber === b.invoiceNumber))]
      : baselineInvoices;

    const financeQueueInvoices = rawQueueInvoices.map(inv => {
      const manualData = financeManualApprovals.get(inv.invoiceNumber) || (inv._id ? financeManualApprovals.get(String(inv._id)) : null);
      if (manualData || inv.matchStatus === 'MANUALLY_APPROVED') {
        return {
          ...inv,
          matchStatus: 'MANUALLY_APPROVED',
          paymentStatus: inv.paymentStatus === 'PAID' ? 'PAID' : 'APPROVED',
          status: inv.status === 'PAID' ? 'PAID' : 'APPROVED',
          manualApproval: manualData || inv.manualApproval
        };
      }
      return inv;
    });

    return (
      <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 max-w-[1680px] mx-auto min-h-screen">

        {/* 1. FINANCE KPI STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
            <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
              <span className="text-[10px] sm:text-[11px] font-sans font-medium">Invoices Awaiting Match</span>
              <div className="p-1 rounded-xs bg-[#FEF3C7] dark:bg-[#332A15] text-[#D97706]">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6]">4</div>
            <span className="text-[10px] font-mono text-[#D97706] font-semibold">2 Ready for 3-Way Match</span>
          </div>

          <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
            <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
              <span className="text-[10px] sm:text-[11px] font-sans font-medium">3-Way Match Pass Rate</span>
              <div className="p-1 rounded-xs bg-[#DCFCE7] dark:bg-[#163824] text-[#15803D] dark:text-[#22C55E]">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans text-[#15803D]">96.8%</div>
            <span className="text-[10px] font-mono text-[#15803D] font-semibold">Within ±2% Tolerance</span>
          </div>

          <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
            <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
              <span className="text-[10px] sm:text-[11px] font-sans font-medium">Pending AP Disbursements</span>
              <div className="p-1 rounded-xs bg-[#DBEAFE] dark:bg-[#182942] text-[#2563EB]">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6]">₹2.84L</div>
            <span className="text-[10px] font-mono text-[#2563EB] font-semibold">3 Invoices Authorized</span>
          </div>

          <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
            <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
              <span className="text-[10px] sm:text-[11px] font-sans font-medium">Variance Exceptions</span>
              <div className="p-1 rounded-xs bg-[#FEE2E2] dark:bg-[#351C1C] text-[#DC2626]">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-sans text-[#DC2626]">1</div>
            <span className="text-[10px] font-mono text-[#DC2626] font-semibold">INV-8812 Line Discrepancy</span>
          </div>
        </div>

        {/* 2. RECHARTS SECTION: 3-WAY MATCH PIE CHART & WEEKLY CASHFLOW BAR GRAPH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Match Distribution Donut / Pie Chart */}
          <div className="lg:col-span-5">
            <PaperSheet variant="default" className="p-4 sm:p-5 space-y-3 h-full">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3DDD1] dark:border-[#2B3835]">
                <div className="flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-[#15803D]" />
                  <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                    3-Way Match Reconciliation Breakdown
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#15803D] font-bold">Autonomous Match</span>
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={financeMatchData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {financeMatchData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#FCFAF4" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name, item) => [`${val}% (₹${item.payload.amount.toLocaleString('en-IN')})`, item.payload.name]}
                      contentStyle={{
                        backgroundColor: '#FCFAF4',
                        borderColor: '#E3DDD1',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart Legend Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[#E3DDD1] dark:border-[#2B3835] text-[10px] font-sans">
                {financeMatchData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 p-1.5 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="truncate">
                      <span className="text-[#68716D] dark:text-[#8E9C97] block">{item.name}</span>
                      <strong className="font-mono text-[#1C201E] dark:text-[#F5F7F6]">{item.value}%</strong>
                    </div>
                  </div>
                ))}
              </div>
            </PaperSheet>
          </div>

          {/* Weekly Cashflow vs Disbursements Bar Chart */}
          <div className="lg:col-span-7">
            <PaperSheet
              variant="default"
              className="h-full overflow-hidden border border-[#E3DDD1] dark:border-[#2B3835]"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DBEAFE] dark:bg-[#182942]">
                      <BarChart3 className="h-4 w-4 text-[#2563EB]" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                          AP Cashflow
                        </h3>

                        <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#2563EB] dark:bg-[#182942] dark:text-[#60A5FA]">
                          5 Week View
                        </span>
                      </div>

                      <p className="mt-0.5 text-[9px] font-mono text-[#8A938F]">
                        Vendor invoices compared with settled disbursements
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                      Settlement Rate
                    </p>

                    <p className="mt-0.5 text-lg font-bold text-[#15803D]">
                      94.2%
                    </p>

                    <p className="text-[8px] font-mono text-[#68716D] dark:text-[#8E9C97]">
                      within 3 days
                    </p>
                  </div>

                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 border-y border-[#E3DDD1] bg-[#FAF8F3] px-5 py-2.5 dark:border-[#2B3835] dark:bg-[#17201D]">

                <span className="flex items-center gap-1.5 text-[9px] font-mono text-[#59625E] dark:text-[#AAB4AF]">
                  <span className="h-2 w-2 rounded-sm bg-[#7C3AED]" />
                  Vendor Billed
                </span>

                <span className="flex items-center gap-1.5 text-[9px] font-mono text-[#59625E] dark:text-[#AAB4AF]">
                  <span className="h-2 w-2 rounded-sm bg-[#15803D]" />
                  Settled
                </span>

                <span className="ml-auto hidden sm:block text-[8px] font-mono uppercase tracking-wider text-[#8A938F]">
                  ₹ INR
                </span>

              </div>

              {/* Chart */}
              <div className="h-[250px] w-full px-3 pt-4">

                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyFinanceCashflow}
                    margin={{
                      top: 12,
                      right: 16,
                      left: 0,
                      bottom: 4
                    }}
                    barGap={5}
                  >

                    <CartesianGrid
                      vertical={false}
                      stroke="#E3DDD1"
                      strokeDasharray="3 4"
                      opacity={0.7}
                    />

                    <XAxis
                      dataKey="week"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: '#68716D',
                        fontSize: 10,
                        fontFamily: 'monospace'
                      }}
                      dy={8}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: '#68716D',
                        fontSize: 9,
                        fontFamily: 'monospace'
                      }}
                      tickFormatter={(value) =>
                        `₹${(value / 1000).toFixed(0)}k`
                      }
                      width={42}
                    />

                    <Tooltip
                      cursor={{
                        fill: '#F4EFE6',
                        opacity: 0.5
                      }}
                      formatter={(value, name) => [
                        `₹${Number(value).toLocaleString('en-IN')}`,
                        name === 'billed'
                          ? 'Vendor Billed'
                          : 'Settled Disbursement'
                      ]}
                      labelFormatter={(label) => `Period: ${label}`}
                      contentStyle={{
                        backgroundColor: '#FCFAF4',
                        border: '1px solid #E3DDD1',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        boxShadow: '0 4px 12px rgba(35,30,25,0.08)'
                      }}
                    />

                    <Bar
                      dataKey="billed"
                      name="billed"
                      fill="#7C3AED"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />

                    <Bar
                      dataKey="settled"
                      name="settled"
                      fill="#15803D"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />

                  </BarChart>
                </ResponsiveContainer>

              </div>

              {/* Bottom analytics
              <div className="grid grid-cols-3 border-t border-[#E3DDD1] dark:border-[#2B3835]">

                <div className="px-5 py-3">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                    Total Billed
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                    ₹12.19L
                  </p>
                </div>

                <div className="border-x border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                    Total Settled
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#15803D]">
                    ₹10.84L
                  </p>
                </div>

                <div className="px-5 py-3">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                    Outstanding
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#D97706]">
                    ₹1.35L
                  </p>
                </div>

              </div> */}

            </PaperSheet>
          </div>

        </div>

        {/* 3. AUDIT DIFF ACCORDION IF ACTIVE */}
        {selectedFinanceAuditInvoice && (
          <PaperSheet variant="default" className="p-5 border-[#15803D]/60 relative shadow-lg animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setSelectedFinanceAuditInvoice(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xs border border-[#E3DDD1] text-[#68716D] hover:text-[#1C201E]"
              title="Close Audit View"
            >
              <X className="w-4 h-4" />
            </button>
            <ThreeWayMatchDiff
              invoice={selectedFinanceAuditInvoice}
              onManualApprove={async (inv, notes) => {
                await handleDashboardManualApprove(inv, notes);
                setSelectedFinanceAuditInvoice(null);
              }}
              onApprove={async (inv) => {
                await handleDashboardManualApprove(inv, 'Approved by AP Manager');
                setSelectedFinanceAuditInvoice(null);
              }}
              onHold={(inv) => {
                showNotification(`Invoice ${inv.invoiceNumber} put on AP hold pending vendor credit note.`, 'warning');
                setSelectedFinanceAuditInvoice(null);
              }}
            />
          </PaperSheet>
        )}

        {/* 4. MAIN FINANCE RECONCILIATION TABLE */}
        <PaperSheet
          variant="default"
          className="overflow-hidden p-0 border border-[#E3DDD1] dark:border-[#2B3835]"
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-[#E3DDD1] dark:border-[#2B3835]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

              <div className="flex items-start gap-3">

                {/* Finance / Audit Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DBEAFE] dark:bg-[#182942]">
                  <ReceiptText className="h-4 w-4 text-[#2563EB]" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">

                    <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                      Invoice Matching & AP Settlement Queue
                    </h3>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#2563EB]">
                      <GitCompare className="h-3 w-3" />
                      3-Way Match
                    </span>

                  </div>

                  <p className="mt-1 text-[9px] font-mono text-[#8A938F]">
                    Audit invoice, purchase order and goods receipt variances before payment.
                  </p>
                </div>

              </div>

              <NavLink
                to="/finance"
                className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-[9px] font-bold font-mono text-[#2563EB] hover:bg-[#DBEAFE] transition-colors"
              >
                Open Match Studio
                <span>→</span>
              </NavLink>

            </div>
          </div>

          {/* Queue Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E3DDD1] dark:border-[#2B3835]">

            <div className="px-5 py-3">
              <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                Queue
              </p>

              <p className="mt-1 text-lg font-bold font-mono text-[#1C201E] dark:text-[#F5F7F6]">
                {financeQueueInvoices.length}
              </p>
            </div>

            <div className="border-l border-[#E3DDD1] dark:border-[#2B3835] px-5 py-3">
              <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                Matched & Approved
              </p>

              <p className="mt-1 text-lg font-bold font-mono text-[#15803D]">
                {
                  financeQueueInvoices.filter(inv => {
                    const audit = getInvoiceAuditStatus(inv);
                    return audit.isMatched || audit.isManuallyApproved;
                  }).length
                }
              </p>
            </div>

            <div className="border-l border-[#E3DDD1] dark:border-[#2B3835] px-5 py-3">
              <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                Exceptions (Hold)
              </p>

              <p className="mt-1 text-lg font-bold font-mono text-[#DC2626]">
                {
                  financeQueueInvoices.filter(inv => {
                    const audit = getInvoiceAuditStatus(inv);
                    return audit.hasVariance;
                  }).length
                }
              </p>
            </div>

            <div className="border-l border-[#E3DDD1] dark:border-[#2B3835] px-5 py-3">
              <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                Payable
              </p>

              <p className="mt-1 text-lg font-bold font-mono text-[#2563EB]">
                ₹
                {financeQueueInvoices
                  .reduce(
                    (total, inv) => total + Number(inv.totalAmount || inv.amount || 0),
                    0
                  )
                  .toLocaleString("en-IN")}
              </p>
            </div>

          </div>

          {/* Table */}
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px] text-left">

              <thead className="bg-[#FAF8F3] dark:bg-[#17201D]">

                <tr>
                  {[
                    "Invoice",
                    "PO Reference",
                    "Vendor",
                    "Net Payable",
                    "3-Way Match",
                    "Reconciliation Audit",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className={`px-5 py-3 text-[8px] font-bold uppercase tracking-widest text-[#8A938F] ${heading === "Net Payable" ||
                        heading === "Reconciliation Audit"
                        ? "text-right"
                        : ""
                        }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>

              </thead>

              <tbody className="divide-y divide-[#E3DDD1] dark:divide-[#2B3835]">

                {financeQueueInvoices.length === 0 ? (

                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-12 text-center"
                    >
                      <ReceiptText className="mx-auto h-6 w-6 text-[#9AA29E]" />

                      <p className="mt-2 text-[10px] font-semibold text-[#59625E] dark:text-[#AAB4AF]">
                        No invoices pending reconciliation
                      </p>

                      <p className="mt-1 text-[8px] font-mono text-[#8A938F]">
                        The AP settlement queue is currently clear.
                      </p>
                    </td>
                  </tr>

                ) : (

                  financeQueueInvoices.map((inv) => {
                    const audit = getInvoiceAuditStatus(inv);
                    const { isMatched, isManuallyApproved, hasVariance, statusLabel, subLabel } = audit;

                    return (
                      <tr
                        key={inv._id || inv.invoiceNumber}
                        className="group hover:bg-[#FAF8F3] dark:hover:bg-[#1D2824] transition-colors"
                      >

                        {/* Invoice */}
                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2">

                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#F4EFE6] dark:bg-[#26312D]">
                              <FileText className="h-3.5 w-3.5 text-[#68716D]" />
                            </div>

                            <div>
                              <p className="text-[10px] font-bold font-mono text-[#1C201E] dark:text-[#F5F7F6]">
                                {inv.invoiceNumber}
                              </p>

                              <p className="mt-0.5 text-[7px] uppercase tracking-wider text-[#9AA29E]">
                                Supplier Invoice
                              </p>
                            </div>

                          </div>

                        </td>

                        {/* PO */}
                        <td className="px-5 py-4">

                          <span className="inline-flex rounded-md bg-[#F0FDF4] px-2 py-1 text-[9px] font-bold font-mono text-[#15803D]">
                            {inv.poNumber}
                          </span>

                        </td>

                        {/* Vendor */}
                        <td className="px-5 py-4">

                          <div>
                            <p className="text-[9px] font-semibold text-[#1C201E] dark:text-[#F5F7F6]">
                              {inv.supplierName || inv.supplier?.name || 'Verified Supplier'}
                            </p>

                            <p className="mt-0.5 text-[7px] text-[#8A938F]">
                              Accounts Payable
                            </p>
                          </div>

                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 text-right">

                          <span className="text-[10px] font-bold font-mono text-[#1C201E] dark:text-[#F5F7F6]">
                            ₹{Number(inv.totalAmount || inv.amount || 0).toLocaleString("en-IN")}
                          </span>

                        </td>

                        {/* Match Status */}
                        <td className="px-5 py-4">

                          <div className="flex flex-col items-start gap-1">

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[7px] font-bold uppercase tracking-wide ${isMatched
                                  ? "border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]"
                                  : isManuallyApproved
                                    ? "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]"
                                    : "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                                }`}
                            >

                              {isMatched || isManuallyApproved ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <AlertTriangle className="h-3 w-3" />
                              )}

                              {statusLabel}

                            </span>

                            <span className="text-[7px] font-mono text-[#8A938F]">
                              {subLabel}
                            </span>

                          </div>

                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">

                          <div className="flex justify-end items-center gap-1.5">

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedFinanceAuditInvoice(inv)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 py-2 text-[8px] font-bold font-mono text-[#7C3AED] hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                            >
                              <Search className="h-3 w-3" />
                              Inspect Diff & OCR
                            </button>

                            {isMatched ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#DCFCE7] dark:bg-[#163824] px-2.5 py-2 text-[8px] font-bold font-mono text-[#15803D] border border-[#BBF7D0]">
                                <CheckCircle2 className="h-3 w-3" />
                                Auto-Approved
                              </span>
                            ) : isManuallyApproved ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#DBEAFE] dark:bg-[#182942] px-2.5 py-2 text-[8px] font-bold font-mono text-[#2563EB] border border-[#BFDBFE]">
                                <CheckCircle2 className="h-3 w-3" />
                                AP Approved
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedFinanceAuditInvoice(inv)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FEF2F2] dark:bg-[#2A1515] border border-[#F87171] px-2.5 py-2 text-[8px] font-bold font-mono text-[#DC2626] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                Review Variance
                              </button>
                            )}

                          </div>

                        </td>

                      </tr>
                    );
                  })

                )}

              </tbody>

            </table>

          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-[#E3DDD1] dark:border-[#2B3835] px-5 py-3">

            <span className="text-[8px] font-mono uppercase tracking-wider text-[#8A938F]">
              Step 4 · Invoice Reconciliation & AP Settlement
            </span>

          </div>

        </PaperSheet>
      </div>
    );
  }

  // -------------------------------------------------------------
  // WAREHOUSE & DOCK MANAGER / SYSTEM ADMIN DASHBOARD (LIVE SYNCED)
  // -------------------------------------------------------------
  const baselineLpns = [
    { id: 'LPN-0004521', sku: 'SKU-BRG-6204', productName: 'Precision Steel Bearings', po: 'PO-78432', poNumber: 'PO-78432', pallets: 24, quantity: 500, currentStock: 500, unit: 'Units', status: 'Stored', location: 'YARD A - A05', binLocation: 'YARD A - A05', lotNumber: 'LOT-2026-08-41A', qcStatus: 'QC_PASSED', supplierName: 'Acme Steel Pvt Ltd', badgeColor: 'bg-[#DCFCE7] text-[#15803D]' },
    { id: 'LPN-0004520', sku: 'SKU-MTR-9901', productName: 'High-Speed Induction Motors', po: 'PO-78415', poNumber: 'PO-78415', pallets: 18, quantity: 100, currentStock: 100, unit: 'Units', status: 'Stored', location: 'YARD B - B12', binLocation: 'YARD B - B12', lotNumber: 'LOT-2026-08-42A', qcStatus: 'QC_PASSED', supplierName: 'TechCorp Solutions', badgeColor: 'bg-[#DCFCE7] text-[#15803D]' },
    { id: 'LPN-0004519', sku: 'SKU-VLV-3310', productName: 'Hydraulic Pressure Valves', po: 'PO-78398', poNumber: 'PO-78398', pallets: 12, quantity: 250, currentStock: 250, unit: 'Units', status: 'QC Hold', location: 'QC Hold Area', binLocation: 'QC Hold Area', lotNumber: 'LOT-2026-08-43A', qcStatus: 'QC_HOLD', supplierName: 'Apex Fasteners Ltd', badgeColor: 'bg-[#EDE9FE] text-[#7C3AED]' },
    { id: 'LPN-0004518', sku: 'SKU-SFT-1002', productName: 'Industrial Safety Helmets', po: 'PO-78376', poNumber: 'PO-78376', pallets: 30, quantity: 600, currentStock: 600, unit: 'Units', status: 'Stored', location: 'YARD C - C02', binLocation: 'YARD C - C02', lotNumber: 'LOT-2026-08-44A', qcStatus: 'QC_PASSED', supplierName: 'Acme Safety Inc', badgeColor: 'bg-[#DCFCE7] text-[#15803D]' },
    { id: 'LPN-0004517', sku: 'SKU-LOG-5500', productName: 'Heavy Duty Caster Wheels', po: 'PO-78364', poNumber: 'PO-78364', pallets: 16, quantity: 320, currentStock: 320, unit: 'Units', status: 'In Transit', location: 'D4', binLocation: 'D4', lotNumber: 'LOT-2026-08-45A', qcStatus: 'QC_PASSED', supplierName: 'Alpha Logistics Tech', badgeColor: 'bg-[#DBEAFE] text-[#2563EB]' }
  ];

  const liveDerivedLpns = liveInventory.length > 0
    ? liveInventory.map((inv, idx) => {
      const matchingGR = liveGoodsReceipts.find(gr => gr.items?.some(it => it.productName === inv.productName));
      const matchingPO = livePos.find(p => p.items?.some(it => it.productName === inv.productName));
      const poNum = matchingGR?.poNumber || matchingPO?.poNumber || `PO-784${32 - idx}`;
      const pallets = Math.max(4, Math.round((inv.quantityOnHand || 500) / 25));
      const isQcHold = inv.warehouseLocation?.toLowerCase().includes('qc') || (inv.quantityOnHand < 50);
      const baseLoc = inv.warehouseLocation || (idx % 3 === 0 ? 'YARD A - A05' : idx % 3 === 1 ? 'YARD B - B12' : 'YARD C - C02');
      const lpnKey = `LPN-000${4521 - idx}`;
      const loc = relocatedLocations.get(lpnKey) || baseLoc;
      const status = isQcHold ? 'QC Hold' : (idx === 4 ? 'In Transit' : 'Stored');
      const badgeColor = status === 'QC Hold' ? 'bg-[#EDE9FE] text-[#7C3AED]' : status === 'In Transit' ? 'bg-[#DBEAFE] text-[#2563EB]' : 'bg-[#DCFCE7] text-[#15803D]';

      return {
        id: lpnKey,
        sku: inv.sku || `SKU-${1000 + idx}`,
        productName: inv.productName,
        po: poNum,
        poNumber: poNum,
        pallets,
        quantity: inv.quantityOnHand || 500,
        currentStock: inv.quantityOnHand || 500,
        unit: 'Units',
        status,
        location: loc,
        binLocation: loc,
        lotNumber: `LOT-2026-08-${String(40 + idx)}A`,
        qcStatus: isQcHold ? 'QC_HOLD' : 'QC_PASSED',
        supplierName: matchingPO?.supplierName || 'Verified Tier 1 Supplier',
        badgeColor
      };
    })
    : baselineLpns.map(l => ({
      ...l,
      location: relocatedLocations.get(l.id) || l.location,
      binLocation: relocatedLocations.get(l.id) || l.binLocation
    }));

  const displayLpns = [...customCreatedLpns, ...liveDerivedLpns];

  // Dynamic KPI calculations
  const activeTrucksInYard = liveTrucks.filter(t => t.status !== 'COMPLETED');
  const trucksInYardCount = activeTrucksInYard.length > 0 ? activeTrucksInYard.length : 15;
  const palletsInYardCount = displayLpns.reduce((s, l) => s + (l.pallets || 0), 0) || 238;
  const lpnsInYardCount = displayLpns.length * 8 || 412;
  const occupiedDocksCount = liveDocks.filter(d => d.status === 'OCCUPIED' || d.currentTruckId).length || 6;
  const totalDocksCount = liveDocks.length || 12;
  const dockUtilPct = Math.round((occupiedDocksCount / totalDocksCount) * 100);

  // Dynamic Pallet Summary Breakdown for Donut Chart
  const palletSummaryData = {
    inYard: Math.round(palletsInYardCount * 0.65),
    docked: Math.round(palletsInYardCount * 0.20),
    qcHold: Math.round(palletsInYardCount * 0.06),
    inTransit: Math.round(palletsInYardCount * 0.09)
  };

  // Dynamic Zones Data for Yard Control Map
  const yardZonesData = [
    {
      id: 'YARD A',
      title: 'YARD A',
      lpns: `${Math.max(12, Math.round(displayLpns.length * 7))} LPNS`,
      pallets: `${Math.max(45, Math.round(palletsInYardCount * 0.35))} Pallets`,
      color: '#15803D',
      palletFill: 'bg-[#15803D]',
      dotCount: 24
    },
    {
      id: 'YARD B',
      title: 'YARD B',
      lpns: `${Math.max(16, Math.round(displayLpns.length * 9))} LPNS`,
      pallets: `${Math.max(60, Math.round(palletsInYardCount * 0.40))} Pallets`,
      color: '#D97706',
      palletFill: 'bg-[#D97706]',
      dotCount: 24
    },
    {
      id: 'YARD C',
      title: 'YARD C',
      lpns: `${Math.max(8, Math.round(displayLpns.length * 4))} LPNS`,
      pallets: `${Math.max(30, Math.round(palletsInYardCount * 0.18))} Pallets`,
      color: '#2563EB',
      palletFill: 'bg-[#2563EB]',
      dotCount: 24
    },
    {
      id: 'QC HOLD AREA',
      title: 'QC HOLD AREA',
      lpns: `${Math.max(3, Math.round(displayLpns.length * 2))} LPNS`,
      pallets: `${Math.max(8, Math.round(palletsInYardCount * 0.07))} Pallets`,
      color: '#7C3AED',
      palletFill: 'bg-[#7C3AED]',
      dotCount: 16
    }
  ];

  // Dynamic Dock Queue Data for DockStatusBoard
  const dockQueueData = liveTrucks.length > 0
    ? liveTrucks.filter(t => t.status !== 'COMPLETED').slice(0, 5).map(t => {
      const isDocked = Boolean(t.assignedDock);
      const status = isDocked ? `Docked - ${t.assignedDock}` : (t.status === 'AT_GATE' ? 'At Gate' : (t.status === 'DELAYED' ? 'Delayed' : 'In Queue'));
      const badgeColor = isDocked ? 'bg-[#DBEAFE] text-[#2563EB]' : (status === 'At Gate' ? 'bg-[#FEF3C7] text-[#D97706]' : (status === 'Delayed' ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#FFEDD5] text-[#EA580C]'));
      const eta = isDocked ? '--' : (t.eta || '15 min');
      return {
        truck: t.licensePlate || t.truckId,
        status,
        badgeColor,
        eta
      };
    })
    : [];

  // Dynamic Alerts Data for AlertsPanel
  const liveAlertsData = [];
  const delayedTrucks = liveTrucks.filter(t => t.status === 'DELAYED');
  if (delayedTrucks.length > 0) {
    liveAlertsData.push({
      id: 'alert-delayed',
      title: 'High Dwell / Delay Alert',
      description: `Truck ${delayedTrucks[0].licensePlate || delayedTrucks[0].truckId} waiting for 45+ min (ETA: ${delayedTrucks[0].eta || 'Delayed'}). Reassignment recommended.`,
      time: '5 min ago',
      icon: AlertTriangle,
      bg: 'bg-[#FEE2E2] dark:bg-[#351C1C]',
      border: 'border-[#FECACA] dark:border-[#522525]',
      iconColor: 'text-[#DC2626]',
      titleColor: 'text-[#DC2626]'
    });
  }
  const damagedGRs = liveGoodsReceipts.filter(gr => gr.items?.some(it => (it.damagedQuantity || 0) > 0));
  if (damagedGRs.length > 0) {
    const dmgCount = damagedGRs[0].items.reduce((s, it) => s + (it.damagedQuantity || 0), 0);
    liveAlertsData.push({
      id: 'alert-qc',
      title: 'QC Variance Quarantine',
      description: `${dmgCount} units quarantined in QC Hold Area from PO ${damagedGRs[0].poNumber} during dock intake.`,
      time: '18 min ago',
      icon: ShieldAlert,
      bg: 'bg-[#EDE9FE] dark:bg-[#281E3B]',
      border: 'border-[#DDD6FE] dark:border-[#3D2C5E]',
      iconColor: 'text-[#7C3AED]',
      titleColor: 'text-[#7C3AED]'
    });
  }
  const gateTrucks = liveTrucks.filter(t => t.status === 'AT_GATE' && t.gateVerification?.status !== 'APPROVED');
  if (gateTrucks.length > 0) {
    liveAlertsData.push({
      id: 'alert-gate',
      title: 'Gate Vision OCR Scan',
      description: `Vehicle ${gateTrucks[0].licensePlate || gateTrucks[0].truckId} awaiting dual ANPR number-plate camera clearance at Gate 01.`,
      time: '10 min ago',
      icon: Layers,
      bg: 'bg-[#FEF3C7] dark:bg-[#332A15]',
      border: 'border-[#FDE68A] dark:border-[#4D3F1D]',
      iconColor: 'text-[#D97706]',
      titleColor: 'text-[#D97706]'
    });
  }

  // Dynamic Operational Activity Feed Data
  const liveMovesData = liveGoodsReceipts.length > 0
    ? liveGoodsReceipts.slice(0, 5).map((gr, idx) => ({
      time: new Date(gr.receivedDate || gr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lpn: `LPN-${gr.receiptNumber?.replace('GRN-', '') || String(4521 - idx)}`,
      from: idx % 2 === 0 ? 'Dock D1' : 'Dock D4',
      to: idx % 3 === 0 ? 'YARD A - A05' : idx % 3 === 1 ? 'YARD B - B12' : 'YARD C - C02',
      by: gr.receivedBy || (idx % 2 === 0 ? 'Rohit (Forklift 01)' : 'Vikram (Forklift 02)')
    }))
    : [];

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'create_lpn':
        setIsCreateLpnOpen(true);
        break;
      case 'receive_inbound': {
        const activeInbound = liveTrucks.find(t => t.status === 'AT_GATE' || t.status === 'IN_YARD' || t.status === 'IN_TRANSIT');
        showNotification(`Opening Inbound Gate & Receiving for ${activeInbound?.licensePlate || activeInbound?.truckId || 'active inbound trucks'}...`, 'info');
        navigate('/logistics');
        break;
      }
      case 'move_relocate':
        setIsRelocateOpen(true);
        break;
      case 'print_label': {
        const lpnToPrint = displayLpns[0] || baselineLpns[0];
        setSelectedPrintLpn(lpnToPrint);
        setIsPrintLabelOpen(true);
        break;
      }
      case 'yard_audit':
        fetchYardDashboard();
        showNotification('Physical Yard inventory & live telemetry synchronized across all docks and storage zones.', 'success');
        break;
      default:
        break;
    }
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 max-w-[1680px] mx-auto min-h-screen">

      {/* 1. TOP HORIZONTAL KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
          <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
            <span className="text-[10px] sm:text-[11px] font-sans font-medium">Trucks in Yard</span>
            <div className="p-1 rounded-xs bg-[#DCFCE7] dark:bg-[#163824] text-[#15803D] dark:text-[#22C55E]">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6] leading-tight">
            {trucksInYardCount}
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-[#15803D] dark:text-[#22C55E] font-semibold">
            <span>▲ {activeTrucksInYard.length || 3} in pipeline</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
          <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
            <span className="text-[10px] sm:text-[11px] font-sans font-medium">Pallets in Yard</span>
            <div className="p-1 rounded-xs bg-[#FEF3C7] dark:bg-[#332A15] text-[#D97706]">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6] leading-tight">
            {palletsInYardCount}
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-[#15803D] dark:text-[#22C55E] font-semibold">
            <span>▲ 18 vs yesterday</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
          <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
            <span className="text-[10px] sm:text-[11px] font-sans font-medium">LPNs in Yard</span>
            <div className="p-1 rounded-xs bg-[#F4EFE6] dark:bg-[#252E2C] text-[#68716D]">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6] leading-tight">
            {lpnsInYardCount}
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-[#15803D] dark:text-[#22C55E] font-semibold">
            <span>▲ {displayLpns.length} active batches</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
          <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
            <span className="text-[10px] sm:text-[11px] font-sans font-medium">Docks in Use</span>
            <div className="p-1 rounded-xs bg-[#DBEAFE] dark:bg-[#182942] text-[#2563EB]">
              <DoorOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6] leading-tight">
            {occupiedDocksCount} <span className="text-base text-[#68716D] dark:text-[#8E9C97] font-normal">/ {totalDocksCount}</span>
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono text-[#68716D] dark:text-[#8E9C97]">
            {dockUtilPct}% Utilisation
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
          <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
            <span className="text-[10px] sm:text-[11px] font-sans font-medium">Avg Dwell Time</span>
            <div className="p-1 rounded-xs bg-[#FEE2E2] dark:bg-[#381B1B] text-[#DC2626]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-sans text-[#DC2626] leading-tight">
            58 <span className="text-sm font-normal text-[#68716D] dark:text-[#8E9C97]">min</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-[#15803D] font-semibold">
            <span>▼ 14% vs yesterday</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN SPLIT APPLICATION LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        <div className="lg:col-span-8 space-y-4 sm:space-y-5">
          <YardControlMap
            docksData={liveDocks}
            trucksData={liveTrucks}
            zonesData={yardZonesData}
            onSelectTruck={(t) => showNotification(`Inspecting vehicle: ${t.id} (${t.status})`, 'info')}
          />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] p-4 shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-2 select-none">
              <div className="flex items-center justify-between pb-1 border-b border-[#E3DDD1] dark:border-[#2B3835]">
                <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                  LPNs in Yard
                </h3>
                <span className="text-xs font-sans text-[#2563EB]">Live Staging</span>
              </div>

              <div className="overflow-x-auto max-h-[220px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#E3DDD1] text-[10px] text-[#68716D]">
                      <th className="py-1 font-semibold">LPN</th>
                      <th className="py-1 font-semibold">PO #</th>
                      <th className="py-1 font-semibold text-right">Pallets</th>
                      <th className="py-1 font-semibold">Status</th>
                      <th className="py-1 font-semibold">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3DDD1]/60">
                    {displayLpns.slice(0, 6).map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedLpn(row)}
                        className="hover:bg-[#F4EFE6]/50 cursor-pointer transition-colors"
                      >
                        <td className="py-1.5 font-bold text-[#1C201E] dark:text-[#F5F7F6]">{row.id}</td>
                        <td className="py-1.5 text-[#68716D] dark:text-[#8E9C97]">{row.po}</td>
                        <td className="py-1.5 text-right font-bold text-[#1C201E] dark:text-[#F5F7F6]">{row.pallets}</td>
                        <td className="py-1.5">
                          <span className={`px-1.5 py-0.2 rounded-[2px] text-[8px] font-bold ${row.badgeColor}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-1.5 text-[10px] text-[#68716D] dark:text-[#8E9C97]">{row.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:col-span-4">
              <PalletSummary data={palletSummaryData} />
            </div>

            <div className="md:col-span-3">
              <QuickActionsSheet onAction={handleQuickAction} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4 sm:space-y-5">
          <DockStatusBoard queueData={dockQueueData} />
          <AlertsPanel alertsData={liveAlertsData} />
          <OperationalActivityFeed movesData={liveMovesData} />
        </div>
      </div>

      <LPNDetailSheet
        lpn={selectedLpn}
        isOpen={Boolean(selectedLpn)}
        onClose={() => setSelectedLpn(null)}
      />

      {/* 3. QUICK ACTION MODAL: CREATE LPN */}
      {isCreateLpnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <PaperSheet variant="default" className="w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3DDD1] dark:border-[#2B3835]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xs bg-[#DCFCE7] dark:bg-[#163824] text-[#15803D]">
                  <Barcode className="w-4 h-4" />
                </div>
                <h3 className="font-handwriting text-2xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                  Generate Serialized LPN
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateLpnOpen(false)}
                className="p-1 rounded-xs text-[#68716D] hover:text-[#1C201E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const poNumber = formData.get('poNumber') || 'PO-78432';
                const quantity = Number(formData.get('quantity') || 500);
                const location = formData.get('location') || 'YARD A - A05';
                const newLpnId = `LPN-${String(4522 + customCreatedLpns.length).padStart(7, '0')}`;

                const newLpnObj = {
                  id: newLpnId,
                  sku: `SKU-GEN-${1000 + customCreatedLpns.length}`,
                  productName: 'Precision Intake Pallet Units',
                  po: poNumber,
                  poNumber,
                  pallets: Math.max(4, Math.round(quantity / 25)),
                  quantity,
                  currentStock: quantity,
                  unit: 'Units',
                  status: 'Stored',
                  location,
                  binLocation: location,
                  lotNumber: `LOT-2026-08-${String(50 + customCreatedLpns.length)}A`,
                  qcStatus: 'QC_PASSED',
                  supplierName: 'Acme Steel Pvt Ltd',
                  badgeColor: 'bg-[#DCFCE7] text-[#15803D]'
                };

                setCustomCreatedLpns(prev => [newLpnObj, ...prev]);
                showNotification(`LPN Registry auto-allocated and registered: ${newLpnId} (${quantity} units at ${location})`, 'success');
                setIsCreateLpnOpen(false);
              }}
              className="space-y-3 font-sans text-xs"
            >
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#68716D] mb-1">
                  Purchase Order Reference
                </label>
                <select
                  name="poNumber"
                  className="w-full px-3 py-2 rounded-xs border border-[#E3DDD1] dark:border-[#2B3835] bg-[#FCFAF4] dark:bg-[#1B2422] font-mono text-xs text-[#1C201E] dark:text-[#F5F7F6]"
                >
                  <option value="PO-78432">PO-78432 · Acme Steel Pvt Ltd (Precision Bearings)</option>
                  <option value="PO-78415">PO-78415 · TechCorp Solutions (Induction Motors)</option>
                  <option value="PO-78398">PO-78398 · Apex Fasteners Ltd (Pressure Valves)</option>
                  <option value="PO-78364">PO-78364 · Alpha Logistics Tech (Safety Kits)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#68716D] mb-1">
                    Units Count
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    defaultValue={500}
                    min={1}
                    className="w-full px-3 py-2 rounded-xs border border-[#E3DDD1] dark:border-[#2B3835] bg-[#FCFAF4] dark:bg-[#1B2422] font-mono text-xs text-[#1C201E] dark:text-[#F5F7F6]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#68716D] mb-1">
                    Target Yard Zone
                  </label>
                  <select
                    name="location"
                    className="w-full px-3 py-2 rounded-xs border border-[#E3DDD1] dark:border-[#2B3835] bg-[#FCFAF4] dark:bg-[#1B2422] font-mono text-xs text-[#1C201E] dark:text-[#F5F7F6]"
                  >
                    <option value="YARD A - A05">YARD A - A05</option>
                    <option value="YARD B - B12">YARD B - B12</option>
                    <option value="YARD C - C02">YARD C - C02</option>
                    <option value="QC Hold Area">QC Hold Area</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E3DDD1] dark:border-[#2B3835] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateLpnOpen(false)}
                  className="px-3 py-2 rounded-xs border border-[#E3DDD1] text-xs font-mono text-[#68716D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xs bg-[#15803D] text-white font-bold text-xs font-mono hover:bg-[#166534] transition-colors shadow-2xs"
                >
                  Generate LPN Barcode
                </button>
              </div>
            </form>
          </PaperSheet>
        </div>
      )}

      {/* 4. QUICK ACTION MODAL: RELOCATE PALLET */}
      {isRelocateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <PaperSheet variant="default" className="w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3DDD1] dark:border-[#2B3835]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xs bg-[#FEF3C7] dark:bg-[#332A15] text-[#D97706]">
                  <Move className="w-4 h-4" />
                </div>
                <h3 className="font-handwriting text-2xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                  Dispatch Pallet Relocation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRelocateOpen(false)}
                className="p-1 rounded-xs text-[#68716D] hover:text-[#1C201E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const lpnId = formData.get('lpnId') || displayLpns[0]?.id;
                const targetLoc = formData.get('targetLoc') || 'YARD B - B12';
                const forklift = formData.get('forklift') || 'Forklift 02 (Vikram)';

                setRelocatedLocations(prev => {
                  const next = new Map(prev);
                  next.set(lpnId, targetLoc);
                  return next;
                });

                showNotification(`Relocation task dispatched: Moved ${lpnId} to ${targetLoc} via ${forklift}.`, 'success');
                setIsRelocateOpen(false);
              }}
              className="space-y-3 font-sans text-xs"
            >
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#68716D] mb-1">
                  Select Pallet / LPN
                </label>
                <select
                  name="lpnId"
                  className="w-full px-3 py-2 rounded-xs border border-[#E3DDD1] dark:border-[#2B3835] bg-[#FCFAF4] dark:bg-[#1B2422] font-mono text-xs text-[#1C201E] dark:text-[#F5F7F6]"
                >
                  {displayLpns.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.id} · {l.productName} ({l.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#68716D] mb-1">
                  Destination Storage Zone
                </label>
                <select
                  name="targetLoc"
                  className="w-full px-3 py-2 rounded-xs border border-[#E3DDD1] dark:border-[#2B3835] bg-[#FCFAF4] dark:bg-[#1B2422] font-mono text-xs text-[#1C201E] dark:text-[#F5F7F6]"
                >
                  <option value="YARD A - A05">YARD A - A05 (High Bay)</option>
                  <option value="YARD B - B12">YARD B - B12 (Active Picking)</option>
                  <option value="YARD C - C02">YARD C - C02 (Bulk Storage)</option>
                  <option value="Dock D1">Dock D1 (Staging Apron)</option>
                  <option value="Dock D4">Dock D4 (Outbound Bay)</option>
                  <option value="QC Hold Area">QC Hold Area (Inspection Bay)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#68716D] mb-1">
                  Assigned Forklift & Driver
                </label>
                <select
                  name="forklift"
                  className="w-full px-3 py-2 rounded-xs border border-[#E3DDD1] dark:border-[#2B3835] bg-[#FCFAF4] dark:bg-[#1B2422] font-mono text-xs text-[#1C201E] dark:text-[#F5F7F6]"
                >
                  <option value="Forklift 02 (Vikram)">Forklift 02 · Vikram (Active in Lane 2)</option>
                  <option value="Forklift 01 (Rohit)">Forklift 01 · Rohit (Dock Staging)</option>
                  <option value="AGV Shuttle 03">AGV Shuttle 03 · Autonomous Rail</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#E3DDD1] dark:border-[#2B3835] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRelocateOpen(false)}
                  className="px-3 py-2 rounded-xs border border-[#E3DDD1] text-xs font-mono text-[#68716D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xs bg-[#D97706] text-white font-bold text-xs font-mono hover:bg-[#B45309] transition-colors shadow-2xs"
                >
                  Dispatch Relocation
                </button>
              </div>
            </form>
          </PaperSheet>
        </div>
      )}

      {/* 5. QUICK ACTION MODAL: PRINT LPN LABEL */}
      {isPrintLabelOpen && selectedPrintLpn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <PaperSheet variant="default" className="w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3DDD1] dark:border-[#2B3835]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xs bg-[#DBEAFE] dark:bg-[#182942] text-[#2563EB]">
                  <Printer className="w-4 h-4" />
                </div>
                <h3 className="font-handwriting text-2xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                  Thermal Barcode Print Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintLabelOpen(false)}
                className="p-1 rounded-xs text-[#68716D] hover:text-[#1C201E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Label Card Canvas */}
            <div className="p-4 rounded-xs bg-white text-[#1C201E] border-2 border-dashed border-[#1C201E] space-y-3 font-mono">
              <div className="flex items-center justify-between border-b-2 border-[#1C201E] pb-2">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#15803D]">COGNIYARD LOGISTICS</span>
                  <div className="text-sm font-bold">{selectedPrintLpn.id}</div>
                </div>
                <span className="text-[10px] font-bold border border-[#1C201E] px-1.5 py-0.5 rounded-xs">
                  {selectedPrintLpn.location}
                </span>
              </div>

              {/* Barcode Graphic */}
              <div className="text-center py-2 bg-zinc-50 border border-zinc-300 rounded-xs space-y-1">
                <div className="font-mono text-2xl font-bold tracking-[0.35em] text-zinc-900 leading-none">
                  |||| | ||||| || |||| ||| ||||
                </div>
                <span className="text-[10px] tracking-widest font-bold">{selectedPrintLpn.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                <div>
                  <span className="text-zinc-500 block text-[8px] uppercase">Product:</span>
                  <strong className="truncate block">{selectedPrintLpn.productName}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[8px] uppercase">Master SKU:</span>
                  <strong className="block">{selectedPrintLpn.sku}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[8px] uppercase">PO Reference:</span>
                  <strong className="block">{selectedPrintLpn.po}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[8px] uppercase">Pallet Count:</span>
                  <strong className="block">{selectedPrintLpn.pallets} Pallets ({selectedPrintLpn.quantity} Units)</strong>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E3DDD1] dark:border-[#2B3835] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#68716D]">
                Printer: Warehouse Thermal #01
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintLabelOpen(false)}
                  className="px-3 py-1.5 rounded-xs border border-[#E3DDD1] text-xs font-mono text-[#68716D]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showNotification(`Sent thermal barcode label ${selectedPrintLpn.id} to Warehouse Printer 01.`, 'success');
                    setIsPrintLabelOpen(false);
                  }}
                  className="px-4 py-1.5 rounded-xs bg-[#2563EB] text-white font-bold text-xs font-mono hover:bg-[#1D4ED8] transition-colors shadow-2xs"
                >
                  Print Thermal Label
                </button>
              </div>
            </div>
          </PaperSheet>
        </div>
      )}
    </div>
  );
}
