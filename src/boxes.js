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

export function generateLanes(counts, rng, { boxMin = 4, boxMax = 12, lanes: laneCount = LANES } = {}) {
  const boxes = [];
  counts.forEach((total, color) => {
    for (const n of splitCount(total, rng, boxMin, boxMax)) boxes.push({ color, total: n });
  });
  for (let i = boxes.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [boxes[i], boxes[j]] = [boxes[j], boxes[i]];
  }
  const lanes = Array.from({ length: laneCount }, () => []);
  boxes.forEach((b, i) => lanes[i % laneCount].push(b));
  return lanes;
}
