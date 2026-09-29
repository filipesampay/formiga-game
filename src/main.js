import { newGame, update, pickLane, canPick, BOARD_W, BOARD_H, TUNNEL_H } from './game.js';
import { render, PALETTE } from './render.js';
import { colorCounts } from './board.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');
const slotsEl = document.getElementById('slots');
const lanesEl = document.getElementById('lanes');
const bar = document.getElementById('progress-bar');
const overlay = document.getElementById('overlay');

let state;
let total = 0;
let cell = 20;
let uiKey = '';

function start() {
  state = newGame(Date.now());
  total = colorCounts(state.board, state.colorCount).reduce((a, b) => a + b, 0);
  uiKey = '';
  overlay.hidden = true;
  resize();
}

function resize() {
  const rows = BOARD_H + TUNNEL_H;
  const r = stage.getBoundingClientRect();
  cell = Math.max(8, Math.floor(Math.min(r.width / BOARD_W, r.height / rows)));
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${cell * BOARD_W}px`;
  canvas.style.height = `${cell * rows}px`;
  canvas.width = Math.round(cell * BOARD_W * dpr);
  canvas.height = Math.round(cell * rows * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function syncUI() {
  const key = JSON.stringify([
    state.status,
    state.slots.map((b) => b && [b.id, b.remaining]),
    state.lanes.map((l) => l.length),
  ]);
  if (key === uiKey) return;
  uiKey = key;

  bar.style.width = `${(state.picked / total) * 100}%`;

  slotsEl.innerHTML = state.slots.map((b) => {
    if (!b) return '<div class="slot empty-lbl">livre</div>';
    const pct = (b.remaining / b.total) * 100;
    return `<div class="slot full" style="--c:${PALETTE[b.color]}">
      <span class="num">${b.remaining}</span><span class="lbl">🐜 em campo</span>
      <span class="fill" style="width:${pct}%"></span></div>`;
  }).join('');

  lanesEl.style.gridTemplateColumns = `repeat(${state.lanes.length}, 1fr)`;
  lanesEl.innerHTML = state.lanes.map((lane, i) => {
    if (!lane.length) return '<div class="lane"><div class="none"></div><div class="more"></div></div>';
    const [top, next] = lane;
    const dis = canPick(state, i) ? '' : 'disabled';
    return `<div class="lane">
      <button class="box" data-lane="${i}" ${dis} style="--c:${PALETTE[top.color]}">${top.total}<small>🐜</small></button>
      ${next ? `<div class="box peek" style="--c:${PALETTE[next.color]}">${next.total}</div>` : ''}
      <div class="more">${lane.length > 2 ? `+${lane.length - 2}` : ''}</div></div>`;
  }).join('');

  if (state.status !== 'playing' && overlay.hidden) {
    const won = state.status === 'won';
    document.getElementById('overlay-emoji').textContent = won ? '🎉' : '🐜💤';
    document.getElementById('overlay-title').textContent = won ? 'Açúcar limpo!' : 'Formigas travadas';
    document.getElementById('overlay-text').textContent = won
      ? 'As formigas levaram todos os cubos.'
      : `Sem caminho livre e sem espaço para novas cores. Levaram ${state.picked} de ${total} cubos.`;
    const ended = state;
    setTimeout(() => { if (state === ended) overlay.hidden = false; }, 500);
  }
}

lanesEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-lane]');
  if (!btn) return;
  if (pickLane(state, Number(btn.dataset.lane)) && navigator.vibrate) navigator.vibrate(10);
});
document.getElementById('restart').addEventListener('click', start);
document.getElementById('again').addEventListener('click', start);
window.addEventListener('resize', resize);
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  update(state, dt);
  syncUI();
  render(ctx, state, cell, now / 1000);
  requestAnimationFrame(frame);
}

start();
requestAnimationFrame(frame);
