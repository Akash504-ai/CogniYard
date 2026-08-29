import { PaperSheet } from "../components/layout/PaperSheet";
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
  RefreshCw,
  MapPin,
  Route,
  Activity,
  CheckCircle2,
  Clock,
  Gauge,
  Boxes,
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

  // Simulation controls & Telemetry State
  const isSimulation = mode === "simulation";
  const [activeView, setActiveView] = useState(mode === "simulation" ? "map" : "twin");
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
    const verifiedSupplier = foundPo.supplierName || truck.supplierName || 'Verified Supplier';
    const verifiedVendorCode = foundPo.supplier?.code || truck.vendorCode || 'SUP-1001';

    setReceivingPo({
      poNumber: truck.poNumber,
      supplierName: verifiedSupplier,
      vendorCode: verifiedVendorCode,
      truckId: truck.truckId,
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
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 max-w-[1680px] mx-auto min-h-screen">

      {/* =========================================================
        TOP HEADER + KPI STRIP
    ========================================================= */}

      <PaperSheet
        variant="default"
        className="p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          <div className="space-y-1">
            <div className="flex items-center gap-2">

              <div className="p-1.5 rounded-xs bg-[#EDE9FE] dark:bg-[#281E3B] text-[#7C3AED]">
                <Truck className="w-4 h-4" />
              </div>

              <h2 className="font-handwriting text-2xl sm:text-3xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                {isSimulation
                  ? "Intelligent Yard Simulation"
                  : "Receiving & Yard Operations"}
              </h2>

            </div>

            <p className="text-xs text-[#68716D] dark:text-[#8E9C97] font-sans">
              {isSimulation
                ? "Monitor inbound truck movement, yard capacity, dock allocation and operational delays."
                : "Verify inbound vehicles, assign docks and complete goods receiving against approved purchase orders."}
            </p>
          </div>

          <div className="flex items-center gap-2.5">

            <button
              type="button"
              onClick={() => setIsAiOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xs bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] text-xs font-sans text-[#1C201E] dark:text-[#F5F7F6] hover:border-[#7C3AED] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Ask Copilot</span>
            </button>

            <button
              type="button"
              onClick={() => fetchLogisticsData({ showLoader: true })}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xs bg-[#15803D] text-white text-xs font-sans font-bold hover:bg-[#166534] transition-colors shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Data</span>
            </button>

          </div>
        </div>

        {/* KPI STRIP */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E3DDD1] dark:border-[#2B3835]">

          <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835]">
            <span className="text-[10px] font-mono text-[#68716D] uppercase">
              Active Inbound
            </span>

            <div className="mt-1 flex items-center justify-between">
              <span className="text-base font-bold font-mono text-[#1C201E] dark:text-[#F5F7F6]">
                {
                  trucks.filter(
                    (truck) => truck.status !== "COMPLETED"
                  ).length
                }
              </span>

              <Truck className="w-4 h-4 text-[#15803D]" />
            </div>
          </div>

          <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835]">
            <span className="text-[10px] font-mono text-[#68716D] uppercase">
              Yard Occupancy
            </span>

            <div className="mt-1 flex items-center justify-between">
              <span className="text-base font-bold font-mono text-[#1C201E] dark:text-[#F5F7F6]">
                {yardCapacity.occupied}/{yardCapacity.max}
              </span>

              <span className="text-[10px] font-mono text-[#68716D]">
                {Math.round(
                  (yardCapacity.occupied /
                    Math.max(yardCapacity.max, 1)) *
                  100
                )}%
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835]">
            <span className="text-[10px] font-mono text-[#68716D] uppercase">
              Available Docks
            </span>

            <div className="mt-1 flex items-center justify-between">
              <span className="text-base font-bold font-mono text-[#15803D]">
                {availableDocksCount}
                <span className="text-xs text-[#8A938F]">
                  /{docks.length}
                </span>
              </span>

              <MapPin className="w-4 h-4 text-[#15803D]" />
            </div>
          </div>

          <div className="p-3 rounded-xs bg-[#F4EFE6] dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835]">
            <span className="text-[10px] font-mono text-[#D97706] uppercase">
              Delayed Trucks
            </span>

            <div className="mt-1 flex items-center justify-between">
              <span
                className={`text-base font-bold font-mono ${delayedTrucksCount > 0
                  ? "text-[#DC2626]"
                  : "text-[#15803D]"
                  }`}
              >
                {delayedTrucksCount}
              </span>

              <AlertTriangle
                className={`w-4 h-4 ${delayedTrucksCount > 0
                  ? "text-[#DC2626]"
                  : "text-[#15803D]"
                  }`}
              />
            </div>
          </div>

        </div>
      </PaperSheet>


      {/* =========================================================
        MODE NAVIGATION
    ========================================================= */}

      <div className="flex flex-wrap items-center gap-1 p-1 rounded-xs bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] w-fit">

        <button
          type="button"
          onClick={() => {
            if (isSimulation) {
              setActiveView("twin");
            }
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xs bg-[#15803D] text-white shadow-xs text-xs font-mono font-semibold"
        >
          <Truck className="w-3.5 h-3.5" />

          <span>
            {isSimulation
              ? "Yard Simulation"
              : "Goods Receiving"}
          </span>
        </button>

        {isSimulation && (
          <>
            <button
              type="button"
              onClick={() => setActiveView("map")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xs text-xs font-mono font-semibold transition-all ${activeView === "map"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "text-[#68716D] hover:text-[#1C201E]"
                }`}
            >
              <Route className="w-3.5 h-3.5" />
              Map
            </button>

            <button
              type="button"
              onClick={() => setActiveView("twin")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xs text-xs font-mono font-semibold transition-all ${activeView === "twin"
                ? "bg-[#7C3AED] text-white shadow-xs"
                : "text-[#68716D] hover:text-[#1C201E]"
                }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Digital Twin
            </button>
          </>
        )}

      </div>


      {/* =========================================================
        RECEIVING MODE
    ========================================================= */}

      {!isSimulation && (
        <div className="space-y-4">

          {/* Gate Verification */}

          <PaperSheet
            variant="default"
            className="overflow-hidden p-0 border border-[#E3DDD1] dark:border-[#2B3835]"
          >

            <div className="px-5 sm:px-6 pt-5 pb-4">

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#DBEAFE] dark:bg-[#182942]">
                    <ShieldAlert className="h-4 w-4 text-[#2563EB]" />
                  </div>

                  <div>

                    <div className="flex items-center gap-2">

                      <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                        Warehouse Gate Verification
                      </h3>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#2563EB]">
                        <Activity className="h-3 w-3" />
                        AI Vision
                      </span>

                    </div>

                    <p className="mt-1 text-[9px] font-mono text-[#8A938F]">
                      Verify vehicle number plate and driver identity before yard entry.
                    </p>

                  </div>

                </div>

                <span className="text-[9px] font-mono text-[#8A938F]">
                  {
                    trucks.filter(
                      (truck) =>
                        truck.status !== "COMPLETED" &&
                        truckHasPassedGate(truck)
                    ).length
                  } verified
                </span>

              </div>

            </div>

            <div className="border-t border-[#E3DDD1] dark:border-[#2B3835]">
              <WarehouseGateVision
                trucks={trucks}
                docks={docks}
                onUpdated={fetchLogisticsData}
              />
            </div>

          </PaperSheet>


          {/* Receiving Queue */}

          <PaperSheet
            variant="default"
            className="overflow-hidden p-0 border border-[#E3DDD1] dark:border-[#2B3835]"
          >

            <div className="px-5 sm:px-6 pt-5 pb-4">

              <div className="flex items-center justify-between gap-4">

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DCFCE7] dark:bg-[#163824]">
                    <PackageCheck className="h-4 w-4 text-[#15803D]" />
                  </div>

                  <div>

                    <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                      Receiving Queue
                    </h3>

                    <p className="mt-1 text-[9px] font-mono text-[#8A938F]">
                      Complete goods receipt only after gate verification.
                    </p>

                  </div>

                </div>

                <span className="rounded-full bg-[#DCFCE7] px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-[#15803D]">
                  {
                    trucks.filter(
                      (truck) =>
                        truck.status !== "COMPLETED" &&
                        truckHasPassedGate(truck)
                    ).length
                  } Verified
                </span>

              </div>

            </div>


            <div className="border-t border-[#E3DDD1] dark:border-[#2B3835] overflow-x-auto">

              <table className="w-full min-w-[800px] text-left">

                <thead className="bg-[#FAF8F3] dark:bg-[#17201D]">

                  <tr>

                    {[
                      "Truck",
                      "Purchase Order",
                      "Gate Status",
                      "Dock",
                      "Status",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3 text-[8px] font-bold uppercase tracking-widest text-[#8A938F]"
                      >
                        {heading}
                      </th>
                    ))}

                  </tr>

                </thead>

                <tbody className="divide-y divide-[#E3DDD1] dark:divide-[#2B3835]">

                  {trucks.filter(
                    (truck) => truck.status !== "COMPLETED"
                  ).length === 0 ? (

                    <tr>

                      <td
                        colSpan="6"
                        className="px-5 py-10 text-center text-[10px] font-mono text-[#8A938F]"
                      >
                        No inbound trucks are waiting for receiving.
                      </td>

                    </tr>

                  ) : (

                    trucks
                      .filter(
                        (truck) => truck.status !== "COMPLETED"
                      )
                      .map((truck) => {
                        const verified = truckHasPassedGate(truck);
                        const matchingPo = purchaseOrders.find((po) => po.poNumber === truck.poNumber);
                        const verifiedSupplierName = matchingPo?.supplierName || truck.supplierName || 'Verified Supplier';
                        const verifiedVendorCode = matchingPo?.supplier?.code || truck.vendorCode || 'SUP-1001';

                        return (
                          <tr
                            key={truck._id || truck.truckId}
                            className="group hover:bg-[#FAF8F3] dark:hover:bg-[#1D2824]"
                          >

                            <td className="px-5 py-4">

                              <div className="flex items-center gap-2">

                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F4EFE6] dark:bg-[#26312D]">
                                  <Truck className="h-3.5 w-3.5 text-[#15803D]" />
                                </div>

                                <div>
                                  <p className="text-[10px] font-bold text-[#15803D] font-mono">
                                    {truck.truckId}
                                  </p>

                                  <p className="text-[8px] font-mono text-[#68716D] dark:text-[#8E9C97]">
                                    {truck.licensePlate || 'License Check'} · {truck.driverName || 'Driver'}
                                  </p>

                                  <p className="text-[7px] uppercase tracking-wider text-[#9AA29E]">
                                    {truck.priority || 'MEDIUM'} Priority · {truck.loadType || 'DRY_VAN'}
                                  </p>
                                </div>

                              </div>

                            </td>


                            <td className="px-5 py-4">

                              <p className="text-[10px] font-mono font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                                {truck.poNumber}
                              </p>

                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-[#DCFCE7] dark:bg-[#163824] border border-[#BBF7D0] dark:border-[#205035] text-[8px] font-bold text-[#15803D] dark:text-[#4ADE80]">
                                  <span>🏭</span>
                                  <span>{verifiedSupplierName}</span>
                                </span>
                                {verifiedVendorCode && (
                                  <span className="px-1 py-0.2 rounded-xs font-mono text-[7px] font-bold bg-[#E3DDD1] dark:bg-[#2B3835] text-[#59625E] dark:text-[#AAB4AF]">
                                    {verifiedVendorCode}
                                  </span>
                                )}
                              </div>

                            </td>


                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[7px] font-bold uppercase tracking-wide ${verified
                                  ? "border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]"
                                  : "border-[#FDE68A] bg-[#FEF3C7] text-[#D97706]"
                                  }`}
                              >

                                {verified ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}

                                {verified
                                  ? "Verified"
                                  : "Verification Required"}

                              </span>

                            </td>


                            <td className="px-5 py-4">

                              <span className="text-[9px] font-semibold text-[#59625E] dark:text-[#AAB4AF]">
                                {truck.assignedDock || "Not assigned"}
                              </span>

                            </td>


                            <td className="px-5 py-4">

                              <span className="text-[9px] font-bold uppercase text-[#68716D]">
                                {truck.status}
                              </span>

                            </td>


                            <td className="px-5 py-4 text-right">

                              <button
                                type="button"
                                onClick={() =>
                                  openReceivingForTruck(truck)
                                }
                                disabled={
                                  submitting || !verified
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#15803D] px-3 py-2 text-[9px] font-bold text-white hover:bg-[#166534] disabled:bg-[#E7E2D7] disabled:text-[#9AA29E]"
                              >

                                <PackageCheck className="h-3 w-3" />

                                Receive Goods

                              </button>

                            </td>

                          </tr>
                        );
                      })
                  )}

                </tbody>

              </table>

            </div>


            <div className="flex items-center justify-between border-t border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">

              <span className="text-[8px] font-mono uppercase tracking-wider text-[#8A938F]">
                Step 1 · Gate Verification & Receiving
              </span>

              <span className="text-[8px] font-mono text-[#8A938F]">
                GRN generated after inspection
              </span>

            </div>

          </PaperSheet>

        </div>
      )}


      {/* =========================================================
        SIMULATION MODE
    ========================================================= */}

      {isSimulation && (
        <div className="space-y-4">

          {/* Simulation Controls */}

          <PaperSheet
            variant="default"
            className="overflow-hidden p-0 border border-[#E3DDD1] dark:border-[#2B3835]"
          >

            <div className="px-5 sm:px-6 pt-5 pb-4">

              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EDE9FE] dark:bg-[#281E3B]">
                    <Gauge className="h-4 w-4 text-[#7C3AED]" />
                  </div>

                  <div>

                    <div className="flex items-center gap-2">

                      <h3 className="font-handwriting text-xl sm:text-2xl font-bold tracking-wide text-[#1C201E] dark:text-[#F5F7F6]">
                        Yard Simulation Controls
                      </h3>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F3FF] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#7C3AED]">

                        <span
                          className={`h-1.5 w-1.5 rounded-full ${simRunning
                            ? "bg-[#22C55E]"
                            : "bg-[#9AA29E]"
                            }`}
                        />

                        {simRunning
                          ? `Running · ${simSpeed}x`
                          : "Paused"}

                      </span>

                    </div>

                    <p className="mt-1 text-[9px] font-mono text-[#8A938F]">
                      Control simulation speed, yard visualization and operational events.
                    </p>

                  </div>

                </div>


                <div className="flex flex-wrap items-center gap-2">

                  {/* Speed */}

                  <div className="flex items-center gap-1 p-1 rounded-lg border border-[#E3DDD1] bg-[#FAF8F3] dark:border-[#2B3835] dark:bg-[#17201D]">

                    <span className="px-2 text-[8px] font-bold uppercase tracking-wider text-[#8A938F]">
                      Speed
                    </span>

                    {[1, 2, 5, 10].map((speed) => (

                      <button
                        key={speed}
                        type="button"
                        onClick={() =>
                          handleSpeedChange(speed)
                        }
                        className={`px-2.5 py-1.5 rounded-md text-[9px] font-mono font-bold transition-all ${simSpeed === speed
                          ? "bg-[#15803D] text-white"
                          : "text-[#68716D] hover:bg-white dark:hover:bg-[#222D2B]"
                          }`}
                      >
                        {speed}x
                      </button>

                    ))}

                  </div>


                  {/* Start / Pause */}

                  {simRunning ? (

                    <button
                      type="button"
                      onClick={handlePauseSimulation}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FEF3C7] text-[#D97706] text-[9px] font-bold hover:bg-[#FDE68A]"
                    >
                      <Pause className="w-3 h-3" />
                      Pause
                    </button>

                  ) : (

                    <button
                      type="button"
                      onClick={handleStartSimulation}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#15803D] text-white text-[9px] font-bold hover:bg-[#166534]"
                    >
                      <Play className="w-3 h-3" />
                      Start Simulation
                    </button>

                  )}


                  <button
                    type="button"
                    onClick={handleResetSimulation}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-[#E3DDD1] bg-[#FCFAF4] text-[#68716D] hover:border-[#15803D]"
                    title="Reset simulation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateDelay(
                        trucks[0]?.truckId
                      )
                    }
                    disabled={
                      submitting || trucks.length === 0
                    }
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] text-[9px] font-bold disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Simulate Delay
                  </button>

                </div>

              </div>

            </div>


            {/* Metrics */}

            <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-[#E3DDD1] dark:border-[#2B3835]">

              <div className="px-5 py-3">

                <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Active Inbound
                </p>

                <p className="mt-1 text-lg font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                  {
                    trucks.filter(
                      (t) => t.status !== "COMPLETED"
                    ).length
                  }
                </p>

              </div>


              <div className="border-x border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">

                <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Yard Occupancy
                </p>

                <p className="mt-1 text-lg font-bold text-[#15803D]">
                  {yardCapacity.occupied}/{yardCapacity.max}
                </p>

              </div>


              <div className="border-r border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">

                <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Available Docks
                </p>

                <p className="mt-1 text-lg font-bold text-[#2563EB]">
                  {availableDocksCount}
                </p>

              </div>


              <div className="px-5 py-3">

                <p className="text-[8px] font-bold uppercase tracking-widest text-[#8A938F]">
                  Delayed Trucks
                </p>

                <p
                  className={`mt-1 text-lg font-bold ${delayedTrucksCount
                    ? "text-[#DC2626]"
                    : "text-[#15803D]"
                    }`}
                >
                  {delayedTrucksCount}
                </p>

              </div>

            </div>

          </PaperSheet>


          {/* Delay Alert */}

          {delayAlert && (

            <div className="flex items-start justify-between gap-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">

              <div className="flex items-center gap-3">

                <ShieldAlert className="w-4 h-4 text-[#DC2626]" />

                <span className="text-[9px] font-semibold">
                  {delayAlert}
                </span>

              </div>

              <button
                type="button"
                onClick={() => setDelayAlert(null)}
                className="px-2 py-1 rounded-md bg-white border border-[#FECACA] text-[8px] font-bold"
              >
                Dismiss
              </button>

            </div>

          )}


          {/* =====================================================
            MAIN DIGITAL TWIN / MAP
        ===================================================== */}

          <PaperSheet
            variant="default"
            className="overflow-hidden p-0 border border-[#E3DDD1] dark:border-[#2B3835]"
          >

            <div className="px-5 sm:px-6 py-4 border-b border-[#E3DDD1] dark:border-[#2B3835]">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DBEAFE] dark:bg-[#182942]">
                    {activeView === "map" ? (
                      <Route className="h-4 w-4 text-[#2563EB]" />
                    ) : (
                      <Building2 className="h-4 w-4 text-[#2563EB]" />
                    )}
                  </div>

                  <div>

                    <h3 className="font-handwriting text-xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                      {activeView === "map"
                        ? "Live Yard Map"
                        : "Yard Digital Twin"}
                    </h3>

                    <p className="text-[8px] font-mono text-[#8A938F]">
                      Real-time operational telemetry
                    </p>

                  </div>

                </div>

                <span className="text-[8px] font-mono uppercase tracking-wider text-[#8A938F]">
                  {simRunning ? "LIVE" : "PAUSED"}
                </span>

              </div>

            </div>


            <div className="p-3 sm:p-4">

              {activeView === "map" ? (

                <TruckMap
                  trucks={trucks}
                  docks={docks}
                  isRunning={simRunning}
                  speed={simSpeed}
                  selectedTruckId={selectedTruckDetail?.truckId}
                  onSimulateStep={handleStartSimulation}
                  onSelectTruck={(t) =>
                    setSelectedTruckDetail(t)
                  }
                />

              ) : (

                <YardDigitalTwin
                  trucks={trucks}
                  docks={docks}
                  simRunning={simRunning}
                  simSpeed={simSpeed}
                  yardCapacity={yardCapacity}
                  eventLogs={eventLogs}
                  onSelectTruck={(t) =>
                    setSelectedTruckDetail(t)
                  }
                  onSelectDock={(d) => {

                    const dockedTruck =
                      trucks.find(
                        (t) =>
                          t.assignedDock ===
                          d.dockNumber ||
                          t.truckId ===
                          d.currentTruckId
                      );

                    if (dockedTruck) {
                      setSelectedTruckDetail(
                        dockedTruck
                      );
                    }

                  }}
                  onRecommendDock={
                    handleGetDockRecommendation
                  }
                  onReceiveGoods={(poNum) => {

                    const truck =
                      trucks.find(
                        (item) =>
                          item.poNumber === poNum
                      );

                    if (!truck) {

                      showNotification(
                        `The truck for Purchase Order ${poNum} could not be loaded.`,
                        "error"
                      );

                      return;
                    }

                    openReceivingForTruck(truck);

                  }}
                  onReleaseDock={handleReleaseDock}
                />

              )}

            </div>

          </PaperSheet>


          {/* =====================================================
            ACTIVITY + DOCKS
        ===================================================== */}

          <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.5fr] gap-4">

            {/* Activity */}

            <PaperSheet
              variant="default"
              className="overflow-hidden p-0"
            >

              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E3DDD1] dark:border-[#2B3835]">

                <div>

                  <h3 className="font-handwriting text-xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                    Yard Activity
                  </h3>

                  <p className="mt-1 text-[8px] font-mono text-[#8A938F]">
                    Latest simulation events and operational changes.
                  </p>

                </div>

                <span className="text-[8px] font-mono text-[#8A938F]">
                  {eventLogs.length} events
                </span>

              </div>


              <div className="max-h-64 overflow-y-auto">

                {eventLogs.length === 0 ? (

                  <div className="px-5 py-10 text-center">

                    <Activity className="mx-auto h-6 w-6 text-[#9AA29E]" />

                    <p className="mt-2 text-[10px] font-semibold text-[#59625E]">
                      No activity yet
                    </p>

                    <p className="mt-1 text-[8px] font-mono text-[#8A938F]">
                      Start the simulation to generate yard events.
                    </p>

                  </div>

                ) : (

                  <div className="divide-y divide-[#E3DDD1] dark:divide-[#2B3835]">

                    {eventLogs.map((log) => (

                      <div
                        key={log.id}
                        className="flex items-start gap-3 px-5 py-3"
                      >

                        <span className="w-14 shrink-0 text-[8px] font-mono text-[#9AA29E]">
                          {log.time}
                        </span>

                        <span
                          className={`text-[9px] leading-relaxed ${log.level === "error"
                            ? "text-[#DC2626]"
                            : log.level === "success"
                              ? "text-[#15803D]"
                              : log.level === "warning"
                                ? "text-[#D97706]"
                                : "text-[#59625E] dark:text-[#AAB4AF]"
                            }`}
                        >
                          {log.text}
                        </span>

                      </div>

                    ))}

                  </div>

                )}

              </div>

            </PaperSheet>


            {/* Dock Availability */}

            <PaperSheet
              variant="default"
              className="overflow-hidden p-0"
            >

              <div className="px-5 py-4 border-b border-[#E3DDD1] dark:border-[#2B3835]">

                <h3 className="font-handwriting text-xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                  Dock Availability
                </h3>

                <p className="mt-1 text-[8px] font-mono text-[#8A938F]">
                  Current bay assignments.
                </p>

              </div>


              {docks.length === 0 ? (

                <div className="px-5 py-10 text-center text-[9px] font-mono text-[#8A938F]">
                  No dock data available.
                </div>

              ) : (

                <div className="divide-y divide-[#E3DDD1] dark:divide-[#2B3835]">

                  {docks.map((dock) => (

                    <div
                      key={
                        dock._id ||
                        dock.dockNumber
                      }
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >

                      <div>

                        <p className="text-[10px] font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                          {dock.dockNumber}
                        </p>

                        <p className="mt-0.5 text-[7px] text-[#8A938F]">
                          {dock.currentTruckId
                            ? `Assigned to ${dock.currentTruckId}`
                            : dock.name ||
                            "No truck assigned"}
                        </p>

                      </div>


                      <div className="flex items-center gap-2">

                        <span
                          className={`inline-flex items-center gap-1.5 text-[8px] font-bold ${dock.status ===
                            "AVAILABLE"
                            ? "text-[#15803D]"
                            : dock.status ===
                              "MAINTENANCE"
                              ? "text-[#DC2626]"
                              : "text-[#68716D]"
                            }`}
                        >

                          <span
                            className={`h-1.5 w-1.5 rounded-full ${dock.status ===
                              "AVAILABLE"
                              ? "bg-[#22C55E]"
                              : dock.status ===
                                "MAINTENANCE"
                                ? "bg-[#DC2626]"
                                : "bg-[#9AA29E]"
                              }`}
                          />

                          {dock.status}

                        </span>

                        {dock.status ===
                          "OCCUPIED" && (

                            <button
                              type="button"
                              onClick={() =>
                                handleReleaseDock(
                                  dock.dockNumber
                                )
                              }
                              disabled={submitting}
                              className="rounded-md border border-[#E3DDD1] px-2 py-1 text-[8px] font-bold text-[#68716D] hover:border-[#15803D] disabled:opacity-50"
                            >
                              Release
                            </button>

                          )}

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </PaperSheet>

          </div>


          {/* =====================================================
            INBOUND TRUCKS
        ===================================================== */}

          <PaperSheet
            variant="default"
            className="overflow-hidden p-0 border border-[#E3DDD1] dark:border-[#2B3835]"
          >

            <div className="px-5 sm:px-6 py-4 border-b border-[#E3DDD1] dark:border-[#2B3835]">

              <div className="flex items-center justify-between">

                <div>

                  <h3 className="font-handwriting text-xl sm:text-2xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                    Inbound Trucks
                  </h3>

                  <p className="mt-1 text-[8px] font-mono text-[#8A938F]">
                    Lifecycle status, ETA and yard actions for active vehicles.
                  </p>

                </div>

                <span className="rounded-full bg-[#DBEAFE] px-2 py-1 text-[8px] font-bold text-[#2563EB]">
                  {
                    trucks.filter(
                      (t) => t.status !== "COMPLETED"
                    ).length
                  } Active
                </span>

              </div>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px]">

                <thead className="bg-[#FAF8F3] dark:bg-[#17201D]">

                  <tr>

                    {[
                      "Truck",
                      "Purchase Order",
                      "Driver / Trailer",
                      "ETA",
                      "Status",
                      "Progress",
                      "Actions",
                    ].map((heading) => (

                      <th
                        key={heading}
                        className="px-5 py-3 text-left text-[8px] font-bold uppercase tracking-widest text-[#8A938F]"
                      >
                        {heading}
                      </th>

                    ))}

                  </tr>

                </thead>


                <tbody className="divide-y divide-[#E3DDD1] dark:divide-[#2B3835]">

                  {trucks
                    .filter(
                      (t) => t.status !== "COMPLETED"
                    )
                    .map((truck) => (

                      <tr
                        key={
                          truck._id ||
                          truck.truckId
                        }
                        onClick={() => {
                          setSelectedTruckDetail(
                            truck
                          );
                          setActiveView("map");
                        }}
                        className={`group cursor-pointer transition-colors ${
                          selectedTruckDetail?.truckId === truck.truckId
                            ? "bg-[#DCFCE7]/40 dark:bg-[#163824]/40"
                            : "hover:bg-[#FAF8F3] dark:hover:bg-[#1D2824]"
                        }`}
                      >

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2">

                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F0FDF4] dark:bg-[#163824]">
                              <Truck className="h-3.5 w-3.5 text-[#15803D]" />
                            </div>

                            <div>

                              <p className="text-[10px] font-bold text-[#15803D]">
                                {truck.truckId}
                              </p>

                              <p className="text-[7px] uppercase tracking-wider text-[#9AA29E]">
                                Inbound
                              </p>

                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <span className="text-[9px] font-mono font-semibold text-[#1C201E] dark:text-[#F5F7F6] block">
                            {truck.poNumber}
                          </span>

                          <span className="text-[8px] text-[#15803D] font-bold block truncate max-w-[140px]">
                            {truck.supplierName || 'Verified Supplier'}
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <p className="text-[9px] font-semibold text-[#1C201E] dark:text-[#F5F7F6]">
                            {truck.driverName ||
                              "Not available"}
                          </p>

                          <p className="mt-0.5 text-[7px] text-[#8A938F]">
                            {truck.trailerId ||
                              "Trailer unavailable"}
                          </p>

                        </td>


                        <td className="px-5 py-4">

                          <span className="text-[9px] font-mono text-[#68716D]">
                            {truck.eta || "—"}
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[7px] font-bold uppercase ${truck.status ===
                              "DELAYED"
                              ? "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                              : truck.status ===
                                "UNLOADING"
                                ? "border-[#DDD6FE] bg-[#F5F3FF] text-[#7C3AED]"
                                : "border-[#E3DDD1] bg-[#FCFAF4] text-[#68716D]"
                              }`}
                          >

                            {truck.status ===
                              "DELAYED" ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <Truck className="h-3 w-3" />
                            )}

                            {truck.status}

                          </span>

                        </td>


                        <td className="px-5 py-4 w-44">

                          <div className="flex items-center gap-2">

                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E7E2D7] dark:bg-[#2B3835]">

                              <div
                                className="h-full rounded-full bg-[#15803D] transition-all"
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      truck.progress ||
                                      0
                                    )
                                  )}%`,
                                }}
                              />

                            </div>

                            <span className="text-[8px] font-mono text-[#8A938F]">
                              {truck.progress ||
                                0}
                              %
                            </span>

                          </div>

                        </td>


                        <td
                          className="px-5 py-4 text-right"
                          onClick={(e) =>
                            e.stopPropagation()
                          }
                        >

                          <div className="flex justify-end gap-1.5 items-center">

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTruckDetail(truck);
                                setActiveView("map");
                              }}
                              className="rounded-lg border border-[#BBF7D0] bg-[#DCFCE7] px-2.5 py-2 text-[8px] font-bold text-[#15803D] hover:bg-[#BBF7D0]"
                            >
                              Track Map
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleSimulateDelay(
                                  truck.truckId
                                )
                              }
                              disabled={submitting}
                              className="rounded-lg border border-[#E3DDD1] px-2.5 py-2 text-[8px] font-bold text-[#68716D] hover:border-[#DC2626]"
                            >
                              Delay
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleGetDockRecommendation(
                                  truck
                                )
                              }
                              className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-2 text-[8px] font-bold text-[#2563EB]"
                            >
                              Recommend Dock
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))}

                </tbody>

              </table>

            </div>


            <div className="flex items-center justify-between border-t border-[#E3DDD1] px-5 py-3 dark:border-[#2B3835]">

              <span className="text-[8px] font-mono uppercase tracking-wider text-[#8A938F]">
                Step 2 · Yard Movement & Dock Allocation
              </span>

              <span className="text-[8px] font-mono text-[#8A938F]">
                {
                  trucks.filter(
                    (t) =>
                      t.status !==
                      "COMPLETED"
                  ).length
                } active vehicles
              </span>

            </div>

          </PaperSheet>


          {/* =====================================================
            INVENTORY
        ===================================================== */}

          <PaperSheet
            variant="default"
            className="overflow-hidden p-0 border border-[#E3DDD1] dark:border-[#2B3835]"
          >

            <div className="px-5 sm:px-6 py-4 border-b border-[#E3DDD1] dark:border-[#2B3835]">

              <div className="flex items-center justify-between">

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DCFCE7] dark:bg-[#163824]">
                    <Boxes className="h-4 w-4 text-[#15803D]" />
                  </div>

                  <div>

                    <h3 className="font-handwriting text-xl sm:text-2xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                      Warehouse Inventory
                    </h3>

                    <p className="mt-1 text-[8px] font-mono text-[#8A938F]">
                      Stock levels synchronized after goods receiving.
                    </p>

                  </div>

                </div>

                <span className="text-[8px] font-mono text-[#8A938F]">
                  {inventory.length} items
                </span>

              </div>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full min-w-[800px]">

                <thead className="bg-[#FAF8F3] dark:bg-[#17201D]">

                  <tr>

                    {[
                      "SKU",
                      "Product",
                      "Location",
                      "On Hand",
                      "Available",
                      "Updated",
                    ].map((heading) => (

                      <th
                        key={heading}
                        className="px-5 py-3 text-left text-[8px] font-bold uppercase tracking-widest text-[#8A938F]"
                      >
                        {heading}
                      </th>

                    ))}

                  </tr>

                </thead>


                <tbody className="divide-y divide-[#E3DDD1] dark:divide-[#2B3835]">

                  {inventory.map((item) => (

                    <tr
                      key={
                        item._id ||
                        item.sku
                      }
                      className="hover:bg-[#FAF8F3] dark:hover:bg-[#1D2824]"
                    >

                      <td className="px-5 py-4">

                        <span className="text-[9px] font-mono font-bold text-[#15803D]">
                          {item.sku}
                        </span>

                      </td>

                      <td className="px-5 py-4">

                        <span className="text-[9px] font-semibold text-[#1C201E] dark:text-[#F5F7F6]">
                          {item.productName}
                        </span>

                      </td>

                      <td className="px-5 py-4">

                        <span className="text-[9px] text-[#68716D]">
                          {item.warehouseLocation ||
                            "Not assigned"}
                        </span>

                      </td>

                      <td className="px-5 py-4 text-right">

                        <span className="text-[10px] font-mono font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                          {Number(
                            item.quantityOnHand ||
                            0
                          ).toLocaleString()}
                        </span>

                      </td>

                      <td className="px-5 py-4 text-right">

                        <span className="text-[10px] font-mono font-bold text-[#15803D]">
                          {Number(
                            item.availableQuantity ||
                            0
                          ).toLocaleString()}
                        </span>

                      </td>

                      <td className="px-5 py-4">

                        <span className="text-[8px] font-mono text-[#8A938F]">
                          {item.updatedAt ||
                            item.lastUpdated
                            ? new Date(
                              item.updatedAt ||
                              item.lastUpdated
                            ).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute:
                                  "2-digit",
                              }
                            )
                            : "—"}
                        </span>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </PaperSheet>

        </div>
      )}


      {/* =========================================================
        TRUCK DETAILS MODAL
    ========================================================= */}

      {selectedTruckDetail && (

        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">

          <div className="h-full w-full max-w-md overflow-y-auto bg-[#FCFAF4] dark:bg-[#1B2422] border-l border-[#E3DDD1] dark:border-[#2B3835] shadow-2xl">

            <div className="flex items-start justify-between p-5 border-b border-[#E3DDD1] dark:border-[#2B3835]">

              <div>

                <div className="flex items-center gap-2">

                  <Truck className="w-4 h-4 text-[#15803D]" />

                  <h3 className="font-handwriting text-xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                    {selectedTruckDetail.truckId}
                  </h3>

                </div>

                <p className="mt-1 text-[9px] font-mono text-[#8A938F]">
                  Current yard state and assignment.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTruckDetail(null)
                }
                className="text-[#68716D] hover:text-[#1C201E]"
              >
                <X className="w-4 h-4" />
              </button>

            </div>


            <div className="p-5">

              <div className="rounded-lg border border-[#E3DDD1] dark:border-[#2B3835] overflow-hidden">

                {[
                  [
                    "Status",
                    selectedTruckDetail.status ||
                    "Not available",
                  ],
                  [
                    "Purchase Order",
                    selectedTruckDetail.poNumber ||
                    "Not available",
                  ],
                  [
                    "Driver",
                    selectedTruckDetail.driverName ||
                    "Not available",
                  ],
                  [
                    "Trailer",
                    selectedTruckDetail.trailerId ||
                    "Not available",
                  ],
                  [
                    "ETA",
                    selectedTruckDetail.eta ||
                    "Not available",
                  ],
                  [
                    "Assigned Dock",
                    selectedTruckDetail.assignedDock ||
                    "Unassigned",
                  ],
                ].map(([label, value]) => (

                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 px-4 py-3 border-b last:border-b-0 border-[#E3DDD1] dark:border-[#2B3835]"
                  >

                    <span className="text-[8px] font-bold uppercase tracking-wider text-[#8A938F]">
                      {label}
                    </span>

                    <span className="text-[9px] font-semibold text-[#1C201E] dark:text-[#F5F7F6]">
                      {value}
                    </span>

                  </div>

                ))}

              </div>


              {selectedTruckDetail.delayReason && (

                <div className="mt-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-[9px] text-[#991B1B]">

                  <strong>Delay recorded.</strong>{" "}
                  {selectedTruckDetail.delayReason}
                  {" "}
                  (+
                  {selectedTruckDetail.delayMinutes ||
                    15}
                  min)

                </div>

              )}

            </div>

          </div>

        </div>

      )}


      {/* =========================================================
        DOCK RECOMMENDATION MODAL
    ========================================================= */}

      {recommendedDock && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">

          <div className="w-full max-w-md rounded-xs bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-2xl">

            <div className="flex items-start justify-between p-5 border-b border-[#E3DDD1] dark:border-[#2B3835]">

              <div>

                <div className="flex items-center gap-2">

                  <Sparkles className="w-4 h-4 text-[#7C3AED]" />

                  <h3 className="font-handwriting text-xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                    Dock Recommendation
                  </h3>

                </div>

                <p className="mt-1 text-[9px] font-mono text-[#8A938F]">
                  For {recommendedDock.truckId} · PO{" "}
                  {recommendedDock.poNumber}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setRecommendedDock(null)
                }
                className="text-[#68716D]"
              >
                <X className="w-4 h-4" />
              </button>

            </div>


            <div className="p-5 space-y-4">

              <div className="grid grid-cols-3 gap-2">

                {[
                  ["ETA", recommendedDock.eta],
                  [
                    "Priority",
                    recommendedDock.priority,
                  ],
                  [
                    "Load",
                    recommendedDock.loadType,
                  ],
                ].map(([label, value]) => (

                  <div
                    key={label}
                    className="rounded-lg bg-[#F4EFE6] dark:bg-[#222D2B] p-3"
                  >

                    <p className="text-[7px] font-bold uppercase tracking-wider text-[#8A938F]">
                      {label}
                    </p>

                    <p className="mt-1 text-[9px] font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                      {value || "—"}
                    </p>

                  </div>

                ))}

              </div>


              {recommendedDock.recommendedDock ? (

                <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-4">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-[8px] font-bold uppercase tracking-wider text-[#15803D]">
                        Recommended Dock
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#1C201E]">
                        {
                          recommendedDock
                            .recommendedDock
                            .dockNumber
                        }
                      </p>

                      <p className="text-[8px] text-[#68716D]">
                        {
                          recommendedDock
                            .recommendedDock
                            .name
                        }
                      </p>

                    </div>

                    <span className="text-[9px] font-bold text-[#15803D]">
                      Score{" "}
                      {
                        recommendedDock
                          .recommendedDock
                          .score
                      }
                      /100
                    </span>

                  </div>


                  {recommendedDock.recommendedDock.rationale?.length > 0 && (

                    <ul className="mt-3 space-y-1 text-[8px] text-[#68716D] list-disc pl-4">

                      {recommendedDock.recommendedDock.rationale.map(
                        (reason, idx) => (
                          <li key={idx}>
                            {reason}
                          </li>
                        )
                      )}

                    </ul>

                  )}

                </div>

              ) : (

                <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-[9px] text-[#DC2626]">
                  {recommendedDock.reason ||
                    "A dock could not be recommended."}
                </div>

              )}

            </div>


            <div className="flex justify-end gap-2 p-5 border-t border-[#E3DDD1] dark:border-[#2B3835]">

              <button
                type="button"
                onClick={() =>
                  setRecommendedDock(null)
                }
                className="px-3 py-1.5 rounded-xs border border-[#E3DDD1] text-[9px] font-mono"
              >
                Cancel
              </button>

              {recommendedDock.recommendedDock && (

                <button
                  type="button"
                  onClick={() =>
                    handleAssignDock(
                      recommendedDock
                        .recommendedDock
                        .dockNumber,
                      recommendedDock.truckId
                    )
                  }
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xs bg-[#15803D] text-white text-[9px] font-mono font-bold disabled:opacity-50"
                >
                  Assign Dock
                </button>

              )}

            </div>

          </div>

        </div>

      )}


      {/* =========================================================
        RECEIVING / GRN MODAL
    ========================================================= */}

      {receivingPo && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">

          <div className="w-full max-w-md rounded-xs bg-[#FCFAF4] dark:bg-[#1B2422] border border-[#E3DDD1] dark:border-[#2B3835] shadow-2xl">

            <div className="flex items-start justify-between p-5 border-b border-[#E3DDD1] dark:border-[#2B3835]">

              <div>

                <div className="flex items-center gap-2">

                  <PackageCheck className="w-4 h-4 text-[#15803D]" />

                  <h3 className="font-handwriting text-xl font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                    Receive Goods & GRN
                  </h3>

                </div>

                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <p className="text-[9px] font-mono text-[#8A938F]">
                    PO: <strong className="text-[#1C201E] dark:text-[#F5F7F6]">{receivingPo.poNumber}</strong>
                  </p>
                  <span className="text-zinc-400 text-xs">·</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono font-bold text-[#15803D] dark:text-[#4ADE80]">
                      🏭 {receivingPo.supplierName}
                    </span>
                    {receivingPo.vendorCode && (
                      <span className="px-1 py-0.2 rounded-xs font-mono text-[7px] font-bold bg-[#E3DDD1] dark:bg-[#2B3835] text-[#59625E] dark:text-[#AAB4AF]">
                        {receivingPo.vendorCode}
                      </span>
                    )}
                  </div>
                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setReceivingPo(null)
                }
                className="text-[#68716D]"
              >
                <X className="w-4 h-4" />
              </button>

            </div>


            <form
              onSubmit={handleProcessReceiving}
              className="p-5 space-y-4"
            >

              <div className="rounded-lg bg-[#F4EFE6] dark:bg-[#222D2B] p-3">

                <p className="text-[10px] font-bold text-[#1C201E] dark:text-[#F5F7F6]">
                  {receivingPo.item}
                </p>

                <p className="mt-1 text-[8px] text-[#68716D]">
                  Ordered Quantity:{" "}
                  <strong>
                    {receivingPo.ordered}
                  </strong>{" "}
                  units
                </p>

              </div>


              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="text-[8px] font-bold uppercase tracking-wider text-[#68716D]">
                    Received Quantity
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={receivedQty}
                    onChange={(e) =>
                      setReceivedQty(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full px-3 py-2 rounded-xs bg-white dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] font-mono text-xs focus:outline-none focus:border-[#15803D]"
                    required
                  />

                </div>


                <div>

                  <label className="text-[8px] font-bold uppercase tracking-wider text-[#68716D]">
                    Damaged / Rejected
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={damagedQty}
                    onChange={(e) =>
                      setDamagedQty(
                        e.target.value
                      )
                    }
                    className="mt-1 w-full px-3 py-2 rounded-xs bg-white dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] font-mono text-xs focus:outline-none focus:border-[#15803D]"
                  />

                </div>

              </div>


              <div className="flex items-center justify-between rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2.5">

                <span className="text-[8px] font-bold uppercase tracking-wider text-[#15803D]">
                  Accepted into Inventory
                </span>

                <strong className="text-sm font-mono text-[#15803D]">
                  {calculatedAccepted} units
                </strong>

              </div>


              <div>

                <label className="text-[8px] font-bold uppercase tracking-wider text-[#68716D]">
                  Inspector Remarks
                </label>

                <textarea
                  value={receivingRemarks}
                  onChange={(e) =>
                    setReceivingRemarks(
                      e.target.value
                    )
                  }
                  placeholder="Add inspection notes if needed"
                  className="mt-1 min-h-20 w-full resize-y px-3 py-2 rounded-xs bg-white dark:bg-[#222D2B] border border-[#E3DDD1] dark:border-[#2B3835] text-xs focus:outline-none focus:border-[#15803D]"
                />

              </div>


              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3DDD1] dark:border-[#2B3835]">

                <button
                  type="button"
                  onClick={() =>
                    setReceivingPo(null)
                  }
                  className="px-3 py-1.5 rounded-xs border border-[#E3DDD1] text-[9px] font-mono"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xs bg-[#15803D] text-white text-[9px] font-mono font-bold hover:bg-[#166534] disabled:opacity-50"
                >
                  {submitting
                    ? "Creating GRN..."
                    : "Create GRN"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}
