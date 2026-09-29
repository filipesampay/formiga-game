// Sons sintetizados na hora (sem arquivos). iOS só libera áudio depois de um toque.
let ctx = null;
let master = null;
let muted = false;
let lastPop = 0;
let combo = 0;

try {
  muted = localStorage.getItem('formigas.mute') === '1';
} catch {
  // sem storage: começa com som
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    // buffer mudo destrava o áudio no Safari
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function isMuted() {
  return muted;
}

export function setMuted(v) {
  muted = v;
  if (master) master.gain.setTargetAtTime(v ? 0 : 0.7, ctx.currentTime, 0.02);
  try {
    localStorage.setItem('formigas.mute', v ? '1' : '0');
  } catch {
    // ignora
  }
}

function ready() {
  if (!ctx || muted) return false;
  if (ctx.state === 'suspended') ctx.resume();
  return ctx.state !== 'closed';
}

function tone({ type = 'sine', from, to, at = 0, dur = 0.12, vol = 0.4, attack = 0.004 }) {
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function click(vol = 0.25) {
  const len = Math.floor(ctx.sampleRate * 0.02);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  f.type = 'bandpass';
  f.frequency.value = 3200;
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(f).connect(g).connect(master);
  src.start();
}

// Pop do cubo: pegadas em sequência sobem de tom (até uma oitava), soltas voltam ao início.
export function pop() {
  if (!ready()) return;
  const now = performance.now();
  if (now - lastPop < 35) return;
  combo = now - lastPop < 650 ? Math.min(combo + 1, 12) : 0;
  lastPop = now;
  const f = 560 * 2 ** ([0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21][combo] / 12);
  tone({ from: f * 1.9, to: f, dur: 0.11, vol: 0.32 });
  tone({ type: 'triangle', from: f * 2, to: f * 2, dur: 0.05, vol: 0.06 });
  click(0.18);
}

// Pedra quebrando: estalo grave com ruído.
export function crumble() {
  if (!ready()) return;
  const len = Math.floor(ctx.sampleRate * 0.25);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  f.type = 'lowpass';
  f.frequency.value = 900;
  g.gain.value = 0.5;
  src.buffer = buf;
  src.connect(f).connect(g).connect(master);
  src.start();
  tone({ type: 'triangle', from: 160, to: 70, dur: 0.22, vol: 0.3 });
}

export function boxDone() {
  if (!ready()) return;
  tone({ type: 'triangle', from: 880, to: 880, dur: 0.14, vol: 0.18 });
  tone({ type: 'triangle', from: 1318, to: 1318, at: 0.07, dur: 0.2, vol: 0.16 });
}

export function tap() {
  if (!ready()) return;
  tone({ type: 'sine', from: 300, to: 180, dur: 0.08, vol: 0.2 });
}

export function win() {
  if (!ready()) return;
  [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', from: f, to: f, at: i * 0.09, dur: 0.28, vol: 0.2 }));
}

export function lose() {
  if (!ready()) return;
  [392, 330, 262].forEach((f, i) => tone({ type: 'sine', from: f, to: f * 0.97, at: i * 0.16, dur: 0.3, vol: 0.2 }));
}
