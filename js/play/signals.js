// Bridge Trainer — Defensive Signals (Lesson 10)
// Lead conventions and discard signals

export const LEAD_RULES = [
  { pattern: 'ТК...', rule: 'Из ТК → ходим тузом', example: 'Т♠ из ТК2♠' },
  { pattern: 'КДВ...', rule: 'Из КДВ → ходим королём', example: 'К♠ из КДВ10♠' },
  { pattern: 'КД...', rule: 'Из КД → ходим королём', example: 'К♠ из КД5♠' },
  { pattern: 'ДВ10...', rule: 'Из ДВ10 → ходим дамой', example: 'Д♠ из ДВ102♠' },
  { pattern: 'В10...', rule: 'Из В10 → ходим валетом', example: 'В♠ из В10♠' },
  { pattern: 'ТДВ10', rule: 'Внутренняя секвенция: ходим дамой', example: 'Д♠ из ТДВ10♠' },
  { pattern: 'КВ10...', rule: 'Внутренняя секвенция: ходим валетом', example: 'В♠ из КВ1032♠' },
  { pattern: 'Кxxx', rule: '4-я сверху из длинной масти', example: '5♠ из К1085♠' },
  { pattern: 'xxx', rule: 'Средняя из триплета (MUD)', example: '6♠ из К65♠' },
  { pattern: 'xx', rule: 'Старшая из дуплета', example: '9♠ из 93♠' },
];

export const DISCARD_RULES = [
  { rule: 'Малая карта = прошу ход в эту масть', example: '2♥ → «ходи в черву»' },
  { rule: 'Крупная карта = НЕ ходи в эту масть', example: '8♥ → «не ходи в черву»' },
];

export const ENCOURAGE_RULES = [
  { lead: 'Т (туз)', encourage: 'Д (дама) или дуплет', example: 'Партнёр пошёл Т♠, кладём Д♠' },
  { lead: 'К (король)', encourage: 'Т (туз) или В (валет)', example: 'Партнёр пошёл К♠, кладём В♠' },
  { lead: 'Д (дама)', encourage: 'Т (туз) или К (король)', example: 'Партнёр пошёл Д♠, кладём К♠' },
  { lead: 'мелкая', encourage: 'Т, К или Д', example: 'Партнёр пошёл 5♠, кладём Д♠ (поощрение)' },
];
