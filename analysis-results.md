# Экспертный анализ: Системный код Bridge Trainer после 8 улучшений

**Дата:** 2026-03-28
**Тема:** Качество кода, баги, безопасность, утечки памяти — после внедрения 8 улучшений (+1698 строк, 19 файлов)

---

## Как я понял тему

Экспертный анализ качества системного кода Bridge Trainer после внедрения 8 улучшений. Фокус на runtime-стабильности, утечках памяти, безопасности innerHTML и консистентности между модулями.

---

## Эксперты

**Эксперт 1:** Lea Verou — веб-стандарты, vanilla JS, PWA-архитектура
*Почему:* Проект — чистый vanilla JS без фреймворков, все подводные камни innerHTML и DOM без safety net фреймворка.

**Эксперт 2:** Jake Archibald — Google Chrome DevRel, Service Workers, офлайн-first
*Почему:* PWA с кэшированием, Notification API, setInterval в фоне — территория Jake.

**Эксперт 3:** Matteo Collina — Node.js TSC, эксперт по утечкам памяти и производительности JS
*Почему:* Незачищенные таймеры, null-reference, отсутствие guard-ов — классические проблемы runtime-стабильности.

**Главный: Matteo Collina** — главные проблемы не фичи, а runtime-стабильность: незачищенный setInterval, null-reference при DOM-запросах, getAllStats() без новых модулей.

---

## Анализ от каждого эксперта

### Lea Verou — ключевые принципы

1. **innerHTML — вектор XSS** — defense-trainer.js и trick-trainer.js вставляют данные через template literals в innerHTML. Пока данные статичные — безопасно, но нет защиты на будущее.
2. **DOM-запросы без проверки** — querySelector('.stats-bar').outerHTML упадёт с TypeError если элемент не найден. Каждый querySelector должен проверяться на null.
3. **Некосистентные паттерны** — trick-trainer использует `if (!area) return`, defense-trainer — `if (feedbackArea) feedbackArea.innerHTML = ''`. Разные подходы к одной проблеме.

### Jake Archibald — ключевые принципы

1. **setInterval без cleanup = зомби-процесс** — notifications.js не хранит ID интервала и не даёт метод остановки.
2. **SW кэширует без валидации файлов** — 48 файлов в ASSETS, нет версионирования отдельных файлов.
3. **Notification API на iOS** — не проверяется navigator.standalone, кнопка будет показана в Safari но не сработает.

### Matteo Collina — ключевые принципы

1. **getAllStats() не знает о новых модулях** — хардкод 8 модулей, tricks и defense не включены. Daily Mix не видит их статистику.
2. **setTimeout без ссылки** — trick-trainer:246 и :367 создают таймеры без сохранения ID, утечка при destroy().
3. **SM-2 fallback** — _sm2ItemToTask() при неизвестном модуле создаёт opening-задачу. Tricks/defense SM-2 ошибки повторятся как opening.

---

## Конкретные баги

| Файл | Строки | Severity | Баг |
|------|--------|----------|-----|
| tracker.js | 117-124 | CRITICAL | getAllStats() не включает tricks, defense — Daily Mix не видит их статистику |
| notifications.js | 15-30 | CRITICAL | setInterval без хранения ID — зомби-таймер, нет stopReminder() |
| trick-trainer.js | 314-320 | HIGH | input.value.trim() без null-check на input |
| trick-trainer.js | 361 | HIGH | querySelector('.stats-bar').outerHTML без guard |
| defense-trainer.js | 121-130 | HIGH | innerHTML с данными сценариев без sanitize |
| defense-trainer.js | 63, 180 | HIGH | getElementById без null-check |
| trick-trainer.js | 246, 367 | MEDIUM | setTimeout не хранит ID, не чистит в destroy() |
| daily-mix.js | 101-110 | MEDIUM | _sm2ItemToTask fallback на opening для неизвестных модулей |
| app.js | 213-215 | MEDIUM | Нет проверки navigator.standalone для iOS |

---

## План действий

| # | Что сделать | Приоритет | Почему именно это | Ожидаемый эффект |
|---|-------------|-----------|-------------------|------------------|
| 1 | Добавить `tricks`, `defense` в getAllStats() tracker.js:117 | Высокий | Daily Mix не видит новые модули → не попадут в "слабые" | SM-2 работает для всех модулей |
| 2 | Хранить intervalId в notifications.js, добавить stopReminder() | Высокий | Часовой setInterval живёт вечно, утечка | Нет зомби-таймеров |
| 3 | Null guards на DOM-запросы в trick-trainer и defense-trainer | Высокий | TypeError при переключении модулей | Нет runtime-крашей |
| 4 | Хранить setTimeout ID в trick-trainer, чистить в destroy() | Высокий | Обращение к уничтоженному DOM | Чистый lifecycle |
| 5 | Добавить tricks/defense в _sm2ItemToTask() daily-mix.js | Средний | SM-2 повторение некорректно для новых модулей | Корректное повторение |
| 6 | Проверить navigator.standalone перед показом notify-btn | Средний | iOS Safari: кнопка есть, но не работает | Честный UI |
| 7 | Sanitize innerHTML в defense-trainer.js | Средний | Превентивная XSS-защита | Безопасный рендеринг |
| 8 | Единый паттерн null-check во всех тренажёрах | Низкий | 2 подхода в 2 файлах | Консистентный стиль |
