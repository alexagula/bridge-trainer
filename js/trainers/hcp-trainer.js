// Bridge Trainer — HCP Counting Trainer (Module 1)
import { Deal } from '../core/card.js';
import { SUITS, SUIT_ORDER } from '../core/constants.js';
import { evaluateHand } from '../core/evaluator.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderHand, renderStats } from '../app.js';

const MODULE_ID = 'hcp';

// Question types
const Q_HCP = 'hcp';              // Count HCP only
const Q_DIST = 'distribution';     // Count distribution points
const Q_TOTAL = 'total';          // Count total points
const Q_BALANCED = 'balanced';     // Is hand balanced?
const Q_SHAPE = 'shape';          // Name the shape (e.g. 5431)

export default class HCPTrainer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.deal = null;
    this.hand = null;
    this.evaluation = null;
    this.questionType = Q_HCP;
    this.answered = false;
    this.startTime = 0;
    this.timerMode = false;
    this.timerSeconds = 10;
    this.timerInterval = null;
    this.difficulty = 'basic'; // basic | advanced
  }

  init() {
    this.render();
    this.newProblem();
  }

  destroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  render() {
    const stats = ProgressTracker.getStats(MODULE_ID);
    this.container.innerHTML = `
      ${renderStats(stats)}
      <div class="card-area" style="padding: 10px 12px; margin-bottom: 8px;">
        <div class="flex flex-between" style="align-items: center;">
          <div class="flex gap-sm">
            <button class="btn btn-sm ${this.difficulty === 'basic' ? 'btn-primary' : 'btn-outline'}" id="mode-basic" style="padding: 6px 12px; min-height: 34px; font-size: 13px;">Базовый</button>
            <button class="btn btn-sm ${this.difficulty === 'advanced' ? 'btn-primary' : 'btn-outline'}" id="mode-advanced" style="padding: 6px 12px; min-height: 34px; font-size: 13px;">Расширенный</button>
          </div>
          <div class="flex gap-sm" style="align-items: center;">
            <label style="font-size: 13px; color: var(--text-secondary);">
              <input type="checkbox" id="timer-toggle" ${this.timerMode ? 'checked' : ''}> Таймер
            </label>
            <select id="timer-seconds" style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; padding: 2px 6px; font-size: 13px;">
              <option value="5" ${this.timerSeconds === 5 ? 'selected' : ''}>5с</option>
              <option value="10" ${this.timerSeconds === 10 ? 'selected' : ''}>10с</option>
              <option value="15" ${this.timerSeconds === 15 ? 'selected' : ''}>15с</option>
              <option value="30" ${this.timerSeconds === 30 ? 'selected' : ''}>30с</option>
            </select>
          </div>
        </div>
      </div>

      <div id="timer-display" class="hidden" style="margin-bottom: 8px;">
        <div class="timer" id="timer-value" style="font-size: 36px;">10</div>
      </div>

      <div class="card-area" style="padding: 10px 12px; margin-bottom: 8px;">
        <div class="card-area-title" style="margin-bottom: 4px;">Ваша рука</div>
        <div id="hand-area"></div>
      </div>

      <div id="question-area" class="card-area" style="padding: 10px 12px; margin-bottom: 8px;">
        <!-- Question renders here -->
      </div>

      <div id="feedback-area"></div>

      <button class="btn btn-primary btn-block btn-lg mt-md hidden" id="next-btn">
        Следующая рука →
      </button>
    `;

    // Event listeners
    document.getElementById('mode-basic').addEventListener('click', () => {
      this.difficulty = 'basic';
      this.render();
      this.newProblem();
    });
    document.getElementById('mode-advanced').addEventListener('click', () => {
      this.difficulty = 'advanced';
      this.render();
      this.newProblem();
    });
    document.getElementById('timer-toggle').addEventListener('change', (e) => {
      this.timerMode = e.target.checked;
    });
    document.getElementById('timer-seconds').addEventListener('change', (e) => {
      this.timerSeconds = parseInt(e.target.value);
    });
    document.getElementById('next-btn').addEventListener('click', () => this.newProblem());
  }

  newProblem() {
    this.answered = false;
    this.deal = Deal.random();
    this.hand = this.deal.getHand('S');
    this.evaluation = evaluateHand(this.hand);
    this.startTime = Date.now();

    // Pick question type
    if (this.difficulty === 'basic') {
      this.questionType = Q_HCP;
    } else {
      const types = [Q_HCP, Q_HCP, Q_DIST, Q_TOTAL, Q_BALANCED, Q_SHAPE];
      this.questionType = types[Math.floor(Math.random() * types.length)];
    }

    // Scroll to top on new problem
    this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Render hand
    document.getElementById('hand-area').innerHTML = renderHand(this.hand);

    // Render question
    this.renderQuestion();

    // Hide feedback and next button
    document.getElementById('feedback-area').innerHTML = '';
    document.getElementById('next-btn').classList.add('hidden');

    // Timer
    if (this.timerInterval) clearInterval(this.timerInterval);
    const timerDisplay = document.getElementById('timer-display');
    if (this.timerMode) {
      timerDisplay.classList.remove('hidden');
      this.startTimer();
    } else {
      timerDisplay.classList.add('hidden');
    }
  }

  renderQuestion() {
    const area = document.getElementById('question-area');
    let html = '';

    switch (this.questionType) {
      case Q_HCP:
        html = `
          <div class="card-area-title">Сколько HCP?</div>
          <div class="flex gap-sm" style="align-items: center;">
            <input type="number" class="input-field" id="answer-input"
                   inputmode="numeric" pattern="[0-9]*" min="0" max="37"
                   placeholder="?" autofocus>
            <button class="btn btn-primary" id="check-btn">✓</button>
          </div>
        `;
        break;

      case Q_DIST:
        html = `
          <div class="card-area-title">Очки за расклад (синглет +1, ренонс +3)</div>
          <div class="flex gap-sm" style="align-items: center;">
            <input type="number" class="input-field" id="answer-input"
                   inputmode="numeric" pattern="[0-9]*" min="0" max="12"
                   placeholder="?" autofocus>
            <button class="btn btn-primary" id="check-btn">✓</button>
          </div>
        `;
        break;

      case Q_TOTAL:
        html = `
          <div class="card-area-title">Суммарные очки (HCP + расклад)</div>
          <div class="flex gap-sm" style="align-items: center;">
            <input type="number" class="input-field" id="answer-input"
                   inputmode="numeric" pattern="[0-9]*" min="0" max="40"
                   placeholder="?" autofocus>
            <button class="btn btn-primary" id="check-btn">✓</button>
          </div>
        `;
        break;

      case Q_BALANCED:
        html = `
          <div class="card-area-title">Расклад равномерный?</div>
          <div class="flex gap-sm mt-sm">
            <button class="bid-btn" data-answer="true" style="flex: 1;">Да</button>
            <button class="bid-btn" data-answer="false" style="flex: 1;">Нет</button>
          </div>
        `;
        break;

      case Q_SHAPE:
        html = `
          <div class="card-area-title">Назовите расклад (напр. 5332)</div>
          <div class="flex gap-sm" style="align-items: center;">
            <input type="text" class="input-field" id="answer-input"
                   inputmode="numeric" pattern="[0-9]*" maxlength="4"
                   placeholder="????" autofocus>
            <button class="btn btn-primary" id="check-btn">✓</button>
          </div>
        `;
        break;
    }

    area.innerHTML = html;

    // Attach events
    const checkBtn = document.getElementById('check-btn');
    const input = document.getElementById('answer-input');

    if (checkBtn) {
      checkBtn.addEventListener('click', () => this.checkAnswer());
    }
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.checkAnswer();
      });
      // Auto-focus
      setTimeout(() => input.focus(), 100);
    }

    // Boolean buttons
    const boolBtns = area.querySelectorAll('[data-answer]');
    boolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.checkAnswer(btn.dataset.answer === 'true');
      });
    });
  }

  checkAnswer(boolAnswer) {
    if (this.answered) return;
    this.answered = true;

    if (this.timerInterval) clearInterval(this.timerInterval);

    const timeTaken = Date.now() - this.startTime;
    let correct = false;
    let userAnswer, correctAnswer;

    switch (this.questionType) {
      case Q_HCP: {
        const input = document.getElementById('answer-input');
        userAnswer = parseInt(input.value);
        correctAnswer = this.evaluation.hcp;
        correct = userAnswer === correctAnswer;
        input.classList.add(correct ? 'correct' : 'wrong');
        break;
      }
      case Q_DIST: {
        const input = document.getElementById('answer-input');
        userAnswer = parseInt(input.value);
        correctAnswer = this.evaluation.distributionPoints;
        correct = userAnswer === correctAnswer;
        input.classList.add(correct ? 'correct' : 'wrong');
        break;
      }
      case Q_TOTAL: {
        const input = document.getElementById('answer-input');
        userAnswer = parseInt(input.value);
        correctAnswer = this.evaluation.totalPoints;
        correct = userAnswer === correctAnswer;
        input.classList.add(correct ? 'correct' : 'wrong');
        break;
      }
      case Q_BALANCED: {
        userAnswer = boolAnswer;
        correctAnswer = this.evaluation.isBalanced;
        correct = userAnswer === correctAnswer;
        const btns = document.querySelectorAll('[data-answer]');
        btns.forEach(btn => {
          const isCorrectBtn = (btn.dataset.answer === 'true') === correctAnswer;
          btn.classList.add(isCorrectBtn ? 'correct' : 'wrong');
        });
        break;
      }
      case Q_SHAPE: {
        const input = document.getElementById('answer-input');
        userAnswer = input.value.trim();
        correctAnswer = this.evaluation.shapeStr;
        correct = userAnswer === correctAnswer;
        input.classList.add(correct ? 'correct' : 'wrong');
        break;
      }
    }

    // Record
    ProgressTracker.record(MODULE_ID, { correct, time: timeTaken });

    // Feedback
    const feedback = document.getElementById('feedback-area');
    const ev = this.evaluation;
    const details = [
      `HCP: ${ev.hcp}`,
      `Расклад: ♠${ev.suitLengths['♠']}-♥${ev.suitLengths['♥']}-♦${ev.suitLengths['♦']}-♣${ev.suitLengths['♣']} (${ev.distType})`,
      ev.distributionPoints > 0 ? `Очки за расклад: +${ev.distributionPoints}` : null,
      ev.singletons.length > 0 ? `Синглеты: ${ev.singletons.join(', ')}` : null,
      ev.voids.length > 0 ? `Ренонсы: ${ev.voids.join(', ')}` : null,
    ].filter(Boolean);

    if (correct) {
      feedback.innerHTML = `
        <div class="feedback feedback-success">✓ Правильно! (${(timeTaken / 1000).toFixed(1)}с)</div>
      `;
    } else {
      feedback.innerHTML = `
        <div class="feedback feedback-error">✗ Неправильно. Ответ: ${correctAnswer}</div>
        <div class="explanation">
          <h3>Разбор</h3>
          ${details.map(d => `<p>${d}</p>`).join('')}
          <p class="lesson-ref">Занятие 1-2</p>
        </div>
      `;
    }

    // Update stats
    const statsHtml = renderStats(ProgressTracker.getStats(MODULE_ID));
    this.container.querySelector('.stats-bar').outerHTML = statsHtml;

    // Show next button
    document.getElementById('next-btn').classList.remove('hidden');

    // Auto-scroll to feedback so user sees result + next button
    setTimeout(() => {
      feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  startTimer() {
    let remaining = this.timerSeconds;
    const display = document.getElementById('timer-value');
    display.textContent = remaining;
    display.className = 'timer';

    this.timerInterval = setInterval(() => {
      remaining--;
      display.textContent = remaining;
      if (remaining <= 3) display.className = 'timer danger';
      else if (remaining <= 5) display.className = 'timer warning';

      if (remaining <= 0) {
        clearInterval(this.timerInterval);
        if (!this.answered) {
          // Time's up — auto-fail
          this.answered = true;
          ProgressTracker.record(MODULE_ID, { correct: false, time: this.timerSeconds * 1000 });

          const ev = this.evaluation;
          document.getElementById('feedback-area').innerHTML = `
            <div class="feedback feedback-error">⏰ Время вышло! Ответ: ${ev.hcp} HCP</div>
          `;
          document.getElementById('next-btn').classList.remove('hidden');

          const statsHtml = renderStats(ProgressTracker.getStats(MODULE_ID));
          this.container.querySelector('.stats-bar').outerHTML = statsHtml;
        }
      }
    }, 1000);
  }
}
