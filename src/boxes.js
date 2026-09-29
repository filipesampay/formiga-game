// Caixas de formigas: cada uma tem cor + quantidade. Soma por cor = pixels da cor.
export const LANES = 4;
export const SLOTS = 4;

export function splitCount(total, rng, min = 4, max = 12) {
  const parts = [];
  let left = total;
  while (left > 0) {
    if (left <= max) {
      parts.push(left);
      break;
    }
    let n = min + Math.floor(rng() * (max - min + 1));
    if (left - n < min) n = left - min;
    parts.push(n);
    left -= n;
  }
  return parts;
}

// depths[color] = profundidade (0 = linha de baixo, 1 = topo) de cada cubo da cor, em ordem crescente.
// chaos 0 = caixas saem na ordem em que os cubos ficam expostos; 1 = ordem totalmente aleatória.
export function generateLanes(counts, rng, { boxMin = 4, boxMax = 12, lanes: laneCount = LANES, chaos = 1 } = {}, depths = null) {
  const boxes = [];
  counts.forEach((total, color) => {
    let at = 0;
    for (const n of splitCount(total, rng, boxMin, boxMax)) {
      const slice = depths ? depths[color].slice(at, at + n) : [];
      const depth = slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0.5;
      at += n;
      boxes.push({ color, total: n, key: depth * (1 - chaos) + rng() * chaos });
    }
  });
  boxes.sort((a, b) => a.key - b.key);
  const lanes = Array.from({ length: laneCount }, () => []);
  boxes.forEach(({ color, total }, i) => lanes[i % laneCount].push({ color, total }));
  return lanes;
}
