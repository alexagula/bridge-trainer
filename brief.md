# Бриф: Фаза 2 — Архитектура (Code Quality Review)

## Что делаем и зачем
Три архитектурных рефакторинга по результатам Code Quality Review:
1. Вынести renderHand/renderStats из app.js в отдельный модуль (исправить инверсию зависимостей)
2. Внедрить BaseTrainer — убрать ~350 строк дублирования из 8 тренажёров
3. Разбить daily-mix.js (~1200 строк) на 3 модуля

---

## Таск 1: Вынести renderHand и renderStats в js/ui/render.js

**Проблема:** Все тренажёры импортируют `renderHand` и `renderStats` из `../app.js` — entry point приложения. Это инверсия зависимостей: модули зависят от точки входа.

**Что сделать:**

1. Создать `js/ui/render.js`
2. Перенести туда из app.js:
   - Функцию `renderHand(hand, options)` со всеми её зависимостями
   - Функцию `renderStats(stats)`
   - Необходимые импорты (SUITS, RANKS из constants.js)
3. В app.js — импортировать из render.js и ре-экспортировать (чтобы не сломать, если что-то ещё ссылается):
   ```javascript
   import { renderHand, renderStats } from './ui/render.js';
   export { renderHand, renderStats };
   ```
4. Во ВСЕХ тренажёрах — поменять путь импорта:
   ```javascript
   // Было:
   import { renderHand, renderStats } from '../app.js';
   // Стало:
   import { renderHand, renderStats } from '../ui/render.js';
   ```

**Файлы для обновления импортов:**
- js/trainers/hcp-trainer.js
- js/trainers/opening-trainer.js
- js/trainers/response-trainer.js
- js/trainers/lead-trainer.js
- js/trainers/trick-trainer.js
- js/trainers/daily-mix.js
- js/trainers/quiz-trainer.js
- js/trainers/convention-drill.js
- js/trainers/bidding-sim.js
- js/trainers/play-trainer.js (если импортирует)
- js/trainers/defense-trainer.js (если импортирует)
- js/progress/progress-view.js (если импортирует renderStats)

5. Добавить `'./js/ui/render.js'` в service-worker.js ASSETS
6. Обновить CACHE_NAME (v10 → v11)

---

## Таск 2: Внедрить BaseTrainer в 8 тренажёров

**Проблема:** 9 одинаковых паттернов копируются между тренажёрами: stats update, next button, init(), destroy(), answered flag, timer.

**Что сделать:**

1. Обновить `js/trainers/base-trainer.js` (уже существует, но пуст):

```javascript
import { ProgressTracker } from '../progress/tracker.js';
import { renderStats } from '../ui/render.js';

export class BaseTrainer {
  constructor(containerId, moduleId) {
    this.container = document.getElementById(containerId);
    this.moduleId = moduleId;
    this.answered = false;
    this.startTime = 0;
  }

  init() {
    this.render();
    this.newProblem();
  }

  destroy() {
    // Подклассы могут переопределить для очистки таймеров
  }

  startTimer() {
    this.startTime = Date.now();
  }

  getTimeTaken() {
    return Date.now() - this.startTime;
  }

  updateStats() {
    const stats = ProgressTracker.getStats(this.moduleId);
    const statsHtml = renderStats(stats);
    const statsBar = this.container.querySelector('.stats-bar');
    if (statsBar) statsBar.outerHTML = statsHtml;
  }

  showNextBtn() {
    const btn = this.container.querySelector('.next-btn, #next-btn, [id$="-next-btn"]');
    if (btn) { btn.classList.remove('hidden'); btn.focus(); }
  }

  hideNextBtn() {
    const btn = this.container.querySelector('.next-btn, #next-btn, [id$="-next-btn"]');
    if (btn) btn.classList.add('hidden');
  }

  recordResult(correct, timeTaken) {
    ProgressTracker.record(this.moduleId, { correct, time: timeTaken });
  }

  // render() и newProblem() — абстрактные, реализуются в подклассах
}
```

2. Мигрировать **4 простых тренажёра** на BaseTrainer (самые простые для начала):
   - `quiz-trainer.js` — extends BaseTrainer, удалить дублирование init/destroy/stats/next
   - `play-trainer.js` — extends BaseTrainer
   - `defense-trainer.js` — extends BaseTrainer
   - `lead-trainer.js` — extends BaseTrainer

3. Для каждого тренажёра:
   - Добавить `import { BaseTrainer } from './base-trainer.js';`
   - Заменить `export default class XxxTrainer {` на `export default class XxxTrainer extends BaseTrainer {`
   - В constructor: `super(containerId, 'moduleId');` вместо `this.container = ...; this.answered = false;`
   - Удалить дублирующие методы если они идентичны BaseTrainer (init, destroy)
   - Заменить inline stats update на `this.updateStats()`
   - Заменить inline next button toggle на `this.showNextBtn()` / `this.hideNextBtn()`
   - Заменить inline `ProgressTracker.record(...)` на `this.recordResult(correct, timeTaken)`

**НЕ мигрировать (слишком сложные, отдельная задача):**
- hcp-trainer.js (таймер, 5 типов вопросов)
- opening-trainer.js (SM-2 интеграция)
- response-trainer.js (SM-2 интеграция)
- convention-drill.js (3 типа дриллов)
- daily-mix.js (совсем другой паттерн)
- bidding-sim.js (multi-step flow)
- trick-trainer.js (custom input)

---

## Таск 3: Разбить daily-mix.js на 3 модуля

**Проблема:** daily-mix.js ~1200 строк — генерация сессии + 7 рендереров задач + 7 чекеров ответов + результаты + rewards.

**Что сделать:**

1. Создать `js/trainers/mix/session-generator.js`:
   - Перенести: generateSession(), _sm2ItemToTask(), _generateFillTasks(), _generateTaskOfType(), _generateOpeningTask(), _generateResponseTask(), _generateHcpTask(), _generateQuizTask(), _generateLeadTask(), _generateTricksTask(), _interleave()
   - Экспорт: `generateSession()`
   - Импорты: dealer, opening, response, lead, evaluator, quizzes, bid-utils, tracker

2. Создать `js/trainers/mix/task-renderers.js`:
   - Перенести: _renderOpeningTask(), _renderResponseTask(), _renderHcpTask(), _renderQuizTask(), _renderLeadTask(), _renderTricksTask(), _attachTaskHandlers()
   - Экспорт: `renderTask(task, container)` — диспетчер по task.type
   - Импорты: render.js (renderHand), bid-filter

3. Оставить в `js/trainers/daily-mix.js`:
   - Класс DailyMix (constructor, init, destroy, render, showTask, checkAnswer, showResults, _buildRewardsHtml)
   - Импорт generateSession из session-generator
   - Импорт renderTask из task-renderers
   - Проверки ответов (_checkOpeningAnswer и т.д.) оставить в main файле — они тесно связаны с UI

4. Обновить:
   - service-worker.js ASSETS: добавить 2 новых файла
   - Создать папку js/trainers/mix/

---

## Ограничения
- Не ломать функциональность — всё должно работать как раньше
- Прогрессивная миграция — НЕ мигрировать сложные тренажёры на BaseTrainer
- service-worker.js — обновить ASSETS и CACHE_NAME
- Тесты: открыть каждый модуль в браузере мысленно — проверить что импорты корректны
