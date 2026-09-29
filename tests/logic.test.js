import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY, STONE, createBoard, createRng, colorCounts, computeReach, isAccessible, findTarget, buildPath,
  isClearable, crumbleStones,
} from '../src/board.js';
import { splitCount } from '../src/boxes.js';
import { newGame, update, pickLane } from '../src/game.js';
import { TEMPLATES, ART_W, ART_H, COLORS } from '../src/art.js';
import { buildLevel, levelParams } from '../src/levels.js';
import { solvable } from '../src/solver.js';

const _ = EMPTY;

test('splitCount soma o total e respeita limites', () => {
  const rng = createRng(1);
  for (let total = 1; total < 200; total++) {
    const parts = splitCount(total, rng);
    assert.equal(parts.reduce((a, b) => a + b, 0), total);
    for (const p of parts) assert.ok(p >= 1 && p <= 12);
  }
});

test('modelos de pixel art são 12x14 e só usam chars da legenda', () => {
  for (const t of TEMPLATES) {
    assert.equal(t.rows.length, ART_H, t.name);
    for (const r of t.rows) {
      assert.equal(r.length, ART_W, `${t.name}: ${r}`);
      for (const ch of r) assert.ok(t.legend[ch], `${t.name}: char ${ch}`);
    }
    for (const opts of Object.values(t.legend)) for (const c of opts) assert.ok(COLORS[c], `${t.name}: cor ${c}`);
  }
});

test('fases 1..60: quadro cheio, paleta pequena, caixas somam cada cor', () => {
  for (let level = 1; level <= 60; level++) {
    const s = newGame(level);
    assert.ok(s.board.cells.every((c) => c === STONE || (c >= 0 && c < s.board.palette.length)), `fase ${level}`);
    assert.ok(isClearable(s.board), `fase ${level}: pedras trancam açúcar`);
    assert.ok(solvable(s.board, s.lanes), `fase ${level}: fila de caixas sem solução`);
    assert.ok(s.board.palette.length >= 2 && s.board.palette.length <= 10, `fase ${level}: ${s.board.palette.length} cores`);
    const counts = colorCounts(s.board, s.colorCount);
    const sums = new Array(s.colorCount).fill(0);
    for (const lane of s.lanes) for (const b of lane) sums[b.color] += b.total;
    assert.deepEqual(sums, counts, `fase ${level}`);
    assert.equal(s.lanes.length, levelParams(level).lanes);
  }
});

test('fase é determinística e dificuldade trava no teto', () => {
  assert.deepEqual(buildLevel(7).board.cells, buildLevel(7).board.cells);
  assert.notDeepEqual(buildLevel(7).board.cells, buildLevel(8).board.cells);
  assert.deepEqual(levelParams(30), levelParams(500));
  assert.ok(levelParams(1).chaos < levelParams(30).chaos);
});

test('num quadro cheio só as bordas são acessíveis', () => {
  const b = createBoard(3, 3, [0, 0, 0, 1, 2, 1, 0, 0, 0]);
  const reach = computeReach(b);
  assert.deepEqual([...Array(9).keys()].map((i) => isAccessible(b, reach, i)),
    [true, true, true, true, false, true, true, true, true]);
  assert.equal(findTarget(b, reach, 2, new Set()), null);
});

test('cubo do meio fica acessível quando um vizinho abre caminho até a borda', () => {
  const b = createBoard(3, 3, [
    0, 0, 0,
    _, 2, 0,
    0, 0, 0,
  ]);
  const reach = computeReach(b);
  const t = findTarget(b, reach, 2, new Set());
  assert.equal(t.cell, 4);
  assert.equal(t.from, 3);
  const path = buildPath(b, reach, t);
  // sai do túnel, sobe pelo corredor da esquerda, entra pela borda
  assert.deepEqual(path[0], { x: -0.5, y: 3.5 });
  assert.deepEqual(path[1], { x: -0.5, y: 1.5 });
  assert.deepEqual(path[2], { x: 0.5, y: 1.5 });
});

test('bolsão vazio fechado não conta como caminho', () => {
  const b = createBoard(5, 5, [
    0, 0, 0, 0, 0,
    0, 1, 1, 1, 0,
    0, 1, _, 1, 0,
    0, 1, 3, 1, 0,
    0, 0, 0, 0, 0,
  ]);
  const reach = computeReach(b);
  assert.equal(findTarget(b, reach, 3, new Set()), null);
  assert.ok(!isAccessible(b, reach, 7));
});

test('pedra quebra só quando todo açúcar encostado nela some (pedra vizinha não conta)', () => {
  const S = STONE;
  const b = createBoard(4, 3, [
    0, 1, 1, 0,
    1, S, S, 1,
    0, 1, 1, 0,
  ]);
  assert.deepEqual(crumbleStones(b), []);
  b.cells[1] = _;
  b.cells[4] = _;
  assert.deepEqual(crumbleStones(b), []); // ainda tem açúcar embaixo (9)
  b.cells[9] = _;
  assert.deepEqual(crumbleStones(b), [5]); // a da direita segue presa por 2, 7, 10
  for (const i of [2, 7, 10]) b.cells[i] = _;
  assert.deepEqual(crumbleStones(b), [6]);
});

test('resolvedor detecta açúcar trancado por pedras', () => {
  const S = STONE;
  // cubo do centro cercado de pedras: as pedras esperam o cubo, o cubo espera as pedras
  const preso = createBoard(3, 3, [S, S, S, S, 0, S, S, S, S]);
  preso.doors = new Set(['1.5,3.5']);
  assert.ok(!isClearable(preso));
  const livre = createBoard(3, 3, [0, S, 0, 0, 0, 0, 0, 0, 0]);
  assert.ok(isClearable(livre));
});

test('prefere a entrada mais perto do formigueiro (embaixo)', () => {
  const b = createBoard(3, 3, [1, 1, 1, 1, 0, 1, 1, 1, 1]);
  const reach = computeReach(b);
  assert.equal(findTarget(b, reach, 1, new Set()).cell, 7);
  // topo só por último
  const all = new Set([0, 1, 2, 3, 5, 6, 7, 8]);
  all.delete(1);
  assert.equal(findTarget(b, reach, 1, all).cell, 1);
});

function simulate(level, strategy) {
  const s = newGame(level);
  for (let step = 0; step < 200000 && s.status === 'playing'; step++) {
    strategy(s);
    update(s, 1 / 30);
  }
  return s;
}

test('jogador guloso termina partidas (vitória ou derrota), sem travar', () => {
  let wins = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = simulate(seed, (st) => {
      // prefere cor que tem cubo acessível agora
      const reach = computeReach(st.board);
      const order = st.lanes.map((l, i) => i).filter((i) => st.lanes[i].length)
        .sort((a, b) => {
          const ok = (i) => (findTarget(st.board, reach, st.lanes[i][0].color, st.reserved) ? 0 : 1);
          return ok(a) - ok(b);
        });
      if (order.length) pickLane(st, order[0]);
    });
    assert.notEqual(s.status, 'playing', `seed ${seed} não terminou`);
    if (s.status === 'won') {
      assert.ok(s.board.cells.every((c) => c === EMPTY));
      wins++;
    }
  }
  assert.ok(wins > 0, 'guloso deveria vencer alguma');
});

test('escolher só a primeira pista leva a derrota em algum seed', () => {
  let losses = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = simulate(seed, (st) => {
      const i = st.lanes.findIndex((l) => l.length);
      if (i >= 0) pickLane(st, i);
    });
    assert.notEqual(s.status, 'playing');
    if (s.status === 'lost') {
      assert.equal(s.slots.filter(Boolean).length, 4);
      losses++;
    }
  }
  assert.ok(losses > 0);
});

test('sw.js está carimbado com a versão atual dos arquivos (rode node tools/stamp.mjs)', async () => {
  const { stampBlock, readSw } = await import('../tools/stamp.mjs');
  assert.ok(readSw().includes(stampBlock()), 'sw.js desatualizado: rode node tools/stamp.mjs');
});
