// Bridge Trainer — Shared UI render helpers
import { SUITS } from '../core/constants.js';

/**
 * Render a hand as HTML (suit rows with card chips)
 * @param {Hand} hand
 * @param {object} options
 * @returns {string}
 */
export function renderHand(hand, options = {}) {
  const { clickable = false, onCardClick = null, selectedCards = [] } = options;
  const bySuit = hand.displayBySuit;
  const suitOrder = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];

  let html = '<div class="hand-display">';
  for (const suitId of suitOrder) {
    const suit = SUITS[suitId];
    const cards = bySuit[suitId] || [];
    const suitClass = suitId.toLowerCase();

    html += `<div class="suit-row">`;
    html += `<span class="suit-symbol ${suitClass}">${suit.symbol}</span>`;
    html += `<div class="suit-cards">`;

    if (cards.length === 0) {
      html += `<span class="suit-empty">—</span>`;
    } else {
      for (const card of cards) {
        const isSelected = selectedCards.some(c => c.equals(card));
        const face = card.isFaceCard ? ' face' : '';
        const click = clickable ? ' clickable' : '';
        const sel = isSelected ? ' selected' : '';
        const dataAttr = clickable ? ` data-suit="${card.suitId}" data-rank="${card.rankValue}"` : '';
        const tag = clickable ? 'button' : 'span';
        html += `<${tag} class="card-chip ${suitClass}${face}${click}${sel}"${dataAttr}>${card.displayShort}</${tag}>`;
      }
    }

    html += `</div></div>`;
  }
  html += '</div>';
  return html;
}

/**
 * Render stats bar
 * @param {object} stats
 * @returns {string}
 */
export function renderStats(stats) {
  return `
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">${stats.total}</span>
        <span class="stat-label">Всего</span>
      </div>
      <div class="stat-item">
        <span class="stat-value" style="color: var(--success)">${stats.accuracy}%</span>
        <span class="stat-label">Точность</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${stats.streak}</span>
        <span class="stat-label">Серия</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${stats.bestStreak}</span>
        <span class="stat-label">Рекорд</span>
      </div>
    </div>
  `;
}
