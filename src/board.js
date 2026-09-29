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

// Corredor em volta do desenho: as formigas saem do túnel (embaixo) e contornam pelas
// laterais e pelo topo para entrar por qualquer borda.
function isBorder(board, i) {
  const x = i % board.w;
  const y = (i / board.w) | 0;
  return x === 0 || y === 0 || x === board.w - 1 || y === board.h - 1;
}

// Caminho pelo corredor, da saída do túnel (centro, logo abaixo do desenho) até um ponto de fora.
export function corridorRoute(board, o) {
  const { w, h } = board;
  const bottom = h + 0.5;
  if (o.y === bottom) return [o];
  if (o.x === -0.5) return [{ x: -0.5, y: bottom }, o];
  if (o.x === w + 0.5) return [{ x: w + 0.5, y: bottom }, o];
  // topo: contorna pelo lado mais perto
  return o.x < w / 2
    ? [{ x: -0.5, y: bottom }, { x: -0.5, y: -0.5 }, o]
    : [{ x: w + 0.5, y: bottom }, { x: w + 0.5, y: -0.5 }, o];
}

function routeLength(board, route) {
  let p = { x: board.w / 2, y: board.h + 0.5 };
  let d = 0;
  for (const q of route) {
    d += Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
    p = q;
  }
  return d;
}

export const doorKey = (o) => `${o.x},${o.y}`;

// Todos os pontos de entrada possíveis, em volta do desenho (sentido horário a partir do canto de baixo à esquerda).
export function perimeterPoints(board) {
  const { w, h } = board;
  const pts = [];
  for (let y = h - 1; y >= 0; y--) pts.push({ x: -0.5, y: y + 0.5 });
  for (let x = 0; x < w; x++) pts.push({ x: x + 0.5, y: -0.5 });
  for (let y = 0; y < h; y++) pts.push({ x: w + 0.5, y: y + 0.5 });
  for (let x = w - 1; x >= 0; x--) pts.push({ x: x + 0.5, y: h + 0.5 });
  return pts;
}

// Melhor ponto de fora (e custo do corredor) para entrar numa célula de borda; null se não há porta ali.
function entryFor(board, i) {
  const { w, h } = board;
  const x = i % w;
  const y = (i / w) | 0;
  const opts = [];
  if (y === h - 1) opts.push({ x: x + 0.5, y: h + 0.5 });
  if (x === 0) opts.push({ x: -0.5, y: y + 0.5 });
  if (x === w - 1) opts.push({ x: w + 0.5, y: y + 0.5 });
  if (y === 0) opts.push({ x: x + 0.5, y: -0.5 });
  let best = null;
  for (const o of opts) {
    if (board.doors && !board.doors.has(doorKey(o))) continue;
    const cost = routeLength(board, corridorRoute(board, o));
    if (!best || cost < best.cost) best = { point: o, cost };
  }
  return best;
}

// BFS pelas células vazias a partir de todas as bordas.
// cost[i] = corredor + passos dentro do desenho (-1 = inalcançável); prev[i] = célula anterior.
export function computeReach(board) {
  const { w, h, cells } = board;
  const n = w * h;
  const dist = new Int32Array(n).fill(-1);
  const cost = new Float64Array(n).fill(-1);
  const prev = new Int32Array(n).fill(-1);
  const root = new Int32Array(n).fill(-1);
  const sources = [];
  for (let i = 0; i < n; i++) {
    if (cells[i] !== EMPTY || !isBorder(board, i)) continue;
    const e = entryFor(board, i);
    if (e) sources.push({ i, c: e.cost });
  }
  // fontes mais baratas primeiro: empate de distância favorece a entrada mais perto do túnel
  sources.sort((a, b) => a.c - b.c);
  const queue = [];
  for (const { i, c } of sources) {
    dist[i] = 0;
    cost[i] = c;
    root[i] = i;
    queue.push(i);
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    for (const m of neighbors(board, i)) {
      if (cells[m] === EMPTY && dist[m] === -1) {
        dist[m] = dist[i] + 1;
        cost[m] = cost[i] + 1;
        prev[m] = i;
        root[m] = root[i];
        queue.push(m);
      }
    }
  }
  return { dist, cost, prev, root };
}

// De onde a formiga pega o cubo: célula vazia vizinha (from) ou direto do corredor (from = -1).
export function accessPoint(board, reach, i) {
  if (board.cells[i] === EMPTY) return null;
  let best = null;
  const e = isBorder(board, i) ? entryFor(board, i) : null;
  if (e) best = { from: -1, dist: e.cost, entry: e.point };
  for (const m of neighbors(board, i)) {
    const c = reach.cost[m];
    if (board.cells[m] === EMPTY && c >= 0 && (!best || c + 1 < best.dist)) {
      best = { from: m, dist: c + 1, entry: null };
    }
  }
  return best;
}

export function isAccessible(board, reach, i) {
  return accessPoint(board, reach, i) !== null;
}

// Cubo acessível com a viagem mais curta, da cor pedida, não reservado.
export function findTarget(board, reach, color, reserved) {
  let best = null;
  for (let i = 0; i < board.cells.length; i++) {
    if (board.cells[i] !== color || reserved.has(i)) continue;
    const ap = accessPoint(board, reach, i);
    if (ap && (!best || ap.dist < best.dist)) best = { cell: i, ...ap };
  }
  return best;
}

// Caminho em coordenadas de grade: corredor, túneis dentro do desenho, até encostar no cubo.
export function buildPath(board, reach, target) {
  const { w } = board;
  const center = (i) => ({ x: (i % w) + 0.5, y: ((i / w) | 0) + 0.5 });
  const chain = [];
  let cur = target.from;
  while (cur !== -1) {
    chain.push(cur);
    cur = reach.prev[cur];
  }
  chain.reverse();
  const entry = chain.length ? entryFor(board, chain[0]).point : target.entry;
  const pts = corridorRoute(board, entry).slice();
  for (const i of chain) pts.push(center(i));
  const t = center(target.cell);
  const last = pts[pts.length - 1];
  pts.push({ x: (last.x + t.x) / 2, y: (last.y + t.y) / 2 });
  return pts;
}
