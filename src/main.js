import { newGame, update, pickLane, canPick, TUNNEL_H } from './game.js';
import { render, burst, clearParticles, drawThumb } from './render.js';
import * as sfx from './audio.js';

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const stage = $('stage');
const slotsEl = $('slots');
const lanesEl = $('lanes');
const bar = $('progress-bar');
const overlay = $('overlay');
const againBtn = $('again');
const soundBtn = $('sound');
const banner = $('banner');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const SAVE_KEY = 'formigas.level';
const ANT_ICON = '<svg class="ant" aria-hidden="true"><use href="#ant"/></svg>';

let state;
let cell = 20;
let dpr = 1;
let slotsKey = '';
let lanesKey = '';

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
  clearParticles();
  $('level-num').textContent = level;
  $('level-name').textContent = state.name;
  slotsKey = '';
  lanesKey = '';
  overlay.hidden = true;
  banner.hidden = false;
  banner.innerHTML = `<b>Fase ${level}</b><span>${state.name}</span>`;
  banner.style.animation = 'none';
  void banner.offsetWidth; // reinicia a animação
  banner.style.animation = '';
  resize();
}

function resize() {
  const { w, h } = state.board;
  const rows = h + TUNNEL_H;
  const r = stage.getBoundingClientRect();
  cell = Math.max(8, Math.floor(Math.min(r.width / w, r.height / rows)));
  dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.style.width = `${cell * w}px`;
  canvas.style.height = `${cell * rows}px`;
  canvas.width = Math.round(cell * w * dpr);
  canvas.height = Math.round(cell * rows * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ---------- interface ----------
// Colunas só são refeitas quando mudam de verdade: refazer o HTML no meio de um toque
// fazia o botão sumir entre o dedo encostar e soltar, e o toque se perdia.
function syncUI() {
  const palette = state.board.palette;
  bar.style.width = `${(state.picked / state.total) * 100}%`;

  const sk = JSON.stringify(state.slots.map((b) => b && [b.id, b.remaining]));
  if (sk !== slotsKey) {
    slotsKey = sk;
    state.slots.forEach((b, i) => {
      let el = slotsEl.children[i];
      if (!el) {
        el = document.createElement('div');
        slotsEl.appendChild(el);
      }
      if (!b) {
        el.className = 'slot empty';
        el.innerHTML = '';
        el.removeAttribute('style');
        el.dataset.id = '';
        return;
      }
      if (el.dataset.id !== String(b.id)) {
        el.dataset.id = b.id;
        el.className = 'slot full';
        el.style.setProperty('--c', palette[b.color]);
        el.innerHTML = `${ANT_ICON}<span class="num"></span><span class="fill"></span>`;
      }
      el.querySelector('.num').textContent = b.remaining;
      el.querySelector('.fill').style.width = `${(b.remaining / b.total) * 100}%`;
    });
  }

  const lk = JSON.stringify([state.status, state.lanes.map((l, i) => [l.length, canPick(state, i)])]);
  if (lk !== lanesKey) {
    lanesKey = lk;
    lanesEl.style.gridTemplateColumns = `repeat(${state.lanes.length}, 1fr)`;
    lanesEl.innerHTML = state.lanes.map((lane, i) => {
      if (!lane.length) return '<div class="lane"><div class="lane-empty"></div><div class="lane-count"></div></div>';
      const [top, next] = lane;
      const off = canPick(state, i) ? '' : ' aria-disabled="true"';
      return `<div class="lane">
        <button class="box" data-lane="${i}" style="--c:${palette[top.color]}"${off}
          aria-label="${top.total} formigas">${ANT_ICON}<span class="num">${top.total}</span></button>
        ${next ? `<div class="peek" style="--c:${palette[next.color]}">${next.total}</div>` : '<div class="peek" style="opacity:0"></div>'}
        <div class="lane-count">${lane.length > 2 ? `+${lane.length - 2} caixas` : ''}</div></div>`;
    }).join('');
  }
}

function flyToSlot(fromRect, slotIndex, color) {
  if (reducedMotion.matches) return;
  const to = slotsEl.children[slotIndex]?.getBoundingClientRect();
  if (!to) return;
  const el = document.createElement('div');
  el.className = 'fly';
  el.style.cssText = `--c:${color};left:${fromRect.left}px;top:${fromRect.top}px;width:${fromRect.width}px;height:${fromRect.height}px`;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    const sx = to.width / fromRect.width;
    const sy = to.height / fromRect.height;
    el.style.transformOrigin = '0 0';
    el.style.transform = `translate(${to.left - fromRect.left}px, ${to.top - fromRect.top}px) scale(${sx}, ${sy})`;
    el.style.opacity = '0.2';
  });
  setTimeout(() => el.remove(), 320);
}

function animate(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function showEnd() {
  const won = state.status === 'won';
  const card = overlay.querySelector('.card');
  card.className = `card ${won ? 'won' : 'lost'}`;
  drawThumb($('thumb'), state.art, state.board.w, state.board.h, state.board.palette, 10);
  $('overlay-title').textContent = won ? `${state.name} limpo!` : 'As formigas travaram';
  $('overlay-text').textContent = won
    ? `Fase ${state.level} completa. As formigas levaram todos os ${state.total} cubos.`
    : `Levaram ${state.picked} de ${state.total} cubos. Os 4 espaços ficaram ocupados com cores sem caminho livre.`;
  againBtn.textContent = won ? 'Próxima fase' : 'Tentar de novo';
  const ended = state;
  setTimeout(() => {
    if (state === ended) {
      overlay.hidden = false;
      againBtn.focus({ preventScroll: true });
    }
  }, won ? 700 : 500);
}

function handleEvents() {
  for (const ev of state.events) {
    if (ev.type === 'pick') {
      sfx.pop();
      burst(ev.x, ev.y, state.board.palette[ev.color], reducedMotion.matches);
      animate(slotsEl.children[ev.slot], 'bump');
    } else if (ev.type === 'boxDone') {
      sfx.boxDone();
      animate(slotsEl.children[ev.slot], 'done');
    } else if (ev.type === 'won') {
      sfx.win();
      showEnd();
    } else if (ev.type === 'lost') {
      sfx.lose();
      showEnd();
    }
  }
  state.events.length = 0;
}

// ---------- entrada ----------
function choose(btn) {
  const lane = Number(btn.dataset.lane);
  if (!canPick(state, lane)) {
    for (const el of slotsEl.children) animate(el, 'bump');
    return;
  }
  const rect = btn.getBoundingClientRect();
  const color = state.board.palette[state.lanes[lane][0].color];
  pickLane(state, lane);
  sfx.tap();
  const slot = state.events.find((e) => e.type === 'box')?.slot;
  state.events = state.events.filter((e) => e.type !== 'box');
  syncUI();
  if (slot !== undefined) flyToSlot(rect, slot, color);
}

lanesEl.addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('button[data-lane]');
  if (!btn) return;
  e.preventDefault();
  const lane = btn.dataset.lane;
  choose(btn);
  // o botão pode ter sido refeito por syncUI: aperta o que está na tela agora
  const now = lanesEl.querySelector(`button[data-lane="${lane}"]`);
  if (now && !reducedMotion.matches) {
    now.classList.add('pressed');
    setTimeout(() => now.classList.remove('pressed'), 120);
  }
});
// teclado (Enter/Espaço) chega como click sem ponteiro
lanesEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-lane]');
  if (btn && e.detail === 0) choose(btn);
});

window.addEventListener('pointerdown', sfx.unlockAudio, { capture: true });
window.addEventListener('touchend', sfx.unlockAudio, { capture: true, passive: true });

function renderSoundBtn() {
  soundBtn.textContent = sfx.isMuted() ? '🔇' : '🔊';
  soundBtn.setAttribute('aria-pressed', String(!sfx.isMuted()));
}
soundBtn.addEventListener('click', () => {
  sfx.setMuted(!sfx.isMuted());
  renderSoundBtn();
});
renderSoundBtn();

$('restart').addEventListener('click', () => start(state.level));
againBtn.addEventListener('click', () => start(state.status === 'won' ? state.level + 1 : state.level));
window.addEventListener('resize', resize);
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(state, dt);
  syncUI();
  handleEvents();
  render(ctx, state, cell, now / 1000, dt, dpr, reducedMotion.matches);
  requestAnimationFrame(frame);
}

start(loadLevel());
requestAnimationFrame(frame);
