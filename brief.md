# Бриф: 5 фиксов по результатам Logic Review (2026-03-28)

## Что делаем и зачем
Logic Review выявил 3 FAIL и 2 важных WARN. Исправляем логические ошибки в бридж-правилах, UX-баги и проблемы целостности данных.

---

## Таск 1: respondTo1NT — порядок проверок 5+/6+ мажора

**Файл:** `js/bidding/response.js`, строки 136-139
**Проблема:** Проверки `>=5` стоят раньше `>=6`. Рука с 10+ HCP и 6 пиками получает 3♠ вместо 4♠ (гейм). Код никогда не доходит до проверки `>=6`.
**Фикс:** Поменять порядок — проверять 6+ перед 5+:
```javascript
// СНАЧАЛА 6+ (гейм), потом 5+ (форсинг)
if (hcp >= 10 && hand.suitLength('SPADES') >= 6) return res('4♠', ...);
if (hcp >= 10 && hand.suitLength('HEARTS') >= 6) return res('4♥', ...);
if (hcp >= 10 && hand.suitLength('SPADES') >= 5) return res('3♠', ...);
if (hcp >= 10 && hand.suitLength('HEARTS') >= 5) return res('3♥', ...);
```

---

## Таск 2: NaN guard в hcp-trainer

**Файл:** `js/trainers/hcp-trainer.js`, метод checkAnswer
**Проблема:** `parseInt("")` = NaN. При пустом вводе или нечисловом — записывается как ошибка, в фидбеке отображается "NaN".
**Фикс:** Добавить `isNaN` проверку для всех числовых case (Q_HCP, Q_DIST, Q_TOTAL):
```javascript
case Q_HCP: {
  const input = document.getElementById('answer-input');
  userAnswer = parseInt(input.value);
  if (isNaN(userAnswer)) return;  // <-- добавить
  correctAnswer = this.evaluation.hcp;
  // ...
}
```
Аналогично для Q_DIST и Q_TOTAL.

---

## Таск 3: beforeunload flush в app.js

**Файл:** `js/app.js`
**Проблема:** Debounce 500ms в saveData() — при закрытии вкладки последний ответ может потеряться.
**Фикс:** Добавить в app.js после инициализации:
```javascript
window.addEventListener('beforeunload', () => {
  ProgressTracker.flush();
});
```

---

## Таск 4: Math.random position fix в opening-trainer

**Файл:** `js/trainers/opening-trainer.js`, строка 79
**Проблема:** `Math.ceil(Math.random() * 4)` — при `Math.random() === 0` даёт `Math.ceil(0) = 0`. Position 0 невалидна.
**Фикс:**
```javascript
this.position = Math.floor(Math.random() * 4) + 1;
```

---

## Таск 5: resetModule() должен чистить SM-2 items

**Файл:** `js/progress/tracker.js`, метод resetModule()
**Проблема:** Удаляет только progress модуля, но SM-2 items остаются → задачи продолжают появляться в daily-mix.
**Фикс:**
```javascript
resetModule(moduleId) {
  const data = loadData();
  delete data[moduleId];
  saveData(data);
  // Also remove SM-2 items for this module
  const sm2 = loadSM2Data();
  sm2.items = sm2.items.filter(i => i.module !== moduleId);
  saveSM2Data(sm2);
}
```

---

## Ограничения
- Минимальные изменения — только фиксы, не рефакторинг
- Не ломать существующую функциональность
- Не ломать CSP
