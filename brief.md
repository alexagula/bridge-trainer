# Бриф: 8 улучшений Bridge Trainer по результатам экспертного анализа

## Источник
Экспертный анализ (analysis-results.md, 2026-03-28): перекос в торговлю, слабый розыгрыш/защита, SM-2 не гранулярен, нет привычки возвращаться.

---

## Таск 1: Расширить Play Trainer — +12 сценариев розыгрыша

**Файл:** `js/play/techniques.js`

**Что:** Добавить 12 новых сценариев в массив `PLAY_SCENARIOS`. Сейчас 6 сценариев (finesse-1, finesse-2, expas-1, develop-1, ruff-1, ruff-2). Нужно довести до 18.

**Новые категории и сценарии:**

Категория `holdup` (задержка выигрыша):
- `holdup-1`: "Задержка в БК" — Т-К-x-x vs x-x, противник атакует с K-Q-J-10-x. Не брать первым тузом — разрушить связь.
- `holdup-2`: "Двойная задержка" — Т-x-x vs x-x, противник атакует. Пропустить дважды, взять третью.

Категория `duck` (отдача взятки):
- `duck-1`: "Duck для установки масти" — T-K-x-x-x vs x-x-x. Отдать первую взятку, потом забрать 4.
- `duck-2`: "Duck с 7 картами" — T-K-x-x vs x-x-x. Отдать, потом 3 взятки точно.

Категория `safety` (безопасный розыгрыш):
- `safety-1`: "Безопасный розыгрыш масти" — T-K-D-x-x vs x-x-x-x. Не начинать с туза — cash the K-Q first от dummy.
- `safety-2`: "Страховка от 4-0 расклада" — T-K-Д-В-10 vs x-x-x. Начать с маленькой к 10, если противник покажет 4-0.

Категория `squeeze` (выжимка):
- `squeeze-1`: "Простая выжимка" — У разыгрывающего T♠ (угроза) + K-D♦ (длинные). Противник держит K♠ + T♦ → не удержит оба.
- `squeeze-2`: "Повторная выжимка" — не нужна, слишком сложно для новичка. Вместо: "Виенская выжимка" — показать как cash всех козырей создаёт давление.

Категория `trump` (управление козырями):
- `trump-1`: "Не тяни козыри сразу" — У противника 3 козыря включая K. Сначала разыграй побочную масть, потом перебей.
- `trump-2`: "Контроль козырей" — Т-К-Д-x-x козыри, но у противника J-10-x-x. Тяни козыри 3 раза перед боковой мастью.

Категория `loser` (лузер-анализ):
- `loser-1`: "Считай лузеры" — Контракт 4♠. Рука: T-K-D-x-x ♠, x-x ♥, K-x ♦, x-x-x ♣. Лузеры: 0♠+2♥+1♦+3♣=6, минус козырный сброс = 4.
- `loser-2`: "Сброс лузера на длинную масть" — Разыграть длинную ♦ dummy, сбросить проигрышную ♣.

**Формат каждого сценария (как существующие):**
```javascript
{
  id: 'holdup-1',
  title: 'Задержка в БК',
  category: 'holdup',
  lesson: 6,
  description: 'Контракт 3БК. Противник ходит ♠К. У вас Т♠-x-x, у стола x-x.',
  north: { spades: ['x', 'x'], hearts: [...], diamonds: [...], clubs: [...] },
  south: { spades: ['Т', 'x', 'x'], hearts: [...], diamonds: [...], clubs: [...] },
  question: 'Брать тузом сейчас или пропустить?',
  options: ['Взять тузом', 'Пропустить (hold-up)'],
  correct: 1,
  explanation: 'Hold-up: пропустите первый ход...'
}
```

**Также обновить `getScenarioCategories()`** — добавить новые категории: holdup, duck, safety, squeeze, trump, loser.

**Не трогать:** play-trainer.js (он уже читает из techniques.js динамически).

---

## Таск 2: Тренажёр "Подсчёт взяток" (Trick Counting Trainer)

**Создать:** `js/trainers/trick-trainer.js`

**Суть:** Показать руку (13 карт) + контракт (масть козыря или БК) → спросить "Сколько верных взяток?".

**Логика верных взяток:**
- В БК: считать только гарантированные (T, K рядом с T, и т.д.) в каждой масти
- В козырном контракте: верные взятки в козырной масти + верные в побочных + убитки (козыри в короткой руке)
- Для простоты (новичок): считать только top tricks (T/K/D в секвенции) без сложных комбинаций

**Формат:**
- Как HCP Trainer: показать руку, поле ввода числа (0-13), кнопка "Проверить"
- Feedback: разбивка по мастям — "♠: 2 взятки (T-K), ♥: 1 (T), ♦: 0, ♣: 3 (T-K-Д)"
- Режим: "Разыгрывающий" (видит обе руки) и "Защитник" (видит только свою)

**Подсчёт верных взяток (алгоритм для кода):**
```javascript
function countTopTricks(hand, trumpSuit) {
  let tricks = 0;
  for (const suitId of SUIT_ORDER) {
    const cards = hand.getSuitCards(suitId); // sorted high to low
    if (suitId === trumpSuit) {
      // Все козыри — потенциальные взятки, но считаем только top sequence
      tricks += countTopSequence(cards);
    } else {
      tricks += countTopSequence(cards);
    }
  }
  return tricks;
}

function countTopSequence(cards) {
  // T-K-D-V-10... считаем пока идёт непрерывная секвенция сверху
  // Т = всегда 1 взятка
  // Т-К = 2, Т-К-Д = 3
  // К без Т = 0 (не гарантировано)
  let count = 0;
  let expectedRank = 14; // Ace
  for (const card of cards) {
    if (card.rankValue === expectedRank) {
      count++;
      expectedRank--;
    } else break;
  }
  return count;
}
```

**Регистрация:**
- `js/app.js`: добавить в MODULE_LOADERS: `tricks: () => import('./trainers/trick-trainer.js')`
- `js/app.js`: добавить в MODULE_TITLES: `tricks: 'Подсчёт взяток'`
- `index.html`: добавить в modules-popup: `<div class="popup-item" data-module="tricks">🎯 Подсчёт взяток</div>`
- `service-worker.js`: добавить `'./js/trainers/trick-trainer.js'` в ASSETS, обновить CACHE_NAME

**SM-2:** Записывать `ProgressTracker.record('tricks', { correct, time })`. SM-2 ruleId: `rule:tricks-${trumpSuit || 'nt'}-${trickCount}`.

---

## Таск 3: SM-2 гранулярность — атомарные ruleId

**Файлы:**
- `js/trainers/opening-trainer.js`
- `js/trainers/response-trainer.js`
- `js/utils/bid-utils.js`
- `js/trainers/daily-mix.js`

**Проблема:** Сейчас `bidToRuleId('opening', '1♠')` возвращает `rule:opening-1major` — слишком грубо. Ученик может путать "12 HCP + 5♠ → 1♠" и "15 HCP + 5♠ + 5♥ → 1♠" — это разные правила.

**Фикс:** В `bid-utils.js` расширить `bidToRuleId` чтобы он учитывал ШАГИ дерева решений:

```javascript
export function bidToRuleId(module, bid, hand, opening) {
  if (module === 'opening') {
    // Используем bid + ключевой признак руки
    const hcp = hand.hcp;
    const balanced = hand.isBalanced;
    if (bid === 'Пас') return 'rule:opening-pass';
    if (bid === '1БК') return 'rule:opening-1nt';
    if (bid === '2БК') return 'rule:opening-2nt';
    if (bid === '2♣') return 'rule:opening-2c-strong';
    if (['1♥', '1♠'].includes(bid)) {
      return `rule:opening-1major-${hcp <= 14 ? 'min' : 'max'}`;
    }
    if (['1♣', '1♦'].includes(bid)) {
      return `rule:opening-1minor-${balanced ? 'bal' : 'unbal'}`;
    }
    // Preempt
    return `rule:opening-preempt-${bid.replace(/[♠♥♦♣]/g, '')}`;
  }

  if (module === 'response') {
    const hcp = hand.hcp;
    const hcpBucket = hcp < 6 ? 'weak' : hcp < 10 ? 'invite' : 'gf';
    return `rule:response-${opening}-${hcpBucket}`;
  }

  return `rule:${module}-${bid}`;
}
```

**В opening-trainer.js (checkAnswer):** Передавать `hand` в `bidToRuleId`:
```javascript
const situationId = bidToRuleId('opening', this.correctBid.bid, this.hand);
```

**В response-trainer.js (checkAnswer):** Аналогично:
```javascript
const situationId = bidToRuleId('response', correctBid, this.hand, this.opening);
```

**В daily-mix.js:** Обновить `_sm2ItemToTask()` чтобы парсить новые ruleId и генерировать соответствующие руки.

---

## Таск 4: Streak-счётчик + daily goal на главном экране

**Файлы:**
- `js/progress/tracker.js` — добавить методы для глобального streak и daily goal
- `index.html` — добавить блок на welcome screen
- `js/app.js` — обновить showWelcome() для отображения streak

**Добавить в tracker.js:**
```javascript
// Глобальный streak (дни подряд с хотя бы 1 задачей)
getGlobalStreak() {
  const data = loadData();
  const days = new Set();
  for (const mod of Object.values(data)) {
    for (const r of (mod.results || [])) {
      days.add(new Date(r.ts).toDateString());
    }
  }
  // Считаем от сегодня назад подряд
  let streak = 0;
  let d = new Date();
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Задач сегодня
getTodayCount() {
  const data = loadData();
  const today = new Date().toDateString();
  let count = 0;
  for (const mod of Object.values(data)) {
    for (const r of (mod.results || [])) {
      if (new Date(r.ts).toDateString() === today) count++;
    }
  }
  return count;
}
```

**В index.html (welcome section), добавить перед кнопками:**
```html
<div id="streak-banner" class="streak-banner">
  <div class="streak-days"><span id="streak-count">0</span> дней подряд 🔥</div>
  <div class="daily-progress">Сегодня: <span id="today-count">0</span>/10 задач</div>
</div>
```

**В app.js showWelcome():** Обновить streak-count и today-count из ProgressTracker.

**CSS (в main.css):**
```css
.streak-banner {
  text-align: center;
  padding: 12px;
  margin: 8px 16px;
  border-radius: 12px;
  background: var(--card-bg);
}
.streak-days {
  font-size: 1.3em;
  font-weight: 700;
}
.daily-progress {
  font-size: 0.9em;
  color: var(--text-secondary);
  margin-top: 4px;
}
```

---

## Таск 5: Контекст в opening-trainer — позиция за столом + зона

**Файлы:**
- `js/trainers/opening-trainer.js` — показать позицию и зону, передать в opening.js
- `js/bidding/opening.js` — учитывать позицию (3-я рука = лёгкое открытие)
- `js/core/dealer.js` — расширить dealForOpening() для генерации с позицией

**В opening-trainer.js newProblem():**
```javascript
// Рандомная позиция (1-я, 2-я, 3-я, 4-я рука) и зона
const positions = ['1-я рука', '2-я рука', '3-я рука', '4-я рука'];
const zones = ['Никто', 'Мы', 'Они', 'Все'];
this.position = positions[Math.floor(Math.random() * 4)];
this.zone = zones[Math.floor(Math.random() * 4)];

// Показать в UI
contextEl.textContent = `${this.position}, зона: ${this.zone}`;
```

**В opening.js determineOpening():** Добавить опциональный параметр `options = { position, vulnerable }`:
- 3-я рука после двух пассов: можно открыть с 10-11 HCP (лёгкое открытие) если есть хорошая масть
- 4-я рука: не открывать preempt, правило "15" (HCP + длина ♠ >= 15)
- Зона "Мы": preempt осторожнее (увеличенные штрафы)
- Зона "Они": preempt агрессивнее

**ВАЖНО:** Не ломать существующее поведение. Если `options` не передан — работает как раньше (1-я рука, никто).

---

## Таск 6: Defense Trainer — выбор сноса

**Создать:** `js/trainers/defense-trainer.js`

**Суть:** Показать руку защитника (13 карт) + контракт + ход разыгрывающего → спросить "Какую карту сбросить/сыграть?"

**Сценарии (статические, как play-trainer):**

Создать `js/play/defense-scenarios.js` с массивом `DEFENSE_SCENARIOS`:

```javascript
export const DEFENSE_SCENARIOS = [
  {
    id: 'signal-1',
    title: 'Сигнал масти',
    category: 'signal',
    description: 'Партнёр зашёл ♠К. У вас ♠Т-7-3. Какую карту сыграть?',
    hand: { spades: ['Т', '7', '3'], hearts: ['В', '8', '5'], diamonds: ['10', '6', '4'], clubs: ['Д', '9', '2'] },
    partnerLead: '♠К',
    contract: '4♥',
    question: 'Какую пику сыграть?',
    options: ['♠Т (перехват)', '♠7 (поддержка)', '♠3 (отказ)'],
    correct: 1,
    explanation: 'Играйте ♠7 (высокую) — сигнал партнёру что у вас есть поддержка в масти...'
  },
  // ... ещё 7-8 сценариев: отзыв, лавинтал, подкладка, счёт руки
];
```

Категории: `signal` (сигнализация), `discard` (сброс), `count` (подсчёт руки), `duck-defense` (подкладка в защите).

**Формат тренажёра:** Как play-trainer — фильтр по категориям, карусель сценариев, multi-choice.

**Регистрация:**
- `js/app.js`: `defense: () => import('./trainers/defense-trainer.js')`
- `index.html`: `<div class="popup-item" data-module="defense">🛡️ Защита</div>`
- `service-worker.js`: добавить оба файла в ASSETS

---

## Таск 7: Variable Reward — рандомные поощрения

**Файлы:**
- `js/trainers/daily-mix.js` — добавить variable reward в showResults()
- Создать `data/bridge-facts.js` — массив интересных фактов о бридже

**Факты (15-20 штук):**
```javascript
export const BRIDGE_FACTS = [
  'Бридж — единственная карточная игра, признанная Международным олимпийским комитетом.',
  'Уоррен Баффет и Билл Гейтс — заядлые бриджисты. Они играют онлайн каждую неделю.',
  'В мире более 200 миллионов бриджистов.',
  'Первый чемпионат мира по бриджу прошёл в 1935 году.',
  // ...
];
```

**В daily-mix.js showResults():**
Добавить после основного результата:
```javascript
// Random reward
const rewards = [];

// Факт о бридже (30% шанс)
if (Math.random() < 0.3) {
  const fact = BRIDGE_FACTS[Math.floor(Math.random() * BRIDGE_FACTS.length)];
  rewards.push(`<div class="reward-fact">💡 ${fact}</div>`);
}

// Рекорд скорости (если avgTime < previous best)
if (avgTime < previousBest) {
  rewards.push(`<div class="reward-record">⚡ Рекорд скорости! ${avgTime}с в среднем</div>`);
}

// Сложная задача решена (если были SM-2 tasks и все правильно)
if (sm2Correct === sm2Total && sm2Total > 0) {
  rewards.push(`<div class="reward-mastery">🏆 Все задачи на повторение — правильно!</div>`);
}
```

**CSS:**
```css
.reward-fact, .reward-record, .reward-mastery {
  padding: 12px;
  margin: 8px 0;
  border-radius: 8px;
  background: var(--card-bg);
  border-left: 3px solid var(--accent);
}
```

---

## Таск 8: Push-уведомления PWA

**Создать:** `js/notifications.js`

**Суть:** Запрашивать разрешение на уведомления. Планировать напоминание через `setTimeout` или `setInterval` пока приложение открыто. Для настоящих push нужен backend — поэтому используем **local notifications** через `Notification API` + `visibilitychange`.

**Логика:**
```javascript
export class NotificationManager {
  static async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  }

  static scheduleReminder() {
    // Проверять каждый час, если есть due SM-2 items
    setInterval(() => {
      if (document.hidden && Notification.permission === 'granted') {
        const dueCount = ProgressTracker.getDueCount();
        if (dueCount > 0) {
          new Notification('🃏 Бридж-тренажёр', {
            body: `${dueCount} правил ждут повторения`,
            icon: './icons/icon-192.png',
            tag: 'bridge-reminder' // предотвращает дубликаты
          });
        }
      }
    }, 60 * 60 * 1000); // каждый час
  }
}
```

**В app.js:** После инициализации:
```javascript
import { NotificationManager } from './notifications.js';
// Запросить разрешение после первой тренировки (не сразу при открытии)
// Показать кнопку "Включить напоминания" на welcome screen
```

**В index.html:** Добавить кнопку на welcome screen:
```html
<button id="notify-btn" class="secondary-btn hidden">🔔 Включить напоминания</button>
```

Кнопка появляется только если: (1) браузер поддерживает Notification API, (2) разрешение ещё не запрошено, (3) пользователь решил хотя бы 10 задач.

**Регистрация:**
- `service-worker.js`: добавить `'./js/notifications.js'` в ASSETS

---

## Общие ограничения

- Не ломать существующую функциональность
- Русская терминология: Т/К/Д/В, ♠♥♦♣
- Mobile-first, тёмная тема
- localStorage — единственное хранилище
- Паттерн тренажёров (constructor, init, render, newProblem, checkAnswer, destroy)
- API-ключи только через env/proxy
- service-worker.js: обновить CACHE_NAME при каждом изменении ASSETS
