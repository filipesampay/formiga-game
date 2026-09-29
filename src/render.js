// Desenho do quadro, túnel e formigas no canvas.
import { EMPTY } from './board.js';
import { TUNNEL_H } from './game.js';

export const PALETTE = ['#ff4f8b', '#ffc233', '#1fc8a9', '#4a7dff', '#a45cf0', '#ff7a2f', '#7fd13b'];

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
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

export function drawCube(ctx, x, y, s, color) {
  const pad = s * 0.06;
  roundRect(ctx, x + pad, y + pad, s - pad * 2, s - pad * 2, s * 0.18);
  ctx.fillStyle = shade(color, -0.18);
  ctx.fill();
  roundRect(ctx, x + pad, y + pad, s - pad * 2, s - pad * 2 - s * 0.1, s * 0.18);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  roundRect(ctx, x + s * 0.2, y + s * 0.18, s * 0.28, s * 0.14, s * 0.07);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(x + s * 0.62, y + s * 0.5, s * 0.07, s * 0.07);
  ctx.fillRect(x + s * 0.34, y + s * 0.62, s * 0.05, s * 0.05);
}

function drawAnt(ctx, ant, cell) {
  const s = cell;
  ctx.save();
  ctx.translate(ant.x * s, ant.y * s);
  ctx.rotate(ant.angle);
  const moving = ant.state !== 'idle';
  const swing = Math.sin(ant.phase) * (moving ? 0.09 : 0.03) * s;
  const body = '#2a1a10';

  ctx.strokeStyle = body;
  ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    for (let k = -1; k <= 1; k++) {
      const off = (k % 2 === 0 ? swing : -swing) * side;
      ctx.beginPath();
      ctx.moveTo(k * s * 0.07, 0);
      ctx.lineTo(k * s * 0.12 + off, side * s * 0.2);
      ctx.stroke();
    }
  }
  // abdome colorido = cor da caixa
  ctx.fillStyle = ant.carrying >= 0 ? PALETTE[ant.carrying] : PALETTE[ant.color];
  ctx.beginPath();
  ctx.ellipse(-s * 0.17, 0, s * 0.13, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.07, s * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.11, 0, s * 0.065, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1, s * 0.025);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 0.15, side * s * 0.03);
    ctx.quadraticCurveTo(s * 0.24, side * s * 0.05, s * 0.27, side * s * 0.12);
    ctx.stroke();
  }
  if (ant.carrying >= 0) {
    const c = s * 0.34;
    ctx.save();
    ctx.translate(s * 0.28, 0);
    ctx.rotate(-ant.angle);
    drawCube(ctx, -c / 2, -c / 2, c, PALETTE[ant.carrying]);
    ctx.restore();
  }
  ctx.restore();
}

export function render(ctx, state, cell, time) {
  const { board, hole } = state;
  const W = board.w * cell;
  const H = board.h * cell;
  const T = TUNNEL_H * cell;

  // terra
  ctx.fillStyle = '#5a3a24';
  ctx.fillRect(0, 0, W, H + T);
  ctx.fillStyle = '#6b4630';
  for (let i = 0; i < 40; i++) {
    const px = ((i * 97) % 100) / 100 * W;
    const py = H + ((i * 53) % 100) / 100 * T;
    ctx.fillRect(px, py, cell * 0.08, cell * 0.08);
  }

  // túneis abertos no quadro
  for (let y = 0; y < board.h; y++) {
    for (let x = 0; x < board.w; x++) {
      const i = y * board.w + x;
      if (board.cells[i] === EMPTY) {
        ctx.fillStyle = state.reach.dist[i] >= 0 ? '#3d2616' : '#4a2f1c';
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }

  const active = new Set(state.slots.filter(Boolean).map((b) => b.color));
  for (let y = 0; y < board.h; y++) {
    for (let x = 0; x < board.w; x++) {
      const i = y * board.w + x;
      const c = board.cells[i];
      if (c === EMPTY) continue;
      drawCube(ctx, x * cell, y * cell, cell, PALETTE[c]);
      if (state.reserved.has(i)) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }

  // borda entre açúcar e túnel
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, H, W, cell * 0.12);

  // buraco
  const hx = hole.x * cell;
  const hy = hole.y * cell;
  const pulse = active.size ? 1 + Math.sin(time * 4) * 0.03 : 1;
  ctx.fillStyle = '#2b1a0e';
  ctx.beginPath();
  ctx.ellipse(hx, hy, cell * 1.3 * pulse, cell * 0.55 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#120a05';
  ctx.beginPath();
  ctx.ellipse(hx, hy + cell * 0.06, cell * 1.0, cell * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const ant of state.ants) drawAnt(ctx, ant, cell);
}
