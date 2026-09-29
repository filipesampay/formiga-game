// Resolvedor rápido: joga a fase com formigas instantâneas e escolhas cuidadosas.
// Se ele vence, um jogador paciente (que espera as formigas antes de escolher) também consegue.
import { computeReach, findTarget, accessPoint, crumbleStones, EMPTY } from './board.js';
import { SLOTS } from './boxes.js';

function accessibleCount(board, reach, color) {
  let n = 0;
  for (let i = 0; i < board.cells.length; i++) {
    if (board.cells[i] === color && accessPoint(board, reach, i)) n++;
  }
  return n;
}

export function solvable(board0, lanes0) {
  const board = { ...board0, cells: board0.cells.slice() };
  crumbleStones(board);
  const lanes = lanes0.map((l) => l.map((b) => ({ ...b })));
  const slots = [];
  let reach = computeReach(board);
  for (let guard = 0; guard < 5000; guard++) {
    if (board.cells.every((c) => c < 0)) return true;

    // tira um cubo por caixa ativa (como as formigas trabalhando juntas)
    let took = false;
    for (const box of slots.slice()) {
      const t = findTarget(board, reach, box.color, new Set());
      if (!t) continue;
      board.cells[t.cell] = EMPTY;
      crumbleStones(board);
      reach = computeReach(board);
      took = true;
      if (--box.remaining === 0) slots.splice(slots.indexOf(box), 1);
    }

    // escolhe caixa nova se houver espaço: a cor com mais cubos livres além do que já está pedido
    const open = lanes.map((l, i) => i).filter((i) => lanes[i].length);
    if (slots.length < SLOTS && open.length) {
      const demand = {};
      for (const b of slots) demand[b.color] = (demand[b.color] || 0) + b.remaining;
      let best = null;
      for (const i of open) {
        const c = lanes[i][0].color;
        const score = accessibleCount(board, reach, c) - (demand[c] || 0);
        if (!best || score > best.score) best = { i, score };
      }
      if (best.score > 0 || !took) {
        const b = lanes[best.i].shift();
        slots.push({ color: b.color, remaining: b.total });
        continue;
      }
    }
    if (!took) return false;
  }
  return false;
}
