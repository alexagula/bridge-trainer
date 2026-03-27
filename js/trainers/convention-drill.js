// Bridge Trainer — Convention Drills (Module 5): Stayman, Blackwood, Takeout Double
import { Deal } from '../core/card.js';
import { SUITS, SUIT_ORDER } from '../core/constants.js';
import { evaluateHand } from '../core/evaluator.js';
import { dealWithConstraints, combineConstraints, hcpRange, balanced, no5CardMajor, has4CardMajor } from '../core/dealer.js';
import { staymanResponse, staymanRebid, blackwoodResponse, respondToTakeoutDouble, canTakeoutDouble } from '../bidding/conventions.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderHand, renderStats } from '../app.js';

const MODULE_ID = 'conventions';

const DRILLS = [
  { id: 'stayman', name: 'Стейман', lesson: 3 },
  { id: 'blackwood', name: 'Блэквуд', lesson: 8 },
  { id: 'takeout', name: 'Вызывная контра', lesson: 7 },
];

export default class ConventionDrill {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.drill = 'stayman';
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
      <div class="filter-bar">
        ${DRILLS.map(d =>
          `<div class="filter-chip ${d.id === this.drill ? 'active' : ''}" data-drill="${d.id}">${d.name}</div>`
        ).join('')}
      </div>
      <div id="drill-content"></div>
      <div id="feedback-area"></div>
      <button class="btn btn-primary btn-block btn-lg mt-md hidden" id="next-btn">Следующее →</button>
    `;

    this.container.querySelector('.filter-bar').addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      this.drill = chip.dataset.drill;
      this.container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      this.newProblem();
    });

    document.getElementById('next-btn').addEventListener('click', () => this.newProblem());
  }

  newProblem() {
    this.answered = false;
    this.startTime = Date.now();
    document.getElementById('feedback-area').innerHTML = '';
    document.getElementById('next-btn').classList.add('hidden');

    switch (this.drill) {
      case 'stayman': this.staymanDrill(); break;
      case 'blackwood': this.blackwoodDrill(); break;
      case 'takeout': this.takeoutDrill(); break;
    }
  }

  // === STAYMAN ===
  staymanDrill() {
    // Opener (North) has 1NT hand, responder (South) has Stayman-worthy hand
    const deal = dealWithConstraints({
      N: combineConstraints(hcpRange(15, 18), balanced(), no5CardMajor()),
      S: combineConstraints(hcpRange(8, 15), has4CardMajor()),
    });

    const opener = deal.getHand('N');
    const responder = deal.getHand('S');
    const response = staymanResponse(opener);

    const content = document.getElementById('drill-content');
    content.innerHTML = `
      <div class="card-area">
        <div class="card-area-title">Торговля: Север открыл 1БК, Юг ответил 2♣ (Стейман)</div>
        <div class="card-area-title mt-md">Рука Севера (открывающий):</div>
        ${renderHand(opener)}
        <p class="text-muted mt-sm" style="font-size: 13px;">${evaluateHand(opener).hcp} HCP</p>
      </div>
      <div class="card-area">
        <div class="card-area-title">Что отвечает Север на Стейман?</div>
        <div class="bid-grid">
          <button class="bid-btn" data-bid="2♦">2♦ нет</button>
          <button class="bid-btn" data-bid="2♥">2♥</button>
          <button class="bid-btn" data-bid="2♠">2♠</button>
        </div>
      </div>
    `;

    content.querySelectorAll('.bid-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.answered) return;
        this.answered = true;
        const correct = btn.dataset.bid === response.bid;
        ProgressTracker.record(MODULE_ID, { correct, time: Date.now() - this.startTime });

        content.querySelectorAll('.bid-btn').forEach(b => {
          if (b.dataset.bid === response.bid) b.classList.add('correct');
          else if (b === btn && !correct) b.classList.add('wrong');
        });

        const fb = document.getElementById('feedback-area');
        fb.innerHTML = correct
          ? `<div class="feedback feedback-success">✓ Правильно! ${response.bid}</div>`
          : `<div class="feedback feedback-error">✗ Ответ: ${response.bid}</div>
             <div class="explanation"><p>${response.reason}</p><p class="lesson-ref">Занятие 3</p></div>`;

        const statsHtml = renderStats(ProgressTracker.getStats(MODULE_ID));
        this.container.querySelector('.stats-bar').outerHTML = statsHtml;
        document.getElementById('next-btn').classList.remove('hidden');
      });
    });
  }

  // === BLACKWOOD ===
  blackwoodDrill() {
    const deal = Deal.random();
    const hand = deal.getHand('S');
    const trumpSuit = hand.suitLength('SPADES') >= 5 ? 'SPADES'
      : hand.suitLength('HEARTS') >= 5 ? 'HEARTS' : 'SPADES';
    const response = blackwoodResponse(hand, trumpSuit);

    const content = document.getElementById('drill-content');
    content.innerHTML = `
      <div class="card-area">
        <div class="card-area-title">Партнёр спросил Блэквуд (4БК). Козырь: ${SUITS[trumpSuit].symbol}</div>
        <div class="card-area-title mt-md">Ваша рука:</div>
        ${renderHand(hand)}
        <p class="text-muted mt-sm" style="font-size: 13px;">${hand.countAces()} тузов, козырный К: ${hand.getSuitCards(trumpSuit).some(c => c.rankValue === 13) ? 'да' : 'нет'}</p>
      </div>
      <div class="card-area">
        <div class="card-area-title">Ваш ответ на Блэквуд:</div>
        <div class="bid-grid">
          <button class="bid-btn" data-bid="5♣">5♣ (0)</button>
          <button class="bid-btn" data-bid="5♦">5♦ (1)</button>
          <button class="bid-btn" data-bid="5♥">5♥ (2)</button>
          <button class="bid-btn" data-bid="5♠">5♠ (3)</button>
          <button class="bid-btn" data-bid="5БК">5БК (4)</button>
        </div>
      </div>
    `;

    content.querySelectorAll('.bid-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.answered) return;
        this.answered = true;
        const correct = btn.dataset.bid === response.bid;
        ProgressTracker.record(MODULE_ID, { correct, time: Date.now() - this.startTime });

        content.querySelectorAll('.bid-btn').forEach(b => {
          if (b.dataset.bid === response.bid) b.classList.add('correct');
          else if (b === btn && !correct) b.classList.add('wrong');
        });

        document.getElementById('feedback-area').innerHTML = correct
          ? `<div class="feedback feedback-success">✓ ${response.display}</div>`
          : `<div class="feedback feedback-error">✗ Ответ: ${response.display}</div>
             <div class="explanation"><p>${response.reason}</p><p class="lesson-ref">Занятие 8</p></div>`;

        const statsHtml = renderStats(ProgressTracker.getStats(MODULE_ID));
        this.container.querySelector('.stats-bar').outerHTML = statsHtml;
        document.getElementById('next-btn').classList.remove('hidden');
      });
    });
  }

  // === TAKEOUT DOUBLE ===
  takeoutDrill() {
    // Opponent opened, partner doubled, you respond
    const oppSuit = ['CLUBS', 'DIAMONDS', 'HEARTS', 'SPADES'][Math.floor(Math.random() * 4)];
    const deal = Deal.random();
    const hand = deal.getHand('S');
    const response = respondToTakeoutDouble(hand, oppSuit);

    const content = document.getElementById('drill-content');
    content.innerHTML = `
      <div class="card-area">
        <div class="card-area-title">Запад открылся 1${SUITS[oppSuit].symbol}, Север дал вызывную контру (X)</div>
        <div class="card-area-title mt-md">Ваша рука (Юг):</div>
        ${renderHand(hand)}
        <p class="text-muted mt-sm" style="font-size: 13px;">${evaluateHand(hand).hcp} HCP</p>
      </div>
      <div class="card-area">
        <div class="card-area-title">Ваш ответ на контру партнёра:</div>
        <div class="bid-grid" id="takeout-options"></div>
      </div>
    `;

    // Build options
    const options = ['пас', '1♣', '1♦', '1♥', '1♠', '1БК', '2♣', '2♦', '2♥', '2♠', '2БК', '3БК'];
    const grid = document.getElementById('takeout-options');
    grid.innerHTML = options.map(o =>
      `<button class="bid-btn" data-bid="${o}">${o === 'пас' ? 'Пас' : o}</button>`
    ).join('');

    grid.querySelectorAll('.bid-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.answered) return;
        this.answered = true;
        const correct = btn.dataset.bid === response.bid;
        ProgressTracker.record(MODULE_ID, { correct, time: Date.now() - this.startTime });

        grid.querySelectorAll('.bid-btn').forEach(b => {
          if (b.dataset.bid === response.bid) b.classList.add('correct');
          else if (b === btn && !correct) b.classList.add('wrong');
        });

        document.getElementById('feedback-area').innerHTML = correct
          ? `<div class="feedback feedback-success">✓ ${response.bid}</div>`
          : `<div class="feedback feedback-error">✗ Ответ: ${response.bid}</div>
             <div class="explanation"><p>${response.reason}</p><p class="lesson-ref">Занятие 7</p></div>`;

        const statsHtml = renderStats(ProgressTracker.getStats(MODULE_ID));
        this.container.querySelector('.stats-bar').outerHTML = statsHtml;
        document.getElementById('next-btn').classList.remove('hidden');
      });
    });
  }
}
