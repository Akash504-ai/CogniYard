const numberFromText = value => Number(String(value || '').replaceAll(',', ''));

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
  if (!isProcurementIntent) return { isProcurementIntent: false, item: '', quantity: null, estimatedPrice: null };

  const price = extractHumanUnitPrice(source);
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
  if (quantityMatch) item = `${item.slice(0, quantityMatch.index)} ${item.slice(quantityMatch.index + quantityMatch.token.length)}`;
  item = item
    .replace(/\b(?:please|kindly|i|we|want|would|like|to|a|an|create|make|raise|generate|new|purchase|procurement|requisition|pr|order|buy|need|required?|requires?|procure|for|of)\b/gi, ' ')
    .replace(/\b(?:quantity|units?|pieces?|pcs?|items?|each|at|per\s+unit|unit\s+price|price|rate|cost|is|should\s+be)\b/gi, ' ')
    .replace(/[^a-z0-9&+./()\-\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-:,.]+|[\s\-:,.]+$/g, '')
    .trim();

  return {
    isProcurementIntent,
    item,
    quantity: quantityMatch?.value || null,
    estimatedPrice: price?.value || null
  };
}

module.exports = { extractHumanUnitPrice, parseProcurementRequest };
