'use strict';
// ===== Utilitaires, RNG, bruit, audio =====
const TS = 32;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const ang = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
class RNG {
  constructor(seed) { this.f = mulberry32(seed); }
  next() { return this.f(); }
  range(a, b) { return a + (b - a) * this.f(); }
  int(a, b) { return Math.floor(a + (b - a + 1) * this.f()); }
  pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
  chance(p) { return this.f() < p; }
  wpick(table) { // [[value, weight],...]
    let tot = 0; for (const e of table) tot += e[1];
    let r = this.f() * tot;
    for (const e of table) { r -= e[1]; if (r <= 0) return e[0]; }
    return table[table.length - 1][0];
  }
}
function hash2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi, s), hash2(xi + 1, yi, s), u), lerp(hash2(xi, yi + 1, s), hash2(xi + 1, yi + 1, s), u), v);
}
function fbm(x, y, s, oct = 4) {
  let a = .5, f = 1, t = 0, n = 0;
  for (let i = 0; i < oct; i++) { t += a * vnoise(x * f, y * f, s + i * 101); n += a; a *= .5; f *= 2; }
  return t / n;
}

// ===== Réglages (persistants) =====
const SET_DEFAULT = { vol: .8, music: .5, shake: 1, dmgNums: true, tips: true, tutorial: true, hud: 1, quality: 1, hitstop: true, autopause: true, mode3d: false };
const SET = Object.assign({}, SET_DEFAULT);
try { Object.assign(SET, JSON.parse(localStorage.getItem('zs_set') || '{}')); } catch (e) { }
function saveSettings() { try { localStorage.setItem('zs_set', JSON.stringify(SET)); } catch (e) { } if (window.SFX && SFX.ctx) { SFX.setVol(); } }

// ===== Audio synthétisé (aucun fichier externe) =====
const SFX = {
  ctx: null, master: null, nbuf: null, on: true, last: {},
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = .45 * SET.vol; this.master.connect(this.ctx.destination);
      this.musicG = this.ctx.createGain(); this.musicG.gain.value = 0; this.musicG.connect(this.ctx.destination);
      this.nbuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.nbuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  setVol() { if (!this.ctx) return; this.master.gain.value = .45 * SET.vol; if (this.musicG) this.musicG.gain.value = this.droneOn ? .06 * SET.music * this.droneLv : 0; },
  // nappe ambiante : danger 0..1
  drone(lv) {
    if (!this.ctx) return; this.droneLv = lv;
    if (!this.droneOn) {
      this.droneOn = true; const c = this.ctx, f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.connect(this.musicG);
      this.droneF = f; for (const [fr, tp] of [[55, 'sawtooth'], [82.4, 'triangle'], [110.8, 'sine']]) { const o = c.createOscillator(); o.type = tp; o.frequency.value = fr; o.detune.value = (Math.random() - .5) * 14; const g = c.createGain(); g.gain.value = .35; o.connect(g); g.connect(f); o.start(); }
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .07; lg.gain.value = 90; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    }
    const t = this.ctx.currentTime; this.musicG.gain.cancelScheduledValues(t); this.musicG.gain.setTargetAtTime(.06 * SET.music * (.4 + lv), t, 1.5);
    this.droneF.frequency.setTargetAtTime(220 + lv * 380, t, 2);
  },
  droneOff() { if (this.musicG) this.musicG.gain.setTargetAtTime(0, this.ctx.currentTime, .3); },
  rain(level) { // 0..1
    if (!this.ctx) return;
    if (!this.rainG) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.nbuf; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = .5; this.rainG = c.createGain(); this.rainG.gain.value = 0; s.connect(f); f.connect(this.rainG); this.rainG.connect(this.master); s.start(); }
    this.rainG.gain.setTargetAtTime(this.on ? level * .22 : 0, this.ctx.currentTime, .6);
  },
  tone(type, f0, f1, dur, vol = .3, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .02);
  },
  noise(dur, vol, lp0, lp1, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.nbuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(lp0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, lp1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + .02);
  },
  play(n, vol = 1, extra) {
    if (!this.on || !this.ctx) return;
    const now = performance.now();
    if (this.last[n] && now - this.last[n] < 35) return;
    this.last[n] = now;
    const v = vol;
    switch (n) {
      case 'pistol': this.noise(.16, .5 * v, 5000, 300); this.tone('square', 220, 60, .1, .15 * v); break;
      case 'smg': this.noise(.1, .4 * v, 5500, 400); this.tone('square', 260, 80, .06, .1 * v); break;
      case 'rifle': this.noise(.22, .6 * v, 4500, 200); this.tone('sawtooth', 160, 40, .18, .2 * v); break;
      case 'shotgun': this.noise(.3, .8 * v, 3500, 120); this.tone('sawtooth', 120, 30, .25, .3 * v); break;
      case 'silenced': this.noise(.07, .15 * v, 1800, 300); break;
      case 'bow': this.tone('triangle', 500, 150, .12, .15 * v); this.noise(.06, .1 * v, 3000, 800); break;
      case 'flame': this.noise(.12, .3 * v, 1800, 600); break;
      case 'swing': this.noise(.1, .18 * v, 2500, 600); break;
      case 'hit': this.tone('square', 180, 60, .08, .18 * v); break;
      case 'thud': this.tone('sine', 120, 40, .15, .3 * v); this.noise(.08, .2 * v, 900, 200); break;
      case 'groan': { const f = 70 + Math.random() * 40; this.tone('sawtooth', f, f * .6, .5, .1 * v); } break;
      case 'screech': this.tone('sawtooth', 900, 400, .8, .15 * v); this.tone('square', 1200, 500, .8, .06 * v); break;
      case 'explode': this.noise(.7, .9 * v, 2500, 60); this.tone('sine', 90, 25, .6, .5 * v); break;
      case 'hurt': this.tone('sawtooth', 200, 80, .2, .25 * v); break;
      case 'pickup': this.tone('sine', 700, 1100, .08, .15 * v); break;
      case 'ui': this.tone('square', 500, 600, .04, .08 * v); break;
      case 'build': this.tone('square', 150, 100, .06, .2 * v); this.noise(.05, .2 * v, 1500, 400); break;
      case 'reload': this.tone('square', 300, 200, .04, .15 * v); this.tone('square', 450, 300, .05, .15 * v, .12); break;
      case 'click': this.tone('square', 900, 700, .02, .1 * v); break;
      case 'levelup': this.tone('sine', 500, 500, .1, .2 * v); this.tone('sine', 700, 700, .1, .2 * v, .1); this.tone('sine', 1000, 1000, .2, .2 * v, .2); break;
      case 'alarm': this.tone('square', 600, 600, .15, .15 * v); this.tone('square', 450, 450, .15, .15 * v, .2); this.tone('square', 600, 600, .15, .15 * v, .4); break;
      case 'eat': this.noise(.12, .2 * v, 900, 300); this.noise(.12, .2 * v, 900, 300, .15); break;
      case 'drink': this.noise(.3, .15 * v, 1200, 400); break;
      case 'engine': this.tone('sawtooth', 48 + (extra || 0) * 70, 40 + (extra || 0) * 60, .13, .09 * v); break;
      case 'thunder': this.noise(2.2, .7 * v, 700, 50); this.tone('sine', 55, 25, 1.6, .4 * v); break;
      case 'hitm': this.tone('square', 1500, 1100, .035, .07 * v); break;
      case 'killm': this.tone('triangle', 900, 1500, .09, .1 * v); break;
      case 'heart': this.tone('sine', 62, 38, .12, .3 * v); this.tone('sine', 58, 36, .12, .24 * v, .2); break;
      case 'whoosh': this.noise(.25, .12 * v, 900, 3000); break;
      case 'banner': this.tone('sine', 330, 330, .25, .12 * v); this.tone('sine', 495, 495, .4, .1 * v, .12); break;
      case 'zdie': this.tone('sawtooth', 150, 40, .4, .15 * v); break;
    }
  }
};
