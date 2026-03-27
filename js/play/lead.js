// Bridge Trainer — Opening Lead Rules (Lesson 10)
import { SUITS, SUIT_ORDER } from '../core/constants.js';

/**
 * Determine the recommended opening lead card from hand
 * @param {Hand} hand - defender's hand
 * @param {string} contractSuit - 'SPADES'|'HEARTS'|'DIAMONDS'|'CLUBS'|null (NT)
 * @param {Object} biddingInfo - { opponentSuits: [], partnerSuit: string|null }
 * @returns {{ card, reason, lessonRef }}
 */
export function recommendLead(hand, contractSuit, biddingInfo = {}) {
  const { opponentSuits = [], partnerSuit = null } = biddingInfo;
  const isNT = !contractSuit;
  const candidates = [];

  // Priority 1: Partner's suit
  if (partnerSuit && hand.suitLength(partnerSuit) > 0) {
    const card = bestLeadFromSuit(hand, partnerSuit);
    candidates.push({ card, reason: `Ход в масть партнёра (${SUITS[partnerSuit].name})`, priority: 10 });
  }

  for (const s of SUIT_ORDER) {
    if (s === contractSuit) continue; // Don't lead trump by default
    const cards = hand.getSuitCards(s);
    if (cards.length === 0) continue;

    // Sequence leads (KQJ, QJ10, etc.)
    const seq = findSequence(cards);
    if (seq) {
      const priority = seq.topRank >= 14 ? 9 : seq.topRank >= 13 ? 8 : 7;
      candidates.push({ card: seq.leadCard, reason: `Секвенция в ${SUITS[s].nameGen}: ${seq.leadCard.display}`, priority });
    }

    // Singleton (against suit contracts, with small trump)
    if (!isNT && cards.length === 1 && contractSuit) {
      const hasTrump = hand.suitLength(contractSuit) >= 1;
      if (hasTrump) {
        candidates.push({ card: cards[0], reason: `Синглет ${SUITS[s].nameGen} → убитка`, priority: 6 });
      }
    }

    // 4th best from long suit
    if (cards.length >= 4) {
      const fourthBest = cards[3]; // 0-indexed, so cards[3] is 4th from top
      const hasFigure = cards.some(c => c.rankValue >= 11);
      if (hasFigure) {
        const p = isNT ? 7 : 5; // More valuable in NT
        candidates.push({ card: fourthBest, reason: `4-я сверху из ${SUITS[s].nameGen} (${cards.length} карт)`, priority: p });
      }
    }

    // MUD from tripleton (middle card)
    if (cards.length === 3 && cards[0].rankValue < 11) {
      candidates.push({ card: cards[1], reason: `Средняя из триплета ${SUITS[s].nameGen}`, priority: 2 });
    }

    // Top of doubleton
    if (cards.length === 2 && !isNT) {
      candidates.push({ card: cards[0], reason: `Старшая из дуплета ${SUITS[s].nameGen}`, priority: 3 });
    }
  }

  // Sort by priority
  candidates.sort((a, b) => b.priority - a.priority);

  if (candidates.length > 0) {
    return { ...candidates[0], lessonRef: 10 };
  }

  // Fallback: lowest card from longest suit
  const longest = hand.longestSuit;
  const cards = hand.getSuitCards(longest);
  return { card: cards[cards.length - 1], reason: 'Младшая из длинной масти', lessonRef: 10 };
}

function findSequence(cards) {
  // Cards already sorted high to low
  if (cards.length < 2) return null;
  for (let i = 0; i < cards.length - 1; i++) {
    if (cards[i].rankValue >= 11 && cards[i].rankValue - cards[i + 1].rankValue === 1) {
      return { leadCard: cards[i], topRank: cards[i].rankValue };
    }
  }
  // Internal sequence: AQJ10 → lead Q
  if (cards.length >= 3) {
    for (let i = 1; i < cards.length - 1; i++) {
      if (cards[i].rankValue >= 11 && cards[i].rankValue - cards[i + 1].rankValue === 1) {
        return { leadCard: cards[i], topRank: cards[i].rankValue };
      }
    }
  }
  return null;
}

function bestLeadFromSuit(hand, suitId) {
  const cards = hand.getSuitCards(suitId);
  if (cards.length === 0) return null;

  const seq = findSequence(cards);
  if (seq) return seq.leadCard;

  if (cards.length >= 4) return cards[3]; // 4th best
  if (cards.length === 3) return cards[1]; // MUD
  if (cards.length === 2) return cards[0]; // top of doubleton
  return cards[0]; // singleton
}
