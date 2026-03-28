// Bridge Trainer — Daily Mix Task Renderers
// Standalone functions for rendering each task type and attaching event handlers.
import { renderHand } from '../../ui/render.js';
import { ProgressTracker } from '../../progress/tracker.js';
import {
  pickRelevantBids, pickBinaryBids,
  ALL_OPENING_BIDS, ALL_RESPONSE_BIDS, BID_DISPLAY
} from '../../utils/bid-filter.js';

/**
 * Render a task into the given container and attach interaction handlers.
 * @param {Object} task - task object from session-generator
 * @param {HTMLElement} taskArea - DOM element to render into
 * @param {string} badgeHtml - pre-built task type badge HTML
 * @param {Function} onAnswer - callback(userAnswer) when user responds
 */
function renderTask(task, taskArea, badgeHtml, onAnswer) {
  switch (task.type) {
    case 'opening':
      taskArea.innerHTML = badgeHtml + _renderOpeningTask(task);
      break;
    case 'response':
      taskArea.innerHTML = badgeHtml + _renderResponseTask(task);
      break;
    case 'hcp':
      taskArea.innerHTML = badgeHtml + _renderHcpTask(task);
      break;
    case 'quiz':
      taskArea.innerHTML = badgeHtml + _renderQuizTask(task);
      break;
    case 'lead':
      taskArea.innerHTML = badgeHtml + _renderLeadTask(task);
      break;
    case 'tricks':
      taskArea.innerHTML = badgeHtml + _renderTricksTask(task);
      break;
    case 'defense':
      taskArea.innerHTML = badgeHtml + _renderDefenseTask(task);
      break;
  }
  _attachTaskHandlers(task, onAnswer);
}

function _renderOpeningTask(task) {
  const ev = task.handInfo;
  const openingStats = ProgressTracker.getStats('opening');
  const useBinary = openingStats.total > 5 && openingStats.accuracy < 50;
  const bids = useBinary
    ? pickBinaryBids(ALL_OPENING_BIDS, task.correctAnswer.bid)
    : pickRelevantBids(ALL_OPENING_BIDS, task.correctAnswer.bid, ev.hcp);
  return `
    <div class="card-area">
      <div class="card-area-title">Вы — сдающий. Ваша рука:</div>
      ${renderHand(task.hand)}
      <div class="text-muted mt-sm" style="font-size: 13px;">${ev.hcp} HCP | ${ev.shapeStr} | ${ev.distType}</div>
    </div>
    <div class="card-area">
      <div class="card-area-title">Ваше открытие:</div>
      <div class="bid-grid" id="task-bid-grid">
        ${bids.map(b => `<button class="bid-btn" data-bid="${b}">${BID_DISPLAY[b] || b}</button>`).join('')}
      </div>
    </div>
  `;
}

function _renderResponseTask(task) {
  const ev = task.handInfo;
  const responseStats = ProgressTracker.getStats('response');
  const useBinary = responseStats.total > 5 && responseStats.accuracy < 50;
  const bids = useBinary
    ? pickBinaryBids(ALL_RESPONSE_BIDS, task.correctAnswer.bid)
    : pickRelevantBids(ALL_RESPONSE_BIDS, task.correctAnswer.bid, ev.hcp);
  return `
    <div class="card-area">
      <div class="card-area-title">Партнёр открылся: <strong>${task.opening}</strong></div>
      <div class="card-area-title mt-sm">Ваша рука (Юг):</div>
      ${renderHand(task.hand)}
      <div class="text-muted mt-sm" style="font-size: 13px;">${ev.hcp} HCP | ${ev.shapeStr} | ${ev.distType}</div>
    </div>
    <div class="card-area">
      <div class="card-area-title">Ваш ответ:</div>
      <div class="bid-grid" id="task-bid-grid">
        ${bids.map(b => `<button class="bid-btn" data-bid="${b}">${BID_DISPLAY[b] || b}</button>`).join('')}
      </div>
    </div>
  `;
}

function _renderHcpTask(task) {
  return `
    <div class="card-area">
      <div class="card-area-title">Подсчитайте HCP в этой руке:</div>
      ${renderHand(task.hand)}
    </div>
    <div class="card-area">
      <div class="card-area-title">Сколько HCP?</div>
      <div class="flex gap-sm" style="align-items: center;">
        <input id="hcp-input" type="number" min="0" max="37" inputmode="numeric"
          style="width: 80px; font-size: 20px; padding: 10px; border-radius: 8px;
                 border: 2px solid var(--border); background: var(--bg-secondary);
                 color: var(--text-primary); text-align: center;"
          placeholder="0" aria-label="Ваш ответ" />
        <button class="btn btn-primary" id="hcp-submit-btn" style="min-height: 44px; padding: 10px 20px;">
          Ответить
        </button>
      </div>
    </div>
  `;
}

function _renderQuizTask(task) {
  const q = task.quiz;
  return `
    <div class="card-area">
      <div class="card-area-title">Занятие ${q.lesson} | Верно или нет?</div>
      <p style="font-size: 16px; line-height: 1.6; margin: 16px 0; font-weight: 500;">${q.statement}</p>
      <div class="flex gap-sm">
        <button class="bid-btn" data-answer="true" style="flex: 1; font-size: 18px; min-height: 44px;">Правда</button>
        <button class="bid-btn" data-answer="false" style="flex: 1; font-size: 18px; min-height: 44px;">Ложь</button>
      </div>
    </div>
  `;
}

function _renderLeadTask(task) {
  const { contract } = task;
  const contractInfo = contract.suit
    ? `Оппоненты играют ${contract.display}.`
    : `Оппоненты играют ${contract.display} (без козыря).`;

  return `
    <div class="card-area">
      <div class="card-area-title">${contractInfo}</div>
      <div class="card-area-title mt-sm">Ваша рука (Юг, на висте):</div>
      ${renderHand(task.hand)}
    </div>
    <div class="card-area">
      <div class="card-area-title">Выберите карту для первого хода:</div>
      <div id="lead-hand" class="hand-display">
        ${renderHand(task.hand, { clickable: true })}
      </div>
    </div>
  `;
}

function _renderTricksTask(task) {
  return `
    <div class="card-area">
      <div class="card-area-title">Ваша рука (Юг). Сколько верных взяток?</div>
      ${renderHand(task.hand)}
      <p class="text-muted" style="font-size:13px; margin-top:8px;">Верная взятка = непрерывная секвенция сверху (Т, Т-К, Т-К-Д…)</p>
    </div>
    <div class="card-area">
      <div class="card-area-title">Сколько верных взяток в этой руке?</div>
      <div class="flex gap-sm" style="align-items:center;">
        <input id="tricks-input" type="number" min="0" max="13" inputmode="numeric"
          style="width:80px; font-size:20px; padding:10px; border-radius:8px;
                 border:2px solid var(--border); background:var(--bg-secondary);
                 color:var(--text-primary); text-align:center;"
          placeholder="0" aria-label="Количество взяток" />
        <button class="btn btn-primary" id="tricks-submit-btn" style="min-height:44px; padding:10px 20px;">
          Ответить
        </button>
      </div>
    </div>
  `;
}

function _renderDefenseTask(task) {
  const { scenario } = task;
  const ctxLine = scenario.context
    ? `Контракт: ${scenario.context.contract || ''}${scenario.context.partnerLead ? ' · Ход партнёра: ' + scenario.context.partnerLead : ''}`
    : '';
  return `
    <div class="card-area">
      <div class="card-area-title">${scenario.title}</div>
      <p style="font-size:15px; line-height:1.6; margin:12px 0;">${scenario.description}</p>
      ${ctxLine ? `<p class="text-muted" style="font-size:13px;">${ctxLine}</p>` : ''}
    </div>
    <div class="card-area">
      <div class="card-area-title">${scenario.question}</div>
      <div id="defense-options" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
        ${scenario.options.map((opt, i) => `
          <button class="bid-btn" data-defense-idx="${i}" style="text-align:left; padding:10px 14px; font-size:14px; min-height:44px;">${opt}</button>
        `).join('')}
      </div>
    </div>
  `;
}

function _attachTaskHandlers(task, onAnswer) {
  switch (task.type) {
    case 'opening':
    case 'response': {
      const grid = document.getElementById('task-bid-grid');
      if (grid) {
        grid.querySelectorAll('.bid-btn').forEach(btn => {
          btn.addEventListener('click', () => onAnswer(btn.dataset.bid));
        });
      }
      break;
    }
    case 'hcp': {
      const submitBtn = document.getElementById('hcp-submit-btn');
      const input = document.getElementById('hcp-input');
      if (submitBtn && input) {
        const doCheck = () => {
          const val = parseInt(input.value, 10);
          if (!isNaN(val)) onAnswer(String(val));
        };
        submitBtn.addEventListener('click', doCheck);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') doCheck();
        });
        // Auto-focus input for quick entry
        setTimeout(() => input.focus(), 100);
      }
      break;
    }
    case 'quiz': {
      document.querySelectorAll('[data-answer]').forEach(btn => {
        btn.addEventListener('click', () => onAnswer(btn.dataset.answer));
      });
      break;
    }
    case 'lead': {
      const leadHand = document.getElementById('lead-hand');
      if (leadHand) {
        leadHand.addEventListener('click', (e) => {
          const chip = e.target.closest('.card-chip');
          if (!chip) return;
          onAnswer(`${chip.dataset.suit}:${chip.dataset.rank}`);
        });
      }
      break;
    }
    case 'tricks': {
      const submitBtn = document.getElementById('tricks-submit-btn');
      const input = document.getElementById('tricks-input');
      if (submitBtn && input) {
        const doCheck = () => {
          const val = parseInt(input.value, 10);
          if (!isNaN(val)) onAnswer(String(val));
        };
        submitBtn.addEventListener('click', doCheck);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doCheck(); });
        setTimeout(() => input.focus(), 100);
      }
      break;
    }
    case 'defense': {
      const optionsEl = document.getElementById('defense-options');
      if (optionsEl) {
        optionsEl.querySelectorAll('[data-defense-idx]').forEach(btn => {
          btn.addEventListener('click', () => onAnswer(btn.dataset.defenseIdx));
        });
      }
      break;
    }
  }
}

export { renderTask };
