// Bridge Trainer — Progress Tracker (localStorage)

const STORAGE_KEY = 'bridge-trainer-progress';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const ProgressTracker = {
  /**
   * Record a result for a module
   */
  record(moduleId, result) {
    const data = loadData();
    if (!data[moduleId]) {
      data[moduleId] = { results: [], streak: 0, bestStreak: 0 };
    }
    const mod = data[moduleId];
    mod.results.push({
      correct: result.correct,
      time: result.time || 0,
      ts: Date.now(),
    });

    // Keep last 500 results per module
    if (mod.results.length > 500) {
      mod.results = mod.results.slice(-500);
    }

    // Streak
    if (result.correct) {
      mod.streak = (mod.streak || 0) + 1;
      if (mod.streak > (mod.bestStreak || 0)) {
        mod.bestStreak = mod.streak;
      }
    } else {
      mod.streak = 0;
    }

    saveData(data);
  },

  /**
   * Get stats for a module
   */
  getStats(moduleId) {
    const data = loadData();
    const mod = data[moduleId];
    if (!mod || !mod.results || mod.results.length === 0) {
      return { total: 0, correct: 0, accuracy: 0, streak: 0, bestStreak: 0, avgTime: 0 };
    }

    const total = mod.results.length;
    const correct = mod.results.filter(r => r.correct).length;
    const accuracy = Math.round((correct / total) * 100);
    const times = mod.results.filter(r => r.time > 0).map(r => r.time);
    const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

    return {
      total,
      correct,
      accuracy,
      streak: mod.streak || 0,
      bestStreak: mod.bestStreak || 0,
      avgTime,
    };
  },

  /**
   * Get stats for all modules
   */
  getAllStats() {
    const modules = ['hcp', 'opening', 'response', 'bidding', 'conventions', 'play', 'lead', 'quiz'];
    const result = {};
    for (const m of modules) {
      result[m] = this.getStats(m);
    }
    return result;
  },

  /**
   * Get recent results (last N)
   */
  getRecent(moduleId, count = 20) {
    const data = loadData();
    const mod = data[moduleId];
    if (!mod || !mod.results) return [];
    return mod.results.slice(-count);
  },

  /**
   * Reset all progress
   */
  reset() {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Reset a single module
   */
  resetModule(moduleId) {
    const data = loadData();
    delete data[moduleId];
    saveData(data);
  },
};
