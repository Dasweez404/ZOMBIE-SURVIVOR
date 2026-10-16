'use strict';
// ===== Rendu 3D : boucle principale =====
const SKY = { day: '#a6d4f2', dusk: '#e8905a', night: '#070b18' };
function r3proj(x, y, h) { const v = R3.vec; v.set(x / TS, r3ground(x, y) + (h || 0), y / TS); v.project(R3.cam); if (v.z > 1) return null; return [(v.x * .5 + .5) * VW, (-v.y * .5 + .5) * VH]; }

function r3mouse() { // curseur → monde (plan du sol)
  if (!R3.camReady) return;
  const nx = G.mouse.sx / VW * 2 - 1, ny = -(G.mouse.sy / VH) * 2 + 1; R3.ray.setFromCamera({ x: nx, y: ny }, R3.cam);
  let gy = r3ground(P.x, P.y), hit = R3.p;
  for (let k = 0; k < 2; k++) { R3.plane.constant = -gy; if (!R3.ray.ray.intersectPlane(R3.plane, hit)) return; gy = r3ground(hit.x * TS, hit.z * TS); }
  G.mouse.x = clamp(hit.x * TS, 0, G.W * TS); G.mouse.y = clamp(hit.z * TS, 0, G.H * TS);
}

function r3viewRect() {
  const cam = R3.cam, pl = R3.plane; pl.constant = 0; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const [nx, ny] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1]]) { R3.ray.setFromCamera({ x: nx, y: ny }, cam); if (R3.ray.ray.intersectPlane(pl, R3.p)) { x0 = Math.min(x0, R3.p.x); x1 = Math.max(x1, R3.p.x); z0 = Math.min(z0, R3.p.z); z1 = Math.max(z1, R3.p.z); } }
  if (x0 > x1) { x0 = R3.tx - 30; x1 = R3.tx + 30; z0 = R3.tz - 24; z1 = R3.tz + 24; }
  return { x0: Math.max(0, Math.floor(x0 - 3)), x1: Math.min(G.W - 1, Math.ceil(x1 + 3)), y0: Math.max(0, Math.floor(z0 - 3)), y1: Math.min(G.H - 1, Math.ceil(z1 + 4)) };
}

function r3lights(time) {
  const d = G.dark, day = 1 - d, I = G.wType !== 'clear' ? G.wInt : 0, sunP = phaseOf(G.clock), t = clamp((sunP - .06) / .56, 0, 1), a = Math.PI * t;
  const dusk = clamp(1 - Math.abs(d - .5) * 3.2, 0, 1);
  let sky = m3Hex(SKY.day, SKY.night, d); if (dusk > 0) sky = m3Hex(sky, SKY.dusk, dusk * .55);
  if (G.wType === 'storm' || G.wType === 'rain') sky = m3Hex(sky, '#4a5460', I * (G.wType === 'storm' ? .7 : .45) * (day * .8 + .2));
  if (G.wType === 'fog') sky = m3Hex(sky, '#a0a8b0', I * .6);
  R3.scene.background.set(sky); R3.scene.fog.color.set(sky);
  const fogMul = G.wType === 'fog' ? 1 - I * .65 : (G.wType === 'storm' ? 1 - I * .3 : 1);
  R3.scene.fog.near = 40 * fogMul; R3.scene.fog.far = 92 * fogMul;
  const dir = R3.p.set(-Math.cos(a) * .85, Math.sin(a) * .95 + .3, .5).normalize();
  const sun = R3.sun; sun.position.set(R3.tx + dir.x * 55, R3.ty + dir.y * 55, R3.tz + dir.z * 55); sun.target.position.set(R3.tx, R3.ty, R3.tz);
  const sc = day > .55 ? 1 : 0; sun.color.set(dusk > .2 ? m3Hex('#fff0d0', '#ff9a50', dusk) : (d > .55 ? '#8aa0e0' : '#fff4dc'));
  const storm = 1 - I * (G.wType === 'storm' ? .55 : G.wType === 'rain' ? .35 : 0);
  sun.intensity = (d > .55 ? .55 : (.3 + .8 * day)) * storm; R3.hemi.intensity = .55 + .3 * day; R3.hemi.color.set(m3Hex('#dfeaff', '#7a8ec8', d)); R3.hemi.groundColor.set(m3Hex('#6a6040', '#2a3450', d));
  if (G.flash > 0) { R3.hemi.intensity += G.flash * 1.4; sun.intensity += G.flash * .5; }
  { const lit = clamp((G.dark - .25) * 2.2, 0, 1); R3.mats.win.color.setRGB(.38 + lit * .62, .5 + lit * .32, .62 - lit * .22); }
  R3.fx.pts.material.uniforms.uScale.value = R3.fx.add.material.uniforms.uScale.value = R3.renderer.domElement.height / (2 * Math.tan(R3.cam.fov * Math.PI / 360));
}
function r3pointLights(time) {
  const d = G.dark;
  const src = R3.lightSrc; src.sort((p, q) => (p.d - q.d)); const night = .35 + d * 1.5;
  for (let i = 0; i < 6; i++) { const l = R3.pl[i], s = src[i]; if (s && s.d < 20 * 20) { l.position.set(s.x, s.y, s.z); l.color.set(s.c || '#ffa850'); l.intensity = night * (s.k || 1) * (.85 + Math.sin(time * 11 + i * 2.1) * .12 + Math.sin(time * 23 + i) * .05); l.distance = s.r || 11; } else l.intensity = 0; }
  // lumière du joueur
  const gy = r3ground(P.x, P.y); R3.pLight.position.set(P.x / TS, gy + 1.4, P.y / TS); R3.pLight.intensity = .1 + d * .7; R3.pLight.distance = 7 + d * 3;
  if (P.flashT > 0) { R3.pLight.intensity += 1.6; R3.pLight.color.set('#ffd890'); } else R3.pLight.color.set('#ffd9a0');
  const fl = G.flashlight !== false && d > .22 && !P.dead; R3.spot.intensity = fl ? 1.5 * Math.min(1, (d - .2) * 3) : 0;
  if (fl) { const ang = P.veh ? P.veh.ang : P.ang; R3.spot.position.set(P.x / TS, gy + 1.1, P.y / TS); R3.spot.target.position.set(P.x / TS + Math.cos(ang) * 6, gy, P.y / TS + Math.sin(ang) * 6); R3.spot.distance = P.veh ? 34 : 24; }
}



function r3setInst(key, idx, x, y, z, ry, sx, sy, sz, tint) {
  const im = R3.inst[key]; if (!im) return; const n = im.count; if (n >= 1800) return;
  R3.q.setFromAxisAngle(R3.vec.set(0, 1, 0), ry); R3.p.set(x, y, z); R3.s.set(sx, sy, sz); R3.m4.compose(R3.p, R3.q, R3.s); im.setMatrixAt(n, R3.m4);
  const t = tint === undefined ? 1 : tint; R3.tintC.setRGB(t, t, t); im.setColorAt(n, R3.tintC);
  im.count = n + 1; R3.stats.inst++;
}

function r3dropEnt(e) { R3.scene.remove(e.g); if (e.g.userData && e.g.userData.bodyMat) e.g.userData.bodyMat.dispose(); }
function r3getEnt(key, make) { let e = R3.ents.get(key); if (!e) { const g = make(); R3.scene.add(g); e = { g, seen: 0 }; R3.ents.set(key, e); } e.seen = R3.frame; e.g.visible = true; return e; }

function r3humanAnim(u, phase, amp, swingArms, zombie) {
  const s = Math.sin(phase) * .75 * amp; u.legL.rotation.z = s; u.legR.rotation.z = -s;
  if (!zombie && swingArms) { u.armL.rotation.z = -s * .8; u.armR.rotation.z = s * .8; }
}
function r3flash(mat, hit, burn, tele) { if (tele) mat.emissive.setRGB(.8, .1, .08); else if (hit) mat.emissive.setRGB(.7, .7, .7); else if (burn) mat.emissive.setRGB(.55, .22, .04); else mat.emissive.setRGB(0, 0, 0); }

function render3(time) {
  const c = ctx; if (R3.canvas.style.display === 'none') R3.canvas.style.display = 'block'; if (R3.G !== G) r3reset(); R3.frame = (R3.frame || 0) + 1; const fr = R3.frame, dt = Math.min(.05, R3.lastT ? time - R3.lastT : .016); R3.lastT = time;
  R3.stats = { inst: 0, ents: 0, chunks: 0, built: 0, roofs: 0, culled: 0 }; R3.lightSrc = []; if (!R3.tintC) R3.tintC = new THREE.Color();
  for (const k in R3.inst) R3.inst[k].count = 0;
  // --- caméra ---
  const sh = G.shake, ox = sh ? rnd(-sh, sh) : 0, oy = sh ? rnd(-sh, sh) : 0;
  const cx = Math.round(G.cam.x), cy = Math.round(G.cam.y); G.camX = cx; G.camY = cy;
  const tpx = cx + VW / 2, tpy = cy + VH / 2, tgy = r3ground(tpx, tpy); R3.tx = tpx / TS; R3.tz = tpy / TS; R3.camGy = R3.camInit ? R3.camGy + (tgy - R3.camGy) * Math.min(1, dt * 4) : tgy; R3.camInit = true; R3.ty = R3.camGy;
  const pitch = 66 * Math.PI / 180, D = 1.62 * VH / TS * .92 * (R3.zoom = R3.zoom || SET.zoom3d || 1.12);
  R3.cam.position.set(R3.tx + ox / TS * .5, R3.ty + D * Math.sin(pitch) + oy / TS * .5, R3.tz + D * Math.cos(pitch)); R3.cam.lookAt(R3.tx, R3.ty, R3.tz); R3.cam.updateMatrixWorld(); R3.camReady = true;
  if (R3.cam.aspect !== VW / VH) { R3.cam.aspect = VW / VH; R3.cam.updateProjectionMatrix(); r3resize(); }
  r3adapt(time, fr);
  if (!R3.warm) { R3.warm = [...new Set(Object.values(POITYPES).map(d => d.icon).concat(['🏠']))]; }
  if (R3.warm.length && fr % 3 === 0) iconTex(R3.warm.pop());
  const vr = r3viewRect();
  r3lights(time);
  // --- chunks (flux) ---
  const ccx0 = Math.floor(vr.x0 / CHK), ccx1 = Math.floor(vr.x1 / CHK), ccy0 = Math.floor(vr.y0 / CHK), ccy1 = Math.floor(vr.y1 / CHK), need = [];
  for (let y = ccy0; y <= ccy1; y++) for (let x = ccx0; x <= ccx1; x++) { const k = y * 1000 + x; if (!R3.chunks.has(k)) need.push([k, x, y, Math.hypot((x + .5) * CHK - R3.tx, (y + .5) * CHK - R3.tz)]); }
  need.sort((a, b) => a[3] - b[3]); const bt0 = performance.now(), bmax = R3.chunks.size < 6 ? 80 : 5; let roofBudget = R3.chunks.size < 6 ? 30 : 2; // budget de temps : pas de saccade
  for (const [k, x, y] of need) { if (R3.stats.built >= 1 && performance.now() - bt0 > bmax) break; R3.chunks.set(k, r3buildChunk(x, y)); R3.stats.built++; }
  for (const [k, ch] of R3.chunks) { const vis = ch.cx >= ccx0 - 1 && ch.cx <= ccx1 + 1 && ch.cy >= ccy0 - 1 && ch.cy <= ccy1 + 1; if (!vis) { r3freeChunk(ch); R3.chunks.delete(k); } else { const inV = ch.cx >= ccx0 && ch.cx <= ccx1 && ch.cy >= ccy0 && ch.cy <= ccy1; ch.mesh.visible = inV; if (ch.water) ch.water.visible = inV; if (inV) R3.stats.chunks++; } }
  // --- bâtiments : toits (fondu à l'entrée) ---
  const px = P.x, py = P.y; let insideB = -1;
  for (let n = 0; n < G.buildings.length; n++) { const b = G.buildings[n]; if (px > b.x * TS && px < (b.x + b.w) * TS && py > b.y * TS && py < (b.y + b.h) * TS) { insideB = n; break; } }
  G.buildings.forEach((b, n) => {
    if (b.x + b.w < vr.x0 || b.x > vr.x1 || b.y + b.h < vr.y0 || b.y > vr.y1) { const m = R3.roofs.get(n); if (m) { m.visible = false; if (m.userData.extra) m.userData.extra.visible = false; } return; }
    if (!R3.roofs.has(n)) { if (roofBudget-- <= 0) return; }
    const m = r3roof(b, n), target = n === insideB ? 0 : 1; b.a += (target - b.a) * .16; if (Math.abs(b.a - target) < .02) b.a = target;
    m.material.opacity = b.a; m.visible = b.a > .03; m.material.depthWrite = b.a > .9; if (m.userData.extra) m.userData.extra.visible = true; m.userData.used = fr; R3.stats.roofs++;
  });
  if (R3.roofs.size > 140) for (const [n, m] of R3.roofs) if ((m.userData.used || 0) < fr - 600) { R3.scene.remove(m); m.geometry.dispose(); m.material.dispose(); if (m.userData.extra) R3.scene.remove(m.userData.extra); R3.roofs.delete(n); }
  const hidden = n => n >= 0 && G.buildings[n].a > .6; // occlusion : sous un toit fermé
  // --- objets du monde : les extérieurs sont fusionnés par chunk ; on ne traite ici que les effets et l'intérieur des bâtiments ouverts ---
  const dyn = R3.dyn || (R3.dyn = new Map());
  for (const ch of R3.chunks.values()) {
    if (!ch.mesh.visible) continue;
    if ((fr + ch.cx * 7 + ch.cy * 3) % 12 === 0) { let sig = 0; const x0 = ch.cx * CHK, y0 = ch.cy * CHK, x1 = Math.min(G.W, x0 + CHK), y1 = Math.min(G.H, y0 + CHK); for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) { const o = G.objs.get(ty * G.W + tx); if (o) sig = (sig * 31 + (o.dep ? 7 : 1) + (o.opened ? 13 : 0)) | 0; } if (sig !== ch.sig) r3bakeObjs(ch); }
    if (ch.objMesh) ch.objMesh.visible = true; R3.stats.baked = (R3.stats.baked || 0);
    for (const [o, tx, ty] of ch.fx) r3objFx(o, tx, ty, time, dyn, fr);
    for (const [o, tx, ty] of ch.inter) {
      if (hidden(R3.bidx[ty * G.W + tx])) { R3.stats.culled++; continue; }
      const sp = r3objSpec(o, tx, ty); if (sp) r3setInst(sp.key, 0, sp.x, sp.y, sp.z, sp.ry, sp.sx, sp.sy, sp.sz, sp.tint); if (R3.FX_KINDS[o.k]) r3objFx(o, tx, ty, time, dyn, fr);
    }
  }
  for (const ch of R3.chunks.values()) if (ch.objMesh) ch.objMesh.visible = ch.mesh.visible;
  for (const [i, e] of dyn) if (e.userData.seen !== fr) e.visible = false;
  for (const k in R3.inst) { const im = R3.inst[k]; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  // --- entités, structures, effets ---
  r3entities(vr, time, dt, fr, hidden);
  r3structs(vr, time, fr);
  r3effects(vr, time, dt, fr, hidden);
  for (const [k, e] of R3.ents) if (e.seen !== fr) { r3dropEnt(e); R3.ents.delete(k); }
  // --- rendu ---
  r3pointLights(time);
  R3.renderer.render(R3.scene, R3.cam);
  R3.stats.tris = R3.renderer.info.render.triangles; R3.stats.calls = R3.renderer.info.render.calls;
  // --- surcouche 2D : textes, barres de vie, interface ---
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, VW, VH);
  r3overlay(c, time, vr);
  drawWeather(c, time);
  drawHUD(c, time);
  if (R3.showStats) { c.font = '11px monospace'; c.fillStyle = '#9fe8ff'; c.textAlign = 'left'; c.fillText('3D  tris ' + R3.stats.tris + '  zoom ' + (R3.zoom || 1).toFixed(2) + '  rés ' + (R3.res || 1).toFixed(2) + (+SET.res3d ? ' (fixe)' : ' (auto)') + '  fps~' + Math.round(1000 / ((R3.hist && R3.hist.length ? R3.hist.reduce((a, b) => a + b, 0) / R3.hist.length : 16.7))) + '  appels ' + R3.stats.calls + '  chunks ' + R3.stats.chunks + '/' + R3.chunks.size + ' (+' + R3.stats.built + ')  instances ' + R3.stats.inst + '  masqués ' + R3.stats.culled + '  entités ' + R3.ents.size, 12, VH - 24); }
}

R3.FX_KINDS = { crate: 1, mast: 1, tank: 1, pylon: 1, screen: 1, plane: 1, fire: 1, ferris: 1, carousel: 1, altar: 1 };
function r3objSpec(o, tx, ty) { // géométrie statique d'un objet (null si rien à dessiner)
  const gy = r3ground(o.x, o.y), X = o.x / TS, Z = o.y / TS, k = o.k, ry = hash2(tx, ty, 9) * TAU, S = (key, ry2, sx, sy, sz, tint) => ({ key, x: X, y: gy, z: Z, ry: ry2, sx: sx || 1, sy: sy || 1, sz: sz || 1, tint });
  switch (k) {
    case 'tree': case 'deadtree': { if (o.dep) return S('stump', ry); const [kind, vv] = treeKindOf(o), sc = (.86 + hash2(tx, ty, 3) * .3) * (kind === 'pine' ? 1.05 : .95); const key = kind + vv; return S(R3.geo[key] ? key : kind + '0', ry, sc, sc, sc, .88 + hash2(tx, ty, 4) * .22); }
    case 'rock': return S(o.dep ? 'rockDep' : 'rock', ry, .8 + o.v * .5, .8 + o.v * .6, .8 + o.v * .5, .9 + hash2(tx, ty, 5) * .2);
    case 'bush': return S(o.dep ? 'bushEmpty' : 'bush', ry, 1, 1, 1, .92 + hash2(tx, ty, 5) * .16);
    case 'herb': return S('herb', ry);
    case 'scrappile': return o.dep ? null : S('scrap', ry);
    case 'wreck': return S(o.dep ? 'wreckDep' : 'wreck' + Math.floor(o.v * 4), -(o.ang || 0));
    case 'crate': return S(o.air ? 'crateAir' : o.opened ? 'crateOpen' : 'crate', 0);
    case 'mast': case 'radbarrel': case 'sandbag': case 'stall': case 'altar': case 'counter': case 'labtable': case 'tank': case 'tower': case 'rails': case 'pylon': case 'screen': return S(k, 0);
    case 'furn': return S('furn#' + (o.fv || 0), 0);
    case 'tent': return S('tent#' + Math.floor(o.v * 3), ry * .2);
    case 'pew': return S('pew#' + (o.fv || 0), 0);
    case 'desk': return S('desk#' + (o.fv || 0), 0);
    case 'grave': return S('grave#' + (o.gv || 0), hash2(tx, ty, 6) * .3 - .15);
    case 'egg': return S('egg', ry);
    case 'ore': return S(o.dep ? 'orDep' : 'ore', ry);
    case 'plane': return { key: 'plane', x: o.px / TS + .9, y: r3ground(o.px, o.py), z: o.py / TS, ry: 0, sx: 1, sy: 1, sz: 1 };
    case 'fire': case 'ferris': case 'carousel': case 'planepart': case 'screenpart': return null;
    default: return S('fallback', 0);
  }
}
function r3objFx(o, tx, ty, time, dyn, fr) { // effets animés (lumières, étincelles, grande roue…)
  const gy = r3ground(o.x, o.y), X = o.x / TS, Z = o.y / TS, d2 = (X - R3.tx) ** 2 + (Z - R3.tz) ** 2;
  switch (o.k) {
    case 'crate': if (!o.opened) r3part(X, gy + .8 + Math.sin(time * 4 + tx) * .05, Z, .5, RGB_.glow, .55, true); break;
    case 'mast': r3part(X, gy + 4.05, Z, .5, G.radioOn ? (Math.sin(time * 6) > 0 ? [.3, 1, .3] : [.1, .5, .1]) : [1, .2, .2], .9, true); break;
    case 'altar': R3.lightSrc.push({ x: X, y: gy + 1.2, z: Z, c: '#ffc060', k: .5, r: 7, d: d2 }); break;
    case 'tank': r3part(X, gy + .7, Z, .8, [.2, 1, .5], .1 + Math.sin(time * 2 + tx) * .04, true); break;
    case 'pylon': if (Math.sin(time * 9 + tx * 3) > .55) { r3part(X, gy + 3.0, Z, 1.4, [.5, .9, 1], .8, true); R3.lightSrc.push({ x: X, y: gy + 3, z: Z, c: '#80e0ff', k: 1.4, r: 9, d: d2 }); } break;
    case 'screen': if (G.dark > .1) R3.lightSrc.push({ x: X, y: gy + 1.8, z: Z + 2, c: '#9abfff', k: .9 * (.6 + Math.abs(Math.sin(time * 3.1) * Math.sin(time * 7.3))), r: 12, d: d2 }); break;
    case 'plane': r3part(o.px / TS + 1.6, gy + 1.2, o.py / TS, .7, RGB_.fire, .5 + Math.sin(time * 7) * .15, true); break;
    case 'fire': r3fire(X, gy, Z, time, 1, tx); break;
    case 'ferris': case 'carousel': { const i = ty * G.W + tx; let e = dyn.get(i); if (!e) { e = r3dynMake(o.k); R3.scene.add(e); dyn.set(i, e); } e.visible = true; e.position.set(X, gy, Z); r3dynAnim(e, o.k, time); e.userData.seen = fr; if (o.k === 'ferris' && G.dark > .15) for (let q = 0; q < 12; q++) { const a = time * .22 + q * TAU / 12; r3part(X + Math.cos(a) * 1.9, gy + 2.5 + Math.sin(a) * 1.9, Z + .35, .3, [[1, .35, .35], [1, .85, .35], [.45, .75, 1]][q % 3], .7 * G.dark, true); } break; }
  }
}
function r3fire(X, gy, Z, time, sc, seed) {
  for (let q = 0; q < 3; q++) { const a = Math.random() * TAU, r = Math.random() * .12 * sc; r3part(X + Math.cos(a) * r, gy + .2 + Math.random() * .5 * sc, Z + Math.sin(a) * r, .38 * sc * (.6 + Math.random() * .6), RGB_.fire, .55, true); }
  r3part(X, gy + .15, Z, .6 * sc, [1, .75, .3], .25 + Math.sin(time * 14 + seed) * .08, true);
  if (Math.random() < .25) r3part(X + rnd(-.1, .1), gy + .8 + Math.random() * .6, Z + rnd(-.1, .1), .09, [1, .8, .3], .9, true);
  R3.lightSrc.push({ x: X, y: gy + .8, z: Z, c: '#ffa040', k: 1 * sc, r: 12, d: (X - R3.tx) ** 2 + (Z - R3.tz) ** 2 });
}

// ----- objets dynamiques (grande roue, carrousel) -----
function r3dynMake(kind) {
  const g = GEO(), root = new THREE.Group();
  if (kind === 'ferris') {
    const wheel = new THREE.Group(); wheel.position.y = 2.5; root.add(wheel); root.userData.wheel = wheel; root.userData.gond = [];
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, .05, 4, 20), lam('#e6e8f0')); ring.castShadow = true; wheel.add(ring); const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.0, .04, 4, 14), lam('#d0d4de')); wheel.add(ring2);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const sp = bmesh(g.box, lam('#c8ccd8'), Math.cos(a) * .95, Math.sin(a) * .95, 0, 1.9, .04, .04); sp.rotation.z = a; wheel.add(sp); const gp = pivot(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0); gp.add(bmesh(g.box, lam(['#e04a4a', '#e8b030', '#4aa8e0', '#58c068', '#c060d0'][i % 5]), 0, -.2, 0, .36, .3, .4)); gp.add(bmesh(g.box, lam('#c8ccd8'), 0, -.04, 0, .04, .18, .04)); wheel.add(gp); root.userData.gond.push(gp); }
    const hub = bmesh(g.cyl8, lam('#dfe2ea'), 0, 0, 0, .3, .5, .3); hub.rotation.x = Math.PI / 2; wheel.add(hub);
    for (const sd of [-1, 1]) for (const lr of [-1, 1]) { const leg = bmesh(g.box, lam('#a0a6b4'), lr * .7, 1.25, sd * .5, .08, 2.7, .08); leg.rotation.z = -lr * .26; root.add(leg); }
  } else {
    const base = bmesh(g.cyl8, lam('#8a5a3a'), 0, .1, 0, 2.2, .2, 2.2); root.add(base); const top = new THREE.Group(); top.position.y = .2; root.add(top); root.userData.top = top;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; top.add(bmesh(g.cyl, lam('#e8c860'), Math.cos(a) * .85, .7, Math.sin(a) * .85, .06, 1.4, .06)); const h = new THREE.Group(); h.position.set(Math.cos(a) * .85, .4, Math.sin(a) * .85); h.rotation.y = -a; h.add(bmesh(g.box, lam(['#f4efe2', '#c8403a', '#4a6ab0', '#e8b030'][i % 4]), 0, .1, 0, .5, .3, .18)); h.add(bmesh(g.box, lam('#d8d0c0'), .22, .3, 0, .12, .24, .1)); top.add(h); }
    for (let i = 0; i < 8; i++) { const a0 = i / 8 * TAU; const w = bmesh(g.cone, lam(i % 2 ? '#f4efe2' : '#c8403a'), Math.cos(a0 + .39) * .55, 1.7, Math.sin(a0 + .39) * .55, 1.2, .6, 1.2); top.add(w); }
    top.add(bmesh(g.cone, lam('#e8c050'), 0, 2.15, 0, .3, .5, .3));
  }
  return root;
}
function r3dynAnim(e, kind, time) {
  if (kind === 'ferris') { e.userData.wheel.rotation.z = time * .22; for (const gp of e.userData.gond) gp.rotation.z = -time * .22; } else e.userData.top.rotation.y = time * .5;
}

// ----- personnages et véhicules -----
function r3entities(vr, time, dt, fr, hidden) {
  const inV = (x, y) => { const tx = x / TS, ty = y / TS; return tx > vr.x0 - 2 && tx < vr.x1 + 2 && ty > vr.y0 - 2 && ty < vr.y1 + 3; };
  const occl = (x, y) => hidden(R3.bidx[IDX(clamp(Math.floor(x / TS), 0, G.W - 1), clamp(Math.floor(y / TS), 0, G.H - 1))]);
  // mobs
  for (const m of G.mobs) {
    if (m.dead || !inV(m.x, m.y)) continue; if (occl(m.x, m.y)) { R3.stats.culled++; continue; }
    const e = r3getEnt(m, () => mkMob(m)), g = e.g, u = g.userData, gy = r3ground(m.x, m.y); R3.stats.ents++;
    g.position.set(m.x / TS, gy, m.y / TS); g.rotation.y = -m.aang;
    const mv = m.state === 'idle' ? .12 : 1;
    if (u.legL) { r3humanAnim(u, m.anim * 1.6, mv, !!m.def.human, !m.def.human); if (m.def.fac === 'undead' && m.t !== 'crawler') { u.inner.position.y = Math.abs(Math.sin(m.anim * 1.6)) * .04; u.inner.rotation.z = Math.sin(m.anim * .8) * .05; } u.inner.position.x = m.lunge > 0 ? .25 : 0; }
    if (u.legs) u.legs.forEach((l, i) => l.rotation.z = Math.sin(m.anim * 1.8 + (i % 2 ? 0 : Math.PI) + (i > 1 ? .8 : 0)) * .6 * mv);
    if (u.bodyMat) r3flash(u.bodyMat, m.hitT > 0, m.burn > 0 && !m.def.fireproof, m.windup > 0);
    if (m.burn > 0 && !m.def.fireproof) r3fire(m.x / TS, gy, m.y / TS, time, .55, 1);
    if (m.def.ignite || m.def.aura) r3part(m.x / TS, gy + .6, m.y / TS, 1.0, m.def.ignite ? RGB_.fire : RGB_.toxic, .22, true);
    if (m.windup > 0) r3part(m.x / TS + Math.cos(m.aang) * 1.2, gy + .1, m.y / TS + Math.sin(m.aang) * 1.2, .6, [1, .2, .1], .4, true);
  }
  // alliés (gardes, recrues, familiers)
  for (const f of G.friends) {
    if (f.dead || !inV(f.x, f.y) || occl(f.x, f.y)) continue; const gy = r3ground(f.x, f.y);
    const e = r3getEnt(f, () => f.kind === 'pet' ? mkQuad(Object.assign({}, ANIMAL3[f.sp] || { col: f.col, len: .9, h: .4, wid: .3, leg: .3 }, { col: f.col || '#888', k: f.r / 12 })) : mkHumanoid({ skin: '#d6a984', shirt: f.col || '#4a8a5a', pants: '#2c3a44', gun: true, hair: '#3a2a1a', helmet: f.kind === 'guard' ? '#4a5a3a' : null, armband: '#ffffff', ring: '#4aff80' })), g = e.g, u = g.userData; R3.stats.ents++;
    g.position.set(f.x / TS, gy, f.y / TS); g.rotation.y = -(f.aang || 0);
    if (u.legL) r3humanAnim(u, (f.anim || 0) * 1.6, .8, true, false); if (u.legs) u.legs.forEach((l, i) => l.rotation.z = Math.sin((f.anim || 0) * 1.8 + (i % 2 ? 0 : Math.PI)) * .6);
    if (u.bodyMat) r3flash(u.bodyMat, f.hitT > 0, false, false);
  }
  // PNJ
  for (const n of G.npcs) {
    if (!inV(n.x, n.y)) continue; const e = r3getEnt(n, () => mkHumanoid({ skin: '#d6a984', shirt: n.col || '#8a6a4a', pants: '#3a3a44', hair: '#4a3020', scale: 1, ring: '#ffd24a' })), gy = r3ground(n.x, n.y); R3.stats.ents++;
    e.g.position.set(n.x / TS, gy, n.y / TS); e.g.rotation.y = -(Math.atan2(P.y - n.y, P.x - n.x)); r3humanAnim(e.g.userData, 0, 0, false, false);
  }
  // véhicules
  for (const v of G.vehicles) {
    if (!inV(v.x, v.y)) continue; const e = r3getEnt(v, () => mkVehicle(v)), g = e.g, u = g.userData, gy = r3ground(v.x, v.y); R3.stats.ents++;
    g.position.set(v.x / TS, gy, v.y / TS); g.rotation.y = -v.ang; u.roll = (u.roll || 0) - (v.v || 0) * dt / (.22 * TS) * .9; for (const w of u.wheels) w.rotation.z = u.roll;
    if (u.gun) { u.gun.visible = !!(v.up && v.up.gun > 0); u.gun.rotation.y = -(v.gunAng || 0) + v.ang; }
    if (v.hp < v.maxhp * .35 && Math.random() < .5) r3part(v.x / TS, gy + .8, v.y / TS, .45, [.25, .25, .25], .5, false);
    if (P.veh === v) R3.lightSrc.push({ x: v.x / TS + Math.cos(v.ang) * 3, y: gy + .8, z: v.y / TS + Math.sin(v.ang) * 3, c: '#fff0c0', k: .8 * G.dark, r: 14, d: 0 });
  }
  // joueur
  if (!R3.player) { R3.player = mkPlayer(); R3.scene.add(R3.player); }
  const pg = R3.player, pu = pg.userData, vis = !P.dead && !(P.veh && P.veh.def.closed); pg.visible = vis;
  if (vis) {
    const v = P.veh, gy = r3ground(P.x, P.y); pg.position.set(P.x / TS, gy + (v ? .45 : 0), P.y / TS); pg.rotation.y = -(v ? v.ang : P.ang);
    const w = curWeapon(), melee = w && WEAPONS[w.id].melee; pu.melee.visible = !!(w && melee); pu.rgun.visible = !!(w && !melee);
    if (w && !melee) pu.rgun.scale.x = clamp(WEAPONS[w.id].range / 400, .7, 1.5);
    r3playerGear(pg);
    const run = P.moving ? 1 : .08; r3humanAnim(pu, (P.walk || 0), run, !w || melee, false);
    if (w && !melee) { pu.armR.rotation.z = 1.45; pu.armL.rotation.z = 1.2; } else if (P.swing > 0) pu.armR.rotation.z = 1.2;
    if (melee) { const sw = P.swing > 0 ? (-.9 + (1 - P.swing / .2) * 1.8) * (P.swingDir || 1) : .3; pu.melee.rotation.y = -sw; pu.melee.position.set(.3, .62, .26); }
    pu.inner.rotation.z = P.dodgeT > 0 ? -.55 : 0; pu.inner.position.y = P.dodgeT > 0 ? -.08 : (P.moving ? Math.abs(Math.sin(P.walk || 0)) * .03 : 0);
    r3flash(pu.bodyMat, P.hurtT > 0, false, false); if (P.invuln > 0) pu.bodyMat.emissive.setRGB(.2, .4, .6);
  }
}

function hiddenB(tx, ty) { const n = R3.bidx[IDX(clamp(tx, 0, G.W - 1), clamp(ty, 0, G.H - 1))]; return n >= 0 && G.buildings[n].a > .6; }
function r3structs(vr, time, fr) {
  const seen = new Set();
  for (const s of G.structs.values()) {
    const tx = s.tx, ty = s.ty; if (tx < vr.x0 - 1 || tx > vr.x1 + 1 || ty < vr.y0 - 1 || ty > vr.y1 + 1) continue;
    if (hiddenB(tx, ty)) continue;
    let g = R3.structMeshes.get(s); if (!g) { g = mkStruct(s.type, s); R3.scene.add(g); R3.structMeshes.set(s, g); }
    seen.add(s); const gy = r3ground(s.x, s.y);
    g.position.set(s.x / TS, gy, s.y / TS);
    let k = 1; if (s.age < 1) { const t = s.age, kk = 1.9; k = Math.max(.2, 1 + (kk + 1) * Math.pow(t - 1, 3) + kk * Math.pow(t - 1, 2)); } if (s.flash > 0) k *= 1.06; g.scale.setScalar(k);
    if (s.type === 'turret' && g.userData.gun) g.userData.gun.rotation.y = -s.ang;
    if (s.type === 'campfire') r3fire(s.x / TS, gy, s.y / TS, time, 1, tx);
    if (s.type === 'lamp' && G.dark > .2) R3.lightSrc.push({ x: s.x / TS, y: gy + 1.7, z: s.y / TS, c: '#ffe0a0', k: 1.1, r: 12, d: (s.x / TS - R3.tx) ** 2 + (s.y / TS - R3.tz) ** 2 });
    if (s.type === 'plot') {
      if (!g.userData.crop) { g.userData.crop = new THREE.Group(); g.add(g.userData.crop); }
      const st = s.plant | 0; if (g.userData.cropKey !== st) { g.userData.cropKey = st; const cg = g.userData.crop; while (cg.children.length) cg.remove(cg.children[0]); if (st) for (let i = 0; i < 9; i++) { const x = -.3 + (i % 3) * .3, z = -.3 + Math.floor(i / 3) * .3; cg.add(bmesh(GEO().cone, lam(st === 2 ? '#e0922a' : '#6ac04a'), x, st === 2 ? .35 : .28, z, .16, st === 2 ? .35 : .3, .16)); } }
    }
  }
  for (const [s, g] of R3.structMeshes) if (!seen.has(s)) { R3.scene.remove(g); R3.structMeshes.delete(s); }
}

// ----- effets -----
function r3effects(vr, time, dt, fr, hidden) {
  const F = R3.fx; F.n = 0; F.an = 0;
  const inR = (x, y, m) => { const tx = x / TS, ty = y / TS; return tx > vr.x0 - (m || 2) && tx < vr.x1 + (m || 2) && ty > vr.y0 - (m || 2) && ty < vr.y1 + (m || 2); };
  for (const p of G.parts) {
    if (!inR(p.x, p.y)) continue; const c = parseCol(p.col), u = 1 - p.life / p.max, gy = r3ground(p.x, p.y);
    const k = p.kind, y = gy + (k === 'shell' ? .35 - u * .3 : .25 + u * .55), sz = Math.max(.07, p.size * .04) * (k === 'smoke' ? 2 : 1);
    r3part(p.x / TS, Math.max(gy + .05, y), p.y / TS, sz, c, Math.min(1, p.life / p.max * 2.2) * c[3], false);
  }
  let nb = 0; const bm = new THREE.Matrix4(), bq = new THREE.Quaternion(), bp = new THREE.Vector3(), bs = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (const b of G.bullets) {
    if (!inR(b.x, b.y)) continue; const gy = r3ground(b.x, b.y), a = Math.atan2(b.vy, b.vx), sp = Math.hypot(b.vx, b.vy);
    if (b.flame) { for (let q = 0; q < 2; q++) r3part(b.x / TS + rnd(-.1, .1), gy + .6 + rnd(0, .3), b.y / TS + rnd(-.1, .1), .5, RGB_.fire, .6, true); R3.lightSrc.push({ x: b.x / TS, y: gy + .8, z: b.y / TS, c: '#ff9040', k: .6, r: 7, d: (b.x / TS - R3.tx) ** 2 + (b.y / TS - R3.tz) ** 2 }); continue; }
    if (nb >= 400) break; bq.setFromAxisAngle(up, -a); bp.set(b.x / TS, gy + .9, b.y / TS); bs.set(Math.min(1.1, sp / 1100 + .35), .07, .07); bm.compose(bp, bq, bs); F.bul.setMatrixAt(nb, bm);
    R3.tintC.set(b.team === 'h' ? '#ff6a40' : b.kind === 'bolt' ? '#e8d8a8' : '#fff0a0'); F.bul.setColorAt(nb, R3.tintC); nb++;
    r3part(b.x / TS, gy + .9, b.y / TS, .3, b.team === 'h' ? [1, .4, .2] : [1, .85, .4], .5, true);
  }
  F.bul.count = nb; F.bul.instanceMatrix.needsUpdate = true; if (F.bul.instanceColor) F.bul.instanceColor.needsUpdate = true;
  for (const f of G.fires) { if (!inR(f.x, f.y, 4)) continue; const gy = r3ground(f.x, f.y), n = Math.ceil(f.r / 12); for (let q = 0; q < n; q++) { const a = Math.random() * TAU, rr = Math.random() * f.r / TS; r3part(f.x / TS + Math.cos(a) * rr, gy + .2 + Math.random() * .7, f.y / TS + Math.sin(a) * rr, .5, RGB_.fire, .5 * clamp(f.life / 1.5, 0, 1), true); } R3.lightSrc.push({ x: f.x / TS, y: gy + .8, z: f.y / TS, c: '#ff9a40', k: 1.1, r: 11, d: (f.x / TS - R3.tx) ** 2 + (f.y / TS - R3.tz) ** 2 }); }
  for (const k of G.clouds) { if (!inR(k.x, k.y, 5)) continue; const gy = r3ground(k.x, k.y), col = k.kind === 'rad' ? RGB_.rad : k.kind === 'smoke' ? [.82, .84, .88] : RGB_.toxic, a = clamp(k.life / k.max * 1.6, 0, 1) * (k.kind === 'smoke' ? .34 : .16); for (let q = 0; q < 7; q++) { const ang = q * .9 + time * .15, rr = k.r / TS * (.2 + (q % 4) * .22); r3part(k.x / TS + Math.cos(ang) * rr, gy + .5 + Math.sin(time + q) * .15, k.y / TS + Math.sin(ang) * rr, k.r / TS * 1.5, col, a, false); } }
  let di = 0; for (const z of G.radZones) { if (di >= 24 || !inR(z.x, z.y, z.r / TS + 3)) continue; const d = F.disc[di++]; d.visible = true; d.position.set(z.x / TS, r3ground(z.x, z.y) + .25, z.y / TS); d.scale.setScalar(z.r / TS * .96); d.material.opacity = .15 + (.5 + Math.sin(time * 1.6) * .5) * .08; }
  for (; di < 24; di++) F.disc[di].visible = false;
  let bi = 0; for (const b of G.blasts) { if (bi >= 8 || !inR(b.x, b.y, 6)) continue; const m = F.blast[bi++], u = 1 - b.life / b.max; m.visible = true; m.position.set(b.x / TS, r3ground(b.x, b.y) + .4, b.y / TS); m.scale.setScalar(Math.max(.1, b.r / TS * (.35 + u * .65))); m.material.opacity = (1 - u) * .55; m.material.color.set(b.toxic ? '#80e040' : b.slam ? '#c8b890' : '#ff9a40'); R3.lightSrc.push({ x: b.x / TS, y: r3ground(b.x, b.y) + 1, z: b.y / TS, c: b.toxic ? '#80ff40' : '#ffa040', k: 2.2 * (1 - u), r: 16, d: 0 }); }
  for (; bi < 8; bi++) F.blast[bi].visible = false;
  const bl = []; for (const b of G.bolts) { let x = b.x / TS + (hash2(1, 2, b.seed | 0) - .5) * 3, y = 14; const z = b.y / TS, gyb = r3ground(b.x, b.y); for (let i = 1; i <= 8; i++) { const nx = x + (b.x / TS - x) * .25 + (hash2(i, 5, b.seed | 0) - .5) * 2.4, ny = 14 - i * (14 - gyb) / 8; bl.push(x, y, z, nx, ny, z); x = nx; y = ny; } }
  F.bolt.geometry.setAttribute('position', new THREE.Float32BufferAttribute(bl, 3)); F.bolt.visible = bl.length > 0;
  for (const g of G.thrown) { if (!inR(g.x, g.y)) continue; const gy = r3ground(g.x, g.y); r3part(g.x / TS, gy + .3 + (g.z || 0) / TS, g.y / TS, .35, g.state === 'flare' ? (g.k === 'glow' ? [.3, 1, .5] : [1, .3, .3]) : [.3, .4, .25], 1, false); if (g.state === 'flare' || g.k === 'flare') { r3part(g.x / TS, gy + .5, g.y / TS, 1.6, g.k === 'glow' ? [.3, 1, .5] : [1, .3, .3], .5, true); R3.lightSrc.push({ x: g.x / TS, y: gy + 1, z: g.y / TS, c: g.k === 'glow' ? '#40ff80' : '#ff4040', k: 1.6, r: 15, d: (g.x / TS - R3.tx) ** 2 + (g.y / TS - R3.tz) ** 2 }); } }
  for (const m of G.mines) if (inR(m.x, m.y)) { const gy = r3ground(m.x, m.y); r3part(m.x / TS, gy + .1, m.y / TS, .4, [.2, .2, .22], 1, false); r3part(m.x / TS, gy + .2, m.y / TS, .2, m.arm > 0 ? [1, .8, 0] : (Math.sin(time * 8) > 0 ? [1, .2, .2] : [.4, 0, 0]), .9, true); }
  let np = 0; for (const p of G.pickups) { if (!inR(p.x, p.y) || np >= 200) continue; const gy = r3ground(p.x, p.y), by = Math.sin(time * 4 + p.x) * .06; R3.q.setFromAxisAngle(R3.vec.set(0, 1, 0), time * 1.5 + p.x); R3.p.set(p.x / TS, gy + .42 + by, p.y / TS); R3.s.set(.34, .34, .34); R3.m4.compose(R3.p, R3.q, R3.s); F.pick.setMatrixAt(np++, R3.m4); r3part(p.x / TS, gy + .45 + by, p.y / TS, .8, RGB_.glow, .22, true); }
  F.pick.count = np; F.pick.instanceMatrix.needsUpdate = true;
  for (const p of G.pois) {
    if (!p.flag || p.hidden || !p.def.claim) continue; const fx = p.flag.x, fy = p.flag.y; let e = F.pois.get(p);
    if (!inR(fx, fy, 3)) { if (e) e.visible = false; continue; }
    if (!e) { e = new THREE.Group(); e.add(bmesh(GEO().cyl, lam('#3a3a40'), 0, .9, 0, .07, 1.8, .07)); const cl = new THREE.Mesh(new THREE.PlaneGeometry(.9, .55), new THREE.MeshLambertMaterial({ color: '#8a2a2a', side: THREE.DoubleSide })); cl.position.set(.45, 1.5, 0); cl.castShadow = true; e.add(cl); e.userData.cloth = cl; R3.scene.add(e); F.pois.set(p, e); }
    e.visible = true; e.position.set(fx / TS, r3ground(fx, fy), fy / TS); const cl = e.userData.cloth; cl.material.color.set(p.owned ? '#3a9a4a' : (p.cleared ? '#d0d0d0' : '#8a2a2a')); cl.rotation.y = Math.sin(time * 3 + fx) * .35; cl.rotation.z = Math.sin(time * 4 + fx) * .08;
  }
  r3banners(time, inR);
  if (!F.dec) { const gd = new THREE.CircleGeometry(1, 10); gd.rotateX(-Math.PI / 2); F.dec = new THREE.InstancedMesh(gd, new THREE.MeshBasicMaterial({ transparent: true, opacity: .62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), 500); F.dec.count = 0; F.dec.frustumCulled = false; F.dec.renderOrder = 1; R3.scene.add(F.dec); }
  let nd = 0; for (const d of G.decals) { if (nd >= 500 || !inR(d.x, d.y)) continue; const gy = r3ground(d.x, d.y) + .04; R3.q.setFromAxisAngle(R3.vec.set(0, 1, 0), -(d.ang || 0)); R3.p.set(d.x / TS, gy, d.y / TS); const r = d.r / TS; R3.s.set(r * (d.corpse ? 1.2 : 1), 1, r * (d.corpse ? .6 : 1)); R3.m4.compose(R3.p, R3.q, R3.s); F.dec.setMatrixAt(nd, R3.m4); R3.tintC.set(d.corpse ? (d.human ? '#3a3a40' : '#3a4a32') : d.col); F.dec.setColorAt(nd, R3.tintC); nd++; }
  F.dec.count = nd; F.dec.instanceMatrix.needsUpdate = true; if (F.dec.instanceColor) F.dec.instanceColor.needsUpdate = true;
  r3ghost(time);
  F.pg.attributes.position.needsUpdate = F.pg.attributes.color.needsUpdate = F.pg.attributes.size.needsUpdate = true; F.pg.setDrawRange(0, F.n);
  F.ag.attributes.position.needsUpdate = F.ag.attributes.color.needsUpdate = F.ag.attributes.size.needsUpdate = true; F.ag.setDrawRange(0, F.an);
}
function r3ghost(time) {
  const F = R3.fx; if (!G.buildMode || !G.buildType) { if (F.ghost) F.ghost.visible = false; F.tile.visible = false; return; }
  const tx = Math.floor(G.mouse.x / TS), ty = Math.floor(G.mouse.y / TS), err = checkPlace(G.buildType, tx, ty); G.buildErr = err;
  if (!F.ghost || F.ghostType !== G.buildType) { if (F.ghost) R3.scene.remove(F.ghost); F.ghost = mkStruct(G.buildType); F.ghost.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .62; o.castShadow = false; } }); F.ghostType = G.buildType; R3.scene.add(F.ghost); }
  const gy = r3ground(tx * TS + 16, ty * TS + 16); F.ghost.visible = true; F.ghost.position.set(tx + .5, gy + .05 + Math.sin(time * 4) * .03, ty + .5);
  F.ghost.traverse(o => { if (o.isMesh && o.material.emissive) o.material.emissive.set(err ? '#ff2a20' : '#20ff50').multiplyScalar(.45); });
  F.tile.visible = true; F.tile.position.set(tx + .5, gy + .06, ty + .5); F.tile.material.color.set(err ? '#ff5a50' : '#60ff80'); F.tile.material.opacity = .28 + (.5 + Math.sin(time * 6) * .5) * .14;
}

// ----- surcouche 2D -----
function r3overlay(c, time, vr) {
  c.textAlign = 'center';
  const near = (x, y) => { const tx = x / TS, ty = y / TS; return tx > vr.x0 && tx < vr.x1 && ty > vr.y0 && ty < vr.y1; };
  const bar = (x, y, h, u, w) => { const s = r3proj(x, y, h); if (!s) return; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(s[0] - w / 2, s[1], w, 4); c.fillStyle = u > .4 ? '#c44' : '#e22'; c.fillRect(s[0] - w / 2 + 1, s[1] + 1, (w - 2) * clamp(u, 0, 1), 2); };
  const label = (s, txt, col, font) => { c.font = font; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(txt, s[0], s[1]); c.fillStyle = col; c.fillText(txt, s[0], s[1]); };
  for (const m of G.mobs) {
    if (m.dead || !near(m.x, m.y)) continue; const e = R3.ents.get(m); if (!e || e.seen !== R3.frame) continue; const hh = (m.r / 11) * 1.25 + .2;
    if (m.hp < m.maxhp * .999) bar(m.x, m.y, hh, m.hp / m.maxhp, Math.max(20, m.r * 2));
    if (m.name && dist(m.x, m.y, P.x, P.y) < 500) { const s = r3proj(m.x, m.y, hh + .3); if (s) label([s[0], s[1] - 4], '☠ ' + m.name, '#ff9a8a', 'bold 11px sans-serif'); }
    if (m.def.tame && dist(m.x, m.y, P.x, P.y) < 110) { const s = r3proj(m.x, m.y, hh + .2); if (s) label([s[0], s[1] - 4], m.def.n + ' 🐾', '#bff5c4', '11px sans-serif'); }
    if (m.stun > 0) { const s = r3proj(m.x, m.y, hh + .4); if (s) { c.font = '14px sans-serif'; c.fillText('💫', s[0], s[1]); } }
  }
  for (const f of G.friends) if (!f.dead && near(f.x, f.y)) { if (f.hp < f.maxhp * .999) bar(f.x, f.y, 1.2, f.hp / f.maxhp, 22); const s = r3proj(f.x, f.y, 1.5); if (s && dist(f.x, f.y, P.x, P.y) < 160) label(s, f.name || '', '#bff5c4', '10px sans-serif'); }
  for (const n of G.npcs) if (near(n.x, n.y) && dist(n.x, n.y, P.x, P.y) < 260) { const s = r3proj(n.x, n.y, 1.5); if (s) label(s, n.name, '#ffe9a0', 'bold 11px sans-serif'); }
  for (const v of G.vehicles) if (near(v.x, v.y) && v.hp < v.maxhp * .999 && P.veh !== v) bar(v.x, v.y, 1.4, v.hp / v.maxhp, 30);
  for (const p of G.pickups) { if (!near(p.x, p.y)) continue; const s = r3proj(p.x, p.y, .95 + Math.sin(time * 4 + p.x) * .06); if (!s) continue; const ic = p.gear ? (p.gear.kind === 'w' ? WEAPONS[p.gear.id].i : p.gear.kind === 'a' ? ARMOR[p.gear.id].i : ITEMS[p.gear.id].i) : ITEMS[p.id].i; c.font = '16px sans-serif'; c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(ic, s[0], s[1]); c.textBaseline = 'alphabetic'; }
  for (const o of G.pois) if (o.flag && !o.hidden && o.def.claim && near(o.flag.x, o.flag.y)) {
    if (o.owned) { const s = r3proj(o.flag.x, o.flag.y, 2.05); if (s) { const u = clamp(o.hpFlag / BASE_LEVELS[o.lvl].hp, 0, 1); c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(s[0] - 18, s[1], 36, 4); c.fillStyle = u > .4 ? '#6c6' : '#e55'; c.fillRect(s[0] - 17, s[1] + 1, 34 * u, 2); } }
    else if (o.cleared && dist(o.flag.x, o.flag.y, P.x, P.y) < 300) { const s = r3proj(o.flag.x, o.flag.y, 2.1); if (s) { c.fillStyle = 'rgba(120,255,160,.9)'; c.font = 'bold 11px sans-serif'; c.fillText('Libre', s[0], s[1]); } }
  }
  // étiquettes des lieux (fonction + faction) : on comprend ce qu'est chaque bâtiment
  { const cand = []; for (const o of G.pois) { if (o.hidden) continue; const bx = o.b ? (o.b.x + o.b.w / 2) * TS : o.cx, by = o.b ? (o.b.y + o.b.h / 2) * TS : o.cy; const d = dist(bx, by, P.x, P.y), small = o.type === 'house' || o.type === 'cabin'; if (d > (small ? 480 : 1300) || !near(bx, by)) continue; if (!o.discovered && d > 380) continue; cand.push([d, o, bx, by]); }
    cand.sort((a, b) => a[0] - b[0]); const drawn = [];
    for (const [d, o, bx, by] of cand) {
      if (drawn.length >= 9) break; const hh = o.b ? WALL_H + 2.6 : 3.4, s = r3proj(bx, by, hh); if (!s) continue;
      const fr_ = { camp: 'Chacals', legion: 'Légion', village: 'Fort', nomads: 'Nomades', hive: 'Infectés', crash: '', prison: '' }[o.type], hostile = o.type === 'camp' || o.type === 'legion' || o.type === 'hive', friendly = o.type === 'village' || o.type === 'nomads';
      const state = o.owned ? ' ✔' : (o.cleared && o.def.claim ? ' 🚩' : ''), txt = (o.def.icon || '') + ' ' + (o.def.n || o.name) + state;
      c.font = 'bold 12px sans-serif'; const w = c.measureText(txt).width + 16, x = s[0] - w / 2, y = s[1] - 10; if (drawn.some(r => x < r[0] + r[2] && x + w > r[0] && y < r[1] + 20 && y + 20 > r[1])) continue; drawn.push([x, y, w]);
      c.globalAlpha = clamp(1.4 - d / 1000, .45, 1); c.fillStyle = hostile ? 'rgba(90,16,16,.78)' : friendly || o.owned ? 'rgba(16,70,36,.78)' : 'rgba(10,14,20,.72)'; rrect(c, x, y, w, 20, 8); c.fill(); c.strokeStyle = hostile ? '#ff7a6a' : friendly || o.owned ? '#7aff9a' : 'rgba(255,255,255,.28)'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, s[0], y + 11); if (fr_) { c.font = 'bold 9px sans-serif'; c.fillStyle = hostile ? '#ffb0a0' : '#b8ffc8'; c.fillText(fr_, s[0], y + 28); } c.textBaseline = 'alphabetic'; c.globalAlpha = 1;
    } c.textAlign = 'center'; }
  const tg = typeof tutTarget === 'function' ? tutTarget() : null; if (tg) { const s = r3proj(tg.x, tg.y, 1.6 + Math.sin(time * 5) * .12); if (s) { c.save(); c.translate(s[0], s[1]); c.fillStyle = '#ffd24a'; c.strokeStyle = '#000'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 14); c.lineTo(-11, -2); c.lineTo(-4, -2); c.lineTo(-4, -12); c.lineTo(4, -12); c.lineTo(4, -2); c.lineTo(11, -2); c.closePath(); c.stroke(); c.fill(); c.restore(); } }
  for (const t of G.texts) { const s = r3proj(t.x, t.y, 1.4); if (!s) continue; c.globalAlpha = clamp(t.life * 2, 0, 1); label(s, t.txt, t.col, (t.big ? 'bold 18px' : 'bold 12px') + ' sans-serif'); }
  c.globalAlpha = 1;
}

// ----- bannières des factions : repérables de loin -----
const _bt = {};
function bannerTex(kind) {
  if (_bt[kind]) return _bt[kind]; const spec = { camp: ['#6a1410', '#e8d0b0', '☠️'], legion: ['#15151c', '#c01a40', '⚔️'], village: ['#1f6a3a', '#f0e8c8', '🏘️'], nomads: ['#a8602a', '#f4e0b0', '⛺'] }[kind];
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 144; const c = cv.getContext('2d'); c.fillStyle = spec[0]; c.fillRect(0, 0, 96, 144); c.strokeStyle = spec[1]; c.lineWidth = 6; c.strokeRect(5, 5, 86, 134);
  c.beginPath(); c.moveTo(0, 144); c.lineTo(48, 118); c.lineTo(96, 144); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill();
  c.font = '54px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(spec[2], 48, 62);
  const t = new THREE.CanvasTexture(cv); return _bt[kind] = t;
}
function r3banners(time, inR) {
  const F = R3.fx; F.ban = F.ban || new Map();
  for (const p of G.pois) {
    const kind = p.type === 'camp' ? 'camp' : p.type === 'legion' ? 'legion' : p.type === 'village' ? 'village' : p.type === 'nomads' ? 'nomads' : null; if (!kind) continue;
    let arr = F.ban.get(p); const vis = inR(p.cx, p.cy, 14);
    if (!vis) { if (arr) arr.forEach(g => g.visible = false); continue; }
    if (!arr) {
      arr = []; const pts = kind === 'village' ? [[p.front.x - 1.5, p.front.y - 2.2], [p.front.x - 1.5, p.front.y + 3.4], [p.x + 3, p.y + 1], [p.x + p.w - 4, p.y + 1]] : kind === 'nomads' ? [[p.x + 1.2, p.y + 1.2], [p.x + p.w - 2.2, p.y + 1.2], [p.x + p.w / 2, p.y + p.h - 1.5]] : [[p.x + 1.5, p.y + 1.5], [p.x + p.w - 2.5, p.y + 1.5], [p.x + 1.5, p.y + p.h - 2.5], [p.x + p.w - 2.5, p.y + p.h - 2.5]];
      for (const [tx, ty] of pts) { const g = new THREE.Group(); g.add(bmesh(GEO().cyl, lam('#2a2a30'), 0, 1.8, 0, .1, 3.6, .1)); g.add(bmesh(GEO().sph, lam('#e8c050'), 0, 3.65, 0, .22, .22, .22)); const cl = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), new THREE.MeshLambertMaterial({ map: bannerTex(kind), side: THREE.DoubleSide, emissive: '#222222' })); cl.position.set(.55, 2.7, 0); cl.castShadow = true; g.add(cl); g.userData.cloth = cl; g.userData.pos = [tx + .5, ty + .5]; R3.scene.add(g); arr.push(g); }
      F.ban.set(p, arr);
    }
    arr.forEach((g, i) => { g.visible = true; const [tx, ty] = g.userData.pos; g.position.set(tx, r3ground(tx * TS, ty * TS), ty); g.userData.cloth.rotation.y = Math.sin(time * 2.2 + i * 1.7) * .22; });
  }
}

// ----- résolution : automatique (médiane glissante, hystérésis) ou fixe (Options) -----
function r3resMax() { return Math.min(window.devicePixelRatio || 1, SET.quality > 0 ? 1.5 : 1); }
function r3setRes(r) { r = clamp(r, .4, 2); if (Math.abs(r - (R3.res || 0)) < .005) return; R3.res = r; R3.renderer.setPixelRatio(r); R3.renderer.setSize(VW, VH, false); }
function r3adapt(time, fr) {
  const max = r3resMax(), fixed = +SET.res3d || 0;
  if (R3.res === undefined) { R3.res = max; R3.hist = []; R3.lastChange = time * 1000; R3.capUp = max; R3.capUntil = 0; R3.calm = 0; }
  if (fixed > 0) { r3setRes(Math.min(fixed, 2)); R3.hist.length = 0; return; }
  const delta = R3.prevT ? (time - R3.prevT) * 1000 : 16.7; R3.prevT = time;
  if (delta > 0 && delta < 120 && !R3.stats.built && fr > 60 && !G.paused && !document.hidden) { R3.hist.push(delta); if (R3.hist.length > 120) R3.hist.shift(); }
  if (window.__noAdapt) { r3setRes(Math.min(R3.res, max)); return; }
  if (fr % 30 || R3.hist.length < 90) return;
  const sorted = R3.hist.slice().sort((a, b) => a - b), p75 = sorted[Math.floor(sorted.length * .75)], p20 = sorted[Math.floor(sorted.length * .2)];
  if (!R3.base) R3.base = 16.7; // on suppose un écran 60 Hz ; on s'ajuste aux écrans plus rapides, ou plus lents si même au minimum de définition on reste calé sur ~30 Hz
  if (p20 < R3.base - 2) R3.base = Math.max(6.5, p20); else if (R3.res <= .55 && p20 > 28 && p75 < p20 * 1.15) R3.base = Math.min(p20, 40);
  const now = time * 1000, since = now - R3.lastChange;
  if (p75 > R3.base * 1.3 + 1.5 && R3.res > .5 && since > 1500) { // la machine peine : on réduit proportionnellement
    const k = clamp((R3.base * 1.2) / p75, .72, .92); R3.capUp = R3.res; R3.capUntil = now + 40000; r3setRes(Math.max(.5, R3.res * k)); R3.lastChange = now; R3.hist.length = 0; R3.calm = 0;
  } else if (p75 < R3.base * 1.1 + 1) { // large marge : on remonte doucement, sans dépasser le niveau qui avait posé problème
    R3.calm += 30; const lim = now < R3.capUntil ? Math.min(max, R3.capUp * .98) : max;
    if (R3.calm >= 240 && since > 6000 && R3.res < lim - .01) { r3setRes(Math.min(lim, R3.res + .1)); R3.lastChange = now; R3.hist.length = 0; R3.calm = 0; }
  } else R3.calm = 0;
}

// tenue du joueur en 3D : couleur du torse, casque, sac, visière de vision nocturne
function r3playerGear(pg) {
  const u = pg.userData, a = P.armor, key = ['head', 'body', 'hands', 'back'].map(s => a[s] ? a[s].id : '').join('|');
  if (u.gk === key) return; u.gk = key; for (const m of u.gearMeshes || []) u.inner.remove(m); u.gearMeshes = []; const g = GEO(), add = m => { u.inner.add(m); u.gearMeshes.push(m); };
  u.bodyMat.color.set(a.body && ARMOR[a.body.id].col ? ARMOR[a.body.id].col : '#3a6ab0');
  if (a.head) { const A_ = ARMOR[a.head.id], c = A_.col || '#666'; add(bmesh(g.sph, lam(c), 0, 1.04, 0, .42, .32, .42)); if (A_.nvg) add(bmesh(g.box, lam('#6aff8a', { emissive: '#2aa84a' }), .17, 1.0, 0, .1, .1, .36)); }
  if (a.back) { const c = ARMOR[a.back.id].col || '#6a5a3a'; add(bmesh(g.box, lam(c), -.27, .64, 0, .2, .42, .36)); add(bmesh(g.box, lam(m3Hex(c, '#000000', .3)), -.27, .86, 0, .22, .06, .38)); }
  if (a.hands) { const c = ARMOR[a.hands.id].col || '#444'; for (const s of [-1, 1]) add(bmesh(g.box, lam(c), .02, .78 - .46, s * .3, .15, .13, .15)); }
}
