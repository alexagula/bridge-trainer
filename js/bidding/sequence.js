// Bridge Trainer — Bidding Sequence State Machine
import { NEXT_SEAT, PARTNER_SEAT, SUITS, SUIT_ORDER } from '../core/constants.js';
import { determineOpening } from './opening.js';
import { determineResponse } from './response.js';
import { determineOvercall } from './overcall.js';

export class BiddingSequence {
  constructor(deal) {
    this.deal = deal;
    this.bids = [];        // [{seat, bid, display}]
    this.currentSeat = deal.dealer;
    this.passCount = 0;
    this.contract = null;
    this.declarer = null;
    this.firstBidder = null; // first non-pass bidder
    this.lastBid = null;     // last non-pass bid
  }

  get isComplete() {
    if (this.bids.length < 4 && this.passCount < 4) return false;
    return this.passCount >= 3 && this.bids.length >= 1;
  }

  makeBid(seat, bid) {
    const display = bid === 'пас' ? 'Пас' : bid;
    this.bids.push({ seat, bid, display });

    if (bid === 'пас') {
      this.passCount++;
    } else {
      this.passCount = 0;
      this.lastBid = bid;
      if (!this.firstBidder) this.firstBidder = seat;
    }

    if (this.isComplete) {
      this.contract = this.lastBid || null;
      this.declarer = this.findDeclarer();
    }

    this.currentSeat = NEXT_SEAT[seat];
  }

  findDeclarer() {
    if (!this.lastBid) return null;
    // Declarer is the first player on the declaring side who bid the trump suit
    const declaringSide = [];
    for (const b of this.bids) {
      if (b.bid !== 'пас' && b.bid !== 'контра' && b.bid !== 'реконтра') {
        declaringSide.push(b);
      }
    }
    if (declaringSide.length === 0) return null;
    const lastNonPass = declaringSide[declaringSide.length - 1];
    return lastNonPass.seat;
  }

  /**
   * Get AI bid for a computer seat
   */
  getAIBid(seat) {
    const hand = this.deal.getHand(seat);
    const partner = PARTNER_SEAT[seat];

    // First round: no bids yet from anyone
    if (this.bids.length === 0 || this.bids.every(b => b.bid === 'пас')) {
      // Opening position
      const opening = determineOpening(hand);
      return opening.bid;
    }

    // Find partner's last bid and opponent's last bid
    const partnerBids = this.bids.filter(b => b.seat === partner && b.bid !== 'пас');
    const opponentBids = this.bids.filter(b =>
      b.seat !== seat && b.seat !== partner && b.bid !== 'пас'
    );

    // Partner opened?
    if (partnerBids.length > 0 && opponentBids.length === 0) {
      const partnerOpening = partnerBids[0].bid;
      const response = determineResponse(partnerOpening, hand);
      return response.bid;
    }

    // Opponent opened, we haven't bid
    if (opponentBids.length > 0 && partnerBids.length === 0) {
      const myBids = this.bids.filter(b => b.seat === seat && b.bid !== 'пас');
      if (myBids.length === 0) {
        const overcall = determineOvercall(hand, opponentBids[0].bid);
        return overcall.bid;
      }
    }

    // Default: pass
    return 'пас';
  }

  /**
   * Get the recommended bid for training (with explanation)
   */
  getRecommendedBid(seat) {
    const hand = this.deal.getHand(seat);
    const partner = PARTNER_SEAT[seat];
    const partnerBids = this.bids.filter(b => b.seat === partner && b.bid !== 'пас');
    const opponentBids = this.bids.filter(b =>
      b.seat !== seat && b.seat !== partner && b.bid !== 'пас'
    );

    if (this.bids.every(b => b.bid === 'пас') || this.bids.length === 0) {
      return determineOpening(hand);
    }

    if (partnerBids.length > 0) {
      return determineResponse(partnerBids[0].bid, hand);
    }

    if (opponentBids.length > 0) {
      return determineOvercall(hand, opponentBids[0].bid);
    }

    return { bid: 'пас', reason: 'Пас по умолчанию', steps: [] };
  }

  getBiddingHistory() {
    return this.bids;
  }
}
