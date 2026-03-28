// Bridge Trainer — Progress Tracker (localStorage)

const STORAGE_KEY = 'bridge-trainer-progress';
const SM2_KEY = 'bridge-trainer-sm2';

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

function loadSM2Data() {
  try {
    const raw = localStorage.getItem(SM2_KEY);
    return raw ? JSON.parse(raw) : { items: [] };
  } catch {
    return { items: [] };
  }
}

function saveSM2Data(data) {
  // Keep max 200 items
  if (data.items.length > 200) {
    data.items.sort((a, b) => a.nextReview - b.nextReview);
    data.items = data.items.slice(0, 200);
  }
  localStorage.setItem(SM2_KEY, JSON.stringify(data));
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
    localStorage.removeItem(SM2_KEY);
  },

  /**
   * Reset a single module
   */
  resetModule(moduleId) {
    const data = loadData();
    delete data[moduleId];
    saveData(data);
  },

  /**
   * Record an error — add/update item in SM-2 queue
   * @param {string} module - 'opening', 'response', etc.
   * @param {string} situationId - unique situation id, e.g. "opening:12hcp-5spades"
   * @param {string} description - description for UI, e.g. "12 HCP, 5♠ — открытие?"
   */
  recordError(module, situationId, description) {
    const sm2 = loadSM2Data();
    let item = sm2.items.find(i => i.id === situationId);

    if (!item) {
      item = { id: situationId, module, description, easeFactor: 2.5, repetitions: 0 };
      sm2.items.push(item);
    }

    // Reset on error
    item.interval = 1;
    item.repetitions = 0;
    item.lastReview = Date.now();
    item.nextReview = Date.now() + 1 * 86400000; // tomorrow

    saveSM2Data(sm2);
  },

  /**
   * Record a correct answer — increase interval
   * @param {string} situationId - unique situation id
   */
  recordSuccess(situationId) {
    const sm2 = loadSM2Data();
    const item = sm2.items.find(i => i.id === situationId);
    if (!item) return;

    item.repetitions++;
    if (item.repetitions === 1) item.interval = 1;
    else if (item.repetitions === 2) item.interval = 3;
    else if (item.repetitions === 3) item.interval = 7;
    else item.interval = Math.round(item.interval * item.easeFactor);

    // Update ease factor (SM-2 formula, quality=4 for correct)
    const quality = 4;
    item.easeFactor = Math.max(1.3, item.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    item.lastReview = Date.now();
    item.nextReview = Date.now() + item.interval * 86400000;

    // Remove if interval > 30 days (well learned)
    if (item.interval > 30) {
      sm2.items = sm2.items.filter(i => i.id !== situationId);
    }

    saveSM2Data(sm2);
  },

  /**
   * Get items that are due for review
   * @returns {Array} items where nextReview <= now
   */
  getDueItems() {
    const sm2 = loadSM2Data();
    const now = Date.now();
    return sm2.items.filter(i => i.nextReview <= now);
  },

  /**
   * Get count of items due for review
   * @returns {number}
   */
  getDueCount() {
    return this.getDueItems().length;
  },
};
