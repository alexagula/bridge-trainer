// Bridge Trainer — True/False Quiz Trainer (Module 8)
import { QUIZZES } from '../../data/quizzes.js';
import { ProgressTracker } from '../progress/tracker.js';
import { renderStats } from '../app.js';

const MODULE_ID = 'quiz';

export default class QuizTrainer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.lessonFilter = 0; // 0 = all
    this.quizzes = [];
    this.currentIdx = 0;
    this.answered = false;
  }

  init() {
    this.filterQuizzes();
    this.render();
    this.showQuestion();
  }

  destroy() {}

  filterQuizzes() {
    if (this.lessonFilter === 0) {
      this.quizzes = [...QUIZZES];
    } else {
      this.quizzes = QUIZZES.filter(q => q.lesson === this.lessonFilter);
    }
    // Shuffle
    for (let i = this.quizzes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.quizzes[i], this.quizzes[j]] = [this.quizzes[j], this.quizzes[i]];
    }
    this.currentIdx = 0;
  }

  render() {
    const stats = ProgressTracker.getStats(MODULE_ID);
    const lessons = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    this.container.innerHTML = `
      ${renderStats(stats)}
      <div class="filter-bar">
        ${lessons.map(l =>
          `<div class="filter-chip ${l === this.lessonFilter ? 'active' : ''}" data-lesson="${l}">${l === 0 ? 'Все' : `${l}`}</div>`
        ).join('')}
      </div>
      <div id="quiz-content"></div>
      <div id="feedback-area"></div>
      <button class="btn btn-primary btn-block btn-lg mt-md hidden" id="next-btn">Следующий →</button>
    `;

    this.container.querySelector('.filter-bar').addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      this.lessonFilter = parseInt(chip.dataset.lesson);
      this.container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      this.filterQuizzes();
      this.showQuestion();
    });

    document.getElementById('next-btn').addEventListener('click', () => {
      this.currentIdx = (this.currentIdx + 1) % this.quizzes.length;
      this.showQuestion();
    });
  }

  showQuestion() {
    this.answered = false;
    document.getElementById('feedback-area').innerHTML = '';
    document.getElementById('next-btn').classList.add('hidden');

    if (this.quizzes.length === 0) {
      document.getElementById('quiz-content').innerHTML =
        '<div class="card-area text-center text-muted">Нет вопросов для выбранного занятия</div>';
      return;
    }

    const q = this.quizzes[this.currentIdx];
    document.getElementById('quiz-content').innerHTML = `
      <div class="card-area">
        <div class="card-area-title">Занятие ${q.lesson} | Вопрос ${this.currentIdx + 1}/${this.quizzes.length}</div>
        <p style="font-size: 16px; line-height: 1.6; margin: 16px 0; font-weight: 500;">${q.statement}</p>
        <div class="flex gap-sm">
          <button class="bid-btn" data-answer="true" style="flex: 1; font-size: 18px;">Правда</button>
          <button class="bid-btn" data-answer="false" style="flex: 1; font-size: 18px;">Ложь</button>
        </div>
      </div>
    `;

    document.querySelectorAll('[data-answer]').forEach(btn => {
      btn.addEventListener('click', () => this.checkAnswer(btn.dataset.answer === 'true', q));
    });
  }

  checkAnswer(userAnswer, quiz) {
    if (this.answered) return;
    this.answered = true;
    const correct = userAnswer === quiz.answer;

    ProgressTracker.record(MODULE_ID, { correct, time: 0 });

    // SM-2 tracking
    const situationId = 'rule:quiz-L' + quiz.lesson;
    if (correct) {
      ProgressTracker.recordSuccess(situationId);
    } else {
      ProgressTracker.recordError('quiz', situationId, quiz.statement);
    }

    document.querySelectorAll('[data-answer]').forEach(btn => {
      const isCorrectBtn = (btn.dataset.answer === 'true') === quiz.answer;
      btn.classList.add(isCorrectBtn ? 'correct' : 'wrong');
    });

    const fb = document.getElementById('feedback-area');
    fb.innerHTML = `
      <div class="feedback ${correct ? 'feedback-success' : 'feedback-error'}">
        ${correct ? '✓ Правильно!' : '✗ Неправильно!'}
      </div>
      <div class="explanation">
        <p>${quiz.explanation}</p>
        <p class="lesson-ref">Занятие ${quiz.lesson}</p>
      </div>
    `;

    const statsHtml = renderStats(ProgressTracker.getStats(MODULE_ID));
    this.container.querySelector('.stats-bar').outerHTML = statsHtml;
    document.getElementById('next-btn').classList.remove('hidden');
  }
}
