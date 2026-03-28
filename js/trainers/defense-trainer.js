// Bridge Trainer — Defense Trainer (Module)
import { DEFENSE_SCENARIOS, getDefenseScenariosByCategory, getDefenseCategories } from '../play/defense-scenarios.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderStats } from '../app.js';

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const MODULE_ID = 'defense';

export default class DefenseTrainer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.category = 'all';
    this.scenarios = [];
    this.currentIdx = 0;
    this.answered = false;
    this._startTime = 0;
  }

  init() {
    this.scenarios = getDefenseScenariosByCategory(this.category);
    this.currentIdx = 0;
    this._shuffleScenarios();
    this.render();
    this.showScenario();
  }

  destroy() {}

  _shuffleScenarios() {
    for (let i = this.scenarios.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.scenarios[i], this.scenarios[j]] = [this.scenarios[j], this.scenarios[i]];
    }
  }

  render() {
    const stats = ProgressTracker.getStats(MODULE_ID);
    const categories = getDefenseCategories();

    this.container.innerHTML = `
      ${renderStats(stats)}
      <div class="filter-bar">
        ${categories.map(c =>
          `<div class="filter-chip ${c.id === this.category ? 'active' : ''}" data-cat="${c.id}">${c.name}</div>`
        ).join('')}
      </div>
      <div id="defense-scenario-content"></div>
      <div id="defense-feedback-area"></div>
      <button class="btn btn-primary btn-block btn-lg mt-md hidden" id="defense-next-btn">Следующий →</button>
    `;

    this.container.querySelector('.filter-bar').addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      this.category = chip.dataset.cat;
      this.scenarios = getDefenseScenariosByCategory(this.category);
      this._shuffleScenarios();
      this.currentIdx = 0;
      this.container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      this.showScenario();
    });

    const nextBtn = this.container.querySelector('#defense-next-btn');
    if (nextBtn) nextBtn.addEventListener('click', () => {
      this.currentIdx = (this.currentIdx + 1) % this.scenarios.length;
      this.showScenario();
    });
  }

  /**
   * Build HTML for a hand (object with spades/hearts/diamonds/clubs arrays).
   * @param {Object} hand
   * @returns {string}
   */
  _renderHand(hand) {
    const suitMeta = [
      { key: 'spades',   sym: '♠', cls: 'spades' },
      { key: 'hearts',   sym: '♥', cls: 'hearts' },
      { key: 'diamonds', sym: '♦', cls: 'diamonds' },
      { key: 'clubs',    sym: '♣', cls: 'clubs' },
    ];
    const FACE_CARDS = ['Т', 'К', 'Д', 'В'];
    let html = '<div class="hand-display">';
    for (const { key, sym, cls } of suitMeta) {
      const cards = hand[key];
      if (!cards || cards.length === 0) continue;
      html += `<div class="suit-row">
        <span class="suit-symbol ${cls}">${sym}</span>
        <div class="suit-cards">`;
      for (const c of cards) {
        const face = FACE_CARDS.includes(c) ? ' face' : '';
        html += `<span class="card-chip ${cls}${face}">${c}</span>`;
      }
      html += '</div></div>';
    }
    html += '</div>';
    return html;
  }

  showScenario() {
    this.answered = false;
    this._startTime = Date.now();

    const feedbackArea = document.getElementById('defense-feedback-area');
    const nextBtn = document.getElementById('defense-next-btn');
    if (feedbackArea) feedbackArea.innerHTML = '';
    if (nextBtn) nextBtn.classList.add('hidden');

    const content = document.getElementById('defense-scenario-content');

    if (this.scenarios.length === 0) {
      content.innerHTML =
        '<div class="card-area text-center text-muted">Нет сценариев в этой категории</div>';
      return;
    }

    const s = this.scenarios[this.currentIdx];

    // Context line: contract + partner's lead + position
    const ctx = s.context || {};
    const contextParts = [];
    if (ctx.contract)    contextParts.push(`Контракт: <strong>${ctx.contract}</strong>`);
    if (ctx.partnerLead) contextParts.push(`Ход партнёра: <strong>${ctx.partnerLead}</strong>`);
    if (ctx.position)    contextParts.push(`Вы — <strong>${ctx.position}</strong>`);
    const contextLine = contextParts.join(' &nbsp;·&nbsp; ');

    content.innerHTML = `
      <div class="card-area">
        <div class="card-area-title">${escapeHtml(s.title)}</div>
        ${contextLine ? `<p class="defense-context">${contextLine}</p>` : ''}
        <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">${escapeHtml(s.description)}</p>
        <div class="card-area-title mt-md">Ваша рука:</div>
        ${this._renderHand(s.hand)}
      </div>
      <div class="card-area">
        <div class="card-area-title">${s.question}</div>
        <div class="flex flex-col gap-sm mt-sm" id="defense-options">
          ${s.options.map((opt, i) =>
            `<button class="quiz-option" data-idx="${i}">${opt}</button>`
          ).join('')}
        </div>
      </div>
    `;

    content.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => this.checkAnswer(parseInt(btn.dataset.idx), s));
    });
  }

  checkAnswer(idx, scenario) {
    if (this.answered) return;
    this.answered = true;

    const elapsed = Math.round((Date.now() - this._startTime) / 1000);
    const correct = idx === scenario.correct;

    ProgressTracker.record(MODULE_ID, { correct, time: elapsed });

    // Highlight options
    const options = document.querySelectorAll('#defense-options .quiz-option');
    options.forEach((btn, i) => {
      if (i === scenario.correct) btn.classList.add('correct');
      else if (i === idx && !correct) btn.classList.add('wrong');
    });

    // Feedback
    const fb = document.getElementById('defense-feedback-area');
    fb.innerHTML = correct
      ? `<div class="feedback feedback-success">✓ Правильно!</div>`
      : `<div class="feedback feedback-error">✗ Неправильно</div>`;
    fb.innerHTML += `
      <div class="explanation">
        <h3>Разбор</h3>
        <p>${scenario.explanation}</p>
        <p class="lesson-ref">Занятие 10</p>
      </div>
    `;

    // Update stats bar
    const statsHtml = renderStats(ProgressTracker.getStats(MODULE_ID));
    const statsBar = this.container.querySelector('.stats-bar');
    if (statsBar) statsBar.outerHTML = statsHtml;

    const nextBtnEl = this.container.querySelector('#defense-next-btn');
    if (nextBtnEl) nextBtnEl.classList.remove('hidden');
  }
}
