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
  X
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

          {/* Monthly Procurement Spend vs Budget (Bar Chart) */}
          <div className="lg:col-span-7">
            <PaperSheet variant="default" className="p-4 sm:p-5 space-y-3 h-full">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3DDD1] dark:border-[#2B3835]">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#2563EB]" />
                  <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                    Monthly Spend vs Budget Allocation (₹ Lakhs)
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-[#15803D]">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#15803D]" /> Spent
                  </span>
                  <span className="flex items-center gap-1 text-[#D4CABE]">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#D4CABE]" /> Budget
                  </span>
                </div>
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySpendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD1" opacity={0.6} />
                    <XAxis dataKey="month" stroke="#68716D" fontSize={11} tickLine={false} />
                    <YAxis stroke="#68716D" fontSize={11} tickLine={false} />
                    <Tooltip
                      formatter={(val) => `₹${val} Lakhs`}
                      contentStyle={{
                        backgroundColor: '#FCFAF4',
                        borderColor: '#E3DDD1',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <Bar dataKey="Budget" fill="#D4CABE" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Spent" fill="#15803D" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#E3DDD1] dark:border-[#2B3835] text-[11px] font-mono text-[#68716D] dark:text-[#8E9C97]">
                <span>Variance: <strong>-14.4% Under Budget</strong></span>
                <span className="text-[#15803D] font-bold">Optimal Capital Efficiency</span>
              </div>
            </PaperSheet>
          </div>
        </div>

        {/* 3. PURCHASE ORDERS & SUPPLIER SCORECARD SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-4">
            <PaperSheet variant="default" className="p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#E3DDD1] dark:border-[#2B3835]">
                <div>
                  <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                    Dispatched Purchase Orders Pipeline
                  </h3>
                  <p className="text-[10px] text-[#68716D] dark:text-[#8E9C97] font-mono">
                    Real-time status synchronised across Warehouse and Supplier networks
                  </p>
                </div>
                <NavLink
                  to="/procurement"
                  className="px-3 py-1.5 rounded-xs bg-[#15803D] text-white text-xs font-sans font-bold hover:bg-[#166534] transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create PO</span>
                </NavLink>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#E3DDD1] dark:border-[#2B3835] text-[10px] text-[#68716D]">
                      <th className="py-2 font-semibold">PO Number</th>
                      <th className="py-2 font-semibold">Supplier Vendor</th>
                      <th className="py-2 font-semibold">Item SKU</th>
                      <th className="py-2 font-semibold text-right">Value (₹)</th>
                      <th className="py-2 font-semibold">Fulfillment State</th>
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
                          <td className="py-2.5 font-bold text-[#15803D]">{po.poNumber}</td>
                          <td className="py-2.5 font-sans font-medium text-[#1C201E] dark:text-[#F5F7F6]">{supName}</td>
                          <td className="py-2.5 font-sans text-[#68716D] dark:text-[#8E9C97]">{itemDesc}</td>
                          <td className="py-2.5 text-right font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                            ₹{(po.totalAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded-xs text-[8px] font-bold uppercase ${badge}`}>
                              {po.status || 'IN_TRANSIT'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </PaperSheet>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <PaperSheet variant="default" className="p-4 sm:p-5 space-y-3">
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
            <PaperSheet variant="default" className="p-4 sm:p-5 space-y-3 h-full">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3DDD1] dark:border-[#2B3835]">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#2563EB]" />
                  <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                    Weekly Invoiced Amount vs Settled Payouts
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#2563EB] font-bold">₹ in Indian Rupees</span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyFinanceCashflow} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD1" opacity={0.6} />
                    <XAxis dataKey="week" stroke="#68716D" fontSize={11} tickLine={false} />
                    <YAxis stroke="#68716D" fontSize={10} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
                      contentStyle={{
                        backgroundColor: '#FCFAF4',
                        borderColor: '#E3DDD1',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'sans-serif' }} />
                    <Bar dataKey="billed" name="Billed by Vendors" fill="#7C3AED" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="settled" name="Settled Disbursements" fill="#15803D" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#E3DDD1] dark:border-[#2B3835] text-[11px] font-mono text-[#68716D]">
                <span>AP Settlement Velocity: <strong>94.2% within 3 days</strong></span>
                <span className="text-[#15803D] font-bold">Zero Early-Payment Penalty</span>
              </div>
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
        <PaperSheet variant="default" className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[#E3DDD1]">
            <div>
              <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                Invoice Matching & AP Settlement Queue
              </h3>
              <p className="text-[10px] text-[#68716D] dark:text-[#8E9C97] font-mono">
                Click <strong>Inspect Diff</strong> to audit 3-way line item variances
              </p>
            </div>
            <NavLink to="/finance" className="text-xs font-sans text-[#2563EB] hover:underline font-bold">
              Open 3-Way Match Studio →
            </NavLink>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#E3DDD1] text-[10px] text-[#68716D]">
                  <th className="py-2.5 font-semibold">Invoice No</th>
                  <th className="py-2.5 font-semibold">PO Reference</th>
                  <th className="py-2.5 font-semibold">Vendor</th>
                  <th className="py-2.5 font-semibold text-right">Net Payable</th>
                  <th className="py-2.5 font-semibold">3-Way Match Status</th>
                  <th className="py-2.5 font-semibold text-right">Reconciliation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3DDD1]/60">
                {financeQueueInvoices.map((inv) => {
                  const isMatch = inv.matchStatus === 'MATCHED';

                  return (
                    <tr key={inv._id} className="hover:bg-[#F4EFE6]/50 transition-colors">
                      <td className="py-3 font-bold text-[#1C201E] dark:text-[#F5F7F6]">{inv.invoiceNumber}</td>
                      <td className="py-3 font-bold text-[#15803D]">{inv.poNumber}</td>
                      <td className="py-3 font-sans font-medium">{inv.supplierName}</td>
                      <td className="py-3 text-right font-bold">₹{inv.amount.toLocaleString('en-IN')}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-xs text-[8px] font-bold uppercase ${
                          isMatch ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEE2E2] text-[#DC2626]'
                        }`}>
                          {isMatch ? 'MATCHED (100%)' : 'MISMATCH (QTY -2)'}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedFinanceAuditInvoice(inv)}
                          className="px-2.5 py-1 rounded-xs border border-[#15803D] text-[#15803D] hover:bg-[#DCFCE7] text-xs font-mono font-bold transition-colors"
                        >
                          Inspect Diff
                        </button>
                        <button
                          type="button"
                          onClick={() => showNotification(`Payment of ₹${inv.amount.toLocaleString('en-IN')} disbursed to ${inv.supplierName}.`, 'success')}
                          className="px-2.5 py-1 rounded-xs bg-[#15803D] text-white text-xs font-mono font-bold hover:bg-[#166534] transition-colors"
                        >
                          Disburse ₹
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
