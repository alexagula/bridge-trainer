// Bridge Trainer — Hand Evaluation Utilities
import { SUIT_ORDER, MAJOR_SUITS, MINOR_SUITS, SUITS } from './constants.js';

/**
 * Full hand evaluation for display and training
 */
export function evaluateHand(hand) {
  const dist = hand.distribution;
  const shape = hand.shape;
  const shapeStr = hand.shapeString;

  // Singletons and voids
  const singletons = SUIT_ORDER.filter(s => dist[s] === 1);
  const voids = SUIT_ORDER.filter(s => dist[s] === 0);
  const doubletons = SUIT_ORDER.filter(s => dist[s] === 2);

  // Distribution description
  let distType;
  if (hand.isBalanced) {
    distType = 'равномерный';
  } else if (voids.length > 0) {
    distType = 'очень неравномерный (есть ренонс)';
  } else if (singletons.length > 0) {
    distType = 'неравномерный (есть синглет)';
  } else {
    distType = 'неравномерный';
  }

  // Major analysis
  const spades = dist.SPADES;
  const hearts = dist.HEARTS;
  const hasMajorFit5 = spades >= 5 || hearts >= 5;
  const hasMajor4 = spades >= 4 || hearts >= 4;

  // Stoppers
  const stoppers = {};
  for (const s of SUIT_ORDER) {
    stoppers[s] = hand.hasStopper(s);
  }
  const allStoppers = SUIT_ORDER.every(s => stoppers[s]);

  return {
    hcp: hand.hcp,
    distributionPoints: hand.distributionPoints,
    totalPoints: hand.totalPoints,
    shape,
    shapeStr,
    distType,
    isBalanced: hand.isBalanced,
    singletons: singletons.map(s => SUITS[s].name),
    voids: voids.map(s => SUITS[s].name),
    doubletons: doubletons.map(s => SUITS[s].name),
    hasMajorFit5: hasMajorFit5,
    hasMajor4: hasMajor4,
    longestSuit: SUITS[hand.longestSuit].name,
    stoppers,
    allStoppers,
    suitLengths: {
      '♠': spades,
      '♥': hearts,
      '♦': dist.DIAMONDS,
      '♣': dist.CLUBS,
    },
    aces: hand.countAces(),
    kings: hand.countKings(),
  };
}

/**
 * Describe hand in Russian for explanations
 */
export function describeHand(hand) {
  const ev = evaluateHand(hand);
  const parts = [];

  parts.push(`${ev.hcp} HCP`);
  parts.push(`Расклад: ${ev.shapeStr} (${ev.distType})`);

  if (ev.singletons.length > 0) {
    parts.push(`Синглет: ${ev.singletons.join(', ')}`);
  }
  if (ev.voids.length > 0) {
    parts.push(`Ренонс: ${ev.voids.join(', ')}`);
  }
  if (ev.distributionPoints > 0) {
    parts.push(`Очки за расклад: +${ev.distributionPoints} (всего ${ev.totalPoints})`);
  }

  const lengths = [];
  for (const [sym, len] of Object.entries(ev.suitLengths)) {
    lengths.push(`${sym}${len}`);
  }
  parts.push(`Длины: ${lengths.join(' ')}`);

  return parts.join('\n');
}

/**
 * Check if a hand qualifies for specific opening
 */
export function getOpeningQualification(hand) {
  const hcp = hand.hcp;
  const qualifications = [];

  if (hcp < 12) {
    qualifications.push({ bid: 'pass', match: true, reason: `${hcp} HCP — менее 12, пас` });
  }

  if (hcp >= 12 && hcp <= 21 && hand.has5PlusMajor()) {
    const suit = hand.longestMajor;
    qualifications.push({
      bid: `1${SUITS[suit].symbol}`,
      match: true,
      reason: `${hcp} HCP, ${hand.suitLength(suit)} карт в ${SUITS[suit].nameGen} → открытие 1 в мажоре`
    });
  }

  if (hcp >= 15 && hcp <= 18 && hand.isBalanced && !hand.has5PlusMajor()) {
    qualifications.push({
      bid: '1БК',
      match: true,
      reason: `${hcp} HCP, равномерный расклад, нет мажора 5+ → открытие 1БК`
    });
  }

  if (hcp >= 19 && hcp <= 21 && hand.isBalanced && !hand.has5PlusMajor()) {
    qualifications.push({
      bid: '2БК',
      match: true,
      reason: `${hcp} HCP, равномерный расклад → открытие 2БК`
    });
  }

  if (hcp >= 22) {
    qualifications.push({
      bid: '2♣',
      match: true,
      reason: `${hcp} HCP → открытие 2♣ форсинг-гейм`
    });
  }

  return qualifications;
}
