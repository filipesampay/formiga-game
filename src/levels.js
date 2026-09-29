// Fases infinitas: cada fase tem semente fixa (tentar de novo repete o desenho) e dificuldade crescente.
import { createRng, createBoard, EMPTY } from './board.js';
import { makeDrawing, KINDS, ART_W, ART_H, COLORS } from './art.js';

const lerp = (a, b, t) => a + (b - a) * t;

// t vai de 0 (fase 1) até 1 (fase 30) e trava: depois disso a dificuldade fica no teto.
// chaos = quanto a fila de caixas foge da ordem "de baixo pra cima" do desenho (maior alavanca).
export function levelParams(level) {
  const t = Math.min(1, (level - 1) / 29);
  return {
    lanes: level <= 4 ? 4 : 3,
    chaos: lerp(0.2, 1, t),
    boxMin: Math.round(lerp(6, 3, t)),
    boxMax: Math.round(lerp(12, 7, t)),
    sprinkle: lerp(0, 0.06, t),
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

export function buildLevel(level, rng = createRng(levelSeed(level))) {
  const params = levelParams(level);
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
  const board = createBoard(ART_W, ART_H, cells);
  board.palette = palette.map((n) => COLORS[n]);
  return { board, name: art.name, params };
}
