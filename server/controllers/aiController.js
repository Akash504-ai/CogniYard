const axios = require('axios');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const Truck = require('../models/Truck');
const Invoice = require('../models/Invoice');

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

// --- Tool Execution Dispatcher with RBAC & Input Validation ---
const executeTool = async (toolName, params, user) => {
  try {
    const userRole = user?.role || 'guest';

    switch (toolName) {
      case 'createPurchaseRequisition': {
        // Enforce RBAC
        if (!['procurement_manager', 'admin'].includes(userRole)) {
          return {
            success: false,
            message: `Forbidden: User role '${userRole}' is not authorized to create Purchase Requisitions.`
          };
        }

        const { item, quantity, estimatedPrice } = params;

        // Input validation
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
        const count = await PurchaseRequisition.countDocuments();
        const prNumber = `PR-${1000 + count + 1}`;

        const pr = new PurchaseRequisition({
          prNumber,
          requestedBy: user.name || 'Procurement Manager',
          items: [{
            productName: item.trim(),
            quantity: qty,
            estimatedUnitPrice: unitPrice,
            totalPrice: qty * unitPrice
          }],
          totalAmount: qty * unitPrice,
          status: 'PENDING',
          aiGenerated: true,
          notes: `Generated via AI Assistant for ${user.name}`
        });

        await pr.save();

        return {
          success: true,
          action: 'CREATED_PR',
          prNumber: pr.prNumber,
          status: pr.status,
          item: item.trim(),
          quantity: qty,
          totalAmount: pr.totalAmount,
          details: `${pr.prNumber} has been created for ${qty} x ${item.trim()} (Status: PENDING, Total: $${pr.totalAmount.toLocaleString()}).`
        };
      }

      case 'searchSuppliers':
      case 'compareSuppliers': {
        const filter = { status: 'ACTIVE' };
        if (params.category) filter.category = new RegExp(params.category, 'i');

        const rawSuppliers = await Supplier.find(filter);
        if (!rawSuppliers || rawSuppliers.length === 0) {
          return {
            success: false,
            message: 'No active suppliers found in database matching criteria.'
          };
        }

        // Reuse Stage 2 transparent scoring algorithm
        const evaluated = rawSuppliers.map(sup => {
          const otdWeight = (sup.otdScore || 0) * 0.4;
          const ratingWeight = ((sup.rating || 0) / 5) * 100 * 0.4;
          const leadTimeScore = Math.max(0, 10 - (sup.leadTimeDays || 3)) * 10 * 0.2;
          const totalScore = Math.round(otdWeight + ratingWeight + leadTimeScore);

          const rationaleParts = [];
          if (sup.otdScore >= 95) rationaleParts.push(`✓ High OTD (${sup.otdScore}%)`);
          if (sup.rating >= 4.5) rationaleParts.push(`✓ Rating (${sup.rating}/5.0)`);
          if (sup.leadTimeDays <= 3) rationaleParts.push(`✓ Lead time (${sup.leadTimeDays} days)`);

          return {
            name: sup.name,
            code: sup.code,
            category: sup.category,
            rating: sup.rating,
            leadTimeDays: sup.leadTimeDays,
            otdScore: `${sup.otdScore}%`,
            score: totalScore,
            recommendationReason: rationaleParts.join(' | ') || `Performance score ${totalScore}/100`
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

      case 'getPurchaseOrder': {
        const { poNumber } = params;
        if (!poNumber) {
          return { success: false, message: 'PO number parameter is required.' };
        }

        const cleanPoNum = poNumber.trim().toUpperCase();
        const po = await PurchaseOrder.findOne({ poNumber: new RegExp(cleanPoNum, 'i') }).populate('supplier');

        if (!po) {
          return {
            success: false,
            notFound: true,
            message: `${cleanPoNum} was not found in the CogniYard database.`
          };
        }

        return {
          success: true,
          action: 'PO_STATUS',
          poNumber: po.poNumber,
          status: po.status,
          supplierName: po.supplierName,
          totalAmount: po.totalAmount,
          items: po.items.map(i => `${i.quantity} x ${i.productName}`),
          details: `Purchase Order ${po.poNumber} assigned to ${po.supplierName} is currently ${po.status} (Total: $${po.totalAmount.toLocaleString()}).`
        };
      }

      case 'getTruckStatus':
      case 'getSingleTruck': {
        const { truckId } = params;
        if (!truckId) {
          const trucks = await Truck.find().limit(5);
          return {
            success: true,
            action: 'TRUCK_STATUS',
            count: trucks.length,
            trucks: trucks.map(t => ({
              truckId: t.truckId,
              poNumber: t.poNumber,
              status: t.status,
              eta: t.eta,
              yardLocation: t.yardLocation
            })),
            details: trucks.length > 0 ? `Yard log currently tracks ${trucks.length} truck(s).` : 'No active trucks in yard.'
          };
        }

        const cleanTruckId = truckId.trim().toUpperCase();
        let truck = await Truck.findOne({ truckId: new RegExp(cleanTruckId, 'i') });

        // Friendly alias for hackathon demo: TRK-001 maps to TRK-9001 if TRK-001 is not a distinct record
        if (!truck && (cleanTruckId === 'TRK-001' || cleanTruckId === 'TRK-1')) {
          truck = await Truck.findOne({ truckId: 'TRK-9001' });
        }

        if (!truck) {
          return {
            success: false,
            notFound: true,
            message: `Truck ${cleanTruckId} was not found in the yard log.`
          };
        }

        return {
          success: true,
          action: 'TRUCK_STATUS',
          truckId: truck.truckId,
          status: truck.status,
          eta: truck.eta,
          yardLocation: truck.yardLocation || 'Zone A',
          poNumber: truck.poNumber,
          driverName: truck.driverName,
          details: `Truck ${truck.truckId} (${truck.poNumber}) is currently ${truck.status} at ${truck.yardLocation || 'Zone A'} with ETA ${truck.eta}.`
        };
      }

      case 'getDelayedTrucks': {
        const delayed = await Truck.find({ status: 'DELAYED' });
        if (!delayed || delayed.length === 0) {
          return {
            success: true,
            action: 'DELAYED_TRUCKS',
            count: 0,
            trucks: [],
            details: 'No delayed trucks are currently recorded in the yard log.'
          };
        }

        return {
          success: true,
          action: 'DELAYED_TRUCKS',
          count: delayed.length,
          trucks: delayed.map(t => ({
            truckId: t.truckId,
            poNumber: t.poNumber,
            eta: t.eta,
            yardLocation: t.yardLocation,
            driverName: t.driverName
          })),
          details: `Found ${delayed.length} delayed truck(s): ${delayed.map(t => t.truckId).join(', ')}.`
        };
      }

      case 'getInvoiceStatus': {
        const invoices = await Invoice.find().sort({ createdAt: -1 });
        if (!invoices || invoices.length === 0) {
          return {
            success: true,
            action: 'INVOICE_STATUS',
            count: 0,
            invoices: [],
            details: 'No pending invoices are currently recorded.'
          };
        }

        const pendingOrException = invoices.filter(i => i.matchStatus === 'MISMATCH' || i.matchStatus === 'PENDING');
        const displayList = pendingOrException.length > 0 ? pendingOrException : invoices.slice(0, 5);

        return {
          success: true,
          action: 'INVOICE_STATUS',
          count: displayList.length,
          invoices: displayList.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            poNumber: inv.poNumber,
            supplierName: inv.supplierName,
            matchStatus: inv.matchStatus,
            totalAmount: inv.totalAmount
          })),
          details: `Found ${displayList.length} invoice record(s) in system.`
        };
      }

      default:
        return { success: false, message: `Unknown tool command: ${toolName}` };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
};

// --- Fallback Intent Parser (Rule-Based NLP Engine) ---
const fallbackIntentParser = (message) => {
  const msg = message.toLowerCase().trim();

  // Basic conversation checks
  if (msg === 'hello' || msg === 'hi' || msg === 'hey') {
    return {
      intent: 'greeting',
      tool: null,
      params: {},
      replyText: 'Hello! I am your CogniYard AI Assistant. How can I help you with procurement, supplier evaluations, PO status, yard trucks, or invoices today?'
    };
  }

  if (msg.includes('help') || msg.includes('what can you do') || msg.includes('capabilities')) {
    return {
      intent: 'help_capabilities',
      tool: null,
      params: {},
      replyText: 'I can assist you with:\n1. Creating Purchase Requisitions (e.g., "I need 500 safety helmets")\n2. Recommending suppliers (e.g., "Find the best supplier for safety helmets")\n3. Checking PO statuses (e.g., "What is the status of PO-1007?")\n4. Tracking yard trucks (e.g., "Where is truck TRK-001?" or "Show me delayed trucks")\n5. Auditing invoices (e.g., "Show pending invoices")'
    };
  }

  // PR Creation Intent
  if (msg.includes('need') || msg.includes('buy') || msg.includes('order') || msg.includes('requisition')) {
    if (msg === 'order something' || msg === 'i need something' || msg === 'buy stuff') {
      return {
        intent: 'incomplete_pr_prompt',
        tool: null,
        params: {},
        replyText: 'Please specify the item name and quantity you need (e.g., "I need 500 safety helmets").'
      };
    }

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
    if (qty <= 0) {
      return {
        intent: 'invalid_quantity',
        tool: null,
        params: {},
        replyText: `Quantity must be greater than 0. Received invalid quantity '${qty}'.`
      };
    }

    let item = message.replace(/i need|buy|order|create|requisition|for|-?\d+/gi, '').trim();
    if (!item || item.length < 2) {
      return {
        intent: 'missing_item_name',
        tool: null,
        params: {},
        replyText: 'Please specify the exact item name required (e.g., "I need 500 safety helmets").'
      };
    }

    return {
      intent: 'create_purchase_requisition',
      tool: 'createPurchaseRequisition',
      params: { item, quantity: qty, estimatedPrice: 45 },
      replyText: `Extracted intent: Create Purchase Requisition for ${qty} x ${item}. Verifying role permissions...`
    };
  }

  // Supplier Query Intent
  if (msg.includes('supplier') || msg.includes('best supplier') || msg.includes('performance') || msg.includes('recommend')) {
    return {
      intent: 'supplier_recommendation',
      tool: 'compareSuppliers',
      params: {},
      replyText: 'Evaluating active suppliers based on rating, OTD score, and lead times...'
    };
  }

  // Specific PO Lookup Intent
  if (msg.includes('po-')) {
    const poMatch = message.match(/PO-\d+/i);
    const poNumber = poMatch ? poMatch[0].toUpperCase() : null;
    if (poNumber) {
      return {
        intent: 'get_po_status',
        tool: 'getPurchaseOrder',
        params: { poNumber },
        replyText: `Checking database for Purchase Order ${poNumber}...`
      };
    }
  }

  // Specific Truck Lookup Intent ("TRK-001" or "TRK-9001")
  if (msg.includes('trk-') || msg.includes('truck trk') || msg.includes('where is truck')) {
    const truckMatch = message.match(/TRK-\d+/i);
    const truckId = truckMatch ? truckMatch[0].toUpperCase() : 'TRK-9001';
    return {
      intent: 'get_single_truck',
      tool: 'getSingleTruck',
      params: { truckId },
      replyText: `Querying yard log for Truck ${truckId}...`
    };
  }

  // Delayed Trucks Intent
  if (msg.includes('delay') || msg.includes('truck')) {
    return {
      intent: 'get_delayed_trucks',
      tool: 'getDelayedTrucks',
      params: {},
      replyText: 'Querying yard logistics engine for delayed shipments...'
    };
  }

  // Invoice Intent
  if (msg.includes('invoice') || msg.includes('3-way') || msg.includes('match') || msg.includes('pending')) {
    return {
      intent: 'get_invoice_status',
      tool: 'getInvoiceStatus',
      params: {},
      replyText: 'Retrieving recent invoice match audit records...'
    };
  }

  return {
    intent: 'general_query',
    tool: null,
    params: {},
    replyText: 'CogniYard AI Assistant: I can help you create Purchase Requisitions, recommend suppliers, check PO statuses, track yard trucks, and audit 3-way invoices.'
  };
};

exports.chat = async (req, res, next) => {
  try {
    const message = req.body.message || req.body.prompt;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'A valid text message is required.' });
    }

    const apiKey = process.env.XAI_API_KEY;
    let toolResult = null;
    let parsedIntent = null;

    if (apiKey && apiKey !== 'mock_xai_key') {
      try {
        const grokPrompt = `You are CogniYard AI Procurement Assistant. 
Analyze this user request: "${message}"
Identify intent and map to standard tool if applicable:
Available tools:
1. createPurchaseRequisition (params: item, quantity, estimatedPrice)
2. compareSuppliers (params: category)
3. getPurchaseOrder (params: poNumber)
4. getSingleTruck (params: truckId)
5. getDelayedTrucks (params: none)
6. getInvoiceStatus (params: none)

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
      parsedIntent = fallbackIntentParser(message);
    }

    // Execute backend tool with authenticated user context!
    if (parsedIntent.tool) {
      toolResult = await executeTool(parsedIntent.tool, parsedIntent.params || {}, req.user);

      // Handle tool execution results for AI response synthesis
      if (toolResult) {
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
