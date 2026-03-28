# Бриф: Улучшение Daily Mix — баги, session framing, error retry

## Что делаем и зачем
По результатам экспертного анализа (2026-03-28) выявлены 3 приоритетных улучшения для Daily Mix — основного режима тренировки. Цель: сделать тренировку стабильной, мотивирующей и эффективной для обучения.

---

## Таск 1: Баг-фиксы Daily Mix

### 1a. Добавить tricks/defense в moduleTypes

**Файл:** `js/trainers/daily-mix.js`, строка 126
**Проблема:** `moduleTypes = ['opening', 'response', 'hcp', 'quiz', 'lead']` — не включает модули `tricks` и `defense`. Daily Mix никогда не генерирует задачи из этих модулей.
**Фикс:** Добавить `'tricks'` и `'defense'` в массив `moduleTypes`.

Также добавить обработку в `_generateTaskOfType()` (строка 167):
```javascript
case 'tricks':   return this._generateTricksTask();
case 'defense':  return this._generateDefenseTask();
```

Новые методы:
```javascript
_generateTricksTask() {
  const deal = Deal.random();
  const hand = deal.getHand('S');
  return { type: 'tricks', deal, hand, sm2Id: null };
}

_generateDefenseTask() {
  const scenarios = getDefenseScenariosByCategory('all');
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  return { type: 'defense', scenario, sm2Id: null };
}
```

Для tricks задачи — нужно импортировать countTopTricksForHand из trick-trainer.js (или вынести в core).
Для defense задачи — нужно импортировать getDefenseScenariosByCategory из play/defense-scenarios.js.

Также добавить рендер и проверку ответов для этих типов (showTask, _renderTricksTask, _renderDefenseTask, _checkTricksAnswer, _checkDefenseAnswer). Следовать паттерну существующих задач.

Также добавить в `_attachTaskHandlers`, `typeLabels` (строка 348), и `moduleNames` (строка 794).

### 1b. Добавить tricks/defense в SM-2 fallback

**Файл:** `js/trainers/daily-mix.js`, строка 86-117
**Проблема:** `_sm2ItemToTask()` не обрабатывает moduleType `tricks` и `defense` — fallback на opening.
**Фикс:** Добавить:
```javascript
} else if (moduleType === 'tricks') {
  task = this._generateTricksTask();
} else if (moduleType === 'defense') {
  task = this._generateDefenseTask();
}
```

### 1c. Убрать inline onclick на результатах

**Файл:** `js/trainers/daily-mix.js`, строка 828
**Проблема:** `onclick="window.bridgeApp.switchModule('welcome')"` — inline onclick, нарушает CSP. `window.bridgeApp` удалён.
**Фикс:** Убрать onclick, добавить id `mix-home-btn`:
```html
<button class="btn btn-outline btn-block" id="mix-home-btn">На главную</button>
```
После innerHTML добавить addEventListener. Но! Модуль не имеет доступа к app.switchModule. Вместо этого: использовать навигацию через click на tab-bar:
```javascript
document.getElementById('mix-home-btn')?.addEventListener('click', () => {
  document.querySelector('.tab-item[data-module="welcome"]')?.click();
});
```

---

## Таск 2: Session Framing — прогресс-бар и финальный экран

### 2a. Визуальный прогресс-бар (точки)

**Файл:** `js/trainers/daily-mix.js` (render), `css/modules.css`

Добавить визуальный прогресс-бар из 10 точек вместо текстового "1/10". Каждая точка показывает статус:
- Серая — ещё не решена
- Зелёная — правильно
- Красная — неправильно
- Пульсирующая — текущая задача

HTML (вставить вместо stats-bar или над ним):
```html
<div class="session-progress" id="session-progress">
  <!-- 10 dots generated dynamically -->
</div>
```

CSS (в modules.css):
```css
.session-progress {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
}
.progress-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);
  transition: background 0.3s, transform 0.3s;
}
.progress-dot.current {
  background: var(--accent);
  transform: scale(1.3);
  animation: pulse 1.5s infinite;
}
.progress-dot.correct { background: var(--success); }
.progress-dot.wrong { background: var(--error); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

JS: Метод `_renderProgressDots()` генерирует HTML. Массив `this.taskResults = []` (заполняется при ответе: 'correct' | 'wrong'). Вызывается в `render()` и обновляется в `checkAnswer()`.

### 2b. Улучшенный финальный экран

В `showResults()` добавить:
- Визуальную полоску точек (те же 10, все раскрашены)
- Среднее время на задачу
- Кнопку "Тренировать слабые" если accuracy < 70%

---

## Таск 3: Intra-session Error Retry

**Файл:** `js/trainers/daily-mix.js`

### Механика
Когда пользователь ошибается, через 2-3 задачи показать **аналогичную** задачу того же типа (не ту же самую — новую сгенерированную).

### Реализация
1. В `checkAnswer()`, если ответ неправильный — добавить retry-задачу в сессию:
```javascript
if (!correct) {
  this._scheduleRetry(task);
}
```

2. Метод `_scheduleRetry(task)`:
```javascript
_scheduleRetry(task) {
  // Insert a new task of same type 2-3 positions ahead
  const retryTask = this._generateTaskOfType(task.type);
  retryTask.isRetry = true;

  const insertAt = Math.min(
    this.taskIndex + 2 + Math.floor(Math.random() * 2), // 2-3 positions ahead
    this.session.length  // but not beyond session end
  );
  this.session.splice(insertAt, 0, retryTask);
  // SESSION_SIZE stays the same — retry tasks are bonus
  // Update progress dots to show new total
}
```

3. Retry-задачи не увеличивают SESSION_SIZE (сессия может стать 11-13 задач).
4. В прогресс-баре retry-задачи показываются как дополнительные точки (меньшего размера или другого стиля).
5. Badge `🔁` на retry-задачах чтобы пользователь понимал почему тема повторяется.

### Ограничения
- Максимум 3 retry-задачи за сессию (чтобы сессия не растягивалась бесконечно)
- Retry не генерирует retry (нет рекурсии)

---

## Общие ограничения
- Vanilla JS, ES modules, без фреймворков
- Не ломать PWA (service worker, offline, manifest)
- Не ломать lazy-loading модулей
- Не ломать CSP (никаких inline onclick/scripts)
- Терминология на русском (Т/К/Д/В, ♠♥♦♣)
- Минимальные изменения в файлах за пределами daily-mix.js и css/modules.css
