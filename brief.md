# Бриф: Исправление проблем безопасности (аудит от 2026-03-28)

## Что делаем и зачем
По результатам аудита безопасности выявлено 5 проблем. Нужно исправить, не ломая функциональность.

---

## Таск 1: Вынести регистрацию Service Worker в отдельный файл

**Файлы:** `index.html` (строки 133-142), новый `js/sw-register.js`
**Что сделать:**
1. Создать `js/sw-register.js` с содержимым inline-скрипта
2. В index.html заменить inline `<script>` блок на `<script src="js/sw-register.js"></script>`
**Важно:** НЕ type="module" — обычный скрипт.

---

## Таск 2: Убрать inline onclick из index.html и app.js

**Файлы:** `index.html`, `js/app.js`

В `index.html` — убрать onclick атрибуты с 3 кнопок:
- Строка 40: `<button id="notify-btn" ...>` — убрать `onclick="bridgeApp.enableNotifications()"` (id уже есть)
- Строка 43: добавить `id="start-training-btn"`, убрать `onclick="window.bridgeApp.switchModule('hcp')"`
- Строка 50: добавить `id="daily-mix-btn"`, убрать `onclick="window.bridgeApp.switchModule('mix')"`

В `js/app.js` — добавить addEventListener в конструктор App (после `this.setupTabs()`):
```javascript
this.setupWelcomeButtons();
```

Добавить метод:
```javascript
setupWelcomeButtons() {
  document.getElementById('notify-btn')?.addEventListener('click', () => this.enableNotifications());
  document.getElementById('start-training-btn')?.addEventListener('click', () => this.switchModule('hcp'));
  document.getElementById('daily-mix-btn')?.addEventListener('click', () => this.switchModule('mix'));
}
```

Также в app.js строки 155 и 181 — кнопки "На главную" в innerHTML с onclick. Заменить:
- Убрать onclick, добавить класс `go-home-btn`
- После innerHTML добавить:
```javascript
this.content.querySelector('.go-home-btn')?.addEventListener('click', () => this.switchModule('welcome'));
```

---

## Таск 3: Экранировать err.message в innerHTML (XSS)

**Файл:** `js/app.js`, строка 180
**Проблема:** `${err.message}` в innerHTML — потенциальный XSS-вектор.
**Фикс:** В innerHTML поставить пустой элемент:
```html
<p class="text-muted mt-sm error-detail" style="font-size: 12px;"></p>
```
После innerHTML:
```javascript
const errEl = this.content.querySelector('.error-detail');
if (errEl) errEl.textContent = err.message;
```

---

## Таск 4: Добавить Content-Security-Policy в index.html

**Файл:** `index.html`
**Что сделать:** Добавить мета-тег CSP в `<head>` после `<meta name="description">`:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;">
```
**Важно:** `script-src 'self'` БЕЗ `'unsafe-inline'` — потому что inline-скрипты вынесены (Таск 1) и onclick убраны (Таск 2).

---

## Таск 5: Убрать window.bridgeApp

**Файл:** `js/app.js`, строка 310
**Что сделать:** Удалить `window.bridgeApp = app;` — после Таска 2 не нужна (обработчики через addEventListener).

---

## Ограничения
- Vanilla JS, ES modules, без фреймворков
- Не ломать PWA (service worker, offline, manifest)
- Не ломать lazy-loading модулей
- Минимальные изменения — только фиксы безопасности
