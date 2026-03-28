// Bridge Trainer — Base Trainer class with shared methods
import { ProgressTracker } from '../progress/tracker.js';
import { renderStats } from '../ui/render.js';

export class BaseTrainer {
  constructor(containerId, moduleId) {
    this.container = document.getElementById(containerId);
    this.moduleId = moduleId;
    this.answered = false;
    this.startTime = 0;
  }

  init() {
    this.render();
    this.newProblem();
  }

  destroy() {
    // Subclasses can override to clean up timers etc.
  }

  startTimer() {
    this.startTime = Date.now();
  }

  getTimeTaken() {
    return Date.now() - this.startTime;
  }

  updateStats() {
    const stats = ProgressTracker.getStats(this.moduleId);
    const statsBar = this.container.querySelector('.stats-bar');
    if (statsBar) statsBar.outerHTML = renderStats(stats);
  }

  showNextBtn() {
    const btn = this.container.querySelector('.next-btn, #next-btn, [id$="-next-btn"]');
    if (btn) { btn.classList.remove('hidden'); btn.focus(); }
  }

  hideNextBtn() {
    const btn = this.container.querySelector('.next-btn, #next-btn, [id$="-next-btn"]');
    if (btn) btn.classList.add('hidden');
  }

  recordResult(correct, timeTaken) {
    ProgressTracker.record(this.moduleId, { correct, time: timeTaken });
  }

  // render() and newProblem() are abstract — implemented in subclasses
}
