import React, { useState, useEffect, useRef } from "react";
import { logisticsAPI, procurementAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import TruckMap from "../components/TruckMap";
import YardDigitalTwin from "../components/YardDigitalTwin";
import WarehouseGateVision, {
  truckHasPassedGate,
} from "../components/WarehouseGateVision";
import {
  Truck,
  PackageCheck,
  AlertTriangle,
  X,
  Layers,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Building2,
  Sparkles,
  RefreshCw
} from "lucide-react";

export default function LogisticsPage({ mode = 'verification' }) {
  const { showNotification, setIsAiOpen } = useAuth();
  const [trucks, setTrucks] = useState([]);
  const [docks, setDocks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [delayAlert, setDelayAlert] = useState(null);

  // Simulation Controls & Telemetry State
  const isSimulation = mode === "simulation";
  const [activeView, setActiveView] = useState("twin"); // 'map' or 'twin'
  const [simRunning, setSimRunning] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [yardCapacity, setYardCapacity] = useState({ occupied: 4, max: 10 });
  const [eventLogs, setEventLogs] = useState([]);
  const [selectedTruckDetail, setSelectedTruckDetail] = useState(null);

  // Recommendation State
  const [recommendedDock, setRecommendedDock] = useState(null);

  // Receiving Modal State
  const [receivingPo, setReceivingPo] = useState(null);
  const [receivedQty, setReceivedQty] = useState(500);
  const [damagedQty, setDamagedQty] = useState(0);
  const [receivingRemarks, setReceivingRemarks] = useState("");

  // Polling ref for cleanup
  const pollTimerRef = useRef(null);

  const fetchLogisticsData = async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) setLoading(true);
      setLoadError("");
      const [truckRes, dockRes, invRes, poRes, simStateRes] = await Promise.all(
        [
          logisticsAPI.getTrucks(),
          logisticsAPI.getDocks(),
          logisticsAPI.getInventory(),
          procurementAPI
            .getPurchaseOrders()
            .catch(() => ({ data: { purchaseOrders: [] } })),
          logisticsAPI.getSimulationState().catch(() => null),
        ],
      );

      setTrucks(simStateRes?.data?.state?.trucks || truckRes.data.trucks || []);
      setDocks(dockRes.data.docks || []);
      setInventory(invRes.data.inventory || []);
      setPurchaseOrders(poRes.data.purchaseOrders || []);

      if (simStateRes?.data?.state) {
        const s = simStateRes.data.state;
        setSimRunning(s.isRunning);
        setSimSpeed(s.speed);
        if (s.yardCapacity) setYardCapacity(s.yardCapacity);
        if (s.eventLogs) setEventLogs(s.eventLogs);
      }
    } catch (err) {
      console.error("Error fetching logistics data:", err);
      setLoadError(
        err.response?.data?.message ||
          "Yard operations could not be loaded. Check the API connection and try again.",
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogisticsData({ showLoader: true });
  }, []);

  // Real-time polling tick when simulation is active (1.5s interval)
  useEffect(() => {
    if (simRunning) {
      pollTimerRef.current = setInterval(async () => {
        try {
          const [res, invRes] = await Promise.all([
            logisticsAPI.getSimulationState(),
            logisticsAPI.getInventory().catch(() => null),
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
          console.error("Simulation polling error:", e);
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
      showNotification(
        `Started live yard truck simulation (${simSpeed}x speed)`,
        "success",
      );
    } catch (err) {
      showNotification("Error starting simulation", "warning");
    }
  };

  const handlePauseSimulation = async () => {
    try {
      await logisticsAPI.pauseSimulation();
      setSimRunning(false);
      showNotification("Paused yard simulation", "info");
    } catch (err) {
      showNotification("Error pausing simulation", "warning");
    }
  };

  const handleResetSimulation = async () => {
    try {
      const res = await logisticsAPI.resetSimulation();
      setSimRunning(false);
      if (res.data?.state?.trucks) setTrucks(res.data.state.trucks);
      if (res.data?.state?.eventLogs) setEventLogs(res.data.state.eventLogs);
      showNotification("Reset yard simulation to baseline telemetry", "info");
    } catch (err) {
      showNotification("Error resetting simulation", "warning");
    }
  };

  const handleSpeedChange = async (speed) => {
    setSimSpeed(speed);
    try {
      await logisticsAPI.setSimulationSpeed(speed);
      showNotification(`Simulation speed updated to ${speed}x`, "info");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateDelay = async (targetTruckId) => {
    if (submitting) return;
    const targetId =
      targetTruckId || (trucks.length > 0 ? trucks[0].truckId : "TRK-9001");
    try {
      setSubmitting(true);
      const res = await logisticsAPI.simulateDelay(targetId);
      setDelayAlert(
        res.data.alertMessage ||
          `Truck ${targetId} is delayed. Dock planning may require reassignment.`,
      );
      showNotification(
        `Simulated delay for Truck ${targetId} (Status: DELAYED)`,
        "warning",
      );
      fetchLogisticsData();
    } catch (err) {
      showNotification("Error simulating delay", "warning");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGetDockRecommendation = async (truck) => {
    if (!truckHasPassedGate(truck)) {
      showNotification(
        "Complete the live number-plate and driver-ID camera checks first.",
        "warning",
      );
      return;
    }
    try {
      const res = await logisticsAPI.recommendDock(truck.truckId);
      setRecommendedDock(res.data);
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Error calculating dock recommendation",
        "warning",
      );
    }
  };

  const handleAssignDock = async (dockNumber, truckId) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await logisticsAPI.assignDock({ dockNumber, truckId });
      showNotification(
        `Assigned Truck ${truckId} to Dock ${dockNumber}`,
        "success",
      );
      setRecommendedDock(null);
      fetchLogisticsData();
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Error assigning dock",
        "warning",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReleaseDock = async (dockNumber) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await logisticsAPI.releaseDock({ dockNumber });
      showNotification(
        res.data.message || `Released Dock ${dockNumber}`,
        "success",
      );
      fetchLogisticsData();
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Error releasing dock",
        "warning",
      );
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
      showNotification("Received quantity cannot be negative", "warning");
      return;
    }
    if (isNaN(dQty) || dQty < 0) {
      showNotification("Damaged quantity cannot be negative", "warning");
      return;
    }
    if (dQty > rQty) {
      showNotification(
        `Damaged quantity (${dQty}) cannot exceed received quantity (${rQty})`,
        "warning",
      );
      return;
    }
    if (
      !receivingPo.item ||
      !Number.isFinite(Number(receivingPo.ordered)) ||
      Number(receivingPo.ordered) <= 0
    ) {
      showNotification(
        "The selected Purchase Order has no valid item quantity. Refresh and try again.",
        "error",
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await logisticsAPI.processReceiving({
        poNumber: receivingPo.poNumber,
        items: [
          {
            productName: receivingPo.item,
            orderedQuantity: Number(receivingPo.ordered),
            receivedQuantity: rQty,
            damagedQuantity: dQty,
          },
        ],
        remarks: receivingRemarks || "Received and inspected at yard dock",
      });

      const accepted = rQty - dQty;
      showNotification(
        `Created Goods Receipt ${res.data.goodsReceipt.receiptNumber}! Accepted ${accepted} units. PO status: ${res.data.poStatus}`,
        "success",
      );
      if (res.data.trucks) setTrucks(res.data.trucks);
      if (res.data.docks) setDocks(res.data.docks);
      if (res.data.inventory) setInventory(res.data.inventory);
      setReceivingPo(null);
      fetchLogisticsData();
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Error processing receiving",
        "warning",
      );
      setReceivingPo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const calculatedAccepted = Math.max(
    0,
    Number(receivedQty || 0) - Number(damagedQty || 0),
  );
  const availableDocksCount = docks.filter(
    (d) => d.status === "AVAILABLE",
  ).length;
  const delayedTrucksCount = trucks.filter(
    (t) => t.status === "DELAYED",
  ).length;

  const openReceivingForTruck = (truck) => {
    // First check gate verification
    if (!truckHasPassedGate(truck)) {
      showNotification(
        "This truck cannot be received until its number plate and driver ID both match.",
        "warning",
      );
      return;
    }

    // Then check dock assignment
    if (!truck.assignedDock) {
      showNotification(
        "Please first select and assign a dock before receiving goods.",
        "warning",
      );
      return;
    }

    const foundPo = purchaseOrders.find((po) => po.poNumber === truck.poNumber);

    if (!foundPo?.items?.length) {
      showNotification(
        `Purchase Order ${truck.poNumber} could not be loaded.`,
        "error",
      );
      return;
    }

    const item = foundPo.items[0];

    setReceivingPo({
      poNumber: truck.poNumber,
      item: item.productName,
      ordered: item.quantity,
    });

    setReceivedQty(item.quantity);
    setDamagedQty(0);
  };

  if (loading) {
    return (
      <div
        className="mx-auto flex min-h-[55vh] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-purple-600"
            aria-hidden="true"
          />
          Loading yard operations…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div
          className="max-w-xl rounded-lg border border-rose-200 bg-white p-5 dark:border-rose-900/70 dark:bg-zinc-900"
          role="alert"
        >
          <h1 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
            Yard operations unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => fetchLogisticsData({ showLoader: true })}
            className="mt-4 min-h-9 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <header className="border-b border-zinc-200 pb-5 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
            <Truck className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-2xl">
              {isSimulation
                ? "Intelligent Truck Simulation"
                : "Receive Goods & GRN"}
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {isSimulation
                ? "Monitor inbound truck movement, yard capacity, dock allocation and operational delays from one focused workspace."
                : "Verify arriving trucks and drivers before yard entry, then complete receiving against the approved purchase order."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsAiOpen(true)}
            className="group flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-500 group-hover:rotate-12 transition-transform" />
            <span>Ask Copilot</span>
          </button>
          <button
            onClick={() => fetchLogisticsData({ showLoader: true })}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-zinc-100 dark:text-zinc-950 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </button>
        </div>
      </header>

      {!isSimulation && (
        <>
          <WarehouseGateVision
            trucks={trucks}
            docks={docks}
            onUpdated={fetchLogisticsData}
          />

          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-1 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                  Ready for receiving
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Create the GRN only after both gate identity checks pass.
                </p>
              </div>
              <span className="text-xs text-zinc-500">
                {
                  trucks.filter(
                    (truck) =>
                      truck.status !== "COMPLETED" && truckHasPassedGate(truck),
                  ).length
                }{" "}
                verified
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-zinc-50 text-[11px] font-medium text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Truck</th>
                    <th className="px-4 py-3">Purchase order</th>
                    <th className="px-4 py-3">Gate status</th>
                    <th className="px-4 py-3">Dock</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {trucks.filter((truck) => truck.status !== "COMPLETED")
                    .length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-4 py-8 text-center text-zinc-500"
                      >
                        No inbound trucks are waiting for receiving.
                      </td>
                    </tr>
                  ) : (
                    trucks
                      .filter((truck) => truck.status !== "COMPLETED")
                      .map((truck) => {
                        const verified = truckHasPassedGate(truck);
                        return (
                          <tr
                            key={truck._id || truck.truckId}
                            className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30"
                          >
                            <td className="px-4 py-3 font-mono font-semibold text-zinc-950 dark:text-zinc-100">
                              {truck.truckId}
                            </td>
                            <td className="px-4 py-3 font-mono text-zinc-700 dark:text-zinc-300">
                              {truck.poNumber}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-medium ${verified ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${verified ? "bg-emerald-500" : "bg-amber-500"}`}
                                  aria-hidden="true"
                                />
                                {verified
                                  ? "Verified"
                                  : "Verification required"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                              {truck.assignedDock || "Not assigned"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openReceivingForTruck(truck)}
                                disabled={submitting || !verified}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-700 disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                                title={
                                  verified
                                    ? "Receive goods and create the GRN"
                                    : "Complete number-plate and driver-ID verification first"
                                }
                              >
                                <PackageCheck
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                Receive goods
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {isSimulation && (
        <>
          {/* Simulation controls */}
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-4 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                    Simulation controls
                  </h2>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${simRunning ? "bg-emerald-500" : "bg-zinc-400"}`}
                      aria-hidden="true"
                    />
                    {simRunning ? `Running at ${simSpeed}x` : "Paused"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  Change the yard view, simulation speed or operating state.
                  Changes apply immediately.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-950"
                  role="group"
                  aria-label="Yard view"
                >
                  <button
                    type="button"
                    onClick={() => setActiveView("map")}
                    aria-pressed={activeView === "map"}
                    className={`inline-flex min-h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors ${
                      activeView === "map"
                        ? "bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                    Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView("twin")}
                    aria-pressed={activeView === "twin"}
                    className={`inline-flex min-h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors ${
                      activeView === "twin"
                        ? "bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Digital twin
                  </button>
                </div>

                <div
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-950"
                  role="group"
                  aria-label="Simulation speed"
                >
                  <span className="px-2 text-[11px] font-medium text-zinc-500">
                    Speed
                  </span>
                  {[1, 2, 5, 10].map((speed) => (
                    <button
                      type="button"
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      aria-pressed={simSpeed === speed}
                      className={`min-h-8 min-w-8 rounded px-2 text-xs font-semibold tabular-nums transition-colors ${
                        simSpeed === speed
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                          : "text-zinc-500 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                {simRunning ? (
                  <button
                    type="button"
                    onClick={handlePauseSimulation}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                    Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartSimulation}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-purple-600 px-3 text-xs font-medium text-white transition-colors hover:bg-purple-700"
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    Start simulation
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label="Reset simulation"
                  title="Reset simulation"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateDelay(trucks[0]?.truckId)}
                  disabled={submitting || trucks.length === 0}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/70 dark:bg-zinc-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                >
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  Simulate delay
                </button>
              </div>
            </div>

            <dl className="grid grid-cols-2 divide-x divide-y divide-zinc-200 dark:divide-zinc-800 sm:grid-cols-4 sm:divide-y-0">
              <div className="p-4">
                <dt className="text-[11px] font-medium text-zinc-500">
                  Active inbound
                </dt>
                <dd className="mt-1 text-base font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">
                  {
                    trucks.filter((truck) => truck.status !== "COMPLETED")
                      .length
                  }
                </dd>
              </div>
              <div className="p-4">
                <dt className="text-[11px] font-medium text-zinc-500">
                  Yard occupancy
                </dt>
                <dd className="mt-1 text-base font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">
                  {yardCapacity.occupied}/{yardCapacity.max}{" "}
                  <span className="text-xs font-normal text-zinc-500">
                    (
                    {Math.round(
                      (yardCapacity.occupied / Math.max(yardCapacity.max, 1)) *
                        100,
                    )}
                    %)
                  </span>
                </dd>
              </div>
              <div className="p-4">
                <dt className="text-[11px] font-medium text-zinc-500">
                  Available docks
                </dt>
                <dd className="mt-1 text-base font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">
                  {availableDocksCount}/{docks.length || 0}
                </dd>
              </div>
              <div className="p-4">
                <dt className="text-[11px] font-medium text-zinc-500">
                  Delayed trucks
                </dt>
                <dd
                  className={`mt-1 text-base font-semibold tabular-nums ${delayedTrucksCount > 0 ? "text-rose-700 dark:text-rose-300" : "text-zinc-950 dark:text-zinc-100"}`}
                >
                  {delayedTrucksCount}
                </dd>
              </div>
            </dl>
          </section>

          {/* Delay Alert Notification Banner */}
          {delayAlert && (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/25 dark:text-rose-300">
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
                Dismiss
              </button>
            </div>
          )}

          {/* Main Logistics Telemetry Layer (Map View vs Yard Digital Twin) */}
          {activeView === "map" ? (
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
                const dockedTruck = trucks.find(
                  (t) =>
                    t.assignedDock === d.dockNumber ||
                    t.truckId === d.currentTruckId,
                );
                if (dockedTruck) setSelectedTruckDetail(dockedTruck);
              }}
              onRecommendDock={handleGetDockRecommendation}
              onReceiveGoods={(poNum) => {
                const truck = trucks.find((item) => item.poNumber === poNum);
                if (!truck) {
                  showNotification(
                    `The truck for Purchase Order ${poNum} could not be loaded.`,
                    "error",
                  );
                  return;
                }
                openReceivingForTruck(truck);
              }}
              onReleaseDock={handleReleaseDock}
            />
          )}

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.5fr)]">
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                    Activity
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Latest simulation events and operational changes.
                  </p>
                </div>
                <span className="text-xs tabular-nums text-zinc-500">
                  {eventLogs.length} events
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {eventLogs.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      No activity yet
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Start the simulation to generate yard events.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {eventLogs.map((log) => (
                      <li
                        key={log.id}
                        className="flex items-start gap-3 px-4 py-3 text-xs"
                      >
                        <span className="w-16 shrink-0 tabular-nums text-zinc-400">
                          {log.time}
                        </span>
                        <span
                          className={`leading-5 ${
                            log.level === "error"
                              ? "text-rose-700 dark:text-rose-300"
                              : log.level === "success"
                                ? "text-emerald-700 dark:text-emerald-300"
                                : log.level === "warning"
                                  ? "text-amber-700 dark:text-amber-300"
                                  : "text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {log.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                  Dock availability
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Current bay assignments.
                </p>
              </div>
              {docks.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-zinc-500">
                  No dock data is available.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {docks.map((dock) => (
                    <li
                      key={dock._id || dock.dockNumber}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {dock.dockNumber}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                          {dock.currentTruckId
                            ? `Assigned to ${dock.currentTruckId}`
                            : dock.name || "No truck assigned"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                            dock.status === "AVAILABLE"
                              ? "text-emerald-700 dark:text-emerald-300"
                              : dock.status === "MAINTENANCE"
                                ? "text-rose-700 dark:text-rose-300"
                                : "text-zinc-600 dark:text-zinc-300"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${dock.status === "AVAILABLE" ? "bg-emerald-500" : dock.status === "MAINTENANCE" ? "bg-rose-500" : "bg-zinc-400"}`}
                            aria-hidden="true"
                          />
                          {dock.status}
                        </span>
                        {dock.status === "OCCUPIED" && (
                          <button
                            type="button"
                            onClick={() => handleReleaseDock(dock.dockNumber)}
                            disabled={submitting}
                            className="min-h-8 rounded-md border border-zinc-200 px-2.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Release
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-1 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                  Inbound trucks
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Lifecycle status, ETA and yard actions for active vehicles.
                </p>
              </div>
              <span className="text-xs tabular-nums text-zinc-500">
                {trucks.filter((t) => t.status !== "COMPLETED").length} active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-xs">
                <thead className="bg-zinc-50 text-[11px] font-medium text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Truck</th>
                    <th className="px-4 py-3">Purchase order</th>
                    <th className="px-4 py-3">Driver / trailer</th>
                    <th className="px-4 py-3">ETA</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {trucks.filter((t) => t.status !== "COMPLETED").length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-4 py-8 text-center text-zinc-500"
                      >
                        No active inbound trucks.
                      </td>
                    </tr>
                  ) : (
                    trucks
                      .filter((t) => t.status !== "COMPLETED")
                      .map((truck) => (
                        <tr
                          key={truck._id || truck.truckId}
                          onClick={() => setSelectedTruckDetail(truck)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedTruckDetail(truck);
                            }
                          }}
                          tabIndex={0}
                          className="cursor-pointer hover:bg-zinc-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500 dark:hover:bg-zinc-800/30"
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-zinc-950 dark:text-zinc-100">
                            {truck.truckId}
                          </td>
                          <td className="px-4 py-3 font-mono text-zinc-700 dark:text-zinc-300">
                            {truck.poNumber}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              {truck.driverName || "Not available"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-zinc-500">
                              {truck.trailerId || "Trailer not available"}
                            </p>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                            {truck.eta || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                truck.status === "DELAYED"
                                  ? "text-rose-700 dark:text-rose-300"
                                  : truck.status === "UNLOADING"
                                    ? "text-purple-700 dark:text-purple-300"
                                    : "text-zinc-700 dark:text-zinc-300"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${truck.status === "DELAYED" ? "bg-rose-500" : truck.status === "UNLOADING" ? "bg-purple-500" : "bg-zinc-400"}`}
                                aria-hidden="true"
                              />
                              {truck.status}
                            </span>
                          </td>
                          <td className="w-40 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                                aria-hidden="true"
                              >
                                <div
                                  className="h-full rounded-full bg-purple-600 transition-[width] duration-300"
                                  style={{
                                    width: `${Math.max(0, Math.min(100, truck.progress || 0))}%`,
                                  }}
                                />
                              </div>
                              <span className="w-9 text-right tabular-nums text-[11px] text-zinc-500">
                                {truck.progress || 0}%
                              </span>
                            </div>
                          </td>
                          <td
                            className="px-4 py-3 text-right"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSimulateDelay(truck.truckId)
                                }
                                disabled={submitting}
                                className="min-h-8 rounded-md border border-zinc-200 px-2.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                Delay
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleGetDockRecommendation(truck)
                                }
                                disabled={submitting}
                                className="min-h-8 rounded-md border border-zinc-200 px-2.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                Recommend dock
                              </button>
                              <button
                                type="button"
                                onClick={() => openReceivingForTruck(truck)}
                                disabled={
                                  submitting || !truckHasPassedGate(truck)
                                }
                                title={
                                  truckHasPassedGate(truck)
                                    ? "Receive goods and create the GRN"
                                    : "Complete number-plate and driver-ID verification first"
                                }
                                className="min-h-8 rounded-md bg-purple-600 px-2.5 text-[11px] font-medium text-white hover:bg-purple-700 disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                              >
                                Receive goods
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-1 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                  Warehouse inventory
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Stock levels synchronized after goods receiving.
                </p>
              </div>
              <span className="text-xs tabular-nums text-zinc-500">
                {inventory.length} items
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-zinc-50 text-[11px] font-medium text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-right">On hand</th>
                    <th className="px-4 py-3 text-right">Available</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {inventory.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-8 text-center text-zinc-500"
                      >
                        No inventory data is available.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((item) => (
                      <tr
                        key={item._id || item.sku}
                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30"
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-zinc-950 dark:text-zinc-100">
                          {item.sku}
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                          {item.productName}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {item.warehouseLocation || "Not assigned"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                          {Number(item.quantityOnHand || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                          {Number(item.availableQuantity || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                          {item.updatedAt || item.lastUpdated
                            ? new Date(
                                item.updatedAt || item.lastUpdated,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {selectedTruckDetail && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-zinc-950/55"
          role="dialog"
          aria-modal="true"
          aria-labelledby="truck-detail-title"
        >
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <h3
                  id="truck-detail-title"
                  className="text-base font-semibold text-zinc-950 dark:text-zinc-100"
                >
                  {selectedTruckDetail.truckId} details
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Current yard state and assignment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTruckDetail(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Close truck details"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5">
              <dl className="divide-y divide-zinc-200 border-y border-zinc-200 text-xs dark:divide-zinc-800 dark:border-zinc-800">
                {[
                  ["Status", selectedTruckDetail.status || "Not available"],
                  [
                    "Purchase order",
                    selectedTruckDetail.poNumber || "Not available",
                  ],
                  ["Driver", selectedTruckDetail.driverName || "Not available"],
                  ["Trailer", selectedTruckDetail.trailerId || "Not available"],
                  ["ETA", selectedTruckDetail.eta || "Not available"],
                  [
                    "Assigned dock",
                    selectedTruckDetail.assignedDock || "Unassigned",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-5 py-3"
                  >
                    <dt className="text-zinc-500">{label}</dt>
                    <dd className="max-w-[60%] text-right font-medium text-zinc-900 dark:text-zinc-100">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              {selectedTruckDetail.delayReason && (
                <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/25 dark:text-rose-300">
                  <strong className="font-semibold">Delay recorded. </strong>
                  {selectedTruckDetail.delayReason} (+
                  {selectedTruckDetail.delayMinutes || 15} min)
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {recommendedDock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dock-recommendation-title"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <h3
                  id="dock-recommendation-title"
                  className="text-base font-semibold text-zinc-950 dark:text-zinc-100"
                >
                  Dock recommendation
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  For {recommendedDock.truckId} · PO {recommendedDock.poNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecommendedDock(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Close dock recommendation"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5 p-5 text-xs">
              <dl className="grid grid-cols-3 gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
                <div>
                  <dt className="text-zinc-500">ETA</dt>
                  <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                    {recommendedDock.eta || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Priority</dt>
                  <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                    {recommendedDock.priority || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Load</dt>
                  <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                    {recommendedDock.loadType || "—"}
                  </dd>
                </div>
              </dl>

              {recommendedDock.recommendedDock ? (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-zinc-500">Recommended dock</p>
                      <p className="mt-1 text-base font-semibold text-zinc-950 dark:text-zinc-100">
                        {recommendedDock.recommendedDock.dockNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {recommendedDock.recommendedDock.name}
                      </p>
                    </div>
                    <span className="text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-300">
                      Score {recommendedDock.recommendedDock.score}/100
                    </span>
                  </div>

                  {recommendedDock.recommendedDock.rationale?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Why this dock
                      </p>
                      <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                        {recommendedDock.recommendedDock.rationale.map(
                          (reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/25 dark:text-rose-300"
                  role="alert"
                >
                  {recommendedDock.reason || "A dock could not be recommended."}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setRecommendedDock(null)}
                className="min-h-9 rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              {recommendedDock.recommendedDock && (
                <button
                  type="button"
                  onClick={() =>
                    handleAssignDock(
                      recommendedDock.recommendedDock.dockNumber,
                      recommendedDock.truckId,
                    )
                  }
                  disabled={submitting}
                  className="min-h-9 rounded-md bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  Assign {recommendedDock.recommendedDock.dockNumber}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {receivingPo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receiving-dialog-title"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div>
                <h3
                  id="receiving-dialog-title"
                  className="text-base font-semibold text-zinc-950 dark:text-zinc-100"
                >
                  Receive goods and create GRN
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  PO {receivingPo.poNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceivingPo(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Close receiving dialog"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={handleProcessReceiving}
              className="space-y-4 p-5 text-xs"
            >
              <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {receivingPo.item}
                </p>
                <p className="mt-1 text-zinc-500">
                  Ordered quantity:{" "}
                  <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                    {receivingPo.ordered} units
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="received-quantity"
                    className="mb-1.5 block font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Received quantity
                  </label>
                  <input
                    id="received-quantity"
                    type="number"
                    min="0"
                    value={receivedQty}
                    onChange={(e) => setReceivedQty(e.target.value)}
                    className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 font-mono text-zinc-900 focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="damaged-quantity"
                    className="mb-1.5 block font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Damaged / rejected
                  </label>
                  <input
                    id="damaged-quantity"
                    type="number"
                    min="0"
                    value={damagedQty}
                    onChange={(e) => setDamagedQty(e.target.value)}
                    className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 font-mono text-zinc-900 focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300">
                <span>Accepted into inventory</span>
                <strong className="font-mono text-sm tabular-nums">
                  {calculatedAccepted} units
                </strong>
              </div>

              <div>
                <label
                  htmlFor="receiving-remarks"
                  className="mb-1.5 block font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Inspector remarks
                </label>
                <textarea
                  id="receiving-remarks"
                  value={receivingRemarks}
                  onChange={(e) => setReceivingRemarks(e.target.value)}
                  placeholder="Add inspection notes if needed"
                  className="min-h-20 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setReceivingPo(null)}
                  className="min-h-9 rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-9 rounded-md bg-purple-600 px-3 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? "Creating GRN…" : "Create GRN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
