// Bridge Trainer — Card, Hand, Deck, Deal classes
import { SUITS, SUIT_ORDER, MAJOR_SUITS, MINOR_SUITS, RANKS, RANK_VALUES, SEATS, NT, VULNERABILITY } from './constants.js';

export class Card {
  constructor(suitId, rankValue) {
    this.suitId = suitId;        // 'CLUBS', 'DIAMONDS', 'HEARTS', 'SPADES'
    this.rankValue = rankValue;  // 2-14
  }

  get suit() { return SUITS[this.suitId]; }
  get rank() { return RANKS[this.rankValue]; }
  get hcp() { return this.rank.hcp; }
  get display() { return `${this.rank.display}${this.suit.symbol}`; }
  get displayShort() { return `${this.rank.display}`; }
  get color() { return this.suit.color; }
  get isFaceCard() { return this.rankValue >= 11; }

  compareTo(other) {
    if (this.suitId !== other.suitId) {
      return SUITS[this.suitId].rank - SUITS[other.suitId].rank;
    }
    return this.rankValue - other.rankValue;
  }

  equals(other) {
    return this.suitId === other.suitId && this.rankValue === other.rankValue;
  }

  toString() { return this.display; }
}

export class Hand {
  constructor(cards) {
    if (cards.length !== 13) throw new Error(`Hand must have 13 cards, got ${cards.length}`);
    this.cards = [...cards].sort((a, b) => {
      // Sort by suit (spades first), then by rank (high first)
      const suitDiff = SUITS[b.suitId].rank - SUITS[a.suitId].rank;
      if (suitDiff !== 0) return suitDiff;
      return b.rankValue - a.rankValue;
    });
  }

  // --- HCP ---
  get hcp() {
    return this.cards.reduce((sum, c) => sum + c.hcp, 0);
  }

  // --- Distribution ---
  get distribution() {
    const dist = {};
    for (const s of SUIT_ORDER) dist[s] = 0;
    for (const c of this.cards) dist[c.suitId]++;
    return dist;
  }

  suitLength(suitId) {
    return this.cards.filter(c => c.suitId === suitId).length;
  }

  getSuitCards(suitId) {
    return this.cards.filter(c => c.suitId === suitId).sort((a, b) => b.rankValue - a.rankValue);
  }

  // Shape as sorted array [5,4,3,1]
  get shape() {
    const dist = this.distribution;
    return Object.values(dist).sort((a, b) => b - a);
  }

  // Shape string like "5431"
  get shapeString() {
    return this.shape.join('');
  }

  // --- Distribution Type ---
  get isBalanced() {
    const shape = this.shape;
    // No singletons, no voids, at most one doubleton
    if (shape[3] === 0) return false; // void
    if (shape[3] === 1) return false; // singleton
    // Count doubletons
    const doubletons = shape.filter(n => n === 2).length;
    return doubletons <= 1;
  }

  // --- Distribution Points (with fit found) ---
  get distributionPoints() {
    const dist = this.distribution;
    let points = 0;
    for (const s of SUIT_ORDER) {
      if (dist[s] === 0) points += 3;      // void (ренонс)
      else if (dist[s] === 1) points += 1;  // singleton (синглет)
      // doubleton: no extra points in this system
    }
    return points;
  }

  get totalPoints() {
    return this.hcp + this.distributionPoints;
  }

  // --- Major/Minor analysis ---
  has5PlusMajor() {
    return MAJOR_SUITS.some(s => this.suitLength(s) >= 5);
  }

  has4CardMajor() {
    return MAJOR_SUITS.some(s => this.suitLength(s) >= 4);
  }

  get longestMajor() {
    const spades = this.suitLength('SPADES');
    const hearts = this.suitLength('HEARTS');
    if (spades >= 5 && spades >= hearts) return 'SPADES';
    if (hearts >= 5 && hearts > spades) return 'HEARTS';
    if (spades >= 5) return 'SPADES';
    if (hearts >= 5) return 'HEARTS';
    return null;
  }

  get longestMajor4() {
    // For Stayman: return 4+ card major (prefer hearts for showing, spades checked by opener)
    const spades = this.suitLength('SPADES');
    const hearts = this.suitLength('HEARTS');
    if (spades >= 4 && hearts >= 4) return 'HEARTS'; // show hearts first, can check spades later
    if (spades >= 4) return 'SPADES';
    if (hearts >= 4) return 'HEARTS';
    return null;
  }

  get longestSuit() {
    const dist = this.distribution;
    let longest = 'CLUBS';
    for (const s of SUIT_ORDER) {
      if (dist[s] > dist[longest]) longest = s;
      else if (dist[s] === dist[longest] && SUITS[s].rank > SUITS[longest].rank) longest = s;
    }
    return longest;
  }

  get longestMinor() {
    const clubs = this.suitLength('CLUBS');
    const diamonds = this.suitLength('DIAMONDS');
    if (diamonds >= 5) return 'DIAMONDS'; // 5+ diamonds always opens 1♦
    if (clubs > diamonds) return 'CLUBS';
    if (diamonds > clubs) return 'DIAMONDS';
    // Equal length: choose stronger (more HCP)
    const clubHcp = this.getSuitCards('CLUBS').reduce((s, c) => s + c.hcp, 0);
    const diamondHcp = this.getSuitCards('DIAMONDS').reduce((s, c) => s + c.hcp, 0);
    return diamondHcp >= clubHcp ? 'DIAMONDS' : 'CLUBS';
  }

  // --- Stopper check (for NT) ---
  hasStopper(suitId) {
    const cards = this.getSuitCards(suitId);
    if (cards.length === 0) return false;
    const hasAce = cards.some(c => c.rankValue === 14);
    if (hasAce) return true;
    const hasKing = cards.some(c => c.rankValue === 13);
    if (hasKing && cards.length >= 2) return true;
    const hasQueen = cards.some(c => c.rankValue === 12);
    if (hasQueen && cards.length >= 3) return true;
    const hasJack = cards.some(c => c.rankValue === 11);
    if (hasJack && cards.length >= 4) return true;
    return false;
  }

  // --- Ace/King counting (for 2♣ response) ---
  get acesAndKingsHcp() {
    return this.cards.reduce((sum, c) => {
      if (c.rankValue === 14) return sum + 4; // Ace
      if (c.rankValue === 13) return sum + 3; // King
      return sum;
    }, 0);
  }

  countAces() {
    return this.cards.filter(c => c.rankValue === 14).length;
  }

  countKings() {
    return this.cards.filter(c => c.rankValue === 13).length;
  }

  // --- Preempt suitability ---
  hasGoodSuit(suitId, minLength) {
    const cards = this.getSuitCards(suitId);
    if (cards.length < minLength) return false;
    const suitHcp = cards.reduce((s, c) => s + c.hcp, 0);
    return suitHcp >= Math.floor(this.hcp / 2); // at least half the HCP in suit
  }

  // --- Lead analysis (Lesson 10) ---
  hasSequenceIn(suitId) {
    const cards = this.getSuitCards(suitId);
    if (cards.length < 2) return false;
    for (let i = 0; i < cards.length - 1; i++) {
      if (cards[i].rankValue - cards[i + 1].rankValue === 1 && cards[i].rankValue >= 11) {
        return true;
      }
    }
    return false;
  }

  get displayBySuit() {
    const result = {};
    for (const s of [...SUIT_ORDER].reverse()) { // Spades first
      result[s] = this.getSuitCards(s);
    }
    return result;
  }

  toString() {
    const parts = [];
    for (const s of [...SUIT_ORDER].reverse()) {
      const cards = this.getSuitCards(s);
      if (cards.length > 0) {
        parts.push(`${SUITS[s].symbol} ${cards.map(c => c.displayShort).join('')}`);
      } else {
        parts.push(`${SUITS[s].symbol} —`);
      }
    }
    return parts.join('  ');
  }
}

export class Deck {
  constructor() {
    this.cards = [];
    for (const suitId of SUIT_ORDER) {
      for (const rankValue of RANK_VALUES) {
        this.cards.push(new Card(suitId, rankValue));
      }
    }
  }

  shuffle() {
    // Fisher-Yates
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    return this;
  }

  deal() {
    this.shuffle();
    return {
      N: new Hand(this.cards.slice(0, 13)),
      E: new Hand(this.cards.slice(13, 26)),
      S: new Hand(this.cards.slice(26, 39)),
      W: new Hand(this.cards.slice(39, 52)),
    };
  }
}

export class Deal {
  constructor(hands, dealer = 'S', vulnerability = VULNERABILITY.NONE) {
    this.hands = hands;  // { N, E, S, W }
    this.dealer = dealer;
    this.vulnerability = vulnerability;
  }

  getHand(seat) {
    return this.hands[seat];
  }

  isVulnerable(seat) {
    if (seat === 'N' || seat === 'S') return this.vulnerability.ns;
    return this.vulnerability.ew;
  }

  static random(dealer = 'S', vulnerability = VULNERABILITY.NONE) {
    const deck = new Deck();
    const hands = deck.deal();
    return new Deal(hands, dealer, vulnerability);
  }
}
