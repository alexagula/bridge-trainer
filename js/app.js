// Bridge Trainer — SPA Router and Module Lifecycle
import { SUITS, SUIT_ORDER } from './core/constants.js';
import { ProgressTracker } from './progress/tracker.js';
import { createProgressView } from './progress/progress-view.js';
import { NotificationManager } from './notifications.js';

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

  async switchModule(moduleId) {
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

    // Update title
    this.moduleTitle.textContent = MODULE_TITLES[moduleId] || '';
    currentModuleId = moduleId;

    // Welcome screen (static)
    if (moduleId === 'welcome') {
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
          <button class="btn btn-outline btn-sm mt-md" onclick="window.bridgeApp.switchModule('welcome')">На главную</button>
        </div>
      `;
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
    } catch (err) {
      console.error('Module load error:', err);
      this.content.innerHTML = `
        <div class="module-container text-center" style="padding: 48px 16px;">
          <div style="font-size: 32px; margin-bottom: 16px;">🚧</div>
          <p class="text-muted">Модуль в разработке</p>
          <p class="text-muted mt-sm" style="font-size: 12px;">${err.message}</p>
          <button class="btn btn-outline btn-sm mt-md" onclick="window.bridgeApp.switchModule('welcome')">На главную</button>
        </div>
      `;
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
        html += `<span class="card-chip ${suitClass}${face}${click}${sel}"${dataAttr}>${card.displayShort}</span>`;
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
window.bridgeApp = app;

// Auto-launch daily mix if there are SM-2 due items
const dueCount = ProgressTracker.getDueCount();
if (dueCount > 0) {
  app.switchModule('mix');
}
