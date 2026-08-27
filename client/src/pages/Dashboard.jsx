import React, { useState, useEffect } from 'react';
import { NavLink, Navigate } from 'react-router-dom';
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
import { procurementAPI } from '../services/api';
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
  Search
} from 'lucide-react';

export default function Dashboard() {
  const { currentRole, showNotification } = useAuth();
  const [selectedLpn, setSelectedLpn] = useState(null);
  const [selectedFinanceAuditInvoice, setSelectedFinanceAuditInvoice] = useState(null);

  // State for live procurement data
  const [livePos, setLivePos] = useState([]);
  const [livePrs, setLivePrs] = useState([]);
  const [liveSuppliers, setLiveSuppliers] = useState([]);
  const [procLoading, setProcLoading] = useState(false);

  useEffect(() => {
    if (currentRole === ROLES.PROCUREMENT) {
      fetchProcurementDashboard();
    }
  }, [currentRole]);

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

    const financeQueueInvoices = [
      {
        _id: 'inv-8810',
        invoiceNumber: 'INV-8810',
        poNumber: 'PO-78432',
        grnNumber: 'GRN-5011',
        supplierName: 'Acme Steel Pvt Ltd',
        amount: 138768,
        totalAmount: 138768,
        matchStatus: 'MATCHED',
        status: 'READY_FOR_PAYMENT',
        matchDetails: {
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
        matchDetails: {
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
              onApprove={(inv) => {
                showNotification(`Payment authorized for invoice ${inv.invoiceNumber}. Funds transfer queued.`, 'success');
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
                Matched
              </p>

              <p className="mt-1 text-lg font-bold font-mono text-[#15803D]">
                {
                  financeQueueInvoices.filter(
                    (inv) => inv.matchStatus === "MATCHED"
                  ).length
                }
              </p>
            </div>

            <div className="border-l border-[#E3DDD1] dark:border-[#2B3835] px-5 py-3">
              <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                Exceptions
              </p>

              <p className="mt-1 text-lg font-bold font-mono text-[#DC2626]">
                {
                  financeQueueInvoices.filter(
                    (inv) => inv.matchStatus !== "MATCHED"
                  ).length
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
                    (total, inv) => total + Number(inv.amount || 0),
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
                    "Reconciliation",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className={`px-5 py-3 text-[8px] font-bold uppercase tracking-widest text-[#8A938F] ${heading === "Net Payable" ||
                        heading === "Reconciliation"
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

                    const isMatch = inv.matchStatus === "MATCHED";

                    return (
                      <tr
                        key={inv._id}
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
                              {inv.supplierName}
                            </p>

                            <p className="mt-0.5 text-[7px] text-[#8A938F]">
                              Accounts Payable
                            </p>
                          </div>

                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 text-right">

                          <span className="text-[10px] font-bold font-mono text-[#1C201E] dark:text-[#F5F7F6]">
                            ₹{Number(inv.amount || 0).toLocaleString("en-IN")}
                          </span>

                        </td>

                        {/* Match Status */}
                        <td className="px-5 py-4">

                          <div className="flex flex-col items-start gap-1">

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[7px] font-bold uppercase tracking-wide ${isMatch
                                ? "border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]"
                                : "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                                }`}
                            >

                              {isMatch ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <AlertTriangle className="h-3 w-3" />
                              )}

                              {isMatch
                                ? "Matched · 100%"
                                : "Mismatch · Qty -2"}

                            </span>

                            <span className="text-[7px] font-mono text-[#8A938F]">
                              {isMatch
                                ? "PO / GRN / Invoice aligned"
                                : "Variance requires review"}
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
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-2 text-[8px] font-bold font-mono text-[#2563EB] hover:bg-[#DBEAFE] transition-colors"
                            >
                              <Search className="h-3 w-3" />
                              Inspect Diff
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                showNotification(
                                  `Payment of ₹${Number(
                                    inv.amount || 0
                                  ).toLocaleString("en-IN")} disbursed to ${inv.supplierName}.`,
                                  "success"
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#15803D] px-2.5 py-2 text-[8px] font-bold font-mono text-white hover:bg-[#166534] transition-colors"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Disburse
                            </button>

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

            <span className="text-[8px] font-mono text-[#8A938F]">
              3-way match · PO + GRN + Invoice
            </span>

          </div>

        </PaperSheet>
      </div>
    );
  }

  // -------------------------------------------------------------
  // WAREHOUSE & DOCK MANAGER / SYSTEM ADMIN DASHBOARD (DEFAULT)
  // -------------------------------------------------------------
  const lpnsInYard = [
    { id: 'LPN-0004521', po: 'PO-78432', pallets: 24, status: 'Stored', location: 'YARD A - A05', badgeColor: 'bg-[#DCFCE7] text-[#15803D]' },
    { id: 'LPN-0004520', po: 'PO-78415', pallets: 18, status: 'Stored', location: 'YARD B - B12', badgeColor: 'bg-[#DCFCE7] text-[#15803D]' },
    { id: 'LPN-0004519', po: 'PO-78398', pallets: 12, status: 'QC Hold', location: 'QC Hold Area', badgeColor: 'bg-[#EDE9FE] text-[#7C3AED]' },
    { id: 'LPN-0004518', po: 'PO-78376', pallets: 30, status: 'Stored', location: 'YARD C - C02', badgeColor: 'bg-[#DCFCE7] text-[#15803D]' },
    { id: 'LPN-0004517', po: 'PO-78364', pallets: 16, status: 'In Transit', location: 'D4', badgeColor: 'bg-[#DBEAFE] text-[#2563EB]' }
  ];

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'create_lpn':
        showNotification('LPN Generation Registry opened. System auto-allocated LPN-0004523.', 'success');
        break;
      case 'receive_inbound':
        showNotification('Inbound Dock inspection active for truck WB 25 AB 1234.', 'info');
        break;
      case 'move_relocate':
        showNotification('Relocation task dispatched to Forklift 02.', 'info');
        break;
      case 'print_label':
        showNotification('Sending thermal LPN barcode labels to Warehouse Printer 01.', 'success');
        break;
      case 'yard_audit':
        showNotification('Physical Yard inventory audit log synchronized.', 'success');
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
          <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6] leading-tight">15</div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-[#15803D] dark:text-[#22C55E] font-semibold">
            <span>▲ 3 vs yesterday</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-1">
          <div className="flex items-center justify-between text-[#68716D] dark:text-[#8E9C97]">
            <span className="text-[10px] sm:text-[11px] font-sans font-medium">Pallets in Yard</span>
            <div className="p-1 rounded-xs bg-[#FEF3C7] dark:bg-[#332A15] text-[#D97706]">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6] leading-tight">238</div>
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
          <div className="text-2xl sm:text-3xl font-bold font-sans text-[#1C201E] dark:text-[#F5F7F6] leading-tight">412</div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-[#15803D] dark:text-[#22C55E] font-semibold">
            <span>▲ 26 vs yesterday</span>
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
            6 <span className="text-base text-[#68716D] dark:text-[#8E9C97] font-normal">/ 12</span>
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono text-[#68716D] dark:text-[#8E9C97]">
            50% Utilisation
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
            68 <span className="text-sm font-normal text-[#68716D] dark:text-[#8E9C97]">min</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-[#DC2626] font-semibold">
            <span>▼ 12% vs yesterday</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN SPLIT APPLICATION LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        <div className="lg:col-span-8 space-y-4 sm:space-y-5">
          <YardControlMap onSelectTruck={(t) => showNotification(`Inspecting vehicle: ${t.id} (${t.status})`, 'info')} />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5 rounded-[3px] bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] p-4 shadow-[0_1px_3px_rgba(35,30,25,0.04)] space-y-2 select-none">
              <div className="flex items-center justify-between pb-1 border-b border-[#E3DDD1] dark:border-[#2B3835]">
                <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                  LPNs in Yard
                </h3>
                <span className="text-xs font-sans text-[#2563EB]">Live Staging</span>
              </div>

              <div className="overflow-x-auto">
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
                    {lpnsInYard.map((row) => (
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
              <PalletSummary />
            </div>

            <div className="md:col-span-3">
              <QuickActionsSheet onAction={handleQuickAction} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4 sm:space-y-5">
          <DockStatusBoard />
          <AlertsPanel />
          <OperationalActivityFeed />
        </div>
      </div>

      <LPNDetailSheet
        lpn={selectedLpn}
        isOpen={Boolean(selectedLpn)}
        onClose={() => setSelectedLpn(null)}
      />
    </div>
  );
}
