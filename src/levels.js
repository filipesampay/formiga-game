// Fases infinitas: cada fase tem semente fixa (tentar de novo repete o desenho) e dificuldade crescente.
import {
  createRng, createBoard, EMPTY, STONE, perimeterPoints, doorKey, isClearable,
} from './board.js';
import { makeDrawing, KINDS, ART_W, ART_H, COLORS } from './art.js';

const lerp = (a, b, t) => a + (b - a) * t;

// t vai de 0 (fase 1) até 1 (fase 20) e trava: depois disso a dificuldade fica no teto.
// As formigas entram pelas bordas; fases altas têm menos portas, fila puxando cores do centro,
// menos colunas, caixas menores e fundo em padrão de duas cores.
export function levelParams(level) {
  const t = Math.min(1, (level - 1) / 19);
  return {
    doors: level <= 2 ? 0 : Math.round(lerp(18, 3, t)),
    lanes: level <= 3 ? 4 : level <= 10 ? 3 : 2,
    chaos: lerp(0.2, 2, t),
    boxMin: Math.round(lerp(6, 2, t)),
    boxMax: Math.round(lerp(12, 5, t)),
    sprinkle: lerp(0, 0.05, t),
    bgPattern: level >= 6 ? ['listras', 'xadrez', 'aneis'] : null,
    stones: level < 5 ? 0 : Math.round(lerp(1, 7, t)), // grupos de pedra
    stoneSize: 1 + Math.round(lerp(0, 3, t)), // até 4 pedras por grupo
  };
}

export function levelSeed(level) {
  return (Math.imul(level, 2654435761) ^ 0x5eed) >>> 0;
}

function drawingKind(level) {
  // ordem embaralhada fixa, sem repetir o mesmo desenho em fases seguidas
  const order = KINDS.slice();
  const rng = createRng(12345 + Math.floor((level - 1) / order.length));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order[(level - 1) % order.length];
}

function tint(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
}

// Fundo do desenho vira um padrão de duas cores (listras, xadrez ou anéis).
// Sem isso o fundo encosta em todas as bordas e as caixas dessa cor nunca travam.
// Cor de fundo = a que mais aparece na borda do desenho.
function backgroundColor(cells, colorCount) {
  const counts = new Array(colorCount).fill(0);
  for (let i = 0; i < cells.length; i++) {
    const x = i % ART_W;
    const y = Math.floor(i / ART_W);
    if (x === 0 || y === 0 || x === ART_W - 1 || y === ART_H - 1) counts[cells[i]]++;
  }
  return counts.indexOf(Math.max(...counts));
}

function patternBackground(cells, hexes, rng, kinds) {
  const bg = backgroundColor(cells, hexes.length);
  const lum = hexes[bg].slice(1).match(/../g).reduce((a, h) => a + parseInt(h, 16), 0) / 765;
  hexes.push(tint(hexes[bg], lum > 0.55 ? -0.28 : 0.3));
  const alt = hexes.length - 1;
  const kind = kinds[Math.floor(rng() * kinds.length)];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] !== bg) continue;
    const x = i % ART_W;
    const y = Math.floor(i / ART_W);
    const ring = Math.min(x, y, ART_W - 1 - x, ART_H - 1 - y);
    const on = kind === 'listras' ? ((x + y) >> 1) % 2
      : kind === 'xadrez' ? ((x >> 1) + (y >> 1)) % 2
      : ring % 2;
    if (on) cells[i] = alt;
  }
  return [bg, alt];
}

// Grupos de pedra sobre o fundo (nunca no bicho/rosto), separados entre si.
function scatterStones(cells, bgColors, groups, maxSize, rng) {
  const out = cells.slice();
  const isBg = (i) => bgColors.includes(out[i]);
  const nb = (i) => {
    const x = i % ART_W;
    const y = Math.floor(i / ART_W);
    return [x > 0 && i - 1, x < ART_W - 1 && i + 1, y > 0 && i - ART_W, y < ART_H - 1 && i + ART_W]
      .filter((v) => v !== false);
  };
  const nearStone = (i) => nb(i).some((m) => out[m] === STONE);
  for (let g = 0; g < groups; g++) {
    const free = [];
    for (let i = 0; i < out.length; i++) if (isBg(i) && !nearStone(i)) free.push(i);
    if (!free.length) break;
    const group = [free[Math.floor(rng() * free.length)]];
    const size = 1 + Math.floor(rng() * maxSize);
    while (group.length < size) {
      const opts = group.flatMap(nb).filter((m) => isBg(m) && !group.includes(m) && !nearStone(m));
      if (!opts.length) break;
      group.push(opts[Math.floor(rng() * opts.length)]);
    }
    for (const i of group) out[i] = STONE;
  }
  return out;
}

// Coloca pedras sem nunca deixar a fase impossível: testa com o resolvedor e,
// se trancar açúcar, sorteia de novo; se insistir, usa menos grupos.
function placeStones(board, bgColors, groups, maxSize, rng) {
  for (let g = groups; g > 0; g--) {
    for (let tries = 0; tries < 12; tries++) {
      const cells = scatterStones(board.cells, bgColors, g, maxSize, rng);
      if (isClearable({ ...board, cells })) return cells;
    }
  }
  return board.cells;
}

// Portas espalhadas pelo perímetro; null = borda inteira aberta.
export function pickDoors(board, count, rng) {
  const all = perimeterPoints(board);
  if (!count || count >= all.length) return null;
  const doors = new Set();
  const step = all.length / count;
  const off = rng() * step;
  for (let k = 0; k < count; k++) {
    const jitter = (rng() - 0.5) * step * 0.6;
    const idx = Math.floor(off + k * step + jitter + all.length) % all.length;
    doors.add(doorKey(all[idx]));
  }
  return doors;
}

export function buildLevel(level, rng = createRng(levelSeed(level)), override = {}) {
  const params = { ...levelParams(level), ...override };
  const art = makeDrawing(rng, drawingKind(level));
  const palette = [];
  const index = new Map();
  const cells = new Array(ART_W * ART_H).fill(EMPTY);
  art.grid.forEach((row, y) => row.forEach((name, x) => {
    if (!index.has(name)) {
      index.set(name, palette.length);
      palette.push(name);
    }
    cells[y * ART_W + x] = index.get(name);
  }));
  // granulado: pixels soltos de outras cores do desenho, quebram áreas grandes
  if (palette.length > 1) {
    for (let i = 0; i < cells.length; i++) {
      if (rng() < params.sprinkle) {
        let c = Math.floor(rng() * (palette.length - 1));
        if (c >= cells[i]) c++;
        cells[i] = c;
      }
    }
  }
  const hexes = palette.map((n) => COLORS[n]);
  const bgColors = params.bgPattern
    ? patternBackground(cells, hexes, rng, params.bgPattern)
    : [backgroundColor(cells, hexes.length)];
  const board = createBoard(ART_W, ART_H, cells);
  board.palette = hexes;
  board.doors = pickDoors(board, params.doors, rng);
  if (params.stones) board.cells = placeStones(board, bgColors, params.stones, params.stoneSize, rng);
  return { board, name: art.name, params };
}
