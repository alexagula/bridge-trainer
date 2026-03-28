// Bridge Trainer — Daily Mix Trainer
// Interleaved session of 10 tasks from different modules with SM-2 integration
import { Deal } from '../core/card.js';
import { SUITS, SUIT_ORDER } from '../core/constants.js';
import { evaluateHand } from '../core/evaluator.js';
import { dealForOpening, dealForResponse, dealForLead, dealForHCP } from '../core/dealer.js';
import { determineOpening } from '../bidding/opening.js';
import { determineResponse } from '../bidding/response.js';
import { recommendLead } from '../play/lead.js';
import { QUIZZES } from '../../data/quizzes.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderHand } from '../app.js';
import {
  pickRelevantBids, pickBinaryBids,
  ALL_OPENING_BIDS, ALL_RESPONSE_BIDS, BID_DISPLAY
} from '../utils/bid-filter.js';

const MODULE_ID = 'mix';
const SESSION_SIZE = 10;
const MAX_SM2_TASKS = 5;
const MIN_MODULES = 3;

// Openings used for response tasks
const RESPONSE_OPENINGS = ['1♥', '1♠', '1БК', '1♣', '1♦', '2♣', '2БК'];

/**
 * Map a bid to a rule-based situationId for SM-2 tracking.
 * Groups by rule (e.g. "opening 1-major") instead of by hand shape.
 */
function bidToRuleId(module, bid, hand, opening) {
  if (module === 'opening') {
    if (bid === 'пас') return 'rule:opening-pass';
    if (bid === '1БК') return 'rule:opening-1nt';
    if (bid === '2БК') return 'rule:opening-2nt';
    if (bid === '2♣') return 'rule:opening-2c-fg';
    if (bid.startsWith('1') && (bid.includes('♥') || bid.includes('♠'))) return 'rule:opening-1major';
    if (bid.startsWith('1') && (bid.includes('♣') || bid.includes('♦'))) return 'rule:opening-1minor';
    if (['2♦','2♥','2♠','3♣','3♦','3♥','3♠','4♣','4♦','4♥','4♠'].includes(bid)) return 'rule:opening-preempt';
    return `rule:opening-${bid}`;
  }
  if (module === 'response') {
    if (bid === 'пас') return `rule:response-pass-after-${opening}`;
    if (bid === '1БК') return 'rule:response-1nt';
    if (bid === '2БК') return 'rule:response-2nt';
    if (bid === '3БК') return 'rule:response-3nt';
    // Raise
    if (opening && bid.includes(opening.slice(-1))) return `rule:response-raise-${bid}`;
    return `rule:response-${bid}`;
  }
  return `rule:${module}-${bid}`;
}

export default class DailyMix {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.session = [];       // Array of task objects
    this.taskIndex = 0;      // Current task index (0-based)
    this.answered = false;
    this.correctCount = 0;
    this.startTime = 0;
    this.sessionErrors = [];
  }

  init() {
    this.session = this.generateSession();
    this.taskIndex = 0;
    this.correctCount = 0;
    this.sessionErrors = [];
    this.render();
    this.showTask();
  }

  destroy() {}

  // --- Session generation ---

  /**
   * Build a session of SESSION_SIZE tasks.
   * Priority: SM-2 due items first (up to MAX_SM2_TASKS),
   * then fill remaining slots from modules, prioritising weak ones.
   */
  generateSession() {
    const tasks = [];

    // 1. SM-2 due items
    const dueItems = ProgressTracker.getDueItems();
    const sm2Tasks = dueItems.slice(0, MAX_SM2_TASKS).map(item => this._sm2ItemToTask(item));
    tasks.push(...sm2Tasks);

    // 2. Determine which modules are already covered
    const coveredModules = new Set(sm2Tasks.map(t => t.type));

    // 3. Fill remaining slots with module tasks
    const remaining = SESSION_SIZE - tasks.length;
    const fillTasks = this._generateFillTasks(remaining, coveredModules);
    tasks.push(...fillTasks);

    // 4. Interleave: shuffle so same-type tasks are not consecutive
    return this._interleave(tasks);
  }

  /**
   * Convert an SM-2 item into a regenerated task.
   * The item describes a situation type (e.g. "opening:12hcp-5332"),
   * so we regenerate a hand matching roughly that profile.
   */
  _sm2ItemToTask(item) {
    const [moduleType] = item.id.split(':');
    let task;
    if (moduleType === 'opening') {
      task = this._generateOpeningTask();
    } else if (moduleType === 'response') {
      task = this._generateResponseTask();
    } else {
      task = this._generateOpeningTask(); // fallback
    }
    task.sm2Id = item.id;
    return task;
  }

  /**
   * Generate fill tasks from modules, prioritising those with accuracy < 80%.
   * Ensure at least MIN_MODULES different module types are covered.
   */
  _generateFillTasks(count, coveredModules) {
    const allStats = ProgressTracker.getAllStats();
    // Module types available in the mix
    const moduleTypes = ['opening', 'response', 'hcp', 'quiz', 'lead'];

    // Sort by accuracy ascending (weakest first)
    const sorted = moduleTypes.slice().sort((a, b) => {
      const accA = allStats[a] ? allStats[a].accuracy : 50;
      const accB = allStats[b] ? allStats[b].accuracy : 50;
      return accA - accB;
    });

    // Ensure MIN_MODULES different modules are represented
    const mustHave = sorted.filter(m => !coveredModules.has(m)).slice(0, MIN_MODULES);
    const allCovered = new Set([...coveredModules, ...mustHave]);

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
        tasks.push(this._generateTaskOfType(type));
      }
    }

    // If we got fewer than count, top up with random tasks
    while (tasks.length < count) {
      const pick = moduleTypes[Math.floor(Math.random() * moduleTypes.length)];
      tasks.push(this._generateTaskOfType(pick));
    }

    return tasks.slice(0, count);
  }

  _generateTaskOfType(type) {
    switch (type) {
      case 'opening':  return this._generateOpeningTask();
      case 'response': return this._generateResponseTask();
      case 'hcp':      return this._generateHcpTask();
      case 'quiz':     return this._generateQuizTask();
      case 'lead':     return this._generateLeadTask();
      default:         return this._generateHcpTask();
    }
  }

  _generateOpeningTask() {
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

  _generateResponseTask() {
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

  _generateHcpTask() {
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

  _generateQuizTask() {
    const quiz = QUIZZES[Math.floor(Math.random() * QUIZZES.length)];
    return {
      type: 'quiz',
      quiz,
      sm2Id: null,
    };
  }

  _generateLeadTask() {
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

  /**
   * Interleave tasks so same-type tasks are spread out.
   * Simple approach: bucket by type, then round-robin pick.
   */
  _interleave(tasks) {
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

  // --- Rendering ---

  render() {
    this.container.innerHTML = `
      <div id="mix-stats-bar" class="stats-bar">
        <div class="stat-item">
          <span class="stat-value" id="mix-task-num">1/${SESSION_SIZE}</span>
          <span class="stat-label">Задача</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" style="color: var(--success)" id="mix-correct">0</span>
          <span class="stat-label">Правильных</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" id="mix-accuracy">—</span>
          <span class="stat-label">Точность</span>
        </div>
      </div>

      <div id="mix-task-area"></div>
      <div id="mix-feedback-area"></div>

      <button class="btn btn-primary btn-block btn-lg mt-md hidden" id="mix-next-btn">
        Следующая →
      </button>
    `;

    document.getElementById('mix-next-btn').addEventListener('click', () => this._onNext());
  }

  _updateStatsBar() {
    const taskNum = document.getElementById('mix-task-num');
    const correctEl = document.getElementById('mix-correct');
    const accuracyEl = document.getElementById('mix-accuracy');
    if (taskNum) taskNum.textContent = `${this.taskIndex + 1}/${SESSION_SIZE}`;
    if (correctEl) correctEl.textContent = String(this.correctCount);
    if (accuracyEl) {
      if (this.taskIndex > 0) {
        const acc = Math.round((this.correctCount / this.taskIndex) * 100);
        accuracyEl.textContent = `${acc}%`;
      } else {
        accuracyEl.textContent = '—';
      }
    }
  }

  showTask() {
    if (this.taskIndex >= SESSION_SIZE) {
      this.showResults();
      return;
    }

    this.answered = false;
    this.startTime = Date.now();
    this._updateStatsBar();

    const task = this.session[this.taskIndex];
    const taskArea = document.getElementById('mix-task-area');
    const feedbackArea = document.getElementById('mix-feedback-area');
    const nextBtn = document.getElementById('mix-next-btn');

    feedbackArea.innerHTML = '';
    nextBtn.classList.add('hidden');

    // Task type badge
    const typeLabels = { opening: 'Открытие', response: 'Ответ', hcp: 'HCP', quiz: 'Тест', lead: 'Первый ход' };
    const badgeHtml = `<div class="task-type-badge task-type-${task.type}">${typeLabels[task.type]}</div>`;

    switch (task.type) {
      case 'opening':  taskArea.innerHTML = badgeHtml + this._renderOpeningTask(task); break;
      case 'response': taskArea.innerHTML = badgeHtml + this._renderResponseTask(task); break;
      case 'hcp':      taskArea.innerHTML = badgeHtml + this._renderHcpTask(task); break;
      case 'quiz':     taskArea.innerHTML = badgeHtml + this._renderQuizTask(task); break;
      case 'lead':     taskArea.innerHTML = badgeHtml + this._renderLeadTask(task); break;
    }

    this._attachTaskHandlers(task);
  }

  _renderOpeningTask(task) {
    const ev = task.handInfo;
    const openingStats = ProgressTracker.getStats('opening');
    const useBinary = openingStats.total > 5 && openingStats.accuracy < 50;
    const bids = useBinary
      ? pickBinaryBids(ALL_OPENING_BIDS, task.correctAnswer.bid)
      : pickRelevantBids(ALL_OPENING_BIDS, task.correctAnswer.bid, ev.hcp);
    return `
      <div class="card-area">
        <div class="card-area-title">Вы — сдающий. Ваша рука:</div>
        ${renderHand(task.hand)}
        <div class="text-muted mt-sm" style="font-size: 13px;">${ev.hcp} HCP | ${ev.shapeStr} | ${ev.distType}</div>
      </div>
      <div class="card-area">
        <div class="card-area-title">Ваше открытие:</div>
        <div class="bid-grid" id="task-bid-grid">
          ${bids.map(b => `<button class="bid-btn" data-bid="${b}">${BID_DISPLAY[b] || b}</button>`).join('')}
        </div>
      </div>
    `;
  }

  _renderResponseTask(task) {
    const ev = task.handInfo;
    const responseStats = ProgressTracker.getStats('response');
    const useBinary = responseStats.total > 5 && responseStats.accuracy < 50;
    const bids = useBinary
      ? pickBinaryBids(ALL_RESPONSE_BIDS, task.correctAnswer.bid)
      : pickRelevantBids(ALL_RESPONSE_BIDS, task.correctAnswer.bid, ev.hcp);
    return `
      <div class="card-area">
        <div class="card-area-title">Партнёр открылся: <strong>${task.opening}</strong></div>
        <div class="card-area-title mt-sm">Ваша рука (Юг):</div>
        ${renderHand(task.hand)}
        <div class="text-muted mt-sm" style="font-size: 13px;">${ev.hcp} HCP | ${ev.shapeStr} | ${ev.distType}</div>
      </div>
      <div class="card-area">
        <div class="card-area-title">Ваш ответ:</div>
        <div class="bid-grid" id="task-bid-grid">
          ${bids.map(b => `<button class="bid-btn" data-bid="${b}">${BID_DISPLAY[b] || b}</button>`).join('')}
        </div>
      </div>
    `;
  }

  _renderHcpTask(task) {
    return `
      <div class="card-area">
        <div class="card-area-title">Подсчитайте HCP в этой руке:</div>
        ${renderHand(task.hand)}
      </div>
      <div class="card-area">
        <div class="card-area-title">Сколько HCP?</div>
        <div class="flex gap-sm" style="align-items: center;">
          <input id="hcp-input" type="number" min="0" max="37" inputmode="numeric"
            style="width: 80px; font-size: 20px; padding: 10px; border-radius: 8px;
                   border: 2px solid var(--border); background: var(--bg-secondary);
                   color: var(--text-primary); text-align: center;"
            placeholder="0" />
          <button class="btn btn-primary" id="hcp-submit-btn" style="min-height: 44px; padding: 10px 20px;">
            Ответить
          </button>
        </div>
      </div>
    `;
  }

  _renderQuizTask(task) {
    const q = task.quiz;
    return `
      <div class="card-area">
        <div class="card-area-title">Занятие ${q.lesson} | Верно или нет?</div>
        <p style="font-size: 16px; line-height: 1.6; margin: 16px 0; font-weight: 500;">${q.statement}</p>
        <div class="flex gap-sm">
          <button class="bid-btn" data-answer="true" style="flex: 1; font-size: 18px; min-height: 44px;">Правда</button>
          <button class="bid-btn" data-answer="false" style="flex: 1; font-size: 18px; min-height: 44px;">Ложь</button>
        </div>
      </div>
    `;
  }

  _renderLeadTask(task) {
    const { contract } = task;
    const contractInfo = contract.suit
      ? `Оппоненты играют ${contract.display}.`
      : `Оппоненты играют ${contract.display} (без козыря).`;

    return `
      <div class="card-area">
        <div class="card-area-title">${contractInfo}</div>
        <div class="card-area-title mt-sm">Ваша рука (Юг, на висте):</div>
        ${renderHand(task.hand)}
      </div>
      <div class="card-area">
        <div class="card-area-title">Выберите карту для первого хода:</div>
        <div id="lead-hand" class="hand-display">
          ${renderHand(task.hand, { clickable: true })}
        </div>
      </div>
    `;
  }

  // --- Event attachment ---

  _attachTaskHandlers(task) {
    switch (task.type) {
      case 'opening':
      case 'response': {
        const grid = document.getElementById('task-bid-grid');
        if (grid) {
          grid.querySelectorAll('.bid-btn').forEach(btn => {
            btn.addEventListener('click', () => this.checkAnswer(btn.dataset.bid));
          });
        }
        break;
      }
      case 'hcp': {
        const submitBtn = document.getElementById('hcp-submit-btn');
        const input = document.getElementById('hcp-input');
        if (submitBtn && input) {
          const doCheck = () => {
            const val = parseInt(input.value, 10);
            if (!isNaN(val)) this.checkAnswer(String(val));
          };
          submitBtn.addEventListener('click', doCheck);
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doCheck();
          });
          // Auto-focus input for quick entry
          setTimeout(() => input.focus(), 100);
        }
        break;
      }
      case 'quiz': {
        document.querySelectorAll('[data-answer]').forEach(btn => {
          btn.addEventListener('click', () => this.checkAnswer(btn.dataset.answer));
        });
        break;
      }
      case 'lead': {
        const leadHand = document.getElementById('lead-hand');
        if (leadHand) {
          leadHand.addEventListener('click', (e) => {
            const chip = e.target.closest('.card-chip');
            if (!chip) return;
            this.checkAnswer(`${chip.dataset.suit}:${chip.dataset.rank}`);
          });
        }
        break;
      }
    }
  }

  // --- Answer checking ---

  checkAnswer(userAnswer) {
    if (this.answered) return;
    this.answered = true;

    const timeTaken = Date.now() - this.startTime;
    const task = this.session[this.taskIndex];
    let correct = false;

    switch (task.type) {
      case 'opening':  correct = this._checkOpeningAnswer(userAnswer, task, timeTaken); break;
      case 'response': correct = this._checkResponseAnswer(userAnswer, task, timeTaken); break;
      case 'hcp':      correct = this._checkHcpAnswer(userAnswer, task, timeTaken); break;
      case 'quiz':     correct = this._checkQuizAnswer(userAnswer, task, timeTaken); break;
      case 'lead':     correct = this._checkLeadAnswer(userAnswer, task, timeTaken); break;
    }

    if (correct) this.correctCount++;

    document.getElementById('mix-next-btn').classList.remove('hidden');
    document.getElementById('mix-next-btn').focus();
  }

  _checkOpeningAnswer(userBid, task, timeTaken) {
    const correct = userBid === task.correctAnswer.bid;

    // Highlight buttons
    const grid = document.getElementById('task-bid-grid');
    if (grid) {
      grid.querySelectorAll('.bid-btn').forEach(btn => {
        if (btn.dataset.bid === task.correctAnswer.bid) {
          btn.classList.add('correct');
        } else if (btn.dataset.bid === userBid && !correct) {
          btn.classList.add('wrong');
        }
      });
    }

    // SM-2 integration — rule-based situationId
    const situationId = bidToRuleId('opening', task.correctAnswer.bid, task.hand);
    if (task.sm2Id && correct) {
      ProgressTracker.recordSuccess(task.sm2Id);
    } else if (!correct) {
      const ev = task.handInfo;
      ProgressTracker.recordError('opening', situationId,
        `${ev.hcp} HCP, ${ev.shapeStr || 'xxxx'} — открытие?`);
      if (task.correctAnswer.reason) {
        this.sessionErrors.push({ module: 'opening', reason: task.correctAnswer.reason });
      }
    }

    ProgressTracker.record('opening', { correct, time: timeTaken });

    this._showBidFeedback(correct, task.correctAnswer, timeTaken);
    return correct;
  }

  _checkResponseAnswer(userBid, task, timeTaken) {
    const correct = userBid === task.correctAnswer.bid;

    // Highlight buttons
    const grid = document.getElementById('task-bid-grid');
    if (grid) {
      grid.querySelectorAll('.bid-btn').forEach(btn => {
        if (btn.dataset.bid === task.correctAnswer.bid) {
          btn.classList.add('correct');
        } else if (btn.dataset.bid === userBid && !correct) {
          btn.classList.add('wrong');
        }
      });
    }

    // SM-2 integration — rule-based situationId
    const situationId = bidToRuleId('response', task.correctAnswer.bid, task.hand, task.opening);
    if (task.sm2Id && correct) {
      ProgressTracker.recordSuccess(task.sm2Id);
    } else if (!correct) {
      const ev = task.handInfo;
      ProgressTracker.recordError('response', situationId,
        `${ev.hcp} HCP, ${ev.shapeStr || 'xxxx'} после ${task.opening} — ответ?`);
      if (task.correctAnswer.reason) {
        this.sessionErrors.push({ module: 'response', reason: task.correctAnswer.reason });
      }
    }

    ProgressTracker.record('response', { correct, time: timeTaken });

    this._showBidFeedback(correct, task.correctAnswer, timeTaken);
    return correct;
  }

  _checkHcpAnswer(userAnswer, task, timeTaken) {
    const correct = parseInt(userAnswer, 10) === task.hand.hcp;

    ProgressTracker.record('hcp', { correct, time: timeTaken });

    const fb = document.getElementById('mix-feedback-area');
    if (correct) {
      fb.innerHTML = `
        <div class="feedback feedback-success">✓ Правильно! ${task.hand.hcp} HCP (${(timeTaken / 1000).toFixed(1)}с)
          <p class="text-muted" style="font-size: 13px; margin-top: 4px;">Считайте: Т=4, К=3, Д=2, В=1</p>
        </div>
      `;
    } else {
      fb.innerHTML = `
        <div class="feedback feedback-error">✗ Неправильно. В руке ${task.hand.hcp} HCP, вы ответили ${userAnswer}</div>
        <div class="explanation">
          <p>Считайте: Туз=4, Король=3, Дама=2, Валет=1</p>
        </div>
      `;
    }

    return correct;
  }

  _checkQuizAnswer(userAnswer, task, timeTaken) {
    const userBool = userAnswer === 'true';
    const correct = userBool === task.quiz.answer;

    ProgressTracker.record('quiz', { correct, time: timeTaken });

    // Highlight buttons
    document.querySelectorAll('[data-answer]').forEach(btn => {
      const isCorrectBtn = (btn.dataset.answer === 'true') === task.quiz.answer;
      btn.classList.add(isCorrectBtn ? 'correct' : 'wrong');
    });

    const fb = document.getElementById('mix-feedback-area');
    fb.innerHTML = `
      <div class="feedback ${correct ? 'feedback-success' : 'feedback-error'}">
        ${correct ? '✓ Правильно!' : '✗ Неправильно!'}
      </div>
      <div class="explanation">
        <p>${task.quiz.explanation}</p>
        <p class="lesson-ref">Занятие ${task.quiz.lesson}</p>
      </div>
    `;

    return correct;
  }

  _checkLeadAnswer(userAnswer, task, timeTaken) {
    const recommended = task.recommended;
    const [userSuit, userRank] = userAnswer.split(':');
    const userRankVal = parseInt(userRank, 10);

    // Correct if the user picked the recommended card
    const recCard = recommended?.card;
    const correct = recCard && recCard.suitId === userSuit && recCard.rankValue === userRankVal;

    ProgressTracker.record('lead', { correct, time: timeTaken });

    // Highlight cards
    const chips = document.querySelectorAll('#lead-hand .card-chip');
    chips.forEach(chip => {
      const cs = chip.dataset.suit;
      const cr = parseInt(chip.dataset.rank, 10);
      if (recCard && cs === recCard.suitId && cr === recCard.rankValue) {
        chip.classList.add('correct');
      } else if (cs === userSuit && cr === userRankVal && !correct) {
        chip.classList.add('wrong');
      }
    });

    const fb = document.getElementById('mix-feedback-area');
    const recDisplay = recCard ? `${SUITS[recCard.suitId].symbol}${recCard.displayShort || ''}` : '?';
    if (correct) {
      fb.innerHTML = `
        <div class="feedback feedback-success">✓ Правильно!</div>
        ${recommended ? `<div class="explanation"><p>${recommended.reason || ''}</p></div>` : ''}
      `;
    } else {
      fb.innerHTML = `
        <div class="feedback feedback-error">✗ Неправильно. Рекомендуется: ${recDisplay}</div>
        ${recommended ? `<div class="explanation"><p>${recommended.reason || ''}</p></div>` : ''}
      `;
      if (recommended && recommended.reason) {
        this.sessionErrors.push({ module: 'lead', reason: recommended.reason });
      }
    }

    return correct;
  }

  /** Build decision tree HTML from steps array */
  _buildDecisionTree(correctAnswer) {
    const steps = correctAnswer.steps || [];
    if (steps.length === 0 && !correctAnswer.reason) return '';

    // Find decisive step index: last passed before first failed
    let decisiveIdx = -1;
    const firstFailedIdx = steps.findIndex(s => !s.passed);
    if (firstFailedIdx > 0) {
      decisiveIdx = firstFailedIdx - 1;
    }

    const stepsHtml = steps.map((s, i) => {
      const icon = s.passed ? '✓' : '✗';
      const cls = s.passed ? 'step-passed' : 'step-failed';
      const decisive = i === decisiveIdx ? ' step-decisive' : '';
      return `<div class="decision-step ${cls}${decisive}">
        <span class="step-icon">${icon}</span>
        <span class="step-text">${s.text}</span>
      </div>`;
    }).join('');

    return `
      <div class="explanation decision-tree">
        <h3>Путь решения</h3>
        ${stepsHtml}
        ${correctAnswer.reason ? `<p style="margin-top: 8px; font-weight: 600; border-top: 1px solid var(--border); padding-top: 8px;">${correctAnswer.reason}</p>` : ''}
        ${correctAnswer.lessonRef ? `<p class="lesson-ref">Занятие ${correctAnswer.lessonRef}</p>` : ''}
      </div>
    `;
  }

  /** Shared feedback renderer for opening/response bid tasks */
  _showBidFeedback(correct, correctAnswer, timeTaken) {
    const fb = document.getElementById('mix-feedback-area');
    const treeHtml = this._buildDecisionTree(correctAnswer);

    if (correct) {
      fb.innerHTML = `
        <div class="feedback feedback-success">✓ Правильно! ${correctAnswer.bidDisplay || correctAnswer.bid} (${(timeTaken / 1000).toFixed(1)}с)
          ${correctAnswer.reason ? `<p class="text-muted" style="font-size: 13px; margin-top: 4px;">${correctAnswer.reason}</p>` : ''}
        </div>
        ${treeHtml ? `<button class="btn btn-outline btn-block btn-sm" id="mix-explain-btn" style="margin-top: 8px;">Объяснить</button>
        <div id="mix-explain-area" class="hidden">${treeHtml}</div>` : ''}
      `;
      const explainBtn = document.getElementById('mix-explain-btn');
      if (explainBtn) {
        explainBtn.addEventListener('click', () => {
          document.getElementById('mix-explain-area').classList.toggle('hidden');
        });
      }
    } else {
      fb.innerHTML = `
        <div class="feedback feedback-error">✗ Неправильно. Правильный ответ: ${correctAnswer.bidDisplay || correctAnswer.bid}</div>
        ${treeHtml}
      `;
    }
  }

  // --- Navigation ---

  _onNext() {
    this.taskIndex++;
    this._updateStatsBar();
    if (this.taskIndex >= SESSION_SIZE) {
      this.showResults();
    } else {
      this.showTask();
    }
  }

  // --- Results screen ---

  showResults() {
    const accuracy = SESSION_SIZE > 0
      ? Math.round((this.correctCount / SESSION_SIZE) * 100)
      : 0;

    const emoji = accuracy >= 80 ? '🏆' : accuracy >= 60 ? '👍' : '💪';
    const message = accuracy >= 80
      ? 'Отличная сессия!'
      : accuracy >= 60
        ? 'Хорошая работа!'
        : 'Продолжай тренироваться!';

    // Build per-module breakdown from session
    const moduleCounts = {};
    const moduleCorrect = {};
    for (const task of this.session) {
      const mod = task.type;
      moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
    }

    const moduleNames = {
      opening:  '🃏 Открытие',
      response: '💬 Ответ',
      hcp:      '🔢 HCP',
      quiz:     '✅ Тест',
      lead:     '➡️ Ход',
    };

    const moduleList = Object.entries(moduleCounts)
      .map(([mod, n]) => `<span class="text-muted">${moduleNames[mod] || mod}: ${n}</span>`)
      .join(' · ');

    this.container.innerHTML = `
      <div class="module-container text-center" style="padding: 32px 16px;">
        <div style="font-size: 64px; margin-bottom: 16px;">${emoji}</div>
        <h2 style="margin-bottom: 8px;">${message}</h2>

        <div style="font-size: 56px; font-weight: 700; color: var(--accent); margin: 16px 0;">
          ${accuracy}%
        </div>
        <p class="text-muted" style="margin-bottom: 8px;">
          Правильных ответов: ${this.correctCount} из ${SESSION_SIZE}
        </p>
        <p class="text-muted" style="font-size: 13px; margin-bottom: 24px;">
          ${moduleList}
        </p>

        ${this._buildRecapHtml()}

        <button class="btn btn-primary btn-block btn-lg" id="mix-restart-btn" style="margin-bottom: 12px;">
          Новая сессия
        </button>
        <button class="btn btn-outline btn-block" onclick="window.bridgeApp.switchModule('welcome')">
          На главную
        </button>
      </div>
    `;

    document.getElementById('mix-restart-btn').addEventListener('click', () => this.init());
  }

  /** Build recap HTML from session errors (up to 3 unique reasons) */
  _buildRecapHtml() {
    if (!this.sessionErrors || this.sessionErrors.length === 0) return '';

    // Deduplicate reasons
    const seen = new Set();
    const unique = [];
    for (const err of this.sessionErrors) {
      if (!seen.has(err.reason)) {
        seen.add(err.reason);
        unique.push(err.reason);
      }
      if (unique.length >= 3) break;
    }

    if (unique.length === 0) return '';

    return `
      <div class="card-area" style="padding: 12px 16px; text-align: left; margin-bottom: 16px;">
        <div class="card-area-title">Запомни</div>
        ${unique.map(r => `<p style="font-size: 14px; line-height: 1.6; color: var(--text-secondary); padding: 4px 0;">• ${r}</p>`).join('')}
      </div>
    `;
  }
}

// --- Helper ---

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
