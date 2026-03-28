// Bridge Trainer — Base Trainer class with shared methods
import { ProgressTracker } from '../progress/tracker.js';
import { renderStats } from '../app.js';

export class BaseTrainer {
  constructor(containerId, moduleId) {
    this.container = document.getElementById(containerId);
    this.moduleId = moduleId;
    this.answered = false;
    this.startTime = 0;
  }

  updateStats() {
    const stats = ProgressTracker.getStats(this.moduleId);
    const statsEl = this.container.querySelector('.stats-bar');
    if (statsEl) statsEl.outerHTML = renderStats(stats);
  }

  showNextBtn() {
    const btn = document.getElementById('next-btn');
    if (btn) { btn.classList.remove('hidden'); btn.focus(); }
  }

  hideNextBtn() {
    const btn = document.getElementById('next-btn');
    if (btn) btn.classList.add('hidden');
  }

  startTiming() { this.startTime = Date.now(); }
  getTimeTaken() { return Date.now() - this.startTime; }

  recordResult(correct, timeTaken) {
    ProgressTracker.record(this.moduleId, { correct, time: timeTaken });
  }

  destroy() {}
}
