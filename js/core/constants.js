// Bridge Trainer — Constants and Enums
// All bridge rules, scoring tables, and Russian terminology

export const SUITS = {
  CLUBS:    { id: 'CLUBS',    rank: 0, symbol: '♣', name: 'трефа',  nameGen: 'треф',   namePlural: 'трефы',   color: '#2e7d32', letter: 'т' },
  DIAMONDS: { id: 'DIAMONDS', rank: 1, symbol: '♦', name: 'бубна',  nameGen: 'бубен',  namePlural: 'бубны',   color: '#e65100', letter: 'б' },
  HEARTS:   { id: 'HEARTS',   rank: 2, symbol: '♥', name: 'черва',  nameGen: 'червей', namePlural: 'червы',   color: '#c62828', letter: 'ч' },
  SPADES:   { id: 'SPADES',   rank: 3, symbol: '♠', name: 'пика',   nameGen: 'пик',    namePlural: 'пики',    color: '#1565c0', letter: 'п' },
};

export const NT = { id: 'NT', rank: 4, symbol: 'БК', name: 'без козыря', color: '#555' };

export const SUIT_ORDER = ['CLUBS', 'DIAMONDS', 'HEARTS', 'SPADES'];
export const MAJOR_SUITS = ['HEARTS', 'SPADES'];
export const MINOR_SUITS = ['CLUBS', 'DIAMONDS'];

export const RANKS = {
  2:  { value: 2,  hcp: 0, display: '2',  name: 'двойка' },
  3:  { value: 3,  hcp: 0, display: '3',  name: 'тройка' },
  4:  { value: 4,  hcp: 0, display: '4',  name: 'четвёрка' },
  5:  { value: 5,  hcp: 0, display: '5',  name: 'пятёрка' },
  6:  { value: 6,  hcp: 0, display: '6',  name: 'шестёрка' },
  7:  { value: 7,  hcp: 0, display: '7',  name: 'семёрка' },
  8:  { value: 8,  hcp: 0, display: '8',  name: 'восьмёрка' },
  9:  { value: 9,  hcp: 0, display: '9',  name: 'девятка' },
  10: { value: 10, hcp: 0, display: '10', name: 'десятка' },
  11: { value: 11, hcp: 1, display: 'В',  name: 'валет' },
  12: { value: 12, hcp: 2, display: 'Д',  name: 'дама' },
  13: { value: 13, hcp: 3, display: 'К',  name: 'король' },
  14: { value: 14, hcp: 4, display: 'Т',  name: 'туз' },
};

export const RANK_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

// Seats
export const SEATS = ['N', 'E', 'S', 'W'];
export const SEAT_NAMES = { N: 'Север', E: 'Восток', S: 'Юг', W: 'Запад' };
export const NEXT_SEAT = { N: 'E', E: 'S', S: 'W', W: 'N' };
export const PARTNER_SEAT = { N: 'S', S: 'N', E: 'W', W: 'E' };

// Vulnerability
export const VULNERABILITY = {
  NONE: { id: 'NONE', name: 'никто не в зоне', ns: false, ew: false },
  NS:   { id: 'NS',   name: 'СЮ в зоне',      ns: true,  ew: false },
  EW:   { id: 'EW',   name: 'ЗВ в зоне',      ns: false, ew: true },
  BOTH: { id: 'BOTH', name: 'все в зоне',      ns: true,  ew: true },
};

// Points needed for contract levels (combined on line)
export const LEVEL_POINTS = {
  1: { min: 18, max: 19 },
  2: { min: 20, max: 21 },
  3: { min: 23, max: 24 },
  4: { min: 25, max: 26 },
  5: { min: 28, max: 29 },
  6: { min: 30, max: 33 },
  7: { min: 35, max: 37 },
};

// Game contracts
export const GAME_CONTRACTS = {
  MAJOR:    { level: 4, name: 'мажорный гейм (4♥/4♠)', points: 25 },
  NT:       { level: 3, name: 'бескозырный гейм (3БК)', points: 25 },
  MINOR:    { level: 5, name: 'минорный гейм (5♣/5♦)', points: 28 },
  SMALL_SLAM: { level: 6, name: 'малый шлем', points: 30 },
  GRAND_SLAM: { level: 7, name: 'большой шлем', points: 35 },
};

// Scoring (simplified, from lesson materials)
export const SCORING = {
  // Trick values
  TRICK_VALUE: {
    CLUBS: 20, DIAMONDS: 20, HEARTS: 30, SPADES: 30, NT_FIRST: 40, NT_SUBSEQUENT: 30,
  },
  // Game bonus (not vulnerable / vulnerable)
  GAME_BONUS:       { nv: 300, v: 500 },
  PARTIAL_BONUS:    { nv: 50,  v: 50 },
  SMALL_SLAM_BONUS: { nv: 500, v: 750 },
  GRAND_SLAM_BONUS: { nv: 1000, v: 1500 },
  // Undertrick penalties
  UNDERTRICK: {
    nv:      { first: 50,  subsequent: 50 },
    v:       { first: 100, subsequent: 100 },
    nv_dbl:  { first: 100, second: 200, subsequent: 300 },
    v_dbl:   { first: 200, second: 500, subsequent: 300 },
  },
};

// Bid types for bidding system
export const BID_TYPES = {
  PASS: 'pass',
  SUIT: 'suit',    // 1♣ through 7♠
  NT: 'nt',        // 1NT through 7NT
  DOUBLE: 'double',
  REDOUBLE: 'redouble',
};

// Special bids
export const SPECIAL_BIDS = {
  PASS: { type: 'pass', display: 'Пас', level: 0 },
  DOUBLE: { type: 'double', display: 'Контра (X)', level: 0 },
  REDOUBLE: { type: 'redouble', display: 'Реконтра (XX)', level: 0 },
};

// Opening bid ranges (from lessons)
export const OPENING_RANGES = {
  PASS:       { min: 0,  max: 11, description: 'Пас: менее 12 HCP' },
  ONE_MAJOR:  { min: 12, max: 21, description: '1 в мажоре: 12-21 HCP, 5+ карт' },
  ONE_NT:     { min: 15, max: 18, description: '1БК: 15-18 HCP, равномерный' },
  ONE_MINOR:  { min: 12, max: 21, description: '1 в миноре: 12-21 HCP' },
  TWO_NT:     { min: 19, max: 21, description: '2БК: 19-21 HCP, равномерный' },
  TWO_CLUBS:  { min: 22, max: 40, description: '2♣ ФГ: 22+ HCP или 9+ взяток' },
  WEAK_TWO:   { min: 6,  max: 10, description: 'Слабые 2: 6-10 HCP, 6 карт' },
  PREEMPT_3:  { min: 6,  max: 10, description: 'Блок 3: 6-10 HCP, 7 карт' },
  PREEMPT_4:  { min: 6,  max: 10, description: 'Блок 4: 6-10 HCP, 8-9 карт' },
};

// Response ranges after 1M opening
export const RESPONSE_1M_RANGES = {
  PASS:       { min: 0,  max: 5,  description: 'Пас: менее 6 HCP' },
  SIMPLE_RAISE: { min: 6, max: 9, description: 'Простой подъём (2М): 6-9 HCP, 3+ фит' },
  INVITE:     { min: 10, max: 11, description: 'Инвит (3М): 10-11 HCP, 3+ фит' },
  GAME:       { min: 12, max: 15, description: 'Гейм (4М): 12+ HCP, 3+ фит' },
};

// Response ranges after 1NT opening
export const RESPONSE_1NT_RANGES = {
  PASS:       { min: 0, max: 7,   description: 'Пас: 0-7 HCP, равномерный' },
  WEAK_SUIT:  { min: 0, max: 7,   description: 'Сброс 2♥/♠/♦: 0-7 HCP, 5+ в масти' },
  STAYMAN:    { min: 8, max: 40,  description: 'Стейман (2♣): 8+ HCP, 4 карты в мажоре' },
  INVITE_NT:  { min: 8, max: 9,   description: 'Инвит 2БК: 8-9 HCP, без мажорной 4' },
  GAME_NT:    { min: 10, max: 15, description: 'Гейм 3БК: 10-15 HCP' },
  SLAM_INVITE: { min: 16, max: 17, description: 'Инвит в шлем 4БК: 16-17 HCP' },
  SLAM:       { min: 18, max: 40, description: 'Шлем 6БК: 18+ HCP' },
};

// Overcall ranges
export const OVERCALL_RANGES = {
  SUIT:       { min: 12, max: 16, description: 'Вход мастью: 12-16 HCP, 5+ карт' },
  ONE_NT:     { min: 15, max: 18, description: 'Вход 1БК: 15-18, равномерный, с держкой' },
  TAKEOUT_DBL: { min: 12, max: 40, description: 'Вызывная контра: 12+ HCP, 3+ в неназванных' },
};

// Blackwood responses
export const BLACKWOOD_RESPONSES = {
  0: { bid: '5♣', display: '5♣ — 0 из 5' },
  1: { bid: '5♦', display: '5♦ — 1 из 5' },
  2: { bid: '5♥', display: '5♥ — 2 из 5' },
  3: { bid: '5♠', display: '5♠ — 3 из 5' },
  4: { bid: '5БК', display: '5БК — 4 из 5' },
};

// Opening key mappings — ASCII for logic, Unicode/Russian for display
export const OPENING_KEYS = {
  '1H':  { display: '1♥',  suit: 'HEARTS' },
  '1S':  { display: '1♠',  suit: 'SPADES' },
  '1NT': { display: '1БК', suit: null },
  '1C':  { display: '1♣',  suit: 'CLUBS' },
  '1D':  { display: '1♦',  suit: 'DIAMONDS' },
  '2C':  { display: '2♣',  suit: 'CLUBS' },
  '2NT': { display: '2БК', suit: null },
  '2H':  { display: '2♥',  suit: 'HEARTS' },
  '2S':  { display: '2♠',  suit: 'SPADES' },
};

/** Convert ASCII opening key to display string. Returns key unchanged if not found. */
export function openingKeyToDisplay(key) {
  return OPENING_KEYS[key]?.display || key;
}

/** Convert display string to ASCII opening key. Returns display unchanged if not found. */
export function openingDisplayToKey(display) {
  for (const [key, val] of Object.entries(OPENING_KEYS)) {
    if (val.display === display) return key;
  }
  return display;
}

// Lesson topics mapping
export const LESSONS = {
  1:  { name: 'Занятие 1',  topic: 'Основы: HCP, открытие 1М, фит, подъём' },
  2:  { name: 'Занятие 2',  topic: 'Гейм, инвит, очки за расклад' },
  3:  { name: 'Занятие 3',  topic: '1БК, Стейман, равномерные расклады' },
  4:  { name: 'Занятие 4',  topic: '1 в миноре, поиск фита после минора' },
  5:  { name: 'Занятие 5',  topic: 'Принципы натуральной торговли' },
  6:  { name: 'Занятие 6',  topic: 'Ответы без фита, вторая заявка' },
  7:  { name: 'Занятие 7',  topic: 'Контра, вызывная контра' },
  8:  { name: 'Занятие 8',  topic: '2БК, 2♣ ФГ, Блэквуд, шлемы' },
  9:  { name: 'Занятие 9',  topic: 'Блоки, доблокирование, защита' },
  10: { name: 'Занятие 10', topic: 'Вист: сигналы, первый ход, сносы' },
};
