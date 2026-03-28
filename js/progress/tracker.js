// Bridge Trainer — Progress Tracker (localStorage)

const STORAGE_KEY = 'bridge-trainer-progress';
const SM2_KEY = 'bridge-trainer-sm2';

let _cache = null;
let _sm2Cache = null;
let _saveTimer = null;
let _sm2SaveTimer = null;

function loadData() {
  if (_cache !== null) return _cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    _cache = raw ? JSON.parse(raw) : {};
  } catch { _cache = {}; }
  return _cache;
}

function saveData(data) {
  _cache = data;
  if (!_saveTimer) {
    _saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache));
      _saveTimer = null;
    }, 500);
  }
}

function loadSM2Data() {
  if (_sm2Cache !== null) return _sm2Cache;
  try {
    const raw = localStorage.getItem(SM2_KEY);
    _sm2Cache = raw ? JSON.parse(raw) : { items: [] };
  } catch { _sm2Cache = { items: [] }; }
  return _sm2Cache;
}

function saveSM2Data(data) {
  // Keep max 200 items
  if (data.items.length > 200) {
    data.items.sort((a, b) => a.nextReview - b.nextReview);
    data.items = data.items.slice(0, 200);
  }
  _sm2Cache = data;
  if (!_sm2SaveTimer) {
    _sm2SaveTimer = setTimeout(() => {
      localStorage.setItem(SM2_KEY, JSON.stringify(_sm2Cache));
      _sm2SaveTimer = null;
    }, 500);
  }
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
    const modules = ['hcp', 'opening', 'response', 'bidding', 'conventions', 'play', 'lead', 'quiz', 'tricks', 'defense'];
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
   * Flush pending writes to localStorage immediately
   */
  flush() {
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
    if (_cache !== null) localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache));
    if (_sm2SaveTimer) { clearTimeout(_sm2SaveTimer); _sm2SaveTimer = null; }
    if (_sm2Cache !== null) localStorage.setItem(SM2_KEY, JSON.stringify(_sm2Cache));
  },

  /**
   * Reset all progress
   */
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SM2_KEY);
    _cache = null;
    _sm2Cache = null;
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

  /**
   * Get global streak — consecutive days with at least 1 task solved.
   * Counts backwards from today.
   * @returns {number}
   */
  getGlobalStreak() {
    const data = loadData();
    const days = new Set();
    for (const mod of Object.values(data)) {
      for (const r of (mod.results || [])) {
        days.add(new Date(r.ts).toDateString());
      }
    }
    let streak = 0;
    const d = new Date();
    while (days.has(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  },

  /**
   * Get number of tasks solved today (across all modules).
   * @returns {number}
   */
  getTodayCount() {
    const data = loadData();
    const today = new Date().toDateString();
    let count = 0;
    for (const mod of Object.values(data)) {
      for (const r of (mod.results || [])) {
        if (new Date(r.ts).toDateString() === today) count++;
      }
    }
    return count;
  },
};
