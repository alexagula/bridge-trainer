# Brief: Error Handling & Resilience — Bridge Trainer

## Что делаем и зачем

Повышаем отказоустойчивость PWA-тренажёра спортивного бриджа. Аудит выявил: нет глобального error handler, 6 незащищённых localStorage.setItem(), 5 пустых catch-блоков, незащищённые timer callbacks, отсутствие online/offline индикатора.

**Цель:** приложение не должно молча ломаться. Пользователь всегда получает обратную связь.

## Стек

- Vanilla HTML + CSS + JS (ES modules), PWA
- Нет бэкенда, нет npm, нет фреймворков
- Данные в localStorage
- Деплой: GitHub Pages (статика)
- Русская локализация UI

## Таски

### Таск 1: Глобальный error handler + safe storage utility + toast

**Файлы:** создать `js/utils/safe-storage.js`, изменить `js/app.js`, `css/main.css`

1. В `js/app.js` (в начале init или как отдельный early-загружаемый код) добавить:
   - `window.addEventListener('error', ...)` — логировать + показать toast
   - `window.addEventListener('unhandledrejection', ...)` — логировать + показать toast
   - Функцию `showErrorToast(message, duration = 5000)` — показывает временное уведомление внизу экрана. Стиль: тёмный фон, красная левая граница, текст белый. Экспортировать для использования в других модулях.
   - Online/offline listeners:
     - `window.addEventListener('offline', ...)` → показать toast "Офлайн-режим"
     - `window.addEventListener('online', ...)` → показать toast "Подключение восстановлено" (зелёная левая граница)
   - Слушатель `window.addEventListener('storage-error', ...)` → показать toast "Хранилище заполнено. Очистите прогресс в разделе «Прогресс»"

2. CSS для toast в `css/main.css`:
   ```css
   .error-toast {
     position: fixed;
     bottom: 80px;
     left: 50%;
     transform: translateX(-50%);
     background: #1a1a2e;
     color: #fff;
     padding: 12px 20px;
     border-radius: 8px;
     border-left: 4px solid var(--error, #ff5252);
     font-size: 14px;
     z-index: 10000;
     opacity: 0;
     transition: opacity 0.3s;
     max-width: 90vw;
     pointer-events: none;
   }
   .error-toast.visible { opacity: 1; }
   .error-toast.success { border-left-color: var(--success, #4caf50); }
   ```

3. Создать `js/utils/safe-storage.js`:
   ```js
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
   ```

### Таск 2: Защита tracker.js

**Файл:** `js/progress/tracker.js`

1. Импортировать `safeGetJSON`, `safeSetJSON` из `../utils/safe-storage.js`
2. Заменить все `localStorage.setItem(key, JSON.stringify(...))` на `safeSetJSON(key, data)` — строки 33, 57, 152, 154, 306, 330
3. Заменить все ручные try { JSON.parse(localStorage.getItem(key)) } catch блоки на `safeGetJSON(key, fallback)` — строки 22-25, 41-44, 295-298, 314-317, 326-329
4. Убрать пустые catch-блоки — safeGetJSON уже обрабатывает ошибки внутри
5. НЕ менять публичный API модуля — только внутреннюю реализацию

### Таск 3: Защита timer callbacks + DOM null-checks

**Файлы:** `js/trainers/bidding-sim.js`, `js/trainers/hcp-trainer.js`, `js/notifications.js`, `js/trainers/lead-trainer.js`, `js/reference/theory.js`, `js/progress/progress-view.js`

1. **bidding-sim.js** (~строка 82) — обернуть callback setTimeout в try/catch. При ошибке: console.error + показать пользователю что произошла ошибка (текст в bidding area)

2. **hcp-trainer.js** (~строка 387) — обернуть setInterval callback в try/catch. При ошибке: clearInterval + console.error

3. **notifications.js** (~строка 22-33) — обернуть setInterval callback в try/catch. При ошибке: console.warn (не критично)

4. **DOM null-checks** — добавить проверки:
   - `hcp-trainer.js` constructor: `if (!this.container) return;`
   - `hcp-trainer.js` newProblem: null-check перед getElementById('hand-area'), getElementById('feedback-area')
   - `lead-trainer.js` newProblem: null-check перед getElementById('context-area'), getElementById('hand-area'), getElementById('lead-hand')
   - `theory.js` constructor: `if (!this.el) return;`
   - `theory.js` init: null-check перед getElementById('theory-search'), getElementById('lesson-filter')
   - `progress-view.js` constructor: null-check на контейнер

### Таск 4: Service Worker hardening

**Файл:** `service-worker.js`

1. Activate event — добавить `.catch()` на `caches.delete()`:
   ```js
   keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k).catch(() => {}))
   ```

2. Fetch event — добавить логирование в offline .catch():
   ```js
   .catch(() => {
     console.warn('Offline fallback for:', event.request.url);
     return caches.match('./index.html');
   })
   ```

3. Fetch event — обернуть cache.put в catch:
   ```js
   caches.open(CACHE_NAME).then(cache =>
     cache.put(event.request, clone).catch(() => {})
   );
   ```

### Таск 5: UX — безопасные сообщения + export hardening

**Файлы:** `js/app.js`, `js/progress/progress-view.js`

1. **app.js** (~строка 273) — заменить `err.message` на безопасный текст:
   ```js
   // Было: errEl.textContent = err.message;
   errEl.textContent = 'Попробуйте обновить страницу';
   ```

2. **progress-view.js** (~строка 93) — обернуть JSON.stringify в try/catch
3. **progress-view.js** (~строка 100-102) — обернуть export DOM операции в try/catch

## Ограничения

- **Не менять публичный API модулей** — только внутреннюю реализацию
- **Русский язык** для всех сообщений пользователю
- **Нет npm / нет зависимостей** — только vanilla JS
- **ES modules** — все импорты через `import/export`
- **Не добавлять комментарии** к коду который не менялся
- **Минимализм** — не добавлять лишнего, только то что в таске
- **Не ломать существующую функциональность**
