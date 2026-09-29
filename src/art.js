// Desenhos em pixel art (12x14): modelos feitos à mão + rostos e paisagens procedurais.
export const ART_W = 12;
export const ART_H = 14;

export const COLORS = {
  sky: '#6ec6ff', white: '#f4f1ea', black: '#2b2b36', red: '#e8413b', orange: '#ff8c2e',
  yellow: '#ffd23f', green: '#5cc84a', dkgreen: '#2e8b4a', brown: '#8a5a32', pink: '#ff8fb8',
  purple: '#9b5de5', blue: '#3a6fe8', grey: '#9aa0a8', skin: '#f6c29a', tan: '#d9a86c',
  navy: '#2b3a8c', teal: '#1fc8a9', sunset: '#ff9e7a', lilac: '#c9a7ff', dkskin: '#a8704a',
};

// Legenda: char -> lista de cores possíveis (sorteada, sem repetir cor entre chars).
const TEMPLATES = [
  {
    name: 'Gato',
    legend: { '.': ['sky', 'teal', 'lilac', 'green'], b: ['orange', 'grey', 'black', 'tan'], p: ['pink'], w: ['white'], k: ['black', 'navy'] },
    rows: [
      '............',
      '.b........b.',
      '.bb......bb.',
      '.bpb....bpb.',
      '.bbbbbbbbbb.',
      'bbbbbbbbbbbb',
      'bbwwbbbbwwbb',
      'bbwkbbbbwkbb',
      'bbbbbbbbbbbb',
      'bbbbbppbbbbb',
      'wwbbkbbkbbww',
      'bbbbbkkbbbbb',
      '.bbbbbbbbbb.',
      '............',
    ],
  },
  {
    name: 'Sapo',
    legend: { '.': ['sky', 'lilac', 'yellow'], g: ['green', 'teal'], w: ['white'], k: ['black'], r: ['red', 'pink'], l: ['blue', 'navy'] },
    rows: [
      '............',
      '..www..www..',
      '.wkkww.wkkw.',
      '.wkkwwwwkkw.',
      '.gwwggggwwg.',
      'gggggggggggg',
      'gggkggggkggg',
      'gggggggggggg',
      'grgggggggggr',
      'ggrrrrrrrrgg',
      '.gggggggggg.',
      'llgggggggggl',
      'llllgggglll.',
      'llllllllllll',
    ],
  },
  {
    name: 'Peixe-palhaço',
    legend: { '.': ['blue', 'teal', 'navy'], o: ['orange', 'red'], w: ['white'], k: ['black'], y: ['yellow', 'tan'], g: ['green', 'dkgreen'] },
    rows: [
      '.........w..',
      '..........w.',
      '....ooo..w..',
      '...owoooo...',
      'o.oowoooow..',
      'oooowoookow.',
      'oooowoooowoo',
      'oooowoooowoo',
      'o.oowoooow..',
      '...owoooo...',
      '....ooo..g..',
      '.g.......g..',
      '.g..g..g.g.g',
      'yyyyyyyyyyyy',
    ],
  },
  {
    name: 'Porquinho',
    legend: { '.': ['sky', 'green', 'yellow'], p: ['pink'], r: ['red', 'purple'], k: ['black'] },
    rows: [
      '............',
      '.pp......pp.',
      '.ppp....ppp.',
      '.pppppppppp.',
      'pppppppppppp',
      'ppkppppppkpp',
      'pppppppppppp',
      'pppprrrrpppp',
      'ppprkrrkrppp',
      'pppprrrrpppp',
      'pppppppppppp',
      '.pppppppppp.',
      '..pppppppp..',
      '............',
    ],
  },
  {
    name: 'Pintinho',
    legend: { '.': ['sky', 'lilac'], y: ['yellow'], o: ['orange', 'red'], k: ['black'], g: ['green', 'dkgreen'] },
    rows: [
      '............',
      '.....yy.....',
      '....yyyy....',
      '...yyyyyy...',
      '...ykyyky...',
      '...yyooyy...',
      '..yyyooyyy..',
      '.yyyyyyyyyy.',
      'yyyyyyyyyyyy',
      'yyyyyyyyyyyy',
      '.yyyyyyyyyy.',
      '..yyyyyyyy..',
      'gggoggggoggg',
      'ggoogggoogg.',
    ],
  },
  {
    name: 'Cogumelo',
    legend: { '.': ['sky', 'navy', 'lilac'], r: ['red', 'purple', 'orange'], w: ['white'], t: ['tan', 'skin'], k: ['black'], g: ['green', 'dkgreen'] },
    rows: [
      '............',
      '....rrrr....',
      '..rrwwrrrr..',
      '.rrrwwrrwwr.',
      '.rrrrrrrwwr.',
      'rwwrrrrrrrrr',
      'rwwrrrwwrrrr',
      'rrrrrrwwrrrr',
      '...tttttt...',
      '...tkttkt...',
      '...tttttt...',
      '...tttttt...',
      'gggttttttggg',
      'gggggggggggg',
    ],
  },
  {
    name: 'Robô',
    legend: { '.': ['sky', 'lilac', 'yellow'], g: ['grey'], w: ['white'], k: ['black'], y: ['yellow', 'orange'], b: ['blue', 'teal', 'red'], r: ['red', 'pink'] },
    rows: [
      '......r.....',
      '......k.....',
      '..gggggggg..',
      '..gggggggg..',
      '..gwwggwwg..',
      '..gwkggkwg..',
      '..gggggggg..',
      '..gyyyyyyg..',
      '..gggggggg..',
      '....gggg....',
      '.bbbbbbbbbb.',
      'bbbrbbbbybbb',
      'bbbbbbbbbbbb',
      'bbbbbbbbbbbb',
    ],
  },
  {
    name: 'Fantasminha',
    legend: { '.': ['navy', 'purple', 'black'], w: ['white'], k: ['black', 'blue'], y: ['yellow'], p: ['pink'] },
    rows: [
      '.........yy.',
      '....wwww.yyy',
      '..wwwwwwwwy.',
      '.wwwwwwwwww.',
      '.wwkkwwkkww.',
      '.wwkkwwkkww.',
      '.wwwwwwwwww.',
      '.wpwwkkwwpw.',
      '.wwwwkkwwww.',
      '.wwwwwwwwww.',
      '.wwwwwwwwww.',
      '.wwwwwwwwww.',
      '.w.ww.ww.ww.',
      '............',
    ],
  },
  {
    name: 'Abelha',
    legend: { '.': ['sky', 'green', 'pink'], y: ['yellow'], k: ['black'], w: ['white'], s: ['lilac', 'teal'] },
    rows: [
      '............',
      '...ss..ss...',
      '..ssss.sss..',
      '..ssssssss..',
      '...sssss....',
      '..yykkyyk...',
      '.kyykkyykyy.',
      'kwyykkyykyyy',
      'kkyykkyykyyy',
      '.kyykkyykyy.',
      '..yykkyyk...',
      '............',
      '...k....k...',
      '............',
    ],
  },
  {
    name: 'Coração',
    legend: { '.': ['pink', 'lilac', 'sky', 'yellow'], r: ['red', 'purple'], w: ['white'] },
    rows: [
      '............',
      '............',
      '.rrr....rrr.',
      'rrrrr..rrrrr',
      'rwwrrrrrrrrr',
      'rwrrrrrrrrrr',
      'rrrrrrrrrrrr',
      '.rrrrrrrrrr.',
      '..rrrrrrrr..',
      '...rrrrrr...',
      '....rrrr....',
      '.....rr.....',
      '............',
      '............',
    ],
  },
];

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Resolve legenda em cores distintas.
function resolveLegend(legend, rng) {
  const used = new Set();
  const out = {};
  for (const [ch, opts] of Object.entries(legend)) {
    const free = opts.filter((c) => !used.has(c));
    const c = pick(rng, free.length ? free : opts);
    used.add(c);
    out[ch] = c;
  }
  return out;
}

function fromTemplate(t, rng) {
  const colors = resolveLegend(t.legend, rng);
  const grid = t.rows.map((r) => [...r].map((ch) => colors[ch]));
  return { name: t.name, grid };
}

function blank(color) {
  return Array.from({ length: ART_H }, () => new Array(ART_W).fill(color));
}

function put(grid, x, y, c) {
  if (x >= 0 && x < ART_W && y >= 0 && y < ART_H) grid[y][x] = c;
}

function disc(grid, cx, cy, rx, ry, c) {
  for (let y = 0; y < ART_H; y++)
    for (let x = 0; x < ART_W; x++)
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) grid[y][x] = c;
}

// Rosto: cabeça + cabelo + olhos + boca, cada parte sorteada.
function makeFace(rng) {
  const bg = pick(rng, ['sky', 'yellow', 'lilac', 'teal', 'pink']);
  const skin = pick(rng, ['skin', 'tan', 'dkskin']);
  const hair = pick(rng, ['brown', 'black', 'orange', 'yellow', 'purple'].filter((c) => c !== bg));
  const shirt = pick(rng, ['red', 'blue', 'green', 'navy'].filter((c) => c !== bg));
  const g = blank(bg);
  for (let x = 1; x < 11; x++) for (let y = 12; y < 14; y++) put(g, x, y, shirt);
  put(g, 0, 13, shirt); put(g, 11, 13, shirt);
  disc(g, 6, 6.8, 4.6, 5.4, skin);
  put(g, 1, 7, skin); put(g, 10, 7, skin); // orelhas

  const hairStyle = pick(rng, ['curto', 'espetado', 'longo', 'bone']);
  if (hairStyle === 'bone') {
    const cap = pick(rng, ['red', 'blue', 'green', 'orange'].filter((c) => c !== bg && c !== shirt));
    for (let y = 1; y < 4; y++) for (let x = 2; x < 10; x++) put(g, x, y, cap);
    for (let x = 1; x < 11; x++) put(g, x, 4, cap);
    put(g, 11, 4, cap);
    for (let x = 3; x < 9; x++) put(g, x, 0, x > 3 && x < 8 ? cap : bg);
  } else {
    for (let y = 1; y < 4; y++)
      for (let x = 2; x < 10; x++) if (g[y][x] === skin || y === 1) put(g, x, y, hair);
    for (let x = 3; x < 9; x++) put(g, x, 1, hair);
    if (hairStyle === 'espetado') {
      for (const x of [2, 4, 6, 8]) put(g, x, 0, hair);
      put(g, 9, 1, hair); put(g, 2, 1, hair);
    }
    if (hairStyle === 'longo') {
      for (let y = 3; y < 12; y++) { put(g, 1, y, hair); put(g, 10, y, hair); }
      put(g, 2, 4, hair); put(g, 9, 4, hair);
    }
  }

  const eyes = pick(rng, ['ponto', 'grande', 'oculos']);
  if (eyes === 'ponto') { put(g, 4, 6, 'black'); put(g, 7, 6, 'black'); }
  if (eyes === 'grande') {
    for (const x of [3, 7]) { put(g, x, 6, 'white'); put(g, x + 1, 6, 'black'); put(g, x, 5, 'white'); put(g, x + 1, 5, 'white'); }
  }
  if (eyes === 'oculos') {
    for (let x = 2; x < 10; x++) put(g, x, 6, 'black');
    for (const x of [3, 4, 7, 8]) put(g, x, 5, 'black');
  }
  if (rng() < 0.6) { put(g, 2, 8, 'pink'); put(g, 9, 8, 'pink'); }
  put(g, 6, 7, pick(rng, [skin, 'dkskin', 'pink']));

  const mouth = pick(rng, ['sorriso', 'aberta', 'reta']);
  if (mouth === 'sorriso') { put(g, 4, 9, 'black'); put(g, 7, 9, 'black'); for (let x = 5; x < 7; x++) put(g, x, 10, 'black'); }
  if (mouth === 'aberta') { for (let x = 5; x < 7; x++) { put(g, x, 9, 'black'); put(g, x, 10, 'red'); } }
  if (mouth === 'reta') { for (let x = 4; x < 8; x++) put(g, x, 9, 'black'); }
  return { name: 'Rosto', grid: g };
}

// Paisagem: céu + astro + montanhas/colinas + chão + árvore ou casa.
function makeLandscape(rng) {
  const time = pick(rng, ['dia', 'tarde', 'noite']);
  const sky = { dia: 'sky', tarde: 'sunset', noite: 'navy' }[time];
  const g = blank(sky);
  const astro = time === 'noite' ? 'white' : 'yellow';
  const ax = 1.5 + rng() * 9;
  disc(g, ax, 2.3, 1.6, 1.6, astro);
  if (time === 'noite') for (let i = 0; i < 4; i++) put(g, Math.floor(rng() * 12), Math.floor(rng() * 5), 'yellow');
  else if (rng() < 0.7) {
    const cx = Math.floor(rng() * 9);
    for (let x = cx; x < cx + 4; x++) put(g, x, 1, 'white');
    for (let x = cx + 1; x < cx + 3; x++) put(g, x, 0, 'white');
  }

  const mount = pick(rng, ['grey', 'purple', 'dkgreen']);
  let h = 5 + Math.floor(rng() * 3);
  for (let x = 0; x < ART_W; x++) {
    h = Math.max(3, Math.min(8, h + Math.floor(rng() * 3) - 1 + (x % 4 === 0 ? 1 : 0)));
    const top = ART_H - 4 - h;
    for (let y = Math.max(0, top); y < ART_H; y++) put(g, x, y, mount);
    if (h >= 6 && mount !== 'dkgreen') put(g, x, Math.max(0, top), 'white');
  }

  const ground = time === 'noite' ? 'dkgreen' : 'green';
  const gy = ART_H - 4;
  for (let x = 0; x < ART_W; x++) {
    const bump = Math.round(Math.sin(x * 0.8 + rng()) * 0.6);
    for (let y = gy + bump; y < ART_H; y++) put(g, x, y, ground);
  }
  if (rng() < 0.5) {
    for (let x = 0; x < ART_W; x++) put(g, x, ART_H - 1, 'blue');
    for (let x = 2; x < 10; x++) put(g, x, ART_H - 2, 'blue');
  }

  const obj = pick(rng, ['arvore', 'casa']);
  const ox = 1 + Math.floor(rng() * 7);
  if (obj === 'arvore') {
    for (let y = gy - 2; y < gy + 1; y++) put(g, ox + 1, y, 'brown');
    disc(g, ox + 1.5, gy - 3.3, 1.9, 1.7, ground === 'green' ? 'dkgreen' : 'green');
  } else {
    const wall = pick(rng, ['white', 'tan', 'yellow'].filter((c) => c !== astro));
    for (let y = gy - 3; y < gy + 1; y++) for (let x = ox; x < ox + 4; x++) put(g, x, y, wall);
    for (let x = ox - 1; x < ox + 5; x++) put(g, x, gy - 4, 'red');
    for (let x = ox; x < ox + 4; x++) put(g, x, gy - 5, 'red');
    put(g, ox + 1, gy - 6, 'red'); put(g, ox + 2, gy - 6, 'red');
    put(g, ox + 1, gy, 'brown'); put(g, ox + 1, gy - 1, 'brown');
    put(g, ox + 3, gy - 2, 'blue');
  }
  return { name: time === 'noite' ? 'Noite no campo' : 'Paisagem', grid: g };
}

export const KINDS = [...TEMPLATES.map((t) => t.name), 'Rosto', 'Paisagem'];

export function makeDrawing(rng, kind) {
  let art;
  if (kind === 'Rosto') art = makeFace(rng);
  else if (kind === 'Paisagem') art = makeLandscape(rng);
  else art = fromTemplate(TEMPLATES.find((t) => t.name === kind), rng);
  if (rng() < 0.5) art.grid = art.grid.map((r) => r.slice().reverse());
  return art;
}

export { TEMPLATES };
