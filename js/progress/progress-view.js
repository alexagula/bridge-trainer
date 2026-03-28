// Bridge Trainer — Progress View (extracted from app.js)
import { ONBOARDING_KEY } from './tracker.js';

/**
 * Progress view factory
 * @param {object} tracker - ProgressTracker class
 * @returns {{ init: Function, destroy: Function }}
 */
export function createProgressView(tracker) {
  return {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      const allStats = tracker.getAllStats();
      const moduleNames = {
        hcp: '🔢 Подсчёт HCP',
        opening: '🃏 Открытие',
        response: '💬 Ответ',
        bidding: '📢 Торговля',
        conventions: '📋 Конвенции',
        play: '🎯 Розыгрыш',
        lead: '➡️ Первый ход',
        quiz: '✅ Тесты',
      };

      let totalAll = 0, correctAll = 0;
      for (const s of Object.values(allStats)) {
        totalAll += s.total;
        correctAll += s.correct;
      }
      const overallAccuracy = totalAll > 0 ? Math.round((correctAll / totalAll) * 100) : 0;

      let html = `
        <div class="card-area text-center">
          <div style="font-size: 48px; font-weight: 700; color: var(--accent);">${overallAccuracy}%</div>
          <p class="text-muted">Общая точность (${totalAll} задач)</p>
        </div>
      `;

      for (const [id, name] of Object.entries(moduleNames)) {
        const s = allStats[id];
        const bar = s.total > 0 ? `${s.accuracy}% (${s.correct}/${s.total})` : 'Ещё не начато';
        const color = s.accuracy >= 80 ? 'var(--success)' : s.accuracy >= 50 ? 'var(--warning)' : 'var(--text-muted)';
        html += `
          <div class="card-area" style="padding: 12px 16px;">
            <div class="flex flex-between" style="align-items: center;">
              <span style="font-weight: 600;">${name}</span>
              <span style="color: ${color}; font-weight: 700;">${bar}</span>
            </div>
            ${s.total > 0 ? `
              <div style="margin-top: 8px; height: 6px; background: var(--bg-primary); border-radius: 3px; overflow: hidden;">
                <div style="width: ${s.accuracy}%; height: 100%; background: ${color}; border-radius: 3px;"></div>
              </div>
              <div class="text-muted" style="font-size: 11px; margin-top: 4px;">
                Серия: ${s.streak} | Рекорд: ${s.bestStreak}${s.avgTime ? ` | Среднее: ${(s.avgTime / 1000).toFixed(1)}с` : ''}
              </div>
            ` : ''}
          </div>
        `;
      }

      const maxLesson = tracker.getMaxLesson ? tracker.getMaxLesson() : 10;
      html += `
        <button class="btn btn-primary btn-block btn-sm mt-lg" id="export-data-btn">
          📊 Экспорт данных
        </button>
        <button class="btn btn-outline btn-block btn-sm mt-md" id="change-level-btn">
          Сменить уровень (сейчас: занятие ${maxLesson})
        </button>
        <button class="btn btn-outline btn-block btn-sm mt-sm" id="reset-progress-btn">Сбросить прогресс</button>
      `;

      el.innerHTML = html;

      // Safely append user name to export button (no innerHTML injection)
      const exportBtn = document.getElementById('export-data-btn');
      const userName = tracker.getUserName ? tracker.getUserName() : null;
      if (exportBtn && userName) {
        exportBtn.append(` (${userName})`);
      }

      document.getElementById('reset-progress-btn')?.addEventListener('click', () => {
        if (confirm('Сбросить весь прогресс?')) {
          tracker.reset();
          document.querySelector('.tab-item[data-module="welcome"]')?.click();
          setTimeout(() => {
            document.querySelector('.tab-item[data-module="progress"]')?.click();
          }, 100);
        }
      });

      document.getElementById('export-data-btn')?.addEventListener('click', () => {
        const data = tracker.exportAll();
        let json;
        try {
          json = JSON.stringify(data, null, 2);
        } catch (err) {
          console.error('Export serialization error:', err);
          return;
        }
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const name = (data.userName || 'user').replace(/\s+/g, '_');
        a.href = url;
        a.download = `bridge-analytics-${name}-${new Date().toISOString().slice(0, 10)}.json`;
        try {
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (err) {
          console.error('Export DOM error:', err);
        }
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      });

      document.getElementById('change-level-btn')?.addEventListener('click', () => {
        localStorage.removeItem(ONBOARDING_KEY);
        document.querySelector('.tab-item[data-module="welcome"]')?.click();
      });
    },
    destroy() {},
  };
}
