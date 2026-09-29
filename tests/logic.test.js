import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY, createBoard, createRng, colorCounts, computeReach, isAccessible, findTarget, buildPath,
} from '../src/board.js';
import { splitCount } from '../src/boxes.js';
import { newGame, update, pickLane } from '../src/game.js';
import { TEMPLATES, ART_W, ART_H, COLORS } from '../src/art.js';
import { buildLevel, levelParams } from '../src/levels.js';

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
    assert.ok(s.board.cells.every((c) => c >= 0 && c < s.board.palette.length), `fase ${level}`);
    assert.ok(s.board.palette.length >= 2 && s.board.palette.length <= 9, `fase ${level}: ${s.board.palette.length} cores`);
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

test('só a linha de baixo é acessível num quadro cheio', () => {
  const b = createBoard(3, 3, [0, 0, 0, 1, 1, 1, 2, 2, 2]);
  const reach = computeReach(b);
  assert.deepEqual([...Array(9).keys()].map((i) => isAccessible(b, reach, i)),
    [false, false, false, false, false, false, true, true, true]);
});

test('cubo fica acessível por túnel aberto até o fundo', () => {
  // coluna do meio vazia do fundo até a linha 1
  const b = createBoard(3, 3, [
    0, 1, 0,
    0, _, 0,
    0, _, 0,
  ]);
  const reach = computeReach(b);
  assert.ok(isAccessible(b, reach, 1)); // cor 1 no topo, acima do túnel
  assert.ok(isAccessible(b, reach, 3)); // lado do túnel
  assert.ok(!isAccessible(b, reach, 0));
  const t = findTarget(b, reach, 1, new Set());
  assert.equal(t.cell, 1);
  const path = buildPath(b, reach, t);
  assert.deepEqual(path[0], { x: 1.5, y: 3.5 });
  assert.equal(path.length, 4);
});

test('bolsão vazio fechado não conta como caminho', () => {
  const b = createBoard(3, 3, [
    0, 1, 0,
    0, _, 0,
    2, 2, 2,
  ]);
  const reach = computeReach(b);
  assert.ok(!isAccessible(b, reach, 1));
  assert.equal(findTarget(b, reach, 1, new Set()), null);
  assert.equal(findTarget(b, reach, 2, new Set([6, 7])).cell, 8);
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
