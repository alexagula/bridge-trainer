// Bridge Trainer — Theory Reference (Module 9)
import { THEORY_ENTRIES } from '../../data/theory-entries.js';
import { LESSONS } from '../core/constants.js';

export default {
  init(containerId) {
    const el = document.getElementById(containerId);
    this.el = el;
    if (!this.el) return;
    this.entries = THEORY_ENTRIES;
    this.filter = '';
    this.lessonFilter = 0;
    this.render();
  },

  destroy() {},

  render() {
    let filtered = this.entries;

    if (this.lessonFilter > 0) {
      filtered = filtered.filter(e => e.lesson === this.lessonFilter);
    }

    if (this.filter) {
      const q = this.filter.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some(t => t.includes(q))
      );
    }

    const lessons = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    this.el.innerHTML = `
      <input type="search" class="theory-search" id="theory-search"
             placeholder="Поиск: HCP, импас, стейман..." value="${this.filter}"
             aria-label="Поиск по теории">

      <div class="filter-bar" id="lesson-filter">
        ${lessons.map(l =>
          `<div class="filter-chip ${l === this.lessonFilter ? 'active' : ''}" data-lesson="${l}">${l === 0 ? 'Все' : l}</div>`
        ).join('')}
      </div>

      <div id="theory-list">
        ${filtered.length === 0 ? '<p class="text-muted text-center">Ничего не найдено</p>' : ''}
        ${filtered.map(e => `
          <div class="theory-entry">
            <h3>${e.title}</h3>
            <p>${e.content}</p>
            <div>
              ${e.lesson > 0 ? `<span class="tag">Занятие ${e.lesson}</span>` : '<span class="tag">Общее</span>'}
              ${e.tags.map(t => `<span class="tag">${t}</span>`).join(' ')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Search
    const searchEl = document.getElementById('theory-search');
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        this.filter = e.target.value;
        this.render();
      });
    }

    // Lesson filter
    const lessonFilter = document.getElementById('lesson-filter');
    if (lessonFilter) {
      lessonFilter.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        this.lessonFilter = parseInt(chip.dataset.lesson);
        this.render();
      });
    }
  },
};
