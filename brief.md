# Бриф: Онбординг — адаптация под уровень пользователя

## Что делаем и зачем
Пользователи приходят с разным уровнем: кто-то прошёл 2 занятия, кто-то все 10, кто-то забыл и хочет обновить. Сейчас все 12 модулей доступны сразу — перегрузка для новичка, неудобно для середнячка. Добавляем один экран выбора при первом входе, который адаптирует приложение.

---

## Таск 1: Экран онбординга

### Когда показывать
- При первом входе (нет `bridge-onboarding` в localStorage)
- По нажатию кнопки «Сменить уровень» (из прогресса или welcome)

### Что показывать
Экран с 3 карточками — рендерится динамически в `js/app.js` (НЕ в index.html):

**Карточка 1: «Начинаю курс» (занятия 1-3)**
- Иконка: 🌱
- Подпись: «Прошёл 1-3 занятия»
- Результат: `maxLesson = 3`

**Карточка 2: «В процессе» (выбрать номер занятия)**
- Иконка: 📚
- Подпись: «Укажи последнее занятие»
- При клике показать слайдер 1-10 с подтверждением
- Результат: `maxLesson = N` (выбранное число)

**Карточка 3: «Повторяю всё»**
- Иконка: 🔄
- Подпись: «Прошёл все занятия, хочу освежить»
- Результат: `maxLesson = 10`

### Хранение
```javascript
localStorage.setItem('bridge-onboarding', JSON.stringify({ maxLesson: N }));
```

Хелперы в `js/progress/tracker.js`:
```javascript
getMaxLesson() {
  try {
    const data = JSON.parse(localStorage.getItem('bridge-onboarding'));
    return data?.maxLesson || 10;
  } catch { return 10; }
},
setMaxLesson(n) {
  localStorage.setItem('bridge-onboarding', JSON.stringify({ maxLesson: n }));
}
```

### Логика в app.js
В конструкторе App — проверить наличие `bridge-onboarding` в localStorage:
- Если нет → показать экран онбординга вместо welcome
- Если есть → обычная логика (welcome или auto-launch mix)

Метод `showOnboarding()` рендерит экран. После выбора — сохранить в localStorage, показать welcome.

---

## Таск 2: Фильтрация модулей по уровню

### Маппинг занятие → модули

```javascript
const LESSON_MODULES = {
  1:  ['hcp'],
  2:  ['hcp'],
  3:  ['opening', 'response', 'conventions'],
  4:  ['response'],
  5:  ['play', 'tricks', 'bidding'],
  6:  ['play', 'tricks'],
  7:  ['conventions', 'bidding'],
  8:  ['opening', 'response', 'conventions'],
  9:  ['opening', 'response', 'bidding'],
  10: ['lead', 'defense'],
};
```

Функция `getUnlockedModules(maxLesson)`:
```javascript
function getUnlockedModules(maxLesson) {
  const modules = new Set(['quiz', 'theory']); // всегда доступны
  for (let i = 1; i <= maxLesson; i++) {
    for (const m of (LESSON_MODULES[i] || [])) modules.add(m);
  }
  return modules;
}
```

Определить этот маппинг в `js/core/constants.js` или прямо в `app.js`.

### Где фильтровать

**1. Popup модулей (index.html #modules-popup)**
В `_toggleModulesPopup()` — скрыть `.popup-item` для модулей, не входящих в `getUnlockedModules()`. Не удалять из DOM — скрывать через `display: none`.

Каждый `.popup-item` уже имеет `data-module`. Фильтрация:
```javascript
const unlocked = getUnlockedModules(ProgressTracker.getMaxLesson());
popup.querySelectorAll('.popup-item').forEach(item => {
  const isUnlocked = unlocked.has(item.dataset.module);
  item.style.display = isUnlocked ? '' : 'none';
});
```

**2. Список модулей на welcome-экране**
В `showWelcome()` — скрыть строки модулей, которые не разблокированы.
Для этого нужно добавить `data-module` атрибуты на строки модулей в index.html:

```html
<div class="flex flex-between module-row" data-module="hcp" style="...">
```

Затем в `showWelcome()`:
```javascript
const unlocked = getUnlockedModules(ProgressTracker.getMaxLesson());
welcome.querySelectorAll('.module-row').forEach(row => {
  row.style.display = unlocked.has(row.dataset.module) ? '' : 'none';
});
```

**3. Daily Mix — фильтр типов задач**
В `js/trainers/daily-mix.js`, метод `_generateFillTasks()` строка 136:

Заменить хардкод на:
```javascript
import { ProgressTracker } from '../progress/tracker.js';
// ... в _generateFillTasks:
const allModuleTypes = ['opening', 'response', 'hcp', 'quiz', 'lead', 'tricks', 'defense'];
const maxLesson = ProgressTracker.getMaxLesson();
const unlocked = getUnlockedModules(maxLesson);
const moduleTypes = allModuleTypes.filter(m => unlocked.has(m));
```

Нужно экспортировать `getUnlockedModules` из того файла, где определён маппинг, и импортировать в daily-mix.js.

**4. Кнопка «Начать тренировку»**
В `setupWelcomeButtons()`: вместо всегда переключать на 'hcp', переключать на первый доступный тренировочный модуль:
```javascript
document.getElementById('start-training-btn')?.addEventListener('click', () => {
  const unlocked = getUnlockedModules(ProgressTracker.getMaxLesson());
  const first = ['hcp', 'opening', 'response'][Symbol.iterator]();
  for (const m of first) { if (unlocked.has(m)) { this.switchModule(m); return; } }
  this.switchModule('hcp');
});
```

---

## Таск 3: Кнопка «Сменить уровень»

### В progress-view.js
Добавить кнопку над «Сбросить прогресс»:
```html
<button class="btn btn-outline btn-block btn-sm mt-lg" id="change-level-btn">
  Сменить уровень (сейчас: занятие N)
</button>
```

Обработчик:
```javascript
document.getElementById('change-level-btn')?.addEventListener('click', () => {
  localStorage.removeItem('bridge-onboarding');
  document.querySelector('.tab-item[data-module="welcome"]')?.click();
});
```

При удалении `bridge-onboarding` — app.js покажет экран онбординга.

### На welcome-экране
Показать текущий уровень маленьким текстом + ссылку «Изменить»:
```html
<p class="text-muted" style="font-size: 12px; margin-top: 8px;">
  Уровень: занятие N из 10 · <a href="#" id="change-level-link">Изменить</a>
</p>
```

### Также: progress-view.js — inline onclick fix
В текущем коде (строка 61-65) кнопка «Сбросить прогресс» использует inline onclick с `window.bridgeApp`. Это нарушение CSP. Заменить на addEventListener + навигация через tab-bar click (как в daily-mix).

---

## CSS для онбординга

Добавить в `css/modules.css`:

```css
/* Onboarding */
.onboarding-screen {
  padding: 32px 16px;
  text-align: center;
}
.onboarding-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}
.onboarding-card {
  background: var(--bg-secondary);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 20px 16px;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.1s;
}
.onboarding-card:active {
  transform: scale(0.98);
}
.onboarding-card.selected,
.onboarding-card:hover {
  border-color: var(--accent);
}
.onboarding-icon {
  font-size: 36px;
  margin-bottom: 8px;
}
.onboarding-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}
.onboarding-desc {
  font-size: 14px;
  color: var(--text-secondary);
}
.lesson-slider {
  margin: 16px 0;
}
.lesson-slider input[type="range"] {
  width: 100%;
  accent-color: var(--accent);
}
.lesson-slider-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
}
```

---

## Ограничения
- Vanilla JS, ES modules, без фреймворков
- Не ломать PWA, CSP, lazy-loading
- Никаких inline onclick
- Минимальный набор файлов: app.js, daily-mix.js, progress-view.js, index.html, modules.css, tracker.js (или constants.js для маппинга)
- Экран онбординга рендерится из JS — не захардкожен в index.html
