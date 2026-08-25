const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const PurchaseOrder = require('../models/PurchaseOrder');
const GoodsReceipt = require('../models/GoodsReceipt');
const Supplier = require('../models/Supplier');
const DemandHistory = require('../models/DemandHistory');
const Exception = require('../models/Exception');
const config = require('../config/planningConfig');

/**
 * Helper: Calculate standard planning metrics for a given Product document
 */
async function computeProductPlanningData(product) {
  // 1. Fetch historical demand records
  const demandRecords = await DemandHistory.find({ product: product._id }).sort({ period: 1 });

  const monthlyQuantities = demandRecords.map(d => d.quantity);
  const totalDemand = monthlyQuantities.reduce((sum, q) => sum + q, 0);
  const monthCount = monthlyQuantities.length || config.DEMAND_WINDOW_MONTHS;

  const avgMonthlyDemand = monthCount > 0 ? Math.round(totalDemand / monthCount) : 0;
  const avgDailyDemand = Math.round((avgMonthlyDemand / config.DAYS_PER_MONTH) * 10) / 10 || 1;
  const peakDemand = monthlyQuantities.length > 0 ? Math.max(...monthlyQuantities) : 0;

  // Calculate Demand Trend (Comparing 2nd half vs 1st half of historical window)
  let demandTrend = 'STABLE';
  if (monthlyQuantities.length >= 4) {
    const mid = Math.floor(monthlyQuantities.length / 2);
    const firstHalfAvg = monthlyQuantities.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalfAvg = monthlyQuantities.slice(mid).reduce((a, b) => a + b, 0) / (monthlyQuantities.length - mid);

    if (secondHalfAvg > firstHalfAvg * 1.05) demandTrend = 'INCREASING';
    else if (secondHalfAvg < firstHalfAvg * 0.95) demandTrend = 'DECREASING';
  }

  // 2. Lead Time determination
  let leadTimeDays = config.DEFAULT_LEAD_TIME_DAYS;
  if (product.preferredSupplier) {
    const supplier = await Supplier.findById(product.preferredSupplier);
    if (supplier && supplier.leadTimeDays) {
      leadTimeDays = supplier.leadTimeDays;
    }
  }

  // 3. Open PO Incoming Stock (Subtracting already received quantities in Goods Receipts)
  const openPOs = await PurchaseOrder.find({
    status: { $in: ['ISSUED', 'SHIPPED', 'PARTIALLY_RECEIVED'] }
  });

  let incomingPOQuantity = 0;
  const activePoNumbers = openPOs.map(po => po.poNumber);
  const goodsReceipts = await GoodsReceipt.find({ poNumber: { $in: activePoNumbers } });

  for (const po of openPOs) {
    for (const item of po.items) {
      const isMatch = (item.product && item.product.toString() === product._id.toString()) ||
                      (item.productName && item.productName.toLowerCase().includes(product.name.toLowerCase()));
      if (isMatch) {
        const poReceipts = goodsReceipts.filter(gr => gr.poNumber === po.poNumber);
        let alreadyReceived = 0;
        for (const gr of poReceipts) {
          for (const grItem of gr.items) {
            if (grItem.productName && grItem.productName.toLowerCase().includes(product.name.toLowerCase())) {
              alreadyReceived += (grItem.acceptedQuantity || grItem.receivedQuantity || 0);
            }
          }
        }
        const remainingIncoming = Math.max(0, item.quantity - alreadyReceived);
        incomingPOQuantity += remainingIncoming;
      }
    }
  }

  // 4. Stock & Net Requirement Calculation
  let currentStock = product.currentStock || 0;
  const inventoryDoc = await Inventory.findOne({ product: product._id });
  if (inventoryDoc) {
    currentStock = inventoryDoc.quantityOnHand || inventoryDoc.availableQuantity || currentStock;
  }

  const grossDemand = avgMonthlyDemand;
  const netRequirement = Math.max(0, grossDemand - currentStock - incomingPOQuantity);

  // 5. Safety Stock calculation using Demand Standard Deviation
  let stdDevMonthly = 0;
  if (monthlyQuantities.length > 1) {
    const variance = monthlyQuantities.reduce((sum, q) => sum + Math.pow(q - avgMonthlyDemand, 2), 0) / monthlyQuantities.length;
    stdDevMonthly = Math.sqrt(variance);
  } else {
    stdDevMonthly = avgMonthlyDemand * 0.15; // 15% estimated std dev fallback
  }

  const stdDevDaily = stdDevMonthly / Math.sqrt(config.DAYS_PER_MONTH);
  const safetyStock = Math.round(config.Z_FACTOR * stdDevDaily * Math.sqrt(leadTimeDays)) || Math.round(avgDailyDemand * 3);

  // 6. Reorder Point
  const reorderPoint = Math.round((avgDailyDemand * leadTimeDays) + safetyStock);

  // 7. Economic Order Quantity (EOQ)
  const annualDemand = avgMonthlyDemand * 12;
  let eoq = 0;
  if (annualDemand > 0 && config.HOLDING_COST_PER_UNIT_YEAR > 0) {
    eoq = Math.round(Math.sqrt((2 * annualDemand * config.ORDERING_COST) / config.HOLDING_COST_PER_UNIT_YEAR));
  }

  // 8. Inventory Coverage Metrics
  const daysOfSupply = avgDailyDemand > 0 ? Math.round(currentStock / avgDailyDemand) : 999;
  const projectedDaysOfSupply = avgDailyDemand > 0 ? Math.round((currentStock + incomingPOQuantity) / avgDailyDemand) : 999;

  // 9. Replenishment Decision Engine
  const projectedStock = currentStock + incomingPOQuantity;
  let status = 'HEALTHY';

  if (currentStock < safetyStock || projectedStock < grossDemand) {
    status = 'URGENT_REORDER';
  } else if (projectedStock < reorderPoint) {
    status = 'REORDER_RECOMMENDED';
  } else if (projectedStock < reorderPoint + safetyStock) {
    status = 'MONITOR';
  } else {
    status = 'HEALTHY';
  }

  // 10. Recommended Order Quantity
  let recommendedOrderQuantity = 0;
  if (status === 'URGENT_REORDER' || status === 'REORDER_RECOMMENDED') {
    recommendedOrderQuantity = Math.max(eoq, netRequirement + safetyStock);
  } else if (status === 'MONITOR') {
    recommendedOrderQuantity = eoq;
  }

  // 11. Auto-expose LOW_STOCK_CRITICAL exception if status is URGENT_REORDER
  if (status === 'URGENT_REORDER') {
    const existingEx = await Exception.findOne({
      sourceId: product._id.toString(),
      type: 'LOW_STOCK_CRITICAL',
      status: { $ne: 'RESOLVED' }
    });

    if (!existingEx) {
      await Exception.create({
        type: 'LOW_STOCK_CRITICAL',
        category: 'INVENTORY',
        severity: 'CRITICAL',
        title: `Critical Low Stock: ${product.name}`,
        description: `Current available stock (${currentStock} units) is critically below safety stock (${safetyStock} units). Projected coverage is only ${daysOfSupply} days. Recommended reorder: ${recommendedOrderQuantity} units.`,
        sourceType: 'Product',
        sourceId: product._id.toString(),
        metadata: {
          productId: product._id,
          sku: product.sku,
          currentStock,
          safetyStock,
          recommendedOrderQuantity
        }
      });
    }
  }

  // Explanation Breakdown text
  const reasonText = status === 'HEALTHY'
    ? `Current stock (${currentStock}) and incoming POs (${incomingPOQuantity}) comfortably exceed reorder point (${reorderPoint}) and safety stock (${safetyStock}).`
    : status === 'MONITOR'
    ? `Projected stock (${projectedStock}) is approaching reorder threshold (${reorderPoint}). Monitor inventory closely.`
    : status === 'REORDER_RECOMMENDED'
    ? `Projected stock (${projectedStock}) has fallen below reorder point (${reorderPoint}). Order ${recommendedOrderQuantity} units to restore buffer.`
    : `CRITICAL: Available stock (${currentStock}) cannot cover expected monthly demand (${grossDemand}) and safety stock (${safetyStock}). Immediate replenishment of ${recommendedOrderQuantity} units is required.`;

  return {
    productId: product._id,
    sku: product.sku,
    productName: product.name,
    category: product.category,
    unit: product.unit,
    defaultPrice: product.defaultPrice,
    currentStock,
    avgMonthlyDemand,
    avgDailyDemand,
    peakDemand,
    annualDemand,
    demandTrend,
    incomingPOQuantity,
    netRequirement,
    leadTimeDays,
    serviceLevel: `${Math.round(config.SERVICE_LEVEL * 100)}%`,
    zFactor: config.Z_FACTOR,
    safetyStock,
    reorderPoint,
    eoq,
    daysOfSupply,
    projectedDaysOfSupply,
    status,
    recommendedOrderQuantity,
    reasonText,
    assumptions: {
      serviceLevel: `${Math.round(config.SERVICE_LEVEL * 100)}%`,
      zFactor: config.Z_FACTOR,
      leadTimeDays,
      orderingCost: `₹${config.ORDERING_COST}`,
      holdingCost: `₹${config.HOLDING_COST_PER_UNIT_YEAR}/unit/year`,
      demandWindowMonths: config.DEMAND_WINDOW_MONTHS
    },
    historicalDemand: demandRecords.map(d => ({
      period: d.period,
      monthName: d.monthName,
      quantity: d.quantity
    }))
  };
}

exports.computeProductPlanningData = computeProductPlanningData;

/**
 * GET /api/inventory-planning/summary
 * Aggregate KPIs for all monitored products
 */
exports.getPlanningSummary = async (req, res, next) => {
  try {
    const products = await Product.find();
    const planningList = [];

    for (const prod of products) {
      const data = await computeProductPlanningData(prod);
      planningList.push(data);
    }

    const totalProducts = planningList.length;
    const reorderRecommendedCount = planningList.filter(p => p.status === 'REORDER_RECOMMENDED').length;
    const urgentReordersCount = planningList.filter(p => p.status === 'URGENT_REORDER').length;
    const healthyCount = planningList.filter(p => p.status === 'HEALTHY').length;
    const monitorCount = planningList.filter(p => p.status === 'MONITOR').length;

    const totalNetRequirement = planningList.reduce((sum, p) => sum + p.netRequirement, 0);
    const totalGrossDemand = planningList.reduce((sum, p) => sum + p.avgMonthlyDemand, 0);
    const totalIncomingPO = planningList.reduce((sum, p) => sum + p.incomingPOQuantity, 0);

    const openPOCoveragePercent = totalGrossDemand > 0
      ? Math.min(100, Math.round((totalIncomingPO / totalGrossDemand) * 100))
      : 100;

    res.json({
      success: true,
      summary: {
        totalProductsMonitored: totalProducts,
        reorderRecommendedCount,
        urgentReordersCount,
        healthyCount,
        monitorCount,
        totalNetRequirement,
        totalGrossDemand,
        totalIncomingPO,
        openPOCoveragePercent: `${openPOCoveragePercent}%`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory-planning/products
 * Detailed inventory planning analysis for all products
 */
exports.getPlanningProducts = async (req, res, next) => {
  try {
    const products = await Product.find();
    const results = [];

    for (const prod of products) {
      const planningData = await computeProductPlanningData(prod);
      results.push(planningData);
    }

    res.json({
      success: true,
      count: results.length,
      products: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory-planning/products/:id
 * Single product planning detail view
 */
exports.getPlanningProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let product = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id);
    } else {
      product = await Product.findOne({ sku: id.toUpperCase() }) || await Product.findOne({ name: new RegExp(id, 'i') });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product matching '${id}' was not found in inventory planning system.`
      });
    }

    const planningData = await computeProductPlanningData(product);

    res.json({
      success: true,
      product: planningData
    });
  } catch (error) {
    next(error);
  }
};
