// Bridge Trainer — Opening Lead Trainer (Module 7)
import { Deal } from '../core/card.js';
import { SUITS } from '../core/constants.js';
import { evaluateHand } from '../core/evaluator.js';
import { recommendLead } from '../play/lead.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderHand, renderStats } from '../ui/render.js';
import { BaseTrainer } from './base-trainer.js';

export default class LeadTrainer extends BaseTrainer {
  constructor(containerId) {
    super(containerId, 'lead');
    this.deal = null;
    this.hand = null;
    this.recommended = null;
    this.contractSuit = null;
  }

  render() {
    const stats = ProgressTracker.getStats(this.moduleId);
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
    const contextArea = document.getElementById('context-area');
    if (contextArea) {
      contextArea.innerHTML = `
        <div class="card-area-title">Контракт</div>
        <div style="font-size: 24px; font-weight: 700; text-align: center; padding: 8px;">
          ${contract.display} (Запад разыгрывает)
        </div>
        <p class="text-muted text-center" style="font-size: 13px;">Вы (Юг) делаете первый ход</p>
      `;
    }

    // Show hand
    const handArea = document.getElementById('hand-area');
    if (handArea) handArea.innerHTML = renderHand(this.hand);

    // Clickable hand for lead selection
    const leadHand = document.getElementById('lead-hand');
    if (!leadHand) return;
    leadHand.innerHTML = renderHand(this.hand, { clickable: true });

    leadHand.addEventListener('click', (e) => {
      const chip = e.target.closest('.card-chip.clickable');
      if (!chip || this.answered) return;
      const suitId = chip.dataset.suit;
      const rankValue = parseInt(chip.dataset.rank);
      this.checkAnswer(suitId, rankValue);
    });

    document.getElementById('feedback-area').innerHTML = '';
    this.hideNextBtn();
  }

  checkAnswer(suitId, rankValue) {
    if (this.answered) return;
    this.answered = true;

    const rec = this.recommended;
    const correct = rec.card && suitId === rec.card.suitId && rankValue === rec.card.rankValue;

    // Partial credit: correct suit
    const correctSuit = rec.card && suitId === rec.card.suitId;

    this.recordResult(correct, 0);

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

    this.updateStats();
    this.showNextBtn();
  }
}
