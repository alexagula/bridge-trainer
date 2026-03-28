// Bridge Trainer — Bid utility functions (shared across modules)

/**
 * Extract suit ID from bid string like '1♥', '2♠', '3♣'
 * @param {string} bid
 * @returns {string|null} - 'SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS' or null
 */
export function parseSuitFromBid(bid) {
  if (!bid) return null;
  if (bid.includes('♠')) return 'SPADES';
  if (bid.includes('♥')) return 'HEARTS';
  if (bid.includes('♦')) return 'DIAMONDS';
  if (bid.includes('♣')) return 'CLUBS';
  return null;
}

/**
 * Get numeric level from bid string like '1♥' → 1, '2БК' → 2
 * @param {string} bid
 * @returns {number}
 */
export function getBidLevel(bid) {
  const match = bid.match(/^(\d)/);
  return match ? parseInt(match[1]) : 1;
}

/**
 * Map a bid to a rule-based situationId for SM-2 tracking.
 * Groups by rule (e.g. "opening 1-major") instead of by hand shape.
 * @param {string} module - e.g. 'opening', 'response'
 * @param {string} bid
 * @param {object} [hand]
 * @param {string} [opening]
 * @returns {string}
 */
export function bidToRuleId(module, bid, hand, opening) {
  if (module === 'opening') {
    if (bid === 'пас') return 'rule:opening-pass';
    if (bid === '1БК') return 'rule:opening-1nt';
    if (bid === '2БК') return 'rule:opening-2nt';
    if (bid === '2♣') return 'rule:opening-2c-fg';
    if (bid.startsWith('1') && (bid.includes('♥') || bid.includes('♠'))) return 'rule:opening-1major';
    if (bid.startsWith('1') && (bid.includes('♣') || bid.includes('♦'))) return 'rule:opening-1minor';
    if (['2♦','2♥','2♠','3♣','3♦','3♥','3♠','4♣','4♦','4♥','4♠'].includes(bid)) return 'rule:opening-preempt';
    return `rule:opening-${bid}`;
  }
  if (module === 'response') {
    if (bid === 'пас') return `rule:response-pass-after-${opening}`;
    if (bid === '1БК') return 'rule:response-1nt';
    if (bid === '2БК') return 'rule:response-2nt';
    if (bid === '3БК') return 'rule:response-3nt';
    // Raise
    if (opening && bid.includes(opening.slice(-1))) return `rule:response-raise-${bid}`;
    return `rule:response-${bid}`;
  }
  return `rule:${module}-${bid}`;
}
