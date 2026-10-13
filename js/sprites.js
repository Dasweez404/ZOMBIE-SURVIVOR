'use strict';
// ===== Sprites pré-rendus (arbres, rochers, caisses, structures…) =====
const SPR = new Map();
function sprite(key, w, h, fn, scale) {
  let s = SPR.get(key); if (s) return s; scale = scale || 2;
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w * scale); cv.height = Math.ceil(h * scale); const c = cv.getContext('2d'); c.scale(scale, scale); c.translate(w / 2, h / 2); fn(c);
  s = { cv, w, h }; SPR.set(key, s); return s;
}
function blit(c, s, x, y, rot, sc, ox, oy) {
  if (!rot && !sc) { c.drawImage(s.cv, x - s.w / 2 + (ox || 0), y - s.h / 2 + (oy || 0), s.w, s.h); return; }
  c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (sc) c.scale(sc, sc); c.drawImage(s.cv, -s.w / 2 + (ox || 0), -s.h / 2 + (oy || 0), s.w, s.h); c.restore();
}
function flashOf(s) { // silhouette blanche (coup reçu)
  if (s.flash) return s.flash; const cv = document.createElement('canvas'); cv.width = s.cv.width; cv.height = s.cv.height; const c = cv.getContext('2d'); c.drawImage(s.cv, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); s.flash = { cv, w: s.w, h: s.h }; return s.flash;
}
function rngOf(seed) { return mulberry32(seed | 0); }
function gradBall(c, x, y, r, c1, c2, lx, ly) { // sphère éclairée en haut à gauche
  const g = c.createRadialGradient(x + (lx === undefined ? -r * .35 : lx), y + (ly === undefined ? -r * .4 : ly), r * .08, x, y, r); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function glowSprite(rgb) {
  return sprite('glow:' + rgb, 64, 64, c => { const g = c.createRadialGradient(0, 0, 0, 0, 0, 32); g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(.35, 'rgba(' + rgb + ',.45)'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); c.fillStyle = g; c.fillRect(-32, -32, 64, 64); }, 1);
}
function smokeSprite() {
  return sprite('smoke', 48, 48, c => { const g = c.createRadialGradient(0, 0, 0, 0, 0, 24); g.addColorStop(0, 'rgba(80,80,84,.7)'); g.addColorStop(.6, 'rgba(70,70,74,.35)'); g.addColorStop(1, 'rgba(60,60,64,0)'); c.fillStyle = g; c.fillRect(-24, -24, 48, 48); }, 1);
}

// ---------- arbres ----------
const LEAF = {
  oak: { dark: '#17391c', mid1: '#3a8238', mid2: '#245c2a', light: '#8fd25e', spec: ['#9ad868', '#1d4a22', '#58a448'] },
  autumn: { dark: '#4a1e10', mid1: '#d07a28', mid2: '#a8481c', light: '#ffc65a', spec: ['#ffd070', '#7a2a10', '#e8902c'] },
  birch: { dark: '#3a5a22', mid1: '#9cc84e', mid2: '#6a9a38', light: '#d8ee8a', spec: ['#e6f5a0', '#4a7428', '#b4d860'] },
};
function leafBlobs(c, pal, r, n, spread, seed) {
  const rnd = rngOf(seed), bl = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU + rnd() * .6, d = spread * (.45 + rnd() * .55); bl.push([Math.cos(a) * d, Math.sin(a) * d - 3, r * (.7 + rnd() * .45)]); }
  bl.push([0, -3, r * 1.05]);
  c.fillStyle = pal.dark; for (const [x, y, rr] of bl) { c.beginPath(); c.arc(x + 1.5, y + 2, rr + 1.5, 0, TAU); c.fill(); }
  for (const [x, y, rr] of bl) gradBall(c, x, y, rr, pal.mid1, pal.mid2);
  for (const [x, y, rr] of bl) { const g = c.createRadialGradient(x - rr * .3, y - rr * .4, 0, x - rr * .3, y - rr * .4, rr * .65); g.addColorStop(0, pal.light); g.addColorStop(1, 'rgba(255,255,255,0)'); c.globalAlpha = .75; c.fillStyle = g; c.beginPath(); c.arc(x - rr * .3, y - rr * .4, rr * .65, 0, TAU); c.fill(); c.globalAlpha = 1; }
  for (let i = 0; i < 70; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * spread * 1.15; c.fillStyle = pal.spec[i % 3]; c.globalAlpha = .75; c.save(); c.translate(Math.cos(a) * d, Math.sin(a) * d - 3); c.rotate(rnd() * 3); c.beginPath(); c.ellipse(0, 0, 2.2, 1.1, 0, 0, TAU); c.fill(); c.restore(); }
  c.globalAlpha = 1;
}
function treeSprite(kind, v) {
  const key = 'tree:' + kind + ':' + v;
  if (kind === 'oak' || kind === 'autumn' || kind === 'birch') return sprite(key, 84, 84, c => {
    c.fillStyle = '#3a2610'; c.beginPath(); c.ellipse(0, 22, 5, 3, 0, 0, TAU); c.fill();
    leafBlobs(c, LEAF[kind], kind === 'birch' ? 13 : 15, kind === 'birch' ? 6 : 7, kind === 'birch' ? 14 : 15, 500 + v * 31);
  });
  if (kind === 'pine') return sprite(key, 84, 84, c => {
    const rnd = rngOf(900 + v * 17); c.fillStyle = '#2a1a0c'; c.beginPath(); c.ellipse(0, 24, 4, 2.5, 0, 0, TAU); c.fill();
    const tiers = [[31, 16], [24, 14], [16, 12], [9, 10]];
    for (let t = 0; t < tiers.length; t++) {
      const R = tiers[t][0], n = tiers[t][1], pts = []; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + rnd() * .08, rr = i % 2 ? R * (.62 + rnd() * .1) : R * (.92 + rnd() * .12); pts.push([Math.cos(a) * rr, Math.sin(a) * rr - t * 1.2]); }
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); c.closePath(); const g = c.createLinearGradient(-R, -R, R, R); g.addColorStop(0, ['#4a9a62', '#3f8a56', '#368048', '#2f7440'][t]); g.addColorStop(1, ['#11392a', '#133a2a', '#163e2a', '#17432b'][t]); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.stroke();
      c.strokeStyle = 'rgba(160,230,150,.28)'; c.lineWidth = .8; for (let i = 0; i < n; i++) { const a = i / n * TAU + .2; c.beginPath(); c.moveTo(Math.cos(a) * R * .3, Math.sin(a) * R * .3 - t); c.lineTo(Math.cos(a) * R * .85, Math.sin(a) * R * .85 - t); c.stroke(); }
    }
    gradBall(c, -1, -5, 3.5, '#a0e090', '#3a8a48');
  });
  if (kind === 'palm') return sprite(key, 84, 84, c => {
    const rnd = rngOf(1300 + v * 11); c.fillStyle = '#4a3418'; c.beginPath(); c.ellipse(0, 24, 4, 2.5, 0, 0, TAU); c.fill();
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rnd() * .3, L = 30 + rnd() * 8; c.save(); c.rotate(a); const g = c.createLinearGradient(0, 0, L, 0); g.addColorStop(0, '#2f7a30'); g.addColorStop(1, '#6ab048'); c.fillStyle = g; c.beginPath(); c.moveTo(2, 0); c.quadraticCurveTo(L * .5, -9, L, 0); c.quadraticCurveTo(L * .5, 7, 2, 0); c.fill(); c.strokeStyle = 'rgba(220,255,190,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(2, 0); c.lineTo(L * .95, 0); c.stroke(); c.strokeStyle = 'rgba(20,70,20,.5)'; for (let k = 0; k < 6; k++) { const x = 6 + k * (L - 10) / 6; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 3, -5 + k * .4); c.moveTo(x, 0); c.lineTo(x + 3, 4 - k * .3); c.stroke(); } c.restore(); }
    for (const [x, y] of [[-2, -1], [2, 1], [0, 3]]) gradBall(c, x, y, 3, '#8a6a3a', '#3a2610');
  });
  if (kind === 'dead') return sprite(key, 80, 80, c => {
    const rnd = rngOf(1700 + v * 13);
    const br = (x, y, a, L, w, d) => { const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L; c.strokeStyle = d ? '#4a3a2a' : '#6a5440'; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); if (w > 1.4) { c.strokeStyle = 'rgba(190,160,120,.35)'; c.lineWidth = w * .35; c.beginPath(); c.moveTo(x - .6, y - .6); c.lineTo(x2 - .6, y2 - .6); c.stroke(); } if (d < 3 && L > 6) { br(x2, y2, a + (rnd() - .5) * 1.6 - .5, L * .7, w * .65, d + 1); br(x2, y2, a + (rnd() - .5) * 1.6 + .5, L * .65, w * .6, d + 1); } };
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(1, 6, 8, 4, 0, 0, TAU); c.fill(); br(0, 4, -1.57 + (rnd() - .5) * .4, 18, 4, 0);
  });
  if (kind === 'stump') return sprite(key, 40, 40, c => { gradBall(c, 0, 2, 9, '#a07a48', '#5a3c1c', -2, -2); c.strokeStyle = 'rgba(70,44,20,.7)'; c.lineWidth = .8; for (const r of [3, 5.5, 7.8]) { c.beginPath(); c.ellipse(0, 2, r, r * .95, 0, 0, TAU); c.stroke(); } c.strokeStyle = '#3a2410'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 2, 9.5, 0, TAU); c.stroke(); });
}
function treeKindOf(o) {
  const t = G.tiles[o.ty * G.W + o.tx], v = o.v, a = Math.floor(hash2(o.tx, o.ty, 5) * 4);
  if (o.k === 'deadtree') return ['dead', a % 3];
  if (t === T.SAND) return ['palm', a % 2];
  if (t === T.FOREST) return v < .62 ? ['pine', a] : (v < .9 ? ['oak', a] : ['birch', a % 3]);
  if (t === T.DIRT) return v < .5 ? ['autumn', a % 3] : ['oak', a];
  return v < .55 ? ['oak', a] : v < .8 ? ['birch', a % 3] : ['autumn', a % 3];
}

// ---------- rochers, buissons, épaves, caisses ----------
function rockSprite(v) {
  return sprite('rock:' + v, 60, 52, c => {
    const rnd = rngOf(2100 + v * 29), n = 9, pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU + rnd() * .4, rx = 21 + rnd() * 5, ry = 15 + rnd() * 5; pts.push([Math.cos(a) * rx, Math.sin(a) * ry + 2]); }
    const poly = (p, off) => { c.beginPath(); c.moveTo(p[0][0] + (off || 0), p[0][1] + (off || 0)); for (const q of p) c.lineTo(q[0] + (off || 0), q[1] + (off || 0)); c.closePath(); };
    poly(pts); let g = c.createLinearGradient(-20, -16, 20, 18); g.addColorStop(0, '#b4b6be'); g.addColorStop(.5, '#7e8088'); g.addColorStop(1, '#4a4c54'); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1.2; c.stroke();
    const top = pts.map(p => [p[0] * .66 - 3, p[1] * .6 - 4]); poly(top); g = c.createLinearGradient(-14, -14, 10, 8); g.addColorStop(0, 'rgba(220,222,228,.85)'); g.addColorStop(1, 'rgba(150,152,160,.5)'); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(40,40,48,.5)'; c.lineWidth = 1; for (let i = 0; i < 3; i++) { const a = pts[(i * 3) % n], b = top[(i * 3) % n]; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    if (v % 2) { c.fillStyle = 'rgba(70,130,50,.7)'; c.beginPath(); c.ellipse(-8, 6, 7, 3.5, .3, 0, TAU); c.ellipse(6, 9, 5, 2.5, -.2, 0, TAU); c.fill(); }
    if (v === 3) { c.fillStyle = '#c8783a'; for (const [x, y] of [[4, -6], [8, -2], [2, 0], [-6, -4]]) { c.beginPath(); c.arc(x, y, 1.7, 0, TAU); c.fill(); } }
  });
}
function bushSprite(berry, v) {
  return sprite('bush:' + berry + ':' + v, 52, 44, c => {
    const rnd = rngOf(2500 + v * 7); c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(1, 9, 17, 6, 0, 0, TAU); c.fill();
    const bl = [[-9, 2, 10], [9, 3, 9], [0, -5, 11], [-3, 6, 9]]; for (const [x, y, r] of bl) gradBall(c, x, y, r, '#5aa844', '#1f5a26');
    c.strokeStyle = 'rgba(15,50,20,.55)'; c.lineWidth = .8; for (let i = 0; i < 14; i++) { const a = rnd() * TAU, d = rnd() * 12; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d - 1, 2.4, a, a + 2.2); c.stroke(); }
    if (berry === 'berry') for (let i = 0; i < 11; i++) { const a = rnd() * TAU, d = 3 + rnd() * 12, x = Math.cos(a) * d, y = Math.sin(a) * d - 1; gradBall(c, x, y, 2.4, v % 2 ? '#e84a7a' : '#6a7aff', v % 2 ? '#8a1a40' : '#202a8a'); c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(x - 1, y - 1.2, .9, .9); }
  });
}
function herbSprite(v) {
  return sprite('herb:' + v, 40, 40, c => {
    const rnd = rngOf(2700 + v * 5); c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(0, 9, 10, 3.5, 0, 0, TAU); c.fill();
    for (let i = 0; i < 9; i++) { const a = -1.57 + (i - 4) * .22 + (rnd() - .5) * .2, L = 10 + rnd() * 8; c.strokeStyle = i % 2 ? '#5aa844' : '#3a8a3a'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(Math.cos(a) * L * .5 + (rnd() - .5) * 3, 8 + Math.sin(a) * L * .5, Math.cos(a) * L, 8 + Math.sin(a) * L); c.stroke(); }
    const cols = ['#e8dcf8', '#ffb0d0', '#c6a6ff']; for (let i = 0; i < 3; i++) { const x = (i - 1) * 6 + (rnd() - .5) * 3, y = -3 - rnd() * 6; c.fillStyle = cols[(v + i) % 3]; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.26) * 2, y + Math.sin(k * 1.26) * 2, 1.4, 0, TAU); c.fill(); } c.fillStyle = '#f4c830'; c.beginPath(); c.arc(x, y, 1, 0, TAU); c.fill(); }
  });
}
function scrapSprite(v) {
  return sprite('scrap:' + v, 48, 40, c => {
    const rnd = rngOf(2900 + v * 3); c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(1, 8, 16, 6, 0, 0, TAU); c.fill();
    for (let i = 0; i < 9; i++) { c.save(); c.translate((rnd() - .5) * 24, (rnd() - .5) * 14); c.rotate(rnd() * 3); const w = 6 + rnd() * 10, h = 3 + rnd() * 6; const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); const m = i % 3; g.addColorStop(0, ['#b4b8c0', '#c89060', '#8a98a8'][m]); g.addColorStop(1, ['#5a5e68', '#6a3e20', '#46525e'][m]); c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = .8; c.strokeRect(-w / 2, -h / 2, w, h); c.restore(); }
    c.fillStyle = '#1c1c20'; c.beginPath(); c.arc(-9, 2, 5, 0, TAU); c.fill(); c.strokeStyle = '#555'; c.lineWidth = 1.5; c.stroke();
  });
}
function wreckSprite(v, stripped) {
  const cols = [['#8a3a32', '#5a1e1a'], ['#3a5e86', '#1e3450'], ['#7a7a30', '#4a4a1a'], ['#6a6e74', '#3a3e44']][v % 4];
  return sprite('wreck:' + v + (stripped ? 's' : ''), 64, 40, c => {
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(3, 5, 26, 14, 0, 0, TAU); c.fill();
    if (!stripped) { c.fillStyle = '#16161a'; for (const [x, y] of [[-16, -16], [14, -16], [-16, 12], [14, 12]]) { rrect(c, x, y, 13, 6, 2); c.fill(); } }
    const g = c.createLinearGradient(0, -14, 0, 14); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]); c.fillStyle = g; rrect(c, -26, -13, 52, 26, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.3; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.12)'; rrect(c, -24, -12, 48, 5, 3); c.fill();
    c.fillStyle = 'rgba(20,24,30,.9)'; rrect(c, -9, -10, 20, 20, 4); c.fill(); if (!stripped) { c.fillStyle = 'rgba(150,190,215,.55)'; c.fillRect(11, -9, 7, 18); c.fillRect(-18, -8, 6, 16); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .8; c.beginPath(); c.moveTo(12, -8); c.lineTo(16, 2); c.lineTo(13, 8); c.moveTo(16, 2); c.lineTo(18, 7); c.stroke(); }
    const rnd = rngOf(3100 + v); for (let i = 0; i < 7; i++) { c.fillStyle = 'rgba(' + (i % 2 ? '120,60,24' : '40,30,24') + ',.55)'; c.beginPath(); c.ellipse((rnd() - .5) * 44, (rnd() - .5) * 20, 2 + rnd() * 4, 1.5 + rnd() * 2.5, rnd() * 3, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(-20, 1, 6, 8, 0, 0, TAU); c.fill();
  });
}
function crateSprite(kind) {
  return sprite('crate:' + kind, 40, 40, c => {
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(1, 5, 15, 8, 0, 0, TAU); c.fill();
    if (kind === 'air') {
      let g = c.createLinearGradient(-14, -14, 14, 14); g.addColorStop(0, '#6a8a52'); g.addColorStop(1, '#34502a'); c.fillStyle = g; rrect(c, -14, -14, 28, 28, 3); c.fill(); c.strokeStyle = '#1e301a'; c.lineWidth = 1.6; c.stroke();
      c.fillStyle = '#e8c830'; for (let i = 0; i < 4; i++) { c.save(); c.translate(-14, -14 + i * 8); c.rotate(-.4); c.fillRect(0, 0, 8, 3); c.restore(); } c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-5, -4, 10, 2); c.fillRect(-5, 1, 7, 2); c.fillStyle = '#2a3a22'; for (const [x, y] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) { c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); }
      c.strokeStyle = '#e8702a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-14, -14); c.quadraticCurveTo(-24, -22, -18, -20); c.moveTo(14, -14); c.quadraticCurveTo(24, -24, 20, -18); c.stroke();
      return;
    }
    const open = kind === 'open';
    let g = c.createLinearGradient(-14, -14, 14, 14); g.addColorStop(0, open ? '#6a5030' : '#b88a50'); g.addColorStop(1, open ? '#3a2a16' : '#6e4c28'); c.fillStyle = g; rrect(c, -14, -14, 28, 28, 2); c.fill(); c.strokeStyle = '#2e1e0e'; c.lineWidth = 1.5; c.stroke();
    if (open) { c.fillStyle = '#1a120a'; rrect(c, -11, -11, 22, 22, 1); c.fill(); g = c.createLinearGradient(-14, 0, 14, 0); g.addColorStop(0, '#9a7040'); g.addColorStop(1, '#5a3c1c'); c.fillStyle = g; c.save(); c.translate(12, -12); c.rotate(.5); c.fillRect(0, 0, 26, 8); c.strokeRect(0, 0, 26, 8); c.restore(); return; }
    c.strokeStyle = 'rgba(40,24,10,.65)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-14, -14 + i * 7); c.lineTo(14, -14 + i * 7); c.stroke(); }
    c.strokeStyle = 'rgba(255,230,180,.25)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-13, -13 + i * 7); c.lineTo(13, -13 + i * 7); c.stroke(); }
    c.strokeStyle = 'rgba(60,36,14,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-13, -13); c.lineTo(13, 13); c.moveTo(13, -13); c.lineTo(-13, 13); c.stroke();
    c.fillStyle = '#6a6e76'; for (const [x, y] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) { c.beginPath(); c.moveTo(x - 4 * Math.sign(x) * 0, y); c.fillRect(Math.min(x, x - Math.sign(x) * 6), Math.min(y, y - Math.sign(y) * 6), 6, 6); } c.fillStyle = '#c8ccd4'; for (const [x, y] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) { c.beginPath(); c.arc(x, y, 1, 0, TAU); c.fill(); }
  });
}
function propSprite(kind, v) {
  return sprite('prop:' + kind + ':' + v, 56, 52, c => {
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(1, 7, 20, 8, 0, 0, TAU); c.fill();
    if (kind === 'radbarrel') {
      let g = c.createLinearGradient(-11, 0, 11, 0); g.addColorStop(0, '#f0dc3a'); g.addColorStop(.5, '#c8b020'); g.addColorStop(1, '#7a6a10'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.fill(); c.strokeStyle = '#3a3208'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#1e1c08'; c.beginPath(); c.arc(0, 0, 7.5, 0, TAU); c.fill(); c.fillStyle = '#e8e03a'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 6.2, i * 2.094 - .45, i * 2.094 + .45); c.fill(); } c.fillStyle = '#1e1c08'; c.beginPath(); c.arc(0, 0, 1.6, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 10.5, -2.6, -1.2); c.stroke(); return;
    }
    if (kind === 'pew') { let g = c.createLinearGradient(0, -7, 0, 7); g.addColorStop(0, '#a0764a'); g.addColorStop(1, '#6a4a2a'); c.fillStyle = g; rrect(c, -14, -6, 28, 12, 2); c.fill(); c.strokeStyle = '#2e1e0e'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = '#5a3a1e'; c.fillRect(-14, v ? 3 : -6, 28, 3.4); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = .8; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 9, -5); c.lineTo(i * 9, 5); c.stroke(); } return; }
    if (kind === 'altar') { let g = c.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, '#b8b6b0'); g.addColorStop(1, '#6e6c68'); c.fillStyle = g; rrect(c, -16, -10, 32, 20, 2); c.fill(); c.strokeStyle = '#2e2c2a'; c.lineWidth = 1.3; c.stroke(); c.fillStyle = '#f2eee6'; c.fillRect(-14, -6, 28, 12); c.fillStyle = '#c8a030'; c.fillRect(-14, -6, 28, 1.6); c.fillRect(-14, 4.4, 28, 1.6); c.fillStyle = '#d8b440'; c.fillRect(-1.2, -5, 2.4, 10); c.fillRect(-4, -2, 8, 2.4); for (const x of [-10, 10]) { c.fillStyle = '#f8f0d0'; c.fillRect(x - 1.2, -7, 2.4, 6); gradBall(c, x, -8, 1.8, '#fff2a0', '#e08a20'); } return; }
    if (kind === 'desk') { let g = c.createLinearGradient(0, -8, 0, 8); g.addColorStop(0, '#d8bc86'); g.addColorStop(1, '#a88a56'); c.fillStyle = g; rrect(c, -11, -8, 22, 16, 2); c.fill(); c.strokeStyle = '#4a3820'; c.lineWidth = 1.1; c.stroke(); gradBall(c, -15, 0, 4.4, '#7a8a9a', '#3a4654'); c.fillStyle = v ? '#c0402e' : '#3a6ac0'; c.fillRect(-3, -5, 8, 9); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-1, -3, 4, 1); return; }
    if (kind === 'counter') { let g = c.createLinearGradient(0, -9, 0, 9); g.addColorStop(0, '#6a4a30'); g.addColorStop(1, '#3a2616'); c.fillStyle = g; rrect(c, -16, -9, 32, 18, 2); c.fill(); c.strokeStyle = '#1e120a'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(-15, -8, 30, 2); gradBall(c, -6, 0, 2.6, '#f4f4f4', '#a8a8a8'); gradBall(c, 4, -2, 2.4, '#e8a030', '#8a5a10'); c.fillStyle = '#9aa4b0'; c.fillRect(9, 1, 5, 4); return; }
    if (kind === 'labtable') { let g = c.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, '#d0d8e0'); g.addColorStop(1, '#8a96a4'); c.fillStyle = g; rrect(c, -15, -10, 30, 20, 3); c.fill(); c.strokeStyle = '#3a4654'; c.lineWidth = 1.3; c.stroke(); gradBall(c, -8, -3, 3, '#7aff9a', '#1a8a40'); gradBall(c, -1, 3, 2.6, '#ff8aa0', '#8a1a3a'); gradBall(c, 6, -4, 2.8, '#8ad0ff', '#1a5a9a'); c.fillStyle = '#2a323c'; c.fillRect(8, 2, 5, 6); c.fillStyle = '#9aa4b0'; c.fillRect(9, 0, 1.6, 3); return; }
    if (kind === 'tank') { gradBall(c, 0, 0, 12, '#2a3a30', '#0e1612', -2, -2); gradBall(c, 0, 0, 10, 'rgba(160,255,190,.85)', 'rgba(30,150,80,.85)', -3, -3); c.strokeStyle = '#7a8490'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 11.4, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; for (const [x, y] of [[-3, -2], [2, 3], [4, -4], [-1, 5]]) { c.beginPath(); c.arc(x, y, 1.1, 0, TAU); c.fill(); } c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(-4, -5, 2.4, 0, TAU); c.fill(); return; }
    if (kind === 'grave') { c.fillStyle = '#5a4630'; c.beginPath(); c.ellipse(0, 4, 9, 11, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(1, 5, 9, 11, 0, 0, TAU); c.fill(); c.fillStyle = '#4a3a26'; c.beginPath(); c.ellipse(0, 4, 8, 10, 0, 0, TAU); c.fill(); if (v === 0) { c.fillStyle = '#a8a6a0'; c.fillRect(-1.6, -9, 3.2, 12); c.fillRect(-5, -5, 10, 3.2); c.strokeStyle = '#3a3836'; c.lineWidth = .9; c.strokeRect(-1.6, -9, 3.2, 12); } else if (v === 1) { let g = c.createLinearGradient(0, -10, 0, 0); g.addColorStop(0, '#c8c6c0'); g.addColorStop(1, '#8a8884'); c.fillStyle = g; c.beginPath(); c.moveTo(-6, 0); c.lineTo(-6, -6); c.quadraticCurveTo(0, -13, 6, -6); c.lineTo(6, 0); c.closePath(); c.fill(); c.strokeStyle = '#3a3836'; c.lineWidth = 1; c.stroke(); } else { c.fillStyle = '#9a9890'; rrect(c, -6, -8, 12, 9, 1); c.fill(); c.strokeStyle = '#3a3836'; c.lineWidth = 1; c.stroke(); } c.fillStyle = '#d84a6a'; c.beginPath(); c.arc(5, 6, 1.5, 0, TAU); c.arc(-4, 8, 1.3, 0, TAU); c.fill(); return; }
    if (kind === 'egg') { gradBall(c, 0, 0, 12, 'rgba(255,180,210,.95)', 'rgba(130,40,86,.95)', -4, -5); c.strokeStyle = 'rgba(70,14,42,.8)'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.stroke(); c.strokeStyle = 'rgba(160,40,90,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-8, -4); c.quadraticCurveTo(0, 2, 8, -3); c.moveTo(-6, 6); c.quadraticCurveTo(0, 0, 6, 7); c.stroke(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-4, -5, 3, 2, -.6, 0, TAU); c.fill(); c.fillStyle = 'rgba(60,10,30,.5)'; c.beginPath(); c.ellipse(1, 3, 4, 5, 0, 0, TAU); c.fill(); return; }
    if (kind === 'tower') { c.fillStyle = '#4a3a2a'; c.fillRect(-14, -14, 28, 28); c.strokeStyle = '#241a10'; c.lineWidth = 2; c.strokeRect(-14, -14, 28, 28); let g = c.createLinearGradient(-12, -12, 12, 12); g.addColorStop(0, '#8a8a92'); g.addColorStop(1, '#4e4e56'); c.fillStyle = g; c.fillRect(-10, -10, 20, 20); c.strokeStyle = '#2a2a30'; c.lineWidth = 1.2; c.strokeRect(-10, -10, 20, 20); c.beginPath(); c.moveTo(-10, -10); c.lineTo(10, 10); c.moveTo(10, -10); c.lineTo(-10, 10); c.stroke(); c.fillStyle = '#c8402e'; c.fillRect(-2, -2, 4, 4); c.strokeStyle = '#6a4a2a'; c.lineWidth = 2.4; c.strokeRect(-13, -13, 26, 26); return; }
    if (kind === 'rails') { c.fillStyle = '#4a3220'; for (let i = -1; i <= 1; i++) c.fillRect(-12, i * 10 - 2.5, 24, 5); c.strokeStyle = '#8a8e98'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-5, -16); c.lineTo(-5, 16); c.moveTo(5, -16); c.lineTo(5, 16); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = .8; c.beginPath(); c.moveTo(-5.8, -16); c.lineTo(-5.8, 16); c.moveTo(4.2, -16); c.lineTo(4.2, 16); c.stroke(); return; }
    if (kind === 'ore') { const s = rockSprite(1); c.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w, s.h); const rnd = rngOf(77); for (let i = 0; i < 7; i++) { const x = (rnd() - .5) * 26, y = (rnd() - .5) * 16 - 2; gradBall(c, x, y, 1.6 + rnd() * 1.4, i % 2 ? '#fff0b0' : '#e8ecf4', i % 2 ? '#c08a20' : '#8a94a8'); } return; }
    if (kind === 'mast') { c.fillStyle = '#3a3e44'; c.fillRect(-4, -12, 8, 24); c.strokeStyle = '#a0a8b2'; c.lineWidth = 1.6; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-3, -10 + i * 6); c.lineTo(3, -4 + i * 6); c.moveTo(3, -10 + i * 6); c.lineTo(-3, -4 + i * 6); c.stroke(); } c.strokeStyle = '#c8ccd4'; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, -16); c.lineTo(14, -16); c.moveTo(-10, -9); c.lineTo(10, -9); c.stroke(); gradBall(c, 0, -20, 3, '#ff6a5a', '#6a1a14'); return; }
    if (kind === 'furn') {
      if (v === 0) { let g = c.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, '#9a7a50'); g.addColorStop(1, '#5e4228'); c.fillStyle = g; rrect(c, -16, -10, 32, 20, 3); c.fill(); c.strokeStyle = '#2e1e0e'; c.lineWidth = 1; c.stroke(); c.fillStyle = '#e8e0d0'; c.beginPath(); c.arc(-5, -2, 3.5, 0, TAU); c.fill(); c.strokeStyle = '#999'; c.stroke(); c.fillStyle = '#c8402e'; c.fillRect(5, -5, 7, 6); c.fillStyle = '#3a6ac8'; c.fillRect(7, 2, 6, 5); }
      else if (v === 1) { let g = c.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, '#6a7280'); g.addColorStop(1, '#3e4450'); c.fillStyle = g; rrect(c, -17, -9, 34, 18, 3); c.fill(); c.strokeStyle = '#1e222a'; c.stroke(); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(-15, -7, 30, 3); c.strokeStyle = 'rgba(0,0,0,.35)'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 10 + 2, -9); c.lineTo(i * 10 + 2, 9); c.stroke(); } }
      else { let g = c.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, '#7a5a3a'); g.addColorStop(1, '#4a3420'); c.fillStyle = g; rrect(c, -16, -8, 32, 16, 2); c.fill(); c.strokeStyle = '#2a1a0c'; c.stroke(); c.strokeStyle = 'rgba(0,0,0,.4)'; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-16, -8 + i * 4); c.lineTo(16, -8 + i * 4); c.stroke(); } const cs = ['#c8402e', '#3a7ac8', '#e0b030', '#4aa05a']; for (let i = 0; i < 8; i++) { c.fillStyle = cs[i % 4]; c.fillRect(-14 + i * 3.6, -7, 3, 3); c.fillRect(-14 + i * 3.6, -3, 3, 3); } }
      return;
    }
    if (kind === 'tent') {
      const cols = [['#9a8a52', '#5e5230'], ['#6a8a62', '#3a5636'], ['#a8664e', '#6a3a2a']][v % 3];
      const g = c.createLinearGradient(-22, 0, 22, 0); g.addColorStop(0, cols[0]); g.addColorStop(.5, cols[1]); g.addColorStop(1, cols[0]); c.fillStyle = g; c.beginPath(); c.moveTo(-22, 16); c.lineTo(0, -22); c.lineTo(22, 16); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.3; c.stroke();
      c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.moveTo(-5, 16); c.lineTo(0, -4); c.lineTo(5, 16); c.closePath(); c.fill(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(0, -22); c.lineTo(-9, 16); c.moveTo(0, -22); c.lineTo(10, 16); c.stroke(); return;
    }
    if (kind === 'sandbag') {
      for (let r = 0; r < 2; r++) for (let i = 0; i < 3 - r; i++) { const x = -14 + i * 13 + r * 6.5, y = -4 + r * -7; const g = c.createLinearGradient(0, y - 6, 0, y + 6); g.addColorStop(0, '#d8c68e'); g.addColorStop(1, '#8a7a4a'); c.fillStyle = g; rrect(c, x - 7, y - 5.5, 14, 11, 5); c.fill(); c.strokeStyle = '#5a4c2a'; c.lineWidth = 1; c.stroke(); c.strokeStyle = 'rgba(70,56,30,.5)'; c.beginPath(); c.moveTo(x - 2, y - 3); c.lineTo(x - 2, y + 3); c.stroke(); } return;
    }
    if (kind === 'stall') {
      c.fillStyle = '#5a3e22'; c.fillRect(-16, -2, 32, 14); c.fillStyle = '#7a5a36'; c.fillRect(-16, -2, 32, 3);
      for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? '#f0e8d8' : '#c04438'; c.fillRect(-18 + k * 6, -16, 6, 14); } c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1; c.strokeRect(-18, -16, 36, 14); const gs = ['#e04a3a', '#e0b030', '#5ab04a']; for (let i = 0; i < 5; i++) { gradBall(c, -11 + i * 5.5, 5, 2.4, gs[i % 3], '#222'); } return;
    }
  });
}

// ---------- structures du joueur ----------
function structSprite(type) {
  return sprite('st:' + type, 32, 32, c => {
    c.translate(0, 0); const o = -16;
    const plank = (x, y, w, h, c1, c2) => { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g; c.fillRect(x, y, w, h); };
    switch (type) {
      case 'wall_wood': for (let i = 0; i < 4; i++) { plank(o, o + i * 8, 32, 7.4, '#a8814e', '#7a5a34'); c.fillStyle = 'rgba(40,24,10,.5)'; c.fillRect(o, o + i * 8 + 7.4, 32, .8); c.strokeStyle = 'rgba(60,36,14,.35)'; c.lineWidth = .6; c.beginPath(); c.moveTo(o + 3, o + i * 8 + 3); c.lineTo(o + 28, o + i * 8 + 3.6); c.stroke(); c.fillStyle = '#4a4a50'; c.fillRect(o + 2, o + i * 8 + 2, 1.2, 1.2); c.fillRect(o + 28.6, o + i * 8 + 2, 1.2, 1.2); } c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(o, o, 32, 1.5); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(o, o + 30, 32, 2); break;
      case 'wall_stone': plank(o, o, 32, 32, '#9a9ca4', '#6a6c74'); c.strokeStyle = 'rgba(30,32,38,.6)'; c.lineWidth = 1; for (let r = 0; r < 4; r++) { c.beginPath(); c.moveTo(o, o + r * 8); c.lineTo(o + 32, o + r * 8); c.stroke(); const off = (r % 2) * 8; for (let x = o + 8 + off; x < o + 32; x += 16) { c.beginPath(); c.moveTo(x, o + r * 8); c.lineTo(x, o + r * 8 + 8); c.stroke(); } } c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(o, o, 32, 2); c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(o, o + 29, 32, 3); break;
      case 'wall_metal': plank(o, o, 32, 32, '#7a8494', '#4a5262'); c.strokeStyle = '#2e3440'; c.lineWidth = 2; c.strokeRect(o + 2, o + 2, 28, 28); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; c.beginPath(); c.moveTo(o + 4, o + 4); c.lineTo(o + 28, o + 4); c.stroke(); c.fillStyle = '#c0c8d4'; for (const [x, y] of [[6, 6], [26, 6], [6, 26], [26, 26]]) { c.beginPath(); c.arc(o + x, o + y, 1.8, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = .6; c.stroke(); } c.strokeStyle = 'rgba(30,36,46,.6)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(o + 8, o + 8); c.lineTo(o + 24, o + 24); c.moveTo(o + 24, o + 8); c.lineTo(o + 8, o + 24); c.stroke(); break;
      case 'door': plank(o + 1, o + 1, 30, 30, '#8a6238', '#5e4022'); c.strokeStyle = '#2e1e0e'; c.lineWidth = 1.6; c.strokeRect(o + 1, o + 1, 30, 30); c.strokeStyle = 'rgba(30,18,8,.5)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(o + 1, o + 1 + i * 7.5); c.lineTo(o + 31, o + 1 + i * 7.5); c.stroke(); } c.fillStyle = '#6a6e76'; c.fillRect(o + 3, o + 6, 26, 2.6); c.fillRect(o + 3, o + 22, 26, 2.6); gradBall(c, 8, 0, 2.6, '#f0d878', '#8a6a1a'); break;
      case 'barricade': c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(1, 4, 15, 7, 0, 0, TAU); c.fill(); for (const a of [.55, -.5, .05]) { c.save(); c.rotate(a); plank(-16, -3.6, 32, 7, '#a07a48', '#6a4a28'); c.strokeStyle = '#2e1e0e'; c.lineWidth = 1; c.strokeRect(-16, -3.6, 32, 7); c.fillStyle = '#9aa0a8'; c.fillRect(-13, -1, 1.6, 1.6); c.fillRect(11, -1, 1.6, 1.6); c.restore(); } break;
      case 'spikes': plank(o + 2, o + 2, 28, 28, '#5a4a38', '#3a2e22'); for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const x = o + 6 + a * 10, y = o + 6 + b * 10; c.fillStyle = '#d0d4dc'; c.beginPath(); c.moveTo(x - 3.5, y + 4); c.lineTo(x, y - 5); c.lineTo(x + 3.5, y + 4); c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 3.5, y + 4); c.lineTo(x, y + 4); c.closePath(); c.fill(); } break;
      case 'workbench': c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(1, 5, 16, 9, 0, 0, TAU); c.fill(); plank(o + 1, o + 5, 30, 22, '#b08a54', '#6e4e2c'); c.strokeStyle = '#2e1e0e'; c.lineWidth = 1.3; c.strokeRect(o + 1, o + 5, 30, 22); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(o + 2, o + 6, 28, 2); c.fillStyle = '#8a9098'; c.fillRect(o + 5, o + 11, 10, 3); c.fillStyle = '#4a4e56'; c.fillRect(o + 5, o + 14, 10, 1.5); c.fillStyle = '#c8402e'; rrect(c, o + 19, o + 10, 8, 8, 1.5); c.fill(); c.fillStyle = '#d0d4dc'; c.fillRect(o + 8, o + 19, 14, 2); c.fillStyle = '#3a4a6a'; c.fillRect(o + 22, o + 20, 5, 4); break;
      case 'chest': c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(1, 6, 14, 8, 0, 0, TAU); c.fill(); plank(o + 3, o + 7, 26, 19, '#9a6e36', '#5e3e1a'); c.strokeStyle = '#2e1c0a'; c.lineWidth = 1.4; c.strokeRect(o + 3, o + 7, 26, 19); plank(o + 3, o + 7, 26, 8, '#b8884a', '#7a5226'); c.strokeRect(o + 3, o + 7, 26, 8); c.fillStyle = '#7a7e86'; c.fillRect(o + 3, o + 6, 3.5, 20); c.fillRect(o + 25.5, o + 6, 3.5, 20); gradBall(c, 0, -1, 3, '#f4dc78', '#8a6a18'); break;
      case 'bed': plank(o + 2, o + 2, 28, 28, '#6a4a30', '#3e2a1a'); c.strokeStyle = '#2a1a0c'; c.lineWidth = 1.3; c.strokeRect(o + 2, o + 2, 28, 28); plank(o + 4, o + 9, 24, 19, '#d85a4a', '#9a2e24'); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(o + 4, o + 9, 24, 2); plank(o + 5, o + 4, 22, 7, '#f4f0e8', '#c8c4b8'); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.strokeRect(o + 5, o + 4, 22, 7); break;
      case 'lamp': c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(1, 5, 8, 4, 0, 0, TAU); c.fill(); c.fillStyle = '#3a3e46'; c.fillRect(-1.6, -8, 3.2, 16); c.fillStyle = '#2a2e34'; c.beginPath(); c.ellipse(0, 8, 5, 2.5, 0, 0, TAU); c.fill(); gradBall(c, 0, -10, 5.5, '#fff6c0', '#e0a020'); c.strokeStyle = '#3a3e46'; c.lineWidth = 1.3; c.beginPath(); c.arc(0, -10, 6.2, 0, TAU); c.stroke(); break;
      case 'plot': plank(o + 1, o + 1, 30, 30, '#5a3e28', '#3a2616'); c.strokeStyle = '#7a5a36'; c.lineWidth = 2.4; c.strokeRect(o + 1.5, o + 1.5, 29, 29); for (let k = 0; k < 3; k++) { plank(o + 5, o + 6 + k * 8, 22, 4.5, '#4a2e1c', '#2a180e'); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(o + 5, o + 6 + k * 8, 22, 1); } break;
      case 'barrel': c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(1, 5, 13, 8, 0, 0, TAU); c.fill(); gradBall(c, 0, 0, 13, '#5a92d0', '#1e4478', -4, -4); c.strokeStyle = '#102a4c'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.stroke(); break;
      case 'turret': c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(1, 5, 15, 9, 0, 0, TAU); c.fill(); gradBall(c, 0, 0, 14, '#7a8494', '#323844', -4, -4); c.strokeStyle = '#161a20'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.arc(-3, -4, 6, 3.4, 4.9); c.fill(); gradBall(c, 0, 0, 8, '#4a5260', '#1c2028', -2, -2); c.fillStyle = '#9aa4b4'; for (let a = 0; a < 6; a++) { c.beginPath(); c.arc(Math.cos(a * 1.05) * 11, Math.sin(a * 1.05) * 11, 1.2, 0, TAU); c.fill(); } break;
    }
  });
}

function planeSprite() {
  return sprite('plane', 150, 90, c => {
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(4, 8, 66, 20, 0, 0, TAU); c.fill();
    // ailes
    for (const s of [-1, 1]) { let g = c.createLinearGradient(0, 0, 0, s * 38); g.addColorStop(0, '#c8ccd4'); g.addColorStop(1, '#7a808c'); c.fillStyle = g; c.beginPath(); c.moveTo(-6, s * 8); c.lineTo(14, s * 8); c.lineTo(-12, s * 40); c.lineTo(-30, s * 40); c.closePath(); c.fill(); c.strokeStyle = '#2e323a'; c.lineWidth = 1.4; c.stroke(); gradBall(c, -8, s * 24, 6, '#6a707c', '#262a30'); c.fillStyle = '#2a2e34'; c.beginPath(); c.arc(-8, s * 24, 3, 0, TAU); c.fill(); }
    // fuselage brisé
    let g = c.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, '#f2f4f8'); g.addColorStop(.6, '#b8bcc6'); g.addColorStop(1, '#6e7480'); c.fillStyle = g; c.beginPath(); c.moveTo(-64, -4); c.quadraticCurveTo(-70, 0, -64, 5); c.lineTo(34, 11); c.quadraticCurveTo(66, 8, 70, 0); c.quadraticCurveTo(66, -8, 34, -11); c.closePath(); c.fill(); c.strokeStyle = '#2e323a'; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = '#2a323c'; for (let i = 0; i < 8; i++) { c.beginPath(); c.ellipse(-44 + i * 9, -8.5, 2.2, 1.6, 0, 0, TAU); c.ellipse(-44 + i * 9, 8.5, 2.2, 1.6, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#5a8ac0'; c.beginPath(); c.moveTo(48, -6); c.quadraticCurveTo(62, 0, 48, 6); c.closePath(); c.fill(); c.strokeStyle = '#2e323a'; c.stroke();
    // queue
    c.fillStyle = '#9aa0ac'; c.beginPath(); c.moveTo(-60, -2); c.lineTo(-74, -16); c.lineTo(-70, -2); c.lineTo(-74, 14); c.lineTo(-60, 3); c.closePath(); c.fill(); c.strokeStyle = '#2e323a'; c.stroke();
    // brûlures + cassures
    const rnd = rngOf(555); for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(20,14,10,' + (.3 + rnd() * .35) + ')'; c.beginPath(); c.ellipse(-50 + rnd() * 110, (rnd() - .5) * 18, 3 + rnd() * 9, 2 + rnd() * 4, rnd() * 3, 0, TAU); c.fill(); }
    c.strokeStyle = '#1a1a1e'; c.lineWidth = 2; c.beginPath(); c.moveTo(12, -11); c.lineTo(18, -3); c.lineTo(10, 3); c.lineTo(16, 11); c.stroke();
    c.fillStyle = '#c8402e'; c.fillRect(-20, -2.5, 28, 5);
  }, 2);
}
