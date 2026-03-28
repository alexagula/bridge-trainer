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
 * Map a bid to a granular rule-based situationId for SM-2 tracking.
 * Takes into account HCP bucket and hand balance for finer granularity.
 * @param {string} module - e.g. 'opening', 'response'
 * @param {string} bid
 * @param {object} [hand] - Hand object with .hcp and .isBalanced properties
 * @param {string} [opening] - Opening bid string (for response module)
 * @returns {string}
 */
export function bidToRuleId(module, bid, hand, opening) {
  if (module === 'opening') {
    const hcp = hand ? hand.hcp : 0;
    const balanced = hand ? hand.isBalanced : true;

    if (bid === 'пас') return 'rule:opening-pass';
    if (bid === '1БК') return 'rule:opening-1nt';
    if (bid === '2БК') return 'rule:opening-2nt';
    if (bid === '2♣') return 'rule:opening-2c-strong';
    if (bid.startsWith('1') && (bid.includes('♥') || bid.includes('♠'))) {
      // Differentiate by HCP: min = 12-14, max = 15+
      return `rule:opening-1major-${hcp <= 14 ? 'min' : 'max'}`;
    }
    if (bid.startsWith('1') && (bid.includes('♣') || bid.includes('♦'))) {
      // Differentiate by hand balance
      return `rule:opening-1minor-${balanced ? 'bal' : 'unbal'}`;
    }
    if (['2♦','2♥','2♠','3♣','3♦','3♥','3♠','4♣','4♦','4♥','4♠'].includes(bid)) {
      return 'rule:opening-preempt';
    }
    return `rule:opening-${bid}`;
  }

  if (module === 'response') {
    const hcp = hand ? hand.hcp : 0;
    // Three HCP buckets: weak (<6), invite (6-9), game-forcing (10+)
    const hcpBucket = hcp < 6 ? 'weak' : hcp < 10 ? 'invite' : 'gf';
    // Normalize opening string: remove suit symbols for a safe key segment
    const openingKey = opening ? opening.replace(/[♠♥♦♣]/g, s => ({
      '♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C',
    }[s])) : 'unknown';
    return `rule:response-${openingKey}-${hcpBucket}`;
  }

  return `rule:${module}-${bid}`;
}
