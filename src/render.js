// Desenho do quadro, túnel, formigas e partículas no canvas.
import { EMPTY, accessPoint } from './board.js';
import { TUNNEL_H, GUTTER } from './game.js';

const SOIL = '#3a2314';
const SOIL_DEEP = '#1f130a';
const CLAY = '#8a5634';

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

export function shade(hex, amt) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const [r, g, b] = hexRgb(hex).map(f);
  return `rgb(${r},${g},${b})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Cubo de açúcar: face de cima clara, lateral escura, cristais brilhando.
function paintCube(ctx, x, y, s, color) {
  const pad = s * 0.05;
  const r = s * 0.16;
  const w = s - pad * 2;
  roundRect(ctx, x + pad, y + pad, w, w, r);
  ctx.fillStyle = shade(color, -0.32);
  ctx.fill();
  roundRect(ctx, x + pad, y + pad, w, w - s * 0.12, r);
  const g = ctx.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, shade(color, 0.18));
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  roundRect(ctx, x + s * 0.18, y + s * 0.16, s * 0.3, s * 0.12, s * 0.06);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const dots = [[0.66, 0.34, 0.07], [0.3, 0.58, 0.05], [0.58, 0.62, 0.04], [0.76, 0.56, 0.035]];
  for (const [dx, dy, d] of dots) ctx.fillRect(x + s * dx, y + s * dy, s * d, s * d);
}

const cubeCache = new Map();
function cubeSprite(color, s, dpr) {
  const key = `${color}|${s}|${dpr}`;
  let c = cubeCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(s * dpr);
    const cx = c.getContext('2d');
    cx.scale(dpr, dpr);
    paintCube(cx, 0, 0, s, color);
    cubeCache.set(key, c);
  }
  return c;
}

export function drawCube(ctx, x, y, s, color, dpr = 1) {
  if (typeof document === 'undefined') return paintCube(ctx, x, y, s, color);
  ctx.drawImage(cubeSprite(color, Math.round(s), dpr), x, y, s, s);
}

// Fundo fixo (terra em camadas, pedrinhas, raízes), refeito só ao redimensionar.
let bgCache = null;
function background(board, cell, dpr) {
  const key = `${board.w}|${board.h}|${cell}|${dpr}`;
  if (bgCache?.key === key) return bgCache.canvas;
  const W = (board.w + GUTTER * 2) * cell;
  const H = (board.h + GUTTER + TUNNEL_H) * cell;
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * dpr);
  c.height = Math.ceil(H * dpr);
  const x = c.getContext('2d');
  x.scale(dpr, dpr);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#4a2d1a');
  g.addColorStop(0.75, SOIL);
  g.addColorStop(1, SOIL_DEEP);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const top = (board.h + GUTTER) * cell;
  for (let i = 0; i < 3; i++) {
    x.strokeStyle = `rgba(0,0,0,${0.12 + i * 0.04})`;
    x.lineWidth = cell * 0.06;
    x.beginPath();
    const y0 = top + cell * (0.9 + i * 0.85);
    x.moveTo(0, y0);
    for (let px = 0; px <= W; px += cell) x.lineTo(px, y0 + Math.sin(px * 0.05 + i) * cell * 0.12);
    x.stroke();
  }
  for (let i = 0; i < 70; i++) {
    const px = rnd() * W;
    const py = top + rnd() * TUNNEL_H * cell;
    const r = cell * (0.04 + rnd() * 0.1);
    x.fillStyle = rnd() < 0.5 ? 'rgba(138,86,52,0.55)' : 'rgba(20,10,4,0.35)';
    x.beginPath();
    x.ellipse(px, py, r * 1.3, r, rnd() * 3, 0, Math.PI * 2);
    x.fill();
  }
  x.strokeStyle = 'rgba(160,110,70,0.35)';
  x.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    let px = rnd() * W;
    let py = H;
    x.lineWidth = cell * 0.05;
    x.beginPath();
    x.moveTo(px, py);
    for (let k = 0; k < 6; k++) {
      px += (rnd() - 0.5) * cell * 0.8;
      py -= cell * 0.2;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  // trilha batida do corredor em volta do desenho
  const G = GUTTER * cell;
  x.strokeStyle = 'rgba(0,0,0,0.22)';
  x.lineWidth = cell * 0.62;
  x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(G - cell * 0.5, top + cell * 0.5);
  x.lineTo(G - cell * 0.5, G - cell * 0.5);
  x.lineTo(G + (board.w + 0.5) * cell, G - cell * 0.5);
  x.lineTo(G + (board.w + 0.5) * cell, top + cell * 0.5);
  x.lineTo(G - cell * 0.5, top + cell * 0.5);
  x.stroke();
  bgCache = { key, canvas: c };
  return c;
}

// ---------- partículas ----------
const particles = [];
const rings = [];

export function burst(x, y, color, reduced) {
  rings.push({ x, y, t: 0 });
  if (reduced) return;
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 1.5 + Math.random() * 2.5;
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, t: 0,
      life: 0.35 + Math.random() * 0.3, size: 0.07 + Math.random() * 0.08,
      color: i % 3 === 0 ? '#fff3d6' : color,
    });
  }
}

function drawParticles(ctx, cell, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += dt;
    if (p.t >= p.life) {
      particles.splice(i, 1);
      continue;
    }
    p.vy += 9 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const k = 1 - p.t / p.life;
    ctx.globalAlpha = k;
    ctx.fillStyle = p.color;
    const s = p.size * cell * (0.5 + k * 0.5);
    ctx.fillRect(p.x * cell - s / 2, p.y * cell - s / 2, s, s);
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.t += dt;
    if (r.t > 0.3) {
      rings.splice(i, 1);
      continue;
    }
    const k = r.t / 0.3;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#fff3d6';
    ctx.lineWidth = cell * 0.08 * (1 - k);
    ctx.beginPath();
    ctx.arc(r.x * cell, r.y * cell, cell * (0.2 + k * 0.5), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function clearParticles() {
  particles.length = 0;
  rings.length = 0;
}

// ---------- formiga ----------
const easeOutBack = (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

function drawAnt(ctx, ant, cell, palette, time, dpr) {
  const s = cell * 0.62; // comprimento do corpo
  let scale = 1;
  if (ant.age < 0.35) scale = Math.max(0.05, easeOutBack(Math.min(1, ant.age / 0.35)));
  if (ant.state === 'sink') scale = Math.max(0, 1 - ant.sink);
  if (scale <= 0.01) return;
  const moving = ant.state === 'go' || ant.state === 'back' || (ant.state === 'idle' && ant.pause <= 0);
  const ph = ant.phase;
  const bob = moving ? Math.abs(Math.sin(ph)) * s * 0.03 : 0;
  const color = palette[ant.color];
  const chitin = '#24150c';

  ctx.save();
  ctx.translate(ant.x * cell, ant.y * cell);
  ctx.scale(scale, scale);

  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(s * 0.04, s * 0.1, s * 0.5, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(ant.angle);
  ctx.translate(0, -bob);

  // pernas: marcha em tripé (L1,R2,L3 contra R1,L2,R3), cada uma com joelho
  ctx.strokeStyle = chitin;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, s * 0.055);
  const roots = [0.1, 0.0, -0.1];
  for (let k = 0; k < 3; k++) {
    for (const side of [-1, 1]) {
      const group = (k + (side > 0 ? 1 : 0)) % 2;
      const sw = moving ? Math.sin(ph + group * Math.PI) : Math.sin(time * 2 + k) * 0.1;
      const lift = moving ? Math.max(0, Math.cos(ph + group * Math.PI)) : 0;
      const rx = roots[k] * s;
      const spread = [0.25, 0.05, -0.2][k];
      const kx = rx + (spread * 0.6 + sw * 0.1) * s;
      const ky = side * s * (0.22 + lift * 0.03);
      const fx = rx + (spread + sw * 0.16) * s;
      const fy = side * s * (0.38 - lift * 0.06);
      ctx.beginPath();
      ctx.moveTo(rx, side * s * 0.04);
      ctx.lineTo(kx, ky);
      ctx.lineTo(fx, fy);
      ctx.stroke();
    }
  }

  // abdome na cor da caixa, com listras
  const ax = -s * 0.34;
  const ag = ctx.createRadialGradient(ax + s * 0.05, -s * 0.07, s * 0.02, ax, 0, s * 0.26);
  ag.addColorStop(0, shade(color, 0.35));
  ag.addColorStop(0.6, color);
  ag.addColorStop(1, shade(color, -0.45));
  ctx.fillStyle = ag;
  ctx.beginPath();
  ctx.ellipse(ax, 0, s * 0.25, s * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(color, -0.5);
  ctx.lineWidth = Math.max(0.8, s * 0.035);
  for (const off of [-0.08, -0.17]) {
    ctx.beginPath();
    ctx.ellipse(ax + off * s + s * 0.1, 0, s * 0.03, s * 0.16, 0, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }

  // pecíolo, tórax, cabeça
  const body = (cx, rx, ry) => {
    const g = ctx.createRadialGradient(cx + rx * 0.2, -ry * 0.4, 0, cx, 0, rx * 1.2);
    g.addColorStop(0, '#6b4a33');
    g.addColorStop(1, chitin);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  body(-s * 0.07, s * 0.05, s * 0.04);
  body(s * 0.05, s * 0.12, s * 0.085);
  body(s * 0.27, s * 0.12, s * 0.115);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 0.32, side * s * 0.065, s * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }

  // antenas com cotovelo, mexendo
  ctx.strokeStyle = chitin;
  ctx.lineWidth = Math.max(0.8, s * 0.035);
  for (const side of [-1, 1]) {
    const w = Math.sin(time * 7 + ant.phase * 0.3 + side) * 0.06;
    ctx.beginPath();
    ctx.moveTo(s * 0.34, side * s * 0.05);
    ctx.lineTo(s * 0.46, side * (s * 0.13 + w * s));
    ctx.lineTo(s * 0.6, side * (s * 0.1 + w * s * 1.6));
    ctx.stroke();
  }

  // cubo carregado nas mandíbulas
  if (ant.carrying >= 0) {
    const c = cell * 0.4;
    ctx.save();
    ctx.translate(s * 0.55, 0);
    ctx.rotate(-ant.angle + Math.sin(ph * 0.5) * 0.08);
    ctx.translate(0, -bob * 2);
    drawCube(ctx, -c / 2, -c / 2, c, palette[ant.carrying], dpr);
    ctx.restore();
  }
  ctx.restore();
}

// Muro em volta do desenho com vãos nas portas (sem portas = borda toda aberta).
function drawDoors(ctx, board, cell) {
  if (!board.doors) return;
  const { w, h } = board;
  const t = cell * 0.16;
  ctx.fillStyle = '#6b4128';
  const isDoor = (x, y) => board.doors.has(`${x},${y}`);
  for (let x = 0; x < w; x++) {
    if (!isDoor(x + 0.5, -0.5)) ctx.fillRect(x * cell, -t, cell, t);
    if (!isDoor(x + 0.5, h + 0.5)) ctx.fillRect(x * cell, h * cell, cell, t);
  }
  for (let y = 0; y < h; y++) {
    if (!isDoor(-0.5, y + 0.5)) ctx.fillRect(-t, y * cell, t, cell);
    if (!isDoor(w + 0.5, y + 0.5)) ctx.fillRect(w * cell, y * cell, t, cell);
  }
  // cantos
  for (const [x, y] of [[-t, -t], [w * cell, -t], [-t, h * cell], [w * cell, h * cell]]) ctx.fillRect(x, y, t, t);
  // portas: entrada escura com borda de argila
  for (const key of board.doors) {
    const [dx, dy] = key.split(',').map(Number);
    const px = dx * cell;
    const py = dy * cell;
    const horiz = dy < 0 || dy > h;
    const ex = dx < 0 ? 0 : dx > w ? w * cell : px;
    const ey = dy < 0 ? 0 : dy > h ? h * cell : py;
    ctx.fillStyle = CLAY;
    ctx.beginPath();
    ctx.ellipse(ex, ey, horiz ? cell * 0.46 : cell * 0.22, horiz ? cell * 0.22 : cell * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d0703';
    ctx.beginPath();
    ctx.ellipse(ex, ey, horiz ? cell * 0.34 : cell * 0.14, horiz ? cell * 0.14 : cell * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- quadro ----------
export function render(ctx, state, cell, time, dt, dpr = 1, reduced = false) {
  const { board, hole } = state;
  const W = board.w * cell;
  const H = board.h * cell;
  const G = GUTTER * cell;
  const fullW = W + G * 2;
  const fullH = G + H + TUNNEL_H * cell;
  ctx.save();
  ctx.clearRect(0, 0, fullW, fullH);
  if (typeof document !== 'undefined') ctx.drawImage(background(board, cell, dpr), 0, 0, fullW, fullH);
  ctx.translate(G, G);

  // moldura do desenho
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-cell * 0.08, -cell * 0.08, W + cell * 0.16, H + cell * 0.16);

  // túneis cavados: terra escura com sombra embaixo dos cubos
  for (let y = 0; y < board.h; y++) {
    for (let x = 0; x < board.w; x++) {
      const i = y * board.w + x;
      if (board.cells[i] !== EMPTY) continue;
      ctx.fillStyle = state.reach.dist[i] >= 0 ? SOIL_DEEP : '#2a190d';
      ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
      if (y > 0 && board.cells[i - board.w] !== EMPTY) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x * cell, y * cell, cell, cell * 0.14);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(x * cell, y * cell + cell * 0.14, cell, cell * 0.16);
      }
    }
  }

  // cubos; os que as formigas ativas alcançam agora ganham contorno pulsando
  const active = new Set(state.slots.filter(Boolean).map((b) => b.color));
  const pulse = reduced ? 0.6 : 0.45 + Math.sin(time * 5) * 0.25;
  for (let y = 0; y < board.h; y++) {
    for (let x = 0; x < board.w; x++) {
      const i = y * board.w + x;
      const c = board.cells[i];
      if (c === EMPTY) continue;
      let ox = 0;
      let oy = 0;
      if (state.reserved.has(i) && !reduced) {
        ox = Math.sin(time * 40 + i) * cell * 0.025;
        oy = -Math.abs(Math.sin(time * 20 + i)) * cell * 0.03;
      }
      drawCube(ctx, x * cell + ox, y * cell + oy, cell, board.palette[c], dpr);
      if (active.has(c) && !state.reserved.has(i) && accessPoint(board, state.reach, i)) {
        ctx.strokeStyle = `rgba(255,243,214,${pulse})`;
        ctx.lineWidth = Math.max(1.5, cell * 0.07);
        roundRect(ctx, x * cell + cell * 0.08, y * cell + cell * 0.08, cell * 0.84, cell * 0.84, cell * 0.16);
        ctx.stroke();
      }
    }
  }


  drawDoors(ctx, board, cell);

  // formigueiro
  const hx = hole.x * cell;
  const hy = hole.y * cell;
  ctx.fillStyle = CLAY;
  ctx.beginPath();
  ctx.ellipse(hx, hy + cell * 0.08, cell * 1.45, cell * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  const hg = ctx.createRadialGradient(hx, hy + cell * 0.1, cell * 0.1, hx, hy, cell * 1.1);
  hg.addColorStop(0, '#000');
  hg.addColorStop(1, '#1a0e06');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(hx, hy, cell * 1.15, cell * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // formigas: as de cima primeiro, as de baixo por cima (profundidade)
  const ants = state.ants.slice().sort((a, b) => a.y - b.y);
  for (const ant of ants) drawAnt(ctx, ant, cell, board.palette, time, dpr);

  drawParticles(ctx, cell, dt);
  ctx.restore();
}

// Miniatura do desenho original (tela de fim de fase).
export function drawThumb(canvas, cells, w, h, palette, px) {
  canvas.width = w * px;
  canvas.height = h * px;
  const c = canvas.getContext('2d');
  cells.forEach((v, i) => {
    c.fillStyle = palette[v];
    c.fillRect((i % w) * px, Math.floor(i / w) * px, px, px);
  });
}
