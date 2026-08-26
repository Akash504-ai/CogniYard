const numberFromText = value => Number(String(value || '').replaceAll(',', ''));

const normalizePriority = message => {
  const source = String(message || '').toLowerCase();
  if (/\b(emergency|critical|expedite|expedited)\b/.test(source)) return 'HIGH';
  if (/\b(high priority|high-priority)\b/.test(source)) return 'HIGH';
  if (/\burgent\b/.test(source)) return 'URGENT';
  if (/\b(low priority|low-priority)\b/.test(source)) return 'LOW';
  if (/\b(normal|standard|medium priority|medium-priority)\b/.test(source)) return 'MEDIUM';
  return null;
};

const extractBusinessReason = message => {
  const source = String(message || '').replace(/\s+/g, ' ').trim();
  const prefixReason = source.match(/^([^:]{4,120}):\s*/);
  if (prefixReason) return prefixReason[1].trim();

  const reasonMatch = source.match(/\b(?:because|due to|reason\s*:?)\s+(.+?)(?:\.|$)/i);
  if (reasonMatch) return reasonMatch[1].trim();

  return '';
};

/** Extract an explicitly human-entered unit price, never a quantity. */
function extractHumanUnitPrice(message) {
  const source = String(message || '');
  const patterns = [
    /(?:\bat\s+)?(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(?:\/\s*(?:unit|piece|item)|per\s+(?:unit|piece|item)|each)?/i,
    /\b(?:price|rate|cost)\s*(?:per\s+(?:unit|piece|item))?\s*(?:is|of|=|:|at)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i,
    /(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(?:each|per\s+(?:unit|piece|item)|\/\s*(?:unit|piece|item))/i
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(source);
    const value = match ? numberFromText(match[1]) : NaN;
    if (match && Number.isFinite(value) && value > 0) {
      return { value, token: match[0], index: match.index, end: match.index + match[0].length };
    }
  }
  return null;
}

/**
 * Deterministic procurement entity extraction. Groq handles broader language
 * reasoning; business-critical quantity, item and human price are validated
 * locally so they cannot be hallucinated or shifted between fields.
 */
function parseProcurementRequest(message) {
  const source = String(message || '').replace(/\s+/g, ' ').trim();
  const isProcurementIntent = /\b(?:buy|order|need|require|procure|purchase|requisition|raise\s+(?:a\s+)?pr|create\s+(?:a\s+)?pr)\b/i.test(source);
  if (!isProcurementIntent) {
    return {
      isProcurementIntent: false,
      item: '',
      sku: '',
      quantity: null,
      estimatedPrice: null,
      priority: null,
      reason: ''
    };
  }

  const price = extractHumanUnitPrice(source);
  const reason = extractBusinessReason(source);
  const priority = normalizePriority(source);
  const withoutPrice = price
    ? `${source.slice(0, price.index)} ${source.slice(price.end)}`.replace(/\s+/g, ' ').trim()
    : source;
  const quantityPatterns = [
    /\b(?:order|buy|need|require|procure|purchase)\s+(?:of\s+|for\s+)?([\d,]+(?:\.\d+)?)\b/i,
    /\b(?:requisition|pr)\s+(?:of\s+|for\s+)?([\d,]+(?:\.\d+)?)\b/i,
    /\bquantity\s*(?:is|=|:)?\s*([\d,]+(?:\.\d+)?)\b/i,
    /\b([\d,]+(?:\.\d+)?)\s*(?:units?|pieces?|pcs?|items?)\b/i,
    /\b([\d,]+(?:\.\d+)?)\b/
  ];
  let quantityMatch = null;
  for (const pattern of quantityPatterns) {
    const match = pattern.exec(withoutPrice);
    const value = match ? numberFromText(match[1]) : NaN;
    if (match && Number.isFinite(value) && value > 0) {
      const captureOffset = match[0].lastIndexOf(match[1]);
      quantityMatch = { value, token: match[1], index: match.index + captureOffset };
      break;
    }
  }

  let item = withoutPrice;
  if (reason && item.toLowerCase().startsWith(`${reason.toLowerCase()}:`)) {
    item = item.slice(reason.length + 1).trim();
  }

  const fullSkuMatch = source.match(/\bSKU-[A-Z0-9_-]+\b/i);
  const labelledSkuMatch = source.match(/\b(?:SKU|ITEM|PRODUCT)\s*[:#]\s*([A-Z0-9][A-Z0-9_-]{2,})\b/i);
  const sku = fullSkuMatch ? fullSkuMatch[0].toUpperCase() : labelledSkuMatch ? labelledSkuMatch[1].toUpperCase() : '';

  let usedItemPhrase = false;
  const itemPhrasePatterns = [
    // "I need to order 10 Mobile"
    /\b(?:i\s+)?(?:need|require|want)\s+to\s+(?:buy|order|procure|purchase)\s+(?:[\d,]+(?:\.\d+)?\s*)?(?:units?|pieces?|pcs?|items?|pairs?)?\s*(.+?)(?:\s+for\s+(?:our|the|a|an)\b|\s+(?:at|for)\s+(?:₹|rs\.?|inr)?\s*[\d,]+(?:\.\d+)?|\s+per\s+(?:unit|piece|item)|\.|$)/i,

    // "I need 10 Mobile"
    /\b(?:i\s+)?(?:need|require|want)\s+(?:[\d,]+(?:\.\d+)?\s*)?(?:units?|pieces?|pcs?|items?|pairs?)?\s*(.+?)(?:\s+for\s+(?:our|the|a|an)\b|\s+(?:at|for)\s+(?:₹|rs\.?|inr)?\s*[\d,]+(?:\.\d+)?|\s+per\s+(?:unit|piece|item)|\.|$)/i,

    // "Create a PR for 20 Mobiles"
    /\b(?:create|raise|generate)\s+(?:a\s+)?(?:pr|purchase\s+requisition|requisition)\s+(?:for|of)?\s*(?:[\d,]+(?:\.\d+)?\s*)?(?:units?|pieces?|pcs?|items?|pairs?)?\s*(.+?)(?:\s+for\s+(?:our|the|a|an)\b|\s+(?:at|for)\s+(?:₹|rs\.?|inr)?\s*[\d,]+(?:\.\d+)?|\s+per\s+(?:unit|piece|item)|\.|$)/i,

    // "Order 20 Mobiles"
    /\b(?:order|buy|procure|purchase)\s+(?:[\d,]+(?:\.\d+)?\s*)?(?:units?|pieces?|pcs?|items?|pairs?)?\s*(.+?)(?:\s+for\s+(?:our|the|a|an)\b|\s+(?:at|for)\s+(?:₹|rs\.?|inr)?\s*[\d,]+(?:\.\d+)?|\s+per\s+(?:unit|piece|item)|\.|$)/i
  ];
  for (const pattern of itemPhrasePatterns) {
    const match = pattern.exec(withoutPrice);
    if (match && match[1]) {
      item = match[1];
      usedItemPhrase = true;
      break;
    }
  }

  if (quantityMatch && !usedItemPhrase) item = `${item.slice(0, quantityMatch.index)} ${item.slice(quantityMatch.index + quantityMatch.token.length)}`;
  item = item
    .replace(/\b(?:please|kindly|i|we|our|want|would|like|to|a|an|create|make|raise|generate|new|purchase|procurement|requisition|pr|order|buy|need|required?|requires?|procure|for|of)\b/gi, ' ')
    .replace(/\b(?:quantity|units?|pieces?|pcs?|items?|pairs?|each|approved|approval|per\s+unit|unit\s+price|price|rate|cost|is|should\s+be)\b/gi, ' ')
    .replace(/[^a-z0-9&+./()\-\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-:,.]+|[\s\-:,.]+$/g, '')
    .trim();

  return {
    isProcurementIntent,
    sku,
    item,
    quantity: quantityMatch?.value || null,
    estimatedPrice: price?.value || null,
    priority,
    reason
  };
}

module.exports = { extractHumanUnitPrice, parseProcurementRequest };
