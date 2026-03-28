// Bridge Trainer — Conventions: Stayman, Blackwood, Takeout Double
// Lessons 3, 7, 8
import { SUITS, MAJOR_SUITS } from '../core/constants.js';

// ===================== STAYMAN (Lesson 3) =====================

/**
 * Opener's response to Stayman 2♣ after 1NT opening
 */
export function staymanResponse(openerHand) {
  const spades = openerHand.suitLength('SPADES');
  const hearts = openerHand.suitLength('HEARTS');

  if (spades >= 4 && hearts >= 4) {
    // Both majors: show hearts first (opener shows lower, responder checks spades)
    return { bid: '2♥', reason: 'Есть 4♥ (и 4♠)', hasBothMajors: true };
  }
  if (hearts >= 4) {
    return { bid: '2♥', reason: 'Есть 4 карты в черве' };
  }
  if (spades >= 4) {
    return { bid: '2♠', reason: 'Есть 4 карты в пике, нет 4♥' };
  }
  return { bid: '2♦', reason: 'Нет мажорной четвёрки → 2♦ отказ' };
}

/**
 * Responder's rebid after Stayman
 * @param {Hand} responderHand
 * @param {string} openerResponse - '2♦' | '2♥' | '2♠'
 * @param {number} responderHcp
 */
export function staymanRebid(responderHand, openerResponse) {
  const hcp = responderHand.hcp;
  const hasSpades4 = responderHand.suitLength('SPADES') >= 4;
  const hasHearts4 = responderHand.suitLength('HEARTS') >= 4;

  // Fit found?
  if (openerResponse === '2♥' && hasHearts4) {
    if (hcp >= 8 && hcp <= 9) return { bid: '3♥', reason: 'Фит найден, 8-9 HCP → инвит 3♥' };
    if (hcp >= 10) return { bid: '4♥', reason: 'Фит найден, 10+ HCP → гейм 4♥' };
  }
  if (openerResponse === '2♠' && hasSpades4) {
    if (hcp >= 8 && hcp <= 9) return { bid: '3♠', reason: 'Фит найден, 8-9 HCP → инвит 3♠' };
    if (hcp >= 10) return { bid: '4♠', reason: 'Фит найден, 10+ HCP → гейм 4♠' };
  }

  // Opener showed ♥, responder has ♠ but not ♥ — check for spade fit
  if (openerResponse === '2♥' && hasSpades4 && !hasHearts4) {
    // Bid 2♠ to check if opener has both majors
    if (hcp >= 8 && hcp <= 9) return { bid: '2♠', reason: 'Нет фита в ♥, проверяем ♠ (Ф1)' };
    if (hcp >= 10) return { bid: '2♠', reason: 'Нет фита в ♥, проверяем ♠ (Ф1)' };
  }

  // No fit found → NT
  if (openerResponse === '2♦' || !hasHearts4 && !hasSpades4) {
    if (hcp >= 8 && hcp <= 9) return { bid: '2БК', reason: 'Нет мажорного фита → инвит 2БК' };
    if (hcp >= 10 && hcp <= 15) return { bid: '3БК', reason: 'Нет мажорного фита → гейм 3БК' };
  }

  // Fallback
  if (hcp >= 8 && hcp <= 9) return { bid: '2БК', reason: 'Инвит 2БК' };
  if (hcp >= 10) return { bid: '3БК', reason: 'Гейм 3БК' };
  return { bid: 'пас', reason: 'Пас' };
}

// ===================== BLACKWOOD (Lesson 8) =====================

/**
 * Response to Blackwood 4NT (counts aces + trump king as 5th)
 * @param {Hand} hand
 * @param {string} trumpSuit - the agreed trump suit
 */
export function blackwoodResponse(hand, trumpSuit) {
  let count = hand.countAces();

  // Count trump king as 5th ace
  if (trumpSuit && hand.getSuitCards(trumpSuit).some(c => c.rankValue === 13)) {
    count++;
  }

  const responses = [
    { bid: '5♣', display: '5♣ — 0 из 5' },
    { bid: '5♦', display: '5♦ — 1 из 5' },
    { bid: '5♥', display: '5♥ — 2 из 5' },
    { bid: '5♠', display: '5♠ — 3 из 5' },
    { bid: '5БК', display: '5БК — 4 из 5' },
  ];

  const idx = count % 5;
  return {
    ...responses[idx],
    count,
    reason: `${hand.countAces()} тузов${trumpSuit ? ` + козырный К` : ''} = ${count} из 5`,
  };
}

/**
 * Decide after Blackwood response: slam or stop at 5
 */
export function blackwoodDecision(myAces, partnerResponse) {
  // partnerResponse count
  const partnerCount = partnerResponse.count;
  const total = myAces + partnerCount;

  if (total >= 5) {
    return { bid: '7', reason: `Все 5 → большой шлем!` };
  }
  if (total >= 4) {
    return { bid: '6', reason: `На двоих ${total} из 5 → малый шлем` };
  }
  return { bid: '5', reason: `На двоих ${total} из 5, тузов не хватает → стоп на 5` };
}

// ===================== TAKEOUT DOUBLE (Lesson 7) =====================

/**
 * Check if hand qualifies for takeout double
 * @param {Hand} hand
 * @param {string} opponentSuit - suit opened by opponent
 */
export function canTakeoutDouble(hand, opponentSuit) {
  const hcp = hand.hcp;
  if (hcp < 12) return { can: false, reason: 'Менее 12 HCP' };

  // Strong hand (17+): always double, describe later
  if (hcp >= 17) return { can: true, reason: '17+ HCP → контра (опишем руку позже)', strong: true };

  // Normal: 12-16, support for unbid suits, short in opponent's suit
  const oppLen = hand.suitLength(opponentSuit);
  if (oppLen >= 4) return { can: false, reason: `${oppLen} карт в масти оппонента — слишком много для вызывной контры` };

  // Check: 3+ in each unbid suit
  const unbid = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'].filter(s => s !== opponentSuit);
  const shortUnbid = unbid.filter(s => hand.suitLength(s) < 3);
  if (shortUnbid.length > 0) {
    return { can: false, reason: `Менее 3 карт в ${shortUnbid.map(s => SUITS[s].nameGen).join(', ')}` };
  }

  return { can: true, reason: `12-16 HCP, краткость в ${SUITS[opponentSuit].nameGen}, поддержка неназванных мастей` };
}

/**
 * Response to partner's takeout double
 * @param {Hand} hand
 * @param {string} doubledSuit - suit that was doubled
 */
export function respondToTakeoutDouble(hand, doubledSuit) {
  const hcp = hand.hcp;
  const unbid = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'].filter(s => s !== doubledSuit);

  // Find best suit (longest, prefer majors)
  let bestSuit = null;
  let bestLen = 0;
  for (const s of unbid) {
    const len = hand.suitLength(s);
    const isMajor = MAJOR_SUITS.includes(s);
    if (len > bestLen || (len === bestLen && isMajor)) {
      bestSuit = s;
      bestLen = len;
    }
  }

  const sym = SUITS[bestSuit].symbol;

  // Strong response: 10+ with jump
  if (hcp >= 10) {
    // Jump in best suit or 2NT/3NT with stopper
    if (hand.hasStopper(doubledSuit) && hand.isBalanced) {
      if (hcp >= 10 && hcp <= 12) return { bid: '2БК', reason: '10-12 HCP, держка, равномерный → инвит 2БК' };
      if (hcp >= 13) return { bid: '3БК', reason: '13+ HCP, держка → гейм 3БК' };
    }
    // Level 2 jump
    return { bid: `2${sym}`, reason: `10+ HCP → прыжок 2${sym}`, jump: true };
  }

  // Weak: 0-9, bid cheapest suit
  if (hand.hasStopper(doubledSuit) && hcp >= 6) {
    return { bid: '1БК', reason: `6-9 HCP, держка в ${SUITS[doubledSuit].nameGen} → 1БК` };
  }

  // Determine level (1 if possible, 2 if must)
  const suitRank = SUITS[bestSuit].rank;
  const doubledRank = SUITS[doubledSuit].rank;
  const level = suitRank > doubledRank ? '1' : '2';

  return { bid: `${level}${sym}`, reason: `0-9 HCP → ${level}${sym} (лучшая масть)` };
}

/**
 * Is this double takeout or penalty?
 */
export function isDoubleType(auction) {
  // Simplified: if no one on our side has bid yet AND opponent bid a suit (not NT) → takeout
  // If opponent opened 1NT → penalty
  // Late in auction → penalty
  return 'takeout'; // Default for trainer simplification
}
