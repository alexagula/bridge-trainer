// Bridge Trainer — Trick Counting Trainer (Top Tricks)
import { Deal } from '../core/card.js';
import { SUITS, SUIT_ORDER } from '../core/constants.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderHand, renderStats } from '../ui/render.js';

const MODULE_ID = 'tricks';

// Display order: spades first
const DISPLAY_SUIT_ORDER = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];

// Trump options: suit ids + 'NT'
const TRUMP_OPTIONS = [
  { id: 'NT',       label: 'БК',  symbol: 'БК' },
  { id: 'SPADES',   label: '♠',   symbol: '♠' },
  { id: 'HEARTS',   label: '♥',   symbol: '♥' },
  { id: 'DIAMONDS', label: '♦',   symbol: '♦' },
  { id: 'CLUBS',    label: '♣',   symbol: '♣' },
];

// Modes
const MODE_DECLARER  = 'declarer';   // see both N + S hands
const MODE_DEFENDER  = 'defender';   // see only one hand

/**
 * Count unbroken top sequence from the highest card.
 * Т-К → 2, Т-К-Д → 3, К без Т → 0.
 * @param {Card[]} cards — sorted high to low (getSuitCards guarantees this)
 * @returns {number}
 */
function countTopSequence(cards) {
  if (cards.length === 0) return 0;
  let count = 0;
  let expectedRank = 14; // Ace
  for (const card of cards) {
    if (card.rankValue === expectedRank) {
      count++;
      expectedRank--;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Count top tricks for a single hand in a given trump context.
 * For simplicity (beginner level) we treat all suits identically —
 * only unbroken top sequence from Ace counts.
 * Returns per-suit breakdown + total.
 * @param {Hand} hand
 * @returns {{ total: number, bySuit: Object }}
 */
function countTopTricksForHand(hand) {
  const bySuit = {};
  let total = 0;
  for (const suitId of SUIT_ORDER) {
    const cards = hand.getSuitCards(suitId);
    const tricks = countTopSequence(cards);
    bySuit[suitId] = { tricks, cards };
    total += tricks;
  }
  return { total, bySuit };
}

/**
 * Combine two hands (N + S) suit by suit: merge cards, count top sequence.
 * E.g. N: T-K ♠, S: Q-J ♠ → T-K-Q-J = 4 top tricks.
 * @param {Hand} north
 * @param {Hand} south
 * @returns {{ total: number, bySuit: Object }}
 */
function countCombinedTopTricks(north, south) {
  const bySuit = {};
  let total = 0;
  for (const suitId of SUIT_ORDER) {
    const northCards = north.getSuitCards(suitId);
    const southCards = south.getSuitCards(suitId);
    // Merge and sort high to low
    const allCards = [...northCards, ...southCards].sort((a, b) => b.rankValue - a.rankValue);
    const tricks = countTopSequence(allCards);
    bySuit[suitId] = { tricks, northCards, southCards, allCards };
    total += tricks;
  }
  return { total, bySuit };
}

/**
 * Build a human-readable label for the top sequence in a suit.
 * E.g. 2 tricks, cards [T, K, 5] → "Т-К"
 * @param {Card[]} cards — all cards in suit (sorted high to low)
 * @param {number} tricks — count of top tricks
 * @returns {string}
 */
function buildSequenceLabel(cards, tricks) {
  if (tricks === 0) return '—';
  return cards.slice(0, tricks).map(c => c.rank.display).join('-');
}

export default class TrickTrainer {
  constructor(containerId) {
    this.container    = document.getElementById(containerId);
    this.deal         = null;
    this.northHand    = null;
    this.southHand    = null;
    this.trump        = 'NT';     // 'NT' | suit id
    this.mode         = MODE_DECLARER;
    this.result       = null;     // { total, bySuit }
    this.answered     = false;
    this.startTime    = 0;
    this._focusTimer  = null;
    this._scrollTimer = null;
  }

  init() {
    this.render();
    this.newProblem();
  }

  destroy() {
    if (this._focusTimer) clearTimeout(this._focusTimer);
    if (this._scrollTimer) clearTimeout(this._scrollTimer);
  }

  // ---------------------------------------------------------------------------
  // Render skeleton
  // ---------------------------------------------------------------------------

  render() {
    const stats = ProgressTracker.getStats(MODULE_ID);
    this.container.innerHTML = `
      ${renderStats(stats)}

      <!-- Mode selector -->
      <div class="card-area" style="padding: 10px 12px; margin-bottom: 8px;">
        <div class="flex gap-sm">
          <button class="btn btn-sm ${this.mode === MODE_DECLARER ? 'btn-primary' : 'btn-outline'}" id="mode-declarer" style="flex:1; padding:6px 10px; min-height:34px; font-size:13px;">Разыгрывающий</button>
          <button class="btn btn-sm ${this.mode === MODE_DEFENDER ? 'btn-primary' : 'btn-outline'}" id="mode-defender"  style="flex:1; padding:6px 10px; min-height:34px; font-size:13px;">Защитник</button>
        </div>
      </div>

      <!-- Trump selector -->
      <div class="card-area" style="padding: 10px 12px; margin-bottom: 8px;">
        <div class="card-area-title" style="margin-bottom:6px;">Козырь</div>
        <div class="flex gap-sm flex-wrap" id="trump-selector">
          ${TRUMP_OPTIONS.map(t => `
            <button class="btn btn-sm ${this.trump === t.id ? 'btn-primary' : 'btn-outline'} trump-btn"
                    data-trump="${t.id}"
                    style="min-width:44px; padding:6px 10px; min-height:34px; font-size:14px;">
              ${t.symbol}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Hands area -->
      <div id="hands-area"></div>

      <!-- Question -->
      <div class="card-area" id="question-area" style="padding:10px 12px; margin-bottom:8px;">
        <div class="card-area-title" style="margin-bottom:6px;" id="question-label">Сколько верных взяток?</div>
        <div class="flex gap-sm" style="align-items:center;">
          <input type="number" class="input-field" id="answer-input"
                 inputmode="numeric" pattern="[0-9]*" min="0" max="13"
                 placeholder="0–13" autofocus aria-label="Количество взяток">
          <button class="btn btn-primary" id="check-btn">✓</button>
        </div>
      </div>

      <!-- Feedback -->
      <div id="feedback-area"></div>

      <!-- Next button -->
      <button class="btn btn-primary btn-block btn-lg mt-md hidden" id="next-btn">
        Следующая раздача →
      </button>
    `;

    // Mode buttons
    this.container.querySelector('#mode-declarer').addEventListener('click', () => {
      this.mode = MODE_DECLARER;
      this.render();
      this.newProblem();
    });
    this.container.querySelector('#mode-defender').addEventListener('click', () => {
      this.mode = MODE_DEFENDER;
      this.render();
      this.newProblem();
    });

    // Trump selector
    this.container.querySelectorAll('.trump-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.trump = btn.dataset.trump;
        // Re-highlight buttons
        this.container.querySelectorAll('.trump-btn').forEach(b => {
          b.classList.toggle('btn-primary', b.dataset.trump === this.trump);
          b.classList.toggle('btn-outline',  b.dataset.trump !== this.trump);
        });
        // Recalculate and update question label (don't regenerate deal)
        this._applyTrumpAndCalculate();
      });
    });

    // Check button and Enter key
    const checkBtn = this.container.querySelector('#check-btn');
    const input    = this.container.querySelector('#answer-input');
    if (checkBtn) checkBtn.addEventListener('click', () => this.checkAnswer());
    if (input) {
      input.addEventListener('keydown', e => { if (e.key === 'Enter') this.checkAnswer(); });
    }

    // Next button
    this.container.querySelector('#next-btn').addEventListener('click', () => this.newProblem());
  }

  // ---------------------------------------------------------------------------
  // New problem
  // ---------------------------------------------------------------------------

  newProblem() {
    this.answered  = false;
    this.deal      = Deal.random();
    this.northHand = this.deal.getHand('N');
    this.southHand = this.deal.getHand('S');
    this.startTime = Date.now();

    // Randomize trump each problem
    const idx = Math.floor(Math.random() * TRUMP_OPTIONS.length);
    this.trump = TRUMP_OPTIONS[idx].id;

    // Highlight correct trump button
    this.container.querySelectorAll('.trump-btn').forEach(b => {
      b.classList.toggle('btn-primary', b.dataset.trump === this.trump);
      b.classList.toggle('btn-outline',  b.dataset.trump !== this.trump);
    });

    this._applyTrumpAndCalculate();

    // Clear feedback, hide next btn
    this.container.querySelector('#feedback-area').innerHTML = '';
    this.container.querySelector('#next-btn').classList.add('hidden');

    // Clear & focus input
    const input = this.container.querySelector('#answer-input');
    if (input) {
      input.value = '';
      input.classList.remove('correct', 'wrong');
      this._focusTimer = setTimeout(() => input.focus(), 100);
    }

    this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Render hands and recalculate top tricks whenever trump changes.
   */
  _applyTrumpAndCalculate() {
    // Calculate
    if (this.mode === MODE_DECLARER) {
      this.result = countCombinedTopTricks(this.northHand, this.southHand);
    } else {
      // Defender sees only South hand
      this.result = countTopTricksForHand(this.southHand);
    }

    // Update question label
    const trumpLabel = this.trump === 'NT'
      ? 'БК'
      : SUITS[this.trump].symbol;
    const modeLabel = this.mode === MODE_DECLARER
      ? 'Разыгрывающий (Юг + Север)'
      : 'Защитник (только Юг)';
    const questionEl = this.container.querySelector('#question-label');
    if (questionEl) {
      questionEl.textContent = `Козырь: ${trumpLabel} · ${modeLabel} — сколько верных взяток?`;
    }

    // Render hands
    this._renderHands();
  }

  _renderHands() {
    const area = this.container.querySelector('#hands-area');
    if (!area) return;

    if (this.mode === MODE_DECLARER) {
      area.innerHTML = `
        <div class="card-area" style="padding:10px 12px; margin-bottom:8px;">
          <div class="card-area-title" style="margin-bottom:4px;">Север (стол)</div>
          <div id="north-hand-area">${renderHand(this.northHand)}</div>
        </div>
        <div class="card-area" style="padding:10px 12px; margin-bottom:8px;">
          <div class="card-area-title" style="margin-bottom:4px;">Юг (разыгрывающий)</div>
          <div id="south-hand-area">${renderHand(this.southHand)}</div>
        </div>
      `;
    } else {
      area.innerHTML = `
        <div class="card-area" style="padding:10px 12px; margin-bottom:8px;">
          <div class="card-area-title" style="margin-bottom:4px;">Ваша рука (Юг)</div>
          <div id="south-hand-area">${renderHand(this.southHand)}</div>
        </div>
      `;
    }
  }

  // ---------------------------------------------------------------------------
  // Check answer
  // ---------------------------------------------------------------------------

  checkAnswer() {
    if (this.answered) return;
    this.answered = true;

    const timeTaken = Date.now() - this.startTime;
    const input = this.container.querySelector('#answer-input');
    if (!input) return;
    const rawValue = input.value.trim();
    if (rawValue === '') {
      // Nothing entered — restore answered flag and let user try again
      this.answered = false;
      input.focus();
      return;
    }
    const userAnswer = parseInt(rawValue, 10);
    const correctAnswer = this.result.total;
    const correct = userAnswer === correctAnswer;

    input.classList.add(correct ? 'correct' : 'wrong');

    // SM-2 record
    const trumpKey = this.trump === 'NT' ? 'nt' : this.trump.toLowerCase();
    ProgressTracker.record(MODULE_ID, {
      correct,
      time: timeTaken,
      ruleId: `rule:tricks-${trumpKey}-${correctAnswer}`,
    });

    // Feedback
    const feedback = this.container.querySelector('#feedback-area');
    if (correct) {
      feedback.innerHTML = `
        <div class="feedback feedback-success">✓ Правильно! (${(timeTaken / 1000).toFixed(1)}с)</div>
        <button class="btn btn-outline btn-block btn-sm" id="explain-btn" style="margin-top:8px;">Показать разбор</button>
        <div id="explain-area" class="hidden"></div>
      `;
      const explainBtn = feedback.querySelector('#explain-btn');
      explainBtn.addEventListener('click', () => {
        const area = feedback.querySelector('#explain-area');
        area.classList.toggle('hidden');
        if (!area.innerHTML) {
          area.innerHTML = this._buildExplanationHtml();
        }
      });
    } else {
      feedback.innerHTML = `
        <div class="feedback feedback-error">✗ Неправильно. Верных взяток: ${correctAnswer}</div>
        ${this._buildExplanationHtml()}
      `;
    }

    // Update stats bar
    const statsHtml = renderStats(ProgressTracker.getStats(MODULE_ID));
    const statsBar = this.container.querySelector('.stats-bar');
    if (statsBar) statsBar.outerHTML = statsHtml;

    // Show next button
    this.container.querySelector('#next-btn').classList.remove('hidden');

    // Auto-scroll to feedback
    this._scrollTimer = setTimeout(() => {
      feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  // ---------------------------------------------------------------------------
  // Explanation HTML
  // ---------------------------------------------------------------------------

  _buildExplanationHtml() {
    const bySuit = this.result.bySuit;
    const isDeclarerMode = this.mode === MODE_DECLARER;

    const rows = DISPLAY_SUIT_ORDER.map(suitId => {
      const suit = SUITS[suitId];
      const data = bySuit[suitId];
      const { tricks } = data;

      let sequenceStr;
      if (isDeclarerMode) {
        // Combined sequence label — use allCards (merged from both hands)
        sequenceStr = buildSequenceLabel(data.allCards, tricks);
        // Also show N/S breakdown
        const nStr = data.northCards.length > 0
          ? data.northCards.map(c => c.rank.display).join('-')
          : '—';
        const sStr = data.southCards.length > 0
          ? data.southCards.map(c => c.rank.display).join('-')
          : '—';
        return `
          <div style="padding:3px 0; border-bottom:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span><strong>${suit.symbol}</strong> С:${nStr} / Ю:${sStr}</span>
              <strong style="color:${tricks > 0 ? 'var(--success)' : 'var(--text-secondary)'}">
                ${tricks} ${_tricksWord(tricks)}
              </strong>
            </div>
            ${tricks > 0 ? `<div style="font-size:12px; color:var(--text-secondary); padding-left:4px;">верхняя секвенция: ${sequenceStr}</div>` : ''}
          </div>
        `;
      } else {
        // Single hand
        sequenceStr = buildSequenceLabel(data.cards, tricks);
        return `
          <div style="padding:3px 0; border-bottom:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span><strong>${suit.symbol}</strong> ${data.cards.length > 0 ? data.cards.map(c => c.rank.display).join('-') : '—'}</span>
              <strong style="color:${tricks > 0 ? 'var(--success)' : 'var(--text-secondary)'}">
                ${tricks} ${_tricksWord(tricks)}
              </strong>
            </div>
            ${tricks > 0 ? `<div style="font-size:12px; color:var(--text-secondary); padding-left:4px;">верхняя секвенция: ${sequenceStr}</div>` : ''}
          </div>
        `;
      }
    });

    const trumpLabel = this.trump === 'NT' ? 'БК' : SUITS[this.trump].symbol;

    return `
      <div class="explanation">
        <h3>Разбор по мастям (козырь: ${trumpLabel})</h3>
        ${rows.join('')}
        <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:15px;">
          <span>Итого верных взяток</span>
          <strong>${this.result.total}</strong>
        </div>
        <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
          Верная взятка = непрерывная секвенция сверху (Т, Т-К, Т-К-Д…). Король без туза = 0.
        </p>
      </div>
    `;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Russian word for "взятка" in correct declension after a number.
 */
function _tricksWord(n) {
  if (n === 0) return 'взяток';
  if (n === 1) return 'взятка';
  if (n >= 2 && n <= 4) return 'взятки';
  return 'взяток';
}
