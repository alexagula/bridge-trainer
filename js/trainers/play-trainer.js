// Bridge Trainer — Play Technique Trainer (Module 6)
import { PLAY_SCENARIOS, getScenariosByCategory, getScenarioCategories } from '../play/techniques.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderStats } from '../ui/render.js';
import { BaseTrainer } from './base-trainer.js';

export default class PlayTrainer extends BaseTrainer {
  constructor(containerId) {
    super(containerId, 'play');
    this.category = 'all';
    this.scenarios = [];
    this.currentIdx = 0;
  }

  init() {
    this.scenarios = getScenariosByCategory(this.category);
    this.currentIdx = 0;
    this.shuffleScenarios();
    this.render();
    this.showScenario();
  }

  shuffleScenarios() {
    for (let i = this.scenarios.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.scenarios[i], this.scenarios[j]] = [this.scenarios[j], this.scenarios[i]];
    }
  }

  render() {
    const stats = ProgressTracker.getStats(this.moduleId);
    const categories = getScenarioCategories();
    this.container.innerHTML = `
      ${renderStats(stats)}
      <div class="filter-bar">
        ${categories.map(c =>
          `<div class="filter-chip ${c.id === this.category ? 'active' : ''}" data-cat="${c.id}">${c.name}</div>`
        ).join('')}
      </div>
      <div id="scenario-content"></div>
      <div id="feedback-area"></div>
      <button class="btn btn-primary btn-block btn-lg mt-md hidden" id="next-btn">Следующий →</button>
    `;

    this.container.querySelector('.filter-bar').addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      this.category = chip.dataset.cat;
      this.scenarios = getScenariosByCategory(this.category);
      this.shuffleScenarios();
      this.currentIdx = 0;
      this.container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      this.showScenario();
    });

    document.getElementById('next-btn').addEventListener('click', () => {
      this.currentIdx = (this.currentIdx + 1) % this.scenarios.length;
      this.showScenario();
    });
  }

  showScenario() {
    this.answered = false;
    document.getElementById('feedback-area').innerHTML = '';
    this.hideNextBtn();

    if (this.scenarios.length === 0) {
      document.getElementById('scenario-content').innerHTML =
        '<div class="card-area text-center text-muted">Нет сценариев в этой категории</div>';
      return;
    }

    const s = this.scenarios[this.currentIdx];
    const content = document.getElementById('scenario-content');

    let handsHtml = '';
    if (s.north) {
      handsHtml += '<div class="card-area-title mt-md">Стол (Север):</div><div class="hand-display">';
      for (const [suit, cards] of Object.entries(s.north)) {
        const sym = suit === 'spades' ? '♠' : suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : '♣';
        const cls = suit;
        handsHtml += `<div class="suit-row"><span class="suit-symbol ${cls}">${sym}</span><div class="suit-cards">`;
        for (const c of cards) {
          handsHtml += `<span class="card-chip ${cls}${['Т','К','Д','В'].includes(c) ? ' face' : ''}">${c}</span>`;
        }
        handsHtml += '</div></div>';
      }
      handsHtml += '</div>';
    }
    if (s.south) {
      handsHtml += '<div class="card-area-title mt-md">Рука (Юг):</div><div class="hand-display">';
      for (const [suit, cards] of Object.entries(s.south)) {
        const sym = suit === 'spades' ? '♠' : suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : '♣';
        const cls = suit;
        handsHtml += `<div class="suit-row"><span class="suit-symbol ${cls}">${sym}</span><div class="suit-cards">`;
        for (const c of cards) {
          handsHtml += `<span class="card-chip ${cls}${['Т','К','Д','В'].includes(c) ? ' face' : ''}">${c}</span>`;
        }
        handsHtml += '</div></div>';
      }
      handsHtml += '</div>';
    }

    content.innerHTML = `
      <div class="card-area">
        <div class="card-area-title">${s.title}</div>
        <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">${s.description}</p>
        ${handsHtml}
      </div>
      <div class="card-area">
        <div class="card-area-title">${s.question}</div>
        <div class="flex flex-col gap-sm mt-sm" id="play-options">
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
    const correct = idx === scenario.correct;

    this.recordResult(correct, 0);

    const options = document.querySelectorAll('#play-options .quiz-option');
    options.forEach((btn, i) => {
      if (i === scenario.correct) btn.classList.add('correct');
      else if (i === idx && !correct) btn.classList.add('wrong');
    });

    const fb = document.getElementById('feedback-area');
    fb.innerHTML = correct
      ? `<div class="feedback feedback-success">✓ Правильно!</div>`
      : `<div class="feedback feedback-error">✗ Неправильно</div>`;
    fb.innerHTML += `
      <div class="explanation">
        <h3>Разбор</h3>
        <p>${scenario.explanation}</p>
        <p class="lesson-ref">Занятие ${scenario.lesson}</p>
      </div>
    `;

    this.updateStats();
    this.showNextBtn();
  }
}
