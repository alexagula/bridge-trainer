// Bridge Trainer — Opening Bid Trainer (Module 2)
import { Deal } from '../core/card.js';
import { SUITS } from '../core/constants.js';
import { evaluateHand } from '../core/evaluator.js';
import { dealForOpening } from '../core/dealer.js';
import { determineOpening, getOpeningOptions } from '../bidding/opening.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderHand, renderStats } from '../app.js';
import { pickRelevantBids, ALL_OPENING_BIDS, BID_DISPLAY } from '../utils/bid-filter.js';
import { bidToRuleId } from '../utils/bid-utils.js';

const MODULE_ID = 'opening';

// Position labels for display (1-indexed)
const POSITION_LABELS = ['', '1-я рука', '2-я рука', '3-я рука', '4-я рука'];

// Vulnerability display labels (match VULNERABILITY ids)
const VULNERABILITY_LABELS = {
  NONE: 'Никто не уязвим',
  NS:   'СЮ уязвимы',
  EW:   'ЗВ уязвимы',
  BOTH: 'Все уязвимы',
};

// All vulnerability keys to pick from at random
const VULNERABILITY_KEYS = ['NONE', 'NS', 'EW', 'BOTH'];

export default class OpeningTrainer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.deal = null;
    this.hand = null;
    this.correctBid = null;
    this.answered = false;
    this.startTime = 0;
    this.position = 1;     // current position at table (1-4)
    this.vulnerable = 'NONE'; // current vulnerability key
  }

  init() {
    this.render();
    this.newProblem();
  }

  destroy() {}

  render() {
    const stats = ProgressTracker.getStats(MODULE_ID);
    this.container.innerHTML = `
      ${renderStats(stats)}

      <div class="card-area">
        <div id="position-info" class="text-muted mt-sm" style="font-size: 13px; margin-bottom: 6px;"></div>
        <div class="card-area-title">Ваша рука:</div>
        <div id="hand-area"></div>
        <div id="hand-info" class="text-muted mt-sm" style="font-size: 13px;"></div>
      </div>

      <div class="card-area">
        <div class="card-area-title">Ваше открытие:</div>
        <div class="bid-grid" id="bid-options"></div>
      </div>

      <div id="feedback-area"></div>

      <button class="btn btn-primary btn-block btn-lg mt-md hidden" id="next-btn">
        Следующая рука →
      </button>
    `;

    document.getElementById('next-btn').addEventListener('click', () => this.newProblem());
  }

  newProblem() {
    this.answered = false;
    this.startTime = Date.now();

    // Random position (1-4) and vulnerability
    this.position = Math.ceil(Math.random() * 4);
    this.vulnerable = VULNERABILITY_KEYS[Math.floor(Math.random() * VULNERABILITY_KEYS.length)];

    this.deal = dealForOpening();
    this.hand = this.deal.getHand('S');
    this.correctBid = determineOpening(this.hand, {
      position: this.position,
      vulnerable: this.vulnerable,
    });

    // Show position and vulnerability context
    document.getElementById('position-info').textContent =
      `Позиция: ${POSITION_LABELS[this.position]} | Зона: ${VULNERABILITY_LABELS[this.vulnerable]}`;

    // Show hand
    document.getElementById('hand-area').innerHTML = renderHand(this.hand);

    // Show HCP hint
    const ev = evaluateHand(this.hand);
    document.getElementById('hand-info').textContent =
      `${ev.hcp} HCP | ${ev.shapeStr} | ${ev.distType}`;

    // Build bid buttons — filtered to relevant bids
    const bids = pickRelevantBids(ALL_OPENING_BIDS, this.correctBid.bid, ev.hcp);
    const grid = document.getElementById('bid-options');
    grid.innerHTML = bids.map(b =>
      `<button class="bid-btn" data-bid="${b}">${BID_DISPLAY[b] || b}</button>`
    ).join('');

    // Attach events
    grid.querySelectorAll('.bid-btn').forEach(btn => {
      btn.addEventListener('click', () => this.checkAnswer(btn.dataset.bid));
    });

    // Clear feedback
    document.getElementById('feedback-area').innerHTML = '';
    document.getElementById('next-btn').classList.add('hidden');
  }

  checkAnswer(userBid) {
    if (this.answered) return;
    this.answered = true;

    const timeTaken = Date.now() - this.startTime;
    const correct = userBid === this.correctBid.bid;

    // Highlight buttons
    const grid = document.getElementById('bid-options');
    grid.querySelectorAll('.bid-btn').forEach(btn => {
      if (btn.dataset.bid === this.correctBid.bid) {
        btn.classList.add('correct');
      } else if (btn.dataset.bid === userBid && !correct) {
        btn.classList.add('wrong');
      }
    });

    // Record
    ProgressTracker.record(MODULE_ID, { correct, time: timeTaken });

    // SM-2 tracking
    const situationId = bidToRuleId('opening', this.correctBid.bid, this.hand);
    if (correct) {
      ProgressTracker.recordSuccess(situationId);
    } else {
      ProgressTracker.recordError('opening', situationId, this.correctBid.reason);
    }

    // Feedback
    const feedback = document.getElementById('feedback-area');
    if (correct) {
      feedback.innerHTML = `
        <div class="feedback feedback-success">✓ Правильно! ${this.correctBid.bidDisplay} (${(timeTaken / 1000).toFixed(1)}с)
          <p class="text-muted" style="font-size: 13px; margin-top: 4px;">${this.correctBid.reason}</p>
        </div>
      `;
    } else {
      // Find decisive step: last passed before first failed
      let decisiveIdx = -1;
      const firstFailedIdx = this.correctBid.steps.findIndex(s => !s.passed);
      if (firstFailedIdx > 0) decisiveIdx = firstFailedIdx - 1;

      const steps = this.correctBid.steps.map((s, i) => {
        const decisive = i === decisiveIdx ? ' step-decisive' : '';
        return `<p class="${s.passed ? 'step-passed' : 'step-failed'}${decisive}"><span class="step-icon">${s.passed ? '✓' : '✗'}</span> <span class="step-text">${s.text}</span></p>`;
      }).join('');

      feedback.innerHTML = `
        <div class="feedback feedback-error">✗ Неправильно. Правильный ответ: ${this.correctBid.bidDisplay}</div>
        <div class="explanation">
          <h3>Алгоритм открытия</h3>
          ${steps}
          <p style="margin-top: 8px; font-weight: 600;">${this.correctBid.reason}</p>
          <p class="lesson-ref">Занятие ${this.correctBid.lessonRef}</p>
        </div>
      `;
    }

    // Update stats
    const statsHtml = renderStats(ProgressTracker.getStats(MODULE_ID));
    this.container.querySelector('.stats-bar').outerHTML = statsHtml;

    document.getElementById('next-btn').classList.remove('hidden');
    document.getElementById('next-btn').focus();
  }
}
