const crypto = require('crypto');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const Shipment = require('../models/Shipment');
const Truck = require('../models/Truck');
const AuditLog = require('../models/AuditLog');
const inventoryPlanning = require('../controllers/inventoryPlanningController');
const { evaluateSupplierDocuments, createRequisitionRecord, createPurchaseOrder } = require('../controllers/procurementController');

const normalizeText = value => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokenize = value => normalizeText(value)
  .split(' ')
  .filter(token => token.length > 1)
  .map(token => token.endsWith('s') ? token.slice(0, -1) : token);

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

async function resolveProduct(request) {
  const requestedSku = String(request.sku || '').trim().toUpperCase();
  const requestedItem = String(request.item || request.productName || '').trim();

  if (requestedSku) {
    const product = await Product.findOne({ sku: requestedSku });
    if (product) return { product, confidence: 1, reason: 'Exact SKU match' };
  }

  if (!requestedItem) return null;

  const products = await Product.find().populate('preferredSupplier');
  const itemTokens = tokenize(requestedItem);
  if (itemTokens.length === 0) return null;

  const scored = products.map(product => {
    const haystack = normalizeText(`${product.sku} ${product.name} ${product.description || ''} ${product.category || ''}`);
    const haystackTokens = new Set(tokenize(haystack));
    const matchedTokens = itemTokens.filter(token => haystackTokens.has(token) || haystack.includes(token));
    const exactName = normalizeText(product.name) === normalizeText(requestedItem);
    const score = exactName ? 1 : matchedTokens.length / itemTokens.length;
    return { product, score, matchedTokens };
  }).sort((left, right) => right.score - left.score);

  const best = scored[0];
  const runnerUp = scored[1];
  if (!best || best.score < 0.6) return null;
  if (runnerUp && best.score < 0.9 && best.score - runnerUp.score < 0.2) return null;

  return {
    product: best.product,
    confidence: Number(best.score.toFixed(2)),
    reason: `Matched ${best.matchedTokens.length}/${itemTokens.length} product tokens`
  };
}

async function getSupplierIntelligence() {
  const supplier = await Supplier.findOne({
    status: 'ACTIVE',
    code: 'SUP-DEMO'
  });

  if (!supplier) {
    return null;
  }

  const evaluated = evaluateSupplierDocuments([supplier]);
  const top = evaluated[0];

  if (!top) return null;

  return {
    topSupplier: top,
    candidates: [top],
    rationale: `${top.name} is the AI-preferred supplier with supplier score ${top.score}/100 using OTD ${top.otdScore}%, rating ${top.rating}/5, and ${top.leadTimeDays} day lead time.`
  };
}

async function getPlanningValidation(product, quantity) {
  try {
    const planning = await inventoryPlanning.computeProductPlanningData(product);
    if (!planning || !planning.eoq || planning.eoq <= 0) {
      return {
        available: false,
        message: 'EOQ validation unavailable',
        recommendation: 'Proceed with the requested quantity after human review. No EOQ value was available to compare.'
      };
    }

    const ratio = quantity / planning.eoq;
    const comparison = ratio > 1.25
      ? 'ABOVE_EOQ'
      : ratio < 0.75
        ? 'BELOW_EOQ'
        : 'ALIGNED_WITH_EOQ';
    const recommendation = comparison === 'ABOVE_EOQ'
      ? `Requested quantity is above EOQ ${planning.eoq.toLocaleString('en-IN')}; keep ${quantity.toLocaleString('en-IN')} only if the business urgency justifies the larger buy.`
      : comparison === 'BELOW_EOQ'
        ? `Requested quantity is below EOQ ${planning.eoq.toLocaleString('en-IN')}; preserve the request but consider consolidation if timing allows.`
        : `Requested quantity is aligned with EOQ ${planning.eoq.toLocaleString('en-IN')}.`;

    return {
      available: true,
      eoq: planning.eoq,
      requestedQuantity: quantity,
      comparison,
      status: planning.status,
      currentStock: planning.currentStock,
      reorderPoint: planning.reorderPoint,
      recommendedOrderQuantity: planning.recommendedOrderQuantity,
      recommendation
    };
  } catch (error) {
    return {
      available: false,
      message: 'EOQ validation unavailable',
      recommendation: 'Proceed with the requested quantity after human review. Planning data could not be loaded.'
    };
  }
}

function buildIntelligenceId(params) {
  const stable = [
    params.productId,
    params.supplierId,
    params.quantity,
    params.estimatedPrice,
    params.priority,
    normalizeText(params.reason)
  ].join('|');
  return crypto.createHash('sha256').update(stable).digest('hex').slice(0, 16);
}

async function buildProcurementPreview(request) {
  const item = String(request.item || '').trim();
  const quantity = Number(request.quantity);
  const estimatedPrice = Number(request.estimatedPrice ?? request.unitPrice);

  if (!quantity || quantity <= 0) {
    return { success: false, message: `Please specify the quantity required for ${item || 'this item'}.` };
  }
  if (!Number.isFinite(estimatedPrice) || estimatedPrice <= 0) {
    return { success: false, message: `Quantity ${quantity.toLocaleString('en-IN')} was found. Please enter the human-approved unit price too.` };
  }

  const resolved = await resolveProduct(request);

  const product = resolved?.product || {
    _id: null,
    name: item,
    sku: request.sku || `CUSTOM-${normalizeText(item).replace(/\s+/g, '-').toUpperCase()}`,
    description: '',
    category: 'GENERAL'
  };

  const resolutionReason = resolved
    ? resolved.reason
    : 'User-entered product name; no existing Product/SKU record was required.';

  const supplierIntelligence = await getSupplierIntelligence();
  if (!supplierIntelligence?.topSupplier) {
    return { success: false, message: 'No active suppliers are available for recommendation. Add or activate a supplier first.' };
  }

  const topSupplier = supplierIntelligence.topSupplier;

  const priority = request.priority || 'MEDIUM';
  const reason = request.reason || '';
  const estimatedTotalValue = Number((quantity * estimatedPrice).toFixed(2));
  const planningValidation = product._id
    ? await getPlanningValidation(product, quantity)
    : {
      available: false,
      message: 'Product planning data unavailable for a new user-entered product.',
      recommendation: 'Proceed with the requested quantity after human review.'
    };
  const supplierId = topSupplier._id || topSupplier.id || null;

  const executionParams = {
    item: product.name,
    productId: product._id ? product._id.toString() : null,
    sku: product.sku,
    quantity,
    estimatedPrice,
    priority,
    reason,
    supplierId: supplierId ? supplierId.toString() : null,
    supplierName: topSupplier.name
  };
  const intelligenceId = buildIntelligenceId(executionParams);

  return {
    success: true,
    action: 'PROCUREMENT_INTELLIGENCE_PREVIEW',
    procurementPreview: {
      intelligenceId,
      requirement: {
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice: estimatedPrice,
        priority,
        estimatedTotalValue,
        reason: reason || 'Not provided',
        resolution: resolutionReason
      },
      supplierIntelligence: {
        topSupplier,
        candidates: supplierIntelligence.candidates,
        rationale: supplierIntelligence.rationale
      },
      planningValidation
    },
    params: { ...executionParams, intelligenceId },
    confirmationPrompt: 'Approve Procurement Recommendation',
    details: `Procurement Intelligence preview ready for ${quantity.toLocaleString('en-IN')} x ${product.name} at ${money(estimatedPrice)} each. Recommended supplier: ${topSupplier.name}.`
  };
}

async function createPrFromRecommendation(params, user) {
  let product = params.productId ? await Product.findById(params.productId) : null;

  if (!product) {
    product = {
      _id: null,
      name: String(params.item || '').trim(),
      sku: params.sku || `CUSTOM-${normalizeText(params.item).replace(/\s+/g, '-').toUpperCase()}`
    };
  }

  if (!product.name) {
    return { success: false, message: 'Product name is required.' };
  }

  // Use the supplier selected during preview.
  // If the ID is missing, fall back to the supplier name.
  let supplier = null;

  if (params.supplierId) {
    try {
      supplier = await Supplier.findById(params.supplierId);
    } catch (error) {
      supplier = null;
    }
  }

  if (!supplier && params.supplierName) {
    supplier = await Supplier.findOne({
      name: String(params.supplierName).trim()
    });
  }

  // Final fallback: use the first active supplier.
  if (!supplier) {
    supplier = await Supplier.findOne({ status: 'ACTIVE' });
  }

  if (!supplier) {
    return {
      success: false,
      message: 'No supplier is available for this procurement request.'
    };
  }

  const quantity = Number(params.quantity);
  const estimatedPrice = Number(params.estimatedPrice);

  if (
    !quantity ||
    quantity <= 0 ||
    !Number.isFinite(estimatedPrice) ||
    estimatedPrice <= 0
  ) {
    return {
      success: false,
      message: 'The confirmed procurement recommendation has invalid quantity or price. Please run it again.'
    };
  }

  const intelligenceId = params.intelligenceId || buildIntelligenceId({
    productId: product._id ? product._id.toString() : null,
    supplierId: supplier._id.toString(),
    quantity,
    estimatedPrice,
    priority: params.priority || 'MEDIUM',
    reason: params.reason || ''
  });

  const existing = await PurchaseRequisition.findOne({
    aiGenerated: true,
    notes: new RegExp(`AI_INTEL_ID:${intelligenceId}`)
  });

  if (existing) {
    return {
      success: true,
      action: 'CREATED_PR',
      duplicateSuppressed: true,
      prNumber: existing.prNumber,
      status: existing.status,
      supplierName: existing.recommendedSupplierName || supplier.name,
      details: `Purchase Requisition ${existing.prNumber} already exists for this approved recommendation. Duplicate creation was skipped.`
    };
  }

  const planningValidation = product._id
    ? await getPlanningValidation(product, quantity)
    : {
      available: false,
      message: 'Product planning data unavailable for a new user-entered product.',
      recommendation: 'Proceed with the requested quantity after human review.'
    };

  const notes = [
    `AI_INTEL_ID:${intelligenceId}`,
    'Created from Copilot Procurement Intelligence recommendation.',
    `Recommended supplier: ${supplier.name}${supplier.code ? ` (${supplier.code})` : ''}`,
    params.reason ? `Business reason: ${params.reason}` : '',
    planningValidation.available
      ? `EOQ checked: ${planningValidation.eoq}`
      : 'EOQ validation unavailable'
  ].filter(Boolean).join('\n');

  const requisition = await createRequisitionRecord({
    items: [{
      product: product._id || undefined,
      productName: product.name,
      quantity,
      estimatedUnitPrice: estimatedPrice
    }],
    priority: params.priority || 'MEDIUM',
    recommendedSupplier: supplier._id,
    recommendedSupplierName: supplier.name,
    businessReason: params.reason || '',
    notes
  }, user, {
    aiGenerated: true,
    auditAction: 'PR_CREATED_FROM_PROCUREMENT_INTELLIGENCE',
    auditDetails: `Approved Copilot recommendation ${intelligenceId}; created PR for ${quantity} x ${product.name} with recommended supplier ${supplier.name}.`
  });

  await AuditLog.create({
    user: user?.name || 'System',
    role: user?.role || 'procurement_manager',
    action: 'PROCUREMENT_INTELLIGENCE_APPROVED',
    entity: 'PurchaseRequisition',
    entityId: requisition.prNumber,
    details: `Human approved Copilot recommendation ${intelligenceId}.`
  });

  return {
    success: true,
    action: 'CREATED_PR',
    prNumber: requisition.prNumber,
    status: requisition.status,
    supplierName: supplier.name,
    totalAmount: requisition.totalAmount,
    lifecycleSummary: {
      prNumber: requisition.prNumber,
      poNumber: null,
      shipmentNumber: null,
      truckId: null,
      nextStep: 'Approve this PR in the existing workflow, then convert it to a PO. The existing PO flow creates the Shipment and Truck bridge.'
    },
    details: `Purchase Requisition ${requisition.prNumber} created from the approved recommendation. Status: PENDING. Recommended supplier: ${supplier.name}. Next: approve the PR and convert it to a PO in the existing workflow.`
  };
}

function createControllerResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function firstLineItem(requisition, purchaseOrder) {
  const poItem = purchaseOrder?.items?.[0] || {};
  const prItem = requisition?.items?.[0] || {};
  return {
    productName: poItem.productName || prItem.productName,
    quantity: Number(poItem.quantity || prItem.quantity || 0),
    unitPrice: Number(poItem.unitPrice || prItem.estimatedUnitPrice || 0),
    totalPrice: Number(poItem.totalPrice || prItem.totalPrice || 0)
  };
}

function formatPoResult({ requisition, purchaseOrder, shipment, truck, duplicateSuppressed = false }) {
  const item = firstLineItem(requisition, purchaseOrder);
  const total = Number(purchaseOrder?.totalAmount || requisition?.totalAmount || item.totalPrice || 0);
  const details = [
    duplicateSuppressed
      ? 'Procurement was already converted to a Purchase Order. Duplicate PO creation was skipped.'
      : 'Procurement approved and PO created successfully.',
    '',
    `PR: ${requisition.prNumber}`,
    `PO: ${purchaseOrder.poNumber}`,
    `Supplier: ${purchaseOrder.supplierName || requisition.recommendedSupplierName}`,
    `Quantity: ${item.quantity.toLocaleString('en-IN')}`,
    `Unit Price: ${money(item.unitPrice)}`,
    `Total: ${money(total)}`,
    '',
    `Shipment: ${shipment?.shipmentNumber || 'Not generated'}`,
    `Truck: ${truck?.truckId || 'Not generated'}`,
    '',
    truck?.truckId ? 'Next: Truck is ready for yard execution.' : 'Next: Continue with the existing fulfillment workflow.'
  ].join('\n');

  return {
    success: true,
    action: 'CREATED_PO',
    duplicateSuppressed,
    prNumber: requisition.prNumber,
    poNumber: purchaseOrder.poNumber,
    supplierName: purchaseOrder.supplierName || requisition.recommendedSupplierName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalAmount: total,
    shipmentNumber: shipment?.shipmentNumber || null,
    truckId: truck?.truckId || null,
    lifecycleSummary: {
      prNumber: requisition.prNumber,
      poNumber: purchaseOrder.poNumber,
      shipmentNumber: shipment?.shipmentNumber || null,
      truckId: truck?.truckId || null,
      nextStep: truck?.truckId ? 'Truck is ready for yard execution.' : 'Continue with the existing fulfillment workflow.'
    },
    details
  };
}

async function findApprovedRecommendationPr(params) {
  const prNumber = String(params.prNumber || '').trim().toUpperCase();
  if (!prNumber) return null;

  return PurchaseRequisition.findOne({ prNumber }).populate('recommendedSupplier');
}

async function convertApprovedRecommendationToPurchaseOrder(params, user) {
  const requisition = await findApprovedRecommendationPr(params);
  if (!requisition) {
    return { success: false, notFound: true, message: `Purchase Requisition ${params.prNumber || ''} was not found.` };
  }

  const existingPo = await PurchaseOrder.findOne({ prId: requisition._id });
  if (existingPo) {
    const [shipment, truck] = await Promise.all([
      Shipment.findOne({ poNumber: existingPo.poNumber }),
      Truck.findOne({ poNumber: existingPo.poNumber })
    ]);
    return formatPoResult({
      requisition,
      purchaseOrder: existingPo,
      shipment,
      truck,
      duplicateSuppressed: true
    });
  }

  if (requisition.status === 'CONVERTED_TO_PO') {
    return { success: false, message: `Purchase Requisition ${requisition.prNumber} is already marked CONVERTED_TO_PO, but no linked PO was found.` };
  }

  if (requisition.status !== 'APPROVED') {
    return {
      success: false,
      message: `Purchase Requisition ${requisition.prNumber} must be APPROVED before Copilot can create a Purchase Order. Current status: ${requisition.status}.`
    };
  }

  const supplierId = requisition.recommendedSupplier?._id || requisition.recommendedSupplier;
  if (!supplierId) {
    return { success: false, message: `Purchase Requisition ${requisition.prNumber} does not have a recommended supplier to use for PO conversion.` };
  }

  const controllerReq = {
    body: {
      prId: requisition._id.toString(),
      supplierId: supplierId.toString(),
      items: requisition.items.map(item => ({
        product: item.product,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.estimatedUnitPrice
      }))
    },
    user
  };
  const controllerRes = createControllerResponse();
  let controllerError = null;

  await createPurchaseOrder(controllerReq, controllerRes, error => {
    controllerError = error;
  });

  if (controllerError) {
    return { success: false, message: controllerError.message || 'Purchase Order creation failed.' };
  }

  const body = controllerRes.body || {};
  if (controllerRes.statusCode >= 400 || body.success === false || !body.purchaseOrder) {
    return {
      success: false,
      message: body.message || `Purchase Order creation failed with status ${controllerRes.statusCode}.`
    };
  }

  return formatPoResult({
    requisition,
    purchaseOrder: body.purchaseOrder,
    shipment: body.shipment,
    truck: body.truck
  });
}

module.exports = {
  buildProcurementPreview,
  createPrFromRecommendation,
  convertApprovedRecommendationToPurchaseOrder,
  resolveProduct
};
