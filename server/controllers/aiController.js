const axios = require('axios');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const Truck = require('../models/Truck');
const Dock = require('../models/Dock');
const GoodsReceipt = require('../models/GoodsReceipt');
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Exception = require('../models/Exception');
const AuditLog = require('../models/AuditLog');
const inventoryPlanning = require('./inventoryPlanningController');
const yardSimulationService = require('../services/yardSimulationService');
const procurementIntelligence = require('../services/procurementIntelligenceService');
const { evaluateSupplierDocuments } = require('./procurementController');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TOOL_ROLES = {
  prepareProcurementIntelligence: ['procurement_manager', 'admin'],
  convertApprovedRecommendationToPurchaseOrder: ['procurement_manager', 'admin'],
  createPurchaseRequisition: ['procurement_manager', 'admin'],
  approvePurchaseRequisition: ['procurement_manager', 'admin'],
  searchSuppliers: ['procurement_manager', 'admin'],
  compareSuppliers: ['procurement_manager', 'admin'],
  evaluateSupplier: ['procurement_manager', 'admin'],
  getPurchaseOrder: ['procurement_manager', 'warehouse_manager', 'finance_user', 'admin'],
  getTruckStatus: ['warehouse_manager', 'admin'],
  getSingleTruck: ['warehouse_manager', 'admin'],
  getDelayedTrucks: ['warehouse_manager', 'admin'],
  controlYardSimulation: ['warehouse_manager', 'admin'],
  getDockStatus: ['warehouse_manager', 'admin'],
  getWaitingTrucks: ['warehouse_manager', 'admin'],
  recommendDock: ['warehouse_manager', 'admin'],
  getReceivingLog: ['warehouse_manager', 'finance_user', 'admin'],
  getInventoryStatus: ['warehouse_manager', 'admin'],
  getInvoiceStatus: ['finance_user', 'admin'],
  getMismatchedInvoices: ['finance_user', 'admin'],
  getPaymentsOnHold: ['finance_user', 'admin'],
  getControlTowerSummary: ['admin']
};
const { extractHumanUnitPrice, parseProcurementRequest } = require('../services/procurementIntentService');
// --- Secure Backend Tool Execution Dispatcher with RBAC & Input Validation ---
const executeTool = async (toolName, params, user, confirmed = false) => {
  try {
    const userRole = user?.role || 'guest';
    const userName = user?.name || 'Authorized User';
    const allowedRoles = TOOL_ROLES[toolName];
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return {
        success: false,
        message: `Your ${userRole.replaceAll('_', ' ')} role is not authorized to run ${toolName}.`
      };
    }

    switch (toolName) {

      // 1. Create Purchase Requisition (Requires Human Approval Guard + RBAC)
      case 'prepareProcurementIntelligence': {
        if (!['procurement_manager', 'admin'].includes(userRole)) {
          return {
            success: false,
            message: `Forbidden: User role '${userRole}' is not authorized to run procurement intelligence.`
          };
        }

        if (!confirmed) {
          const preview = await procurementIntelligence.buildProcurementPreview(params);
          if (!preview.success) return preview;
          return {
            ...preview,
            requiresConfirmation: true,
            actionType: 'APPROVE_PROCUREMENT_RECOMMENDATION',
            params: preview.params,
            confirmationPrompt: 'Approve Procurement Recommendation'
          };
        }

        return procurementIntelligence.createPrFromRecommendation(params, user);
      }

      case 'convertApprovedRecommendationToPurchaseOrder': {
        if (!['procurement_manager', 'admin'].includes(userRole)) {
          return {
            success: false,
            message: `Forbidden: User role '${userRole}' is not authorized to convert approved recommendations to Purchase Orders.`
          };
        }

        const prNumber = String(params.prNumber || params.requisitionNumber || '').trim().toUpperCase();
        if (!prNumber) {
          return { success: false, message: 'PR number is required to create a Purchase Order from an approved recommendation.' };
        }

        if (!confirmed) {
          return {
            success: true,
            requiresConfirmation: true,
            actionType: 'CREATE_PO_FROM_APPROVED_RECOMMENDATION',
            params: { prNumber },
            confirmationPrompt: `Approve Recommendation & Create PO for ${prNumber}`
          };
        }

        return procurementIntelligence.convertApprovedRecommendationToPurchaseOrder({ prNumber }, user);
      }

      case 'createPurchaseRequisition': {
        if (!['procurement_manager', 'admin'].includes(userRole)) {
          return {
            success: false,
            message: `Forbidden: User role '${userRole}' is not authorized to create Purchase Requisitions. Requires Procurement Manager access.`
          };
        }

        const { item, quantity, estimatedPrice } = params;

        if (!item || item.trim() === '' || item.toLowerCase() === 'something' || item.toLowerCase() === 'stuff') {
          return {
            success: false,
            message: 'Validation Error: Please specify the exact item name (e.g., "500 Safety Helmets").'
          };
        }

        const qty = Number(quantity);
        if (isNaN(qty) || qty <= 0) {
          return {
            success: false,
            message: `Validation Error: Quantity '${quantity}' must be greater than 0.`
          };
        }

        const unitPrice = Number(estimatedPrice);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          return {
            success: false,
            message: 'Price per unit is required. Enter the human-approved unit price; AI will not invent or hardcode it.'
          };
        }
        const totalAmount = qty * unitPrice;

        // Human Confirmation Guard
        if (!confirmed) {
          return {
            success: true,
            requiresConfirmation: true,
            actionType: 'CREATE_PR',
            params: { item: item.trim(), quantity: qty, estimatedPrice: unitPrice },
            confirmationPrompt: `Create Purchase Requisition for ${qty} × ${item.trim()} (human-entered price: ₹${unitPrice.toLocaleString('en-IN')}, total: ₹${totalAmount.toLocaleString('en-IN')})?`,
            details: `Awaiting user confirmation to issue PR for ${qty} x ${item.trim()}.`
          };
        }

        const count = await PurchaseRequisition.countDocuments();
        const prNumber = `PR-${1000 + count + 1}`;

        const pr = new PurchaseRequisition({
          prNumber,
          requestedBy: userName,
          items: [{
            productName: item.trim(),
            quantity: qty,
            estimatedUnitPrice: unitPrice,
            totalPrice: totalAmount
          }],
          totalAmount,
          status: 'PENDING',
          aiGenerated: true,
          notes: `Generated via Copilot for ${userName}`
        });

        await pr.save();

        await AuditLog.create({
          user: userName,
          role: userRole,
          action: 'PR_CREATED_VIA_COPILOT',
          entity: 'PurchaseRequisition',
          entityId: pr._id.toString(),
          details: `Copilot created ${pr.prNumber} for ${qty} x ${item.trim()} (₹${totalAmount.toLocaleString('en-IN')})`
        });

        return {
          success: true,
          action: 'CREATED_PR',
          prNumber: pr.prNumber,
          status: pr.status,
          item: item.trim(),
          quantity: qty,
          totalAmount: pr.totalAmount,
          details: `Purchase Requisition ${pr.prNumber} created successfully for ${qty} x ${item.trim()} (Status: PENDING, Total: ₹${totalAmount.toLocaleString('en-IN')}).`
        };
      }

      // 2. Approve Purchase Requisition
      case 'approvePurchaseRequisition': {
        if (!['procurement_manager', 'admin'].includes(userRole)) {
          return {
            success: false,
            message: `Forbidden: User role '${userRole}' is not authorized to approve Purchase Requisitions.`
          };
        }

        const { prNumber } = params;
        const pr = await PurchaseRequisition.findOne({ prNumber: new RegExp(prNumber?.trim(), 'i') });
        if (!pr) return { success: false, message: `Requisition ${prNumber} not found.` };

        if (!confirmed) {
          return {
            success: true,
            requiresConfirmation: true,
            actionType: 'APPROVE_PR',
            params: { prNumber: pr.prNumber },
            confirmationPrompt: `Approve Purchase Requisition ${pr.prNumber}?`
          };
        }

        pr.status = 'APPROVED';
        await pr.save();

        await AuditLog.create({
          user: userName,
          role: userRole,
          action: 'PR_APPROVED_VIA_COPILOT',
          entity: 'PurchaseRequisition',
          entityId: pr._id.toString(),
          details: `Copilot approved requisition ${pr.prNumber}`
        });

        return {
          success: true,
          action: 'APPROVED_PR',
          prNumber: pr.prNumber,
          status: 'APPROVED',
          details: `Requisition ${pr.prNumber} has been approved.`
        };
      }

      // 3. Search & Compare Suppliers
      case 'searchSuppliers':
      case 'compareSuppliers':
      case 'evaluateSupplier': {
        const filter = { status: 'ACTIVE' };
        if (params.category) filter.category = new RegExp(params.category, 'i');

        const rawSuppliers = await Supplier.find(filter);
        if (!rawSuppliers || rawSuppliers.length === 0) {
          return { success: false, message: 'No active suppliers found matching criteria.' };
        }

        const evaluated = evaluateSupplierDocuments(rawSuppliers).map(sup => ({
          name: sup.name,
          code: sup.code,
          category: sup.category,
          rating: sup.rating,
          leadTimeDays: sup.leadTimeDays,
          otdScore: `${sup.otdScore}%`,
          score: sup.score,
          recommendationReason: `OTD: ${sup.otdScore}% | Rating: ${sup.rating}/5.0 | Lead Time: ${sup.leadTimeDays}d`
        }));
        const topPick = evaluated[0];

        return {
          success: true,
          action: 'SUPPLIER_EVALUATION',
          topPick: topPick ? topPick.name : null,
          suppliers: evaluated,
          details: topPick
            ? `${topPick.name} is the top recommended supplier with a score of ${topPick.score}/100 (${topPick.recommendationReason}).`
            : 'Supplier evaluation complete.'
        };
      }

      // 4. Get Purchase Order Status
      case 'getPurchaseOrder': {
        const { poNumber } = params;
        if (!poNumber) return { success: false, message: 'PO number parameter is required.' };

        const cleanPoNum = poNumber.trim().toUpperCase();
        const po = await PurchaseOrder.findOne({ poNumber: new RegExp(cleanPoNum, 'i') }).populate('supplier');

        if (!po) {
          return { success: false, notFound: true, message: `${cleanPoNum} was not found in the CogniYard database.` };
        }

        return {
          success: true,
          action: 'PO_STATUS',
          poNumber: po.poNumber,
          status: po.status,
          supplierName: po.supplierName,
          totalAmount: po.totalAmount,
          items: po.items.map(i => `${i.quantity} x ${i.productName}`),
          details: `Purchase Order ${po.poNumber} assigned to ${po.supplierName} is currently ${po.status} (Total Amount: ₹${po.totalAmount.toLocaleString('en-IN')}).`
        };
      }

      // 5. Get Truck Status (Single or All)
      case 'getTruckStatus':
      case 'getSingleTruck': {
        const simState = yardSimulationService.getState();
        const { truckId } = params;

        if (!truckId) {
          const liveTrucks = simState.trucks || [];
          return {
            success: true,
            action: 'TRUCK_STATUS',
            count: liveTrucks.length,
            trucks: liveTrucks.map(t => ({ truckId: t.truckId, poNumber: t.poNumber, status: t.status, eta: t.eta, yardLocation: t.yardLocation })),
            details: `Yard telemetry tracks ${liveTrucks.length} truck(s). Occupied yard slots: ${simState.yardCapacity.occupied}/${simState.yardCapacity.max}.`
          };
        }

        const cleanTruckId = truckId.trim().toUpperCase();
        let simTruck = simState.trucks.find(t => t.truckId.toUpperCase() === cleanTruckId);

        if (!simTruck && (cleanTruckId === 'TRK-001' || cleanTruckId === 'TRK-1')) {
          simTruck = simState.trucks.find(t => t.truckId === 'TRK-9001');
        }

        if (!simTruck) {
          const mongoTruck = await Truck.findOne({ truckId: new RegExp(`^${cleanTruckId}$`, 'i') });
          if (mongoTruck) {
            simTruck = yardSimulationService.registerTruck(mongoTruck) || mongoTruck;
          }
        }

        if (!simTruck) {
          return { success: false, notFound: true, message: `Truck ${cleanTruckId} was not found in active yard simulation or database log.` };
        }

        return {
          success: true,
          action: 'TRUCK_STATUS',
          truckId: simTruck.truckId,
          status: simTruck.status,
          eta: simTruck.eta || 'N/A',
          yardLocation: simTruck.yardLocation || 'Zone A',
          poNumber: simTruck.poNumber,
          driverName: simTruck.driverName,
          progress: `${simTruck.progress}%`,
          assignedDock: simTruck.assignedDock || 'Unassigned',
          details: `Truck ${simTruck.truckId} (${simTruck.poNumber}) is currently ${simTruck.status} at ${simTruck.yardLocation} with ETA ${simTruck.eta}. Progress: ${simTruck.progress}%. Assigned Dock: ${simTruck.assignedDock || 'None'}.`
        };
      }

      // 6. Get Delayed Trucks
      case 'getDelayedTrucks': {
        const simState = yardSimulationService.getState();
        const delayed = simState.trucks.filter(t => t.status === 'DELAYED');

        if (!delayed || delayed.length === 0) {
          return {
            success: true,
            action: 'DELAYED_TRUCKS',
            count: 0,
            trucks: [],
            details: '🟢 No delayed trucks are currently recorded in the yard simulation telemetry.'
          };
        }

        return {
          success: true,
          action: 'DELAYED_TRUCKS',
          count: delayed.length,
          trucks: delayed.map(t => ({ truckId: t.truckId, poNumber: t.poNumber, eta: t.eta, yardLocation: t.yardLocation, delayReason: t.delayReason })),
          details: `Found ${delayed.length} delayed truck(s): ${delayed.map(t => `${t.truckId} (${t.delayReason || 'Delay'})`).join(', ')}.`
        };
      }

      // 6b. Control Yard Simulation (Requires Human Approval Guard + RBAC)
      case 'controlYardSimulation': {
        if (!['warehouse_manager', 'admin'].includes(userRole)) {
          return {
            success: false,
            message: `Forbidden: User role '${userRole}' is not authorized to control the yard simulation engine.`
          };
        }

        const command = params.command || 'start';
        const speed = params.speed || 1;

        if (!confirmed) {
          return {
            requiresConfirmation: true,
            actionType: 'CONTROL_SIMULATION',
            params: { command, speed },
            confirmationPrompt: `Are you sure you want to ${command.toUpperCase()} the live yard simulation at ${speed}x speed?`
          };
        }

        let updatedState;
        if (command === 'start') updatedState = yardSimulationService.startSimulation(speed);
        else if (command === 'pause') updatedState = yardSimulationService.pauseSimulation();
        else if (command === 'reset') updatedState = await yardSimulationService.resetSimulation();

        return {
          success: true,
          action: 'CONTROL_SIMULATION',
          command,
          speed,
          details: `Yard simulation execution updated: ${command.toUpperCase()} (${speed}x speed).`
        };
      }

      // 6c. Get Dock Status
      case 'getDockStatus': {
        const docks = await Dock.find().sort({ dockNumber: 1 });
        const available = docks.filter(d => d.status === 'AVAILABLE');
        const occupied = docks.filter(d => d.status === 'OCCUPIED');
        return {
          success: true,
          action: 'DOCK_STATUS',
          totalDocks: docks.length,
          availableCount: available.length,
          occupiedCount: occupied.length,
          docks: docks.map(d => ({ dockNumber: d.dockNumber, name: d.name, status: d.status, currentTruckId: d.currentTruckId || 'None' })),
          details: `Yard tracks ${docks.length} dock bays: ${occupied.length} OCCUPIED (${occupied.map(d => `${d.dockNumber} by ${d.currentTruckId || 'Vehicle'}`).join(', ') || 'None'}), ${available.length} AVAILABLE (${available.map(d => d.dockNumber).join(', ')}).`
        };
      }

      // 6d. Get Waiting Trucks
      case 'getWaitingTrucks': {
        const simState = yardSimulationService.getState();
        const waiting = simState.trucks.filter(t => ['WAITING_FOR_DOCK', 'AT_GATE', 'IN_YARD'].includes(t.status));
        return {
          success: true,
          action: 'WAITING_TRUCKS',
          count: waiting.length,
          trucks: waiting.map(t => ({ truckId: t.truckId, poNumber: t.poNumber, status: t.status, eta: t.eta, yardLocation: t.yardLocation })),
          details: waiting.length > 0
            ? `Found ${waiting.length} truck(s) waiting for dock allocation: ${waiting.map(t => `${t.truckId} (${t.status})`).join(', ')}.`
            : '🟢 No trucks are currently waiting for dock assignment.'
        };
      }

      // 6e. Vision AI Tools
      case 'getVisionStatus':
      case 'getCameraStatus':
      case 'getVisionDetections':
      case 'getGateActivity':
      case 'getVehicleCount':
      case 'getYardCongestion':
      case 'getVisionAlerts':
      case 'getUnknownVehicles':
      case 'getDockVisionStatus': {
        const visionService = require('../services/visionService');
        const cameras = await visionService.getCameras();
        const congestion = await visionService.calculateCongestionScore();
        return {
          success: true,
          action: 'VISION_INTELLIGENCE',
          camerasOnline: cameras.filter(c => c.status === 'ONLINE').length,
          totalCameras: cameras.length,
          realVisualObservation: 'CAM-01 currently detects vehicles using TensorFlow.js COCO-SSD pixel inference.',
          businessAssociation: 'Vehicles are associated with active POs (e.g. TRK-1004 / PO-1004) via demo vehicle mapping.',
          congestionScore: congestion.score,
          congestionRisk: congestion.riskLevel,
          primaryCause: congestion.primaryCause,
          recommendedAction: congestion.recommendedAction,
          details: `Smart CCTV System: CAM-01 performs real TensorFlow.js COCO-SSD pixel inference. Vehicle identification uses DEMO VEHICLE ASSOCIATION mapping. Yard Congestion: ${congestion.score}/100 (${congestion.riskLevel}).`
        };
      }

      // 7. Get Smart Dock Recommendation
      case 'recommendDock': {
        const { truckId } = params;
        const truck = await Truck.findOne({ truckId: String(truckId || '').trim().toUpperCase() });
        if (!truck) return { success: false, notFound: true, message: `Truck ${truckId || '(missing ID)'} was not found.` };
        const available = await Dock.find({ status: 'AVAILABLE' });

        if (available.length === 0) {
          return {
            success: true,
            action: 'DOCK_RECOMMENDATION',
            details: 'All dock bays are currently OCCUPIED. Recommendation: Hold incoming truck in Yard Waiting Zone B.'
          };
        }

        const ranked = available.map(dock => {
          const loadCompatible = !dock.suitableLoadTypes?.length || dock.suitableLoadTypes.includes(truck.loadType);
          const score = Math.min(100, 50 + (loadCompatible ? 30 : 0) + (['HIGH', 'URGENT'].includes(truck.priority) ? 15 : 5) + 5);
          return { dock, score, loadCompatible };
        }).sort((left, right) => right.score - left.score || left.dock.dockNumber.localeCompare(right.dock.dockNumber));
        const { dock: topDock, score, loadCompatible } = ranked[0];

        return {
          success: true,
          action: 'DOCK_RECOMMENDATION',
          recommendedDock: topDock.dockNumber,
          score,
          details: `Dock Bay ${topDock.dockNumber} (${topDock.name}) is recommended for ${truck.truckId} with a score of ${score}/100. It is AVAILABLE; load-type compatibility for ${truck.loadType}: ${loadCompatible ? 'YES' : 'NO'}. Priority: ${truck.priority}.`
        };
      }

      // 8. Get Warehouse Receiving Log & Damaged Goods
      case 'getReceivingLog': {
        const receipts = await GoodsReceipt.find().sort({ createdAt: -1 }).limit(5);
        const totalDamaged = receipts.reduce((sum, r) => sum + r.items.reduce((lineSum, item) => lineSum + Number(item.damagedQuantity || 0), 0), 0);

        return {
          success: true,
          action: 'RECEIVING_LOG',
          count: receipts.length,
          totalDamaged,
          receipts: receipts.map(r => ({
            receiptNumber: r.receiptNumber,
            poNumber: r.poNumber,
            receivedQty: r.items.reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0),
            acceptedQty: r.items.reduce((sum, item) => sum + Number(item.acceptedQuantity || 0), 0),
            damagedQty: r.items.reduce((sum, item) => sum + Number(item.damagedQuantity || 0), 0)
          })),
          details: receipts.length > 0 
            ? `Recorded ${receipts.length} recent Goods Receipt(s). Total damaged units identified: ${totalDamaged}.`
            : 'No Goods Receipts recorded yet.'
        };
      }

      // 9. Get Inventory & Stock Alerts
      case 'getInventoryStatus': {
        const items = await Inventory.find();
        const lowStock = items.filter(i => i.quantityOnHand <= 500 || i.availableQuantity <= 500);

        return {
          success: true,
          action: 'INVENTORY_STATUS',
          totalItems: items.length,
          lowStockCount: lowStock.length,
          lowStockItems: lowStock.map(i => ({ sku: i.sku, name: i.productName, stock: i.quantityOnHand })),
          details: `Inventory catalog contains ${items.length} SKUs. ${lowStock.length} item(s) require reorder attention (Stock ≤ 500 units).`
        };
      }

      // 9b. Get Product Inventory Planning Intelligence Detail
      case 'getProductPlanningDetail': {
        const { item, productName, sku } = params;
        const target = item || productName || sku || 'Safety Helmet';

        const mockReq = { params: { id: target } };
        let resultProduct = null;

        const mockRes = {
          status: () => mockRes,
          json: (data) => { if (data.success) resultProduct = data.product; }
        };

        await inventoryPlanning.getPlanningProductById(mockReq, mockRes, () => {});

        if (!resultProduct) {
          return {
            success: false,
            notFound: true,
            message: `Could not find planning intelligence record for '${target}'.`
          };
        }

        const statusIcon = resultProduct.status === 'HEALTHY' ? '🟢'
          : resultProduct.status === 'MONITOR' ? '🟡'
          : resultProduct.status === 'REORDER_RECOMMENDED' ? '🟠'
          : '🔴';

        const detailFormatted = `### ${statusIcon} ${resultProduct.status.replace('_', ' ')} — ${resultProduct.productName} (${resultProduct.sku})

• **Current Stock:** ${resultProduct.currentStock.toLocaleString()} ${resultProduct.unit}
• **Incoming Open PO:** ${resultProduct.incomingPOQuantity.toLocaleString()} ${resultProduct.unit}
• **Average Daily Demand:** ${resultProduct.avgDailyDemand.toLocaleString()} ${resultProduct.unit}/day (${resultProduct.avgMonthlyDemand.toLocaleString()}/month)
• **Reorder Point:** ${resultProduct.reorderPoint.toLocaleString()} ${resultProduct.unit}
• **Safety Stock:** ${resultProduct.safetyStock.toLocaleString()} ${resultProduct.unit}
• **EOQ (Economic Order Quantity):** ${resultProduct.eoq.toLocaleString()} ${resultProduct.unit}
• **Current Days of Supply:** ${resultProduct.daysOfSupply} days (Projected: ${resultProduct.projectedDaysOfSupply} days)

**Recommended Order Quantity:** ${resultProduct.recommendedOrderQuantity > 0 ? `${resultProduct.recommendedOrderQuantity.toLocaleString()} ${resultProduct.unit}` : 'None required at this time'}

**System Analysis:**
${resultProduct.reasonText}`;

        return {
          success: true,
          action: 'PRODUCT_PLANNING_DETAIL',
          product: resultProduct,
          details: detailFormatted
        };
      }

      // 9c. Get Replenishment Recommendations / At Risk Products
      case 'getReplenishmentRecommendations': {
        let allProducts = [];
        const mockReq = {};
        const mockRes = {
          json: (data) => { if (data.success) allProducts = data.products; }
        };

        await inventoryPlanning.getPlanningProducts(mockReq, mockRes, () => {});

        const atRisk = allProducts.filter(p => p.status === 'URGENT_REORDER' || p.status === 'REORDER_RECOMMENDED' || p.status === 'MONITOR');

        if (atRisk.length === 0) {
          return {
            success: true,
            action: 'REPLENISHMENT_RECOMMENDATIONS',
            details: '🟢 All monitored inventory items are in HEALTHY status. No replenishment orders are required at this time.'
          };
        }

        let text = `### 📦 Inventory Planning Replenishment Recommendations\n\n`;
        atRisk.forEach(p => {
          const badge = p.status === 'URGENT_REORDER' ? '🔴 URGENT' : p.status === 'REORDER_RECOMMENDED' ? '🟠 REORDER' : '🟡 MONITOR';
          text += `• **${p.productName}** (${p.sku}): ${badge}\n`;
          text += `  Current Stock: ${p.currentStock.toLocaleString()} | Incoming PO: ${p.incomingPOQuantity.toLocaleString()} | Reorder Point: ${p.reorderPoint.toLocaleString()}\n`;
          text += `  👉 **Recommended Order:** ${p.recommendedOrderQuantity.toLocaleString()} ${p.unit} (EOQ: ${p.eoq.toLocaleString()})\n\n`;
        });

        return {
          success: true,
          action: 'REPLENISHMENT_RECOMMENDATIONS',
          count: atRisk.length,
          atRiskProducts: atRisk,
          details: text
        };
      }

      // 10. Get Invoice Status & 3-Way Discrepancies
      case 'getInvoiceStatus':
      case 'getMismatchedInvoices': {
        const invoices = await Invoice.find().sort({ createdAt: -1 });
        const mismatches = invoices.filter(i => ['MISMATCH', 'MISMATCHED', 'PARTIALLY_MATCHED'].includes(i.matchStatus));

        return {
          success: true,
          action: 'INVOICE_STATUS',
          totalInvoices: invoices.length,
          mismatchCount: mismatches.length,
          mismatches: mismatches.map(i => ({ invoiceNumber: i.invoiceNumber, poNumber: i.poNumber, totalAmount: i.totalAmount, reasons: i.ocrData?.reasons })),
          details: mismatches.length > 0
            ? `Found ${mismatches.length} invoice(s) with 3-Way Match mismatches: ${mismatches.map(i => i.invoiceNumber).join(', ')}.`
            : 'All audited invoices match PO and Goods Receipt records.'
        };
      }

      // 11. Get Payments On Hold
      case 'getPaymentsOnHold': {
        const payments = await Payment.find({ paymentStatus: 'ON_HOLD' });

        return {
          success: true,
          action: 'PAYMENTS_ON_HOLD',
          count: payments.length,
          payments: payments.map(p => ({ paymentNumber: p.paymentNumber, invoiceNumber: p.invoiceNumber, amount: p.amount, supplierName: p.supplierName })),
          details: payments.length > 0
            ? `Found ${payments.length} payment(s) locked ON_HOLD due to 3-Way Match discrepancy (${payments.map(p => p.paymentNumber).join(', ')}).`
            : '🟢 No payments are currently locked on hold.'
        };
      }

      // 12. Get Active Operational Exceptions
      case 'getExceptions': {
        let query = {};
        if (userRole === 'procurement_manager') query.category = 'PROCUREMENT';
        else if (userRole === 'warehouse_manager') query.category = { $in: ['TRUCK', 'DOCK'] };
        else if (userRole === 'finance_user') query.category = 'FINANCE';

        const exceptions = await Exception.find(query).sort({ createdAt: -1 });
        const openEx = exceptions.filter(e => e.status !== 'RESOLVED');

        const criticals = openEx.filter(e => e.severity === 'CRITICAL');
        const warnings = openEx.filter(e => e.severity === 'WARNING');
        const infos = openEx.filter(e => e.severity === 'INFO');

        if (openEx.length === 0) {
          return {
            success: true,
            action: 'EXCEPTION_CENTER',
            details: '🟢 All clear! There are currently no active unresolved operational exceptions detected for your role.'
          };
        }

        let text = `Here are the active issues requiring attention:\n\n`;
        if (criticals.length > 0) text += `🔴 **${criticals.length} Critical Issue(s)**:\n` + criticals.map(c => `  • ${c.title}`).join('\n') + '\n';
        if (warnings.length > 0) text += `🟠 **${warnings.length} Warning(s)**:\n` + warnings.map(w => `  • ${w.title}`).join('\n') + '\n';
        if (infos.length > 0) text += `🔵 **${infos.length} Operational Info(s)**:\n` + infos.map(i => `  • ${i.title}`).join('\n') + '\n';

        const topPriority = criticals[0] || warnings[0];
        if (topPriority) {
          text += `\n**Highest-Priority Issue:** ${topPriority.title} (${topPriority.description})`;
        }

        return {
          success: true,
          action: 'EXCEPTION_CENTER',
          count: openEx.length,
          criticalCount: criticals.length,
          warningCount: warnings.length,
          details: text
        };
      }

      // 13. Get Executive Control Tower Summary
      case 'getControlTowerSummary': {
        const activeTrucks = await Truck.countDocuments({ status: { $ne: 'COMPLETED' } });
        const delayedTrucks = await Truck.countDocuments({ status: 'DELAYED' });
        const openPRs = await PurchaseRequisition.countDocuments({ status: 'PENDING' });
        const pendingPOs = await PurchaseOrder.countDocuments({ status: { $in: ['ISSUED', 'SHIPPED'] } });
        const paymentsOnHold = await Payment.countDocuments({ paymentStatus: 'ON_HOLD' });
        const mismatchInvoices = await Invoice.countDocuments({ matchStatus: { $in: ['MISMATCH', 'MISMATCHED', 'PARTIALLY_MATCHED'] } });

        let healthStatus = '🟢 Stable — Operations functioning cleanly.';
        if (delayedTrucks > 0 || mismatchInvoices > 0) {
          healthStatus = '🔴 Attention Needed — Active operational exceptions detected.';
        } else if (openPRs > 0 || paymentsOnHold > 0) {
          healthStatus = '🟠 Active Tasks — Pending approvals and settlements in queue.';
        }

        const summaryText = `### Executive Supply-Chain Telemetry

🚚 **Yard & Fleet Operations**
${activeTrucks} active truck(s) in yard pipeline (${delayedTrucks} delayed).

📦 **Procurement Pipeline**
${openPRs} Purchase Requisition(s) awaiting approval; ${pendingPOs} PO(s) in fulfillment.

💳 **Finance & Settlement**
${mismatchInvoices} 3-Way Match discrepancy invoice(s); ${paymentsOnHold} payment(s) locked ON_HOLD.

**Overall System Health:** ${healthStatus}`;

        return {
          success: true,
          action: 'CONTROL_TOWER_SUMMARY',
          activeTrucks,
          delayedTrucks,
          openPRs,
          pendingPOs,
          paymentsOnHold,
          details: summaryText
        };
      }

      // 14. Cross-Module Lifecycle Tracing (PR -> PO -> Shipment -> Truck -> Receiving -> Invoice -> Payment)
      case 'tracePoLifecycle': {
        const { poNumber } = params;
        if (!poNumber) return { success: false, message: 'Please specify a PO or Invoice number to trace (e.g. PO-1003 or INV-8802).' };

        let cleanPo = poNumber.trim().toUpperCase();
        let po = await PurchaseOrder.findOne({ poNumber: new RegExp(cleanPo, 'i') });
        if (!po && (cleanPo.startsWith('INV-') || cleanPo.includes('INV'))) {
          const invRecord = await Invoice.findOne({ invoiceNumber: new RegExp(cleanPo, 'i') });
          if (invRecord && invRecord.poNumber) {
            po = await PurchaseOrder.findOne({ poNumber: new RegExp(invRecord.poNumber, 'i') });
          }
        }
        if (!po) return { success: false, notFound: true, message: `${cleanPo} was not found in the CogniYard database.` };

        const truck = await Truck.findOne({ poNumber: new RegExp(po.poNumber, 'i') });
        const gr = await GoodsReceipt.findOne({ poNumber: new RegExp(po.poNumber, 'i') });
        const invoice = await Invoice.findOne({ poNumber: new RegExp(po.poNumber, 'i') });
        const payment = await Payment.findOne({ poNumber: new RegExp(po.poNumber, 'i') });

        let overallStatus = '🟢 SETTLED';
        let overallBadge = 'SETTLED';
        let explanation = '';

        if (payment && payment.paymentStatus === 'PAID') {
          overallStatus = '🟢 SETTLED';
          overallBadge = 'SETTLED';
          explanation = `PO ${po.poNumber} has completed the full procurement-to-payment lifecycle successfully. The invoice (₹${payment.amount.toLocaleString('en-IN')}) matched the Goods Receipt accepted quantity and payment has been processed.`;
        } else if (payment && payment.paymentStatus === 'ON_HOLD') {
          overallStatus = '🟠 PAYMENT ON HOLD';
          overallBadge = 'PAYMENT_ON_HOLD';
          const reason = invoice?.ocrData?.reasons?.[0] || '3-Way Match quantity or amount discrepancy.';
          explanation = `PO ${po.poNumber} payment is locked ON_HOLD because Invoice ${invoice?.invoiceNumber || ''} failed 3-Way Match verification. Discrepancy: ${reason}`;
        } else if (invoice && ['MISMATCH', 'MISMATCHED', 'PARTIALLY_MATCHED'].includes(invoice.matchStatus)) {
          overallStatus = '🔴 MISMATCH';
          overallBadge = 'MISMATCH';
          explanation = `PO ${po.poNumber} invoice (${invoice.invoiceNumber}) failed 3-Way Match verification against Goods Receipt quantities.`;
        } else if (gr) {
          overallStatus = '🔵 GOODS RECEIVED';
          overallBadge = 'GOODS_RECEIVED';
          explanation = `Goods received under ${gr.receiptNumber}. Awaiting supplier invoice submission and 3-Way Match verification.`;
        } else if (truck) {
          overallStatus = '🔵 IN TRANSIT / YARD';
          overallBadge = 'IN_TRANSIT';
          explanation = `Shipment is currently ${truck.status} on Truck ${truck.truckId}. Awaiting warehouse receiving.`;
        } else {
          overallStatus = '🔵 PO ISSUED';
          overallBadge = 'ISSUED';
          explanation = `Purchase Order ${po.poNumber} has been issued to ${po.supplierName}. Awaiting shipment dispatch.`;
        }

        const grText = gr
          ? `${gr.receiptNumber || 'GR-Record'} (Accepted: ${(gr.items?.[0]?.acceptedQuantity || gr.items?.[0]?.receivedQuantity || 0).toLocaleString()} units, Damaged: ${gr.items?.[0]?.damagedQuantity || 0} units)`
          : 'No Goods Receipt has been recorded for this PO yet.';

        const truckText = truck
          ? `${truck.truckId} — ${truck.status} (ETA: ${truck.eta || 'N/A'})`
          : 'No assigned truck recorded.';

        const invoiceText = invoice
          ? `${invoice.invoiceNumber} — Match Status: ${invoice.matchStatus} (Billed: ₹${invoice.totalAmount.toLocaleString('en-IN')})`
          : 'No invoice uploaded yet.';

        const paymentText = payment
          ? `${payment.paymentStatus} — ₹${payment.amount.toLocaleString('en-IN')}`
          : 'No payment record generated yet.';

        const formattedResponse = `### ${po.poNumber} Lifecycle Summary

• **Supplier:** ${po.supplierName}
• **Procurement:** ${po.poNumber} — Status: ${po.status} (Total: ₹${po.totalAmount.toLocaleString('en-IN')})
• **Logistics:** ${truckText}
• **Receiving:** ${grText}
• **Invoice:** ${invoiceText}
• **Payment:** ${paymentText}

**Overall Status:** ${overallStatus}
**Explanation:** ${explanation}`;

        return {
          success: true,
          action: 'TRACE_PO_LIFECYCLE',
          poNumber: po.poNumber,
          poStatus: po.status,
          supplierName: po.supplierName,
          overallStatus: overallBadge,
          details: formattedResponse
        };
      }

      default:
        return { success: false, message: `Unknown tool command: ${toolName}` };
    }
  } catch (err) {
    console.error('Copilot tool execution failed:', { toolName, message: err.message });
    return { success: false, message: 'The requested data action could not be completed. Please retry or contact an administrator.' };
  }
};

// Helper: Extract entity references from chat history
const extractEntityFromContext = (history = [], regex) => {
  for (let i = history.length - 1; i >= 0; i--) {
    const match = history[i].match(regex);
    if (match) return match[0].toUpperCase();
  }
  return null;
};

// --- Fallback Natural Language Intent & Entity Parser ---
const fallbackIntentParser = (message, chatHistory = []) => {
  const msg = message.toLowerCase().trim();

  // Casual greetings
  if (['hello', 'hi', 'hey', 'greetings'].includes(msg)) {
    return {
      intent: 'greeting',
      tool: null,
      params: {},
      replyText: "Hello! I'm ready to help with your supply-chain operations. What would you like to check?"
    };
  }

  if (msg === 'how are you' || msg === 'how are you?' || msg === 'how are you doing') {
    return {
      intent: 'greeting_status',
      tool: null,
      params: {},
      replyText: "I'm doing well and ready to help. You can ask me about procurement, trucks, inventory, invoices, payments, or current exceptions."
    };
  }

  if (['thanks', 'thank you', 'thx', 'awesome', 'great', 'cool', 'okay', 'ok'].includes(msg)) {
    return {
      intent: 'polite_acknowledgment',
      tool: null,
      params: {},
      replyText: "You're welcome! Let me know if you need anything else verified."
    };
  }

  if (msg.includes('help') || msg.includes('capabilities') || msg.includes('what can you do')) {
    return {
      intent: 'help_capabilities',
      tool: null,
      params: {},
      replyText: 'I am equipped with real-time supply chain tools:\n• "Where is TRK-9001?" or "Show delayed trucks"\n• "Which dock should TRK-9003 use?"\n• "Why hasn\'t PO-1003 been paid?"\n• "Show critical exceptions"\n• "Create a PR for 500 safety helmets at ₹250 each"\n• "Executive summary of supply chain"'
    };
  }

  // Cross-Module Tracing Intent ("why hasn't PO-1003 been paid?", "trace PO-1003")
  if ((msg.includes('why') || msg.includes('trace') || msg.includes('paid') || msg.includes('status')) && msg.includes('po-')) {
    const poMatch = message.match(/PO-\d+/i);
    const poNumber = poMatch ? poMatch[0].toUpperCase() : null;
    if (poNumber) {
      return {
        intent: 'trace_po_lifecycle',
        tool: 'tracePoLifecycle',
        params: { poNumber },
        replyText: `Auditing cross-module lifecycle for Purchase Order ${poNumber}...`
      };
    }
  }

  if (
    /\bpr-\d+\b/i.test(message) &&
    (
      (msg.includes('convert') && msg.includes('po')) ||
      (msg.includes('create') && msg.includes('po')) ||
      (msg.includes('issue') && msg.includes('po')) ||
      (msg.includes('approve recommendation') && msg.includes('po'))
    )
  ) {
    const prMatch = message.match(/PR-\d+/i);
    const prNumber = prMatch ? prMatch[0].toUpperCase() : null;
    return {
      intent: 'convert_approved_recommendation_to_purchase_order',
      tool: 'convertApprovedRecommendationToPurchaseOrder',
      params: { prNumber },
      replyText: `Preparing Purchase Order conversion for approved recommendation ${prNumber}.`
    };
  }

  // Follow-up context tracing ("has it been paid?", "why is it on hold?", "trace it")
  if ((msg.includes('paid') || msg.includes('difference') || msg.includes('on hold') || msg.includes('trace')) && (msg.includes('it') || msg.includes('this po') || msg.includes('this invoice'))) {
    const contextPo = extractEntityFromContext(chatHistory, /PO-\d+/i);
    if (contextPo) {
      return {
        intent: 'trace_po_lifecycle',
        tool: 'tracePoLifecycle',
        params: { poNumber: contextPo },
        replyText: `Auditing cross-module lifecycle for previously mentioned ${contextPo}...`
      };
    }
  }

  // PR Creation Intent
  if (msg.includes('need') || msg.includes('buy') || msg.includes('order') || msg.includes('requisition')) {
    const request = parseProcurementRequest(message);
    if (!request.quantity) {
      return {
        intent: 'missing_quantity',
        tool: null,
        params: {},
        replyText: `Please specify the quantity required for ${request.item || 'this item'} (for example: “Order 500 safety helmets at ₹250 each”).`
      };
    }

    if (!request.estimatedPrice) {
      return {
        intent: 'missing_unit_price',
        tool: null,
        params: {},
        replyText: `Quantity ${request.quantity} was found. Please enter the human-approved price per unit too (for example: “Create a PR for ${request.quantity} safety helmets at ₹250 each”).`
      };
    }

    if (!request.item) {
      return {
        intent: 'missing_item',
        tool: null,
        params: {},
        replyText: 'Please specify the exact item or business scope, such as “80 bananas at ₹5 per unit”.'
      };
    }

    return {
      intent: 'prepare_procurement_intelligence',
      tool: 'prepareProcurementIntelligence',
      params: request,
      replyText: `Preparing Procurement Intelligence for ${request.quantity} × ${request.item} at ₹${request.estimatedPrice.toLocaleString('en-IN')} per unit.`
    };
  }

  // Smart Dock Recommendation Intent ("which dock", "dock for TRK-9003")
  if (msg.includes('dock') && (msg.includes('which') || msg.includes('recommend') || msg.includes('use') || msg.includes('best') || msg.includes('available'))) {
    const truckMatch = message.match(/TRK-\d+/i);
    if (!truckMatch) {
      return {
        intent: 'missing_truck_id',
        tool: null,
        params: {},
        replyText: 'Please provide the truck ID for dock recommendation (for example, TRK-9001).'
      };
    }
    const truckId = truckMatch[0].toUpperCase();
    return {
      intent: 'recommend_dock',
      tool: 'recommendDock',
      params: { truckId },
      replyText: `Running Smart Dock Recommendation Engine for Truck ${truckId}...`
    };
  }

  // Exceptions Intent ("exceptions", "what needs attention", "critical problems")
  if (msg.includes('exception') || msg.includes('attention') || msg.includes('critical') || msg.includes('issues') || msg.includes('problem')) {
    return {
      intent: 'get_exceptions',
      tool: 'getExceptions',
      params: {},
      replyText: 'Querying Exception & Alert Center for active operational issues...'
    };
  }

  // Control Tower Summary Intent ("executive summary", "summary", "overview")
  if (msg.includes('summary') || msg.includes('control tower') || msg.includes('overview') || msg.includes('kpi') || msg.includes('picture')) {
    return {
      intent: 'get_control_tower_summary',
      tool: 'getControlTowerSummary',
      params: {},
      replyText: 'Aggregating Executive Control Tower telemetry metrics...'
    };
  }

  // Vision AI / CCTV Intent ("camera", "cctv", "vision", "seeing", "unknown vehicle", "why is the yard congested")
  if (msg.includes('camera') || msg.includes('cctv') || msg.includes('vision') || msg.includes('seeing') || msg.includes('congested') || msg.includes('unknown')) {
    return {
      intent: 'get_vision_status',
      tool: 'getVisionStatus',
      params: {},
      replyText: 'Querying Smart CCTV AI Computer Vision subsystem telemetry and congestion intelligence...'
    };
  }

  // Yard Digital Twin Overview Intent ("what's happening in the yard", "yard state", "yard overview")
  if (msg.includes('yard') && (msg.includes('happening') || msg.includes('right now') || msg.includes('overview') || msg.includes('state') || msg.includes('twin') || msg.includes('schematic'))) {
    return {
      intent: 'get_truck_status',
      tool: 'getTruckStatus',
      params: {},
      replyText: 'Querying live Yard Digital Twin telemetry and active truck queue state...'
    };
  }

  // Follow-up truck context ("is it delayed?", "what's its ETA?", "where is it?")
  if ((msg.includes('eta') || msg.includes('delayed') || msg.includes('where') || msg.includes('status')) && (msg.includes('it') || msg.includes('its') || msg.includes('this truck'))) {
    const contextTruck = extractEntityFromContext(chatHistory, /TRK-\d+/i);
    if (contextTruck) {
      return {
        intent: 'get_single_truck',
        tool: 'getSingleTruck',
        params: { truckId: contextTruck },
        replyText: `Checking status for previously discussed Truck ${contextTruck}...`
      };
    }
  }

  // Delayed Trucks Intent ("trucks late", "late trucks", "delayed trucks")
  if (msg.includes('late') || msg.includes('delayed') || (msg.includes('truck') && msg.includes('delay'))) {
    return {
      intent: 'get_delayed_trucks',
      tool: 'getDelayedTrucks',
      params: {},
      replyText: 'Querying yard logistics engine for delayed shipments...'
    };
  }

  // Specific Invoice / Lifecycle Trace Lookup (e.g. "Trace INV-8802", "Why is INV-8802 on hold?")
  if (msg.includes('inv-')) {
    const invMatch = message.match(/INV-\d+/i);
    const invNumber = invMatch ? invMatch[0].toUpperCase() : null;
    if (invNumber) {
      return {
        intent: 'trace_po_lifecycle',
        tool: 'tracePoLifecycle',
        params: { poNumber: invNumber },
        replyText: `Auditing cross-module lifecycle and 3-way match status for Invoice ${invNumber}...`
      };
    }
  }

  // Mismatched Invoices Intent ("show mismatched invoices")
  if (msg.includes('mismatched') || msg.includes('mismatch')) {
    return {
      intent: 'get_mismatched_invoices',
      tool: 'getMismatchedInvoices',
      params: {},
      replyText: 'Auditing 3-Way Match invoice discrepancies and on-hold records...'
    };
  }

  // Blocking Receiving Intent ("what is blocking receiving?")
  if (msg.includes('blocking') || (msg.includes('receiving') && msg.includes('what'))) {
    return {
      intent: 'get_receiving_log',
      tool: 'getReceivingLog',
      params: {},
      replyText: 'Auditing goods receiving log and operational bottlenecks...'
    };
  }

  // Dock Status & Waiting Trucks Intent ("which docks are occupied", "available docks", "trucks waiting for dock")
  if (msg.includes('waiting') || (msg.includes('truck') && msg.includes('dock'))) {
    return {
      intent: 'get_waiting_trucks',
      tool: 'getWaitingTrucks',
      params: {},
      replyText: 'Checking queue for trucks waiting for dock allocation...'
    };
  }

  if (msg.includes('dock') || msg.includes('bay')) {
    return {
      intent: 'get_dock_status',
      tool: 'getDockStatus',
      params: {},
      replyText: 'Querying yard dock allocation and occupancy telemetry...'
    };
  }

  // Payments On Hold Intent ("payments stuck", "on hold", "payment issues")
  if (msg.includes('payment') || msg.includes('stuck') || msg.includes('on hold')) {
    return {
      intent: 'get_payments_on_hold',
      tool: 'getPaymentsOnHold',
      params: {},
      replyText: 'Auditing AP payments locked ON_HOLD...'
    };
  }

  // Specific PO Lookup
  if (msg.includes('po-')) {
    const poMatch = message.match(/PO-\d+/i);
    if (poMatch) {
      return {
        intent: 'get_po_status',
        tool: 'getPurchaseOrder',
        params: { poNumber: poMatch[0].toUpperCase() },
        replyText: `Checking database for Purchase Order ${poMatch[0].toUpperCase()}...`
      };
    }
  }

  // Specific Truck Lookup
  if (msg.includes('trk-') || msg.includes('truck')) {
    const truckMatch = message.match(/TRK-\d+/i);
    if (!truckMatch) {
      return {
        intent: 'get_truck_status',
        tool: 'getTruckStatus',
        params: {},
        replyText: 'Querying all currently tracked trucks...'
      };
    }
    const truckId = truckMatch[0].toUpperCase();
    return {
      intent: 'get_single_truck',
      tool: 'getSingleTruck',
      params: { truckId },
      replyText: `Querying yard log for Truck ${truckId}...`
    };
  }

  // Supplier Query
  if (msg.includes('supplier') || msg.includes('vendor') || msg.includes('rating') || msg.includes('best')) {
    return {
      intent: 'supplier_recommendation',
      tool: 'compareSuppliers',
      params: {},
      replyText: 'Evaluating active suppliers based on rating, OTD score, and lead times...'
    };
  }

  // Inventory Planning Intelligence Intent Queries
  if (msg.includes('reorder') || msg.includes('eoq') || msg.includes('replenish') || msg.includes('stockout') || msg.includes('demand') || msg.includes('safety stock') || msg.includes('reorder point') || msg.includes('how much stock')) {
    let extractedItem = null;
    if (msg.includes('helmet')) extractedItem = 'Safety Helmet';
    else if (msg.includes('glove')) extractedItem = 'Cut Resistant Gloves';
    else if (msg.includes('vest')) extractedItem = 'Reflective Safety Vest';

    const contextSku = extractEntityFromContext(chatHistory, /SKU-[A-Z0-9-]+/i);
    if (extractedItem || contextSku) {
      return {
        intent: 'get_product_planning_detail',
        tool: 'getProductPlanningDetail',
        params: { item: extractedItem || contextSku },
        replyText: `Evaluating backend inventory planning metrics for ${extractedItem || contextSku}...`
      };
    }

    return {
      intent: 'get_replenishment_recommendations',
      tool: 'getReplenishmentRecommendations',
      params: {},
      replyText: 'Auditing inventory planning replenishment recommendations across all SKUs...'
    };
  }

  // Inventory Query
  if (msg.includes('inventory') || msg.includes('stock') || msg.includes('low') || msg.includes('received')) {
    return {
      intent: 'get_inventory_status',
      tool: 'getInventoryStatus',
      params: {},
      replyText: 'Querying inventory stock logs...'
    };
  }

  return {
    intent: 'general_query',
    tool: null,
    params: {},
    replyText: "I'm ready to help with your supply-chain operations. Ask me about PO lifecycles, delayed trucks, dock recommendations, inventory, 3-way match holds, or current exceptions."
  };
};

exports.chat = async (req, res, next) => {
  try {
    const message = req.body.message || req.body.prompt;
    const confirmed = req.body.confirmed === true;
    const pendingParams = req.body.params;
    const chatHistory = req.body.chatHistory || [];

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'A valid text message is required.' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    let toolResult = null;
    let parsedIntent = null;
    const procurementRequest = parseProcurementRequest(message);
    const aiProvider = procurementRequest.isProcurementIntent
      ? (apiKey ? 'groq_with_deterministic_procurement_validation' : 'deterministic_procurement_engine')
      : (apiKey ? 'groq' : 'local_intent_engine');

    // Handle user confirmation response for state-changing commands
    if (confirmed && pendingParams) {
      const pendingTool = pendingParams.__tool;
      const allowedConfirmedTools = ['prepareProcurementIntelligence', 'convertApprovedRecommendationToPurchaseOrder', 'createPurchaseRequisition', 'approvePurchaseRequisition', 'controlYardSimulation'];
      if (!allowedConfirmedTools.includes(pendingTool)) {
        return res.status(400).json({ success: false, message: 'The pending action is missing or is not confirmable.' });
      }
      const safeParams = { ...pendingParams };
      delete safeParams.__tool;
      toolResult = await executeTool(pendingTool, safeParams, req.user, true);
      return res.json({
        success: toolResult.success !== false,
        userMessage: message,
        intent: `confirmed_${pendingTool}`,
        tool: pendingTool,
        requiresConfirmation: toolResult.requiresConfirmation === true,
        actionType: toolResult.actionType,
        params: toolResult.params,
        reply: toolResult.details || toolResult.message || 'Action completed successfully.',
        toolResult
      });
    }

    if (apiKey && !procurementRequest.isProcurementIntent) {
      try {
        const groqPrompt = `You are the enterprise CogniYard Supply-Chain Copilot. Analyze the request using only the provided text and return a conservative, auditable tool decision.

USER REQUEST:
${JSON.stringify(message)}

Identify the intent and map it to one approved tool when applicable:
Available tools:
1. prepareProcurementIntelligence (params: item, sku, quantity, estimatedPrice, priority, reason)
2. convertApprovedRecommendationToPurchaseOrder (params: prNumber)
3. createPurchaseRequisition (params: item, quantity, estimatedPrice)
4. compareSuppliers (params: category)
5. getPurchaseOrder (params: poNumber)
6. getSingleTruck (params: truckId)
7. getDelayedTrucks (params: none)
8. recommendDock (params: truckId)
9. getInventoryStatus (params: none)
10. getProductPlanningDetail (params: item)
11. getReplenishmentRecommendations (params: none)
12. getInvoiceStatus (params: none)
13. getPaymentsOnHold (params: none)
14. getExceptions (params: none)
15. getControlTowerSummary (params: none)
16. tracePoLifecycle (params: poNumber)

Rules:
- Never invent IDs, quantities, prices, suppliers, operational facts, or results.
- Never infer that an action succeeded; tools perform all real work.
- If a required identifier is absent, return tool null and explain exactly what is missing.
- prepareProcurementIntelligence requires an exact existing Product/SKU, quantity and human-supplied price per unit. Procurement extraction is validated by the server.
- convertApprovedRecommendationToPurchaseOrder requires an approved PR number and uses existing PO conversion logic.
- Keep the explanation concise and professional.

Respond ONLY with valid JSON format:
{
  "intent": "<intent_name>",
  "tool": "<tool_name or null>",
  "params": { ... },
  "explanation": "<short natural response>"
}`;

        const response = await axios.post(
          GROQ_API_URL,
          {
            model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
            messages: [
              { role: 'system', content: 'You are a precise enterprise supply-chain intent classifier. Output JSON only and never fabricate business data.' },
              { role: 'user', content: groqPrompt }
            ],
            temperature: 0
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 8000
          }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedIntent = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (err) {
        console.warn('Groq API unavailable; using the local intent engine:', err.message);
      }
    }

    // Procurement uses a deterministic validation layer so a language model can
    // never shift quantity/price into the item description or invent a rate.
    if (procurementRequest.isProcurementIntent) {
      parsedIntent = fallbackIntentParser(message, chatHistory);
    } else if (!parsedIntent) {
      parsedIntent = fallbackIntentParser(message, chatHistory);
    }

    // Execute backend tool with authenticated user context!
    if (parsedIntent.tool) {
      if (parsedIntent.tool === 'prepareProcurementIntelligence') {
        parsedIntent.params = procurementRequest;
      } else if (parsedIntent.tool === 'createPurchaseRequisition') {
        if (!procurementRequest.estimatedPrice || procurementRequest.estimatedPrice <= 0) {
          return res.json({
            success: true,
            userMessage: message,
            intent: 'missing_unit_price',
            tool: null,
            reply: 'Enter the human-approved price per unit (for example: “100 safety helmets at ₹250 each”). AI will not invent a price.',
            toolResult: null,
            aiProvider
          });
        }
        parsedIntent.params = {
          item: procurementRequest.item,
          quantity: procurementRequest.quantity,
          estimatedPrice: procurementRequest.estimatedPrice
        };
      }
      toolResult = await executeTool(parsedIntent.tool, parsedIntent.params || {}, req.user, confirmed);

      if (toolResult) {
        if (toolResult.requiresConfirmation) {
          return res.json({
            success: true,
            userMessage: message,
            intent: parsedIntent.intent,
            tool: parsedIntent.tool,
            requiresConfirmation: true,
            actionType: toolResult.actionType,
            params: toolResult.params,
            reply: toolResult.confirmationPrompt,
            toolResult
          });
        }

        if (!toolResult.success && toolResult.notFound) {
          parsedIntent.replyText = toolResult.message;
        } else if (!toolResult.success) {
          parsedIntent.replyText = toolResult.message || 'Action could not be completed.';
        } else if (toolResult.details) {
          parsedIntent.replyText = toolResult.details;
        }
      }
    }

    res.json({
      success: true,
      userMessage: message,
      intent: parsedIntent.intent,
      tool: parsedIntent.tool,
      params: parsedIntent.params,
      reply: parsedIntent.replyText || parsedIntent.explanation || 'Request processed.',
      toolResult,
      aiProvider
    });
  } catch (error) {
    next(error);
  }
};
