import React, { useState, useEffect } from 'react';
import { logisticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TruckMap from '../components/TruckMap';
import { 
  Truck, 
  Boxes, 
  PackageCheck, 
  Zap
} from 'lucide-react';

export default function LogisticsPage() {
  const { showNotification } = useAuth();
  const [trucks, setTrucks] = useState([]);
  const [docks, setDocks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Recommendation State
  const [recommendedDock, setRecommendedDock] = useState(null);
  const [selectedTruckForRec, setSelectedTruckForRec] = useState(null);

  // Receiving Modal State
  const [receivingPo, setReceivingPo] = useState(null);
  const [receivedQty, setReceivedQty] = useState(500);
  const [damagedQty, setDamagedQty] = useState(0);
  const [receivingRemarks, setReceivingRemarks] = useState('');

  useEffect(() => {
    fetchLogisticsData();
  }, []);

  const fetchLogisticsData = async () => {
    try {
      setLoading(true);
      const [truckRes, dockRes, invRes, grRes] = await Promise.all([
        logisticsAPI.getTrucks(),
        logisticsAPI.getDocks(),
        logisticsAPI.getInventory(),
        logisticsAPI.getGoodsReceipts()
      ]);
      setTrucks(truckRes.data.trucks || []);
      setDocks(dockRes.data.docks || []);
      setInventory(invRes.data.inventory || []);
      setGoodsReceipts(grRes.data.receipts || []);
    } catch (err) {
      console.error('Error fetching logistics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateMovement = async () => {
    try {
      const res = await logisticsAPI.simulateMovement();
      setTrucks(res.data.trucks || []);
      showNotification('Simulated live truck movement towards CogniYard Hub', 'info');
    } catch (err) {
      showNotification('Error simulating movement', 'warning');
    }
  };

  const handleGetDockRecommendation = async (truck) => {
    setSelectedTruckForRec(truck);
    try {
      const res = await logisticsAPI.recommendDock(truck.truckId);
      setRecommendedDock(res.data);
    } catch (err) {
      showNotification('Error calculating dock recommendation', 'warning');
    }
  };

  const handleAssignDock = async (dockNumber, truckId) => {
    try {
      await logisticsAPI.assignDock({ dockNumber, truckId });
      showNotification(`Assigned Truck ${truckId} to Dock ${dockNumber}`, 'success');
      setRecommendedDock(null);
      fetchLogisticsData();
    } catch (err) {
      showNotification('Error assigning dock', 'warning');
    }
  };

  const handleProcessReceiving = async (e) => {
    e.preventDefault();
    if (!receivingPo) return;

    try {
      const res = await logisticsAPI.processReceiving({
        poNumber: receivingPo.poNumber,
        items: [{
          productName: receivingPo.item || 'Safety Helmet - High Visibility Yellow',
          orderedQuantity: receivingPo.ordered || 500,
          receivedQuantity: Number(receivedQty),
          damagedQuantity: Number(damagedQty)
        }],
        remarks: receivingRemarks || 'Received and inspected at yard dock'
      });

      showNotification(`Created Goods Receipt ${res.data.goodsReceipt.receiptNumber} & updated inventory!`, 'success');
      setReceivingPo(null);
      fetchLogisticsData();
    } catch (err) {
      showNotification('Error processing receiving', 'warning');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl transition-colors">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 tracking-tight">
            <Truck className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <span>Where's My Truck? — Yard & Dock Operations (E2)</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Real-time Leaflet tracking, AI dock allocation, and goods receiving.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateMovement}
            className="flex items-center gap-2 text-xs px-3.5 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Simulate Live Movement</span>
          </button>
        </div>
      </div>

      {/* Live Leaflet Map */}
      <TruckMap trucks={trucks} onSimulateStep={handleSimulateMovement} />

      {/* Dock Management Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          <Boxes className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span>Yard Dock Management</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {docks.map((dock) => (
            <div
              key={dock._id}
              className={`p-4 rounded-xl border transition-all bg-white dark:bg-zinc-900/50 ${
                dock.status === 'AVAILABLE' ? 'border-emerald-500/30' :
                dock.status === 'OCCUPIED' ? 'border-purple-500/30' :
                'border-zinc-200 dark:border-zinc-800 opacity-60'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs font-mono">{dock.dockNumber}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                  dock.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                  dock.status === 'OCCUPIED' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                  'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                }`}>
                  {dock.status}
                </span>
              </div>
              <p className="text-xs text-zinc-800 dark:text-zinc-300 font-medium">{dock.name}</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Truck: <strong className="text-zinc-900 dark:text-zinc-200">{dock.currentTruckId || 'None'}</strong>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Trucks Table */}
      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Active Truck Queue & Receiving Controls</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:border-zinc-800 font-medium">
              <tr>
                <th className="p-3.5">Truck ID</th>
                <th className="p-3.5">PO Ref</th>
                <th className="p-3.5">Trailer / Driver</th>
                <th className="p-3.5">ETA</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Assigned Dock</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-300">
              {trucks.map((truck) => (
                <tr key={truck._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="p-3.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{truck.truckId}</td>
                  <td className="p-3.5 font-mono text-zinc-900 dark:text-zinc-200 font-medium">{truck.poNumber}</td>
                  <td className="p-3.5">
                    <div>{truck.trailerId}</div>
                    <div className="text-[10px] text-zinc-500">{truck.driverName}</div>
                  </td>
                  <td className="p-3.5 font-medium text-amber-600 dark:text-amber-400">{truck.eta}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      truck.status === 'DELAYED' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' :
                      truck.status === 'UNLOADING' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                      truck.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                      {truck.status}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-zinc-700 dark:text-zinc-300">{truck.assignedDock || 'Unassigned'}</td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleGetDockRecommendation(truck)}
                      className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-[11px] border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
                    >
                      Dock Recommend
                    </button>
                    <button
                      onClick={() => setReceivingPo({ poNumber: truck.poNumber, item: 'Safety Helmet - High Visibility Yellow', ordered: 500 })}
                      className="px-2.5 py-1 rounded bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold text-[11px] shadow-sm transition-all inline-flex items-center gap-1 cursor-pointer"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Receive Goods</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dock Recommendation Modal */}
      {recommendedDock && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 rounded-xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <span>Smart Dock Recommendation</span>
            </h3>

            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="text-zinc-900 dark:text-zinc-200 font-semibold">Truck: {recommendedDock.truckId} ({recommendedDock.poNumber})</div>
              <div>ETA: <strong>{recommendedDock.eta}</strong> | Priority: <strong>{recommendedDock.priority}</strong></div>

              {recommendedDock.recommendedDock ? (
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Recommended Bay</span>
                  <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {recommendedDock.recommendedDock.dockNumber} — {recommendedDock.recommendedDock.name}
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">{recommendedDock.reason}</p>
                </div>
              ) : (
                <p className="text-rose-600 dark:text-rose-400 font-medium">{recommendedDock.reason}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRecommendedDock(null)}
                className="px-3.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
              >
                Close
              </button>
              {recommendedDock.recommendedDock && (
                <button
                  onClick={() => handleAssignDock(recommendedDock.recommendedDock.dockNumber, recommendedDock.truckId)}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 font-semibold text-xs shadow-sm hover:bg-zinc-800 dark:hover:bg-white cursor-pointer"
                >
                  Assign to {recommendedDock.recommendedDock.dockNumber}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Goods Receipt Modal */}
      {receivingPo && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 rounded-xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Process Warehouse Receiving</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Enter received & damaged quantities for {receivingPo.poNumber}</p>

            <form onSubmit={handleProcessReceiving} className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-1 text-zinc-700 dark:text-zinc-300">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">Item: {receivingPo.item}</div>
                <div>Ordered Quantity: <strong className="text-zinc-900 dark:text-zinc-200">{receivingPo.ordered}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Received Quantity</label>
                  <input
                    type="number"
                    value={receivedQty}
                    onChange={(e) => setReceivedQty(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Damaged Quantity</label>
                  <input
                    type="number"
                    value={damagedQty}
                    onChange={(e) => setDamagedQty(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 mb-1">Inspection Remarks</label>
                <textarea
                  value={receivingRemarks}
                  onChange={(e) => setReceivingRemarks(e.target.value)}
                  placeholder="e.g. 50 units short shipment from supplier"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500 h-16"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReceivingPo(null)}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 font-semibold text-xs shadow-sm hover:bg-zinc-800 dark:hover:bg-white cursor-pointer"
                >
                  Create Goods Receipt & Sync Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
