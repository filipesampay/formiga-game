// Estado do jogo e simulação das formigas (sem DOM — testável no node).
import {
  colorCounts, computeReach, findTarget, buildPath, isCleared, createRng, crumbleStones, EMPTY,
} from './board.js';
import { generateLanes, SLOTS } from './boxes.js';
import { buildLevel, levelSeed } from './levels.js';
import { solvable } from './solver.js';

export const TUNNEL_H = 3.2;
export const GUTTER = 0.9; // corredor em volta do desenho (laterais e topo)
export const ANT_SPEED = 3.5; // células por segundo
const SPAWN_EVERY = 0.25;
const STUCK_DELAY = 0.8;
const EMERGE_TIME = 0.35;
const SINK_TIME = 0.3;

function turn(ant, target, dt) {
  let d = target - ant.angle;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  ant.angle += d * Math.min(1, dt * 14);
}

function step(ant, dx, dy, dist, dt) {
  ant.x += dx;
  ant.y += dy;
  ant.phase += dist * 9; // passada acompanha a distância andada
  turn(ant, Math.atan2(dy, dx), dt);
}

export function newGame(level = 1, override = {}) {
  const rng = createRng(levelSeed(level) + 1);
  const lv = buildLevel(level, undefined, override);
  const params = { ...lv.params, ...override };
  const { board } = lv;
  const colorCount = board.palette.length;
  const depths = Array.from({ length: colorCount }, () => []);
  // profundidade = distância até a borda mais perto (0 = borda, 1 = centro)
  const maxRing = Math.floor((Math.min(board.w, board.h) - 1) / 2) || 1;
  board.cells.forEach((c, i) => {
    if (c < 0) return;
    const x = i % board.w;
    const y = Math.floor(i / board.w);
    depths[c].push(Math.min(x, y, board.w - 1 - x, board.h - 1 - y) / maxRing);
  });
  depths.forEach((d) => d.sort((a, b) => a - b));
  // fila de caixas sempre com solução: se o resolvedor não vence, sorteia outra ordem;
  // se insistir, a ordem vai ficando mais "justa" (menos caos)
  const counts = colorCounts(board, colorCount);
  let lanes = null;
  for (let k = 0; k < 40 && !lanes; k++) {
    const chaos = params.chaos * (1 - Math.floor(k / 8) * 0.2);
    const candidate = generateLanes(counts, rng, { ...params, chaos }, depths);
    if (solvable(board, candidate)) lanes = candidate;
  }
  lanes ??= generateLanes(counts, rng, { ...params, chaos: 0 }, depths);
  return {
    level, name: lv.name, params, rng, board, colorCount, lanes,
    art: board.cells.slice(),
    slots: new Array(SLOTS).fill(null),
    ants: [],
    reserved: new Set(),
    reach: computeReach(board),
    hole: { x: board.w / 2, y: board.h + TUNNEL_H * 0.55 },
    status: 'playing',
    stuckTime: 0,
    picked: 0,
    total: board.cells.filter((c) => c >= 0).length,
    nextId: 1,
    events: [],
  };
}

export function canPick(state, lane) {
  return state.status === 'playing' && state.lanes[lane].length > 0 && state.slots.includes(null);
}

export function pickLane(state, lane) {
  if (!canPick(state, lane)) return false;
  const b = state.lanes[lane].shift();
  const slot = state.slots.indexOf(null);
  state.slots[slot] = {
    id: state.nextId++, color: b.color, total: b.total, remaining: b.total,
    toSpawn: b.total, spawnTimer: 0,
  };
  state.stuckTime = 0;
  state.events.push({ type: 'box', slot, color: b.color });
  return true;
}

function wanderSpot(state) {
  const { hole, rng, board } = state;
  return {
    x: Math.min(board.w - 0.6, Math.max(0.6, hole.x + (rng() - 0.5) * (board.w - 2))),
    y: board.h + 0.55 + rng() * (TUNNEL_H - 1.1),
  };
}

function spawnAnt(state, box) {
  const { hole, rng } = state;
  const a = rng() * Math.PI * 2;
  state.ants.push({
    box, color: box.color, state: 'idle',
    x: hole.x + Math.cos(a) * 0.3, y: hole.y + Math.sin(a) * 0.2,
    home: wanderSpot(state),
    pause: 0,
    path: null, seg: 0, target: -1, carrying: -1,
    angle: a, phase: rng() * 10, age: 0, sink: 0,
  });
}

function pathLength(path) {
  let d = 0;
  for (let i = 1; i < path.length; i++) d += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return d;
}

// Caminho curto: ritmo normal. Caminho longo (cubos lá de cima): acelera aos poucos, até 2,6x.
export function tripBoost(len) {
  return Math.min(2.6, Math.max(1, 1 + (len - 4) * 0.15));
}

function assignTarget(state, ant) {
  const t = findTarget(state.board, state.reach, ant.color, state.reserved);
  if (!t) return false;
  state.reserved.add(t.cell);
  ant.target = t.cell;
  ant.path = [{ x: ant.x, y: ant.y }, ...buildPath(state.board, state.reach, t)];
  ant.seg = 1;
  ant.speed = ANT_SPEED * tripBoost(pathLength(ant.path));
  ant.state = 'go';
  return true;
}

// Move formiga ao longo do caminho; retorna true ao chegar no fim.
function walk(ant, dt) {
  let left = (ant.speed ?? ANT_SPEED) * dt;
  while (left > 0 && ant.seg < ant.path.length) {
    const p = ant.path[ant.seg];
    const dx = p.x - ant.x;
    const dy = p.y - ant.y;
    const d = Math.hypot(dx, dy);
    if (d <= left) {
      if (d > 1e-6) step(ant, dx, dy, d, dt);
      left -= d;
      ant.seg++;
    } else {
      step(ant, (dx / d) * left, (dy / d) * left, left, dt);
      left = 0;
    }
  }
  return ant.seg >= ant.path.length;
}

function pickUp(state, ant) {
  const { board } = state;
  ant.carrying = board.cells[ant.target];
  board.cells[ant.target] = EMPTY;
  state.reserved.delete(ant.target);
  const broken = crumbleStones(board);
  if (broken.length) {
    const { w } = board;
    state.events.push({ type: 'crumble', cells: broken.map((i) => ({ x: (i % w) + 0.5, y: Math.floor(i / w) + 0.5 })) });
  }
  state.reach = computeReach(board);
  state.picked++;
  const box = ant.box;
  box.remaining--;
  const { w } = board;
  state.events.push({
    type: 'pick', color: ant.carrying, x: (ant.target % w) + 0.5, y: Math.floor(ant.target / w) + 0.5,
    slot: state.slots.indexOf(box),
  });
  if (box.remaining <= 0) {
    const s = state.slots.indexOf(box);
    if (s >= 0) state.slots[s] = null;
    state.events.push({ type: 'boxDone', slot: s, color: box.color });
  }
  const back = ant.path.slice().reverse();
  back.push({ x: state.hole.x, y: state.hole.y });
  ant.path = back;
  ant.seg = 1;
  ant.state = 'back';
}

function isStuck(state) {
  const canChoose = state.slots.includes(null) && state.lanes.some((l) => l.length > 0);
  if (canChoose) return false;
  if (state.ants.some((a) => a.state === 'go')) return false;
  for (const box of state.slots) {
    if (box && findTarget(state.board, state.reach, box.color, state.reserved)) return false;
  }
  return state.slots.some((b) => b !== null);
}

function moveAnt(state, ant, dt, playing) {
  ant.age += dt;
  if (ant.state === 'idle') {
    if (playing && ant.age > EMERGE_TIME * 0.6 && assignTarget(state, ant)) return;
    if (!playing) return;
    // passeia pelo túnel esperando um cubo liberar
    if (ant.pause > 0) {
      ant.pause -= dt;
      ant.phase += dt * 1.5;
      return;
    }
    const dx = ant.home.x - ant.x;
    const dy = ant.home.y - ant.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) {
      ant.pause = 0.4 + state.rng() * 1.6;
      ant.home = wanderSpot(state);
      return;
    }
    const s = Math.min(d, ANT_SPEED * 0.35 * dt);
    step(ant, (dx / d) * s, (dy / d) * s, s, dt);
  } else if (ant.state === 'go') {
    if (walk(ant, dt)) pickUp(state, ant);
  } else if (ant.state === 'back') {
    if (walk(ant, dt)) ant.state = 'sink';
  } else if (ant.state === 'sink') {
    ant.sink += dt / SINK_TIME;
    if (ant.sink >= 1) ant.state = 'gone';
  }
}

export function update(state, dt) {
  dt = Math.min(dt, 0.05);
  if (state.status !== 'playing') {
    for (const ant of state.ants) moveAnt(state, ant, dt, false);
    state.ants = state.ants.filter((a) => a.state !== 'gone');
    return;
  }

  for (const box of state.slots) {
    if (!box || box.toSpawn <= 0) continue;
    box.spawnTimer -= dt;
    if (box.spawnTimer <= 0) {
      spawnAnt(state, box);
      box.toSpawn--;
      box.spawnTimer = SPAWN_EVERY;
    }
  }

  for (const ant of state.ants) moveAnt(state, ant, dt, true);
  state.ants = state.ants.filter((a) => a.state !== 'gone');

  if (isCleared(state.board)) {
    state.status = 'won';
    state.events.push({ type: 'won' });
    return;
  }
  if (isStuck(state)) {
    state.stuckTime += dt;
    if (state.stuckTime >= STUCK_DELAY) {
      state.status = 'lost';
      state.events.push({ type: 'lost' });
    }
  } else {
    state.stuckTime = 0;
  }
}
