// Atualiza VERSION/ASSETS do sw.js com o hash dos arquivos do jogo: node tools/stamp.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);

export function assetList() {
  const src = readdirSync(new URL('src/', root)).filter((f) => f.endsWith('.js')).sort().map((f) => `src/${f}`);
  return ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png', ...src];
}

export function stampBlock() {
  const files = assetList();
  const hash = createHash('sha256');
  for (const f of files.filter((f) => f !== './')) hash.update(f).update(readFileSync(new URL(f, root)));
  const version = hash.digest('hex').slice(0, 12);
  return `// @stamp-start\nconst VERSION = '${version}';\nconst ASSETS = ${JSON.stringify(files, null, 2).replace(/"/g, "'")};\n// @stamp-end`;
}

export function readSw() {
  return readFileSync(new URL('sw.js', root), 'utf8');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sw = readSw().replace(/\/\/ @stamp-start[\s\S]*?\/\/ @stamp-end/, stampBlock());
  writeFileSync(new URL('sw.js', root), sw);
  console.log(sw.match(/VERSION = '(.*)'/)[0]);
}
