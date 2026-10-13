'use strict';
// ===== Rendu Canvas =====
const TCOL = {
  [T.GRASS]: ['#4d7a38', '#517e3b', '#4a7535', '#55803d'], [T.FOREST]: ['#38602e', '#3c6431', '#355a2b', '#406835'],
  [T.SAND]: ['#cdb57d', '#c8b077', '#d2ba84'], [T.DIRT]: ['#8b7355', '#866a4b', '#917a5a'], [T.ROAD]: ['#3d3f45', '#414349', '#3a3c42'],
  [T.FLOOR]: ['#8b6b45', '#866640', '#906f49'], [T.CONC]: ['#7b7d80', '#777a7d', '#7f8184'], [T.WALLT]: ['#3b3a3d'], [T.PALI]: ['#6a5030'], [T.WATER]: ['#2d5d8a'],
};
const MINICOL = { [T.GRASS]: '#3f6b30', [T.FOREST]: '#2d5226', [T.SAND]: '#bba670', [T.WATER]: '#2a5a8a', [T.ROAD]: '#6a6c72', [T.DIRT]: '#7a6347', [T.FLOOR]: '#8a6d46', [T.CONC]: '#8a8c90', [T.TILE]: '#c8d2da', [T.FLESH]: '#8a3a5a', [T.WALLT]: '#222', [T.PALI]: '#5a4020' };

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
  let tx = P.x + dx / d * l - VW / 2, ty = P.y + dy / d * l - VH / 2;
  tx += G.kick.x; ty += G.kick.y;
  if (P.veh) { tx += Math.cos(P.veh.ang) * P.veh.v * .35; ty += Math.sin(P.veh.ang) * P.veh.v * .35; }
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
  G.sun = sunShadow(); prefetchChunks(cx, cy);
  drawTiles(c, cx, cy, time);
  drawDecals(c, cx, cy);
  drawBuildingShadows(c, cx, cy);
  drawObjs(c, cx, cy, time);
  drawStructs(c, cx, cy, time);
  drawRadZones(c, cx, cy, time);
  drawMinesThrown(c, time);
  drawPickups(c, time);
  drawVehicles(c, cx, cy, time);
  drawNPCs(c, cx, cy);
  for (const m of G.mobs) if (!m.dead && m.x > cx - 60 && m.x < cx + VW + 60 && m.y > cy - 60 && m.y < cy + VH + 60) drawMob(c, m, time);
  for (const f of G.friends) if (!f.dead && f.x > cx - 60 && f.x < cx + VW + 60 && f.y > cy - 60 && f.y < cy + VH + 60) drawFriend(c, f, time);
  if (!P.dead) drawPlayer(c, time);
  drawBullets(c);
  drawClouds(c, time); drawFires(c, time); drawParts(c); drawBlasts(c); drawBolts(c); drawTutMarker(c, time);
  drawFlags(c, time);
  drawRoofs(c, cx, cy);
  drawTexts(c);
  if (G.buildMode) drawBuildGhost(c);
  c.restore();
  drawGrading(c);
  drawLighting(c, cx, cy, time);
  drawAmbient(c, cx, cy, time);
  drawWeather(c, time);
  drawHUD(c, time);
}

function drawDecals(c, cx, cy) {
  for (const d of G.decals) {
    if (d.x < cx - 30 || d.x > cx + VW + 30 || d.y < cy - 30 || d.y > cy + VH + 30) continue;
    if (d.corpse) {
      c.save(); c.globalAlpha = clamp(d.life / 12, 0, 1) * .85; c.translate(d.x, d.y); c.rotate(d.ang + 1.2);
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(1, 2, d.r * 1.1, d.r * .7, 0, 0, TAU); c.fill();
      c.fillStyle = d.human ? '#3a3a40' : '#3a3f36'; c.beginPath(); c.ellipse(0, 0, d.r * .95, d.r * .6, 0, 0, TAU); c.fill();
      c.fillStyle = d.col; c.globalAlpha *= .8; c.beginPath(); c.arc(d.r * .75, 0, d.r * .42, 0, TAU); c.fill(); c.fillRect(-d.r * 1.2, -d.r * .55, d.r * .5, d.r * .22); c.fillRect(-d.r * .8, d.r * .3, d.r * .6, d.r * .2);
      c.restore(); continue;
    }
    c.globalAlpha = Math.min(.55, d.life / 20); c.fillStyle = d.col; c.beginPath(); c.arc(d.x, d.y, d.r, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
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
function drawFeet(c, phase, r, amp, col) {
  const s = Math.sin(phase) * r * .6 * amp; c.fillStyle = col || '#2a2418';
  c.beginPath(); c.ellipse(s, r * .5, r * .32, r * .2, 0, 0, TAU); c.ellipse(-s, -r * .5, r * .32, r * .2, 0, 0, TAU); c.fill();
}
function drawHPBar(c, e, w) {
  if (e.hp >= e.maxhp * .999) return;
  c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(e.x - w / 2, e.y - e.r - 10, w, 4); c.fillStyle = e.hp / e.maxhp > .4 ? '#c44' : '#e22'; c.fillRect(e.x - w / 2 + 1, e.y - e.r - 9, (w - 2) * clamp(e.hp / e.maxhp, 0, 1), 2);
}
function drawTexts(c) {
  c.textAlign = 'center';
  for (const t of G.texts) { c.globalAlpha = clamp(t.life * 2, 0, 1); c.font = (t.big ? 'bold 18px' : 'bold 12px') + ' sans-serif'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(t.txt, t.x, t.y); c.fillStyle = t.col; c.fillText(t.txt, t.x, t.y); }
  c.globalAlpha = 1;
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

function drawTutMarker(c, time) {
  const tg = tutTarget(); if (!tg) return; const b = Math.sin(time * 5) * 4;
  c.save(); c.translate(tg.x, tg.y - 34 + b); c.fillStyle = '#ffd24a'; c.strokeStyle = '#000'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 12); c.lineTo(-11, -4); c.lineTo(-4, -4); c.lineTo(-4, -14); c.lineTo(4, -14); c.lineTo(4, -4); c.lineTo(11, -4); c.closePath(); c.fill(); c.stroke(); c.restore();
  c.strokeStyle = 'rgba(255,210,74,' + (.5 + Math.sin(time * 5) * .3) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(tg.x, tg.y, 26 + Math.sin(time * 4) * 3, 0, TAU); c.stroke();
}
function drawGrading(c) { // lumière dorée à l'aube / au crépuscule
  const ph = phaseOf(G.clock); let a = 0, col = '255,150,80';
  if (ph < .12) a = (1 - ph / .12) * .16; else if (ph > .52 && ph < .72) { a = Math.sin((ph - .52) / .2 * Math.PI) * .17; col = '255,110,50'; }
  if (a > .01) { c.fillStyle = 'rgba(' + col + ',' + a + ')'; c.fillRect(0, 0, VW, VH); }
}
function drawAmbient(c, cx, cy, time) {
  if (SET.quality < 1) return;
  const night = G.dark;
  if (night > .3) { // lucioles
    for (let i = 0; i < 26; i++) {
      const bx = hash2(i, 1, 9) * VW, by = hash2(i, 2, 9) * VH, x = ((bx + Math.sin(time * .4 + i) * 40 + time * 6 * (i % 2 ? 1 : -1)) % VW + VW) % VW, y = (by + Math.cos(time * .5 + i * 1.7) * 30 + VH) % VH;
      const wx = Math.floor((x + cx) / TS), wy = Math.floor((y + cy) / TS); if (!inb(wx, wy)) continue; const t = G.tiles[IDX(wx, wy)]; if (t !== T.FOREST && t !== T.GRASS) continue;
      const a = (.5 + Math.sin(time * 3 + i * 2) * .5) * night; c.fillStyle = 'rgba(210,255,110,' + a * .9 + ')'; c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill(); c.fillStyle = 'rgba(210,255,110,' + a * .18 + ')'; c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fill();
    }
  } else if (G.wType === 'clear') { // poussières / feuilles
    c.fillStyle = 'rgba(255,245,210,.35)';
    for (let i = 0; i < 18; i++) { const x = ((hash2(i, 3, 9) * VW + time * (8 + i % 5 * 3)) % VW), y = (hash2(i, 4, 9) * VH + Math.sin(time * .7 + i) * 18 + VH) % VH; c.fillRect(x, y, 1.6, 1.6); }
  }
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
  if (P.veh && !P.dead) {
    const vv = P.veh; lc.save(); lc.beginPath(); lc.moveTo(sx, sy); lc.arc(sx, sy, 560, vv.ang - .5, vv.ang + .5); lc.closePath(); lc.clip(); lightAt(lc, sx, sy, 560, 1); lc.restore();
  } else if (G.flashlight !== false && !P.dead) {
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
  // lueurs chaudes (additif)
  if (SET.quality > 0) {
    c.save(); c.globalCompositeOperation = 'lighter'; const k = Math.min(1, d * 1.2);
    const glow = (x, y, r, rgb, a) => { blit(c, glowSprite(rgb), x - cx, y - cy, 0, r / 32); };
    c.globalAlpha = .38 * k;
    for (const s of G.structs.values()) { if (s.x < cx - 260 || s.x > cx + VW + 260 || s.y < cy - 260 || s.y > cy + VH + 260) continue; if (s.type === 'campfire') glow(s.x, s.y - 4, 150 + Math.sin(time * 9 + s.x) * 8, '255,150,60'); else if (s.type === 'lamp') glow(s.x, s.y - 8, 130, '255,224,140'); }
    for (const o of G.fireObjs || []) if (o.x > cx - 260 && o.x < cx + VW + 260 && o.y > cy - 260 && o.y < cy + VH + 260) glow(o.x, o.y - 4, 150, '255,150,60');
    for (const g of G.thrown) if (g.state === 'flare') glow(g.x, g.y, 200, '255,90,70');
    if (P.veh) { const v = P.veh; glow(v.x + Math.cos(v.ang) * 150 * 0, v.y, 40, '255,240,200'); }
    c.restore();
  }
}

