// Bridge Trainer — Bidding Sequence State Machine
import { NEXT_SEAT, PARTNER_SEAT, SUITS } from '../core/constants.js';
import { determineOpening } from './opening.js';
import { determineResponse } from './response.js';
import { determineOvercall } from './overcall.js';
import { determineRebid } from './rebid.js';

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

    // 1. Find final contract (last non-pass, non-double bid)
    const realBids = this.bids.filter(
      b => b.bid !== 'пас' && b.bid !== 'контра' && b.bid !== 'реконтра'
    );
    if (realBids.length === 0) return null;

    const finalBid = realBids[realBids.length - 1];

    // 2. Extract suit/strain from final contract (e.g. '4♠' → '♠', '3БК' → 'БК')
    const contractStrain = finalBid.bid.replace(/^[1-7]/, '');

    // 3. Determine winning side (N-S or E-W)
    const nsSide = ['N', 'S'];
    const ewSide = ['E', 'W'];
    const winningSide = nsSide.includes(finalBid.seat) ? nsSide : ewSide;

    // 4. Find FIRST player on winning side who bid this strain
    for (const b of this.bids) {
      if (b.bid === 'пас' || b.bid === 'контра' || b.bid === 'реконтра') continue;
      const strain = b.bid.replace(/^[1-7]/, '');
      if (strain === contractStrain && winningSide.includes(b.seat)) {
        return b.seat;
      }
    }

    // Fallback
    return finalBid.seat;
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
    const myBids = this.bids.filter(b => b.seat === seat && b.bid !== 'пас');

    // I opened and partner has responded — time to rebid
    if (myBids.length > 0 && partnerBids.length > 0 && opponentBids.length === 0) {
      const myOpening = myBids[0].bid;
      const partnerResponse = partnerBids[partnerBids.length - 1].bid;
      const rebidResult = determineRebid(hand, myOpening, partnerResponse);
      // For 2♣ FG: never pass until game is reached
      if (myOpening === '2♣' && rebidResult.bid === 'пас') {
        // Force a 3NT minimum if we somehow got a pass suggestion
        return '3БК';
      }
      return rebidResult.bid;
    }

    // Partner opened?
    if (partnerBids.length > 0 && opponentBids.length === 0 && myBids.length === 0) {
      const partnerOpening = partnerBids[0].bid;
      const response = determineResponse(partnerOpening, hand);
      return response.bid;
    }

    // Opponent opened, we haven't bid
    if (opponentBids.length > 0 && partnerBids.length === 0) {
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
    const myBids = this.bids.filter(b => b.seat === seat && b.bid !== 'пас');

    if (this.bids.every(b => b.bid === 'пас') || this.bids.length === 0) {
      return determineOpening(hand);
    }

    // I opened and partner has responded — return rebid with explanation
    if (myBids.length > 0 && partnerBids.length > 0 && opponentBids.length === 0) {
      const myOpening = myBids[0].bid;
      const partnerResponse = partnerBids[partnerBids.length - 1].bid;
      const rebidResult = determineRebid(hand, myOpening, partnerResponse);
      // For 2♣ FG: never pass until game is reached
      if (myOpening === '2♣' && rebidResult.bid === 'пас') {
        return { bid: '3БК', bidDisplay: '3БК', reason: '2♣ ФГ: нельзя пасовать до гейма → 3БК', lessonRef: 8, steps: rebidResult.steps };
      }
      return rebidResult;
    }

    // Partner opened and I haven't responded yet
    if (partnerBids.length > 0 && myBids.length === 0) {
      return determineResponse(partnerBids[0].bid, hand);
    }

    if (opponentBids.length > 0 && myBids.length === 0) {
      return determineOvercall(hand, opponentBids[0].bid);
    }

    return { bid: 'пас', bidDisplay: 'Пас', reason: 'Пас по умолчанию', lessonRef: 1, steps: [] };
  }

  getBiddingHistory() {
    return this.bids;
  }
}
