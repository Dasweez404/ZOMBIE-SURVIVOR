'use strict';
// ===== Moteur graphique : terrain lissé en cache, ombres du soleil, toits, sprites =====
const PAL = {
  [T.GRASS]:  { lo: [64, 108, 48], base: [88, 136, 60], hi: [120, 168, 78] },
  [T.FOREST]: { lo: [38, 76, 38], base: [54, 98, 46], hi: [76, 124, 56] },
  [T.SAND]:   { lo: [194, 168, 114], base: [214, 190, 136], hi: [232, 210, 156] },
  [T.DIRT]:   { lo: [112, 86, 62], base: [140, 110, 80], hi: [164, 132, 96] },
  [T.ROAD]:   { lo: [48, 50, 56], base: [64, 66, 72], hi: [82, 84, 90] },
  [T.FLOOR]:  { lo: [122, 88, 54], base: [150, 112, 72], hi: [172, 134, 90] },
  [T.CONC]:   { lo: [102, 104, 108], base: [126, 128, 132], hi: [148, 150, 154] },
  [T.TILE]:   { lo: [186, 196, 206], base: [214, 222, 230], hi: [238, 244, 248] },
  [T.FLESH]:  { lo: [88, 28, 54], base: [130, 48, 84], hi: [172, 80, 114] },
  [T.WALLT]:  { lo: [50, 48, 54], base: [74, 72, 78], hi: [100, 98, 104] },
  [T.PALI]:   { lo: [80, 58, 34], base: [110, 82, 50], hi: [140, 106, 66] },
};
const WATERPAL = [[104, 206, 200], [72, 176, 196], [48, 146, 186], [36, 118, 170], [28, 96, 154], [24, 80, 140]];
const NATURAL = { [T.FLESH]: 1, [T.GRASS]: 1, [T.FOREST]: 1, [T.SAND]: 1, [T.DIRT]: 1, [T.ROAD]: 1 };
const CH = 16, CHS = 4; // tuiles par morceau ; taille d'un échantillon de couleur (px)
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

function palColor(t, n, f) { // n 0..1 (bruit lent), f petit bruit fin
  const p = PAL[t] || PAL[T.GRASS]; let c = n < .5 ? mixc(p.lo, p.base, n * 2) : mixc(p.base, p.hi, (n - .5) * 2);
  const k = 1 + (f - .5) * .09; return [c[0] * k, c[1] * k, c[2] * k];
}
function waterColor(d, n) {
  const i = clamp(d, 0, 5), a = Math.floor(i), b = Math.min(5, a + 1), c = mixc(WATERPAL[a], WATERPAL[b], i - a), k = 1 + (n - .5) * .12; return [c[0] * k, c[1] * k, c[2] * k];
}
function shoreAt(tx, ty) { return inb(tx, ty) ? G.shore[IDX(tx, ty)] : 6; }

function paintChunkBase(ccx, ccy) {
  const S = CH * TS, N = S / CHS, small = document.createElement('canvas'); small.width = N; small.height = N; const sc = small.getContext('2d'), img = sc.createImageData(N, N), D = img.data, seed = G.seed;
  for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
    const wx = ccx * S + sx * CHS + CHS / 2, wy = ccy * S + sy * CHS + CHS / 2, tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
    let col;
    if (!inb(tx, ty)) col = [20, 60, 110]; else {
      const t = G.tiles[ty * G.W + tx], fx = (wx - tx * TS) / TS, fy = (wy - ty * TS) / TS;
      const n = fbm(wx / 70, wy / 70, seed + 3, 3), f = hash2(sx + ccx * 999, sy + ccy * 999, seed);
      if (t === T.WATER) {
        // profondeur lissée (interpolation bilinéaire entre centres de tuiles)
        const ux = fx - .5, uy = fy - .5, ax = ux < 0 ? tx - 1 : tx + 1, ay = uy < 0 ? ty - 1 : ty + 1, wx2 = Math.abs(ux), wy2 = Math.abs(uy);
        const d = shoreAt(tx, ty) * (1 - wx2) * (1 - wy2) + shoreAt(ax, ty) * wx2 * (1 - wy2) + shoreAt(tx, ay) * (1 - wx2) * wy2 + shoreAt(ax, ay) * wx2 * wy2;
        col = waterColor(d - .1, n + (vnoise(wx / 30, wy / 30, seed + 21) - .5) * .5);
        if (d < .55) { const e = sstep((.55 - d) / .55) * (vnoise(wx / 8, wy / 8, seed + 4) * .6 + .4); col = mixc(col, [214, 240, 238], e * .5); }
      } else {
        col = palColor(t, n, f);
        if (NATURAL[t]) {
          // fusion douce entre biomes : poids bilinéaires des 4 centres de tuiles voisins, durcis par un bruit
          const ux = fx - .5, uy = fy - .5, ax = ux < 0 ? tx - 1 : tx + 1, ay = uy < 0 ? ty - 1 : ty + 1, bx = Math.abs(ux), by = Math.abs(uy);
          const cand = [[tx, ty, (1 - bx) * (1 - by)], [ax, ty, bx * (1 - by)], [tx, ay, (1 - bx) * by], [ax, ay, bx * by]];
          const jit = (vnoise(wx / 9, wy / 9, seed + 11) - .5) * .5; let tw = 0, r = 0, g = 0, b = 0, wet = 0;
          for (const [nx, ny, w0] of cand) {
            if (!inb(nx, ny)) { tw += w0; const c0 = palColor(t, n, f); r += c0[0] * w0; g += c0[1] * w0; b += c0[2] * w0; continue; }
            let tn = G.tiles[ny * G.W + nx], w = sstep((w0 - .5) * 2.4 + .5 + (tn === t ? 0 : jit * 1.2)); if (tn === T.WATER) { wet += w0; tn = t; } else if (!NATURAL[tn]) tn = t;
            if (t === T.ROAD || tn === T.ROAD) { if (tn !== t) w = sstep((w0 - .5) * 6 + .5); }
            const c0 = palColor(tn, n, f); tw += w; r += c0[0] * w; g += c0[1] * w; b += c0[2] * w;
          }
          if (tw > 0) col = [r / tw, g / tw, b / tw];
          if (wet > .05) { const k = sstep(wet * 1.6) * .35; col = [col[0] * (1 - k * .38), col[1] * (1 - k * .3), col[2] * (1 - k * .18)]; }
        }
      }
    }
    const j = (sy * N + sx) * 4; D[j] = col[0]; D[j + 1] = col[1]; D[j + 2] = col[2]; D[j + 3] = 255;
  }
  sc.putImageData(img, 0, 0);
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S; const c = cv.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(small, 0, 0, S, S);
  return cv;
}

function R_(h, k) { return hash2(h * 1000 | 0, k, 77); }
function paintChunkDetails(c, ccx, ccy) {
  const seed = G.seed;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) {
    const tx = ccx * CH + x, ty = ccy * CH + y; if (!inb(tx, ty)) continue; const t = G.tiles[ty * G.W + tx], px = x * TS, py = y * TS, h = hash2(tx, ty, seed);
    const at = (dx, dy) => inb(tx + dx, ty + dy) ? G.tiles[(ty + dy) * G.W + tx + dx] : T.WATER;
    switch (t) {
      case T.GRASS: {
        const nb = Math.floor(h * 6) + 1;
        for (let i = 0; i < nb; i++) { const hx = hash2(tx * 7 + i, ty, seed + 1), hy = hash2(tx, ty * 7 + i, seed + 2), bx = px + 3 + hx * 26, by = py + 6 + hy * 22, ph = hash2(i, tx + ty, seed + 3); c.strokeStyle = ph > .5 ? 'rgba(140,196,88,.75)' : 'rgba(46,92,38,.65)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + (ph - .5) * 5, by - 4, bx + (ph - .5) * 8, by - 7 - ph * 3); c.stroke(); }
        if (h < .07) { const fx = px + 6 + h * 300 % 20, fy = py + 6 + (h * 700 % 20); c.fillStyle = ['#f4e46a', '#ffffff', '#ff9ac0', '#b79aff'][Math.floor(h * 57) % 4]; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(fx + k * 3 - 3, fy + (k % 2) * 3, 1.5, 0, TAU); c.fill(); } c.fillStyle = '#f0c030'; c.fillRect(fx - 1, fy + 3, 1, 1); }
        break;
      }
      case T.FOREST: {
        for (let i = 0; i < 4; i++) { const hx = hash2(tx * 5 + i, ty, seed + 5), hy = hash2(tx, ty * 5 + i, seed + 6); c.fillStyle = ['rgba(150,110,50,.5)', 'rgba(190,130,40,.45)', 'rgba(30,60,28,.5)'][i % 3]; c.beginPath(); c.ellipse(px + 3 + hx * 26, py + 3 + hy * 26, 2.5, 1.4, hx * 3, 0, TAU); c.fill(); }
        if (h < .05) { const mx = px + 8 + h * 400 % 16, my = py + 10 + h * 900 % 14; c.fillStyle = '#e8dcc8'; c.fillRect(mx, my, 1.6, 3); c.fillStyle = '#c0392b'; c.beginPath(); c.ellipse(mx + .8, my, 3.2, 2, 0, Math.PI, 0); c.fill(); c.fillStyle = '#fff'; c.fillRect(mx, my - 1.5, 1, 1); }
        if (h > .93) { c.strokeStyle = 'rgba(40,96,40,.75)'; c.lineWidth = 1.3; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(px + 16, py + 24); c.quadraticCurveTo(px + 16 + k * 4, py + 14, px + 16 + k * 7, py + 10 + Math.abs(k) * 2); c.stroke(); } }
        break;
      }
      case T.SAND: {
        c.strokeStyle = 'rgba(176,148,96,.55)'; c.lineWidth = 1; if (h > .3) { c.beginPath(); c.arc(px + 8 + h * 12, py + 40 + h * 14, 26, Math.PI * 1.15, Math.PI * 1.55); c.stroke(); }
        if (h < .06) { c.fillStyle = '#f0d8d0'; c.beginPath(); c.arc(px + 10 + h * 200, py + 12 + h * 300, 2, 0, TAU); c.fill(); c.strokeStyle = '#d8b8b0'; c.lineWidth = .7; c.stroke(); }
        for (let i = 0; i < 3; i++) { const hx = hash2(tx * 3 + i, ty, seed + 8), hy = hash2(tx, ty * 3 + i, seed + 9); c.fillStyle = 'rgba(160,134,86,.5)'; c.fillRect(px + hx * 30, py + hy * 30, 1.6, 1.6); }
        break;
      }
      case T.DIRT: {
        for (let i = 0; i < 3; i++) { const hx = hash2(tx * 3 + i, ty, seed + 12), hy = hash2(tx, ty * 3 + i, seed + 13), rr = 1.5 + hx * 2; c.fillStyle = 'rgba(96,76,58,.7)'; c.beginPath(); c.ellipse(px + 3 + hx * 26, py + 3 + hy * 26, rr, rr * .7, hx * 2, 0, TAU); c.fill(); c.fillStyle = 'rgba(190,164,130,.5)'; c.beginPath(); c.ellipse(px + 2.4 + hx * 26, py + 2.5 + hy * 26, rr * .5, rr * .35, 0, 0, TAU); c.fill(); }
        if (h > .85) { c.strokeStyle = 'rgba(70,52,36,.5)'; c.lineWidth = 1; c.beginPath(); let cx2 = px + 4 + h * 40 % 20, cy2 = py + 4; c.moveTo(cx2, cy2); for (let k = 0; k < 4; k++) { cx2 += (hash2(k, tx, seed) - .5) * 9; cy2 += 6; c.lineTo(cx2, cy2); } c.stroke(); }
        break;
      }
      case T.ROAD: {
        const rd = (dx, dy) => at(dx, dy) === T.ROAD;
        // bordures (trottoir clair) là où la route s'arrête
        c.fillStyle = 'rgba(210,210,200,.32)'; if (!rd(0, -1)) c.fillRect(px, py, TS, 2); if (!rd(0, 1)) c.fillRect(px, py + TS - 2, TS, 2); if (!rd(-1, 0)) c.fillRect(px, py, 2, TS); if (!rd(1, 0)) c.fillRect(px + TS - 2, py, 2, TS);
        c.fillStyle = 'rgba(0,0,0,.18)'; if (!rd(0, -1)) c.fillRect(px, py + 2, TS, 2); if (!rd(0, 1)) c.fillRect(px, py + TS - 4, TS, 2); if (!rd(-1, 0)) c.fillRect(px + 2, py, 2, TS); if (!rd(1, 0)) c.fillRect(px + TS - 4, py, 2, TS);
        // ligne centrale pointillée entre deux voies
        c.fillStyle = 'rgba(236,208,90,.85)';
        if (rd(0, 1) && !rd(0, -1) && rd(-1, 0) && rd(1, 0)) { if ((tx % 2) === 0) c.fillRect(px + 4, py + TS - 1.5, 16, 3); }
        else if (rd(1, 0) && !rd(-1, 0) && rd(0, -1) && rd(0, 1)) { if ((ty % 2) === 0) c.fillRect(px + TS - 1.5, py + 4, 3, 16); }
        if (h > .86) { c.strokeStyle = 'rgba(20,20,24,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(px + 4 + h * 20 % 20, py + 6); c.lineTo(px + 14, py + 14 + h * 5); c.lineTo(px + 20 + h * 8, py + 26); c.stroke(); }
        if (h < .03) { c.fillStyle = '#25262a'; c.beginPath(); c.arc(px + 16, py + 16, 7, 0, TAU); c.fill(); c.strokeStyle = '#4a4c52'; c.lineWidth = 1.5; c.stroke(); c.beginPath(); c.moveTo(px + 11, py + 16); c.lineTo(px + 21, py + 16); c.moveTo(px + 16, py + 11); c.lineTo(px + 16, py + 21); c.stroke(); }
        break;
      }
      case T.FLOOR: {
        const ph = Math.floor(h * 3);
        for (let r = 0; r < 4; r++) { c.fillStyle = 'rgba(0,0,0,' + (r % 2 ? .06 : .0) + ')'; c.fillRect(px, py + r * 8, TS, 8); c.fillStyle = 'rgba(40,24,10,.45)'; c.fillRect(px, py + r * 8 + 7, TS, 1); const off = hash2(tx, ty * 4 + r, seed + 15) * 28; c.fillRect(px + off, py + r * 8, 1, 7); c.fillStyle = 'rgba(255,230,190,.07)'; c.fillRect(px, py + r * 8, TS, 1); }
        c.fillStyle = 'rgba(70,40,16,.35)'; for (let r = 0; r < 4; r++) { c.fillRect(px + 2, py + r * 8 + 3, 1.2, 1.2); c.fillRect(px + 29, py + r * 8 + 3, 1.2, 1.2); }
        break;
      }
      case T.CONC: {
        c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(px, py + TS - 1, TS, 1); c.fillRect(px + TS - 1, py, 1, TS); c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(px, py, TS, 1); c.fillRect(px, py, 1, TS);
        if (h > .75) { c.fillStyle = 'rgba(40,36,30,.18)'; c.beginPath(); c.ellipse(px + 8 + h * 60 % 16, py + 8 + h * 90 % 16, 7, 5, h * 4, 0, TAU); c.fill(); }
        if (h < .06) { c.strokeStyle = 'rgba(30,30,34,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(px + 6, py + 4); c.lineTo(px + 14, py + 16); c.lineTo(px + 10, py + 28); c.stroke(); }
        break;
      }
      case T.TILE: {
        c.strokeStyle = 'rgba(120,134,148,.55)'; c.lineWidth = 1; c.strokeRect(px + .5, py + .5, 16, 16); c.strokeRect(px + 16.5, py + .5, 15, 16); c.strokeRect(px + .5, py + 16.5, 16, 15); c.strokeRect(px + 16.5, py + 16.5, 15, 15);
        c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(px + 2, py + 2, 5, 1.5); if (h > .8) { c.fillStyle = 'rgba(60,150,90,.25)'; c.beginPath(); c.ellipse(px + 10 + h * 30 % 12, py + 12, 6, 4, 0, 0, TAU); c.fill(); } if (h < .05) { c.strokeStyle = 'rgba(40,50,60,.5)'; c.beginPath(); c.moveTo(px + 6, py + 4); c.lineTo(px + 14, py + 16); c.lineTo(px + 8, py + 28); c.stroke(); }
        break;
      }
      case T.FLESH: {
        c.strokeStyle = 'rgba(60,10,34,.55)'; c.lineWidth = 1.6; c.lineCap = 'round'; const vx = hash2(tx, ty, seed + 41);
        c.beginPath(); c.moveTo(px + 2, py + vx * 30); c.bezierCurveTo(px + 10, py + 6 + vx * 18, px + 20, py + 26 - vx * 14, px + 30, py + 10 + vx * 14); c.stroke();
        c.strokeStyle = 'rgba(210,110,150,.35)'; c.lineWidth = .9; c.beginPath(); c.moveTo(px + 2, py + vx * 30 - 1); c.bezierCurveTo(px + 10, py + 5 + vx * 18, px + 20, py + 25 - vx * 14, px + 30, py + 9 + vx * 14); c.stroke();
        for (let i = 0; i < 2; i++) { const bx = px + 5 + hash2(tx * 3 + i, ty, seed + 42) * 22, by = py + 5 + hash2(tx, ty * 3 + i, seed + 43) * 22; gradBall(c, bx, by, 2.6 + i, 'rgba(230,140,170,.9)', 'rgba(110,30,64,.9)'); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(bx - 1, by - 1.4, 1, 1); }
        break;
      }
      case T.WALLT: {
        const south = at(0, 1) === T.WALLT, topH = south ? TS : TS - 9;
        // face supérieure (pierre claire)
        let g = c.createLinearGradient(px, py, px, py + topH); g.addColorStop(0, '#9a98a2'); g.addColorStop(1, '#7c7a84'); c.fillStyle = g; c.fillRect(px, py, TS, topH);
        c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(px, py, TS, 2);
        c.strokeStyle = 'rgba(40,38,46,.45)'; c.lineWidth = 1; for (let r = 0; r < 3; r++) { const yy = py + 4 + r * (topH / 3); c.beginPath(); c.moveTo(px, yy); c.lineTo(px + TS, yy); c.stroke(); const off = hash2(tx, ty * 3 + r, seed + 17) * 16 + 4; c.beginPath(); c.moveTo(px + off, yy - topH / 3); c.lineTo(px + off, yy); c.stroke(); }
        if (!south) { // face avant sombre en briques
          g = c.createLinearGradient(px, py + topH, px, py + TS); g.addColorStop(0, '#5a4a48'); g.addColorStop(1, '#3a2e30'); c.fillStyle = g; c.fillRect(px, py + topH, TS, 9);
          c.strokeStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.moveTo(px, py + topH + 4.5); c.lineTo(px + TS, py + topH + 4.5); c.stroke(); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(px + 5 + k * 10 + (k % 2) * 3, py + topH); c.lineTo(px + 5 + k * 10 + (k % 2) * 3, py + topH + 4.5); c.stroke(); }
          c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(px, py + TS - 1, TS, 1);
        }
        break;
      }
      case T.PALI: {
        const south = at(0, 1) === T.PALI;
        for (let k = 0; k < 4; k++) { const sx = px + 1 + k * 8, hh = 3 + hash2(tx * 4 + k, ty, seed + 19) * 3; const g = c.createLinearGradient(sx, 0, sx + 6, 0); g.addColorStop(0, '#b08a56'); g.addColorStop(.6, '#8a6a3c'); g.addColorStop(1, '#5e4526'); c.fillStyle = g; c.beginPath(); c.moveTo(sx, py + TS - 2); c.lineTo(sx, py + hh + 3); c.lineTo(sx + 3, py + hh - 2); c.lineTo(sx + 6, py + hh + 3); c.lineTo(sx + 6, py + TS - 2); c.closePath(); c.fill(); }
        c.fillStyle = 'rgba(40,28,16,.8)'; c.fillRect(px, py + 11, TS, 2); c.fillRect(px, py + 22, TS, 2); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(px, py + TS - 2, TS, 2);
        break;
      }
    }
  }
}
function getChunk(ccx, ccy) {
  if (!G.chunks) G.chunks = new Map();
  const key = ccy * 1000 + ccx; let ch = G.chunks.get(key);
  if (!ch) {
    if (G.chunks.size > 48) { let worst = null, wd = -1; for (const [k, v] of G.chunks) { const d = Math.abs(v.cx - ccx) + Math.abs(v.cy - ccy); if (d > wd) { wd = d; worst = k; } } G.chunks.delete(worst); }
    const cv = paintChunkBase(ccx, ccy), c = cv.getContext('2d'); paintChunkDetails(c, ccx, ccy);
    ch = { cv, cx: ccx, cy: ccy }; G.chunks.set(key, ch);
  }
  return ch;
}
function prefetchChunks(cx, cy) {
  const S = CH * TS, x0 = Math.floor(cx / S) - 1, y0 = Math.floor(cy / S) - 1, x1 = Math.floor((cx + VW) / S) + 1, y1 = Math.floor((cy + VH) / S) + 1;
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { if (xx < 0 || yy < 0 || xx > Math.floor((G.W - 1) / CH) || yy > Math.floor((G.H - 1) / CH)) continue; if (!G.chunks || !G.chunks.has(yy * 1000 + xx)) { getChunk(xx, yy); return; } }
}

// ----- eau animée par-dessus le terrain -----
let _caustic = null;
function causticSprite() {
  if (_caustic) return _caustic; const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), img = c.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { // motif périodique
    const u = x / S * TAU, v = y / S * TAU; let a = Math.sin(u * 2 + Math.sin(v * 3) * 1.2) + Math.sin(v * 2 + Math.sin(u * 2) * 1.4) + Math.sin((u + v) * 3); a = Math.abs(a) < .22 ? 1 - Math.abs(a) / .22 : 0;
    const j = (y * S + x) * 4; img.data[j] = 220; img.data[j + 1] = 250; img.data[j + 2] = 255; img.data[j + 3] = a * 90;
  }
  c.putImageData(img, 0, 0); _caustic = cv; return cv;
}
function drawTiles(c, cx, cy, time) {
  const S = CH * TS, x0 = Math.max(0, Math.floor(cx / S)), y0 = Math.max(0, Math.floor(cy / S)), x1 = Math.min(Math.floor((G.W - 1) / CH), Math.floor((cx + VW) / S)), y1 = Math.min(Math.floor((G.H - 1) / CH), Math.floor((cy + VH) / S));
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) c.drawImage(getChunk(xx, yy).cv, xx * S, yy * S);
  const tx0 = Math.max(0, Math.floor(cx / TS)), ty0 = Math.max(0, Math.floor(cy / TS)), tx1 = Math.min(G.W - 1, Math.floor((cx + VW) / TS)), ty1 = Math.min(G.H - 1, Math.floor((cy + VH) / TS));
  const cs = causticSprite(), o1 = (time * 9) % 128, o2 = (time * 6 + 40) % 128;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const i = ty * G.W + tx; if (G.tiles[i] !== T.WATER) continue; const dsh = G.shore[i]; const px = tx * TS, py = ty * TS;
    c.globalAlpha = dsh < 3 ? .9 : .5;
    const sx = (px + o1) % 128, sy = (py + o1 * .6) % 128; c.drawImage(cs, sx, sy, Math.min(TS, 128 - sx), Math.min(TS, 128 - sy), px, py, Math.min(TS, 128 - sx), Math.min(TS, 128 - sy));
    if (128 - sx < TS) c.drawImage(cs, 0, sy, TS - (128 - sx), Math.min(TS, 128 - sy), px + (128 - sx), py, TS - (128 - sx), Math.min(TS, 128 - sy));
    if (dsh === 0) { c.globalAlpha = .25 + Math.sin(time * 2 + tx * .8 + ty * .6) * .12; c.fillStyle = '#fff'; c.fillRect(px, py, TS, TS); }
  }
  c.restore(); c.globalAlpha = 1;
}

// ----- soleil : direction et longueur des ombres -----
function sunShadow() {
  const ph = phaseOf(G.clock), t = clamp((ph - .06) / .56, 0, 1), cosv = Math.cos(Math.PI * t);
  const L = .35 + Math.abs(cosv) * 1.1, a = (1 - G.dark) * .3 + .03 + (G.dark > .5 ? .03 : 0);
  return { x: -cosv * L, y: .45 + (1 - Math.abs(cosv)) * .25, a, L };
}
function dropShadow(c, x, y, rx, ry, h) { // ombre elliptique projetée
  const s = G.sun; c.fillStyle = 'rgba(8,10,16,' + s.a + ')'; c.beginPath(); c.ellipse(x + s.x * h, y + s.y * h * .8 + ry * .4, rx * (1 + Math.abs(s.x) * .35), ry, Math.atan2(s.y, s.x) * .0, 0, TAU); c.fill();
}

// ----- toits -----
function roofSprite(b) {
  if (b.spr) return b.spr; const W = b.w * TS + 8, H = b.h * TS + 8, cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; const c = cv.getContext('2d'); c.scale(2, 2);
  const rc = parseInt(b.roof.slice(1), 16), base = [rc >> 16 & 255, rc >> 8 & 255, rc & 255], seed = (b.x * 73 + b.y * 131) | 0, horiz = b.w >= b.h;
  const g = c.createLinearGradient(horiz ? 0 : 0, horiz ? 0 : 0, horiz ? 0 : W, horiz ? H : 0);
  const lit = mixc(base, [255, 255, 255], .16), dark = mixc(base, [0, 0, 0], .28);
  g.addColorStop(0, 'rgb(' + lit.map(Math.round) + ')'); g.addColorStop(.5, 'rgb(' + base.map(Math.round) + ')'); g.addColorStop(1, 'rgb(' + dark.map(Math.round) + ')'); c.fillStyle = g; rrect(c, 0, 0, W, H, 4); c.fill();
  // bardeaux
  const rh = 9; for (let r = 0; r * rh < H; r++) { const off = (r % 2) * 7; for (let x = -7 + off; x < W; x += 14) { const hv = hash2(r, x | 0, seed); c.fillStyle = 'rgba(' + (hv > .5 ? '255,255,255' : '0,0,0') + ',' + (.03 + hv * .07) + ')'; c.fillRect(x, r * rh, 13, rh - 1); } c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(0, r * rh + rh - 1, W, 1); c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(0, r * rh, W, 1); }
  const st = b.style;
  if (st === 'lab' || st === 'prison' || st === 'trailer' || st === 'fire') { // toits plats / tôle
    const flat = st === 'lab' ? ['#e4eaf0', '#b8c4d0'] : st === 'prison' ? ['#8a8a92', '#5e5e66'] : st === 'fire' ? ['#b83a32', '#7a2420'] : ['#b8bec6', '#868e98']; const gg = c.createLinearGradient(0, 0, W, H); gg.addColorStop(0, flat[0]); gg.addColorStop(1, flat[1]); c.fillStyle = gg; rrect(c, 0, 0, W, H, 4); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1; if (st === 'trailer') { for (let x = 4; x < W; x += 6) { c.beginPath(); c.moveTo(x, 2); c.lineTo(x, H - 2); c.stroke(); } } else { for (let x = 0; x < W; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } }
    if (st === 'lab') { for (let i = 0; i < 3; i++) { const x = W * (.2 + i * .3), y = H * .35; gradBall(c, x, y, 8, '#3a4654', '#161c24'); c.strokeStyle = '#7ad0a0'; c.lineWidth = 1; for (let a = 0; a < 6; a++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a * 1.05) * 7, y + Math.sin(a * 1.05) * 7); c.stroke(); } } c.fillStyle = 'rgba(100,255,160,.5)'; c.fillRect(8, H - 12, W - 16, 3); }
    if (st === 'prison') { c.strokeStyle = 'rgba(30,30,34,.8)'; c.lineWidth = 1.6; for (let k = 0; k < 3; k++) { c.beginPath(); for (let x = 4; x < W - 4; x += 6) c.arc(x, 8 + k * 4, 3, Math.PI, TAU); c.stroke(); } }
    if (st === 'fire') { c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(0, H / 2 - 3, W, 6); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 2; c.strokeRect(W * .12, H * .7, W * .76, H * .22); }
  }
  if (st === 'diner') { for (let x = 0; x < W; x += 14) { c.fillStyle = (x / 14) % 2 ? '#f4efe2' : '#c03a34'; c.fillRect(x, H - 16, 14, 14); } c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1; c.strokeRect(0, H - 16, W, 14); c.fillStyle = '#2a6ac0'; rrect(c, W / 2 - 22, 8, 44, 14, 3); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText('DINER', W / 2, 18); }
  if (st === 'mine') { c.strokeStyle = 'rgba(70,46,24,.9)'; c.lineWidth = 5; for (let x = 8; x < W; x += 24) { c.beginPath(); c.moveTo(x, 2); c.lineTo(x, H - 2); c.stroke(); } c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; for (let x = 8; x < W; x += 24) { c.beginPath(); c.moveTo(x + 2.5, 2); c.lineTo(x + 2.5, H - 2); c.stroke(); } }
  // faîtage
  if (st !== 'lab' && st !== 'prison' && st !== 'trailer' && st !== 'fire' && st !== 'mine' && st !== 'diner' && st !== 'lighthouse') if (horiz) { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(6, H / 2 - 2, W - 12, 4); c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(6, H / 2 - 3, W - 12, 2); } else { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(W / 2 - 2, 6, 4, H - 12); c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(W / 2 - 3, 6, 2, H - 12); }
  // accessoires
  if (st === 'church') { // croix + clocher
    const tw = Math.min(W, H) * .5, tx = W / 2 - tw / 2, ty = 6; let gg = c.createLinearGradient(tx, ty, tx + tw, ty + tw); gg.addColorStop(0, '#8a90a0'); gg.addColorStop(1, '#4a5060'); c.fillStyle = gg; c.fillRect(tx, ty, tw, tw); c.strokeStyle = '#1e222c'; c.lineWidth = 2; c.strokeRect(tx, ty, tw, tw); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + tw, ty + tw); c.moveTo(tx + tw, ty); c.lineTo(tx, ty + tw); c.stroke();
    c.fillStyle = '#d8d4c8'; c.fillRect(W / 2 - 2, H * .45, 4, 28); c.fillRect(W / 2 - 8, H * .45 + 8, 16, 4); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.strokeRect(W / 2 - 2, H * .45, 4, 28); c.strokeRect(W / 2 - 8, H * .45 + 8, 16, 4);
  }
  const prop = (x, y, kind) => {
    if (kind === 0) { c.fillStyle = '#6a3a2c'; c.fillRect(x, y, 14, 14); c.fillStyle = '#8a5240'; c.fillRect(x, y, 14, 3); c.fillStyle = '#1a1210'; c.fillRect(x + 3, y + 3, 8, 8); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(x + 14, y + 2, 3, 14); }
    else if (kind === 1) { c.fillStyle = 'rgba(160,210,235,.85)'; c.fillRect(x, y, 22, 16); c.strokeStyle = 'rgba(40,60,80,.9)'; c.lineWidth = 1.5; c.strokeRect(x, y, 22, 16); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x + 2, y + 2, 7, 3); }
    else { c.fillStyle = '#9aa0a8'; c.fillRect(x, y, 22, 22); c.fillStyle = '#6a7078'; c.fillRect(x, y + 18, 22, 4); c.fillStyle = '#2a2e34'; c.beginPath(); c.arc(x + 11, y + 10, 8, 0, TAU); c.fill(); c.strokeStyle = '#8a9098'; c.lineWidth = 1; for (let a = 0; a < 4; a++) { c.beginPath(); c.moveTo(x + 11, y + 10); c.lineTo(x + 11 + Math.cos(a * 1.57) * 8, y + 10 + Math.sin(a * 1.57) * 8); c.stroke(); } }
  };
  if (b.w * b.h >= 100) { prop(W * .18, H * .2, 1); prop(W * .6, H * .25, 2); prop(W * .35, H * .62, 1); if (b.w > 12) prop(W * .78, H * .6, 2); }
  else if (b.w * b.h >= 25) prop(W * (hash2(seed, 1, 1) > .5 ? .65 : .15), H * .18, 0);
  // débord de toit
  c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 3; rrect(c, 1.5, 1.5, W - 3, H - 3, 4); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1; rrect(c, 4, 4, W - 8, H - 8, 3); c.stroke();
  if (st === 'lighthouse') { // toit circulaire rouge et blanc
    c.clearRect(0, 0, W, H); const R = Math.min(W, H) / 2 - 2; for (let i = 5; i >= 0; i--) { c.fillStyle = i % 2 ? '#f2f2f2' : '#c83a34'; c.beginPath(); c.arc(W / 2, H / 2, R * (i + 1) / 6, 0, TAU); c.fill(); }
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 2; c.beginPath(); c.arc(W / 2, H / 2, R, 0, TAU); c.stroke(); gradBall(c, W / 2, H / 2, R * .22, '#fff8c0', '#e0a020'); c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.arc(W / 2 + 6, H / 2 + 6, R * .9, 0, TAU); c.fill();
  }
  b.spr = cv; return cv;
}
function hull(pts) {
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]); const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]); const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop(); return lo.concat(up);
}
function drawBuildingShadows(c, cx, cy) {
  const s = G.sun; if (s.a < .04) return;
  for (const b of G.buildings) {
    const x = b.x * TS, y = b.y * TS, w = b.w * TS, h = b.h * TS; if (x > cx + VW + 120 || x + w < cx - 120 || y > cy + VH + 120 || y + h < cy - 120) continue;
    const dx = s.x * 46, dy = s.y * 38, hp = hull([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x + dx, y + dy], [x + w + dx, y + dy], [x + w + dx, y + h + dy], [x + dx, y + h + dy]]);
    c.save(); c.beginPath(); c.rect(x - 400, y - 400, w + 800, h + 800); c.rect(x, y, w, h); c.clip('evenodd');
    c.fillStyle = 'rgba(8,10,16,' + s.a * .9 + ')'; c.beginPath(); c.moveTo(hp[0][0], hp[0][1]); for (let i = 1; i < hp.length; i++) c.lineTo(hp[i][0], hp[i][1]); c.closePath(); c.fill(); c.restore();
  }
}
function drawRoofs(c, cx, cy) {
  for (const b of G.buildings) {
    const x = b.x * TS, y = b.y * TS, w = b.w * TS, h = b.h * TS;
    if (x > cx + VW || x + w < cx || y > cy + VH || y + h < cy) continue;
    const inside = P.x > x && P.x < x + w && P.y > y && P.y < y + h;
    const target = inside ? 0 : 1; b.a += (target - b.a) * .18; if (Math.abs(b.a - target) < .02) b.a = target;
    if (b.a < .02) continue;
    c.globalAlpha = b.a; c.drawImage(roofSprite(b), x - 4, y - 4, w + 8, h + 8); c.globalAlpha = 1;
  }
}

function drawRadZones(c, cx, cy, time) {
  for (const z of G.radZones) {
    if (z.x + z.r < cx || z.x - z.r > cx + VW || z.y + z.r < cy || z.y - z.r > cy + VH) continue;
    const g = c.createRadialGradient(z.x, z.y, z.r * .1, z.x, z.y, z.r); const pu = .5 + Math.sin(time * 1.6) * .5;
    g.addColorStop(0, 'rgba(120,255,40,' + (.2 + pu * .08) + ')'); g.addColorStop(.7, 'rgba(100,220,40,.1)'); g.addColorStop(1, 'rgba(100,220,40,0)');
    c.fillStyle = g; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(160,255,60,' + (.25 + pu * .2) + ')'; c.setLineDash([10, 10]); c.lineWidth = 2; c.beginPath(); c.arc(z.x, z.y, z.r * .96, 0, TAU); c.stroke(); c.setLineDash([]);
  }
}

// ===== objets du monde, structures =====
function drawObjs(c, cx, cy, time) {
  const x0 = Math.max(0, Math.floor(cx / TS) - 2), y0 = Math.max(0, Math.floor(cy / TS) - 2), x1 = Math.min(G.W - 1, Math.floor((cx + VW) / TS) + 2), y1 = Math.min(G.H - 1, Math.floor((cy + VH) / TS) + 2);
  const trees = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const o = G.objs.get(ty * G.W + tx); if (!o) continue;
    if (o.k === 'tree' || o.k === 'deadtree') { trees.push(o); continue; }
    drawObj(c, o, time);
  }
  for (const o of trees) drawObj(c, o, time, true); // ombres d'abord
  for (const o of trees) drawObj(c, o, time);
}
function drawObj(c, o, time, shadowOnly) {
  const x = o.x, y = o.y, v = o.v, sun = G.sun;
  let sx = 0; if (o.shakeT > 0 && !shadowOnly) { o.shakeT -= .016; sx = Math.sin(time * 70) * 2; }
  switch (o.k) {
    case 'tree': case 'deadtree': {
      if (o.dep) { if (!shadowOnly) blit(c, treeSprite('stump', 0), x, y + 4); break; }
      const [kind, vv] = treeKindOf(o), sc = (kind === 'pine' ? 1 : .92) * (.86 + hash2(o.tx, o.ty, 3) * .3), spr = treeSprite(kind, vv);
      if (shadowOnly) { dropShadow(c, x, y + 12, 21 * sc, 12 * sc, 30 * sc); break; }
      const sway = (Math.sin(time * 1.2 + o.tx * .7 + o.ty * .3) * .018 * (1 + (G.wType === 'storm' ? 2.2 * G.wInt : 0) + (G.wType === 'rain' ? G.wInt * .6 : 0))) + sx * .02;
      c.save(); c.translate(x, y + 14); c.rotate(sway); c.scale(sc, sc); c.drawImage(spr.cv, -spr.w / 2, -spr.h / 2 - 14 / sc * 1, spr.w, spr.h); c.restore();
      break;
    }
    case 'rock': { if (o.dep) { c.fillStyle = '#8a8c94'; c.beginPath(); c.ellipse(x - 6, y + 5, 3, 2, 0, 0, TAU); c.ellipse(x + 5, y + 6, 2.4, 1.6, 0, 0, TAU); c.fill(); break; } dropShadow(c, x, y + 8, 17, 9, 14); blit(c, rockSprite(Math.floor(v * 4)), x + sx, y); break; }
    case 'bush': blit(c, bushSprite(o.dep ? 'empty' : 'berry', Math.floor(v * 2)), x, y); break;
    case 'herb': blit(c, herbSprite(Math.floor(v * 3)), x, y); break;
    case 'scrappile': if (!o.dep) blit(c, scrapSprite(Math.floor(v * 2)), x, y); break;
    case 'wreck': blit(c, wreckSprite(Math.floor(v * 4), o.dep), x, y, o.ang || 0); break;
    case 'crate': {
      blit(c, crateSprite(o.air ? 'air' : o.opened ? 'open' : 'closed'), x, y);
      if (!o.opened) { const pulse = .5 + Math.sin(time * 4 + o.tx) * .5; c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .25 + pulse * .4; blit(c, glowSprite('255,224,120'), x, y, 0, .8 + pulse * .2); c.restore(); }
      break;
    }
    case 'mast': blit(c, propSprite('mast', 0), x, y); c.fillStyle = G.radioOn ? (Math.sin(time * 6) > 0 ? '#5f5' : '#2a2') : '#e33'; c.beginPath(); c.arc(x, y - 20, 2.2, 0, TAU); c.fill(); if (G.radioOn) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .5; blit(c, glowSprite('90,255,90'), x, y - 20, 0, .6); c.restore(); } break;
    case 'radbarrel': blit(c, propSprite('radbarrel', 0), x, y); break;
    case 'furn': blit(c, propSprite('furn', o.fv || 0), x, y); break;
    case 'tent': dropShadow(c, x, y + 6, 22, 11, 14); blit(c, propSprite('tent', Math.floor(v * 3)), x, y); break;
    case 'sandbag': blit(c, propSprite('sandbag', 0), x, y); break;
    case 'stall': blit(c, propSprite('stall', 0), x, y); break;
    case 'fire': drawFlame(c, x, y, time, 1); break;
    case 'pew': blit(c, propSprite('pew', o.fv || 0), x, y); break;
    case 'altar': blit(c, propSprite('altar', 0), x, y); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .45 + Math.sin(time * 8) * .1; blit(c, glowSprite('255,190,90'), x - 9, y - 4, 0, .5); blit(c, glowSprite('255,190,90'), x + 9, y - 4, 0, .5); c.restore(); break;
    case 'desk': blit(c, propSprite('desk', o.fv || 0), x, y); break;
    case 'counter': blit(c, propSprite('counter', 0), x, y); break;
    case 'labtable': blit(c, propSprite('labtable', 0), x, y); break;
    case 'tank': blit(c, propSprite('tank', 0), x, y); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .4 + Math.sin(time * 2 + o.tx) * .12; blit(c, glowSprite('90,255,140'), x, y, 0, .9); c.restore(); break;
    case 'grave': blit(c, propSprite('grave', o.gv || 0), x, y); break;
    case 'egg': { const pu = 1 + Math.sin(time * 2.2 + o.tx * 1.7) * .05; dropShadow(c, x, y + 8, 14, 8, 10); blit(c, propSprite('egg', 0), x, y, 0, pu); break; }
    case 'tower': dropShadow(c, x, y + 6, 18, 10, 22); blit(c, propSprite('tower', 0), x, y); break;
    case 'rails': blit(c, propSprite('rails', 0), x, y); break;
    case 'ore': if (o.dep) { c.fillStyle = '#7a7a82'; c.beginPath(); c.ellipse(x - 5, y + 5, 3, 2, 0, 0, TAU); c.ellipse(x + 5, y + 6, 2.4, 1.6, 0, 0, TAU); c.fill(); break; } dropShadow(c, x, y + 8, 17, 9, 14); blit(c, propSprite('ore', 0), x + sx, y); break;
    case 'plane': { const px = o.px, py = o.py; dropShadow(c, px, py + 10, 62, 22, 18); blit(c, planeSprite(), px, py); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .4 + Math.sin(time * 7) * .1; blit(c, glowSprite('255,120,40'), px + 52, py - 6, 0, 1.1); c.restore(); break; }
  }
}
function drawStructs(c, cx, cy, time) {
  for (const s of G.structs.values()) {
    if (s.x < cx - 40 || s.x > cx + VW + 40 || s.y < cy - 40 || s.y > cy + VH + 40) continue;
    const f = s.flash > 0;
    if (s.type === 'campfire') { c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(s.x + 1, s.y + 5, 13, 7, 0, 0, TAU); c.fill(); drawFlame(c, s.x, s.y, time, 1); }
    else {
      const sp = structSprite(s.type);
      if (s.type === 'turret') { blit(c, sp, s.x, s.y); }
      else blit(c, sp, s.x, s.y);
      if (f) { c.globalAlpha = .75; blit(c, flashOf(sp), s.x, s.y); c.globalAlpha = 1; }
      if (s.type === 'plot') {
        if (s.plant === 1) { const gr = Math.min(1, (G.clock - s.t0) / (DAY_LEN * 1.2)); for (let k = 0; k < 3; k++) { const px = s.x - 11 + k * 11, py = s.y - 8 + k * 0; for (let r = 0; r < 3; r++) { const yy = s.y - 11 + r * 8 + 2; c.strokeStyle = '#6ac04a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(px, yy + 4); c.lineTo(px + Math.sin(r + k) * 1.5, yy + 4 - 2 - gr * 7); c.stroke(); if (gr > .5) { c.fillStyle = '#4aa03a'; c.beginPath(); c.ellipse(px + 2, yy + 1 - gr * 3, 2.2, 1.2, .5, 0, TAU); c.ellipse(px - 2, yy - gr * 2, 2.2, 1.2, -.5, 0, TAU); c.fill(); } } } }
        else if (s.plant === 2) { for (let k = 0; k < 3; k++) for (let r = 0; r < 3; r++) { const px = s.x - 11 + k * 11, yy = s.y - 11 + r * 8 + 2; c.strokeStyle = '#4aa03a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(px, yy + 4); c.lineTo(px, yy - 4); c.stroke(); gradBall(c, px, yy - 5, 3, '#ffb040', '#c05a10'); c.fillStyle = '#3a8a2a'; c.fillRect(px - 1, yy - 9, 2, 2); } }
      } else if (s.type === 'barrel') { c.fillStyle = 'rgba(140,210,255,' + (.25 + s.water / 9) + ')'; c.beginPath(); c.arc(s.x, s.y, 8, 0, TAU); c.fill(); }
      else if (s.type === 'turret') {
        c.save(); c.translate(s.x, s.y); c.rotate(s.ang); const g = c.createLinearGradient(0, -3.5, 0, 3.5); g.addColorStop(0, '#b4bcc8'); g.addColorStop(1, '#5a6270'); c.fillStyle = g; c.fillRect(3, -3.4, 19, 6.8); c.fillStyle = '#2a2e36'; c.fillRect(20, -4, 4, 8); c.fillStyle = '#d8dee8'; c.fillRect(4, -3, 14, 1.2);
        if (s.flashT > 0) { s.flashT -= .016; c.globalCompositeOperation = 'lighter'; blit(c, glowSprite('255,220,100'), 28, 0, 0, .9); } c.restore();
        if (!s.ammo) { c.fillStyle = '#f55'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillText('!', s.x, s.y - 17); }
      }
    }
    if (s.hp < s.max) {
      const u = s.hp / s.max; if (u < .6 && s.type !== 'campfire') { c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(s.x - 8, s.y - 12); c.lineTo(s.x - 2, s.y - 3); c.lineTo(s.x - 9, s.y + 6); c.moveTo(s.x + 6, s.y - 10); c.lineTo(s.x + 11, s.y + 2); c.stroke(); }
      c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(s.x - 14, s.y - 21, 28, 4); c.fillStyle = u > .4 ? '#6c6' : '#e55'; c.fillRect(s.x - 13, s.y - 20, 26 * Math.max(0, u), 2);
    }
  }
}

function drawClouds(c, time) {
  for (const k of G.clouds) {
    if (k.x < G.camX - 120 || k.x > G.camX + VW + 120 || k.y < G.camY - 120 || k.y > G.camY + VH + 120) continue;
    const a = clamp(k.life / 1.5, 0, 1) * (k.kind === 'rad' ? .5 : .42), rgb = k.kind === 'rad' ? '150,255,70' : '120,200,40';
    c.save(); if (k.kind === 'rad') c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + time * .35 + k.x, d = k.r * .45 * (.6 + Math.sin(time * .9 + i) * .4); c.globalAlpha = a; blit(c, glowSprite(rgb), k.x + Math.cos(an) * d, k.y + Math.sin(an) * d, 0, k.r / 22); }
    c.restore();
  }
}
// ===== effets : flammes, balles, particules, explosions =====
function drawFlame(c, x, y, time, s) {
  // pierres
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x + 1, y + 5, 12 * s, 6 * s, 0, 0, TAU); c.fill();
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; gradBall(c, x + Math.cos(a) * 9 * s, y + 4 + Math.sin(a) * 6 * s, 2.8 * s, '#9a9aa2', '#4a4a52'); }
  c.fillStyle = '#2a1a0e'; c.beginPath(); c.ellipse(x, y + 3, 7 * s, 4 * s, 0, 0, TAU); c.fill(); c.strokeStyle = '#5a3a1e'; c.lineWidth = 2 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 6 * s, y + 4); c.lineTo(x + 6 * s, y + 1); c.moveTo(x - 5 * s, y + 1); c.lineTo(x + 6 * s, y + 5); c.stroke();
  const f = Math.sin(time * 12 + x) * 2, f2 = Math.sin(time * 17 + y) * 1.5;
  const lay = (col, w, h, off) => { c.fillStyle = col; c.beginPath(); c.moveTo(x - w * s, y + 4); c.quadraticCurveTo(x - w * .7 * s, y - h * .45 * s + f, x + f2 * .4, y - h * s - f); c.quadraticCurveTo(x + w * .8 * s, y - h * .4 * s, x + w * s, y + 4); c.closePath(); c.fill(); };
  lay('#c83a14', 7.5, 18); lay('#f07a1c', 5.8, 14); lay('#ffc030', 3.8, 10); lay('#fff2b0', 2, 5.5);
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .55 + Math.sin(time * 9 + x) * .1; blit(c, glowSprite('255,150,60'), x, y - 4, 0, s * 1.2); c.restore();
  if (Math.random() < .12) addPart(x + rnd(-4, 4), y - 6, rnd(-10, 10), rnd(-50, -25), rnd(.5, 1.1), rnd(1, 2), '#ffb040', 'fire');
}
function drawBullets(c) {
  for (const b of G.bullets) {
    if (b.flame) { const a = clamp(b.left / 120, 0, 1); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .5 + a * .3; blit(c, glowSprite(a > .5 ? '255,200,80' : '255,90,30'), b.x, b.y, 0, .5 + (1 - a) * .9); c.restore(); continue; }
    if (b.kind === 'acid') { c.save(); c.globalCompositeOperation = 'lighter'; blit(c, glowSprite('150,255,60'), b.x, b.y, 0, .5); c.restore(); gradBall(c, b.x, b.y, 4.5, '#d8ff80', '#5a9a1a'); continue; }
    const sp = Math.hypot(b.vx, b.vy), l = sp * .032, ux = b.vx / sp, uy = b.vy / sp, tx = b.x - ux * l, ty = b.y - uy * l;
    const g = c.createLinearGradient(tx, ty, b.x, b.y); g.addColorStop(0, 'rgba(255,220,140,0)'); g.addColorStop(1, b.kind === 'bolt' ? 'rgba(236,224,190,.95)' : (b.team === 'h' ? 'rgba(255,150,90,.95)' : 'rgba(255,240,190,.98)'));
    c.strokeStyle = g; c.lineWidth = b.kind === 'bolt' ? 2.6 : 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(tx, ty); c.lineTo(b.x, b.y); c.stroke();
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .55; blit(c, glowSprite(b.team === 'h' ? '255,120,60' : '255,220,120'), b.x, b.y, 0, .32); c.restore();
  }
}
function drawParts(c) {
  const smoke = smokeSprite();
  for (const p of G.parts) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.kind === 'ring') { c.globalAlpha = a * .6; c.strokeStyle = p.col; c.lineWidth = 1.2; c.beginPath(); c.ellipse(p.x, p.y, p.size * (1.1 - a), p.size * (1.1 - a) * .6, 0, 0, TAU); c.stroke(); continue; }
    if (p.kind === 'shell') { c.globalAlpha = a; c.save(); c.translate(p.x, p.y); c.rotate(p.life * 14); c.fillStyle = p.col; c.fillRect(-2, -1, 4, 2); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-2, -1, 4, .8); c.restore(); continue; }
    if (p.kind === 'smoke') { c.globalAlpha = a * .55; const sz = p.size * (2.4 - a * 1.2) / 24 * 3.2; c.drawImage(smoke.cv, p.x - 24 * sz, p.y - 24 * sz, 48 * sz, 48 * sz); continue; }
    if (p.kind === 'fire') {
      if (p.col === '#555' || p.col === '#666') { c.globalAlpha = a * .5; const sz = p.size * (2.4 - a * 1.2) / 24 * 3.2; c.drawImage(smoke.cv, p.x - 24 * sz, p.y - 24 * sz, 48 * sz, 48 * sz); continue; }
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * .8; blit(c, glowSprite(p.col === '#9aff3a' || p.col === '#8aff3a' ? '140,255,60' : p.col === '#ffe070' ? '255,224,112' : p.col === '#ffe9a0' ? '255,233,160' : p.col === '#ff6a6a' ? '255,100,100' : p.col === '#cfe6ff' ? '200,230,255' : '255,150,50'), p.x, p.y, 0, p.size * (.5 + a * .6) / 14); c.restore(); continue;
    }
    c.globalAlpha = a; c.fillStyle = p.col; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  c.globalAlpha = 1;
}
function drawFires(c, time) {
  for (const f of G.fires) {
    const a = clamp(f.life / 1.5, 0, 1); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .55 * a; blit(c, glowSprite('255,110,30'), f.x, f.y, 0, f.r / 14); c.globalAlpha = .4 * a; blit(c, glowSprite('255,190,70'), f.x, f.y, 0, f.r / 24); c.restore();
    c.fillStyle = 'rgba(30,14,6,' + (.25 * a) + ')'; c.beginPath(); c.ellipse(f.x, f.y, f.r * .8, f.r * .6, 0, 0, TAU); c.fill();
  }
}
function drawBlasts(c) {
  for (const b of G.blasts) {
    const u = 1 - b.life / b.max, k = b.life / b.max;
    c.save(); c.globalCompositeOperation = 'lighter';
    if (b.slam) { c.strokeStyle = 'rgba(255,255,255,' + k + ')'; c.lineWidth = 8 * k + 1; c.beginPath(); c.arc(b.x, b.y, b.r * (.3 + u * .8), 0, TAU); c.stroke(); }
    else {
      c.globalAlpha = k * .9; blit(c, glowSprite(b.toxic ? '160,255,70' : '255,170,60'), b.x, b.y, 0, b.r / 16 * (.5 + u * 1.2)); c.globalAlpha = k * .8; blit(c, glowSprite(b.toxic ? '230,255,160' : '255,235,170'), b.x, b.y, 0, b.r / 28 * (.6 + u * .6));
      c.globalAlpha = k; c.strokeStyle = b.toxic ? 'rgba(170,255,80,.8)' : 'rgba(255,210,120,.8)'; c.lineWidth = 5 * k + 1; c.beginPath(); c.arc(b.x, b.y, b.r * (.35 + u * .85), 0, TAU); c.stroke();
    }
    c.restore();
    if (!b.scorch && !b.slam && !b.toxic) { b.scorch = true; addDecal(b.x, b.y, b.r * .45, '#14100c'); }
  }
}
