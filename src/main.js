import { newGame, update, pickLane, canPick, TUNNEL_H } from './game.js';
import { render } from './render.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');
const slotsEl = document.getElementById('slots');
const lanesEl = document.getElementById('lanes');
const bar = document.getElementById('progress-bar');
const overlay = document.getElementById('overlay');
const levelEl = document.getElementById('level');
const againBtn = document.getElementById('again');

const SAVE_KEY = 'formigas.level';
let state;
let cell = 20;
let uiKey = '';

function loadLevel() {
  try {
    return Math.max(1, parseInt(localStorage.getItem(SAVE_KEY), 10) || 1);
  } catch {
    return 1;
  }
}

function saveLevel(level) {
  try {
    localStorage.setItem(SAVE_KEY, String(level));
  } catch {
    // modo privado do Safari: segue sem salvar
  }
}

function start(level) {
  saveLevel(level);
  state = newGame(level);
  levelEl.textContent = `Fase ${level} · ${state.name}`;
  uiKey = '';
  overlay.hidden = true;
  resize();
}

function resize() {
  const { w, h } = state.board;
  const rows = h + TUNNEL_H;
  const r = stage.getBoundingClientRect();
  cell = Math.max(8, Math.floor(Math.min(r.width / w, r.height / rows)));
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${cell * w}px`;
  canvas.style.height = `${cell * rows}px`;
  canvas.width = Math.round(cell * w * dpr);
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

  bar.style.width = `${(state.picked / state.total) * 100}%`;
  const palette = state.board.palette;

  slotsEl.innerHTML = state.slots.map((b) => {
    if (!b) return '<div class="slot empty-lbl">livre</div>';
    const pct = (b.remaining / b.total) * 100;
    return `<div class="slot full" style="--c:${palette[b.color]}">
      <span class="num">${b.remaining}</span><span class="lbl">🐜 em campo</span>
      <span class="fill" style="width:${pct}%"></span></div>`;
  }).join('');

  lanesEl.style.gridTemplateColumns = `repeat(${state.lanes.length}, 1fr)`;
  lanesEl.innerHTML = state.lanes.map((lane, i) => {
    if (!lane.length) return '<div class="lane"><div class="none"></div><div class="more"></div></div>';
    const [top, next] = lane;
    const dis = canPick(state, i) ? '' : 'disabled';
    return `<div class="lane">
      <button class="box" data-lane="${i}" ${dis} style="--c:${palette[top.color]}">${top.total}<small>🐜</small></button>
      ${next ? `<div class="box peek" style="--c:${palette[next.color]}">${next.total}</div>` : ''}
      <div class="more">${lane.length > 2 ? `+${lane.length - 2}` : ''}</div></div>`;
  }).join('');

  if (state.status !== 'playing' && overlay.hidden) {
    const won = state.status === 'won';
    document.getElementById('overlay-emoji').textContent = won ? '🎉' : '🐜💤';
    document.getElementById('overlay-title').textContent = won ? `Fase ${state.level} completa!` : 'Formigas travadas';
    document.getElementById('overlay-text').textContent = won
      ? `As formigas levaram o desenho inteiro: ${state.name}.`
      : `Sem caminho livre e sem espaço para novas cores. Levaram ${state.picked} de ${state.total} cubos.`;
    againBtn.textContent = won ? 'Próxima fase' : 'Tentar de novo';
    const ended = state;
    setTimeout(() => { if (state === ended) overlay.hidden = false; }, 500);
  }
}

lanesEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-lane]');
  if (!btn) return;
  if (pickLane(state, Number(btn.dataset.lane)) && navigator.vibrate) navigator.vibrate(10);
});
document.getElementById('restart').addEventListener('click', () => start(state.level));
againBtn.addEventListener('click', () => start(state.status === 'won' ? state.level + 1 : state.level));
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

start(loadLevel());
requestAnimationFrame(frame);
