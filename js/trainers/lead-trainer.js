// Bridge Trainer — Opening Lead Trainer (Module 7)
import { Deal } from '../core/card.js';
import { SUITS } from '../core/constants.js';
import { evaluateHand } from '../core/evaluator.js';
import { recommendLead } from '../play/lead.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderHand, renderStats } from '../app.js';

const MODULE_ID = 'lead';

export default class LeadTrainer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.deal = null;
    this.hand = null;
    this.recommended = null;
    this.answered = false;
    this.contractSuit = null;
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
      <div id="context-area" class="card-area"></div>
      <div class="card-area">
        <div class="card-area-title">Ваша рука (Юг, на висте)</div>
        <div id="hand-area"></div>
      </div>
      <div class="card-area">
        <div class="card-area-title">Выберите карту для первого хода:</div>
        <div id="lead-hand" class="hand-display"></div>
      </div>
      <div id="feedback-area"></div>
      <button class="btn btn-primary btn-block btn-lg mt-md hidden" id="next-btn">Следующая →</button>
    `;
    document.getElementById('next-btn').addEventListener('click', () => this.newProblem());
  }

  newProblem() {
    this.answered = false;
    this.deal = Deal.random();
    this.hand = this.deal.getHand('S');

    // Random contract
    const contracts = [
      { suit: 'SPADES', display: '4♠' },
      { suit: 'HEARTS', display: '4♥' },
      { suit: null, display: '3БК' },
      { suit: 'DIAMONDS', display: '5♦' },
      { suit: 'CLUBS', display: '5♣' },
    ];
    const contract = contracts[Math.floor(Math.random() * contracts.length)];
    this.contractSuit = contract.suit;

    // Get recommendation
    this.recommended = recommendLead(this.hand, this.contractSuit, {});

    // Context
    document.getElementById('context-area').innerHTML = `
      <div class="card-area-title">Контракт</div>
      <div style="font-size: 24px; font-weight: 700; text-align: center; padding: 8px;">
        ${contract.display} (Запад разыгрывает)
      </div>
      <p class="text-muted text-center" style="font-size: 13px;">Вы (Юг) делаете первый ход</p>
    `;

    // Show hand
    document.getElementById('hand-area').innerHTML = renderHand(this.hand);

    // Clickable hand for lead selection
    const leadHand = document.getElementById('lead-hand');
    leadHand.innerHTML = renderHand(this.hand, { clickable: true });

    leadHand.addEventListener('click', (e) => {
      const chip = e.target.closest('.card-chip.clickable');
      if (!chip || this.answered) return;
      const suitId = chip.dataset.suit;
      const rankValue = parseInt(chip.dataset.rank);
      this.checkAnswer(suitId, rankValue);
    });

    document.getElementById('feedback-area').innerHTML = '';
    document.getElementById('next-btn').classList.add('hidden');
  }

  checkAnswer(suitId, rankValue) {
    if (this.answered) return;
    this.answered = true;

    const rec = this.recommended;
    const correct = rec.card && suitId === rec.card.suitId && rankValue === rec.card.rankValue;

    // Partial credit: correct suit
    const correctSuit = rec.card && suitId === rec.card.suitId;

    ProgressTracker.record(MODULE_ID, { correct, time: 0 });

    // SM-2 tracking
    const contractKey = this.contractSuit ? this.contractSuit.toLowerCase() : 'nt';
    const situationId = 'rule:lead-' + contractKey;
    if (correct) {
      ProgressTracker.recordSuccess(situationId);
    } else {
      ProgressTracker.recordError('lead', situationId, rec.reason);
    }

    // Highlight
    const chips = document.querySelectorAll('#lead-hand .card-chip.clickable');
    chips.forEach(chip => {
      if (chip.dataset.suit === rec.card?.suitId && parseInt(chip.dataset.rank) === rec.card?.rankValue) {
        chip.classList.add('correct');
      } else if (chip.dataset.suit === suitId && parseInt(chip.dataset.rank) === rankValue && !correct) {
        chip.classList.add('wrong');
      }
    });

    const fb = document.getElementById('feedback-area');
    if (correct) {
      fb.innerHTML = `<div class="feedback feedback-success">✓ Правильно! ${rec.card.display}</div>`;
    } else {
      fb.innerHTML = `
        <div class="feedback feedback-error">✗ Рекомендация: ${rec.card?.display || '?'}</div>
        <div class="explanation">
          <h3>Объяснение</h3>
          <p>${rec.reason}</p>
          ${correctSuit ? '<p style="color: var(--warning);">Правильная масть, но не та карта</p>' : ''}
          <p class="lesson-ref">Занятие 10</p>
        </div>
      `;
    }

    const statsHtml = renderStats(ProgressTracker.getStats(MODULE_ID));
    this.container.querySelector('.stats-bar').outerHTML = statsHtml;
    document.getElementById('next-btn').classList.remove('hidden');
  }
}
