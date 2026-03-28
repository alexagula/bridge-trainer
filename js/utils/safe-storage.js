// Safe localStorage wrappers with quota error handling

export function safeGetJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn(`Failed to read ${key}:`, err);
    return fallback;
  }
}

export function safeSetJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`Failed to write ${key}:`, err);
    if (err.name === 'QuotaExceededError') {
      window.dispatchEvent(new CustomEvent('storage-error', {
        detail: { type: 'quota', key }
      }));
    }
    return false;
  }
}
