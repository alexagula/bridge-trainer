// Bridge Trainer — SPA Router and Module Lifecycle
import { SUITS, SUIT_ORDER } from './core/constants.js';
import { ProgressTracker } from './progress/tracker.js';
import { createProgressView } from './progress/progress-view.js';
import { NotificationManager } from './notifications.js';

// Lesson → modules mapping: which modules become available after each lesson
const LESSON_MODULES = {
  1:  ['hcp'],
  2:  ['hcp'],
  3:  ['opening', 'response', 'conventions'],
  4:  ['response'],
  5:  ['play', 'tricks', 'bidding'],
  6:  ['play', 'tricks'],
  7:  ['conventions', 'bidding'],
  8:  ['opening', 'response', 'conventions'],
  9:  ['opening', 'response', 'bidding'],
  10: ['lead', 'defense'],
};

/**
 * Get the set of unlocked module IDs for a given max lesson.
 * quiz and theory are always available.
 * @param {number} maxLesson
 * @returns {Set<string>}
 */
export function getUnlockedModules(maxLesson) {
  const modules = new Set(['quiz', 'theory']);
  for (let i = 1; i <= maxLesson; i++) {
    for (const m of (LESSON_MODULES[i] || [])) modules.add(m);
  }
  return modules;
}

// Module registry — lazy-loaded
const MODULE_LOADERS = {
  welcome:     null, // static HTML, no JS module
  mix:         () => import('./trainers/daily-mix.js'),
  hcp:         () => import('./trainers/hcp-trainer.js'),
  opening:     () => import('./trainers/opening-trainer.js'),
  response:    () => import('./trainers/response-trainer.js'),
  bidding:     () => import('./trainers/bidding-sim.js'),
  conventions: () => import('./trainers/convention-drill.js'),
  play:        () => import('./trainers/play-trainer.js'),
  lead:        () => import('./trainers/lead-trainer.js'),
  quiz:        () => import('./trainers/quiz-trainer.js'),
  tricks:      () => import('./trainers/trick-trainer.js'),
  defense:     () => import('./trainers/defense-trainer.js'),
  theory:      () => import('./reference/theory.js'),
  progress:    () => Promise.all([
    import('./progress/tracker.js'),
    import('./progress/progress-view.js')
  ]).then(([t, v]) => ({ default: v.createProgressView(t.ProgressTracker) })),
};

const MODULE_TITLES = {
  welcome:     'Тренажёр',
  mix:         'Микс дня',
  hcp:         'Подсчёт HCP',
  opening:     'Выбор открытия',
  response:    'Ответ на открытие',
  bidding:     'Симулятор торговли',
  conventions: 'Конвенции',
  play:        'Розыгрыш',
  lead:        'Первый ход',
  quiz:        'Тесты',
  tricks:      'Подсчёт взяток',
  defense:     'Защита',
  theory:      'Справочник',
  progress:    'Прогресс',
};

let currentModule = null;
let currentModuleId = 'welcome';

class App {
  constructor() {
    this.content = document.getElementById('content');
    this.tabBar = document.getElementById('tabBar');
    this.moduleTitle = document.getElementById('module-title');
    this.setupTabs();
    this.setupWelcomeButtons();

    // Clickable logo — go home
    document.getElementById('app-logo')?.addEventListener('click', () => this.switchModule('welcome'));

    // Browser history navigation
    window.addEventListener('popstate', (e) => {
      const moduleId = e.state?.module || 'welcome';
      this.switchModule(moduleId, true); // skipHistory=true to avoid duplicate pushState
    });

    // Escape to close modules popup
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._closeModulesPopup();
    });

    // Show onboarding on first visit (no bridge-onboarding in localStorage)
    if (!localStorage.getItem('bridge-onboarding')) {
      this.showOnboarding();
    }
  }

  setupWelcomeButtons() {
    document.getElementById('notify-btn')?.addEventListener('click', () => this.enableNotifications());
    document.getElementById('start-training-btn')?.addEventListener('click', () => {
      const unlocked = getUnlockedModules(ProgressTracker.getMaxLesson());
      const candidates = ['hcp', 'opening', 'response'];
      for (const m of candidates) {
        if (unlocked.has(m)) { this.switchModule(m); return; }
      }
      this.switchModule('hcp');
    });
    document.getElementById('daily-mix-btn')?.addEventListener('click', () => this.switchModule('mix'));
  }

  setupTabs() {
    this.tabBar.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab-item');
      if (!tab) return;

      // Handle modules-tab popup toggle
      if (tab.id === 'modules-tab') {
        this._toggleModulesPopup();
        return;
      }

      const moduleId = tab.dataset.module;
      if (moduleId) this.switchModule(moduleId);
    });

    // Handle popup item clicks
    const popup = document.getElementById('modules-popup');
    if (popup) {
      popup.addEventListener('click', (e) => {
        const item = e.target.closest('.popup-item');
        if (!item) return;
        const moduleId = item.dataset.module;
        if (moduleId) {
          this._closeModulesPopup();
          this.switchModule(moduleId);
        }
      });
    }
  }

  _toggleModulesPopup() {
    const popup = document.getElementById('modules-popup');
    if (!popup) return;

    if (popup.classList.contains('hidden')) {
      // Filter modules by current level before showing
      const unlocked = getUnlockedModules(ProgressTracker.getMaxLesson());
      popup.querySelectorAll('.popup-item').forEach(item => {
        const isUnlocked = unlocked.has(item.dataset.module);
        item.style.display = isUnlocked ? '' : 'none';
      });

      popup.classList.remove('hidden');
      // Add overlay to close popup on outside click
      const overlay = document.createElement('div');
      overlay.className = 'popup-overlay';
      overlay.id = 'popup-overlay';
      overlay.addEventListener('click', () => this._closeModulesPopup());
      document.body.appendChild(overlay);
    } else {
      this._closeModulesPopup();
    }
  }

  _closeModulesPopup() {
    const popup = document.getElementById('modules-popup');
    if (popup) popup.classList.add('hidden');
    const overlay = document.getElementById('popup-overlay');
    if (overlay) overlay.remove();
  }

  async switchModule(moduleId, skipHistory = false) {
    if (moduleId === currentModuleId) return;

    // Destroy current module
    if (currentModule && currentModule.destroy) {
      currentModule.destroy();
    }
    currentModule = null;

    // Update tab state
    const popupModules = ['hcp', 'opening', 'response', 'bidding', 'conventions', 'play', 'lead', 'quiz'];
    const isPopupModule = popupModules.includes(moduleId);
    this.tabBar.querySelectorAll('.tab-item').forEach(t => {
      if (t.id === 'modules-tab') {
        t.classList.toggle('active', isPopupModule);
      } else {
        t.classList.toggle('active', t.dataset.module === moduleId);
      }
    });

    // Update aria-selected on tabs
    this.tabBar.querySelectorAll('[role="tab"]').forEach(tab => {
      tab.setAttribute('aria-selected', tab.dataset.module === moduleId ? 'true' : 'false');
    });

    // Update title
    this.moduleTitle.textContent = MODULE_TITLES[moduleId] || '';
    document.title = MODULE_TITLES[moduleId]
      ? `${MODULE_TITLES[moduleId]} — Бридж`
      : 'Тренажёр бриджа';
    currentModuleId = moduleId;

    // Welcome screen (static)
    if (moduleId === 'welcome') {
      if (!skipHistory) {
        history.replaceState({ module: 'welcome' }, '', window.location.pathname);
      }
      this.showWelcome();
      return;
    }

    // Show loading
    this.content.innerHTML = `
      <div class="module-container text-center" style="padding: 48px 16px;">
        <div style="font-size: 32px; margin-bottom: 16px;">⏳</div>
        <p class="text-muted">Загрузка модуля...</p>
      </div>
    `;

    // Load module
    const loader = MODULE_LOADERS[moduleId];
    if (!loader) {
      this.content.innerHTML = `
        <div class="module-container text-center" style="padding: 48px 16px;">
          <div style="font-size: 32px; margin-bottom: 16px;">🚧</div>
          <p class="text-muted">Модуль в разработке</p>
          <button class="btn btn-outline btn-sm mt-md go-home-btn">На главную</button>
        </div>
      `;
      this.content.querySelector('.go-home-btn')?.addEventListener('click', () => this.switchModule('welcome'));
      return;
    }

    try {
      const mod = await loader();
      const TrainerClass = mod.default;

      this.content.innerHTML = '<div id="module-root" class="module-container"></div>';

      if (typeof TrainerClass === 'function') {
        currentModule = new TrainerClass('module-root');
        if (currentModule.init) currentModule.init();
      } else if (TrainerClass && TrainerClass.init) {
        currentModule = TrainerClass;
        currentModule.init('module-root');
      }

      // Update browser history after successful load
      if (!skipHistory) {
        history.pushState({ module: moduleId }, '', '#' + moduleId);
      }
    } catch (err) {
      console.error('Module load error:', err);
      this.content.innerHTML = `
        <div class="module-container text-center" style="padding: 48px 16px;">
          <div style="font-size: 32px; margin-bottom: 16px;">🚧</div>
          <p class="text-muted">Модуль в разработке</p>
          <p class="text-muted mt-sm error-detail" style="font-size: 12px;"></p>
          <button class="btn btn-outline btn-sm mt-md go-home-btn">На главную</button>
        </div>
      `;
      const errEl = this.content.querySelector('.error-detail');
      if (errEl) errEl.textContent = err.message;
      this.content.querySelector('.go-home-btn')?.addEventListener('click', () => this.switchModule('welcome'));
    }
  }

  showWelcome() {
    const welcome = document.getElementById('welcome');
    if (welcome) {
      welcome.style.display = '';
      this.content.innerHTML = '';
      this.content.appendChild(welcome);
      // Update SM-2 due badge
      const badge = document.getElementById('due-badge');
      if (badge) {
        const dueCount = ProgressTracker.getDueCount();
        if (dueCount > 0) {
          badge.textContent = `${dueCount}`;
          badge.style.display = 'inline';
        } else {
          badge.style.display = 'none';
        }
      }
      // Update streak banner
      const streakCount = document.getElementById('streak-count');
      const todayCount = document.getElementById('today-count');
      if (streakCount) streakCount.textContent = String(ProgressTracker.getGlobalStreak());
      if (todayCount) todayCount.textContent = String(ProgressTracker.getTodayCount());

      // Show notify button if: API supported, permission not yet requested, user has done tasks today
      // On iOS Safari (not installed as PWA) Notification API exists but doesn't work — hide button
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
      const notifyBtn = document.getElementById('notify-btn');
      if (notifyBtn) {
        const shouldShow = NotificationManager.isSupported()
          && Notification.permission === 'default'
          && ProgressTracker.getTodayCount() > 0
          && (isStandalone || !/iPhone|iPad/.test(navigator.userAgent));
        notifyBtn.classList.toggle('hidden', !shouldShow);
      }

      // Filter module rows by current level
      const maxLesson = ProgressTracker.getMaxLesson();
      const unlocked = getUnlockedModules(maxLesson);
      welcome.querySelectorAll('.module-row').forEach(row => {
        row.style.display = unlocked.has(row.dataset.module) ? '' : 'none';
      });

      // Show level info + change link (remove old one if re-rendering)
      const existingLevelInfo = welcome.querySelector('#welcome-level-info');
      if (existingLevelInfo) existingLevelInfo.remove();

      const levelInfo = document.createElement('p');
      levelInfo.id = 'welcome-level-info';
      levelInfo.className = 'text-muted';
      levelInfo.style.cssText = 'font-size: 12px; margin-top: 8px; text-align: center;';
      levelInfo.innerHTML = `Уровень: занятие ${maxLesson} из 10 · <a href="#" id="change-level-link">Изменить</a>`;

      const cardArea = welcome.querySelector('.card-area.text-center');
      if (cardArea) cardArea.appendChild(levelInfo);

      welcome.querySelector('#change-level-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('bridge-onboarding');
        this.showOnboarding();
      });
    } else {
      this.content.innerHTML = `
        <div class="module-container text-center" style="padding: 48px 16px;">
          <div style="font-size: 48px; margin-bottom: 16px;">♠♥♦♣</div>
          <h2 style="margin-bottom: 8px;">Тренажёр бриджа</h2>
          <p class="text-muted">Выберите модуль в панели внизу</p>
        </div>
      `;
    }
  }

  showOnboarding() {
    // Render onboarding screen into content area
    const screen = document.createElement('div');
    screen.className = 'onboarding-screen module-container';
    screen.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">🃏</div>
      <h2 style="margin-bottom: 8px;">Добро пожаловать!</h2>
      <p class="text-muted" style="margin-bottom: 16px;">Как к вам можно обращаться?</p>
      <input type="text" id="onboarding-name" class="input-field" placeholder="Имя" maxlength="30"
        style="width: 200px; margin: 0 auto 24px; display: block; text-align: center; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-primary); font-size: 16px;">
      <p class="text-muted">Выбери свой уровень, чтобы мы показали нужные модули</p>
      <div class="onboarding-cards">
        <div class="onboarding-card" id="onboarding-beginner">
          <div class="onboarding-icon">🌱</div>
          <div class="onboarding-title">Начинаю курс</div>
          <div class="onboarding-desc">Прошёл 1-3 занятия</div>
        </div>
        <div class="onboarding-card" id="onboarding-inprogress">
          <div class="onboarding-icon">📚</div>
          <div class="onboarding-title">В процессе</div>
          <div class="onboarding-desc">Укажи последнее занятие</div>
          <div class="lesson-slider" id="lesson-slider-wrap" style="display: none;">
            <div class="lesson-slider-value" id="lesson-slider-val">5</div>
            <input type="range" id="lesson-slider" min="1" max="10" value="5">
            <button class="btn btn-primary btn-sm mt-sm" id="lesson-slider-confirm">Подтвердить</button>
          </div>
        </div>
        <div class="onboarding-card" id="onboarding-all">
          <div class="onboarding-icon">🔄</div>
          <div class="onboarding-title">Повторяю всё</div>
          <div class="onboarding-desc">Прошёл все занятия, хочу освежить</div>
        </div>
      </div>
    `;

    this.content.innerHTML = '';
    this.content.appendChild(screen);

    // Pre-fill name if already saved
    const savedName = ProgressTracker.getUserName();
    if (savedName) {
      screen.querySelector('#onboarding-name').value = savedName;
    }

    // Update module title
    this.moduleTitle.textContent = 'Тренажёр';

    // Mark welcome tab as active
    this.tabBar.querySelectorAll('.tab-item').forEach(t => {
      t.classList.toggle('active', t.dataset.module === 'welcome');
    });

    const finishOnboarding = (maxLesson) => {
      const nameInput = screen.querySelector('#onboarding-name');
      const name = nameInput?.value?.trim();
      if (name) ProgressTracker.setUserName(name);
      ProgressTracker.setMaxLesson(maxLesson);
      this.switchModule('welcome');
    };

    screen.querySelector('#onboarding-beginner').addEventListener('click', () => {
      finishOnboarding(3);
    });

    const inProgressCard = screen.querySelector('#onboarding-inprogress');
    const sliderWrap = screen.querySelector('#lesson-slider-wrap');
    const sliderEl = screen.querySelector('#lesson-slider');
    const sliderVal = screen.querySelector('#lesson-slider-val');

    inProgressCard.addEventListener('click', (e) => {
      // Only toggle slider if not clicking confirm button or range input
      if (e.target.id === 'lesson-slider-confirm' || e.target.id === 'lesson-slider') return;
      const isVisible = sliderWrap.style.display !== 'none';
      sliderWrap.style.display = isVisible ? 'none' : '';
    });

    sliderEl.addEventListener('input', () => {
      sliderVal.textContent = sliderEl.value;
    });

    screen.querySelector('#lesson-slider-confirm').addEventListener('click', (e) => {
      e.stopPropagation();
      finishOnboarding(parseInt(sliderEl.value, 10));
    });

    screen.querySelector('#onboarding-all').addEventListener('click', () => {
      finishOnboarding(10);
    });
  }

  async enableNotifications() {
    const permission = await NotificationManager.requestPermission();
    if (permission === 'granted') {
      NotificationManager.scheduleReminder();
      const notifyBtn = document.getElementById('notify-btn');
      if (notifyBtn) notifyBtn.classList.add('hidden');
    }
  }
}

// --- Shared UI helpers ---

/**
 * Render a hand as HTML (suit rows with card chips)
 */
export function renderHand(hand, options = {}) {
  const { clickable = false, onCardClick = null, selectedCards = [] } = options;
  const bySuit = hand.displayBySuit;
  const suitOrder = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];

  let html = '<div class="hand-display">';
  for (const suitId of suitOrder) {
    const suit = SUITS[suitId];
    const cards = bySuit[suitId] || [];
    const suitClass = suitId.toLowerCase();

    html += `<div class="suit-row">`;
    html += `<span class="suit-symbol ${suitClass}">${suit.symbol}</span>`;
    html += `<div class="suit-cards">`;

    if (cards.length === 0) {
      html += `<span class="suit-empty">—</span>`;
    } else {
      for (const card of cards) {
        const isSelected = selectedCards.some(c => c.equals(card));
        const face = card.isFaceCard ? ' face' : '';
        const click = clickable ? ' clickable' : '';
        const sel = isSelected ? ' selected' : '';
        const dataAttr = clickable ? ` data-suit="${card.suitId}" data-rank="${card.rankValue}"` : '';
        const tag = clickable ? 'button' : 'span';
        html += `<${tag} class="card-chip ${suitClass}${face}${click}${sel}"${dataAttr}>${card.displayShort}</${tag}>`;
      }
    }

    html += `</div></div>`;
  }
  html += '</div>';
  return html;
}

/**
 * Render stats bar
 */
export function renderStats(stats) {
  return `
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">${stats.total}</span>
        <span class="stat-label">Всего</span>
      </div>
      <div class="stat-item">
        <span class="stat-value" style="color: var(--success)">${stats.accuracy}%</span>
        <span class="stat-label">Точность</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${stats.streak}</span>
        <span class="stat-label">Серия</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${stats.bestStreak}</span>
        <span class="stat-label">Рекорд</span>
      </div>
    </div>
  `;
}

// Initialize app
const app = new App();

window.addEventListener('beforeunload', () => {
  ProgressTracker.flush();
});

// Restore module from URL hash on page load
const initialHash = window.location.hash.slice(1);
if (initialHash && MODULE_LOADERS[initialHash]) {
  app.switchModule(initialHash);
} else if (localStorage.getItem('bridge-onboarding')) {
  // Auto-launch daily mix if there are SM-2 due items (only if onboarding already done)
  const dueCount = ProgressTracker.getDueCount();
  if (dueCount > 0) {
    app.switchModule('mix');
  }
}
