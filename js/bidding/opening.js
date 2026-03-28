// Bridge Trainer — Opening Bid Decision Tree
// Full algorithm from Lessons 1, 3, 4, 8, 9
import { SUITS, SUIT_ORDER, MAJOR_SUITS, MINOR_SUITS } from '../core/constants.js';

/**
 * Determine the correct opening bid for a hand.
 * Returns { bid, bidDisplay, reason, lessonRef, steps }
 * where steps is an array of decision steps for explanation.
 *
 * @param {Hand} hand
 * @param {Object} [options={}] - optional context
 * @param {number} [options.position] - 1..4 (seat position at table)
 * @param {string} [options.vulnerable] - 'NONE'|'NS'|'EW'|'BOTH'
 */
export function determineOpening(hand, options = {}) {
  const hcp = hand.hcp;
  const position = options.position ?? null; // null = position unknown, use standard rules
  const steps = [];

  // === Step 0: Check for preemptive openings (Lesson 9) ===
  // Position 4 (4th seat): do NOT open preempt — partner has already passed
  if (hcp >= 6 && hcp <= 10 && position !== 4) {
    // Check for 8-9 card suit → 4-level preempt
    for (const s of SUIT_ORDER) {
      const len = hand.suitLength(s);
      if (len >= 8 && hand.hasGoodSuit(s, 8)) {
        const hasSideMajor4 = s !== 'HEARTS' && s !== 'SPADES'
          ? false
          : MAJOR_SUITS.filter(m => m !== s).some(m => hand.suitLength(m) >= 4);
        if (!hasSideMajor4) {
          steps.push({ text: `${hcp} HCP, ${len} карт в ${SUITS[s].nameGen} → блок 4${SUITS[s].symbol}`, passed: true });
          return result(`4${SUITS[s].symbol}`, `Блок: ${hcp} HCP, ${len} карт в ${SUITS[s].nameGen}`, 9, steps);
        }
      }
    }

    // Check for 7-card suit → 3-level preempt
    for (const s of SUIT_ORDER) {
      const len = hand.suitLength(s);
      if (len === 7 && hand.hasGoodSuit(s, 7)) {
        const hasSideMajor4 = MAJOR_SUITS.filter(m => m !== s).some(m => hand.suitLength(m) >= 4);
        if (!hasSideMajor4) {
          steps.push({ text: `${hcp} HCP, 7 карт в ${SUITS[s].nameGen} → блок 3${SUITS[s].symbol}`, passed: true });
          return result(`3${SUITS[s].symbol}`, `Блок: ${hcp} HCP, 7 карт в ${SUITS[s].nameGen}`, 9, steps);
        }
      }
    }

    // Check for 6-card suit → weak 2 (not clubs!)
    for (const s of ['SPADES', 'HEARTS', 'DIAMONDS']) {
      const len = hand.suitLength(s);
      if (len === 6 && hand.hasGoodSuit(s, 6)) {
        const hasSideMajor4 = MAJOR_SUITS.filter(m => m !== s).some(m => hand.suitLength(m) >= 4);
        if (!hasSideMajor4) {
          steps.push({ text: `${hcp} HCP, 6 карт в ${SUITS[s].nameGen} → слабое 2${SUITS[s].symbol}`, passed: true });
          return result(`2${SUITS[s].symbol}`, `Слабые 2: ${hcp} HCP, 6 карт в ${SUITS[s].nameGen}`, 9, steps);
        }
      }
    }
  }

  // === Step 0b: Position 3 — light opening with 10-11 HCP and good 5+ suit ===
  // 3rd seat (after 2 passes): can open lighter to suggest lead and compete
  if (position === 3 && hcp >= 10 && hcp <= 11) {
    for (const s of SUIT_ORDER) {
      const len = hand.suitLength(s);
      if (len >= 5 && hand.hasGoodSuit(s, 5)) {
        const sym = SUITS[s].symbol;
        steps.push({
          text: `3-я рука: лёгкое открытие с ${hcp} HCP и ${len} картами в ${SUITS[s].nameGen}`,
          passed: true
        });
        // Open at 1-level in that suit (major preferred)
        if (MAJOR_SUITS.includes(s)) {
          return result(`1${sym}`, `3-я рука: ${hcp} HCP, хорошие ${len} карт в ${SUITS[s].nameGen} → 1${sym}`, 1, steps);
        }
        // Minor: only if no major suit available
        const hasMajor5 = MAJOR_SUITS.some(m => hand.suitLength(m) >= 5 && hand.hasGoodSuit(m, 5));
        if (!hasMajor5) {
          return result(`1${sym}`, `3-я рука: ${hcp} HCP, хорошие ${len} карт в ${SUITS[s].nameGen} → 1${sym}`, 1, steps);
        }
      }
    }
    // No good 5+ suit found in 3rd seat with 10-11 HCP → pass
    steps.push({ text: `3-я рука: ${hcp} HCP — нет хорошей 5-карточной масти для лёгкого открытия`, passed: false });
    return result('пас', `${hcp} HCP, 3-я рука — нет масти для лёгкого открытия, пас`, 1, steps);
  }

  // === Step 0c: Position 4 — rule of 15 (HCP + spade length >= 15) ===
  // 4th seat (all three passed): open only if profitable; preempt already blocked above
  if (position === 4 && hcp >= 10 && hcp <= 11) {
    const spadeLen = hand.suitLength('SPADES');
    const rule15 = hcp + spadeLen;
    steps.push({
      text: `4-я рука: правило 15 — HCP (${hcp}) + длина ♠ (${spadeLen}) = ${rule15}. Нужно ≥15?`,
      passed: rule15 >= 15
    });
    if (rule15 < 15) {
      return result('пас', `4-я рука: правило 15 — ${hcp} HCP + ${spadeLen}♠ = ${rule15} < 15, пас`, 1, steps);
    }
    // Falls through to standard opening logic below
  }

  // === Step 1: Enough to open? ===
  steps.push({ text: `HCP: ${hcp}. Достаточно для открытия (12+)?`, passed: hcp >= 12 });
  if (hcp < 12) {
    return result('пас', `${hcp} HCP — менее 12, пас`, 1, steps);
  }

  // === Step 2: Very strong hand — 2♣ (Lesson 8) ===
  if (hcp >= 22) {
    steps.push({ text: `${hcp} HCP ≥ 22 → открытие 2♣ форсинг-гейм`, passed: true });
    return result('2♣', `${hcp} HCP — открытие 2♣ форсинг-гейм`, 8, steps);
  }

  // === Step 3: 2NT — 19-21, balanced, no 5-card major (Lesson 8) ===
  if (hcp >= 19 && hcp <= 21 && hand.isBalanced && !hand.has5PlusMajor()) {
    steps.push({ text: `${hcp} HCP, равномерный, нет мажора 5+ → открытие 2БК`, passed: true });
    return result('2БК', `${hcp} HCP, равномерный расклад → открытие 2БК`, 8, steps);
  }

  // === Step 4: 5+ card major? (Lesson 1) ===
  steps.push({ text: `Есть 5+ карт в мажоре?`, passed: hand.has5PlusMajor() });
  if (hand.has5PlusMajor()) {
    // Choose which major: longer wins; if equal, spades
    const spades = hand.suitLength('SPADES');
    const hearts = hand.suitLength('HEARTS');
    let suit;
    if (spades >= 5 && hearts >= 5) {
      suit = spades >= hearts ? 'SPADES' : 'HEARTS';
      // Equal: spades (higher ranking)
      if (spades === hearts) suit = 'SPADES';
    } else {
      suit = spades >= 5 ? 'SPADES' : 'HEARTS';
    }
    const sym = SUITS[suit].symbol;
    steps.push({ text: `${hand.suitLength(suit)} карт в ${SUITS[suit].nameGen} → открытие 1${sym}`, passed: true });
    return result(`1${sym}`, `12-21 HCP, ${hand.suitLength(suit)} карт в ${SUITS[suit].nameGen} → 1${sym}`, 1, steps);
  }

  // === Step 5: 1NT — 15-18, balanced, no 5-card major (Lesson 3) ===
  steps.push({ text: `Равномерный и 15-18 HCP?`, passed: hand.isBalanced && hcp >= 15 && hcp <= 18 });
  if (hand.isBalanced && hcp >= 15 && hcp <= 18) {
    steps.push({ text: `→ открытие 1БК`, passed: true });
    return result('1БК', `${hcp} HCP, равномерный расклад → 1БК`, 3, steps);
  }

  // === Step 6: 5+ diamonds? (Lesson 4) ===
  const diamonds = hand.suitLength('DIAMONDS');
  steps.push({ text: `Есть 5+ карт в бубне?`, passed: diamonds >= 5 });
  if (diamonds >= 5) {
    steps.push({ text: `${diamonds} бубен → открытие 1♦`, passed: true });
    return result('1♦', `${hand.suitLength('DIAMONDS')} карт в бубне → 1♦`, 4, steps);
  }

  // === Step 7: Choose minor (Lesson 4) ===
  const clubs = hand.suitLength('CLUBS');
  if (clubs > diamonds) {
    steps.push({ text: `Трефа длиннее бубны (${clubs} vs ${diamonds}) → 1♣`, passed: true });
    return result('1♣', `${clubs} треф → 1♣`, 4, steps);
  }
  if (diamonds > clubs) {
    steps.push({ text: `Бубна длиннее трефы (${diamonds} vs ${clubs}) → 1♦`, passed: true });
    return result('1♦', `${diamonds} бубен → 1♦`, 4, steps);
  }

  // Equal length: choose stronger (more HCP in suit)
  const clubHcp = hand.getSuitCards('CLUBS').reduce((s, c) => s + c.hcp, 0);
  const diamondHcp = hand.getSuitCards('DIAMONDS').reduce((s, c) => s + c.hcp, 0);
  if (diamondHcp >= clubHcp) {
    steps.push({ text: `Миноры равной длины, бубна сильнее → 1♦`, passed: true });
    return result('1♦', `Миноры ${diamonds}-${clubs}, бубна сильнее → 1♦`, 4, steps);
  } else {
    steps.push({ text: `Миноры равной длины, трефа сильнее → 1♣`, passed: true });
    return result('1♣', `Миноры ${clubs}-${diamonds}, трефа сильнее → 1♣`, 4, steps);
  }
}

function result(bid, reason, lessonRef, steps) {
  // Normalize display
  let bidDisplay = bid;
  return { bid, bidDisplay, reason, lessonRef, steps };
}

/**
 * Get all possible opening bids for the UI
 */
export function getOpeningOptions() {
  return [
    { bid: 'пас', display: 'Пас' },
    { bid: '1♣', display: '1♣' },
    { bid: '1♦', display: '1♦' },
    { bid: '1♥', display: '1♥' },
    { bid: '1♠', display: '1♠' },
    { bid: '1БК', display: '1БК' },
    { bid: '2♣', display: '2♣ ФГ' },
    { bid: '2♦', display: '2♦' },
    { bid: '2♥', display: '2♥' },
    { bid: '2♠', display: '2♠' },
    { bid: '2БК', display: '2БК' },
    { bid: '3♣', display: '3♣' },
    { bid: '3♦', display: '3♦' },
    { bid: '3♥', display: '3♥' },
    { bid: '3♠', display: '3♠' },
    { bid: '4♣', display: '4♣' },
    { bid: '4♦', display: '4♦' },
    { bid: '4♥', display: '4♥' },
    { bid: '4♠', display: '4♠' },
  ];
}
