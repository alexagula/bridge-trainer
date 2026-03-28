// Bridge Trainer — Overcall Logic (Lesson 1, 3, 4, 7)
import { SUITS, SUIT_ORDER, MAJOR_SUITS } from '../core/constants.js';
import { canTakeoutDouble } from './conventions.js';
import { parseSuitFromBid } from '../utils/bid-utils.js';

/**
 * Determine overcall after opponent's opening
 * @param {Hand} hand
 * @param {string} opponentBid - e.g. '1♣', '1♦', '1♥', '1♠'
 * @returns {{ bid, reason, lessonRef }}
 */
export function determineOvercall(hand, opponentBid) {
  const hcp = hand.hcp;
  const oppSuit = bidToSuit(opponentBid);
  const oppLevel = parseInt(opponentBid[0]);

  if (hcp < 12) {
    return { bid: 'пас', reason: `${hcp} HCP — недостаточно для входа`, lessonRef: 1 };
  }

  // 1. Suit overcall: 12-16 HCP, 5+ cards in own suit
  if (hcp >= 12 && hcp <= 16) {
    for (const s of [...SUIT_ORDER].reverse()) { // prefer higher suits
      if (s === oppSuit) continue;
      if (hand.suitLength(s) >= 5) {
        const sym = SUITS[s].symbol;
        const suitRank = SUITS[s].rank;
        const oppSuitRank = oppSuit ? SUITS[oppSuit].rank : -1;

        // Can bid at 1-level?
        let level;
        if (oppLevel === 1 && suitRank > oppSuitRank) {
          level = 1;
        } else {
          level = 2;
        }

        return {
          bid: `${level}${sym}`,
          reason: `12-16 HCP, ${hand.suitLength(s)} ${SUITS[s].nameGen} → вход ${level}${sym}`,
          lessonRef: 1,
        };
      }
    }
  }

  // 2. 1NT overcall: 15-18, balanced, no 5-card major, stopper in opponent's suit
  if (hcp >= 15 && hcp <= 18 && hand.isBalanced && !hand.has5PlusMajor()) {
    if (oppSuit && hand.hasStopper(oppSuit)) {
      return {
        bid: '1БК',
        reason: `15-18 HCP, равномерный, держка в ${SUITS[oppSuit].nameGen} → вход 1БК`,
        lessonRef: 3,
      };
    }
  }

  // 3. Takeout double: 12+, support for unbid suits
  if (oppSuit) {
    const dblCheck = canTakeoutDouble(hand, oppSuit);
    if (dblCheck.can) {
      return {
        bid: 'контра',
        reason: dblCheck.reason,
        lessonRef: 7,
      };
    }
  }

  // 4. Strong hand 17+: double first, describe later
  if (hcp >= 17) {
    return {
      bid: 'контра',
      reason: `${hcp} HCP → вызывная контра (покажем руку позже)`,
      lessonRef: 7,
    };
  }

  // 5. Long in opponent's suit: pass and wait
  if (oppSuit && hand.suitLength(oppSuit) >= 5) {
    return {
      bid: 'пас',
      reason: `${hand.suitLength(oppSuit)} карт в масти оппонента → пас (ловушка)`,
      lessonRef: 7,
    };
  }

  return { bid: 'пас', reason: 'Нет подходящего входа → пас', lessonRef: 7 };
}

// bidToSuit replaced by imported parseSuitFromBid
const bidToSuit = parseSuitFromBid;
