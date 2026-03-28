# Бриф: 10 исправлений по результатам анализа кода

## Источник
Все 10 пунктов из analysis-results.md — баги, техдолг, архитектура.

---

## Таск 1: Исправить blackwoodDecision — >=5 до >=4

**Файл:** `js/bidding/conventions.js`, строки ~106-112
**Баг:** `total >= 4` стоит ДО `total >= 5` → большой шлем никогда не рекомендуется.
**Фикс:** Поменять порядок условий — сначала `if (total >= 5)`, потом `if (total >= 4)`.

---

## Таск 2: Удалить дублирующий dealForResponse

**Файл:** `js/trainers/response-trainer.js`, строки ~85-100
**Баг:** `dealForResponse()` вызывается ДВАЖДЫ. Первый вызов (строки 85-88) создаёт openingKey через замену символов и вызывает dealForResponse, но результат перезаписывается вторым вызовом (строка 99).
**Фикс:** Удалить строки 85-88 (первый вызов с мусорной конвертацией). Оставить только второй блок (строки 91-99), который правильно маппит символы.

---

## Таск 3: Убрать несуществующие файлы из service-worker.js

**Файл:** `service-worker.js`
**Баг:** В массиве ASSETS есть `'./js/play/signals.js'` и `'./data/scenarios.js'`, но этих файлов нет в репозитории. Это ломает precaching при первой установке PWA.
**Фикс:** Проверить, существуют ли эти файлы. Если нет — удалить из ASSETS. Обновить CACHE_NAME (инкрементировать версию).

---

## Таск 4: SM-2 во все тренажёры

**Что:** Подключить `recordError()`/`recordSuccess()` во все основные тренажёры, не только в daily-mix.
**Зачем:** SM-2 инфраструктура (`tracker.js`) уже написана, но вызывается только из `daily-mix.js`. Остальные 8 тренажёров пишут только в обычный счётчик через `record()`.

**Файлы для изменения:**
- `js/trainers/opening-trainer.js` — в checkAnswer(), при ошибке вызвать `ProgressTracker.recordError('opening', ruleId, reason)`, при правильном — `ProgressTracker.recordSuccess(ruleId)`. Использовать `bidToRuleId` из daily-mix или создать аналог.
- `js/trainers/response-trainer.js` — аналогично.
- `js/trainers/lead-trainer.js` — при ошибке recordError с reason из recommended.
- `js/trainers/convention-drill.js` — при ошибке recordError.
- `js/trainers/quiz-trainer.js` — при ошибке recordError с quiz.statement.

**Логика:**
```javascript
// При ошибке:
ProgressTracker.recordError(MODULE_ID, situationId, description);
// При правильном ответе, если этот situationId ранее был в SM-2:
ProgressTracker.recordSuccess(situationId);
```

Для `situationId` — использовать подход из daily-mix: привязка к правилу, не к раздаче. Для opening — `bidToRuleId('opening', bid)`. Для quiz — `rule:quiz-lesson${quiz.lesson}-${index}`. Для lead — `rule:lead-${contractDisplay}`.

Функцию `bidToRuleId` вынести из daily-mix.js в `js/utils/bid-utils.js` и импортировать.

---

## Таск 5: Вынести parseSuitFromBid и getBidLevel в utils

**Дублирование:**
- `parseSuitFromBid` — идентична в `overcall.js` (как `bidToSuit`) и `rebid.js`
- `getBidLevel` — в `rebid.js`, inline в `overcall.js`

**Фикс:**
1. Создать `js/utils/bid-utils.js` (или добавить в существующий `bid-filter.js`)
2. Экспортировать `parseSuitFromBid(bid)`, `getBidLevel(bid)`, `bidToRuleId(module, bid, hand, opening)`
3. В `overcall.js` — импортировать вместо локальной `bidToSuit`
4. В `rebid.js` — импортировать вместо локальных определений
5. В `daily-mix.js` — импортировать `bidToRuleId` из `bid-utils.js`, удалить локальное определение
6. Добавить `./js/utils/bid-utils.js` в `service-worker.js` ASSETS

---

## Таск 6: BaseTrainer с общими методами

**Что:** Создать `js/trainers/base-trainer.js` с общими методами, которые дублируются во всех тренажёрах.

**Методы BaseTrainer:**
```javascript
export class BaseTrainer {
  constructor(containerId, moduleId) {
    this.container = document.getElementById(containerId);
    this.moduleId = moduleId;
    this.answered = false;
    this.startTime = 0;
  }

  // Обновить stats bar
  updateStats() {
    const stats = ProgressTracker.getStats(this.moduleId);
    const statsEl = this.container.querySelector('.stats-bar');
    if (statsEl) statsEl.outerHTML = renderStats(stats);
  }

  // Показать кнопку "Следующая"
  showNextBtn() {
    const btn = document.getElementById('next-btn');
    if (btn) { btn.classList.remove('hidden'); btn.focus(); }
  }

  // Скрыть кнопку
  hideNextBtn() {
    const btn = document.getElementById('next-btn');
    if (btn) btn.classList.add('hidden');
  }

  // Начать замер времени
  startTimer() { this.startTime = Date.now(); }
  getTimeTaken() { return Date.now() - this.startTime; }

  // Записать результат
  recordResult(correct, timeTaken) {
    ProgressTracker.record(this.moduleId, { correct, time: timeTaken });
  }

  destroy() {}
}
```

**НЕ переписывать** все тренажёры — только создать BaseTrainer. Миграция тренажёров на BaseTrainer — отдельная задача. Сейчас — только создать файл.

**Файлы:**
- Создать: `js/trainers/base-trainer.js`
- `service-worker.js` — добавить в ASSETS

---

## Таск 7: In-memory кеш ProgressTracker

**Файл:** `js/progress/tracker.js`
**Проблема:** `loadData()` вызывает `JSON.parse(localStorage)` при каждом `record()` и `getStats()`. 3 парсинга за клик.

**Фикс:** Добавить in-memory кеш:
```javascript
let _cache = null;
let _dirty = false;

function loadData() {
  if (_cache) return _cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    _cache = raw ? JSON.parse(raw) : {};
  } catch { _cache = {}; }
  return _cache;
}

function saveData(data) {
  _cache = data;
  _dirty = true;
  // Debounce write to localStorage
  if (!saveData._timer) {
    saveData._timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache));
      _dirty = false;
      saveData._timer = null;
    }, 500);
  }
}
```

Аналогично для SM-2 данных (`_sm2Cache`).

Добавить метод `flush()` для принудительной записи (вызывать перед `beforeunload`).

---

## Таск 8: Очищать таймеры в destroy()

**Файлы:**
- `js/trainers/bidding-sim.js` — найти все `setTimeout`/`setInterval`, сохранить ID в `this._timers`, очистить в `destroy()`
- `js/trainers/hcp-trainer.js` — уже очищает `this.timerInterval` в destroy(), но проверить полноту
- Все остальные тренажёры — проверить на наличие setTimeout без cleanup

**Паттерн:**
```javascript
// В коде:
this._aiTimeout = setTimeout(() => { ... }, 300);

// В destroy():
destroy() {
  if (this._aiTimeout) clearTimeout(this._aiTimeout);
}
```

---

## Таск 9: Исправить findDeclarer()

**Файл:** `js/bidding/sequence.js`, строки ~45-57
**Баг:** Декларантом назначается последний бидивший на выигравшей стороне, а не первый назвавший масть контракта.

**Правило бриджа:** Декларант — первый игрок на выигравшей стороне, который назвал масть финального контракта.

**Фикс:** В `findDeclarer()`:
1. Определить финальный контракт (последняя non-pass заявка)
2. Определить масть контракта
3. Среди всех заявок выигравшей стороны найти ПЕРВОГО, кто назвал эту масть
4. Он — декларант

---

## Таск 10: Вынести createProgressView из app.js

**Файл:** `js/app.js`, строки ~224-288
**Проблема:** Функция `createProgressView(tracker)` определена прямо в роутере. Нарушает SRP.

**Фикс:**
1. Создать `js/progress/progress-view.js`
2. Перенести туда `createProgressView`
3. В `app.js` — импортировать:
```javascript
import { createProgressView } from './progress/progress-view.js';
```
4. Обновить MODULE_LOADERS для progress:
```javascript
progress: () => Promise.all([
  import('./progress/tracker.js'),
  import('./progress/progress-view.js')
]).then(([t, v]) => ({ default: v.createProgressView(t.ProgressTracker) })),
```
5. `service-worker.js` — добавить `./js/progress/progress-view.js` в ASSETS

---

## Ограничения
- Не ломать существующую функциональность
- Русская терминология в UI
- Не менять public API тренажёров (init/destroy/render)
- Mobile-first
- localStorage — единственное хранилище
