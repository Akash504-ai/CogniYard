/**
 * CogniYard Inventory Planning Centralized Configuration
 * Single source of truth for planning assumptions and parameters.
 */
module.exports = {
  SERVICE_LEVEL: 0.95,          // 95% Target Service Level
  Z_FACTOR: 1.65,               // Normal distribution Z-score for 95% service level
  DEFAULT_LEAD_TIME_DAYS: 5,   // Fallback supplier lead time in days
  ORDERING_COST: 500,           // Ordering cost per PO (S) in currency units
  HOLDING_COST_PER_UNIT_YEAR: 50,// Annual holding cost per unit (H)
  DEMAND_WINDOW_MONTHS: 6,     // Historical demand evaluation window in months
  DAYS_PER_MONTH: 30            // Standardized days per month for daily demand calculations
};
