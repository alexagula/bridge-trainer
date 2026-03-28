// Bridge Trainer — Response Trainer (Module 3)
import { SUITS } from '../core/constants.js';
import { evaluateHand } from '../core/evaluator.js';
import { dealForResponse } from '../core/dealer.js';
import { determineResponse, getResponseOptions } from '../bidding/response.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderHand, renderStats } from '../app.js';
import { pickRelevantBids, ALL_RESPONSE_BIDS, BID_DISPLAY } from '../utils/bid-filter.js';

const MODULE_ID = 'response';
const OPENINGS = ['1♥', '1♠', '1БК', '1♣', '1♦', '2♣', '2БК', '2♥', '2♠'];

function bidToRuleId(bid, opening) {
  if (bid === 'пас') return `rule:response-pass-${opening}`;
  if (bid === '1БК') return 'rule:response-1nt';
  if (bid === '2БК') return 'rule:response-2nt';
  if (bid === '3БК') return 'rule:response-3nt';
  if (bid.includes('♥') || bid.includes('♠')) return `rule:response-major-${bid}`;
  if (bid.includes('♣') || bid.includes('♦')) return `rule:response-minor-${bid}`;
  return `rule:response-${bid}`;
}

export default class ResponseTrainer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.opening = '1♥';
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
        <div class="card-area-title">Открытие партнёра</div>
        <div class="filter-bar" id="opening-filter">
          ${OPENINGS.map(o =>
            `<div class="filter-chip ${o === this.opening ? 'active' : ''}" data-opening="${o}">${o}</div>`
          ).join('')}
          <div class="filter-chip" data-opening="random">🎲 Любое</div>
        </div>
      </div>

      <div class="card-area">
        <div class="flex flex-between" style="align-items: center;">
          <div class="card-area-title" style="margin: 0;">Партнёр открылся: <strong id="opening-display">${this.opening}</strong></div>
        </div>
        <div class="card-area-title mt-md">Ваша рука (Юг):</div>
        <div id="hand-area"></div>
        <div id="hand-info" class="text-muted mt-sm" style="font-size: 13px;"></div>
      </div>

      <div class="card-area">
        <div class="card-area-title">Ваш ответ:</div>
        <div class="bid-grid" id="bid-options" style="grid-template-columns: repeat(4, 1fr);"></div>
      </div>

      <div id="feedback-area"></div>
      <button class="btn btn-primary btn-block btn-lg mt-md hidden" id="next-btn">Следующая →</button>
    `;

    document.getElementById('opening-filter').addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      const val = chip.dataset.opening;
      if (val === 'random') {
        this.opening = OPENINGS[Math.floor(Math.random() * OPENINGS.length)];
      } else {
        this.opening = val;
      }
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      this.newProblem();
    });

    document.getElementById('next-btn').addEventListener('click', () => this.newProblem());
  }

  newProblem() {
    this.answered = false;
    this.startTime = Date.now();

    // Simple mapping for dealForResponse
    let dealKey = this.opening;
    if (dealKey === '1♥') dealKey = '1H';
    else if (dealKey === '1♠') dealKey = '1S';
    else if (dealKey === '1БК') dealKey = '1NT';
    else if (dealKey === '1♣') dealKey = '1C';
    else if (dealKey === '1♦') dealKey = '1D';
    else if (dealKey === '2♣') dealKey = '2C';
    else if (dealKey === '2БК') dealKey = '2NT';
    this.deal = dealForResponse(dealKey);

    this.hand = this.deal.getHand('S');
    this.correctBid = determineResponse(this.opening, this.hand);

    document.getElementById('opening-display').textContent = this.opening;
    document.getElementById('hand-area').innerHTML = renderHand(this.hand);
    const ev = evaluateHand(this.hand);
    document.getElementById('hand-info').textContent = `${ev.hcp} HCP | ${ev.shapeStr} | ${ev.distType}`;

    // Filter response options to relevant bids based on HCP
    const bids = pickRelevantBids(ALL_RESPONSE_BIDS, this.correctBid.bid, ev.hcp);

    const grid = document.getElementById('bid-options');
    grid.innerHTML = bids.map(b =>
      `<button class="bid-btn" data-bid="${b}">${BID_DISPLAY[b] || b}</button>`
    ).join('');
    grid.querySelectorAll('.bid-btn').forEach(btn => {
      btn.addEventListener('click', () => this.checkAnswer(btn.dataset.bid));
    });

    document.getElementById('feedback-area').innerHTML = '';
    document.getElementById('next-btn').classList.add('hidden');
  }

  checkAnswer(userBid) {
    if (this.answered) return;
    this.answered = true;
    const timeTaken = Date.now() - this.startTime;
    const correct = userBid === this.correctBid.bid;

    const grid = document.getElementById('bid-options');
    grid.querySelectorAll('.bid-btn').forEach(btn => {
      if (btn.dataset.bid === this.correctBid.bid) btn.classList.add('correct');
      else if (btn.dataset.bid === userBid && !correct) btn.classList.add('wrong');
    });

    ProgressTracker.record(MODULE_ID, { correct, time: timeTaken });

    // SM-2 tracking
    const situationId = bidToRuleId(this.correctBid.bid, this.opening);
    if (correct) {
      ProgressTracker.recordSuccess(situationId);
    } else {
      ProgressTracker.recordError('response', situationId, this.correctBid.reason);
    }

    const feedback = document.getElementById('feedback-area');
    if (correct) {
      feedback.innerHTML = `<div class="feedback feedback-success">✓ Правильно! ${this.correctBid.bidDisplay}
          <p class="text-muted" style="font-size: 13px; margin-top: 4px;">${this.correctBid.reason}</p>
        </div>`;
    } else {
      // Find decisive step: last passed before first failed
      const stepsArr = this.correctBid.steps || [];
      let decisiveIdx = -1;
      const firstFailedIdx = stepsArr.findIndex(s => !s.passed);
      if (firstFailedIdx > 0) decisiveIdx = firstFailedIdx - 1;

      const steps = stepsArr.map((s, i) => {
        const decisive = i === decisiveIdx ? ' step-decisive' : '';
        return `<p class="${s.passed ? 'step-passed' : 'step-failed'}${decisive}"><span class="step-icon">${s.passed ? '✓' : '✗'}</span> <span class="step-text">${s.text}</span></p>`;
      }).join('');
      feedback.innerHTML = `
        <div class="feedback feedback-error">✗ Правильный ответ: ${this.correctBid.bidDisplay}</div>
        <div class="explanation">
          <h3>Объяснение</h3>
          ${steps}
          <p style="font-weight: 600; margin-top: 8px;">${this.correctBid.reason}</p>
          <p class="lesson-ref">Занятие ${this.correctBid.lessonRef}</p>
        </div>
      `;
    }

    const statsHtml = renderStats(ProgressTracker.getStats(MODULE_ID));
    this.container.querySelector('.stats-bar').outerHTML = statsHtml;
    document.getElementById('next-btn').classList.remove('hidden');
  }
}
