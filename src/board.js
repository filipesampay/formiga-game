// Quadro de cubos de açúcar: geração e regras de acesso.
export const EMPTY = -1;

export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createBoard(w, h, cells) {
  return { w, h, cells: cells ?? new Array(w * h).fill(EMPTY) };
}

// Formas orgânicas (regiões por semente com ruído) + retângulos e círculos por cima.
export function generateBoard(w, h, colorCount, rng, { seeds: seedBase = 8, noise = 1.2 } = {}) {
  const board = createBoard(w, h);
  const seeds = [];
  const seedCount = seedBase + Math.floor(rng() * 5);
  for (let i = 0; i < seedCount; i++) {
    seeds.push({
      x: rng() * w,
      y: rng() * h,
      c: i < colorCount ? i : Math.floor(rng() * colorCount),
      s: 0.6 + rng() * 0.8,
    });
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = Infinity;
      let color = 0;
      for (const s of seeds) {
        const d = Math.hypot(x - s.x, y - s.y) * s.s + rng() * noise;
        if (d < best) {
          best = d;
          color = s.c;
        }
      }
      board.cells[y * w + x] = color;
    }
  }
  const shapes = 3 + Math.floor(rng() * 4);
  for (let i = 0; i < shapes; i++) {
    const c = Math.floor(rng() * colorCount);
    const cx = rng() * w;
    const cy = rng() * h;
    if (rng() < 0.5) {
      const rw = 2 + Math.floor(rng() * 4);
      const rh = 2 + Math.floor(rng() * 4);
      for (let y = Math.floor(cy); y < Math.min(h, cy + rh); y++)
        for (let x = Math.floor(cx); x < Math.min(w, cx + rw); x++) board.cells[y * w + x] = c;
    } else {
      const r = 1.5 + rng() * 2.5;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) board.cells[y * w + x] = c;
    }
  }
  return board;
}

export function colorCounts(board, colorCount) {
  const counts = new Array(colorCount).fill(0);
  for (const c of board.cells) if (c !== EMPTY) counts[c]++;
  return counts;
}

export function isCleared(board) {
  return board.cells.every((c) => c === EMPTY);
}

function neighbors(board, i) {
  const { w, h } = board;
  const x = i % w;
  const y = (i / w) | 0;
  const out = [];
  if (x > 0) out.push(i - 1);
  if (x < w - 1) out.push(i + 1);
  if (y > 0) out.push(i - w);
  if (y < h - 1) out.push(i + w);
  return out;
}

// BFS pelas células vazias a partir do túnel abaixo do quadro.
// dist[i] = passos desde a borda de baixo (-1 = inalcançável); prev[i] = célula anterior.
export function computeReach(board) {
  const { w, h, cells } = board;
  const dist = new Int32Array(w * h).fill(-1);
  const prev = new Int32Array(w * h).fill(-1);
  const queue = [];
  for (let x = 0; x < w; x++) {
    const i = (h - 1) * w + x;
    if (cells[i] === EMPTY) {
      dist[i] = 0;
      queue.push(i);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    for (const n of neighbors(board, i)) {
      if (cells[n] === EMPTY && dist[n] === -1) {
        dist[n] = dist[i] + 1;
        prev[n] = i;
        queue.push(n);
      }
    }
  }
  return { dist, prev };
}

// Célula vazia (ou -1 = túnel) de onde a formiga pega o cubo; null se bloqueado.
export function accessPoint(board, reach, i) {
  const { w, h } = board;
  if (board.cells[i] === EMPTY) return null;
  let best = null;
  let bestDist = Infinity;
  if (((i / w) | 0) === h - 1) {
    best = -1;
    bestDist = -1;
  }
  for (const n of neighbors(board, i)) {
    const d = reach.dist[n];
    if (board.cells[n] === EMPTY && d >= 0 && d < bestDist) {
      best = n;
      bestDist = d;
    }
  }
  return best === null ? null : { from: best, dist: bestDist };
}

export function isAccessible(board, reach, i) {
  return accessPoint(board, reach, i) !== null;
}

// Cubo acessível mais perto do túnel, da cor pedida, não reservado.
export function findTarget(board, reach, color, reserved) {
  let best = null;
  for (let i = 0; i < board.cells.length; i++) {
    if (board.cells[i] !== color || reserved.has(i)) continue;
    const ap = accessPoint(board, reach, i);
    if (ap && (!best || ap.dist < best.dist)) best = { cell: i, ...ap };
  }
  return best;
}

// Caminho em coordenadas de grade (centros das células), do túnel até o cubo.
export function buildPath(board, reach, target) {
  const { w, h } = board;
  const center = (i) => ({ x: (i % w) + 0.5, y: ((i / w) | 0) + 0.5 });
  const chain = [];
  let cur = target.from;
  while (cur !== -1) {
    chain.push(cur);
    cur = reach.prev[cur];
  }
  chain.reverse();
  const entryX = chain.length ? chain[0] % w : target.cell % w;
  const pts = [{ x: entryX + 0.5, y: h + 0.5 }];
  for (const i of chain) pts.push(center(i));
  const t = center(target.cell);
  const last = pts[pts.length - 1];
  pts.push({ x: (last.x + t.x) / 2, y: (last.y + t.y) / 2 });
  return pts;
}
