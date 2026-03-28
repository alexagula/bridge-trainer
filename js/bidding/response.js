// Bridge Trainer — Response Decision Trees
// Covers Lessons 1-6: responses to all opening types
import { SUITS, SUIT_ORDER, MAJOR_SUITS, MINOR_SUITS } from '../core/constants.js';

/**
 * Determine response to partner's opening.
 * @param {string} opening - partner's opening bid ('1♥','1♠','1БК','1♦','1♣','2♣','2БК','2♥','2♠')
 * @param {Hand} hand - responder's hand
 * @returns {{ bid, bidDisplay, reason, lessonRef, steps }}
 */
export function determineResponse(opening, hand) {
  switch (opening) {
    case '1♥': return respondToOneMajor(hand, 'HEARTS');
    case '1♠': return respondToOneMajor(hand, 'SPADES');
    case '1БК': return respondTo1NT(hand);
    case '1♣': return respondToOneMinor(hand, 'CLUBS');
    case '1♦': return respondToOneMinor(hand, 'DIAMONDS');
    case '2♣': return respondTo2C(hand);
    case '2БК': return respondTo2NT(hand);
    case '2♥': return respondToWeakTwo(hand, 'HEARTS');
    case '2♠': return respondToWeakTwo(hand, 'SPADES');
    case '2♦': return respondToWeakTwo(hand, 'DIAMONDS');
    default: return { bid: 'пас', bidDisplay: 'Пас', reason: 'Неизвестное открытие', lessonRef: 1, steps: [] };
  }
}

// --- Response to 1♥/1♠ (Lessons 1-2) ---
function respondToOneMajor(hand, suitId) {
  const hcp = hand.hcp;
  const fit = hand.suitLength(suitId) >= 3;
  const sym = SUITS[suitId].symbol;
  const steps = [];

  steps.push({ text: `HCP: ${hcp}`, passed: true });

  // Weak preemptive raise: 0-9 HCP, 5+ fit, singleton or void on the side
  // Checked before the hcp<6 pass because this bid works with any HCP count
  if (fit && hcp <= 9 && hand.suitLength(suitId) >= 5) {
    const hasSideShortness = SUIT_ORDER.filter(s => s !== suitId).some(s => hand.suitLength(s) <= 1);
    if (hasSideShortness) {
      steps.push({ text: `0-9 HCP + фит 5+ + краткость сбоку → перебивка 4${sym}`, passed: true });
      return res(`4${sym}`, `0-9 HCP, ${hand.suitLength(suitId)} карт фита, краткость сбоку → перебивка 4${sym}`, 2, steps);
    }
  }

  if (hcp < 6) {
    steps.push({ text: 'Менее 6 HCP → пас', passed: true });
    return res('пас', 'Менее 6 HCP — пас', 1, steps);
  }

  steps.push({ text: `Фит в ${SUITS[suitId].nameGen}: ${hand.suitLength(suitId)} карт (нужно 3+)`, passed: fit });

  if (fit) {
    if (hcp >= 12) {
      steps.push({ text: `12+ HCP + фит → гейм 4${sym}`, passed: true });
      return res(`4${sym}`, `12+ HCP, фит → гейм 4${sym}`, 2, steps);
    }
    if (hcp >= 10 && hcp <= 11) {
      steps.push({ text: `10-11 HCP + фит → инвит 3${sym}`, passed: true });
      return res(`3${sym}`, `10-11 HCP, фит → инвит 3${sym}`, 2, steps);
    }
    if (hcp >= 6 && hcp <= 9) {
      steps.push({ text: `6-9 HCP + фит → простой подъём 2${sym}`, passed: true });
      return res(`2${sym}`, `6-9 HCP, ${hand.suitLength(suitId)} карт фита → подъём 2${sym}`, 1, steps);
    }
  }

  // Without fit — search for own suit or NT

  // 1♥ → 2♠: jump (forcing to game), 13+ HCP, 5+ spades
  if (suitId === 'HEARTS' && hand.suitLength('SPADES') >= 5 && hcp >= 13) {
    steps.push({ text: `13+ HCP, 5+ пик → прыжок 2♠ (ФГ)`, passed: true });
    return res('2♠', `13+ HCP, 5+ пик → прыжок 2♠ (ФГ, форс до гейма)`, 5, steps);
  }

  // 1♥ → 1♠: 4+ spades, 6+ HCP (1st level, Ф1)
  if (suitId === 'HEARTS' && hand.suitLength('SPADES') >= 4 && hcp >= 6) {
    steps.push({ text: `4+ пик, 6+ HCP → ответ 1♠`, passed: true });
    return res('1♠', `Нет фита в черве, 4+ пик → 1♠`, 4, steps);
  }

  // New suit on 2nd level (Ф1, 10+ HCP, 4+ cards)
  for (const s of [...SUIT_ORDER].reverse()) {
    if (s === suitId) continue;
    // Spades after 1♥ are already handled above (1-level and jump)
    if (suitId === 'HEARTS' && s === 'SPADES') continue;
    if (hand.suitLength(s) >= 4 && hcp >= 10) {
      const newSym = SUITS[s].symbol;
      steps.push({ text: `10+ HCP, 4+ ${SUITS[s].nameGen} → новая масть 2${newSym}`, passed: true });
      return res(`2${newSym}`, `10+ HCP, 4+ в ${SUITS[s].nameGen} → 2${newSym}`, 5, steps);
    }
  }

  // NT responses (balanced, no fit, no suitable new suit)
  if (hand.isBalanced || !hand.has5PlusMajor()) {
    if (hcp >= 6 && hcp <= 9) {
      steps.push({ text: '6-9 HCP, нет фита → 1БК', passed: true });
      return res('1БК', '6-9 HCP, нет фита → 1БК', 6, steps);
    }
    if (hcp >= 10 && hcp <= 12) {
      steps.push({ text: '10-12 HCP, нет фита → 2БК инвит', passed: true });
      return res('2БК', '10-12 HCP → инвит 2БК', 6, steps);
    }
    if (hcp >= 13) {
      steps.push({ text: '13+ HCP, нет фита → 3БК', passed: true });
      return res('3БК', '13+ HCP → гейм 3БК', 6, steps);
    }
  }

  steps.push({ text: '6-9 HCP, нет фита, нет масти на 1-м уровне → 1БК', passed: true });
  return res('1БК', 'Нет фита и масти → 1БК', 6, steps);
}

// --- Response to 1NT (Lesson 3) ---
function respondTo1NT(hand) {
  const hcp = hand.hcp;
  const steps = [];
  steps.push({ text: `HCP: ${hcp}`, passed: true });

  // Weak with long suit
  if (hcp < 8) {
    if (hand.suitLength('SPADES') >= 5) return res('2♠', 'Слабая рука, 5+ пик → сброс 2♠', 3, steps);
    if (hand.suitLength('HEARTS') >= 5) return res('2♥', 'Слабая рука, 5+ червей → сброс 2♥', 3, steps);
    if (hand.suitLength('DIAMONDS') >= 5) return res('2♦', 'Слабая рука, 5+ бубен → сброс 2♦', 3, steps);
    steps.push({ text: '0-7 HCP, равномерный → пас', passed: true });
    return res('пас', '0-7 HCP → пас на 1БК', 3, steps);
  }

  // Stayman: 8+ with 4-card major
  if (hand.has4CardMajor()) {
    steps.push({ text: `8+ HCP, 4 карты в мажоре → Стейман 2♣`, passed: true });
    return res('2♣', 'Стейман: 4+ в мажоре, ищем фит', 3, steps);
  }

  // 5+ card major with game values (check 6+ before 5+ to avoid shadowing game bids)
  if (hcp >= 10 && hand.suitLength('SPADES') >= 6) return res('4♠', '10+ HCP, 6+ пик → гейм 4♠', 3, steps);
  if (hcp >= 10 && hand.suitLength('HEARTS') >= 6) return res('4♥', '10+ HCP, 6+ червей → гейм 4♥', 3, steps);
  if (hcp >= 10 && hand.suitLength('SPADES') >= 5) return res('3♠', '10+ HCP, 5 пик → ФГ 3♠', 3, steps);
  if (hcp >= 10 && hand.suitLength('HEARTS') >= 5) return res('3♥', '10+ HCP, 5 червей → ФГ 3♥', 3, steps);

  // NT responses
  if (hcp >= 8 && hcp <= 9) {
    steps.push({ text: '8-9 HCP → инвит 2БК', passed: true });
    return res('2БК', '8-9 HCP → инвит 2БК', 3, steps);
  }
  if (hcp >= 10 && hcp <= 15) {
    steps.push({ text: '10-15 HCP → гейм 3БК', passed: true });
    return res('3БК', '10-15 HCP → гейм 3БК', 3, steps);
  }
  if (hcp >= 16 && hcp <= 17) {
    steps.push({ text: '16-17 HCP → инвит в шлем 4БК', passed: true });
    return res('4БК', '16-17 HCP → инвит в шлем 4БК', 3, steps);
  }
  if (hcp >= 18) {
    steps.push({ text: '18+ HCP → шлем 6БК', passed: true });
    return res('6БК', '18+ HCP → малый шлем 6БК', 3, steps);
  }

  return res('пас', 'Пас', 3, steps);
}

// --- Response to 1♣/1♦ (Lesson 4) ---
function respondToOneMinor(hand, openingSuit) {
  const hcp = hand.hcp;
  const steps = [];
  steps.push({ text: `HCP: ${hcp}`, passed: true });

  if (hcp < 6) {
    return res('пас', 'Менее 6 HCP → пас', 4, steps);
  }

  // Priority 1: fit in major of opener? (opener showed minor, so no)
  // Priority 2: own 4+ card major
  if (hcp >= 6) {
    // Can show major on 1-level?
    if (hand.suitLength('HEARTS') >= 4 && hand.suitLength('SPADES') >= 4) {
      // Both majors: show hearts first (lower, economy of space)
      steps.push({ text: '4+ в обоих мажорах → сначала 1♥', passed: true });
      return res('1♥', '4-4 в мажорах → 1♥', 4, steps);
    }
    if (hand.suitLength('HEARTS') >= 4) {
      steps.push({ text: '4+ червей → 1♥', passed: true });
      return res('1♥', `${hand.suitLength('HEARTS')} червей → 1♥`, 4, steps);
    }
    if (hand.suitLength('SPADES') >= 4) {
      steps.push({ text: '4+ пик → 1♠', passed: true });
      return res('1♠', `${hand.suitLength('SPADES')} пик → 1♠`, 4, steps);
    }
  }

  // 1♦ on 1♣ opening (6+ HCP)
  if (openingSuit === 'CLUBS' && hand.suitLength('DIAMONDS') >= 4 && hcp >= 6) {
    steps.push({ text: '4+ бубен → 1♦', passed: true });
    return res('1♦', '4+ бубен на открытие 1♣ → 1♦', 4, steps);
  }

  // No major, balanced → NT
  if (hand.isBalanced || !hand.has4CardMajor()) {
    if (hcp >= 6 && hcp <= 9) {
      steps.push({ text: '6-9 HCP, нет мажора → 1БК', passed: true });
      return res('1БК', '6-9 HCP, равномерный → 1БК', 4, steps);
    }
    if (hcp >= 10 && hcp <= 12) {
      steps.push({ text: '10-12 HCP → инвит 2БК', passed: true });
      return res('2БК', '10-12 HCP → инвит 2БК', 4, steps);
    }
    if (hcp >= 13) {
      steps.push({ text: '13+ HCP → гейм 3БК', passed: true });
      return res('3БК', '13+ HCP → гейм 3БК', 4, steps);
    }
  }

  // Minor fit (5+ cards in opener's minor, no major, unbalanced)
  const fitLen = hand.suitLength(openingSuit);
  if (fitLen >= 5) {
    const sym = SUITS[openingSuit].symbol;
    if (hcp >= 6 && hcp <= 9) return res(`2${sym}`, `6-9 HCP, ${fitLen} ${SUITS[openingSuit].nameGen} → 2${sym}`, 4, steps);
    if (hcp >= 10 && hcp <= 14) return res(`3${sym}`, `10-14 HCP, фит → инвит 3${sym}`, 4, steps);
    if (hcp >= 15) return res(`5${sym}`, `15+ HCP, фит, неравномерный → гейм 5${sym}`, 4, steps);
  }

  // New minor suit (10+, 2nd level)
  if (hcp >= 10) {
    for (const s of MINOR_SUITS) {
      if (s === openingSuit) continue;
      if (hand.suitLength(s) >= 4) {
        const sym = SUITS[s].symbol;
        steps.push({ text: `10+ HCP, 4+ ${SUITS[s].nameGen} → 2${sym}`, passed: true });
        return res(`2${sym}`, `10+ HCP, новый минор → 2${sym}`, 5, steps);
      }
    }
  }

  // Default: 1NT
  steps.push({ text: 'Нет подходящей масти → 1БК', passed: true });
  return res('1БК', '6-9 HCP, нет масти на 1-м уровне → 1БК', 6, steps);
}

// --- Response to 2♣ (Lesson 8) ---
function respondTo2C(hand) {
  const steps = [];
  const akHcp = hand.acesAndKingsHcp;
  steps.push({ text: `Очки в тузах/королях: ${akHcp}`, passed: true });

  if (akHcp < 7) {
    steps.push({ text: 'Менее 7 в тузах/королях → негатив 2♦', passed: true });
    return res('2♦', `Негатив: ${akHcp} очков в Т/К → 2♦`, 8, steps);
  }

  // Positive: show 4+ card suit
  for (const s of ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS']) {
    if (hand.suitLength(s) >= 4) {
      const level = SUITS[s].rank >= 2 ? '2' : '3'; // hearts/spades = 2, diamonds/clubs = 3
      const sym = SUITS[s].symbol;
      steps.push({ text: `7+ в Т/К, ${hand.suitLength(s)} ${SUITS[s].nameGen} → ${level}${sym}`, passed: true });
      return res(`${level}${sym}`, `Позитив: 7+ в Т/К, ${hand.suitLength(s)} ${SUITS[s].nameGen}`, 8, steps);
    }
  }

  return res('2♦', 'Негатив 2♦', 8, steps);
}

// --- Response to 2NT (Lesson 8) ---
function respondTo2NT(hand) {
  const hcp = hand.hcp;
  const steps = [];
  steps.push({ text: `HCP: ${hcp}`, passed: true });

  // Weak with long major
  if (hcp <= 5) {
    if (hand.suitLength('SPADES') >= 5) return res('3♠', 'Слабая, 5+ пик → сброс 3♠', 8, steps);
    if (hand.suitLength('HEARTS') >= 5) return res('3♥', 'Слабая, 5+ червей → сброс 3♥', 8, steps);
    if (hand.suitLength('DIAMONDS') >= 5) return res('3♦', 'Слабая, 5+ бубен → сброс 3♦', 8, steps);
    return res('пас', '0-5 HCP → пас', 8, steps);
  }

  // Stayman
  if (hcp >= 6 && hand.has4CardMajor()) {
    return res('3♣', 'Стейман 3♣: 6+ HCP, 4 в мажоре', 8, steps);
  }

  // Game
  if (hcp >= 6 && hcp <= 11) {
    return res('3БК', '6-11 HCP → гейм 3БК', 8, steps);
  }
  if (hcp >= 12) {
    return res('4БК', '12+ HCP → инвит в шлем 4БК', 8, steps);
  }

  return res('пас', 'Пас', 8, steps);
}

// --- Response to weak 2 (Lesson 9) ---
function respondToWeakTwo(hand, suitId) {
  const hcp = hand.hcp;
  const sym = SUITS[suitId].symbol;
  const fit = hand.suitLength(suitId) >= 3;
  const steps = [];

  if (hcp >= 18 && fit) {
    return res(`4${sym}`, '18+ HCP, фит → гейм', 9, steps);
  }
  if (hcp >= 18) {
    return res('3БК', '18+ HCP → 3БК', 9, steps);
  }

  // Доблокирование: 0-7, 9+ карт на линии, синглет/ренонс сбоку
  if (hcp <= 7 && hand.suitLength(suitId) >= 3) {
    const hasSideShorness = SUIT_ORDER.filter(s => s !== suitId).some(s => hand.suitLength(s) <= 1);
    if (hasSideShorness) {
      return res(`4${sym}`, 'Доблокирование: фит + краткость сбоку', 9, steps);
    }
  }

  if (hcp < 6) return res('пас', 'Менее 6 HCP → пас', 9, steps);
  return res('пас', 'Нет баланса на гейм → пас', 9, steps);
}

function res(bid, reason, lessonRef, steps) {
  return { bid, bidDisplay: bid === 'пас' ? 'Пас' : bid, reason, lessonRef, steps };
}
