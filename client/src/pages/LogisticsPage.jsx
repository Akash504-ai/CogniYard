import React, { useState, useEffect, useRef } from 'react';
import { logisticsAPI, procurementAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TruckMap from '../components/TruckMap';
import YardDigitalTwin from '../components/YardDigitalTwin';
import { 
  Truck, 
  Boxes, 
  PackageCheck, 
  Zap,
  AlertTriangle,
  LogOut,
  Clock,
  Radio,
  Warehouse,
  FileText,
  X,
  Sparkles,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Activity,
  User,
  Building2,
  ExternalLink
} from 'lucide-react';

export default function LogisticsPage() {
  const { showNotification } = useAuth();
  const [trucks, setTrucks] = useState([]);
  const [docks, setDocks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [delayAlert, setDelayAlert] = useState(null);

  // Simulation Controls & Telemetry State
  const [activeView, setActiveView] = useState('twin'); // 'map' or 'twin'
  const [simRunning, setSimRunning] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [yardCapacity, setYardCapacity] = useState({ occupied: 4, max: 10 });
  const [eventLogs, setEventLogs] = useState([]);
  const [selectedTruckDetail, setSelectedTruckDetail] = useState(null);

  // Recommendation State
  const [recommendedDock, setRecommendedDock] = useState(null);
  const [selectedTruckForRec, setSelectedTruckForRec] = useState(null);

  // Receiving Modal State
  const [receivingPo, setReceivingPo] = useState(null);
  const [receivedQty, setReceivedQty] = useState(500);
  const [damagedQty, setDamagedQty] = useState(0);
  const [receivingRemarks, setReceivingRemarks] = useState('');

  // Polling ref for cleanup
  const pollTimerRef = useRef(null);

  const fetchLogisticsData = async () => {
    try {
      setLoading(true);
      const [truckRes, dockRes, invRes, grRes, poRes, simStateRes] = await Promise.all([
        logisticsAPI.getTrucks(),
        logisticsAPI.getDocks(),
        logisticsAPI.getInventory(),
        logisticsAPI.getGoodsReceipts(),
        procurementAPI.getPurchaseOrders().catch(() => ({ data: { purchaseOrders: [] } })),
        logisticsAPI.getSimulationState().catch(() => null)
      ]);

      setTrucks(simStateRes?.data?.state?.trucks || truckRes.data.trucks || []);
      setDocks(dockRes.data.docks || []);
      setInventory(invRes.data.inventory || []);
      setGoodsReceipts(grRes.data.receipts || []);
      setPurchaseOrders(poRes.data.purchaseOrders || []);

      if (simStateRes?.data?.state) {
        const s = simStateRes.data.state;
        setSimRunning(s.isRunning);
        setSimSpeed(s.speed);
        if (s.yardCapacity) setYardCapacity(s.yardCapacity);
        if (s.eventLogs) setEventLogs(s.eventLogs);
      }
    } catch (err) {
      console.error('Error fetching logistics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogisticsData();
  }, []);

  // Real-time polling tick when simulation is active (1.5s interval)
  useEffect(() => {
    if (simRunning) {
      pollTimerRef.current = setInterval(async () => {
        try {
          const [res, invRes] = await Promise.all([
            logisticsAPI.getSimulationState(),
            logisticsAPI.getInventory().catch(() => null)
          ]);
          if (res.data?.state) {
            const s = res.data.state;
            setTrucks(s.trucks || []);
            setSimRunning(s.isRunning);
            setSimSpeed(s.speed);
            if (s.yardCapacity) setYardCapacity(s.yardCapacity);
            if (s.eventLogs) setEventLogs(s.eventLogs);
          }
          if (invRes?.data?.inventory) {
            setInventory(invRes.data.inventory);
          }
        } catch (e) {
          console.error('Simulation polling error:', e);
        }
      }, 1500);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [simRunning]);

  // Simulation Controls
  const handleStartSimulation = async () => {
    try {
      const res = await logisticsAPI.startSimulation(simSpeed);
      setSimRunning(true);
      if (res.data?.state?.trucks) setTrucks(res.data.state.trucks);
      showNotification(`Started live yard truck simulation (${simSpeed}x speed)`, 'success');
    } catch (err) {
      showNotification('Error starting simulation', 'warning');
    }
  };

  const handlePauseSimulation = async () => {
    try {
      await logisticsAPI.pauseSimulation();
      setSimRunning(false);
      showNotification('Paused yard simulation', 'info');
    } catch (err) {
      showNotification('Error pausing simulation', 'warning');
    }
  };

  const handleResetSimulation = async () => {
    try {
      const res = await logisticsAPI.resetSimulation();
      setSimRunning(false);
      if (res.data?.state?.trucks) setTrucks(res.data.state.trucks);
      if (res.data?.state?.eventLogs) setEventLogs(res.data.state.eventLogs);
      showNotification('Reset yard simulation to baseline telemetry', 'info');
    } catch (err) {
      showNotification('Error resetting simulation', 'warning');
    }
  };

  const handleSpeedChange = async (speed) => {
    setSimSpeed(speed);
    try {
      await logisticsAPI.setSimulationSpeed(speed);
      showNotification(`Simulation speed updated to ${speed}x`, 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateDelay = async (targetTruckId) => {
    if (submitting) return;
    const targetId = targetTruckId || (trucks.length > 0 ? trucks[0].truckId : 'TRK-9001');
    try {
      setSubmitting(true);
      const res = await logisticsAPI.simulateDelay(targetId);
      setDelayAlert(res.data.alertMessage || `⚠️ Truck ${targetId} delayed. Dock planning may require reassignment.`);
      showNotification(`Simulated delay for Truck ${targetId} (Status: DELAYED)`, 'warning');
      fetchLogisticsData();
    } catch (err) {
      showNotification('Error simulating delay', 'warning');
    } finally {
      setSubmitting(false);
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
    if (submitting) return;
    try {
      setSubmitting(true);
      await logisticsAPI.assignDock({ dockNumber, truckId });
      showNotification(`Assigned Truck ${truckId} to Dock ${dockNumber}`, 'success');
      setRecommendedDock(null);
      fetchLogisticsData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error assigning dock', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReleaseDock = async (dockNumber) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await logisticsAPI.releaseDock({ dockNumber });
      showNotification(res.data.message || `Released Dock ${dockNumber}`, 'success');
      fetchLogisticsData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error releasing dock', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessReceiving = async (e) => {
    e.preventDefault();
    if (!receivingPo || submitting) return;

    const rQty = Number(receivedQty);
    const dQty = Number(damagedQty);

    if (isNaN(rQty) || rQty < 0) {
      showNotification('Received quantity cannot be negative', 'warning');
      return;
    }
    if (isNaN(dQty) || dQty < 0) {
      showNotification('Damaged quantity cannot be negative', 'warning');
      return;
    }
    if (dQty > rQty) {
      showNotification(`Damaged quantity (${dQty}) cannot exceed received quantity (${rQty})`, 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await logisticsAPI.processReceiving({
        poNumber: receivingPo.poNumber,
        items: [{
          productName: receivingPo.item || 'Safety Helmet - High Visibility Yellow',
          orderedQuantity: receivingPo.ordered || 500,
          receivedQuantity: rQty,
          damagedQuantity: dQty
        }],
        remarks: receivingRemarks || 'Received and inspected at yard dock'
      });

      const accepted = rQty - dQty;
      showNotification(`Created Goods Receipt ${res.data.goodsReceipt.receiptNumber}! Accepted ${accepted} units. PO status: ${res.data.poStatus}`, 'success');
      if (res.data.trucks) setTrucks(res.data.trucks);
      if (res.data.docks) setDocks(res.data.docks);
      if (res.data.inventory) setInventory(res.data.inventory);
      if (res.data.receipts) setGoodsReceipts(res.data.receipts);
      setReceivingPo(null);
      fetchLogisticsData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error processing receiving', 'warning');
      setReceivingPo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const calculatedAccepted = Math.max(0, Number(receivedQty || 0) - Number(damagedQty || 0));
  const availableDocksCount = docks.filter(d => d.status === 'AVAILABLE').length;
  const delayedTrucksCount = trucks.filter(t => t.status === 'DELAYED').length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      
      {/* Top Banner & Simulation Control Deck Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
                <Truck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <span>Intelligent Yard Truck Simulation</span>
                <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-semibold border ${
                  simRunning
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${simRunning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                  {simRunning ? `● LIVE SIMULATION (${simSpeed}x)` : '● PAUSED'}
                </span>
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
              Real-time route interpolation, state machine progression (`IN_TRANSIT` $\rightarrow$ `AT_GATE` $\rightarrow$ `IN_YARD` $\rightarrow$ `AT_DOCK`), dynamic ETAs, and dock allocation logic.
            </p>
          </div>

          {/* VIEW SWITCHER & SIMULATION CONTROLS DECK */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle Pill */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
              <button
                onClick={() => setActiveView('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'map'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>🗺 Map View</span>
              </button>
              <button
                onClick={() => setActiveView('twin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'twin'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>🏢 Yard Digital Twin</span>
              </button>
            </div>

            {/* Speed Multiplier Buttons */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
              {[1, 2, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    simSpeed === s
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Simulation Controls */}
            {simRunning ? (
              <button
                onClick={handlePauseSimulation}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-amber-500" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={handleStartSimulation}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Simulation</span>
              </button>
            )}

            <button
              onClick={handleResetSimulation}
              className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer"
              title="Reset Simulation Baseline"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSimulateDelay(trucks[0]?.truckId)}
              disabled={submitting}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Simulate Delay</span>
            </button>
          </div>
        </div>

        {/* Quick Operations Telemetry Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Active Inbound Fleet</span>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">{trucks.filter(t => t.status !== 'COMPLETED').length} Active</div>
          </div>

          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Yard Capacity</span>
            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
              {yardCapacity.occupied} / {yardCapacity.max} Trucks ({Math.round((yardCapacity.occupied / yardCapacity.max) * 100)}%)
            </div>
          </div>

          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Available Docks</span>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{availableDocksCount} / {docks.length} Open</div>
          </div>

          <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/60 p-3 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Delayed Trucks</span>
            <div className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5">{delayedTrucksCount} Delayed</div>
          </div>
        </div>
      </div>

      {/* Delay Alert Notification Banner */}
      {delayAlert && (
        <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span>{delayAlert}</span>
          </div>
          <button
            onClick={() => setDelayAlert(null)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900 text-[11px] font-medium hover:opacity-80 transition-opacity cursor-pointer shadow-2xs"
          >
            Dismiss Alert
          </button>
        </div>
      )}

      {/* Main Logistics Telemetry Layer (Map View vs Yard Digital Twin) */}
      {activeView === 'map' ? (
        <TruckMap
          trucks={trucks}
          isRunning={simRunning}
          speed={simSpeed}
          onSimulateStep={handleStartSimulation}
          onSelectTruck={(t) => setSelectedTruckDetail(t)}
        />
      ) : (
        <YardDigitalTwin
          trucks={trucks}
          docks={docks}
          simRunning={simRunning}
          simSpeed={simSpeed}
          yardCapacity={yardCapacity}
          eventLogs={eventLogs}
          onSelectTruck={(t) => setSelectedTruckDetail(t)}
          onSelectDock={(d) => {
            const dockedTruck = trucks.find(t => t.assignedDock === d.dockNumber || t.truckId === d.currentTruckId);
            if (dockedTruck) setSelectedTruckDetail(dockedTruck);
          }}
          onRecommendDock={handleGetDockRecommendation}
          onReceiveGoods={(poNum) => {
            const foundPo = purchaseOrders.find(p => p.poNumber === poNum);
            const itemName = foundPo?.items?.[0]?.productName || 'Safety Helmet - High Visibility Yellow';
            const itemQty = foundPo?.items?.[0]?.quantity || 500;
            setReceivingPo({ poNumber: poNum, item: itemName, ordered: itemQty });
            setReceivedQty(itemQty);
            setDamagedQty(0);
          }}
          onReleaseDock={handleReleaseDock}
        />
      )}

      {/* Live Event Stream & Yard Capacity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Event Feed (2 Cols) */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Live Simulation Event Stream
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">{eventLogs.length} Events Logged</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {eventLogs.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-6 font-mono">No simulation events recorded yet. Click ▶ Start Simulation to begin.</p>
            ) : (
              eventLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 text-xs font-mono p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/50 dark:border-zinc-800/50">
                  <span className="text-zinc-400 shrink-0">{log.time}</span>
                  <span className={`leading-snug ${
                    log.level === 'error' ? 'text-rose-600 dark:text-rose-400 font-bold' :
                    log.level === 'success' ? 'text-emerald-600 dark:text-emerald-400 font-bold' :
                    log.level === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                    'text-zinc-800 dark:text-zinc-200'
                  }`}>
                    {log.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Yard Capacity Gauge (1 Col) */}
        <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
            <Gauge className="w-4 h-4 text-purple-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Yard Slot Capacity Gauge
            </h3>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end text-xs font-mono">
              <span className="text-zinc-400">Current Occupancy:</span>
              <strong className="text-base font-bold text-zinc-900 dark:text-zinc-100">{yardCapacity.occupied} / {yardCapacity.max} Slots</strong>
            </div>

            {/* Custom Bar Gauge */}
            <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  (yardCapacity.occupied / yardCapacity.max) > 0.8 ? 'bg-rose-500' :
                  (yardCapacity.occupied / yardCapacity.max) > 0.5 ? 'bg-amber-500' :
                  'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (yardCapacity.occupied / yardCapacity.max) * 100)}%` }}
              />
            </div>

            <p className="text-[11px] text-zinc-400 font-mono mt-1">
              {(yardCapacity.occupied / yardCapacity.max) > 0.8 ? '⚠️ High yard congestion. Gate entry throttled.' : '🟢 Yard throughput optimal. Gates operating cleanly.'}
            </p>
          </div>
        </div>

      </div>

      {/* Dock Allocation Bay Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Active Yard Dock Bays
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">Automated Gate Assignment Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {docks.map((dock) => (
            <div
              key={dock._id}
              className={`relative p-5 rounded-2xl border transition-all bg-white dark:bg-zinc-900/60 backdrop-blur-xl flex flex-col justify-between space-y-4 shadow-sm ${
                dock.status === 'AVAILABLE'
                  ? 'border-emerald-500/30 hover:border-emerald-500/60'
                  : dock.status === 'OCCUPIED'
                  ? 'border-indigo-500/30 hover:border-indigo-500/60'
                  : 'border-zinc-200 dark:border-zinc-800 opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    {dock.dockNumber}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    dock.status === 'AVAILABLE' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60' :
                    dock.status === 'OCCUPIED' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/60' :
                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dock.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                    {dock.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{dock.name}</p>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    Target Truck: <strong className="text-zinc-900 dark:text-zinc-200">{dock.currentTruckId || 'None'}</strong>
                  </p>
                </div>
              </div>

              {dock.status === 'OCCUPIED' && (
                <button
                  onClick={() => handleReleaseDock(dock.dockNumber)}
                  disabled={submitting}
                  className="w-full py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Release Dock Bay</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active Inbound Truck Queue Table with Lifecycle Progress Bar */}
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Active Truck Manifest & Lifecycle Progress
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">Real-time GPS & State Sync</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200/80 dark:border-zinc-800/80 font-medium">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Truck ID</th>
                <th className="py-3.5 px-4 font-semibold">PO Reference</th>
                <th className="py-3.5 px-4 font-semibold">Trailer & Driver</th>
                <th className="py-3.5 px-4 font-semibold">Simulated ETA</th>
                <th className="py-3.5 px-4 font-semibold">Status Stage</th>
                <th className="py-3.5 px-4 font-semibold">Lifecycle Progress</th>
                <th className="py-3.5 px-4 font-semibold text-right">Yard Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300 font-medium">
              {trucks.filter(t => t.status !== 'COMPLETED').length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-xs text-zinc-400 font-mono">
                    🟢 All inbound trucks have completed unloading, goods receiving, and dock release.
                  </td>
                </tr>
              ) : (
                trucks.filter(t => t.status !== 'COMPLETED').map((truck) => (
                <tr
                  key={truck._id || truck.truckId}
                  onClick={() => setSelectedTruckDetail(truck)}
                  className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {truck.truckId}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-zinc-800 dark:text-zinc-200">{truck.poNumber}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{truck.trailerId}</div>
                    <div className="text-[10px] text-zinc-400">{truck.driverName}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-amber-600 dark:text-amber-400">{truck.eta}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      truck.status === 'DELAYED' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60' :
                      truck.status === 'UNLOADING' ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200/60 dark:border-purple-800/60' :
                      truck.status === 'COMPLETED' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60' :
                      'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60'
                    }`}>
                      {truck.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 w-40">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-zinc-400">Progress</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{truck.progress || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${truck.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleSimulateDelay(truck.truckId)}
                      disabled={submitting}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-200/60 dark:border-amber-900/40 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Delay
                    </button>
                    <button
                      onClick={() => handleGetDockRecommendation(truck)}
                      disabled={submitting}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Recommend Dock
                    </button>
                    <button
                      onClick={() => {
                        const foundPo = purchaseOrders.find(p => p.poNumber === truck.poNumber);
                        const itemName = foundPo?.items?.[0]?.productName || (truck.poNumber === 'PO-1002' ? 'Heavy-Duty Cut Resistant Gloves (Pair)' : 'Safety Helmet - High Visibility Yellow');
                        const itemQty = foundPo?.items?.[0]?.quantity || 500;
                        setReceivingPo({ poNumber: truck.poNumber, item: itemName, ordered: itemQty });
                        setReceivedQty(itemQty);
                        setDamagedQty(0);
                      }}
                      disabled={submitting}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Receive Goods</span>
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Synchronized Warehouse Inventory Stock Table */}
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Synchronized Warehouse Inventory Stock
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">ERP Live Connect</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-200/80 dark:border-zinc-800/80 font-medium">
              <tr>
                <th className="py-3.5 px-4 font-semibold">SKU Identifier</th>
                <th className="py-3.5 px-4 font-semibold">Product Description</th>
                <th className="py-3.5 px-4 font-semibold">Warehouse Bay</th>
                <th className="py-3.5 px-4 font-semibold">Stock On Hand</th>
                <th className="py-3.5 px-4 font-semibold">Available Stock</th>
                <th className="py-3.5 px-4 font-semibold">Telemetry Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-800 dark:text-zinc-300">
              {inventory.map((item) => (
                <tr key={item._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">{item.sku}</td>
                  <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-200">{item.productName}</td>
                  <td className="py-3.5 px-4 text-zinc-500 font-mono">{item.warehouseLocation || 'Aisle A-01'}</td>
                  <td className="py-3.5 px-4 font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {item.quantityOnHand.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                    {item.availableQuantity.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                    {new Date(item.updatedAt || item.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Truck Detail Slide-Over Drawer */}
      {selectedTruckDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 w-full max-w-md h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                  {selectedTruckDetail.truckId} Telemetry
                </h3>
              </div>
              <button
                onClick={() => setSelectedTruckDetail(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-mono">Status Stage</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedTruckDetail.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-mono">PO Reference</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">{selectedTruckDetail.poNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-mono">Driver</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedTruckDetail.driverName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-mono">Trailer ID</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">{selectedTruckDetail.trailerId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-mono">Simulated ETA</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{selectedTruckDetail.eta}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-mono">Assigned Dock</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{selectedTruckDetail.assignedDock || 'Unassigned'}</span>
                </div>
              </div>

              {selectedTruckDetail.delayReason && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-mono">
                  <strong className="block mb-0.5">⚠️ Delay Anomaly Recorded:</strong>
                  {selectedTruckDetail.delayReason} (+{selectedTruckDetail.delayMinutes || 15} min)
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedTruckDetail(null)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
            >
              Close Telemetry Drawer
            </button>
          </div>
        </div>
      )}

      {/* Dock Recommendation Modal */}
      {recommendedDock && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Explainable Dock Allocation</h3>
              </div>
              <button
                onClick={() => setRecommendedDock(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center justify-between font-mono">
                <span className="text-zinc-400">Target Vehicle:</span>
                <strong className="text-zinc-900 dark:text-zinc-100">{recommendedDock.truckId} ({recommendedDock.poNumber})</strong>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-[9px] uppercase text-zinc-400 block font-semibold">ETA</span>
                  <strong>{recommendedDock.eta}</strong>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-[9px] uppercase text-zinc-400 block font-semibold">Priority</span>
                  <strong className="text-indigo-600 dark:text-indigo-400">{recommendedDock.priority}</strong>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-[9px] uppercase text-zinc-400 block font-semibold">Load</span>
                  <strong>{recommendedDock.loadType}</strong>
                </div>
              </div>

              {recommendedDock.recommendedDock ? (
                <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/80 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Recommended Bay</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      Allocation Score: {recommendedDock.recommendedDock.score}/100
                    </span>
                  </div>

                  <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {recommendedDock.recommendedDock.dockNumber} — {recommendedDock.recommendedDock.name}
                  </div>

                  {recommendedDock.recommendedDock.rationale && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-zinc-400 block font-semibold">Allocation Logic:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {recommendedDock.recommendedDock.rationale.map((reason, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200/60 dark:border-emerald-800/60">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-rose-600 dark:text-rose-400 font-medium mt-2">{recommendedDock.reason}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRecommendedDock(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition-all cursor-pointer text-xs"
              >
                Dismiss
              </button>
              {recommendedDock.recommendedDock && (
                <button
                  onClick={() => handleAssignDock(recommendedDock.recommendedDock.dockNumber, recommendedDock.truckId)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Confirm Bay {recommendedDock.recommendedDock.dockNumber}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Goods Receiving Modal */}
      {receivingPo && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Dockside Goods Inward (GRN)</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">Reference: {receivingPo.poNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setReceivingPo(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProcessReceiving} className="space-y-4 text-xs">
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl space-y-1 text-zinc-700 dark:text-zinc-300">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">Item: {receivingPo.item}</div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  Ordered Quantity: <strong className="text-zinc-800 dark:text-zinc-200">{receivingPo.ordered} units</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">Received Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={receivedQty}
                    onChange={(e) => setReceivedQty(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 font-mono text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">Damaged / Rejected</label>
                  <input
                    type="number"
                    min="0"
                    value={damagedQty}
                    onChange={(e) => setDamagedQty(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 font-mono text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Calculated Accepted Summary Pill */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
                <span>Net Accepted Inventory:</span>
                <span className="font-mono text-sm font-bold">{calculatedAccepted} units</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Inspector Remarks</label>
                <textarea
                  value={receivingRemarks}
                  onChange={(e) => setReceivingRemarks(e.target.value)}
                  placeholder="e.g. Inspected at dock bay 2. Certified intact."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReceivingPo(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold transition-all cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Generate GRN & Sync Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}