# Бриф: 8 исправлений по результатам анализа системного кода

## Источник
Экспертный анализ (analysis-results.md, 2026-03-28): 2 critical, 4 high, 2 medium бага после внедрения 8 улучшений.

---

## Таск 1: Добавить tricks, defense в getAllStats()

**Файл:** `js/progress/tracker.js`, строка ~117
**Баг:** getAllStats() содержит хардкодный массив из 8 модулей. Новые модули `tricks` и `defense` не включены → Daily Mix не видит их статистику, не включает в "слабые модули".
**Фикс:** Добавить 'tricks' и 'defense' в массив modules:
```javascript
const modules = ['hcp', 'opening', 'response', 'bidding', 'conventions', 'play', 'lead', 'quiz', 'tricks', 'defense'];
```

---

## Таск 2: Хранить intervalId в notifications.js, добавить stopReminder()

**Файл:** `js/notifications.js`
**Баг:** setInterval в scheduleReminder() не хранит ID → таймер нельзя остановить, зомби-процесс в фоне PWA.
**Фикс:**
```javascript
export class NotificationManager {
  static _reminderInterval = null;

  // ... isSupported() и requestPermission() без изменений

  static scheduleReminder() {
    if (!this.isSupported() || Notification.permission !== 'granted') return;
    if (this._reminderInterval) clearInterval(this._reminderInterval);
    this._reminderInterval = setInterval(() => {
      // ... существующая логика
    }, 60 * 60 * 1000);
  }

  static stopReminder() {
    if (this._reminderInterval) {
      clearInterval(this._reminderInterval);
      this._reminderInterval = null;
    }
  }
}
```

---

## Таск 3: Null guards на DOM-запросы в trick-trainer.js

**Файл:** `js/trainers/trick-trainer.js`
**Баги (4 места):**

1. **checkAnswer() ~строка 314:** `input.value.trim()` без проверки input на null
   ```javascript
   const input = this.container.querySelector('#answer-input');
   if (!input) return;
   ```

2. **updateStats ~строка 361:** `querySelector('.stats-bar').outerHTML` без guard
   ```javascript
   const statsBar = this.container.querySelector('.stats-bar');
   if (statsBar) statsBar.outerHTML = statsHtml;
   ```

3. **setTimeout в newProblem() ~строка 246:** не хранит ID
   ```javascript
   this._focusTimer = setTimeout(() => input.focus(), 100);
   ```

4. **setTimeout в checkAnswer ~строка 367:** не хранит ID
   ```javascript
   this._scrollTimer = setTimeout(() => {
     feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
   }, 100);
   ```

5. **destroy():** Добавить cleanup:
   ```javascript
   destroy() {
     if (this._focusTimer) clearTimeout(this._focusTimer);
     if (this._scrollTimer) clearTimeout(this._scrollTimer);
   }
   ```

---

## Таск 4: Null guards + cleanup в defense-trainer.js

**Файл:** `js/trainers/defense-trainer.js`
**Баги:**

1. **render() ~строка 63:** getElementById без null-check
   ```javascript
   const nextBtn = this.container.querySelector('#defense-next-btn');
   if (nextBtn) nextBtn.addEventListener(...);
   ```

2. **checkAnswer ~строка 180:** querySelector('.stats-bar').outerHTML без guard
   ```javascript
   const statsBar = this.container.querySelector('.stats-bar');
   if (statsBar) statsBar.outerHTML = statsHtml;
   ```

3. **Все scenario-данные через innerHTML:** Добавить escapeHtml для title и description:
   ```javascript
   function escapeHtml(str) {
     return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
   }
   ```
   Применить: `${escapeHtml(s.title)}`, `${escapeHtml(s.description)}`

---

## Таск 5: Добавить tricks/defense в _sm2ItemToTask() daily-mix.js

**Файл:** `js/trainers/daily-mix.js`, метод _sm2ItemToTask()
**Баг:** При неизвестном модуле (включая tricks, defense) fallback → opening-задача. Бессмысленно.
**Фикс:** Добавить явные ветки + warning:
```javascript
} else if (moduleType === 'lead') {
  task = this._generateLeadTask();
} else if (moduleType === 'quiz') {
  task = this._generateQuizTask();
} else if (moduleType === 'hcp') {
  task = this._generateHcpTask();
} else {
  // Неизвестный модуль — пропустить SM-2 задачу, сгенерировать opening как fallback
  console.warn(`SM-2: unknown module type "${moduleType}", falling back to opening`);
  task = this._generateOpeningTask();
}
```
Также проверить: есть ли уже ветки для lead, quiz, hcp. Если нет — добавить.

---

## Таск 6: Проверить navigator.standalone перед показом notify-btn

**Файл:** `js/app.js`, showWelcome()
**Баг:** На iOS в Safari (не Home Screen) Notification API есть в window, но реально не работает. Кнопка покажется, но нажатие ничего не даст.
**Фикс:** Добавить проверку:
```javascript
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
```

---

## Ограничения
- Не ломать существующую функциональность
- Минимальные изменения — только фиксы, не рефакторинг
- Обратная совместимость
