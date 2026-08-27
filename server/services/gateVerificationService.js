function normalizeOcrText(value) {
  return String(value || '')
    .normalize('NFKD')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * OCR commonly confuses visually similar characters.
 * These substitutions are applied only while comparing,
 * never to the actual truck identity stored in the DB.
 */
function normalizeForComparison(value) {
  return normalizeOcrText(value)
    .replace(/O/g, '0')
    .replace(/I/g, '1')
    .replace(/L/g, '1')
    .replace(/Z/g, '2')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/G/g, '6')
    .replace(/Q/g, '0');
}

function deriveTruckIdentity(truck) {
  const suffix =
    String(truck?.truckId || '0000')
      .replace(/\D/g, '')
      .slice(-6) || '0000';

  return {
    licensePlate: String(
      truck?.licensePlate || `CY-${suffix}`
    )
      .trim()
      .toUpperCase(),

    driverIdSerial: String(
      truck?.driverIdSerial || `DRV-${suffix}`
    )
      .trim()
      .toUpperCase()
  };
}

function levenshteinDistance(a, b) {
  const first = String(a || '');
  const second = String(b || '');

  if (first === second) return 0;
  if (!first.length) return second.length;
  if (!second.length) return first.length;

  const previous = Array.from(
    { length: second.length + 1 },
    (_, index) => index
  );

  for (let i = 1; i <= first.length; i += 1) {
    const current = [i];

    for (let j = 1; j <= second.length; j += 1) {
      const insertion = current[j - 1] + 1;
      const deletion = previous[j] + 1;
      const substitution =
        previous[j - 1] +
        (first[i - 1] === second[j - 1] ? 0 : 1);

      current.push(
        Math.min(
          insertion,
          deletion,
          substitution
        )
      );
    }

    previous.splice(
      0,
      previous.length,
      ...current
    );
  }

  return previous[second.length];
}

function similarityScore(captured, expected) {
  if (!captured || !expected) return 0;

  const distance = levenshteinDistance(
    captured,
    expected
  );

  return Math.max(
    0,
    Math.round(
      (1 - distance / Math.max(captured.length, expected.length)) *
        100
    )
  );
}

function extractCandidateTexts(value) {
  const raw = String(value || '')
    .toUpperCase()
    .replace(/\r?\n/g, ' ');

  const candidates = new Set();

  // Entire OCR result.
  candidates.add(raw);

  // Individual OCR tokens.
  raw
    .split(/[\s,;:|]+/)
    .map(token =>
      token.replace(/[^A-Z0-9-]/g, '')
    )
    .filter(Boolean)
    .forEach(token => candidates.add(token));

  // Compact alphanumeric version.
  const compact = normalizeOcrText(raw);

  if (compact) {
    candidates.add(compact);

    /*
     * OCR can insert junk between the useful characters.
     * Look for short windows around the expected identity size.
     */
    for (
      let length = Math.max(4, compact.length - 3);
      length <= Math.min(compact.length, 12);
      length += 1
    ) {
      for (
        let start = 0;
        start + length <= compact.length;
        start += 1
      ) {
        candidates.add(
          compact.slice(start, start + length)
        );
      }
    }
  }

  return [...candidates];
}

function compareOcrText(capturedText, expectedText) {
  const captured = normalizeOcrText(capturedText);
  const expected = normalizeOcrText(expectedText);

  if (!captured || !expected || expected.length < 4) {
    return {
      captured,
      expected,
      matched: false,
      similarity: 0,
      method: 'INVALID'
    };
  }

  /*
   * 1. Exact normalized match.
   *
   * Example:
   * CY-1025 -> CY1025
   * DRV-1025 -> DRV1025
   */
  if (captured === expected) {
    return {
      captured,
      expected,
      matched: true,
      similarity: 100,
      method: 'EXACT'
    };
  }

  /*
   * 2. Normalized OCR with common visual substitutions.
   */
  const comparisonCaptured =
    normalizeForComparison(captured);

  const comparisonExpected =
    normalizeForComparison(expected);

  if (
    comparisonCaptured === comparisonExpected
  ) {
    return {
      captured,
      expected,
      matched: true,
      similarity: 98,
      method: 'OCR_CHARACTER_NORMALIZATION'
    };
  }

  /*
   * 3. OCR sometimes returns extra surrounding text.
   */
  if (
    captured.includes(expected) ||
    comparisonCaptured.includes(comparisonExpected)
  ) {
    return {
      captured,
      expected,
      matched: true,
      similarity: 95,
      method: 'CONTAINS'
    };
  }

  /*
   * 4. Fuzzy matching.
   *
   * We only accept a small number of OCR errors.
   * This prevents completely unrelated OCR text from
   * being accepted as a valid identity.
   */
  const candidates = extractCandidateTexts(
    capturedText
  );

  let bestSimilarity = 0;
  let bestCandidate = '';

  for (const candidate of candidates) {
    const normalizedCandidate =
      normalizeForComparison(candidate);

    if (!normalizedCandidate) continue;

    const score = similarityScore(
      normalizedCandidate,
      comparisonExpected
    );

    if (score > bestSimilarity) {
      bestSimilarity = score;
      bestCandidate = candidate;
    }
  }

  /*
   * For short identities, require a very strong match.
   * For longer IDs, allow slightly more OCR errors.
   */
  const threshold =
    expected.length <= 6
      ? 84
      : expected.length <= 8
        ? 80
        : 76;

  const matched =
    bestSimilarity >= threshold;

  return {
    captured,
    expected,
    matched,
    similarity: bestSimilarity,
    method: matched
      ? 'FUZZY'
      : 'NO_MATCH',
    bestCandidate
  };
}

module.exports = {
  compareOcrText,
  deriveTruckIdentity,
  normalizeOcrText,
  normalizeForComparison
};