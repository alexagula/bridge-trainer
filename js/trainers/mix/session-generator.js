// Bridge Trainer — Daily Mix Session Generator
// Standalone functions for building a Daily Mix session of tasks.
import { Deal } from '../../core/card.js';
import { SUIT_ORDER } from '../../core/constants.js';
import { evaluateHand } from '../../core/evaluator.js';
import { dealForOpening, dealForResponse, dealForLead, dealForHCP } from '../../core/dealer.js';
import { determineOpening } from '../../bidding/opening.js';
import { determineResponse } from '../../bidding/response.js';
import { recommendLead } from '../../play/lead.js';
import { QUIZZES } from '../../../data/quizzes.js';
import { ProgressTracker } from '../../progress/tracker.js';
import { getUnlockedModules } from '../../app.js';
import { getDefenseScenariosByCategory } from '../../play/defense-scenarios.js';

const SESSION_SIZE = 10;
const MAX_SM2_TASKS = 5;
const MIN_MODULES = 3;

// Openings used for response tasks
const RESPONSE_OPENINGS = ['1♥', '1♠', '1БК', '1♣', '1♦', '2♣', '2БК'];

/**
 * Build a session of SESSION_SIZE tasks.
 * Priority: SM-2 due items first (up to MAX_SM2_TASKS),
 * then fill remaining slots from modules, prioritising weak ones.
 * @param {typeof ProgressTracker} tracker - ProgressTracker class (static methods used)
 * @returns {Array} array of task objects
 */
function generateSession(tracker) {
  const tasks = [];

  // 1. SM-2 due items
  const dueItems = tracker.getDueItems();
  const sm2Tasks = dueItems.slice(0, MAX_SM2_TASKS).map(item => _sm2ItemToTask(item));
  tasks.push(...sm2Tasks);

  // 2. Determine which modules are already covered
  const coveredModules = new Set(sm2Tasks.map(t => t.type));

  // 3. Fill remaining slots with module tasks
  const remaining = SESSION_SIZE - tasks.length;
  const fillTasks = _generateFillTasks(remaining, coveredModules, tracker);
  tasks.push(...fillTasks);

  // 4. Interleave: shuffle so same-type tasks are not consecutive
  return _interleave(tasks);
}

/**
 * Convert an SM-2 item into a regenerated task.
 * The item describes a situation type (e.g. "opening:12hcp-5332"),
 * so we regenerate a hand matching roughly that profile.
 */
function _sm2ItemToTask(item) {
  // ruleId format: "rule:opening-*" or "rule:response-*"
  // Legacy format: "opening:..." or "response:..."
  let moduleType = '';
  const id = item.id || '';
  if (id.startsWith('rule:opening')) {
    moduleType = 'opening';
  } else if (id.startsWith('rule:response')) {
    moduleType = 'response';
  } else {
    // Legacy: first segment before ':'
    [moduleType] = id.split(':');
  }

  let task;
  if (moduleType === 'opening') {
    task = _generateOpeningTask();
  } else if (moduleType === 'response') {
    task = _generateResponseTask();
  } else if (moduleType === 'lead') {
    task = _generateLeadTask();
  } else if (moduleType === 'quiz') {
    task = _generateQuizTask();
  } else if (moduleType === 'hcp') {
    task = _generateHcpTask();
  } else if (moduleType === 'tricks') {
    task = _generateTricksTask();
  } else if (moduleType === 'defense') {
    task = _generateDefenseTask();
  } else {
    console.warn(`SM-2: unknown module type "${moduleType}", falling back to opening`);
    task = _generateOpeningTask();
  }
  task.sm2Id = item.id;
  return task;
}

/**
 * Generate fill tasks from modules, prioritising those with accuracy < 80%.
 * Ensure at least MIN_MODULES different module types are covered.
 */
function _generateFillTasks(count, coveredModules, tracker) {
  const allStats = tracker.getAllStats();
  // Module types filtered by current user level
  const allModuleTypes = ['opening', 'response', 'hcp', 'quiz', 'lead', 'tricks', 'defense'];
  const maxLesson = tracker.getMaxLesson();
  const unlocked = getUnlockedModules(maxLesson);
  // Fallback to quiz (always unlocked) if nothing else is available
  const moduleTypes = allModuleTypes.filter(m => unlocked.has(m));
  if (moduleTypes.length === 0) moduleTypes.push('quiz');

  // Sort by accuracy ascending (weakest first)
  const sorted = moduleTypes.slice().sort((a, b) => {
    const accA = allStats[a] ? allStats[a].accuracy : 50;
    const accB = allStats[b] ? allStats[b].accuracy : 50;
    return accA - accB;
  });

  // Ensure MIN_MODULES different modules are represented
  const mustHave = sorted.filter(m => !coveredModules.has(m)).slice(0, MIN_MODULES);

  // Build quota: at least 1 task per mustHave module, rest filled by weight
  const quota = {};
  for (const m of mustHave) quota[m] = 1;

  const leftover = count - mustHave.length;
  // Fill remaining slots weighted toward weak modules
  for (let i = 0; i < leftover; i++) {
    // Pick a random module from all types, weighted toward weak
    const pick = sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
    quota[pick] = (quota[pick] || 0) + 1;
  }

  const tasks = [];
  for (const [type, n] of Object.entries(quota)) {
    for (let i = 0; i < n; i++) {
      tasks.push(_generateTaskOfType(type));
    }
  }

  // If we got fewer than count, top up with random tasks
  while (tasks.length < count) {
    const pick = moduleTypes[Math.floor(Math.random() * moduleTypes.length)];
    tasks.push(_generateTaskOfType(pick));
  }

  return tasks.slice(0, count);
}

function _generateTaskOfType(type) {
  switch (type) {
    case 'opening':  return _generateOpeningTask();
    case 'response': return _generateResponseTask();
    case 'hcp':      return _generateHcpTask();
    case 'quiz':     return _generateQuizTask();
    case 'lead':     return _generateLeadTask();
    case 'tricks':   return _generateTricksTask();
    case 'defense':  return _generateDefenseTask();
    default:         return _generateHcpTask();
  }
}

function _generateOpeningTask() {
  const deal = dealForOpening();
  const hand = deal.getHand('S');
  const correctAnswer = determineOpening(hand);
  const ev = evaluateHand(hand);
  return {
    type: 'opening',
    deal,
    hand,
    correctAnswer,
    handInfo: ev,
    sm2Id: null,
  };
}

function _generateResponseTask() {
  const opening = RESPONSE_OPENINGS[Math.floor(Math.random() * RESPONSE_OPENINGS.length)];
  // Convert display opening to internal key for dealForResponse
  const openingKey = _openingDisplayToKey(opening);
  const deal = dealForResponse(openingKey);
  const hand = deal.getHand('S');
  const correctAnswer = determineResponse(opening, hand);
  const ev = evaluateHand(hand);
  return {
    type: 'response',
    deal,
    hand,
    opening,
    correctAnswer,
    handInfo: ev,
    sm2Id: null,
  };
}

function _generateHcpTask() {
  const deal = dealForHCP();
  const hand = deal.getHand('S');
  return {
    type: 'hcp',
    deal,
    hand,
    correctAnswer: { bid: String(hand.hcp), reason: `${hand.hcp} HCP` },
    sm2Id: null,
  };
}

function _generateQuizTask() {
  const quiz = QUIZZES[Math.floor(Math.random() * QUIZZES.length)];
  return {
    type: 'quiz',
    quiz,
    sm2Id: null,
  };
}

function _generateLeadTask() {
  const deal = dealForLead();
  const hand = deal.getHand('S');
  const contracts = [
    { suit: 'SPADES',   display: '4♠' },
    { suit: 'HEARTS',   display: '4♥' },
    { suit: null,       display: '3БК' },
    { suit: 'DIAMONDS', display: '5♦' },
    { suit: 'CLUBS',    display: '5♣' },
  ];
  const contract = contracts[Math.floor(Math.random() * contracts.length)];
  const recommended = recommendLead(hand, contract.suit);
  return {
    type: 'lead',
    deal,
    hand,
    contract,
    recommended,
    sm2Id: null,
  };
}

function _generateTricksTask() {
  const deal = Deal.random();
  const hand = deal.getHand('S');
  // Count top tricks for south hand only (defender perspective, simpler for mix)
  const bySuit = {};
  let total = 0;
  for (const suitId of SUIT_ORDER) {
    const cards = hand.getSuitCards(suitId);
    let tricks = 0;
    let expectedRank = 14;
    for (const card of cards) {
      if (card.rankValue === expectedRank) { tricks++; expectedRank--; } else break;
    }
    bySuit[suitId] = { tricks, cards };
    total += tricks;
  }
  return { type: 'tricks', deal, hand, correctAnswer: total, tricksBySuit: bySuit, sm2Id: null };
}

function _generateDefenseTask() {
  const scenarios = getDefenseScenariosByCategory('all');
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  return { type: 'defense', scenario, sm2Id: null };
}

/**
 * Interleave tasks so same-type tasks are spread out.
 * Simple approach: bucket by type, then round-robin pick.
 */
function _interleave(tasks) {
  const buckets = {};
  for (const t of tasks) {
    if (!buckets[t.type]) buckets[t.type] = [];
    buckets[t.type].push(t);
  }
  const keys = Object.keys(buckets);
  const result = [];
  let round = 0;
  while (result.length < tasks.length) {
    let added = false;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[(i + round) % keys.length];
      if (buckets[key] && buckets[key].length > 0) {
        result.push(buckets[key].shift());
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return result;
}

/**
 * Convert opening display string (e.g. '1♥') to dealer key (e.g. '1H')
 * used by dealForResponse().
 */
function _openingDisplayToKey(opening) {
  const map = {
    '1♥':  '1H',
    '1♠':  '1S',
    '1БК': '1NT',
    '1♣':  '1C',
    '1♦':  '1D',
    '2♣':  '2C',
    '2БК': '2NT',
    '2♥':  '2H',
    '2♠':  '2S',
  };
  return map[opening] || opening;
}

export { generateSession, _generateTaskOfType };
