# Бриф: Фаза 3 — Качество кода (Code Quality Review)

## Что делаем и зачем
Три задачи для улучшения качества и единообразия кода:
1. Унифицировать формат opening key ('1H' vs '1♥') — убрать ручную конвертацию
2. Извлечь оставшиеся magic numbers в именованные константы
3. Добавить ESLint + Prettier конфигурацию

---

## Таск 1: Унифицировать формат opening key

**Проблема:** Два формата для одного и того же:
- dealer.js использует `'1H'`, `'1S'`, `'1NT'`, `'1C'`, `'1D'` (ASCII)
- response.js, response-trainer.js используют `'1♥'`, `'1♠'`, `'1БК'` (Unicode/русский)
- response-trainer.js вручную конвертирует между ними (строки ~88-95)

**Решение:** Стандартизировать на ASCII ('1H', '1S', '1NT', '1C', '1D', '2C', '2NT') для внутренней логики. Unicode/русский — только для отображения в UI.

**Что сделать:**

1. В `js/bidding/response.js`:
   - Функция `determineResponse(hand, openingType)` уже принимает и ASCII и Unicode. Проверить что она корректно обрабатывает ASCII keys ('1H', '1S' и т.д.)
   - Если нет — добавить маппинг в начале функции

2. В `js/trainers/response-trainer.js`:
   - Удалить ручную конвертацию (строки ~88-95 где символы ♥→H, ♠→S и т.д.)
   - Использовать единый формат при вызове dealForResponse()
   - Добавить маппинг для отображения: `OPENING_DISPLAY = { '1H': '1♥', '1S': '1♠', '1NT': '1БК', ... }`

3. В `js/trainers/mix/session-generator.js`:
   - Проверить RESPONSE_OPENINGS массив — привести к единому формату
   - Проверить _openingDisplayToKey() — возможно она станет не нужна

4. Создать маппинг в `js/core/constants.js`:
   ```javascript
   export const OPENING_KEYS = {
     '1H': { display: '1♥', suit: 'HEARTS' },
     '1S': { display: '1♠', suit: 'SPADES' },
     '1NT': { display: '1БК', suit: null },
     '1C': { display: '1♣', suit: 'CLUBS' },
     '1D': { display: '1♦', suit: 'DIAMONDS' },
     '2C': { display: '2♣', suit: 'CLUBS' },
     '2NT': { display: '2БК', suit: null },
     '2H': { display: '2♥', suit: 'HEARTS' },
     '2S': { display: '2♠', suit: 'SPADES' },
   };

   export function openingKeyToDisplay(key) {
     return OPENING_KEYS[key]?.display || key;
   }

   export function openingDisplayToKey(display) {
     for (const [key, val] of Object.entries(OPENING_KEYS)) {
       if (val.display === display) return key;
     }
     return display;
   }
   ```

**Файлы:** js/core/constants.js, js/bidding/response.js, js/trainers/response-trainer.js, js/trainers/mix/session-generator.js

---

## Таск 2: Magic numbers → именованные константы

**Файлы с оставшимися magic numbers:**

**js/trainers/daily-mix.js:**
- `100` (ms timeout для focus/scroll) в нескольких местах → `const FOCUS_DELAY = 100;`

**js/trainers/bidding-sim.js:**
- `300` (ms AI bid delay) → `const AI_BID_DELAY = 300;`

**js/core/dealer.js:**
- `10000` уже именован как MAX_ATTEMPTS ✓
- `0.3` (30% boundary chance) → `const BOUNDARY_CHANCE = 0.3;`

**js/trainers/hcp-trainer.js:**
- Тайминги таймера (5, 10, 15, 20, 30 секунд) — это UI-конфиг, оставить как есть

**js/trainers/mix/session-generator.js:**
- SESSION_SIZE, MAX_SM2_TASKS, MIN_MODULES — проверить что уже именованы

**Принцип:** именовать только числа, смысл которых неочевиден. `0`, `1`, `100%` — не трогать.

---

## Таск 3: Добавить ESLint + Prettier

**Что сделать:**

1. Создать `.eslintrc.json`:
```json
{
  "env": {
    "browser": true,
    "es2022": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-undef": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "eqeqeq": "error",
    "no-var": "error",
    "prefer-const": "warn"
  }
}
```

2. Создать `.prettierrc`:
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 120,
  "tabWidth": 2,
  "semi": true
}
```

3. Создать `.editorconfig`:
```ini
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

4. **НЕ запускать ESLint/Prettier на всём проекте** — только создать конфиги. Автоформатирование — отдельный шаг.

---

## Ограничения
- Не ломать функциональность
- Не запускать форматтер — только конфиги
- Opening key унификация: ASCII для логики, Unicode для UI
- Не менять service-worker.js (конфиги не кэшируются)
