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

