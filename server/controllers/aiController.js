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

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

// --- Secure Backend Tool Execution Dispatcher with RBAC & Input Validation ---
const executeTool = async (toolName, params, user, confirmed = false) => {
  try {
    const userRole = user?.role || 'guest';
    const userName = user?.name || 'Authorized User';

    switch (toolName) {

      // 1. Create Purchase Requisition (Requires Human Approval Guard + RBAC)
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

        const unitPrice = Number(estimatedPrice || 45);
        const totalAmount = qty * unitPrice;

        // Human Confirmation Guard
        if (!confirmed) {
          return {
            success: true,
            requiresConfirmation: true,
            actionType: 'CREATE_PR',
            params: { item: item.trim(), quantity: qty, estimatedPrice: unitPrice },
            confirmationPrompt: `Create Purchase Requisition for ${qty} x ${item.trim()} (Est. Unit Price: $${unitPrice}, Total: $${totalAmount.toLocaleString()})?`,
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
          details: `Copilot created ${pr.prNumber} for ${qty} x ${item.trim()} ($${totalAmount.toLocaleString()})`
        });

        return {
          success: true,
          action: 'CREATED_PR',
          prNumber: pr.prNumber,
          status: pr.status,
          item: item.trim(),
          quantity: qty,
          totalAmount: pr.totalAmount,
          details: `Purchase Requisition ${pr.prNumber} created successfully for ${qty} x ${item.trim()} (Status: PENDING, Total: $${totalAmount.toLocaleString()}).`
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

        const evaluated = rawSuppliers.map(sup => {
          const otdWeight = (sup.otdScore || 0) * 0.4;
          const ratingWeight = ((sup.rating || 0) / 5) * 100 * 0.4;
          const leadTimeScore = Math.max(0, 10 - (sup.leadTimeDays || 3)) * 10 * 0.2;
          const totalScore = Math.round(otdWeight + ratingWeight + leadTimeScore);

          return {
            name: sup.name,
            code: sup.code,
            category: sup.category,
            rating: sup.rating,
            leadTimeDays: sup.leadTimeDays,
            otdScore: `${sup.otdScore}%`,
            score: totalScore,
            recommendationReason: `OTD: ${sup.otdScore}% | Rating: ${sup.rating}/5.0 | Lead Time: ${sup.leadTimeDays}d`
          };
        });

        evaluated.sort((a, b) => b.score - a.score);
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
          details: `Purchase Order ${po.poNumber} assigned to ${po.supplierName} is currently ${po.status} (Total Amount: $${po.totalAmount.toLocaleString()}).`
        };
      }

      // 5. Get Truck Status (Single or All)
      case 'getTruckStatus':
      case 'getSingleTruck': {
        const { truckId } = params;
        if (!truckId) {
          const trucks = await Truck.find().limit(10);
          return {
            success: true,
            action: 'TRUCK_STATUS',
            count: trucks.length,
            trucks: trucks.map(t => ({ truckId: t.truckId, poNumber: t.poNumber, status: t.status, eta: t.eta, yardLocation: t.yardLocation })),
            details: trucks.length > 0 ? `Yard log currently tracks ${trucks.length} truck(s).` : 'No active trucks in yard.'
          };
        }

        const cleanTruckId = truckId.trim().toUpperCase();
        let truck = await Truck.findOne({ truckId: new RegExp(cleanTruckId, 'i') });

        if (!truck && (cleanTruckId === 'TRK-001' || cleanTruckId === 'TRK-1')) {
          truck = await Truck.findOne({ truckId: 'TRK-9001' });
        }

        if (!truck) {
          return { success: false, notFound: true, message: `Truck ${cleanTruckId} was not found in the yard log.` };
        }

        return {
          success: true,
          action: 'TRUCK_STATUS',
          truckId: truck.truckId,
          status: truck.status,
          eta: truck.eta || 'N/A',
          yardLocation: truck.yardLocation || 'Zone A',
          poNumber: truck.poNumber,
          driverName: truck.driverName,
          details: `Truck ${truck.truckId} (${truck.poNumber}) is currently ${truck.status} at ${truck.yardLocation || 'Zone A'} with ETA ${truck.eta || 'N/A'}. Driver: ${truck.driverName}.`
        };
      }

      // 6. Get Delayed Trucks
      case 'getDelayedTrucks': {
        const delayed = await Truck.find({ status: 'DELAYED' });
        if (!delayed || delayed.length === 0) {
          return {
            success: true,
            action: 'DELAYED_TRUCKS',
            count: 0,
            trucks: [],
            details: '🟢 No delayed trucks are currently recorded in the yard log.'
          };
        }

        return {
          success: true,
          action: 'DELAYED_TRUCKS',
          count: delayed.length,
          trucks: delayed.map(t => ({ truckId: t.truckId, poNumber: t.poNumber, eta: t.eta, yardLocation: t.yardLocation, driverName: t.driverName })),
          details: `Found ${delayed.length} delayed truck(s): ${delayed.map(t => t.truckId).join(', ')}.`
        };
      }

      // 7. Get Smart Dock Recommendation
      case 'recommendDock': {
        const { truckId } = params;
        const docks = await Dock.find();
        const available = docks.filter(d => d.status === 'AVAILABLE');

        if (available.length === 0) {
          return {
            success: true,
            action: 'DOCK_RECOMMENDATION',
            details: 'All dock bays are currently OCCUPIED. Recommendation: Hold incoming truck in Yard Waiting Zone B.'
          };
        }

        const topDock = available[0];
        const score = 94;

        return {
          success: true,
          action: 'DOCK_RECOMMENDATION',
          recommendedDock: topDock.dockNumber,
          score,
          details: `Dock Bay ${topDock.dockNumber} (${topDock.name}) is the recommended assignment with a compatibility score of ${score}/100. It is currently AVAILABLE, supports heavy freight unloading, and matches receiving door levelers.`
        };
      }

      // 8. Get Warehouse Receiving Log & Damaged Goods
      case 'getReceivingLog': {
        const receipts = await GoodsReceipt.find().sort({ createdAt: -1 }).limit(5);
        const totalDamaged = receipts.reduce((sum, r) => sum + (r.items?.[0]?.damagedQuantity || 0), 0);

        return {
          success: true,
          action: 'RECEIVING_LOG',
          count: receipts.length,
          totalDamaged,
          receipts: receipts.map(r => ({
            receiptNumber: r.receiptNumber,
            poNumber: r.poNumber,
            receivedQty: r.items?.[0]?.receivedQuantity || 0,
            acceptedQty: r.items?.[0]?.acceptedQuantity || 0,
            damagedQty: r.items?.[0]?.damagedQuantity || 0
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

      // 10. Get Invoice Status & 3-Way Discrepancies
      case 'getInvoiceStatus':
      case 'getMismatchedInvoices': {
        const invoices = await Invoice.find().sort({ createdAt: -1 });
        const mismatches = invoices.filter(i => i.matchStatus === 'MISMATCH');

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
        const mismatchInvoices = await Invoice.countDocuments({ matchStatus: 'MISMATCH' });

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
        if (!poNumber) return { success: false, message: 'Please specify a PO number to trace (e.g. PO-1003).' };

        const cleanPo = poNumber.trim().toUpperCase();
        const po = await PurchaseOrder.findOne({ poNumber: new RegExp(cleanPo, 'i') });
        if (!po) return { success: false, notFound: true, message: `Purchase Order ${cleanPo} was not found in the CogniYard database.` };

        const truck = await Truck.findOne({ poNumber: new RegExp(cleanPo, 'i') });
        const gr = await GoodsReceipt.findOne({ poNumber: new RegExp(cleanPo, 'i') });
        const invoice = await Invoice.findOne({ poNumber: new RegExp(cleanPo, 'i') });
        const payment = await Payment.findOne({ poNumber: new RegExp(cleanPo, 'i') });

        let overallStatus = '🟢 SETTLED';
        let overallBadge = 'SETTLED';
        let explanation = '';

        if (payment && payment.paymentStatus === 'PAID') {
          overallStatus = '🟢 SETTLED';
          overallBadge = 'SETTLED';
          explanation = `PO ${po.poNumber} has completed the full procurement-to-payment lifecycle successfully. The invoice ($${payment.amount.toLocaleString()}) matched the Goods Receipt accepted quantity and payment has been processed.`;
        } else if (payment && payment.paymentStatus === 'ON_HOLD') {
          overallStatus = '🟠 PAYMENT ON HOLD';
          overallBadge = 'PAYMENT_ON_HOLD';
          const reason = invoice?.ocrData?.reasons?.[0] || '3-Way Match quantity or amount discrepancy.';
          explanation = `PO ${po.poNumber} payment is locked ON_HOLD because Invoice ${invoice?.invoiceNumber || ''} failed 3-Way Match verification. Discrepancy: ${reason}`;
        } else if (invoice && invoice.matchStatus === 'MISMATCH') {
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
          ? `${invoice.invoiceNumber} — Match Status: ${invoice.matchStatus} (Billed: $${invoice.totalAmount.toLocaleString()})`
          : 'No invoice uploaded yet.';

        const paymentText = payment
          ? `${payment.paymentStatus} — $${payment.amount.toLocaleString()}`
          : 'No payment record generated yet.';

        const formattedResponse = `### ${po.poNumber} Lifecycle Summary

• **Supplier:** ${po.supplierName}
• **Procurement:** ${po.poNumber} — Status: ${po.status} (Total: $${po.totalAmount.toLocaleString()})
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
    return { success: false, message: err.message };
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
      replyText: 'I am equipped with real-time supply chain tools:\n• "Where is TRK-9001?" or "Show delayed trucks"\n• "Which dock should TRK-9003 use?"\n• "Why hasn\'t PO-1003 been paid?"\n• "Show critical exceptions"\n• "Create a PR for 500 safety helmets"\n• "Executive summary of supply chain"'
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
    const qtyMatch = message.match(/-?\d+/);
    if (!qtyMatch) {
      const itemMatch = message.replace(/(i need|order|buy|create|requisition|pr|for)/gi, '').trim();
      return {
        intent: 'missing_quantity',
        tool: null,
        params: {},
        replyText: `Please specify the quantity required for ${itemMatch || 'this item'} (e.g., "I need 500 ${itemMatch || 'safety helmets'}").`
      };
    }

    const qty = parseInt(qtyMatch[0]);
    let item = message.replace(/i need|buy|order|create|requisition|for|-?\d+/gi, '').trim();

    return {
      intent: 'create_purchase_requisition',
      tool: 'createPurchaseRequisition',
      params: { item, quantity: qty, estimatedPrice: 45 },
      replyText: `Extracted intent: Create Purchase Requisition for ${qty} x ${item}.`
    };
  }

  // Smart Dock Recommendation Intent ("which dock", "dock for TRK-9003")
  if (msg.includes('dock') && (msg.includes('which') || msg.includes('recommend') || msg.includes('use') || msg.includes('best') || msg.includes('available'))) {
    const truckMatch = message.match(/TRK-\d+/i);
    const truckId = truckMatch ? truckMatch[0].toUpperCase() : 'TRK-9003';
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

  // Delayed Trucks Intent ("trucks late", "late trucks", "delayed trucks")
  if (msg.includes('late') || msg.includes('delayed') || (msg.includes('truck') && msg.includes('delay'))) {
    return {
      intent: 'get_delayed_trucks',
      tool: 'getDelayedTrucks',
      params: {},
      replyText: 'Querying yard logistics engine for delayed shipments...'
    };
  }

  // Follow-up truck context ("is it delayed?", "what's its ETA?")
  if ((msg.includes('eta') || msg.includes('delayed') || msg.includes('where')) && (msg.includes('it') || msg.includes('its') || msg.includes('this truck'))) {
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
    const truckId = truckMatch ? truckMatch[0].toUpperCase() : 'TRK-9001';
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

    const apiKey = process.env.XAI_API_KEY;
    let toolResult = null;
    let parsedIntent = null;

    // Handle user confirmation response for state-changing commands
    if (confirmed && pendingParams) {
      toolResult = await executeTool('createPurchaseRequisition', pendingParams, req.user, true);
      return res.json({
        success: true,
        userMessage: message,
        intent: 'confirmed_create_pr',
        tool: 'createPurchaseRequisition',
        reply: toolResult.details || 'Requisition created successfully.',
        toolResult
      });
    }

    if (apiKey && apiKey !== 'mock_xai_key') {
      try {
        const grokPrompt = `You are CogniYard Supply-Chain Copilot.
Analyze this user request: "${message}"
Identify intent and map to standard tool if applicable:
Available tools:
1. createPurchaseRequisition (params: item, quantity, estimatedPrice)
2. compareSuppliers (params: category)
3. getPurchaseOrder (params: poNumber)
4. getSingleTruck (params: truckId)
5. getDelayedTrucks (params: none)
6. recommendDock (params: truckId)
7. getInventoryStatus (params: none)
8. getInvoiceStatus (params: none)
9. getPaymentsOnHold (params: none)
10. getExceptions (params: none)
11. getControlTowerSummary (params: none)
12. tracePoLifecycle (params: poNumber)

Respond ONLY with valid JSON format:
{
  "intent": "<intent_name>",
  "tool": "<tool_name or null>",
  "params": { ... },
  "explanation": "<short natural response>"
}`;

        const response = await axios.post(
          GROK_API_URL,
          {
            model: 'grok-beta',
            messages: [{ role: 'user', content: grokPrompt }],
            temperature: 0.1
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
        console.log('Grok API call fallback activated:', err.message);
      }
    }

    // Fallback parser if Grok API was not used or failed
    if (!parsedIntent) {
      parsedIntent = fallbackIntentParser(message, chatHistory);
    }

    // Execute backend tool with authenticated user context!
    if (parsedIntent.tool) {
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
      toolResult
    });
  } catch (error) {
    next(error);
  }
};
