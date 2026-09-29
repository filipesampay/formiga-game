// Estado do jogo e simulação das formigas (sem DOM — testável no node).
import {
  generateBoard, colorCounts, computeReach, findTarget, buildPath, isCleared, createRng, EMPTY,
} from './board.js';
import { generateLanes, SLOTS } from './boxes.js';

export const BOARD_W = 12;
export const BOARD_H = 14;
export const TUNNEL_H = 3.2;
export const ANT_SPEED = 7; // células por segundo
const SPAWN_EVERY = 0.12;
const STUCK_DELAY = 0.8;

export function newGame(seed = Date.now(), colorCount = 5) {
  const rng = createRng(seed);
  const board = generateBoard(BOARD_W, BOARD_H, colorCount, rng);
  const lanes = generateLanes(colorCounts(board, colorCount), rng);
  return {
    seed, rng, board, colorCount, lanes,
    slots: new Array(SLOTS).fill(null),
    ants: [],
    reserved: new Set(),
    reach: computeReach(board),
    hole: { x: BOARD_W / 2, y: BOARD_H + TUNNEL_H * 0.55 },
    status: 'playing',
    stuckTime: 0,
    picked: 0,
    nextId: 1,
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
  return true;
}

function spawnAnt(state, box) {
  const { hole, rng } = state;
  const a = rng() * Math.PI * 2;
  state.ants.push({
    box, color: box.color, state: 'idle',
    x: hole.x + Math.cos(a) * 0.3, y: hole.y + Math.sin(a) * 0.2,
    home: { x: hole.x + (rng() - 0.5) * 4.5, y: hole.y + (rng() - 0.3) * 1.4 },
    path: null, seg: 0, target: -1, carrying: -1,
    angle: -Math.PI / 2, phase: rng() * 10,
  });
}

function assignTarget(state, ant) {
  const t = findTarget(state.board, state.reach, ant.color, state.reserved);
  if (!t) return false;
  state.reserved.add(t.cell);
  ant.target = t.cell;
  ant.path = [{ x: ant.x, y: ant.y }, ...buildPath(state.board, state.reach, t)];
  ant.seg = 1;
  ant.state = 'go';
  return true;
}

// Move formiga ao longo do caminho; retorna true ao chegar no fim.
function walk(ant, dt) {
  let step = ANT_SPEED * dt;
  while (step > 0 && ant.seg < ant.path.length) {
    const p = ant.path[ant.seg];
    const dx = p.x - ant.x;
    const dy = p.y - ant.y;
    const d = Math.hypot(dx, dy);
    if (d > 1e-6) ant.angle = Math.atan2(dy, dx);
    if (d <= step) {
      ant.x = p.x;
      ant.y = p.y;
      step -= d;
      ant.seg++;
    } else {
      ant.x += (dx / d) * step;
      ant.y += (dy / d) * step;
      step = 0;
    }
  }
  return ant.seg >= ant.path.length;
}

function pickUp(state, ant) {
  const { board } = state;
  ant.carrying = board.cells[ant.target];
  board.cells[ant.target] = EMPTY;
  state.reserved.delete(ant.target);
  state.reach = computeReach(board);
  state.picked++;
  const box = ant.box;
  box.remaining--;
  if (box.remaining <= 0) {
    const s = state.slots.indexOf(box);
    if (s >= 0) state.slots[s] = null;
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

export function update(state, dt) {
  dt = Math.min(dt, 0.05);
  if (state.status !== 'playing') {
    for (const ant of state.ants) if (ant.state === 'back' && walk(ant, dt)) ant.state = 'gone';
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

  for (const ant of state.ants) {
    ant.phase += dt * 12;
    if (ant.state === 'idle') {
      if (!assignTarget(state, ant)) {
        const dx = ant.home.x - ant.x;
        const dy = ant.home.y - ant.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.05) {
          const s = Math.min(d, ANT_SPEED * 0.4 * dt);
          ant.x += (dx / d) * s;
          ant.y += (dy / d) * s;
          ant.angle = Math.atan2(dy, dx);
        }
      }
    } else if (ant.state === 'go') {
      if (walk(ant, dt)) pickUp(state, ant);
    } else if (ant.state === 'back') {
      if (walk(ant, dt)) ant.state = 'gone';
    }
  }
  state.ants = state.ants.filter((a) => a.state !== 'gone');

  if (isCleared(state.board)) {
    state.status = 'won';
    return;
  }
  if (isStuck(state)) {
    state.stuckTime += dt;
    if (state.stuckTime >= STUCK_DELAY) state.status = 'lost';
  } else {
    state.stuckTime = 0;
  }
}

export function totalCells(state) {
  return state.board.w * state.board.h;
}
