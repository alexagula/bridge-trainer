// Bridge Trainer — Opener's Rebid Decision Tree
// Rules from Lessons 9-10, Bridge card (Бридж карта.pdf)
import { SUITS, SUIT_ORDER, MAJOR_SUITS, MINOR_SUITS } from '../core/constants.js';
import { parseSuitFromBid, getBidLevel } from '../utils/bid-utils.js';

/**
 * Determine opener's rebid after partner has responded.
 * @param {Hand} openerHand - opener's hand
 * @param {string} opening - opener's first bid ('1♥','1♠','1♣','1♦','2♣','2БК')
 * @param {string} partnerResponse - partner's response bid
 * @returns {{ bid, bidDisplay, reason, lessonRef, steps }}
 */
export function determineRebid(openerHand, opening, partnerResponse) {
  const steps = [];
  const hcp = openerHand.hcp;
  steps.push({ text: `Открытие: ${opening}, ответ партнёра: ${partnerResponse}, HCP: ${hcp}`, passed: true });

  // --- After 2NT opening ---
  if (opening === '2БК') {
    return rebidAfter2NT(openerHand, partnerResponse, steps);
  }

  // --- After 2♣ FG ---
  if (opening === '2♣') {
    return rebidAfter2C(openerHand, partnerResponse, steps);
  }

  // --- After 1♥ or 1♠ ---
  if (opening === '1♥' || opening === '1♠') {
    return rebidAfter1Major(openerHand, opening, partnerResponse, steps);
  }

  // --- After 1♣ or 1♦ ---
  if (opening === '1♣' || opening === '1♦') {
    return rebidAfter1Minor(openerHand, opening, partnerResponse, steps);
  }

  return rebid('пас', 'Пас по умолчанию', 5, steps);
}

// ============================================================
// Rebid after 1♥/1♠
// ============================================================
function rebidAfter1Major(hand, opening, response, steps) {
  const hcp = hand.hcp;
  const openSuit = opening === '1♥' ? 'HEARTS' : 'SPADES';
  const openSym = SUITS[openSuit].symbol;

  // Partner's simple raise: 1M → 2M (6-9 HCP)
  const simpleRaise = `2${openSym}`;
  if (response === simpleRaise) {
    steps.push({ text: `Партнёр поднял до 2${openSym} (простой подъём, 6-9 HCP)`, passed: true });
    if (hcp >= 12 && hcp <= 14) {
      steps.push({ text: `12-14 HCP → нет сил на гейм → ПАС`, passed: true });
      return rebid('пас', `12-14 HCP после подъёма 2${openSym} → пас`, 5, steps);
    }
    if (hcp >= 15 && hcp <= 17) {
      steps.push({ text: `15-17 HCP → инвит 3${openSym}`, passed: true });
      return rebid(`3${openSym}`, `15-17 HCP → инвит 3${openSym}`, 5, steps);
    }
    if (hcp >= 18) {
      steps.push({ text: `18-21 HCP → гейм 4${openSym}`, passed: true });
      return rebid(`4${openSym}`, `18-21 HCP → гейм 4${openSym}`, 5, steps);
    }
  }

  // Partner's invite raise: 1M → 3M (10-11 HCP)
  const inviteRaise = `3${openSym}`;
  if (response === inviteRaise) {
    steps.push({ text: `Партнёр поднял до 3${openSym} (инвит, 10-11 HCP)`, passed: true });
    if (hcp >= 12 && hcp <= 13) {
      steps.push({ text: `12-13 HCP → не хватает до гейма → ПАС`, passed: true });
      return rebid('пас', `12-13 HCP после инвита 3${openSym} → пас`, 5, steps);
    }
    if (hcp >= 14) {
      steps.push({ text: `14+ HCP → гейм 4${openSym}`, passed: true });
      return rebid(`4${openSym}`, `14+ HCP → гейм 4${openSym}`, 5, steps);
    }
  }

  // After 1♥ → 1♠ (Ф1, new major on 1-level)
  if (opening === '1♥' && response === '1♠') {
    return rebidAfter1MajorNewSuit(hand, openSuit, '1♠', 'SPADES', steps);
  }

  // After 1M → 1NT
  if (response === '1БК') {
    return rebidAfter1MajorTo1NT(hand, openSuit, steps);
  }

  // After 1M → 2NT
  if (response === '2БК') {
    return rebidAfter1MajorTo2NT(hand, openSuit, steps);
  }

  // After 1M → new suit on 2-level (Ф1, e.g. 1♠→2♥, 1♥→2♣/2♦)
  const newSuitResponse = parseSuitFromBid(response);
  if (newSuitResponse && newSuitResponse !== openSuit) {
    return rebidAfter1MajorNewSuit(hand, openSuit, response, newSuitResponse, steps);
  }

  return rebid('пас', 'Пас по умолчанию', 5, steps);
}

function rebidAfter1MajorNewSuit(hand, openSuit, responseBid, responseSuit, steps) {
  const hcp = hand.hcp;
  const openSym = SUITS[openSuit].symbol;
  const respSym = SUITS[responseSuit].symbol;
  const fitInResponse = hand.suitLength(responseSuit) >= 4;
  const openLen = hand.suitLength(openSuit);

  steps.push({ text: `Ответ новой мастью (${responseBid}), HCP: ${hcp}`, passed: true });
  steps.push({ text: `Фит в ${SUITS[responseSuit].nameGen}: ${hand.suitLength(responseSuit)} карт (нужно 4+)`, passed: fitInResponse });

  // Fit in partner's suit
  if (fitInResponse) {
    // Determine bid level: raise on nearest level or jump
    const raiseLevel = getBidLevel(responseBid) + 1;
    const raiseNear = `${raiseLevel}${respSym}`;
    if (hcp >= 12 && hcp <= 14) {
      steps.push({ text: `12-14 HCP, фит 4+ → простой подъём ${raiseNear}`, passed: true });
      return rebid(raiseNear, `12-14 HCP, фит 4 карты → подъём ${raiseNear}`, 5, steps);
    }
    if (hcp >= 15 && hcp <= 18) {
      const jumpLevel = raiseLevel + 1;
      const raiseJump = `${jumpLevel}${respSym}`;
      steps.push({ text: `15-18 HCP, фит 4+ → прыжок ${raiseJump}`, passed: true });
      return rebid(raiseJump, `15-18 HCP, фит → прыжок ${raiseJump}`, 5, steps);
    }
  }

  // Rebid own suit (6+ cards, 12-14 HCP)
  if (openLen >= 6 && hcp >= 12 && hcp <= 14) {
    const rebidLevel = getBidLevel(responseBid) <= 1 ? 2 : getBidLevel(responseBid);
    const ownRebid = `${rebidLevel}${openSym}`;
    steps.push({ text: `12-14 HCP, 6+ карт в масти открытия → повтор ${ownRebid} (НФ)`, passed: true });
    return rebid(ownRebid, `12-14 HCP, 6 карт → повтор ${ownRebid}`, 5, steps);
  }

  // NT on nearest level (12-14, balanced)
  if (hand.isBalanced && hcp >= 12 && hcp <= 14) {
    const ntLevel = getBidLevel(responseBid) <= 1 ? 1 : getBidLevel(responseBid);
    const ntBid = `${ntLevel}БК`;
    steps.push({ text: `12-14 HCP, равномер, нет фита → ${ntBid} (НФ)`, passed: true });
    return rebid(ntBid, `12-14 HCP, равномер → ${ntBid}`, 5, steps);
  }

  // NT jump (15-18, balanced)
  if (hand.isBalanced && hcp >= 15 && hcp <= 18) {
    const ntLevel = getBidLevel(responseBid) <= 1 ? 2 : getBidLevel(responseBid) + 1;
    const ntJump = `${ntLevel}БК`;
    steps.push({ text: `15-18 HCP, равномер, нет фита → прыжок ${ntJump}`, passed: true });
    return rebid(ntJump, `15-18 HCP, равномер → ${ntJump}`, 5, steps);
  }

  // New suit (15+, Ф1)
  if (hcp >= 15) {
    for (const s of SUIT_ORDER) {
      if (s === openSuit || s === responseSuit) continue;
      if (hand.suitLength(s) >= 4) {
        const sym = SUITS[s].symbol;
        const level = getBidLevel(responseBid) <= 1 ? 2 : getBidLevel(responseBid);
        const newBid = `${level}${sym}`;
        steps.push({ text: `15+ HCP, новая масть ${newBid} (Ф1)`, passed: true });
        return rebid(newBid, `15+ HCP, новая масть → ${newBid}`, 5, steps);
      }
    }
  }

  steps.push({ text: `Нет подходящего ребида → пас`, passed: false });
  return rebid('пас', 'Пас', 5, steps);
}

function rebidAfter1MajorTo1NT(hand, openSuit, steps) {
  const hcp = hand.hcp;
  const openSym = SUITS[openSuit].symbol;
  const openLen = hand.suitLength(openSuit);

  steps.push({ text: `Партнёр ответил 1БК (6-9 HCP, без фита)`, passed: true });

  // Pass: 12-14 (balanced or no special rebid)
  if (hcp >= 12 && hcp <= 14 && openLen < 6 && hand.isBalanced) {
    steps.push({ text: `12-14 HCP, равномер, нет 6-карточной масти → ПАС`, passed: true });
    return rebid('пас', `12-14 HCP после 1БК → пас`, 5, steps);
  }

  // Rebid own suit: 12-14, 6 cards
  if (hcp >= 12 && hcp <= 14 && openLen >= 6) {
    steps.push({ text: `12-14 HCP, 6 карт в ${SUITS[openSuit].nameGen} → повтор 2${openSym} (НФ)`, passed: true });
    return rebid(`2${openSym}`, `12-14 HCP, 6 карт → повтор 2${openSym}`, 5, steps);
  }

  // New suit: 15+, unbalanced, no fit
  if (hcp >= 15 && !hand.isBalanced) {
    for (const s of SUIT_ORDER) {
      if (s === openSuit) continue;
      if (hand.suitLength(s) >= 4) {
        const sym = SUITS[s].symbol;
        steps.push({ text: `15+ HCP, неравномер, 4+ ${SUITS[s].nameGen} → 2${sym} (Ф1)`, passed: true });
        return rebid(`2${sym}`, `15+ HCP, новая масть → 2${sym}`, 5, steps);
      }
    }
  }

  // 2NT: invite, 15-18
  if (hcp >= 15 && hcp <= 18) {
    steps.push({ text: `15-18 HCP → инвит 2БК (НФ)`, passed: true });
    return rebid('2БК', `15-18 HCP → инвит 2БК`, 5, steps);
  }

  // 3NT: game, 19-21
  if (hcp >= 19) {
    steps.push({ text: `19-21 HCP → игра 3БК`, passed: true });
    return rebid('3БК', `19-21 HCP → гейм 3БК`, 5, steps);
  }

  // Default pass: 12-14
  steps.push({ text: `12-14 HCP → пас`, passed: true });
  return rebid('пас', `12-14 HCP после 1БК → пас`, 5, steps);
}

function rebidAfter1MajorTo2NT(hand, openSuit, steps) {
  const hcp = hand.hcp;
  const openSym = SUITS[openSuit].symbol;
  const openLen = hand.suitLength(openSuit);

  steps.push({ text: `Партнёр ответил 2БК (10-12 HCP, инвит)`, passed: true });

  // Pass: 12-14
  if (hcp >= 12 && hcp <= 14 && openLen < 6) {
    steps.push({ text: `12-14 HCP, нет 6-карточной масти → ПАС`, passed: true });
    return rebid('пас', `12-14 HCP после 2БК → пас`, 5, steps);
  }

  // Rebid own suit: 12-14, 6 cards
  if (hcp >= 12 && hcp <= 14 && openLen >= 6) {
    steps.push({ text: `12-14 HCP, 6 карт → повтор 3${openSym} (НФ)`, passed: true });
    return rebid(`3${openSym}`, `12-14 HCP, 6 карт → повтор 3${openSym}`, 5, steps);
  }

  // New suit: sharp unbalanced, 15+
  if (hcp >= 15 && !hand.isBalanced) {
    for (const s of SUIT_ORDER) {
      if (s === openSuit) continue;
      if (hand.suitLength(s) >= 4) {
        const sym = SUITS[s].symbol;
        steps.push({ text: `Резкий неравномер, 15+ HCP → новая масть 3${sym} (Ф1)`, passed: true });
        return rebid(`3${sym}`, `Резкий неравномер, новая масть → 3${sym}`, 5, steps);
      }
    }
  }

  // 3NT: game, 15-19
  if (hcp >= 15) {
    steps.push({ text: `15+ HCP → игра 3БК`, passed: true });
    return rebid('3БК', `15-19 HCP → гейм 3БК`, 5, steps);
  }

  steps.push({ text: `12-14 HCP → пас`, passed: true });
  return rebid('пас', `12-14 HCP после 2БК → пас`, 5, steps);
}

// ============================================================
// Rebid after 1♣/1♦
// ============================================================
function rebidAfter1Minor(hand, opening, response, steps) {
  const hcp = hand.hcp;
  const openSuit = opening === '1♣' ? 'CLUBS' : 'DIAMONDS';

  // After 1m → 1♥/1♠ (Ф1, major response)
  if (response === '1♥' || response === '1♠') {
    return rebidAfter1MinorMajorResponse(hand, openSuit, response, steps);
  }

  // After 1m → 1БК or 2♣ or 2♦ (weak NT or minor raise)
  if (response === '1БК' || response === '2♣' || response === '2♦') {
    return rebidAfter1MinorWeakResponse(hand, openSuit, response, steps);
  }

  // After 1m → 2БК or 3♣ or 3♦ (stronger responses)
  if (response === '2БК' || response === '3♣' || response === '3♦') {
    return rebidAfter1MinorStrongResponse(hand, openSuit, response, steps);
  }

  return rebid('пас', 'Пас по умолчанию', 5, steps);
}

function rebidAfter1MinorMajorResponse(hand, openSuit, response, steps) {
  const hcp = hand.hcp;
  const respSuit = response === '1♥' ? 'HEARTS' : 'SPADES';
  const respSym = SUITS[respSuit].symbol;
  const fitInResp = hand.suitLength(respSuit) >= 4;
  const otherMajor = respSuit === 'HEARTS' ? 'SPADES' : 'HEARTS';
  const otherMajorSym = SUITS[otherMajor].symbol;
  const has4OtherMajor = hand.suitLength(otherMajor) >= 4;

  steps.push({ text: `Ответ ${response} (мажор Ф1), HCP: ${hcp}`, passed: true });
  steps.push({ text: `Фит в ${SUITS[respSuit].nameGen}: ${hand.suitLength(respSuit)} карт (нужно 4+)`, passed: fitInResp });

  // Show other 4-card major first (before fit)
  if (has4OtherMajor && !fitInResp) {
    steps.push({ text: `4+ ${SUITS[otherMajor].nameGen}, нет фита в ответной → показываем ${otherMajorSym}`, passed: true });
    const lvl = SUITS[otherMajor].rank > SUITS[respSuit === 'HEARTS' ? 'CLUBS' : 'HEARTS'].rank ? 1 : 2;
    const otherBid = respSuit === 'HEARTS' ? `1${otherMajorSym}` : `2${otherMajorSym}`;
    return rebid(otherBid, `12+ HCP, 4+ ${SUITS[otherMajor].nameGen} → ${otherBid}`, 5, steps);
  }

  // 1NT: 12-14, no 4-card major, balanced
  if (hand.isBalanced && !hand.has4CardMajor() && hcp >= 12 && hcp <= 14) {
    steps.push({ text: `12-14 HCP, нет 4-карточного мажора, равномер → 1БК`, passed: true });
    return rebid('1БК', `12-14 HCP, равномер, нет мажора → 1БК`, 5, steps);
  }

  // Simple fit raise: 12-14, 4+ fit
  if (fitInResp && hcp >= 12 && hcp <= 14) {
    steps.push({ text: `12-14 HCP, фит 4+ → простой подъём 2${respSym}`, passed: true });
    return rebid(`2${respSym}`, `12-14 HCP, фит → подъём 2${respSym}`, 5, steps);
  }

  // 2NT: 15-17, no 4-card major, balanced
  if (hand.isBalanced && !hand.has4CardMajor() && hcp >= 15 && hcp <= 17) {
    steps.push({ text: `15-17 HCP, нет мажора, равномер → 2БК`, passed: true });
    return rebid('2БК', `15-17 HCP, равномер → 2БК`, 5, steps);
  }

  // Invite fit raise: 15-17, 4+ fit
  if (fitInResp && hcp >= 15 && hcp <= 17) {
    steps.push({ text: `15-17 HCP, фит → инвит 3${respSym}`, passed: true });
    return rebid(`3${respSym}`, `15-17 HCP, фит → инвит 3${respSym}`, 5, steps);
  }

  // New minor: 15+, unbalanced, no 4-card major
  if (hcp >= 15 && !hand.isBalanced && !hand.has4CardMajor()) {
    for (const s of MINOR_SUITS) {
      if (s === openSuit) continue;
      if (hand.suitLength(s) >= 4) {
        const sym = SUITS[s].symbol;
        steps.push({ text: `15+ HCP, неравномер → новый минор 2${sym} (Ф1)`, passed: true });
        return rebid(`2${sym}`, `15+ HCP, новый минор → 2${sym}`, 5, steps);
      }
    }
  }

  // 3NT: 18-21, no 4-card major, balanced
  if (hand.isBalanced && !hand.has4CardMajor() && hcp >= 18) {
    steps.push({ text: `18-21 HCP, нет мажора, равномер → 3БК`, passed: true });
    return rebid('3БК', `18-21 HCP, равномер → гейм 3БК`, 5, steps);
  }

  // Game fit: 18-21, 4+ fit
  if (fitInResp && hcp >= 18) {
    steps.push({ text: `18-21 HCP, фит → гейм 4${respSym}`, passed: true });
    return rebid(`4${respSym}`, `18-21 HCP, фит → гейм 4${respSym}`, 5, steps);
  }

  steps.push({ text: `Нет подходящего ребида → пас`, passed: false });
  return rebid('пас', `Пас`, 5, steps);
}

function rebidAfter1MinorWeakResponse(hand, openSuit, response, steps) {
  const hcp = hand.hcp;

  steps.push({ text: `Ответ ${response} (слабый, 6-9 HCP)`, passed: true });

  // Pass: 12-14
  if (hcp >= 12 && hcp <= 14) {
    steps.push({ text: `12-14 HCP → ПАС`, passed: true });
    return rebid('пас', `12-14 HCP → пас`, 5, steps);
  }

  // New suit: 15+, unbalanced, no fit
  if (hcp >= 15 && !hand.isBalanced) {
    for (const s of SUIT_ORDER) {
      if (s === openSuit) continue;
      if (hand.suitLength(s) >= 4) {
        const sym = SUITS[s].symbol;
        const lvl = SUITS[s].rank <= SUITS[openSuit].rank ? 2 : 1;
        const newBid = `${lvl}${sym}`;
        steps.push({ text: `15+ HCP, неравномер → новая масть ${newBid}`, passed: true });
        return rebid(newBid, `15+ HCP, новая масть → ${newBid}`, 5, steps);
      }
    }
  }

  // Invite: 2NT/3♣/3♦ — 15-17
  if (hcp >= 15 && hcp <= 17) {
    // Choose the appropriate invite: if response was NT → 2NT, else raise the minor
    if (response === '1БК') {
      steps.push({ text: `15-17 HCP → инвит 2БК`, passed: true });
      return rebid('2БК', `15-17 HCP → инвит 2БК`, 5, steps);
    }
    const openSym = SUITS[openSuit].symbol;
    const inviteLevel = getNextLevel(response);
    steps.push({ text: `15-17 HCP → инвит ${inviteLevel}${openSym}`, passed: true });
    return rebid(`${inviteLevel}${openSym}`, `15-17 HCP → инвит`, 5, steps);
  }

  // Game: 18-21
  if (hcp >= 18) {
    if (response === '1БК') {
      steps.push({ text: `18-21 HCP → гейм 3БК`, passed: true });
      return rebid('3БК', `18-21 HCP → гейм 3БК`, 5, steps);
    }
    const openSym = SUITS[openSuit].symbol;
    steps.push({ text: `18-21 HCP → гейм 5${openSym}`, passed: true });
    return rebid(`5${openSym}`, `18-21 HCP → гейм 5${openSym}`, 5, steps);
  }

  return rebid('пас', 'Пас', 5, steps);
}

function rebidAfter1MinorStrongResponse(hand, openSuit, response, steps) {
  const hcp = hand.hcp;

  steps.push({ text: `Ответ ${response} (сильный ответ)`, passed: true });

  // Pass: 12-14
  if (hcp >= 12 && hcp <= 14) {
    steps.push({ text: `12-14 HCP → ПАС`, passed: true });
    return rebid('пас', `12-14 HCP → пас`, 5, steps);
  }

  // New suit: 15+, unbalanced, no fit
  if (hcp >= 15 && !hand.isBalanced) {
    for (const s of SUIT_ORDER) {
      if (s === openSuit) continue;
      if (hand.suitLength(s) >= 4) {
        const sym = SUITS[s].symbol;
        const newBid = `3${sym}`;
        steps.push({ text: `15+ HCP, неравномер → новая масть ${newBid}`, passed: true });
        return rebid(newBid, `15+ HCP, новая масть → ${newBid}`, 5, steps);
      }
    }
  }

  // 3NT: game, 15-21
  if (hcp >= 15) {
    steps.push({ text: `15+ HCP → гейм 3БК`, passed: true });
    return rebid('3БК', `15-21 HCP → гейм 3БК`, 5, steps);
  }

  // 5♣/5♦: game in minor, 18-21
  if (hcp >= 18) {
    const openSym = SUITS[openSuit].symbol;
    steps.push({ text: `18-21 HCP → гейм 5${openSym}`, passed: true });
    return rebid(`5${openSym}`, `18-21 HCP → гейм 5${openSym}`, 5, steps);
  }

  return rebid('пас', 'Пас', 5, steps);
}

// ============================================================
// Rebid after 2♣ FG
// ============================================================
function rebidAfter2C(hand, response, steps) {
  const hcp = hand.hcp;

  steps.push({ text: `Открытие 2♣ ФГ, ответ: ${response}`, passed: true });

  // After 2♣ → 2♦ (negative)
  if (response === '2♦') {
    steps.push({ text: `Негатив 2♦ от партнёра`, passed: true });

    // Show 5+ card suit naturally
    for (const s of ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS']) {
      if (hand.suitLength(s) >= 5) {
        const sym = SUITS[s].symbol;
        const level = SUITS[s].rank >= 2 ? 2 : 3; // majors on 2-level, minors on 3-level
        steps.push({ text: `5+ карт в ${SUITS[s].nameGen} → ${level}${sym} натурально`, passed: true });
        return rebid(`${level}${sym}`, `Показываем 5+ карт в ${SUITS[s].nameGen}`, 8, steps);
      }
    }

    // No 5-card suit → 3NT
    steps.push({ text: `Нет 5-карточной масти → 3БК`, passed: true });
    return rebid('3БК', `Нет 5-карточной масти → 3БК`, 8, steps);
  }

  // After 2♣ → positive (2♥/2♠/3♣/3♦)
  const respSuit = parseSuitFromBid(response);
  if (respSuit) {
    steps.push({ text: `Позитивный ответ ${response}`, passed: true });
    const fitInResp = hand.suitLength(respSuit) >= 4;

    // Fit in partner's suit
    if (fitInResp) {
      const sym = SUITS[respSuit].symbol;
      const nextLevel = getBidLevel(response) + 1;
      const fitBid = `${nextLevel}${sym}`;
      steps.push({ text: `Фит 4+ в ${SUITS[respSuit].nameGen} → ${fitBid}`, passed: true });
      return rebid(fitBid, `Фит в ${SUITS[respSuit].nameGen} → ${fitBid}`, 8, steps);
    }

    // New suit: no fit, 5+ cards in own suit
    for (const s of ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS']) {
      if (s === respSuit) continue;
      if (hand.suitLength(s) >= 5) {
        const sym = SUITS[s].symbol;
        const lvl = getBidLevel(response) <= 2 ? getBidLevel(response) : getBidLevel(response);
        const newBid = `${Math.max(getBidLevel(response), SUITS[s].rank >= 2 ? 2 : 3)}${sym}`;
        steps.push({ text: `Нет фита, 5+ ${SUITS[s].nameGen} → ${newBid}`, passed: true });
        return rebid(newBid, `Нет фита, показываем ${SUITS[s].nameGen}`, 8, steps);
      }
    }

    // NT: no fit, no 5-card suit
    const ntLevel = getBidLevel(response) + 1;
    const ntBid = `${ntLevel}БК`;
    steps.push({ text: `Нет фита и 5-карточной масти → ${ntBid}`, passed: true });
    return rebid(ntBid, `Нет фита и масти → ${ntBid}`, 8, steps);
  }

  return rebid('3БК', `2♣ ФГ, неизвестный ответ → 3БК`, 8, steps);
}

// ============================================================
// Rebid after 2NT opening
// ============================================================
function rebidAfter2NT(hand, response, steps) {
  steps.push({ text: `Открытие 2БК, ответ: ${response}`, passed: true });

  // After 2NT → 3♣ (Stayman)
  if (response === '3♣') {
    const spades = hand.suitLength('SPADES');
    const hearts = hand.suitLength('HEARTS');

    steps.push({ text: `Стейман 3♣: партнёр ищет 4-карточный мажор`, passed: true });

    if (hearts >= 4) {
      steps.push({ text: `4+ червей → 3♥`, passed: true });
      return rebid('3♥', `4 червей → 3♥ на Стейман`, 8, steps);
    }
    if (spades >= 4) {
      steps.push({ text: `4+ пик → 3♠`, passed: true });
      return rebid('3♠', `4 пик → 3♠ на Стейман`, 8, steps);
    }

    steps.push({ text: `Нет 4-карточного мажора → 3♦`, passed: true });
    return rebid('3♦', `Нет 4-карточного мажора → 3♦`, 8, steps);
  }

  return rebid('3БК', `2БК, неизвестный ответ → 3БК`, 8, steps);
}

// ============================================================
// Helper functions
// ============================================================

// parseSuitFromBid and getBidLevel imported from ../utils/bid-utils.js

/**
 * Get next level number after a given bid
 */
function getNextLevel(bid) {
  return getBidLevel(bid) + 1;
}

function rebid(bid, reason, lessonRef, steps) {
  return { bid, bidDisplay: bid === 'пас' ? 'Пас' : bid, reason, lessonRef, steps };
}
