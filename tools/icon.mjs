// Gera os ícones PNG (pixel art) sem dependências: node tools/icon.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const ART = [
  '..................',
  '......cccccc......',
  '......cwwccc......',
  '......cwcccc......',
  '......cccccc......',
  '......dddddd......',
  '.....k..kk..k.....',
  '......k.kk.k......',
  '.......kkkk.......',
  '...k...kkkk...k...',
  '....k...kk...k....',
  '..kk..kkkkkk..kk..',
  '......kkkkkk......',
  '....k..pppp..k....',
  '...k..pppppp..k...',
  '......pppppp......',
  '.......pppp.......',
  '..................',
];
const COLORS = {
  '.': [155, 216, 106], c: [255, 243, 214], w: [255, 255, 255], d: [224, 200, 154],
  k: [36, 21, 12], p: [255, 79, 139],
};

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size) {
  const px = Math.floor(size / ART.length);
  const off = Math.floor((size - px * ART.length) / 2);
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - off) / px);
      const gy = Math.floor((y - off) / px);
      const ch = ART[gy]?.[gx] ?? '.';
      COLORS[ch].forEach((v, k) => { row[1 + x * 3 + k] = v; });
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const r of ART) if (r.length !== 18) throw new Error(`linha com ${r.length}: ${r}`);
writeFileSync(new URL('../icon-180.png', import.meta.url), png(180));
writeFileSync(new URL('../icon-512.png', import.meta.url), png(512));
console.log('ícones gerados');
