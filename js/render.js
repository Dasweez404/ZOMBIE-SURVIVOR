'use strict';
// ===== Rendu Canvas =====
const TCOL = {
  [T.GRASS]: ['#4d7a38', '#517e3b', '#4a7535', '#55803d'], [T.FOREST]: ['#38602e', '#3c6431', '#355a2b', '#406835'],
  [T.SAND]: ['#cdb57d', '#c8b077', '#d2ba84'], [T.DIRT]: ['#8b7355', '#866a4b', '#917a5a'], [T.ROAD]: ['#3d3f45', '#414349', '#3a3c42'],
  [T.FLOOR]: ['#8b6b45', '#866640', '#906f49'], [T.CONC]: ['#7b7d80', '#777a7d', '#7f8184'], [T.WALLT]: ['#3b3a3d'], [T.PALI]: ['#6a5030'], [T.WATER]: ['#2d5d8a'],
};
const MINICOL = { [T.GRASS]: '#3f6b30', [T.FOREST]: '#2d5226', [T.SAND]: '#bba670', [T.WATER]: '#2a5a8a', [T.ROAD]: '#6a6c72', [T.DIRT]: '#7a6347', [T.FLOOR]: '#8a6d46', [T.CONC]: '#8a8c90', [T.WALLT]: '#222', [T.PALI]: '#5a4020' };

let cvs, ctx, lightCvs, lightCtx, VW = 800, VH = 600, DPR = 1;
function resizeCanvas() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = window.innerWidth; VH = window.innerHeight;
  cvs.width = Math.floor(VW * DPR); cvs.height = Math.floor(VH * DPR);
  cvs.style.width = VW + 'px'; cvs.style.height = VH + 'px';
  lightCvs.width = Math.ceil(cvs.width / 2); lightCvs.height = Math.ceil(cvs.height / 2);
}

// ----- minimap -----
function initMini() {
  G.mini = document.createElement('canvas'); G.mini.width = G.W; G.mini.height = G.H; G.miniCtx = G.mini.getContext('2d');
}
function paintMini(x, y) {
  const i = IDX(x, y); let t = G.tiles[i]; let c = MINICOL[t] || '#444';
  const o = G.objs.get(i); if (o && !o.dep && (o.k === 'tree')) c = '#244a1e';
  G.miniCtx.fillStyle = c; G.miniCtx.fillRect(x, y, 1, 1);
}
function repaintMini() { G.miniCtx.clearRect(0, 0, G.W, G.H); for (let y = 0; y < G.H; y++) for (let x = 0; x < G.W; x++) if (G.explored[y * G.W + x]) paintMini(x, y); }

function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function shadow(c, x, y, rx, ry) { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x + 2, y + 3, rx, ry, 0, 0, TAU); c.fill(); }

// ----- caméra -----
function updateCamera(dt) {
  const w = P.dead ? null : curWeapon(); let look = .12, maxL = 120;
  if (w && !WEAPONS[w.id].melee) { const s = wstat(w); if (s.zoom && G.rmb) { look = .6; maxL = 330; } else if (G.rmb) { look = .3; maxL = 200; } }
  const dx = G.mouse.x - P.x, dy = G.mouse.y - P.y, d = Math.hypot(dx, dy) || 1, l = Math.min(maxL, d * look);
  const tx = P.x + dx / d * l - VW / 2, ty = P.y + dy / d * l - VH / 2;
  G.cam.x = lerp(G.cam.x, tx, Math.min(1, dt * 7)); G.cam.y = lerp(G.cam.y, ty, Math.min(1, dt * 7));
  G.cam.x = clamp(G.cam.x, -40, G.W * TS - VW + 40); G.cam.y = clamp(G.cam.y, -40, G.H * TS - VH + 40);
  if (G.W * TS < VW) G.cam.x = (G.W * TS - VW) / 2;
}

// ----- rendu principal -----
function render(time) {
  const c = ctx; c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.fillStyle = '#10161c'; c.fillRect(0, 0, VW, VH);
  const sh = G.shake, ox = sh ? rnd(-sh, sh) : 0, oy = sh ? rnd(-sh, sh) : 0;
  const cx = Math.round(G.cam.x + ox), cy = Math.round(G.cam.y + oy);
  G.camX = cx; G.camY = cy;
  c.save(); c.translate(-cx, -cy);
  drawTiles(c, cx, cy, time);
  drawDecals(c, cx, cy);
  drawObjs(c, cx, cy, time);
  drawStructs(c, cx, cy, time);
  drawMinesThrown(c, time);
  drawPickups(c, time);
  drawNPCs(c, cx, cy);
  for (const m of G.mobs) if (!m.dead && m.x > cx - 60 && m.x < cx + VW + 60 && m.y > cy - 60 && m.y < cy + VH + 60) drawMob(c, m, time);
  for (const f of G.friends) if (!f.dead && f.x > cx - 60 && f.x < cx + VW + 60 && f.y > cy - 60 && f.y < cy + VH + 60) drawFriend(c, f, time);
  if (!P.dead) drawPlayer(c, time);
  drawBullets(c);
  drawFires(c, time); drawParts(c); drawBlasts(c);
  drawFlags(c, time);
  drawRoofs(c, cx, cy);
  drawTexts(c);
  if (G.buildMode) drawBuildGhost(c);
  c.restore();
  drawLighting(c, cx, cy, time);
  drawHUD(c, time);
}

const CH = 16; // taille des morceaux de terrain en cache (tuiles)
function paintTile(c, tx, ty, px, py) {
  const t = G.tiles[ty * G.W + tx], h = hash2(tx, ty, G.seed);
  if (t === T.WATER) {
    c.fillStyle = h > .5 ? '#2d5d8a' : '#2a5784'; c.fillRect(px, py, TS, TS);
    return;
  }
  const cols = TCOL[t]; c.fillStyle = cols[Math.floor(h * cols.length) % cols.length]; c.fillRect(px, py, TS, TS);
  switch (t) {
    case T.GRASS: if (h > .62) { c.fillStyle = '#3f6a2d'; c.fillRect(px + (h * 97 % 24) + 3, py + (h * 53 % 22) + 4, 2, 5); c.fillRect(px + (h * 31 % 20) + 6, py + (h * 71 % 18) + 8, 2, 4); } if (h < .04) { c.fillStyle = '#e8d84a'; c.fillRect(px + 12, py + 14, 3, 3); } break;
    case T.FOREST: if (h > .55) { c.fillStyle = '#2c4e25'; c.fillRect(px + (h * 77 % 22) + 4, py + (h * 41 % 22) + 4, 5, 3); } break;
    case T.SAND: if (h > .5) { c.fillStyle = '#b9a06a'; c.fillRect(px + (h * 91 % 24), py + (h * 63 % 24), 2, 2); } break;
    case T.DIRT: if (h > .6) { c.fillStyle = '#6f5a40'; c.fillRect(px + (h * 91 % 24), py + (h * 43 % 24), 4, 3); } break;
    case T.ROAD: if (h > .8) { c.fillStyle = '#2e3035'; c.fillRect(px + (h * 91 % 20), py + (h * 43 % 20), 7, 2); } else if (h < .1) { c.fillStyle = '#6b6e72'; c.fillRect(px + 8, py + 14, 14, 2); } break;
    case T.FLOOR: c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(px, py + 10, TS, 1); c.fillRect(px, py + 21, TS, 1); c.fillRect(px + (h * 29 | 0), py, 1, 10); break;
    case T.CONC: if (h > .8) { c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(px + 4, py + 10, 20, 1); } c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(px, py, TS, 1); c.fillRect(px, py, 1, TS); break;
    case T.WALLT: c.fillStyle = '#58565a'; c.fillRect(px, py, TS, 5); c.fillStyle = '#2b2a2d'; c.fillRect(px, py + 14, TS, 1.5); c.fillRect(px + 15, py + 5, 1.5, 9); c.fillRect(px + 7, py + 15, 1.5, 17); c.fillRect(px + 23, py + 15, 1.5, 17); break;
    case T.PALI: c.fillStyle = '#8a6a3c'; for (let k = 0; k < 4; k++) c.fillRect(px + 1 + k * 8, py + 2, 5, TS - 4); c.fillStyle = '#4a3820'; c.fillRect(px, py + 10, TS, 2); c.fillRect(px, py + 22, TS, 2); break;
  }
}
function getChunk(ccx, ccy) {
  if (!G.chunks) G.chunks = new Map();
  const key = ccy * 1000 + ccx; let ch = G.chunks.get(key);
  if (!ch) {
    if (G.chunks.size > 40) { let worst = null, wd = -1; for (const [k, v] of G.chunks) { const d = Math.abs(v.cx - ccx) + Math.abs(v.cy - ccy); if (d > wd) { wd = d; worst = k; } } G.chunks.delete(worst); }
    const cv = document.createElement('canvas'); cv.width = CH * TS; cv.height = CH * TS; const c = cv.getContext('2d');
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) { const tx = ccx * CH + x, ty = ccy * CH + y; if (inb(tx, ty)) paintTile(c, tx, ty, x * TS, y * TS); }
    ch = { cv, cx: ccx, cy: ccy }; G.chunks.set(key, ch);
  }
  return ch;
}
function drawTiles(c, cx, cy, time) {
  const x0 = Math.max(0, Math.floor(cx / (CH * TS))), y0 = Math.max(0, Math.floor(cy / (CH * TS))), x1 = Math.min(Math.floor((G.W - 1) / CH), Math.floor((cx + VW) / (CH * TS))), y1 = Math.min(Math.floor((G.H - 1) / CH), Math.floor((cy + VH) / (CH * TS)));
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) c.drawImage(getChunk(xx, yy).cv, xx * CH * TS, yy * CH * TS);
  // animation de l'eau
  const tx0 = Math.max(0, Math.floor(cx / TS)), ty0 = Math.max(0, Math.floor(cy / TS)), tx1 = Math.min(G.W - 1, Math.floor((cx + VW) / TS)), ty1 = Math.min(G.H - 1, Math.floor((cy + VH) / TS));
  c.fillStyle = 'rgba(255,255,255,.13)';
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (G.tiles[ty * G.W + tx] !== T.WATER) continue; const h = hash2(tx, ty, G.seed);
    if (h > .55) { const w = Math.sin(time * 1.2 + tx * .7 + ty * .5) * .5 + .5; c.fillRect(tx * TS + 4 + w * 10, ty * TS + 8 + h * 12, 10, 1.5); }
  }
}
function drawDecals(c, cx, cy) {
  for (const d of G.decals) {
    if (d.x < cx - 20 || d.x > cx + VW + 20 || d.y < cy - 20 || d.y > cy + VH + 20) continue;
    c.globalAlpha = Math.min(.55, d.life / 20); c.fillStyle = d.col; c.beginPath(); c.arc(d.x, d.y, d.r, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
}

function drawObjs(c, cx, cy, time) {
  const x0 = Math.max(0, Math.floor(cx / TS) - 1), y0 = Math.max(0, Math.floor(cy / TS) - 1), x1 = Math.min(G.W - 1, Math.floor((cx + VW) / TS) + 1), y1 = Math.min(G.H - 1, Math.floor((cy + VH) / TS) + 1);
  const trees = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const o = G.objs.get(ty * G.W + tx); if (!o) continue;
    if (o.k === 'tree' || o.k === 'deadtree') { trees.push(o); continue; }
    drawObj(c, o, time);
  }
  for (const o of trees) drawObj(c, o, time);
}
function drawObj(c, o, time) {
  const x = o.x, y = o.y, v = o.v;
  let sx = 0; if (o.shakeT > 0) { o.shakeT -= .016; sx = Math.sin(time * 70) * 2; }
  switch (o.k) {
    case 'tree': {
      if (o.dep) { c.fillStyle = '#6a4a2a'; c.beginPath(); c.arc(x, y + 4, 6, 0, TAU); c.fill(); c.fillStyle = '#8a6a3c'; c.beginPath(); c.arc(x, y + 4, 3.5, 0, TAU); c.fill(); break; }
      const r = 18 + v * 7, sw = Math.sin(time * 1.3 + o.tx) * 1.2 + sx;
      shadow(c, x + 4, y + 8, r * .9, r * .6);
      c.fillStyle = '#5a3d22'; c.fillRect(x - 3, y - 2, 6, 14);
      const forest = G.tiles[o.ty * G.W + o.tx] === T.FOREST;
      c.fillStyle = forest ? '#245a22' : '#2f6a28'; c.beginPath(); c.arc(x + sw, y - 6, r, 0, TAU); c.fill();
      c.fillStyle = forest ? '#2d6c2a' : '#3a7a30'; c.beginPath(); c.arc(x + sw - r * .25, y - 9, r * .7, 0, TAU); c.fill();
      c.fillStyle = forest ? '#38803a' : '#4a9040'; c.beginPath(); c.arc(x + sw - r * .35, y - 12, r * .35, 0, TAU); c.fill();
      break;
    }
    case 'deadtree': if (o.dep) break; c.strokeStyle = '#5a4a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x, y - 12); c.moveTo(x, y - 4); c.lineTo(x + 9, y - 14); c.moveTo(x, y - 8); c.lineTo(x - 8, y - 16); c.stroke(); break;
    case 'rock': {
      if (o.dep) { c.fillStyle = '#7a7a7e'; c.fillRect(x - 6, y + 3, 4, 3); c.fillRect(x + 3, y + 5, 3, 3); break; }
      shadow(c, x + 2, y + 6, 14, 8);
      c.fillStyle = '#74767c'; c.beginPath(); c.moveTo(x - 14, y + 6); c.lineTo(x - 10, y - 9); c.lineTo(x + 2, y - 14); c.lineTo(x + 13, y - 6); c.lineTo(x + 14, y + 7); c.closePath(); c.fill();
      c.fillStyle = '#8e9097'; c.beginPath(); c.moveTo(x - 10, y - 9); c.lineTo(x + 2, y - 14); c.lineTo(x + 6, y - 4); c.lineTo(x - 4, y - 2); c.closePath(); c.fill();
      if (v > .8) { c.fillStyle = '#b87333'; c.fillRect(x + 4, y, 4, 3); }
      break;
    }
    case 'bush': {
      c.fillStyle = '#2f5a24'; c.beginPath(); c.arc(x - 5, y, 9, 0, TAU); c.arc(x + 6, y + 1, 8, 0, TAU); c.arc(x, y - 5, 8, 0, TAU); c.fill();
      c.fillStyle = '#3d7030'; c.beginPath(); c.arc(x - 2, y - 3, 6, 0, TAU); c.fill();
      if (!o.dep) { c.fillStyle = '#c0306a'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x - 8 + k * 4 + (v * 7 % 3), y - 4 + (k % 2) * 6, 2, 0, TAU); c.fill(); } }
      break;
    }
    case 'herb': {
      c.strokeStyle = '#4fa040'; c.lineWidth = 2; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * 3, y + 6); c.lineTo(x + k * 6, y - 5); c.stroke(); }
      if (!o.dep) { c.fillStyle = '#e8e0f0'; c.beginPath(); c.arc(x + 5, y - 7, 2.5, 0, TAU); c.arc(x - 6, y - 5, 2.5, 0, TAU); c.fill(); }
      break;
    }
    case 'wreck': {
      c.save(); c.translate(x, y); c.rotate(o.ang || 0); shadow(c, 2, 3, 20, 11);
      const cc = o.dep ? '#3a3633' : ['#7a3a3a', '#3a5a7a', '#6a6a30', '#555'][Math.floor(v * 4)];
      c.fillStyle = cc; rrect(c, -20, -11, 40, 22, 5); c.fill();
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(-9, -9, 16, 18); c.fillStyle = 'rgba(160,200,230,.35)'; c.fillRect(-8, -8, 6, 16);
      c.fillStyle = '#111'; c.fillRect(-17, -13, 8, 3); c.fillRect(8, -13, 8, 3); c.fillRect(-17, 10, 8, 3); c.fillRect(8, 10, 8, 3);
      c.restore(); break;
    }
    case 'scrappile': if (o.dep) break; c.fillStyle = '#6a6a6e'; c.fillRect(x - 9, y - 2, 12, 6); c.fillStyle = '#8a5a3a'; c.fillRect(x - 2, y - 7, 8, 7); c.fillStyle = '#9a9a9e'; c.fillRect(x + 3, y + 1, 7, 4); break;
    case 'crate': {
      if (o.air) { // largage
        c.fillStyle = 'rgba(255,120,40,.25)'; c.beginPath(); c.arc(x, y, 26 + Math.sin(time * 4) * 3, 0, TAU); c.fill();
      }
      shadow(c, x, y + 4, 12, 7);
      c.fillStyle = o.opened ? '#5a4326' : (o.air ? '#4a6a3a' : '#8a6a3a'); rrect(c, x - 12, y - 11, 24, 22, 2); c.fill();
      c.strokeStyle = o.opened ? '#3a2a16' : (o.air ? '#2a4a22' : '#5a4220'); c.lineWidth = 2; c.strokeRect(x - 11, y - 10, 22, 20); c.beginPath(); c.moveTo(x - 11, y - 10); c.lineTo(x + 11, y + 10); c.moveTo(x + 11, y - 10); c.lineTo(x - 11, y + 10); c.stroke();
      if (!o.opened) { const pulse = .5 + Math.sin(time * 4 + o.tx) * .5; c.fillStyle = 'rgba(255,230,120,' + (.25 + pulse * .35) + ')'; c.fillRect(x - 3, y - 3, 6, 6); }
      break;
    }
    case 'mast': c.fillStyle = '#444'; c.fillRect(x - 3, y - 22, 6, 30); c.strokeStyle = '#999'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 9, y - 18); c.lineTo(x + 9, y - 18); c.moveTo(x - 6, y - 10); c.lineTo(x + 6, y - 10); c.stroke(); c.fillStyle = G.radioOn ? (Math.sin(time * 6) > 0 ? '#5f5' : '#2a2') : '#a22'; c.beginPath(); c.arc(x, y - 24, 3, 0, TAU); c.fill(); break;
    case 'furn': {
      c.fillStyle = '#5a4630'; rrect(c, x - 13, y - 9, 26, 18, 2); c.fill(); c.fillStyle = '#7a6040'; c.fillRect(x - 11, y - 7, 22, 4);
      if (o.fv === 1) { c.fillStyle = '#9a9a9e'; c.fillRect(x - 9, y, 18, 6); } break;
    }
    case 'tent': shadow(c, x, y + 4, 22, 12); c.fillStyle = ['#8a7a4a', '#6a7a5a', '#8a5a4a'][Math.floor(v * 3)]; c.beginPath(); c.moveTo(x - 20, y + 14); c.lineTo(x, y - 18); c.lineTo(x + 20, y + 14); c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.moveTo(x - 5, y + 14); c.lineTo(x, y - 2); c.lineTo(x + 5, y + 14); c.closePath(); c.fill(); break;
    case 'sandbag': c.fillStyle = '#a89868'; rrect(c, x - 14, y - 8, 28, 16, 6); c.fill(); c.strokeStyle = '#7a6a40'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 4, y - 8); c.lineTo(x - 4, y + 8); c.moveTo(x + 6, y - 8); c.lineTo(x + 6, y + 8); c.stroke(); break;
    case 'fire': drawFlame(c, x, y, time, 1); break;
    case 'stall': c.fillStyle = '#6a4a2a'; c.fillRect(x - 15, y - 4, 30, 14); c.fillStyle = '#b04a3a'; for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? '#e8e0d0' : '#b04a3a'; c.fillRect(x - 15 + k * 6, y - 14, 6, 12); } break;
  }
}
function drawFlame(c, x, y, time, s) {
  c.fillStyle = '#3a3a3a'; c.beginPath(); c.arc(x, y + 4, 9 * s, 0, TAU); c.fill(); c.fillStyle = '#6a6a6a'; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(x + Math.cos(k) * 8 * s, y + 4 + Math.sin(k) * 7 * s, 2.5 * s, 0, TAU); c.fill(); }
  const f = Math.sin(time * 12 + x) * 2;
  c.fillStyle = '#e8501a'; c.beginPath(); c.moveTo(x - 7 * s, y + 4); c.quadraticCurveTo(x - 4 * s, y - 10 * s + f, x, y - 17 * s - f); c.quadraticCurveTo(x + 5 * s, y - 8 * s, x + 7 * s, y + 4); c.fill();
  c.fillStyle = '#ffb02a'; c.beginPath(); c.moveTo(x - 4 * s, y + 3); c.quadraticCurveTo(x - 2 * s, y - 6 * s, x, y - 11 * s + f * .5); c.quadraticCurveTo(x + 3 * s, y - 5 * s, x + 4 * s, y + 3); c.fill();
}

function drawStructs(c, cx, cy, time) {
  for (const s of G.structs.values()) {
    if (s.x < cx - 40 || s.x > cx + VW + 40 || s.y < cy - 40 || s.y > cy + VH + 40) continue;
    const x = s.x - 16, y = s.y - 16, f = s.flash > 0;
    switch (s.type) {
      case 'wall_wood': c.fillStyle = f ? '#fff' : '#7a5a34'; c.fillRect(x, y, TS, TS); c.fillStyle = '#5a4020'; for (let k = 0; k < 4; k++) c.fillRect(x, y + k * 8 + 7, TS, 1.5); c.fillStyle = '#9a7a4c'; c.fillRect(x, y, TS, 3); break;
      case 'wall_stone': c.fillStyle = f ? '#fff' : '#86888c'; c.fillRect(x, y, TS, TS); c.fillStyle = '#5a5c60'; c.fillRect(x, y + 10, TS, 1.5); c.fillRect(x, y + 21, TS, 1.5); c.fillRect(x + 10, y, 1.5, 10); c.fillRect(x + 21, y + 11, 1.5, 10); c.fillStyle = '#a8aaae'; c.fillRect(x, y, TS, 3); break;
      case 'wall_metal': c.fillStyle = f ? '#fff' : '#5a6270'; c.fillRect(x, y, TS, TS); c.fillStyle = '#3a4250'; c.strokeStyle = '#3a4250'; c.lineWidth = 2; c.strokeRect(x + 2, y + 2, TS - 4, TS - 4); c.fillStyle = '#9aa4b4'; for (const [bx, by] of [[5, 5], [27, 5], [5, 27], [27, 27]]) { c.beginPath(); c.arc(x + bx, y + by, 1.8, 0, TAU); c.fill(); } c.fillStyle = '#7a8494'; c.fillRect(x, y, TS, 3); break;
      case 'door': c.fillStyle = f ? '#fff' : '#6a4a28'; c.fillRect(x + 2, y + 2, TS - 4, TS - 4); c.strokeStyle = '#3a2810'; c.lineWidth = 2; c.strokeRect(x + 2, y + 2, TS - 4, TS - 4); c.fillStyle = '#d0b060'; c.beginPath(); c.arc(x + 23, y + 16, 2.5, 0, TAU); c.fill(); break;
      case 'barricade': c.save(); c.translate(s.x, s.y); c.fillStyle = f ? '#fff' : '#6a5030'; c.rotate(.5); c.fillRect(-15, -4, 30, 7); c.rotate(-1); c.fillRect(-15, -4, 30, 7); c.restore(); c.fillStyle = '#999'; c.fillRect(s.x - 2, s.y - 2, 4, 4); break;
      case 'spikes': c.fillStyle = '#4a3a2a'; c.fillRect(x + 3, y + 3, TS - 6, TS - 6); c.fillStyle = '#c0c0c8'; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { c.beginPath(); c.moveTo(x + 6 + a * 9, y + 13 + b * 9); c.lineTo(x + 10 + a * 9, y + 4 + b * 9); c.lineTo(x + 14 + a * 9, y + 13 + b * 9); c.fill(); } break;
      case 'workbench': shadow(c, s.x, s.y + 4, 15, 9); c.fillStyle = '#7a5a34'; c.fillRect(x + 1, y + 6, TS - 2, 20); c.fillStyle = '#9a7a4c'; c.fillRect(x + 1, y + 6, TS - 2, 6); c.fillStyle = '#aaa'; c.fillRect(x + 6, y + 14, 8, 3); c.fillStyle = '#c33'; c.fillRect(x + 18, y + 13, 6, 6); break;
      case 'campfire': drawFlame(c, s.x, s.y, time, 1); break;
      case 'chest': shadow(c, s.x, s.y + 4, 13, 7); c.fillStyle = '#7a5428'; rrect(c, x + 3, y + 7, 26, 19, 3); c.fill(); c.fillStyle = '#5a3c18'; c.fillRect(x + 3, y + 7, 26, 7); c.fillStyle = '#d0b040'; c.fillRect(x + 14, y + 12, 4, 6); break;
      case 'bed': c.fillStyle = '#5a3a2a'; c.fillRect(x + 2, y + 2, TS - 4, TS - 4); c.fillStyle = '#c04a4a'; c.fillRect(x + 4, y + 8, TS - 8, TS - 12); c.fillStyle = '#eee'; c.fillRect(x + 5, y + 4, 22, 7); break;
      case 'lamp': c.fillStyle = '#444'; c.fillRect(s.x - 2, s.y - 6, 4, 14); c.fillStyle = '#ffe9a0'; c.beginPath(); c.arc(s.x, s.y - 9, 5, 0, TAU); c.fill(); break;
      case 'plot': c.fillStyle = '#4a3220'; c.fillRect(x + 2, y + 2, TS - 4, TS - 4); c.fillStyle = '#3a2616'; for (let k = 0; k < 3; k++) c.fillRect(x + 4, y + 6 + k * 9, TS - 8, 2);
        if (s.plant === 1) { const g = Math.min(1, (G.clock - s.t0) / (DAY_LEN * 1.2)); c.fillStyle = '#5ab040'; for (let k = 0; k < 3; k++) { c.fillRect(x + 7 + k * 8, y + 22 - g * 10, 3, 4 + g * 10); } }
        else if (s.plant === 2) { c.fillStyle = '#4a9a38'; for (let k = 0; k < 3; k++) c.fillRect(x + 7 + k * 8, y + 8, 3, 15); c.fillStyle = '#e8801a'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + 8.5 + k * 8, y + 8, 3.5, 0, TAU); c.fill(); } } break;
      case 'barrel': shadow(c, s.x, s.y + 4, 11, 7); c.fillStyle = '#2f5a8a'; c.beginPath(); c.arc(s.x, s.y, 12, 0, TAU); c.fill(); c.fillStyle = '#1a3a60'; c.beginPath(); c.arc(s.x, s.y, 8, 0, TAU); c.fill(); c.fillStyle = 'rgba(120,190,255,' + (.3 + s.water / 8) + ')'; c.beginPath(); c.arc(s.x, s.y, 6, 0, TAU); c.fill(); break;
      case 'turret': {
        shadow(c, s.x, s.y + 4, 13, 8); c.fillStyle = f ? '#fff' : '#4a5260'; c.beginPath(); c.arc(s.x, s.y, 13, 0, TAU); c.fill(); c.fillStyle = '#2a3038'; c.beginPath(); c.arc(s.x, s.y, 8, 0, TAU); c.fill();
        c.save(); c.translate(s.x, s.y); c.rotate(s.ang); c.fillStyle = '#8a929e'; c.fillRect(2, -3, 18, 6); if (s.flashT > 0) { s.flashT -= .016; c.fillStyle = '#ffe070'; c.beginPath(); c.arc(24, 0, 5, 0, TAU); c.fill(); } c.restore();
        if (!s.ammo) { c.fillStyle = '#f55'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillText('!', s.x, s.y - 16); } break;
      }
    }
    if (s.hp < s.max) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x + 2, y - 5, TS - 4, 4); c.fillStyle = s.hp / s.max > .4 ? '#6c6' : '#e55'; c.fillRect(x + 3, y - 4, (TS - 6) * Math.max(0, s.hp / s.max), 2); }
  }
}
function drawFlags(c, time) {
  for (const p of G.pois) {
    if (!p.flag || p.hidden || !p.def.claim) continue;
    if (p.flag.x < G.camX - 40 || p.flag.x > G.camX + VW + 40 || p.flag.y < G.camY - 40 || p.flag.y > G.camY + VH + 40) continue;
    const x = p.flag.x, y = p.flag.y; c.fillStyle = '#333'; c.fillRect(x - 1.5, y - 22, 3, 28);
    const w = Math.sin(time * 4) * 2;
    c.fillStyle = p.owned ? '#3a9a4a' : (p.cleared ? '#d0d0d0' : '#8a2a2a');
    c.beginPath(); c.moveTo(x + 1.5, y - 22); c.quadraticCurveTo(x + 10, y - 22 + w, x + 18, y - 18); c.lineTo(x + 1.5, y - 10); c.fill();
    if (p.owned) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - 18, y + 10, 36, 4); c.fillStyle = p.hpFlag / BASE_LEVELS[p.lvl].hp > .4 ? '#6c6' : '#e55'; c.fillRect(x - 17, y + 11, 34 * clamp(p.hpFlag / BASE_LEVELS[p.lvl].hp, 0, 1), 2); }
    else if (p.cleared && dist(x, y, P.x, P.y) < 300) { c.fillStyle = 'rgba(120,255,160,.9)'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillText('Libre', x, y - 28); }
  }
}
function drawMinesThrown(c, time) {
  for (const m of G.mines) { c.fillStyle = '#333'; c.beginPath(); c.arc(m.x, m.y, 7, 0, TAU); c.fill(); c.fillStyle = m.arm > 0 ? '#d90' : (Math.sin(time * 8) > 0 ? '#f33' : '#600'); c.beginPath(); c.arc(m.x, m.y, 2.5, 0, TAU); c.fill(); }
  for (const g of G.thrown) {
    const z = g.z || 0;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(g.x, g.y + 3, 5, 3, 0, 0, TAU); c.fill();
    if (g.state === 'flare') { c.fillStyle = '#ff5050'; c.beginPath(); c.arc(g.x, g.y, 3, 0, TAU); c.fill(); continue; }
    c.fillStyle = g.k === 'grenade' ? '#4a6a3a' : g.k === 'molotov' ? '#8a5a2a' : g.k === 'flare' ? '#c33' : '#d33';
    c.beginPath(); c.arc(g.x, g.y - z, 5, 0, TAU); c.fill();
  }
}
function drawPickups(c, time) {
  for (const p of G.pickups) {
    if (p.x < G.camX - 20 || p.x > G.camX + VW + 20 || p.y < G.camY - 20 || p.y > G.camY + VH + 20) continue;
    const b = Math.sin(time * 4 + p.x) * 1.5;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(p.x, p.y + 6, 7, 3, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,200,.18)'; c.beginPath(); c.arc(p.x, p.y + b, 11, 0, TAU); c.fill();
    c.font = '15px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
    const ic = p.gear ? (p.gear.kind === 'w' ? WEAPONS[p.gear.id].i : p.gear.kind === 'a' ? ARMOR[p.gear.id].i : ITEMS[p.gear.id].i) : ITEMS[p.id].i;
    c.fillText(ic, p.x, p.y + b); c.textBaseline = 'alphabetic';
  }
}

// ----- entités -----
function drawPlayer(c, time) {
  const x = P.x, y = P.y, w = curWeapon(); shadow(c, x, y + 2, 12, 9);
  c.save(); c.translate(x, y); c.rotate(P.ang);
  const hurt = P.hurtT > 0;
  // arme
  let reach = 0;
  if (w) {
    const b = WEAPONS[w.id];
    if (b.melee) { reach = P.swing > 0 ? 16 : 6; c.fillStyle = '#bbb'; const L = b.range * .45; c.save(); c.translate(12, 7); c.rotate(P.swing > 0 ? -.9 + (1 - P.swing / .2) * 1.8 : .3); c.fillStyle = '#8a6a3a'; c.fillRect(0, -2, 8, 4); c.fillStyle = w.id === 'axe' || w.id === 'pickaxe' ? '#999' : (w.id === 'bat' || w.id === 'club' ? '#8a6a3a' : '#cfd4da'); c.fillRect(8, -2.5, L, 5); c.restore(); }
    else {
      const len = b.flame ? 26 : ({ pistol: 14, smg: 20, shotgun: 26, hunter: 32, ar: 28, crossbow: 22 }[w.id] || 18);
      c.fillStyle = '#222'; c.fillRect(8, -2.5, len, 5); c.fillStyle = '#555'; c.fillRect(8, -1.5, len, 2);
      if (w.att.sight) { c.fillStyle = '#111'; c.fillRect(14, -5, 8, 3); }
      if (w.att.muzzle) { c.fillStyle = '#333'; c.fillRect(8 + len, -2, 7, 4); }
      reach = 14;
      if (P.flashT > 0) { c.fillStyle = 'rgba(255,230,120,.9)'; c.beginPath(); c.arc(10 + len + 5, 0, 6 + Math.random() * 3, 0, TAU); c.fill(); }
    }
  }
  // épaules / bras
  const body = P.armor.body ? ({ jacket: '#6a7a5a', leather: '#5a3f2a', kevlar: '#2a3a4a', plate: '#3a3f33' }[P.armor.body.id]) : '#4a6fa5';
  c.fillStyle = hurt ? '#f66' : body; c.beginPath(); c.ellipse(0, 0, 7.5, 12, 0, 0, TAU); c.fill();
  c.fillStyle = '#d8b090'; c.beginPath(); c.arc(reach, 5.5, 3.2, 0, TAU); c.arc(reach - 2, -5.5, 3.2, 0, TAU); c.fill();
  // tête
  c.fillStyle = '#d8b090'; c.beginPath(); c.arc(1, 0, 6.5, 0, TAU); c.fill();
  const hd = P.armor.head;
  c.fillStyle = hd ? ({ cap: '#6a5a2a', helmet_moto: '#222', helmet_mil: '#3a4a30' }[hd.id]) : '#3a2a1a'; c.beginPath(); c.arc(0, 0, 6.6, Math.PI * .6, Math.PI * 1.4); c.fill();
  if (hd) { c.beginPath(); c.arc(0, 0, 6.8, 0, TAU); c.globalAlpha = .9; c.fill(); c.globalAlpha = 1; }
  c.restore();
  // arc de coup
  if (P.swing > 0 && w && WEAPONS[w.id].melee) {
    const b = WEAPONS[w.id]; c.strokeStyle = 'rgba(255,255,255,' + (P.swing / .2 * .5) + ')'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, b.range - 6, P.swingA - b.arc / 2, P.swingA + b.arc / 2); c.stroke();
  }
  // laser
  if (w && !WEAPONS[w.id].melee && !P.dead) {
    const s = wstat(w);
    if (s.laser) {
      let lx = x, ly = y; const dx = Math.cos(P.ang), dy = Math.sin(P.ang);
      for (let d = 20; d < s.range; d += 10) { lx = x + dx * d; ly = y + dy * d; const sv = solidAt(Math.floor(lx / TS), Math.floor(ly / TS)); if (sv === 1) break; }
      c.strokeStyle = 'rgba(255,40,40,.55)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + dx * 20, y + dy * 20); c.lineTo(lx, ly); c.stroke(); c.fillStyle = '#f33'; c.beginPath(); c.arc(lx, ly, 2.5, 0, TAU); c.fill();
    }
  }
  if (P.reloading) { const b = wstat(curWeapon()); const u = 1 - P.reload / b.rel; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - 14, y - 24, 28, 4); c.fillStyle = '#fc4'; c.fillRect(x - 13, y - 23, 26 * clamp(u, 0, 1), 2); }
  if (P.burn > 0) drawFlame(c, x, y - 4, time, .6);
}
function drawHPBar(c, e, w) {
  if (e.hp >= e.maxhp * .999) return;
  c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(e.x - w / 2, e.y - e.r - 10, w, 4); c.fillStyle = e.hp / e.maxhp > .4 ? '#c44' : '#e22'; c.fillRect(e.x - w / 2 + 1, e.y - e.r - 9, (w - 2) * clamp(e.hp / e.maxhp, 0, 1), 2);
}
function drawMob(c, m, time) {
  const def = m.def, r = m.r; shadow(c, m.x, m.y + 2, r, r * .75);
  const hit = m.hitT > 0;
  c.save(); c.translate(m.x, m.y); c.rotate(m.aang);
  if (def.fac === 'undead') {
    const sw = Math.sin(m.anim) * 2, lg = m.lunge > 0 ? 5 : 0;
    const shirt = ['#4a5a6a', '#6a4a4a', '#5a5a3a', '#3a3a4a'][(m.homeX * 7 | 0) % 4];
    c.fillStyle = hit ? '#fff' : (def.boss ? '#6a2a3a' : shirt); c.beginPath(); c.ellipse(0, 0, r * .75, r * 1.05, 0, 0, TAU); c.fill();
    c.fillStyle = hit ? '#fff' : def.col; c.beginPath(); c.arc(r * .75 + lg + sw, r * .65, r * .32, 0, TAU); c.arc(r * .75 + lg - sw, -r * .65, r * .32, 0, TAU); c.fill();
    c.fillStyle = hit ? '#fff' : def.col; c.beginPath(); c.arc(1, 0, r * .62, 0, TAU); c.fill();
    c.fillStyle = '#c33'; c.fillRect(r * .35, -r * .3, 2, 2); c.fillRect(r * .35, r * .15, 2, 2);
    if (m.t === 'bloater') { c.fillStyle = 'rgba(160,200,60,.5)'; c.beginPath(); c.arc(0, 0, r * 1.05 + Math.sin(time * 3) * 1.5, 0, TAU); c.fill(); }
    if (m.t === 'zsoldier') { c.fillStyle = '#3a4a30'; c.beginPath(); c.arc(0, 0, r * .66, Math.PI * .5, Math.PI * 1.5); c.fill(); }
    if (m.t === 'spitter') { c.fillStyle = '#9acd32'; c.beginPath(); c.arc(r * .55, 0, 3, 0, TAU); c.fill(); }
    if (m.t === 'screamer') { c.strokeStyle = 'rgba(255,200,230,.5)'; c.lineWidth = 1.5; c.beginPath(); c.arc(r * .9, 0, 5 + Math.sin(time * 8) * 2, -1, 1); c.stroke(); }
  } else if (def.human) {
    const w = WEAPONS[def.gun];
    c.fillStyle = '#222'; c.fillRect(8, -2.5, 8 + (def.gun === 'shotgun' || def.gun === 'ar' || def.gun === 'hunter' ? 12 : 4), 5);
    c.fillStyle = hit ? '#fff' : def.col; c.beginPath(); c.ellipse(0, 0, r * .72, r * 1.05, 0, 0, TAU); c.fill();
    c.fillStyle = '#d8b090'; c.beginPath(); c.arc(r * .7, r * .45, 3, 0, TAU); c.arc(r * .6, -r * .45, 3, 0, TAU); c.arc(0, 0, r * .55, 0, TAU); c.fill();
    c.fillStyle = def.fac === 'legion' ? '#2a2a30' : '#5a2a1a'; c.beginPath(); c.arc(0, 0, r * .58, Math.PI * .55, Math.PI * 1.45); c.fill(); if (def.fac === 'legion') { c.beginPath(); c.arc(0, 0, r * .6, 0, TAU); c.fill(); c.fillStyle = '#a01030'; c.fillRect(-2, -1.5, 5, 3); }
    if (m.flashT > 0) { m.flashT -= .016; c.fillStyle = 'rgba(255,220,100,.9)'; c.beginPath(); c.arc(28, 0, 5, 0, TAU); c.fill(); }
    if (def.boss) { c.strokeStyle = '#ffd070'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, r + 3, 0, TAU); c.stroke(); }
  } else { // animal
    const sz = r;
    c.fillStyle = hit ? '#fff' : def.col; c.beginPath(); c.ellipse(-sz * .1, 0, sz * 1.25, sz * .85, 0, 0, TAU); c.fill();
    c.beginPath(); c.arc(sz * 1.05, 0, sz * .55, 0, TAU); c.fill();
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.moveTo(sz * 1.2, -sz * .45); c.lineTo(sz * 1.0, -sz * .9); c.lineTo(sz * .85, -sz * .4); c.fill(); c.beginPath(); c.moveTo(sz * 1.2, sz * .45); c.lineTo(sz * 1.0, sz * .9); c.lineTo(sz * .85, sz * .4); c.fill();
    c.fillStyle = m.t === 'rabbit' ? '#fff' : '#333'; c.beginPath(); c.arc(-sz * 1.3, 0, sz * .25, 0, TAU); c.fill();
    c.fillStyle = def.mutant ? '#f3a' : '#111'; c.fillRect(sz * 1.25, -sz * .3, 2, 2); c.fillRect(sz * 1.25, sz * .15, 2, 2);
    if (m.t === 'deer') { c.strokeStyle = '#6a4a2a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sz * 1.0, -sz * .3); c.lineTo(sz * 1.2, -sz * .9); c.moveTo(sz * 1.0, sz * .3); c.lineTo(sz * 1.2, sz * .9); c.stroke(); }
    if (def.mutant) { c.fillStyle = 'rgba(200,60,180,.5)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(-sz * .5 + k * sz * .5, (k % 2 ? 1 : -1) * sz * .3, 2.5, 0, TAU); c.fill(); } }
  }
  c.restore();
  if (m.burn > 0) drawFlame(c, m.x, m.y - 2, time, .55);
  drawHPBar(c, m, Math.max(18, r * 2));
  if (def.tame && dist(m.x, m.y, P.x, P.y) < 110) { c.font = '11px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffe9a0'; c.fillText(def.n + ' 🐾', m.x, m.y - r - 14); }
}
function drawFriend(c, f, time) {
  shadow(c, f.x, f.y + 2, f.r, f.r * .75);
  c.save(); c.translate(f.x, f.y); c.rotate(f.aang); const hit = f.hitT > 0;
  if (f.kind === 'pet') {
    const sz = f.r;
    c.fillStyle = hit ? '#fff' : f.col; c.beginPath(); c.ellipse(-sz * .1, 0, sz * 1.25, sz * .85, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(sz * 1.05 + (f.lunge > 0 ? 4 : 0), 0, sz * .55, 0, TAU); c.fill();
    c.fillStyle = '#e04a4a'; c.fillRect(sz * .55, -sz * .55, 3, sz * 1.1);
    c.fillStyle = '#111'; c.fillRect(sz * 1.25, -sz * .3, 2, 2); c.fillRect(sz * 1.25, sz * .15, 2, 2);
  } else {
    const w = WEAPONS[f.gun];
    c.fillStyle = '#222'; c.fillRect(8, -2.5, 16, 5);
    c.fillStyle = hit ? '#fff' : f.col; c.beginPath(); c.ellipse(0, 0, f.r * .72, f.r * 1.05, 0, 0, TAU); c.fill();
    c.fillStyle = '#d8b090'; c.beginPath(); c.arc(0, 0, f.r * .55, 0, TAU); c.arc(f.r * .7, f.r * .45, 3, 0, TAU); c.arc(f.r * .6, -f.r * .45, 3, 0, TAU); c.fill();
    c.fillStyle = '#243a5a'; c.beginPath(); c.arc(0, 0, f.r * .58, Math.PI * .55, Math.PI * 1.45); c.fill();
    if (f.flashT > 0) { c.fillStyle = 'rgba(255,220,100,.9)'; c.beginPath(); c.arc(28, 0, 5, 0, TAU); c.fill(); }
  }
  c.restore();
  drawHPBar(c, f, 22);
  c.font = '10px sans-serif'; c.textAlign = 'center'; c.fillStyle = f.kind === 'pet' ? '#ffd0a0' : '#a0d0ff'; c.fillText(f.name + (f.lvl > 1 ? ' ' + f.lvl : ''), f.x, f.y - f.r - 12);
}
function drawNPCs(c, cx, cy) {
  for (const n of G.npcs) {
    if (n.x < cx - 40 || n.x > cx + VW + 40 || n.y < cy - 40 || n.y > cy + VH + 40) continue;
    shadow(c, n.x, n.y + 2, 11, 8);
    c.save(); c.translate(n.x, n.y); c.rotate(n.face + Math.sin(n.anim) * .05);
    c.fillStyle = n.col; c.beginPath(); c.ellipse(0, 0, 8, 12, 0, 0, TAU); c.fill(); c.fillStyle = '#d8b090'; c.beginPath(); c.arc(1, 0, 6.5, 0, TAU); c.fill(); c.fillStyle = n.id === 'mara' ? '#2a2a2a' : n.id === 'doc' ? '#eee' : '#6a4a2a'; c.beginPath(); c.arc(0, 0, 6.8, Math.PI * .55, Math.PI * 1.45); c.fill();
    c.restore();
    const near = dist(n.x, n.y, P.x, P.y) < 130;
    c.font = (near ? 'bold ' : '') + '11px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(n.name, n.x, n.y - 22);
    const hasQ = n.role !== 'trade' ? (questAvailable(n.id).length > 0) : false; const ready = Object.values(G.quests.active).some(st => { const q = questDef(st.id, st); return q && q.giver === n.id && st.ready; });
    if (ready) { c.fillStyle = '#6f6'; c.font = 'bold 18px sans-serif'; c.fillText('?', n.x, n.y - 34); } else if (hasQ) { c.fillStyle = '#fd4'; c.font = 'bold 18px sans-serif'; c.fillText('!', n.x, n.y - 34); }
  }
}
function drawBullets(c) {
  for (const b of G.bullets) {
    if (b.flame) { const a = clamp(b.left / 120, 0, 1); c.fillStyle = 'rgba(255,' + (100 + rint(0, 120)) + ',20,' + (.35 + a * .4) + ')'; c.beginPath(); c.arc(b.x, b.y, 5 + (1 - a) * 7, 0, TAU); c.fill(); continue; }
    if (b.kind === 'acid') { c.fillStyle = '#9acd32'; c.beginPath(); c.arc(b.x, b.y, 5, 0, TAU); c.fill(); c.fillStyle = 'rgba(190,255,80,.4)'; c.beginPath(); c.arc(b.x, b.y, 8, 0, TAU); c.fill(); continue; }
    c.strokeStyle = b.col || '#ffe9a0'; c.lineWidth = b.kind === 'bolt' ? 2.5 : 2; c.globalAlpha = .9;
    const l = Math.hypot(b.vx, b.vy) * .028; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x - b.vx / Math.hypot(b.vx, b.vy) * l, b.y - b.vy / Math.hypot(b.vx, b.vy) * l); c.stroke(); c.globalAlpha = 1;
  }
}
function drawParts(c) {
  for (const p of G.parts) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.kind === 'fire') { c.globalAlpha = a * .85; c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.size * (.5 + a * .6), 0, TAU); c.fill(); }
    else { c.globalAlpha = a; c.fillStyle = p.col; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  }
  c.globalAlpha = 1;
}
function drawFires(c, time) {
  for (const f of G.fires) {
    const a = clamp(f.life / 1.5, 0, 1); c.fillStyle = 'rgba(255,90,10,' + (.18 * a) + ')'; c.beginPath(); c.arc(f.x, f.y, f.r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,170,30,' + (.14 * a) + ')'; c.beginPath(); c.arc(f.x, f.y, f.r * .65, 0, TAU); c.fill();
  }
}
function drawBlasts(c) {
  for (const b of G.blasts) {
    const u = 1 - b.life / b.max; c.strokeStyle = b.toxic ? 'rgba(160,220,60,' + (1 - u) + ')' : (b.slam ? 'rgba(255,255,255,' + (1 - u) + ')' : 'rgba(255,200,80,' + (1 - u) + ')'); c.lineWidth = 6 * (1 - u) + 1;
    c.beginPath(); c.arc(b.x, b.y, b.r * (.3 + u * .8), 0, TAU); c.stroke();
    c.fillStyle = b.toxic ? 'rgba(150,210,50,' + (.35 * (1 - u)) + ')' : 'rgba(255,170,50,' + (.5 * (1 - u)) + ')'; c.beginPath(); c.arc(b.x, b.y, b.r * (.2 + u * .6), 0, TAU); c.fill();
  }
}
function drawTexts(c) {
  c.textAlign = 'center';
  for (const t of G.texts) { c.globalAlpha = clamp(t.life * 2, 0, 1); c.font = (t.big ? 'bold 18px' : 'bold 12px') + ' sans-serif'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(t.txt, t.x, t.y); c.fillStyle = t.col; c.fillText(t.txt, t.x, t.y); }
  c.globalAlpha = 1;
}
function drawRoofs(c, cx, cy) {
  for (const b of G.buildings) {
    const x = b.x * TS, y = b.y * TS, w = b.w * TS, h = b.h * TS;
    if (x > cx + VW || x + w < cx || y > cy + VH || y + h < cy) continue;
    const inside = P.x > x && P.x < x + w && P.y > y && P.y < y + h;
    const target = inside ? 0 : 1; b.a += (target - b.a) * .18; if (Math.abs(b.a - target) < .02) b.a = target;
    if (b.a < .02) continue;
    c.globalAlpha = b.a; c.fillStyle = b.roof; c.fillRect(x - 3, y - 3, w + 6, h + 6);
    c.fillStyle = 'rgba(0,0,0,.16)'; for (let ly = y; ly < y + h; ly += 10) c.fillRect(x - 3, ly, w + 6, 2);
    c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(x - 3, y - 3, w + 6, 3);
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 3; c.strokeRect(x - 3, y - 3, w + 6, h + 6);
    c.globalAlpha = 1;
  }
}
function drawBuildGhost(c) {
  const tx = Math.floor(G.mouse.x / TS), ty = Math.floor(G.mouse.y / TS);
  const err = checkPlace(G.buildType, tx, ty); G.buildErr = err;
  c.fillStyle = err ? 'rgba(255,60,60,.4)' : 'rgba(80,255,120,.4)'; c.fillRect(tx * TS, ty * TS, TS, TS);
  c.strokeStyle = err ? '#f55' : '#6f8'; c.lineWidth = 2; c.strokeRect(tx * TS + 1, ty * TS + 1, TS - 2, TS - 2);
  c.font = '18px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(STRUCTS[G.buildType].i, tx * TS + 16, ty * TS + 16); c.textBaseline = 'alphabetic';
  if (G.buildType === 'turret') { c.strokeStyle = 'rgba(255,255,255,.3)'; c.setLineDash([4, 4]); c.beginPath(); c.arc(tx * TS + 16, ty * TS + 16, 340, 0, TAU); c.stroke(); c.setLineDash([]); }
  // aperçu des bases
  for (const p of G.pois) if (p.owned) { c.strokeStyle = 'rgba(100,255,150,.25)'; c.setLineDash([8, 8]); c.beginPath(); c.arc(p.cx, p.cy, p.baseR, 0, TAU); c.stroke(); c.setLineDash([]); }
}

// ----- éclairage nocturne -----
function lightAt(lc, x, y, r, a, col) {
  const g = lc.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
  lc.fillStyle = g; lc.beginPath(); lc.arc(x, y, r, 0, TAU); lc.fill();
}
function drawLighting(c, cx, cy, time) {
  const d = G.dark;
  if (d < .02) { // lueur de crépuscule / aube
    return;
  }
  const lc = lightCtx; lc.setTransform(DPR / 2, 0, 0, DPR / 2, 0, 0);
  lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, VW, VH);
  lc.fillStyle = 'rgba(4,8,24,' + (d * .94) + ')'; lc.fillRect(0, 0, VW, VH);
  lc.globalCompositeOperation = 'destination-out';
  const sx = P.x - cx, sy = P.y - cy;
  lightAt(lc, sx, sy, 110, 1);
  if (G.flashlight !== false && !P.dead) {
    lc.save(); lc.beginPath(); lc.moveTo(sx, sy); lc.arc(sx, sy, 430, P.ang - .42, P.ang + .42); lc.closePath(); lc.clip();
    lightAt(lc, sx, sy, 430, 1); lc.restore();
  }
  if (P.flashT > 0) lightAt(lc, sx + Math.cos(P.ang) * 20, sy + Math.sin(P.ang) * 20, 200, .8);
  for (const s of G.structs.values()) {
    if (s.type === 'campfire') lightAt(lc, s.x - cx, s.y - cy, 220 + Math.sin(time * 9 + s.x) * 8, 1);
    else if (s.type === 'lamp') lightAt(lc, s.x - cx, s.y - cy - 8, 260, 1);
    else if (s.type === 'turret' && s.flashT > 0) lightAt(lc, s.x - cx, s.y - cy, 150, .8);
  }
  if (!G.fireObjs) G.fireObjs = [...G.objs.values()].filter(o => o.k === 'fire');
  for (const o of G.fireObjs) if (o.x > cx - 300 && o.x < cx + VW + 300 && o.y > cy - 300 && o.y < cy + VH + 300) lightAt(lc, o.x - cx, o.y - cy, 220, 1);
  for (const g of G.thrown) if (g.state === 'flare') lightAt(lc, g.x - cx, g.y - cy, 340, 1);
  for (const f of G.fires) lightAt(lc, f.x - cx, f.y - cy, f.r * 2.2, .9);
  for (const b of G.blasts) lightAt(lc, b.x - cx, b.y - cy, b.r * 2.5, .9);
  for (const m of G.mobs) if (m.burn > 0 && !m.dead) lightAt(lc, m.x - cx, m.y - cy, 90, .7);
  for (const f of G.friends) if (f.flashT > 0) lightAt(lc, f.x - cx, f.y - cy, 140, .7);
  for (const m of G.mobs) if (m.flashT > 0 && !m.dead) lightAt(lc, m.x - cx, m.y - cy, 140, .7);
  for (const p of G.pois) if (p.type === 'village' && p.cx > cx - 500 && p.cx < cx + VW + 500 && p.cy > cy - 500 && p.cy < cy + VH + 500) lightAt(lc, p.cx - cx, p.cy - cy, 400, .55);
  lc.globalCompositeOperation = 'source-over';
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(lightCvs, 0, 0, lightCvs.width, lightCvs.height, 0, 0, cvs.width, cvs.height); c.setTransform(DPR, 0, 0, DPR, 0, 0);
}

// ----- HUD -----
function bar(c, x, y, w, h, v, max, col, label, icon) {
  c.fillStyle = 'rgba(0,0,0,.55)'; rrect(c, x, y, w, h, 4); c.fill();
  const u = clamp(v / max, 0, 1); if (u > 0) { c.fillStyle = col; rrect(c, x + 1.5, y + 1.5, Math.max(2, (w - 3) * u), h - 3, 3); c.fill(); }
  c.font = 'bold 10px sans-serif'; c.textAlign = 'left'; c.fillStyle = '#fff'; c.fillText(icon + ' ' + label, x + 5, y + h - 3.5);
}
function drawHUD(c, time) {
  if (P.dead && !G.over) return;
  c.textBaseline = 'alphabetic';
  // vignette dégâts / faible vie
  const low = P.hp < 30 ? (30 - P.hp) / 30 : 0, hv = Math.max(P.hurtT > 0 ? P.hurtT / .3 : 0, low * (.5 + Math.sin(time * 5) * .25));
  if (hv > 0) { const g = c.createRadialGradient(VW / 2, VH / 2, VH * .3, VW / 2, VH / 2, VH * .85); g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, 'rgba(160,0,0,' + Math.min(.7, hv * .6) + ')'); c.fillStyle = g; c.fillRect(0, 0, VW, VH); }
  // barres
  const bx = 14, by = VH - 112;
  bar(c, bx, by, 190, 17, P.hp, maxHP(), '#c0392b', Math.ceil(P.hp) + ' / ' + maxHP(), '❤️');
  bar(c, bx, by + 21, 190, 13, P.hun, 100, '#d68910', Math.ceil(P.hun) + '%', '🍖');
  bar(c, bx, by + 38, 190, 13, P.thi, 100, '#2e86c1', Math.ceil(P.thi) + '%', '💧');
  bar(c, bx, by + 55, 190, 13, P.stam, maxStam(), '#27ae60', Math.ceil(P.stam), '⚡');
  c.font = 'bold 11px sans-serif'; c.fillStyle = '#ddd'; c.textAlign = 'left';
  c.fillText('🛡️ ' + armorValue().toFixed(0) + '   ⭐ Niv ' + P.lvl + ' (' + P.xp + '/' + xpNeed(P.lvl) + ')' + (P.sp ? '  ✚' + P.sp + ' pt' : ''), bx + 2, by + 84);
  // statuts
  let sx = bx; c.font = '16px sans-serif';
  for (const [on, ic] of [[P.bleed, '🩸'], [P.infect, '☣️'], [P.sick > 0, '🤢'], [P.burn > 0, '🔥'], [P.painT > 0, '💊'], [P.exhausted, '😮‍💨']]) if (on) { c.fillText(ic, sx, by - 6); sx += 22; }
  // messages
  c.font = '13px sans-serif'; let my = by - 28;
  for (let i = G.msgs.length - 1; i >= 0; i--) {
    const m = G.msgs[i]; c.globalAlpha = clamp(m.life, 0, 1); c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(m.t, bx, my); c.fillStyle = m.col; c.fillText(m.t, bx, my); my -= 17;
  }
  c.globalAlpha = 1;
  // compagnons
  let py = 140; c.font = '11px sans-serif';
  for (const f of G.friends) if (!f.dead && (f.kind === 'pet' || (f.kind === 'recruit' && !f.temp))) { c.fillStyle = 'rgba(0,0,0,.5)'; rrect(c, 14, py, 130, 16, 4); c.fill(); c.fillStyle = f.kind === 'pet' ? '#c78a4a' : '#4a8ac7'; rrect(c, 15, py + 1, 128 * clamp(f.hp / f.maxhp, 0, 1), 14, 3); c.fill(); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText((f.kind === 'pet' ? '🐾 ' : '🎖️ ') + f.name + (f.mode === 'stay' ? ' (attend)' : f.mode === 'guard' ? ' (garde)' : ''), 19, py + 12); py += 19; }
  // barre d'armes
  drawHotbar(c);
  // haut : jour / heure
  const ph = phaseOf(G.clock); c.textAlign = 'center'; c.font = 'bold 15px sans-serif';
  c.fillStyle = 'rgba(0,0,0,.5)'; rrect(c, VW / 2 - 90, 8, 180, 30, 8); c.fill();
  c.fillStyle = '#fff'; c.fillText((isNight() ? '🌙' : '☀️') + ' Jour ' + G.day + '  ' + clockText(), VW / 2, 29);
  if (G.assault) {
    const p = G.pois[G.assault.poi]; if (p) { const left = G.assault.mobs.filter(m => !m.dead).length; c.fillStyle = 'rgba(120,0,0,.65)'; rrect(c, VW / 2 - 140, 44, 280, 24, 6); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 12px sans-serif'; c.fillText('⚠ ASSAUT : ' + left + ' assaillants — Drapeau ' + Math.max(0, Math.round(p.hpFlag / BASE_LEVELS[p.lvl].hp * 100)) + '%', VW / 2, 60); }
  }
  // boss
  let boss = null; for (const m of G.mobs) if (!m.dead && m.def.boss && dist(m.x, m.y, P.x, P.y) < 700 && (m.state === 'combat' || m.state === 'chase' || (m.x > G.camX && m.x < G.camX + VW && m.y > G.camY && m.y < G.camY + VH))) { boss = m; break; }
  if (boss) { const w = Math.min(420, VW - 80); c.fillStyle = 'rgba(0,0,0,.6)'; rrect(c, VW / 2 - w / 2, G.assault ? 76 : 48, w, 18, 6); c.fill(); c.fillStyle = '#b02030'; rrect(c, VW / 2 - w / 2 + 2, (G.assault ? 76 : 48) + 2, (w - 4) * clamp(boss.hp / boss.maxhp, 0, 1), 14, 5); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.fillText(boss.def.n, VW / 2, (G.assault ? 76 : 48) + 13); }
  drawMinimap(c);
  drawQuestTracker(c);
  // invite d'interaction
  if (G.prompt && !G.paused) {
    const t = '[E] ' + G.prompt.text; c.font = 'bold 14px sans-serif'; const w = c.measureText(t).width + 24;
    c.fillStyle = 'rgba(0,0,0,.65)'; rrect(c, VW / 2 - w / 2, VH - 150, w, 28, 8); c.fill(); c.fillStyle = '#ffe9a0'; c.textAlign = 'center'; c.fillText(t, VW / 2, VH - 131);
  }
  if (G.buildMode) {
    const d = STRUCTS[G.buildType]; const t = d.n + ' — ' + costText(costOf(d.cost)) + (G.buildErr ? '   ✖ ' + G.buildErr : '   ✔'); c.font = 'bold 13px sans-serif'; const w = c.measureText(t).width + 24;
    c.fillStyle = 'rgba(0,0,0,.65)'; rrect(c, VW / 2 - w / 2, VH - 188, w, 26, 8); c.fill(); c.fillStyle = G.buildErr ? '#ff9a8a' : '#9fe8a8'; c.textAlign = 'center'; c.fillText(t, VW / 2, VH - 170);
  }
  drawCrosshair(c);
  // fondu sommeil
  const sf = G.sleeping ? 1 - clamp(G.sleepFade, 0, 1) : (G.wakeFade > 0 ? G.wakeFade : 0);
  if (sf > 0) { c.fillStyle = 'rgba(0,0,10,' + sf + ')'; c.fillRect(0, 0, VW, VH); if (G.sleeping) { c.fillStyle = '#fff'; c.font = 'bold 24px sans-serif'; c.textAlign = 'center'; c.fillText('Zzz...', VW / 2, VH / 2); } }
  // indice de début
  if (G.hint && G.hintI < G.hint.length && G.playTime > G.hint[G.hintI][0]) { msg(G.hint[G.hintI][1], '#cfe8ff'); G.hintI++; }
}
function drawHotbar(c) {
  const n = 5, bw = 62, gap = 6, tw = n * bw + (n - 1) * gap, x0 = VW / 2 - tw / 2, y0 = VH - 82;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (bw + gap), w = P.slots[i], sel = i === P.sel;
    c.fillStyle = sel ? 'rgba(255,200,80,.28)' : 'rgba(0,0,0,.5)'; rrect(c, x, y0, bw, 58, 6); c.fill();
    c.strokeStyle = sel ? '#ffc850' : 'rgba(255,255,255,.2)'; c.lineWidth = sel ? 2 : 1; rrect(c, x, y0, bw, 58, 6); c.stroke();
    c.fillStyle = '#aaa'; c.font = '10px sans-serif'; c.textAlign = 'left'; c.fillText(String(i + 1), x + 4, y0 + 12);
    if (w) {
      c.font = '24px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(WEAPONS[w.id].i, x + bw / 2, y0 + 30);
      c.font = '10px sans-serif'; const b = WEAPONS[w.id];
      if (!b.melee) { const s = wstat(w); c.fillStyle = w.mag === 0 ? '#f66' : '#ffe9a0'; c.fillText(w.mag + '/' + s.mag + '  ' + ammoReserve(w), x + bw / 2, y0 + 52); }
      else { c.fillStyle = '#9ad'; c.fillText('mêlée' + (w.lvl > 1 ? ' +' + (w.lvl - 1) : ''), x + bw / 2, y0 + 52); }
    }
  }
  // gadget
  const gl = gadgetList(); const gx = x0 + tw + 14;
  c.fillStyle = 'rgba(0,0,0,.5)'; rrect(c, gx, y0, 70, 58, 6); c.fill(); c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1; rrect(c, gx, y0, 70, 58, 6); c.stroke();
  c.font = '10px sans-serif'; c.fillStyle = '#aaa'; c.textAlign = 'left'; c.fillText('G/F', gx + 4, y0 + 12);
  if (gl.length) { const id = gl[P.gadSel % gl.length]; c.font = '24px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(ITEMS[id].i, gx + 35, y0 + 32); c.font = '10px sans-serif'; c.fillStyle = '#ffe9a0'; c.fillText(ITEMS[id].n.slice(0, 11) + ' x' + invCount(id), gx + 35, y0 + 52); }
  else { c.font = '10px sans-serif'; c.fillStyle = '#777'; c.textAlign = 'center'; c.fillText('aucun gadget', gx + 35, y0 + 36); }
  // poids
  c.font = '11px sans-serif'; c.textAlign = 'right'; const wt = invWeight(), cap = invCap(); c.fillStyle = wt > cap * .9 ? '#f88' : '#ccc'; c.fillText('🎒 ' + wt.toFixed(0) + '/' + cap + '   🪙 ' + invCount('caps'), x0 - 14, y0 + 20);
  c.fillStyle = '#888'; c.fillText('Tab sac · J quêtes · M carte · B construire', x0 - 14, y0 + 36);
}
function drawCrosshair(c) {
  if (G.paused || P.dead) return;
  const mx = G.mouse.sx, my = G.mouse.sy; const w = curWeapon();
  let r = 8;
  if (w && !WEAPONS[w.id].melee && !G.buildMode) { const s = wstat(w); const d = dist(P.x, P.y, G.mouse.x, G.mouse.y); r = clamp((s.spr + P.bloom + (P.moving ? s.spr * .5 : 0)) * d, 5, 70); }
  c.strokeStyle = G.buildMode ? '#6f8' : 'rgba(255,255,255,.85)'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(mx, my, r, 0, TAU); c.stroke();
  c.beginPath(); c.moveTo(mx - r - 5, my); c.lineTo(mx - r + 3, my); c.moveTo(mx + r - 3, my); c.lineTo(mx + r + 5, my); c.moveTo(mx, my - r - 5); c.lineTo(mx, my - r + 3); c.moveTo(mx, my + r - 3); c.lineTo(mx, my + r + 5); c.stroke();
  c.fillStyle = '#fff'; c.fillRect(mx - 1, my - 1, 2, 2);
}
function mapPoiIcon(c, p, x, y) {
  c.font = '14px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill();
  c.strokeStyle = p.owned ? '#5f8' : (p.cleared ? '#ddd' : (p.type === 'camp' || p.type === 'legion' ? '#f55' : '#888')); c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.stroke();
  c.fillStyle = '#fff'; c.fillText(p.def.icon || '•', x, y + 1); c.textBaseline = 'alphabetic';
}
function drawMinimap(c) {
  const S = 150, x0 = VW - S - 14, y0 = 14, win = 64; // fenêtre de 64 tuiles
  const tx = P.x / TS, ty = P.y / TS; const sx = clamp(tx - win / 2, 0, G.W - win), sy = clamp(ty - win / 2, 0, G.H - win);
  c.save(); rrect(c, x0, y0, S, S, 8); c.clip(); c.fillStyle = '#0a0e12'; c.fillRect(x0, y0, S, S);
  c.imageSmoothingEnabled = false; c.drawImage(G.mini, sx, sy, win, win, x0, y0, S, S);
  const k = S / win;
  for (const p of G.pois) { if (!p.discovered || p.hidden) continue; const px = x0 + (p.cx / TS - sx) * k, py = y0 + (p.cy / TS - sy) * k; if (px < x0 - 8 || px > x0 + S + 8 || py < y0 - 8 || py > y0 + S + 8) continue; mapPoiIcon(c, p, px, py); }
  if (G.airdrop && G.airdrop.o && !G.airdrop.o.opened) { const px = x0 + (G.airdrop.x / TS - sx) * k, py = y0 + (G.airdrop.y / TS - sy) * k; c.font = '14px sans-serif'; c.textAlign = 'center'; c.fillText('📦', px, py + 4); }
  for (const f of G.friends) if (!f.dead && f.kind !== 'guard') { c.fillStyle = '#6cf'; c.fillRect(x0 + (f.x / TS - sx) * k - 1.5, y0 + (f.y / TS - sy) * k - 1.5, 3, 3); }
  for (const m of G.mobs) if (!m.dead && m.def.fac !== 'wild' && dist(m.x, m.y, P.x, P.y) < 420 && m.state === 'chase') { c.fillStyle = '#f44'; c.fillRect(x0 + (m.x / TS - sx) * k - 1.5, y0 + (m.y / TS - sy) * k - 1.5, 3, 3); }
  const ppx = x0 + (tx - sx) * k, ppy = y0 + (ty - sy) * k; c.fillStyle = '#ff0'; c.beginPath(); c.arc(ppx, ppy, 3.5, 0, TAU); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke();
  c.restore(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; rrect(c, x0, y0, S, S, 8); c.stroke();
}
function drawQuestTracker(c) {
  const id = G.quests.tracked; if (!id || !G.quests.active[id]) return;
  const st = G.quests.active[id], q = questDef(id, st); if (!q) return;
  const x = VW - 240 - 14, y = 14 + 150 + 10;
  const lines = [{ t: q.title, bold: 1 }].concat(st.ready ? [{ t: '✔ Terminée — voir ' + ({ mara: 'Mara', doc: 'Dr Lin', jonas: 'Jonas' }[q.giver] || '?'), col: '#8affb0' }] : q.objs.map(o => { const p = objProgress(o, st); return { t: (p.cur >= p.need ? '✔ ' : '• ') + p.text + (p.need > 1 ? ' (' + Math.min(p.cur, p.need) + '/' + p.need + ')' : ''), col: p.cur >= p.need ? '#8affb0' : '#ddd' }; }));
  c.fillStyle = 'rgba(0,0,0,.5)'; rrect(c, x, y, 240, 12 + lines.length * 16, 6); c.fill();
  c.textAlign = 'left'; let yy = y + 17;
  for (const l of lines) { c.font = (l.bold ? 'bold ' : '') + '12px sans-serif'; c.fillStyle = l.col || '#ffe070'; c.fillText(l.t.length > 38 ? l.t.slice(0, 37) + '…' : l.t, x + 8, yy); yy += 16; }
  // flèche
  const tg = questTargetPos(q, st);
  if (tg) {
    const sx = tg.x - G.camX, sy = tg.y - G.camY;
    if (sx < 20 || sy < 20 || sx > VW - 20 || sy > VH - 20) {
      const a = Math.atan2(tg.y - P.y, tg.x - P.x), ex = clamp(VW / 2 + Math.cos(a) * VW, 40, VW - 40), ey = clamp(VH / 2 + Math.sin(a) * VH, 70, VH - 130);
      c.save(); c.translate(ex, ey); c.rotate(a); c.fillStyle = '#ffd24a'; c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(14, 0); c.lineTo(-8, -9); c.lineTo(-4, 0); c.lineTo(-8, 9); c.closePath(); c.fill(); c.stroke(); c.restore();
      c.font = '10px sans-serif'; c.fillStyle = '#ffd24a'; c.textAlign = 'center'; c.fillText(tg.label + ' ' + Math.round(dist(P.x, P.y, tg.x, tg.y) / TS) + 'm', ex, ey + 22);
    }
  }
}
