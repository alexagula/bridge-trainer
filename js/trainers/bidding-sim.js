// Bridge Trainer — Bidding Simulator (Module 4)
import { Deal } from '../core/card.js';
import { SEATS, SEAT_NAMES, NEXT_SEAT, VULNERABILITY } from '../core/constants.js';
import { evaluateHand } from '../core/evaluator.js';
import { BiddingSequence } from '../bidding/sequence.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderHand, renderStats } from '../ui/render.js';

const AI_BID_DELAY = 300; // ms delay before AI makes a bid (simulates thinking)

const MODULE_ID = 'bidding';

export default class BiddingSim {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.sequence = null;
    this.deal = null;
    this.userSeat = 'S';
    this.waitingForUser = false;
  }

  init() {
    this.render();
    this.newDeal();
  }

  destroy() {
    if (this._aiTimeout) clearTimeout(this._aiTimeout);
  }

  render() {
    const stats = ProgressTracker.getStats(MODULE_ID);
    this.container.innerHTML = `
      ${renderStats(stats)}
      <div class="card-area">
        <div class="card-area-title">Ваша рука (Юг)</div>
        <div id="hand-area"></div>
        <div id="hand-info" class="text-muted mt-sm" style="font-size: 13px;"></div>
      </div>
      <div class="card-area">
        <div class="card-area-title">Торговля</div>
        <div id="bidding-display"></div>
      </div>
      <div id="user-bid-area" class="card-area hidden">
        <div class="card-area-title">Ваша заявка:</div>
        <div class="bid-grid" id="bid-options"></div>
      </div>
      <div id="feedback-area"></div>
      <button class="btn btn-primary btn-block btn-lg mt-md hidden" id="next-btn">Новая сдача →</button>
    `;
    document.getElementById('next-btn').addEventListener('click', () => this.newDeal());
  }

  newDeal() {
    this.deal = Deal.random('S', VULNERABILITY.NONE);
    this.sequence = new BiddingSequence(this.deal);
    this.waitingForUser = false;

    document.getElementById('hand-area').innerHTML = renderHand(this.deal.getHand('S'));
    const ev = evaluateHand(this.deal.getHand('S'));
    document.getElementById('hand-info').textContent = `${ev.hcp} HCP | ${ev.shapeStr}`;
    document.getElementById('feedback-area').innerHTML = '';
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('user-bid-area').classList.add('hidden');

    this.updateBiddingDisplay();
    this.runBidding();
  }

  runBidding() {
    if (this.sequence.isComplete) {
      this.showResult();
      return;
    }

    const seat = this.sequence.currentSeat;

    if (seat === this.userSeat) {
      this.promptUser();
    } else {
      // AI bid with small delay
      this._aiTimeout = setTimeout(() => {
        try {
          const bid = this.sequence.getAIBid(seat);
          this.sequence.makeBid(seat, bid);
          this.updateBiddingDisplay();
          this.runBidding();
        } catch (err) {
          console.error('Ошибка AI хода:', err);
          const biddingArea = document.getElementById('bidding-display');
          if (biddingArea) {
            biddingArea.innerHTML = '<p class="text-muted">Произошла ошибка. Начните новую сдачу.</p>';
          }
        }
      }, AI_BID_DELAY);
    }
  }

  promptUser() {
    this.waitingForUser = true;
    const area = document.getElementById('user-bid-area');
    area.classList.remove('hidden');

    const recommended = this.sequence.getRecommendedBid(this.userSeat);

    const options = ['пас', '1♣', '1♦', '1♥', '1♠', '1БК',
      '2♣', '2♦', '2♥', '2♠', '2БК',
      '3♣', '3♦', '3♥', '3♠', '3БК',
      '4♣', '4♦', '4♥', '4♠', '4БК',
      '5♣', '5♦', '6БК', '7БК'];

    const grid = document.getElementById('bid-options');
    grid.innerHTML = options.map(o =>
      `<button class="bid-btn" data-bid="${o}">${o === 'пас' ? 'Пас' : o}</button>`
    ).join('');

    grid.querySelectorAll('.bid-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.waitingForUser) return;
        this.waitingForUser = false;
        area.classList.add('hidden');

        const userBid = btn.dataset.bid;
        const correct = userBid === recommended.bid;

        ProgressTracker.record(MODULE_ID, { correct, time: 0 });

        if (!correct) {
          const fb = document.getElementById('feedback-area');
          fb.innerHTML = `
            <div class="feedback feedback-info">
              Рекомендация: ${recommended.bid} — ${recommended.reason || ''}
            </div>
          `;
        }

        this.sequence.makeBid(this.userSeat, userBid);
        this.updateBiddingDisplay();

        const statsHtml = renderStats(ProgressTracker.getStats(MODULE_ID));
        this.container.querySelector('.stats-bar').outerHTML = statsHtml;

        this.runBidding();
      });
    });
  }

  updateBiddingDisplay() {
    const display = document.getElementById('bidding-display');
    const history = this.sequence.getBiddingHistory();

    let html = '<div class="bidding-history">';
    html += `<div class="bh-header">З</div><div class="bh-header">С</div><div class="bh-header">В</div><div class="bh-header">Ю</div>`;

    // Pad to start from dealer
    const seatOrder = ['W', 'N', 'E', 'S'];
    const dealerIdx = seatOrder.indexOf(this.deal.dealer);
    for (let i = 0; i < dealerIdx; i++) {
      html += `<div class="bh-cell"></div>`;
    }

    for (const b of history) {
      const cls = b.bid === 'пас' ? 'pass-bid' : (b.seat === 'S' ? 'user-bid' : 'suit-bid');
      html += `<div class="bh-cell ${cls}">${b.display}</div>`;
    }
    html += '</div>';
    display.innerHTML = html;
  }

  showResult() {
    const contract = this.sequence.contract;
    const declarer = this.sequence.declarer;

    let html = '';
    if (contract) {
      html += `<div class="feedback feedback-info">Контракт: ${contract} (${SEAT_NAMES[declarer] || '?'})</div>`;
    } else {
      html += `<div class="feedback feedback-info">Все четверо спасовали — нет контракта</div>`;
    }

    // Show all hands
    html += '<div class="card-area mt-md"><div class="card-area-title">Все руки</div>';
    for (const seat of SEATS) {
      const ev = evaluateHand(this.deal.getHand(seat));
      html += `<div style="margin-bottom: 12px;">
        <strong>${SEAT_NAMES[seat]}</strong> (${ev.hcp} HCP)
        ${renderHand(this.deal.getHand(seat))}
      </div>`;
    }
    html += '</div>';

    document.getElementById('feedback-area').innerHTML = html;
    document.getElementById('next-btn').classList.remove('hidden');
  }
}
