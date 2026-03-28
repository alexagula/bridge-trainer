// Bridge Trainer — Push Notification Manager (PWA local notifications)
import { ProgressTracker } from './progress/tracker.js';

export class NotificationManager {
  static _reminderInterval = null;

  static isSupported() {
    return 'Notification' in window;
  }

  static async requestPermission() {
    if (!this.isSupported()) return 'denied';
    if (Notification.permission !== 'default') return Notification.permission;
    return await Notification.requestPermission();
  }

  static scheduleReminder() {
    if (!this.isSupported() || Notification.permission !== 'granted') return;
    if (this._reminderInterval) clearInterval(this._reminderInterval);

    // Check every hour — fire only when tab is hidden and there are due items
    this._reminderInterval = setInterval(() => {
      if (document.hidden) {
        const dueCount = ProgressTracker.getDueCount();
        if (dueCount > 0) {
          new Notification('🃏 Бридж-тренажёр', {
            body: `${dueCount} правил ждут повторения`,
            icon: './icons/icon-192.png',
            tag: 'bridge-reminder' // prevents duplicate notifications
          });
        }
      }
    }, 60 * 60 * 1000);
  }

  static stopReminder() {
    if (this._reminderInterval) {
      clearInterval(this._reminderInterval);
      this._reminderInterval = null;
    }
  }
}
