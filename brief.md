# Бриф: Фаза 1 — Быстрые победы (Code Quality Review)

## Что делаем и зачем
Удаляем мёртвый код, неиспользуемые импорты/экспорты, вынесим магические строки в константы. По результатам Code Quality Review — 9 мёртвых экспортов, 11 неиспользуемых импортов, 2 мёртвых файла.

---

## Таск 1: Удалить неиспользуемые импорты (11 штук)

| Файл | Убрать импорт |
|------|--------------|
| js/trainers/opening-trainer.js | `Deal` из card.js, `getOpeningOptions` из opening.js |
| js/trainers/response-trainer.js | `getResponseOptions` из response.js |
| js/trainers/convention-drill.js | `SUIT_ORDER` из constants.js, `staymanRebid` и `canTakeoutDouble` из conventions.js |
| js/trainers/lead-trainer.js | `SUIT_ORDER` из constants.js |
| js/app.js | `SUIT_ORDER` из constants.js |
| js/core/card.js | `NT` и `SEATS` из constants.js |
| js/bidding/sequence.js | `SUIT_ORDER` из constants.js |

**ВАЖНО:** Не удалять используемые импорты из той же строки! Прочитай файл, проверь что именно используется.

---

## Таск 2: Удалить мёртвые экспорты (9 штук)

| Файл | Удалить функцию/экспорт |
|------|------------------------|
| js/bidding/opening.js | `getOpeningOptions()` |
| js/bidding/response.js | `getResponseOptions()` |
| js/bidding/conventions.js | `blackwoodDecision()`, `isDoubleType()` |
| js/core/evaluator.js | `describeHand()`, `getOpeningQualification()` |

**ВАЖНО:** Перед удалением — grep по проекту чтобы убедиться что функция нигде не используется.

---

## Таск 3: Убрать мёртвые файлы из SW кэша

В service-worker.js удалить из ASSETS:
- `'./js/play/signals.js'` (если есть)
- `'./js/trainers/base-trainer.js'` (если есть)

Сами файлы НЕ удалять. Обновить CACHE_NAME (инкрементировать версию).

---

## Таск 4: Вынести магические значения в константы

**Файл:** js/progress/tracker.js — добавить константы и заменить bare numbers:
```
ONBOARDING_KEY = 'bridge-onboarding'
MAX_RESULTS = 500
MAX_SM2_ITEMS = 200
DEBOUNCE_MS = 500
MS_PER_DAY = 86400000
SM2_GRADUATION_DAYS = 30
SM2_MIN_EASE = 1.3
SM2_DEFAULT_EASE = 2.5
```

Экспортировать ONBOARDING_KEY и импортировать в js/app.js и js/progress/progress-view.js (заменить хардкод 'bridge-onboarding').

---

## Таск 5: Удалить debug console.log

js/sw-register.js строка 5: удалить `console.log('SW registered:', reg.scope)`.

---

## Ограничения
- Не ломать функциональность
- Grep перед каждым удалением
- Обновить CACHE_NAME в service-worker.js
