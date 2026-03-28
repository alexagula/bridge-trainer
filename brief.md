# Бриф: 9 улучшений удобства обучения

## Что делаем и зачем
По результатам экспертного анализа (analysis-results.md) внедряем 9 улучшений UX и методологии обучения в тренажёре бриджа.

---

## Таск 1: Краткое объяснение при правильном ответе

### Что
Во ВСЕХ тренажёрах (opening-trainer, response-trainer, daily-mix) при правильном ответе показывать reason одной строкой сразу под "Правильно!", без кнопки.

### Где сейчас
- `opening-trainer.js:110-113` — при правильном ответе показывает только "✓ Правильно! {bidDisplay} (время)". Объект `this.correctBid` содержит `.reason` — нужно его показать.
- `response-trainer.js:144-145` — аналогично.
- `daily-mix.js:757-762` — `_showBidFeedback()` при correct показывает "Правильно!" и прячет дерево за кнопку "Объяснить". Нужно: показать reason СРАЗУ (одной строкой), а дерево оставить за кнопкой.
- `daily-mix.js:646-649` — `_checkHcpAnswer()` при correct: добавить "Считайте: Т=4, К=3, Д=2, В=1" для reinforcement.

### Как
```
Было:  ✓ Правильно! 1♠ (2.3с)
Стало: ✓ Правильно! 1♠ (2.3с)
       13 HCP, 5 пик → 1♠
```

### Файлы
- `js/trainers/opening-trainer.js` — checkAnswer(), при correct добавить `this.correctBid.reason`
- `js/trainers/response-trainer.js` — checkAnswer(), при correct добавить `this.correctBid.reason`
- `js/trainers/daily-mix.js` — `_showBidFeedback()` и `_checkHcpAnswer()`

---

## Таск 2: Контрастный бейдж типа задачи в миксе дня

### Что
В daily-mix перед каждой задачей показывать яркий цветной бейдж с типом: "ОТКРЫТИЕ" (синий), "ОТВЕТ" (зелёный), "HCP" (жёлтый), "ТЕСТ" (фиолетовый), "ХОД" (оранжевый).

### Реализация
В `showTask()` после обновления stats bar, перед контентом задачи добавить HTML-бейдж.

Добавить CSS в `css/modules.css`:
```css
.task-type-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.task-type-opening { background: rgba(29,155,240,0.2); color: #1d9bf0; }
.task-type-response { background: rgba(0,200,83,0.2); color: #00c853; }
.task-type-hcp { background: rgba(255,193,7,0.2); color: #ffc107; }
.task-type-quiz { background: rgba(156,39,176,0.2); color: #9c27b0; }
.task-type-lead { background: rgba(255,152,0,0.2); color: #ff9800; }
```

В `daily-mix.js` в `showTask()`, перед `switch (task.type)`, вставить бейдж в `taskArea`:
```javascript
const typeLabels = { opening: 'Открытие', response: 'Ответ', hcp: 'HCP', quiz: 'Тест', lead: 'Первый ход' };
const badgeHtml = `<div class="task-type-badge task-type-${task.type}">${typeLabels[task.type]}</div>`;
```
И добавить этот `badgeHtml` в начало `taskArea.innerHTML`.

### Файлы
- `css/modules.css` — добавить стили бейджей
- `js/trainers/daily-mix.js` — showTask()

---

## Таск 3: Упрощённый tab bar — 5 вкладок

### Что
Заменить 12 вкладок на 5: Главная, Микс, Модули (с popup-меню), Справочник, Прогресс.
При клике на "Модули" — показать выпадающий список из 8 тренажёров.

### Реализация

**index.html**: заменить 12 tab-item на 5:
```html
<div class="tab-item active" data-module="welcome">🏠 Главная</div>
<div class="tab-item" data-module="mix">🎯 Микс</div>
<div class="tab-item" id="modules-tab">📚 Модули</div>
<div class="tab-item" data-module="theory">📖 Теория</div>
<div class="tab-item" data-module="progress">📊 Прогресс</div>
```

**Popup-меню для "Модули"**: добавить в index.html перед `</nav>`:
```html
<div id="modules-popup" class="modules-popup hidden">
  <div class="popup-item" data-module="hcp">🔢 Подсчёт HCP</div>
  <div class="popup-item" data-module="opening">🃏 Открытие</div>
  <div class="popup-item" data-module="response">💬 Ответ</div>
  <div class="popup-item" data-module="bidding">📢 Торговля</div>
  <div class="popup-item" data-module="conventions">📋 Конвенции</div>
  <div class="popup-item" data-module="play">🎯 Розыгрыш</div>
  <div class="popup-item" data-module="lead">➡️ Первый ход</div>
  <div class="popup-item" data-module="quiz">✅ Тесты</div>
</div>
```

**app.js**: добавить обработчик для modules-tab (открыть/закрыть popup) и popup-item (switchModule + закрыть popup). При switchModule на любой модуль из popup — подсвечивать tab "Модули" как active.

**css/modules.css**: стили для popup-меню (position: fixed, bottom от tab bar, z-index).

### Файлы
- `index.html` — заменить tab bar + добавить popup
- `js/app.js` — обработчик popup
- `css/modules.css` — стили popup

---

## Таск 4: Фильтр кнопок в opening/response-тренажёрах

### Что
Использовать тот же `pickRelevantBids()` из daily-mix.js в opening-trainer.js и response-trainer.js. Вынести функцию в shared-модуль.

### Реализация
1. Создать `js/utils/bid-filter.js` — экспортировать `pickRelevantBids()`, `ALL_OPENING_BIDS`, `ALL_RESPONSE_BIDS`, `BID_DISPLAY`.
2. `daily-mix.js` — импортировать из `../utils/bid-filter.js`, удалить дубликат.
3. `opening-trainer.js` — в `newProblem()`, после `getOpeningOptions()`, отфильтровать через `pickRelevantBids()`.
4. `response-trainer.js` — аналогично в `newProblem()`.

### Файлы
- Создать: `js/utils/bid-filter.js`
- Изменить: `js/trainers/daily-mix.js`
- Изменить: `js/trainers/opening-trainer.js`
- Изменить: `js/trainers/response-trainer.js`
- Изменить: `service-worker.js` — добавить bid-filter.js в кэш

---

## Таск 5: Автозапуск при SM-2 задачах на повторение

### Что
При открытии приложения: если есть SM-2 задачи на повторение (getDueCount() > 0), автоматически запустить Микс дня вместо welcome screen.

### Реализация
В `app.js`, в конструкторе App или после инициализации, проверить:
```javascript
const dueCount = ProgressTracker.getDueCount();
if (dueCount > 0) {
  this.switchModule('mix');
}
```

### Файлы
- `js/app.js` — добавить автозапуск после инициализации

---

## Таск 6: Highlight решающего шага в decision tree

### Что
При ошибке в decision tree выделить последний пройденный шаг (шаг, на котором пользователь "свернул не туда") — крупнее, другой цвет.

### Реализация
В `daily-mix.js` в `_buildDecisionTree()` — найти последний шаг с `passed: true` (это тот, после которого пользователь должен был пойти другим путём), и добавить ему CSS-класс `step-decisive`.

Также добавить ту же логику в `opening-trainer.js` и `response-trainer.js`.

CSS в `modules.css`:
```css
.step-decisive {
  background: rgba(29,155,240,0.1);
  border-radius: 6px;
  padding: 8px;
  margin: 4px -8px;
}
.step-decisive .step-text {
  color: var(--accent) !important;
  font-weight: 700 !important;
}
```

### Файлы
- `js/trainers/daily-mix.js` — `_buildDecisionTree()`
- `js/trainers/opening-trainer.js` — checkAnswer() при ошибке
- `js/trainers/response-trainer.js` — checkAnswer() при ошибке
- `css/modules.css` — стиль step-decisive

---

## Таск 7: Режим "бинарный выбор" при accuracy < 50%

### Что
В daily-mix при accuracy пользователя < 50% по модулю — вместо 8-10 кнопок показывать 2: правильный ответ + 1 ближайший неправильный.

### Реализация
В `_renderOpeningTask()` и `_renderResponseTask()` — проверить `ProgressTracker.getStats(module).accuracy`. Если < 50%, взять только 2 кнопки.

Вспомогательная функция `pickBinaryBids(pool, correctBid)`:
- correctBid
- ближайший по pool (±1 позиция, но не пас если correct != пас)

### Файлы
- `js/trainers/daily-mix.js` — render-функции для opening/response
- `js/utils/bid-filter.js` — добавить `pickBinaryBids()`

---

## Таск 8: SM-2 привязка к правилу

### Что
Изменить формат situationId с "opening:12hcp-5332" на "rule:opening-pass-weak" (привязка к правилу, а не к раздаче).

### Маппинг правил
```javascript
const OPENING_RULES = {
  'rule:opening-pass-weak': 'Менее 12 HCP → пас',
  'rule:opening-1M': '12-21 HCP + 5+ мажор → 1♥/1♠',
  'rule:opening-1NT': '15-18 HCP + равномер + нет 5М → 1БК',
  'rule:opening-1m': '12-21 HCP + нет 5М + не 1БК → 1♣/1♦',
  'rule:opening-2C': '22+ HCP → 2♣ ФГ',
  'rule:opening-2NT': '20-21 HCP + равномер → 2БК',
  'rule:opening-preempt': '6-10 HCP + 6+ карт → блок',
};
```

### Реализация
В `daily-mix.js` `_checkOpeningAnswer()` — определять situationId из correctAnswer.bid и correctAnswer.steps вместо формирования из HCP+shape.

### Файлы
- `js/trainers/daily-mix.js` — _checkOpeningAnswer(), _checkResponseAnswer()

---

## Таск 9: Мини-recap ошибок после сессии микса

### Что
На экране результатов микса дня (showResults) добавить блок "Запомни:" с 1-3 правилами из ошибок текущей сессии.

### Реализация
1. В DailyMix добавить массив `this.sessionErrors = []`
2. При ошибке (в _check*Answer) — пушить `{ module, reason }` из correctAnswer
3. В showResults() — взять до 3 уникальных reasons и показать:
```html
<div class="card-area">
  <div class="card-area-title">Запомни</div>
  <div class="recap-item">• 15-18 HCP + равномер = 1БК, а не 1 в масти</div>
  <div class="recap-item">• Для подъёма нужно 3+ карты, не 4</div>
</div>
```

### Файлы
- `js/trainers/daily-mix.js` — sessionErrors[], _check*Answer(), showResults()
- `css/modules.css` — стиль recap-item

---

## Ограничения
- Следовать паттерну существующих тренажёров
- Русская терминология
- Не ломать существующие модули
- Mobile-first: кнопки 44px+, без горизонтального скролла
- localStorage — единственное хранилище
