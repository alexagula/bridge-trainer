// Bridge Trainer — Shared bid filtering utilities
// Used by daily-mix, opening-trainer, response-trainer

// All possible bids in order (used as pool for filtering)
export const ALL_OPENING_BIDS = [
  'пас', '1♣', '1♦', '1♥', '1♠', '1БК',
  '2♣', '2♦', '2♥', '2♠', '2БК',
  '3♣', '3♦', '3♥', '3♠',
  '4♣', '4♦', '4♥', '4♠',
];

export const ALL_RESPONSE_BIDS = [
  'пас', '1♣', '1♦', '1♥', '1♠', '1БК',
  '2♣', '2♦', '2♥', '2♠', '2БК',
  '3♣', '3♦', '3♥', '3♠', '3БК',
  '4♥', '4♠', '4БК', '5♣', '5♦',
];

export const BID_DISPLAY = {
  'пас': 'Пас',
  '1♣': '1♣', '1♦': '1♦', '1♥': '1♥', '1♠': '1♠', '1БК': '1БК',
  '2♣': '2♣ ФГ', '2♦': '2♦', '2♥': '2♥', '2♠': '2♠', '2БК': '2БК',
  '3♣': '3♣', '3♦': '3♦', '3♥': '3♥', '3♠': '3♠', '3БК': '3БК',
  '4♣': '4♣', '4♦': '4♦', '4♥': '4♥', '4♠': '4♠',
  '4БК': '4БК', '5♣': '5♣', '5♦': '5♦',
};

/**
 * Pick ~8-10 relevant bids from the full pool.
 * Always includes the correct answer + contextual neighbours.
 */
export function pickRelevantBids(pool, correctBid, hcp) {
  const selected = new Set();

  // Always include correct answer and pass
  selected.add(correctBid);
  selected.add('пас');

  // Add contextual bids based on HCP range
  if (hcp < 12) {
    // Weak hand: pass, low-level bids, preempts
    ['1♣', '1♦', '1♥', '1♠', '2♦', '2♥', '2♠', '3♥', '3♠'].forEach(b => selected.add(b));
  } else if (hcp <= 14) {
    // Minimum opening: 1-level + simple raises
    ['1♣', '1♦', '1♥', '1♠', '1БК', '2♣', '2♦', '2♥', '2♠'].forEach(b => selected.add(b));
  } else if (hcp <= 18) {
    // Mid-range: 1-level + 1NT + 2-level
    ['1♣', '1♦', '1♥', '1♠', '1БК', '2♣', '2БК', '2♥', '2♠'].forEach(b => selected.add(b));
  } else if (hcp <= 21) {
    // Strong: NT range, 2♣ FG, game bids
    ['1БК', '2♣', '2БК', '2♥', '2♠', '3БК', '4♥', '4♠'].forEach(b => selected.add(b));
  } else {
    // Very strong: 2♣, game+
    ['2♣', '2БК', '3БК', '4♥', '4♠', '4БК', '5♣', '5♦'].forEach(b => selected.add(b));
  }

  // Add neighbours of correct bid in the pool (±2 positions)
  const idx = pool.indexOf(correctBid);
  if (idx >= 0) {
    for (let d = -2; d <= 2; d++) {
      const ni = idx + d;
      if (ni >= 0 && ni < pool.length) selected.add(pool[ni]);
    }
  }

  // Filter to only bids that exist in the pool, keep order
  const result = pool.filter(b => selected.has(b));

  // Ensure 8-10 bids: trim or pad
  if (result.length > 10) return result.slice(0, 10);
  if (result.length < 8) {
    // Pad with random bids from pool not yet selected
    const remaining = pool.filter(b => !selected.has(b));
    for (const b of remaining) {
      result.push(b);
      if (result.length >= 8) break;
    }
    // Re-sort by pool order
    result.sort((a, b) => pool.indexOf(a) - pool.indexOf(b));
  }
  return result;
}

/**
 * Binary choice mode: return exactly 2 bids (correct + nearest wrong).
 * Used when accuracy < 50% to simplify the choice.
 */
export function pickBinaryBids(pool, correctBid) {
  const idx = pool.indexOf(correctBid);
  // Pick the nearest wrong alternative
  let alt;
  if (correctBid === 'пас') {
    alt = pool[1] || pool[0]; // first non-pass
  } else if (idx > 0) {
    alt = pool[idx - 1]; // one level lower
  } else {
    alt = pool[1] || pool[0];
  }
  // Randomize order
  return Math.random() < 0.5 ? [correctBid, alt] : [alt, correctBid];
}
