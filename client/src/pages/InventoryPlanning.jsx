import React, { useState, useEffect } from 'react';
import { inventoryPlanningAPI } from '../services/api';
import {
  Boxes,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Info,
  ChevronRight,
  X,
  Zap,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Calculator,
  Sliders
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Label,
  LabelList
} from 'recharts';

export default function InventoryPlanning() {
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAssumptionsModal, setShowAssumptionsModal] = useState(false);

  const fetchPlanningData = async () => {
    setLoading(true);
    try {
      const [summaryRes, productsRes] = await Promise.all([
        inventoryPlanningAPI.getSummary(),
        inventoryPlanningAPI.getProducts()
      ]);

      if (summaryRes.data.success) {
        setSummary(summaryRes.data.summary);
      }
      if (productsRes.data.success) {
        setProducts(productsRes.data.products);
      }
    } catch (error) {
      console.error('Error fetching inventory planning data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanningData();
  }, []);

  const filteredProducts = products.filter(prod => {
    const matchesSearch =
      prod.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || prod.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'URGENT_REORDER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
            URGENT REORDER
          </span>
        );
      case 'REORDER_RECOMMENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            REORDER
          </span>
        );
      case 'MONITOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" />
            MONITOR
          </span>
        );
      case 'HEALTHY':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            HEALTHY
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Page Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Calculator className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Inventory Planning Intelligence
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            EOQ, Demand Netting, Safety Stock, and Replenishment Recommendations Engine
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAssumptionsModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-purple-500" />
            Planning Assumptions
          </button>

          <button
            onClick={fetchPlanningData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Intelligence
          </button>
        </div>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-xs font-semibold">Monitored SKUs</span>
            <Boxes className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {summary ? summary.totalProductsMonitored : '-'}
          </p>
          <span className="text-[10px] text-zinc-400">Total Catalog</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-xs font-semibold">Reorder Needed</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {summary ? summary.reorderRecommendedCount : '-'}
          </p>
          <span className="text-[10px] text-amber-500 font-medium">Action Required</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-xs font-semibold">Urgent Reorders</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
            {summary ? summary.urgentReordersCount : '-'}
          </p>
          <span className="text-[10px] text-red-500 font-medium">Stockout Risk</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-xs font-semibold">Healthy Inventory</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {summary ? summary.healthyCount : '-'}
          </p>
          <span className="text-[10px] text-emerald-500 font-medium">Optimal Coverage</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-xs font-semibold">Net Requirement</span>
            <Zap className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {summary ? summary.totalNetRequirement.toLocaleString() : '-'}
          </p>
          <span className="text-[10px] text-zinc-400">Aggregate Units</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-xs font-semibold">Open PO Coverage</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {summary ? summary.openPOCoveragePercent : '-'}
          </p>
          <span className="text-[10px] text-purple-500 font-medium">Demand Covered</span>
        </div>
      </div>

      {/* Main Planning Table Container */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
        
        {/* Table Filters Header */}
        <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search product or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="ALL">All Replenishment States</option>
              <option value="URGENT_REORDER">Urgent reorders only</option>
              <option value="REORDER_RECOMMENDED">🟠 Reorder Recommended</option>
              <option value="MONITOR">🟡 Monitor Status</option>
              <option value="HEALTHY">Healthy inventory</option>
            </select>
          </div>
        </div>

        {/* Planning Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200/80 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Product Name & SKU</th>
                <th className="px-4 py-3 text-right">Current Stock</th>
                <th className="px-4 py-3 text-right">Avg Demand</th>
                <th className="px-4 py-3 text-right">Incoming PO</th>
                <th className="px-4 py-3 text-right">Net Req.</th>
                <th className="px-4 py-3 text-right">Safety Stock</th>
                <th className="px-4 py-3 text-right">Reorder Point</th>
                <th className="px-4 py-3 text-right">EOQ</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Recommended Order</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-4 py-12 text-center text-zinc-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
                    Calculating demand netting & EOQ models...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-4 py-12 text-center text-zinc-400">
                    No product planning records found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr
                    key={prod.productId}
                    onClick={() => setSelectedProduct(prod)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition cursor-pointer group"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                        {prod.productName}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {prod.sku} • {prod.category}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {prod.currentStock.toLocaleString()}
                      <span className="text-[10px] text-zinc-400 ml-1 font-normal">{prod.unit}</span>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono text-zinc-600 dark:text-zinc-300">
                      {prod.avgDailyDemand}/day
                      <div className="text-[10px] text-zinc-400">{prod.avgMonthlyDemand.toLocaleString()}/mo</div>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono text-purple-600 dark:text-purple-400">
                      +{prod.incomingPOQuantity.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                      {prod.netRequirement.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono text-zinc-500">
                      {prod.safetyStock.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono text-amber-600 dark:text-amber-400">
                      {prod.reorderPoint.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {prod.eoq.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {getStatusBadge(prod.status)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono font-bold">
                      {prod.recommendedOrderQuantity > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {prod.recommendedOrderQuantity.toLocaleString()} {prod.unit}
                        </span>
                      ) : (
                        <span className="text-zinc-400">0</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <button className="text-zinc-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Detail Modal / Panel */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedProduct.productName}
                  </h2>
                  {getStatusBadge(selectedProduct.status)}
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  SKU: {selectedProduct.sku} | Unit Price: ₹{selectedProduct.defaultPrice}
                </p>
              </div>

              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-[10px] text-zinc-400 font-semibold uppercase">Current Stock</span>
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-1">
                  {selectedProduct.currentStock.toLocaleString()} {selectedProduct.unit}
                </p>
                <span className="text-[10px] text-purple-500 font-medium">Coverage: {selectedProduct.daysOfSupply} days</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-[10px] text-zinc-400 font-semibold uppercase">Incoming PO</span>
                <p className="text-base font-bold text-purple-600 dark:text-purple-400 font-mono mt-1">
                  +{selectedProduct.incomingPOQuantity.toLocaleString()} {selectedProduct.unit}
                </p>
                <span className="text-[10px] text-purple-500 font-medium">Projected: {selectedProduct.projectedDaysOfSupply} days</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-[10px] text-zinc-400 font-semibold uppercase">Reorder Point</span>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">
                  {selectedProduct.reorderPoint.toLocaleString()} {selectedProduct.unit}
                </p>
                <span className="text-[10px] text-amber-500 font-medium">Lead Time: {selectedProduct.leadTimeDays} days</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-[10px] text-zinc-400 font-semibold uppercase">EOQ Recommended</span>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                  {selectedProduct.eoq.toLocaleString()} {selectedProduct.unit}
                </p>
                <span className="text-[10px] text-emerald-500 font-medium">Economic Batch</span>
              </div>
            </div>

            {/* Recommendation Summary Banner */}
            <div className={`p-4 rounded-2xl border ${
              selectedProduct.status === 'URGENT_REORDER' ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300' :
              selectedProduct.status === 'REORDER_RECOMMENDED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' :
              selectedProduct.status === 'MONITOR' ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300' :
              'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            }`}>
              <div className="flex items-center justify-between font-bold text-sm mb-1">
                <span>System Replenishment Recommendation:</span>
                <span className="font-mono text-base">{selectedProduct.recommendedOrderQuantity > 0 ? `REORDER ${selectedProduct.recommendedOrderQuantity.toLocaleString()} UNITS` : 'NO ACTION NEEDED'}</span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {selectedProduct.reasonText}
              </p>
            </div>

            {/* Demand Trend Recharts Line Chart */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  6-Month Historical Demand Distribution ({selectedProduct.demandTrend})
                </h3>
                <span className="text-[10px] font-mono text-zinc-400">Peak Demand: {selectedProduct.peakDemand.toLocaleString()} {selectedProduct.unit}</span>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedProduct.historicalDemand}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} />
                    <XAxis dataKey="monthName" height={40} stroke="#888" fontSize={11}><Label value="Month" position="insideBottom" offset={-5} fill="#71717a" /></XAxis>
                    <YAxis width={56} stroke="#888" fontSize={11}><Label value={`Demand (${selectedProduct.unit})`} angle={-90} position="insideLeft" fill="#71717a" /></YAxis>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="quantity" name={`Demand (${selectedProduct.unit})`} stroke="#a855f7" strokeWidth={3} dot={{ r: 5, fill: '#a855f7' }}><LabelList dataKey="quantity" position="top" fontSize={9} /></Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stock vs Demand Visual Comparison Bar Chart */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Stock Position Distribution
              </h3>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Current Stock', value: selectedProduct.currentStock, color: '#3b82f6' },
                      { name: 'Incoming PO', value: selectedProduct.incomingPOQuantity, color: '#a855f7' },
                      { name: 'Monthly Demand', value: selectedProduct.avgMonthlyDemand, color: '#a855f7' },
                      { name: 'Safety Stock', value: selectedProduct.safetyStock, color: '#10b981' },
                      { name: 'Reorder Point', value: selectedProduct.reorderPoint, color: '#f59e0b' }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" height={44} stroke="#888" fontSize={11}><Label value="Stock Measure" position="insideBottom" offset={-5} fill="#71717a" /></XAxis>
                    <YAxis width={58} stroke="#888" fontSize={11}><Label value={`Quantity (${selectedProduct.unit})`} angle={-90} position="insideLeft" fill="#71717a" /></YAxis>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', fontSize: '12px' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {[
                        { name: 'Current Stock', color: '#3b82f6' },
                        { name: 'Incoming PO', color: '#a855f7' },
                        { name: 'Monthly Demand', color: '#a855f7' },
                        { name: 'Safety Stock', color: '#10b981' },
                        { name: 'Reorder Point', color: '#f59e0b' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList dataKey="value" position="top" fontSize={9} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Assumptions Footer */}
            <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1.5 font-mono">
              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-purple-500" />
                Planning Engine Parameters
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                <div>Service Level: {selectedProduct.assumptions.serviceLevel} (Z = {selectedProduct.assumptions.zFactor})</div>
                <div>Lead Time: {selectedProduct.assumptions.leadTimeDays} days</div>
                <div>Ordering Cost: {selectedProduct.assumptions.orderingCost}</div>
                <div>Holding Cost: {selectedProduct.assumptions.holdingCost}</div>
                <div>Demand Window: {selectedProduct.assumptions.demandWindowMonths} months</div>
                <div>Annual Demand: {selectedProduct.annualDemand.toLocaleString()} units</div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Planning Assumptions Modal */}
      {showAssumptionsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-500" />
                CogniYard Planning System Assumptions
              </h3>
              <button onClick={() => setShowAssumptionsModal(false)} className="text-zinc-400 hover:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">1. Economic Order Quantity (EOQ) Formula</div>
                <p className="font-mono text-[11px] text-purple-600 dark:text-purple-400">EOQ = √((2 × D × S) / H)</p>
                <p className="mt-1 text-[11px]">Where D = Annual Demand, S = Ordering Cost (₹500), H = Holding Cost per Unit per Year (₹50).</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">2. Safety Stock Formula</div>
                <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">Safety Stock = Z × σ_daily × √Lead Time</p>
                <p className="mt-1 text-[11px]">Where Z = 1.65 (95% Service Level), Lead Time = Supplier Lead Time (default 5 days).</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">3. Demand Netting Formula</div>
                <p className="font-mono text-[11px] text-purple-600 dark:text-purple-400">Net Requirement = max(Gross Demand - Stock - Incoming Open PO, 0)</p>
                <p className="mt-1 text-[11px]">Incoming Open POs subtract already received quantities from Goods Receipts to prevent double-counting.</p>
              </div>
            </div>

            <button
              onClick={() => setShowAssumptionsModal(false)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition"
            >
              Close Assumptions Overview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
