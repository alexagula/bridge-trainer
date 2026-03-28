// Bridge Trainer — Constrained Hand Generation
import { Deck, Deal, Hand } from './card.js';
import { SUIT_ORDER, MAJOR_SUITS, MINOR_SUITS, VULNERABILITY } from './constants.js';

const MAX_ATTEMPTS = 10000;
const BOUNDARY_CHANCE = 0.3; // 30% probability of generating a boundary-case hand

/**
 * Generate a deal where specific seats meet constraints.
 * Uses rejection sampling: generate random deals until constraints are met.
 *
 * @param {Object} constraints - { seatId: constraintFn(hand) => boolean }
 * @param {string} dealer - 'N'|'E'|'S'|'W'
 * @param {Object} vulnerability - from VULNERABILITY
 * @returns {Deal|null}
 */
export function dealWithConstraints(constraints, dealer = 'S', vulnerability = VULNERABILITY.NONE) {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const deck = new Deck();
    const hands = deck.deal();
    let valid = true;
    for (const [seat, check] of Object.entries(constraints)) {
      if (!check(hands[seat])) { valid = false; break; }
    }
    if (valid) return new Deal(hands, dealer, vulnerability);
  }
  console.warn('dealWithConstraints: exceeded max attempts, returning unconstrained deal');
  return Deal.random(dealer, vulnerability);
}

// --- Preset constraint functions ---

export function hcpRange(min, max) {
  return (hand) => hand.hcp >= min && hand.hcp <= max;
}

export function balanced() {
  return (hand) => hand.isBalanced;
}

export function unbalanced() {
  return (hand) => !hand.isBalanced;
}

export function has5PlusMajor() {
  return (hand) => hand.has5PlusMajor();
}

export function has4CardMajor() {
  return (hand) => hand.has4CardMajor();
}

export function no5CardMajor() {
  return (hand) => !hand.has5PlusMajor();
}

export function suitMinLength(suitId, minLen) {
  return (hand) => hand.suitLength(suitId) >= minLen;
}

export function combineConstraints(...fns) {
  return (hand) => fns.every(fn => fn(hand));
}

// --- Preset deals for trainers ---

/**
 * Deal for HCP trainer: any random hand
 */
export function dealForHCP() {
  return Deal.random();
}

/**
 * Deal for opening trainer: South has 0-21+ HCP (varied)
 * Sometimes generates hands that should open, sometimes pass
 */
export function dealForOpening() {
  // 30% chance: boundary cases for deliberate difficulty
  if (Math.random() < BOUNDARY_CHANCE) {
    const boundary = Math.random();
    if (boundary < 0.25) {
      // 11-12 HCP: border of opening (open or pass?)
      return dealWithConstraints({ S: hcpRange(11, 12) });
    }
    if (boundary < 0.5) {
      // 15 HCP with 5-card major: 1NT or 1M?
      return dealWithConstraints({ S: combineConstraints(hcpRange(15, 15), has5PlusMajor()) });
    }
    if (boundary < 0.75) {
      // 18-19 HCP balanced: 1NT (18) or 2NT (19)?
      return dealWithConstraints({ S: combineConstraints(hcpRange(18, 19), balanced(), no5CardMajor()) });
    }
    // 21-22 HCP: normal opening or 2♣ FG?
    return dealWithConstraints({ S: hcpRange(21, 22) });
  }

  // 60% openable (12+), 40% pass
  if (Math.random() < 0.4) {
    return dealWithConstraints({ S: hcpRange(0, 11) });
  }
  // Various opening types
  const r = Math.random();
  if (r < 0.25) {
    return dealWithConstraints({ S: combineConstraints(hcpRange(12, 21), has5PlusMajor()) });
  }
  if (r < 0.45) {
    return dealWithConstraints({ S: combineConstraints(hcpRange(15, 18), balanced(), no5CardMajor()) });
  }
  if (r < 0.65) {
    return dealWithConstraints({ S: combineConstraints(hcpRange(12, 21), no5CardMajor(), unbalanced()) });
  }
  if (r < 0.75) {
    return dealWithConstraints({ S: combineConstraints(hcpRange(19, 21), balanced(), no5CardMajor()) });
  }
  if (r < 0.85) {
    return dealWithConstraints({ S: hcpRange(22, 40) });
  }
  // Preempt hands
  return dealWithConstraints({
    S: (hand) => {
      const hcp = hand.hcp;
      if (hcp < 6 || hcp > 10) return false;
      for (const s of SUIT_ORDER) {
        if (hand.suitLength(s) >= 6 && hand.hasGoodSuit(s, 6)) {
          if (!hand.has4CardMajor() || hand.suitLength(s) >= 6) return true;
        }
      }
      return false;
    }
  });
}

/**
 * Deal for response trainer: North opens with specific bid, South responds
 */
export function dealForResponse(openingType) {
  const constraints = {};

  switch (openingType) {
    case '1H':
      constraints.N = combineConstraints(hcpRange(12, 21), suitMinLength('HEARTS', 5));
      break;
    case '1S':
      constraints.N = combineConstraints(hcpRange(12, 21), suitMinLength('SPADES', 5));
      break;
    case '1NT':
      constraints.N = combineConstraints(hcpRange(15, 18), balanced(), no5CardMajor());
      break;
    case '1C':
      constraints.N = combineConstraints(
        hcpRange(12, 21),
        no5CardMajor(),
        (hand) => !(hand.isBalanced && hand.hcp >= 15 && hand.hcp <= 18)
      );
      break;
    case '1D':
      constraints.N = combineConstraints(
        hcpRange(12, 21),
        no5CardMajor(),
        suitMinLength('DIAMONDS', 4),
        (hand) => !(hand.isBalanced && hand.hcp >= 15 && hand.hcp <= 18)
      );
      break;
    case '2C':
      constraints.N = hcpRange(22, 40);
      break;
    case '2NT':
      constraints.N = combineConstraints(hcpRange(19, 21), balanced(), no5CardMajor());
      break;
    default:
      break;
  }

  // 30% chance: boundary case for responder (South)
  if (Math.random() < BOUNDARY_CHANCE) {
    const boundary = Math.random();
    if (boundary < 0.25) {
      // 5-6 HCP: pass or simple raise?
      constraints.S = hcpRange(5, 6);
    } else if (boundary < 0.5) {
      // 9-10 HCP with fit: raise 2M or invite 3M?
      const hasFit = openingType?.startsWith('1') && ['1H', '1S'].includes(openingType);
      if (hasFit) {
        const suitId = openingType === '1H' ? 'HEARTS' : 'SPADES';
        constraints.S = combineConstraints(hcpRange(9, 10), suitMinLength(suitId, 3));
      } else {
        constraints.S = hcpRange(9, 10);
      }
    } else if (boundary < 0.75) {
      // 12-13 HCP: invite or game?
      constraints.S = hcpRange(12, 13);
    } else {
      // 7-8 HCP after 1NT: pass or Stayman?
      if (openingType === '1NT') {
        constraints.S = combineConstraints(hcpRange(7, 8));
      } else {
        constraints.S = hcpRange(7, 8);
      }
    }
  }

  return dealWithConstraints(constraints);
}

/**
 * Deal for lead trainer: opponents play a contract, you are on lead
 */
export function dealForLead() {
  // East-West play 4♠, South leads
  return dealWithConstraints({
    E: combineConstraints(hcpRange(12, 21), suitMinLength('SPADES', 5)),
    W: combineConstraints(hcpRange(6, 15), suitMinLength('SPADES', 3)),
  });
}
