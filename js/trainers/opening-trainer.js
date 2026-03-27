// Bridge Trainer — Opening Bid Trainer (Module 2)
import { Deal } from '../core/card.js';
import { SUITS } from '../core/constants.js';
import { evaluateHand } from '../core/evaluator.js';
import { dealForOpening } from '../core/dealer.js';
import { determineOpening, getOpeningOptions } from '../bidding/opening.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderHand, renderStats } from '../app.js';

const MODULE_ID = 'opening';

export default class OpeningTrainer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.deal = null;
    this.hand = null;
    this.correctBid = null;
    this.answered = false;
    this.startTime = 0;
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
        <div class="card-area-title">Вы — сдающий. Ваша рука:</div>
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

    this.deal = dealForOpening();
    this.hand = this.deal.getHand('S');
    this.correctBid = determineOpening(this.hand);

    // Show hand
    document.getElementById('hand-area').innerHTML = renderHand(this.hand);

    // Show HCP hint
    const ev = evaluateHand(this.hand);
    document.getElementById('hand-info').textContent =
      `${ev.hcp} HCP | ${ev.shapeStr} | ${ev.distType}`;

    // Build bid buttons
    const options = getOpeningOptions();
    const grid = document.getElementById('bid-options');
    grid.innerHTML = options.map(o =>
      `<button class="bid-btn" data-bid="${o.bid}">${o.display}</button>`
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

    // Feedback
    const feedback = document.getElementById('feedback-area');
    if (correct) {
      feedback.innerHTML = `
        <div class="feedback feedback-success">✓ Правильно! ${this.correctBid.bidDisplay} (${(timeTaken / 1000).toFixed(1)}с)</div>
      `;
    } else {
      const steps = this.correctBid.steps.map(s =>
        `<p>${s.passed ? '✓' : '✗'} ${s.text}</p>`
      ).join('');

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
