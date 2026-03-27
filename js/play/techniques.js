// Bridge Trainer — Play Techniques: scenarios for finesse, expas, ruff
// Lesson 2 (suit development), Lesson 5 (ruff), Lesson 6 (finesse/expas)

/**
 * Pre-built play scenarios. Each scenario has:
 * - title, description
 * - north/south hands (partial, relevant suits only)
 * - correctPlay: which card to play
 * - explanation
 */
export const PLAY_SCENARIOS = [
  // === FINESSE (Импас) ===
  {
    id: 'finesse-1',
    title: 'Импас дамой',
    category: 'finesse',
    lesson: 6,
    description: 'Вы — Юг, разыгрываете 3БК. Нужно взять максимум взяток в пике.',
    north: { spades: ['К', 'Д', 'В', '2'], hearts: ['4', '3', '2'] },
    south: { spades: ['В', '5', '4', '3'], hearts: ['Т', 'Д', 'В', '10', '9'] },
    question: 'С какой руки начать розыгрыш пик?',
    options: ['С руки (Юга)', 'Со стола (Севера)'],
    correct: 0,
    explanation: 'Начинайте с руки — играйте В♠. Если Запад положит мелкую, кладите мелкую со стола. Если В♠ возьмёт взятку, повторите импас. Так вы попытаетесь поймать Т♠ у Запада.',
  },
  {
    id: 'finesse-2',
    title: 'Импас к даме',
    category: 'finesse',
    lesson: 6,
    description: 'Разыгрываете контракт без козыря. Как разыграть бубну?',
    north: { diamonds: ['Т', 'Д', 'В', '10', '9'] },
    south: { diamonds: ['8', '7', '2'] },
    question: 'Как взять максимум взяток в бубне?',
    options: ['Играть Т♦ со стола', 'Играть мелкую к Д♦', 'Играть мелкую от Юга'],
    correct: 2,
    explanation: 'Играйте мелкую от Юга к секвенции ТДВЮ9 на столе. Если Восток положит К♦, Т♦ возьмёт. Если Восток положит мелкую, ставьте Д♦ (или В♦). Так вы возьмёте все 5 взяток, если К♦ у Востока.',
  },
  // === EXPAS (Экспас) ===
  {
    id: 'expas-1',
    title: 'Экспас к королю',
    category: 'expas',
    lesson: 6,
    description: 'Вы — Юг. Как разыграть бубну, если у вас К♦?',
    north: { diamonds: ['6', '5', '4'] },
    south: { diamonds: ['К', '8', '7'] },
    question: 'С какой руки играть в бубну?',
    options: ['Играть К♦ от Юга', 'Играть мелкую от Севера к К♦'],
    correct: 1,
    explanation: 'Экспас: играйте мелкую от Севера к К♦. Если Т♦ у Востока, К♦ пройдёт мимо него. Если Т♦ у Запада, К♦ всё равно проиграет.',
  },
  // === SUIT DEVELOPMENT (Разработка масти) ===
  {
    id: 'develop-1',
    title: 'Разработка масти',
    category: 'develop',
    lesson: 2,
    description: '3БК. У вас и партнёра 8 карт в черве с ТКД. Сколько взяток вы возьмёте?',
    north: { hearts: ['К', 'Д', 'В', '5', '4', '3'] },
    south: { hearts: ['Т', 'К', 'Д', '2'] },
    question: 'Если черва делится 3-2 у оппонентов, сколько взяток вы возьмёте?',
    options: ['5 взяток', '6 взяток', '7 взяток', '8 взяток'],
    correct: 3,
    explanation: 'При раскладе 3-2 у оппонентов (наиболее вероятный) вы возьмёте все 8 взяток: 3 верхние + 5 с разработки длинной масти.',
  },
  // === RUFF (Убитка) ===
  {
    id: 'ruff-1',
    title: 'Убитка коротким козырем',
    category: 'ruff',
    lesson: 5,
    description: '4♠. У вас синглет бубна на столе и козыри в руке.',
    north: { spades: ['К', '8', '7', '6'], diamonds: ['Т'], clubs: ['7', '5', '4', '3'] },
    south: { spades: ['Т', '10', '9', '4'], hearts: ['Д', 'В', '10'], diamonds: ['7', '5', '4'] },
    question: 'Что делать после того, как вистующие отдали ход?',
    options: ['Собирать козырей', 'Разыграть бубну и убить бубну на столе'],
    correct: 1,
    explanation: 'Убитка коротким козырем (на столе) даёт дополнительные взятки! Сначала кешируйте Т♦, потом играйте бубну к убитке на столе, и только потом собирайте козырей.',
  },
  {
    id: 'ruff-2',
    title: 'Не бить длинным козырем',
    category: 'ruff',
    lesson: 5,
    description: '4♠. У вас 5 козырей в руке. Стоит ли бить мелкую бубну козырем?',
    north: { spades: ['Д', '10', '9'] },
    south: { spades: ['Т', 'К', 'В', '8', '7'], diamonds: ['К', '9', '5'] },
    question: 'Оппоненты играют бубну. Бить козырем с длинной руки?',
    options: ['Да, убить козырем', 'Нет, сбросить мелкую'],
    correct: 1,
    explanation: 'Убитка длинным козырем НЕ даёт дополнительных взяток! Ваши 5 козырей и так возьмут 5 взяток. Убив бубну, вы потеряете козырь и не получите лишней взятки.',
  },
];

export function getScenariosByCategory(category) {
  if (!category || category === 'all') return PLAY_SCENARIOS;
  return PLAY_SCENARIOS.filter(s => s.category === category);
}

export function getScenarioCategories() {
  return [
    { id: 'all', name: 'Все' },
    { id: 'finesse', name: 'Импас' },
    { id: 'expas', name: 'Экспас' },
    { id: 'develop', name: 'Разработка' },
    { id: 'ruff', name: 'Убитка' },
  ];
}
