'use strict';
// ===== Rendu 3D low-poly (three.js, chargé à la demande) =====
// Vue toujours du dessus (caméra en plongée), relief, bâtiments en volume, ombres, éclairage jour/nuit.
// Optimisations : seuls les chunks visibles sont générés (flux + libération), les objets sont instanciés
// uniquement dans la zone visible, et ce qui se trouve sous un toit fermé n'est pas dessiné (occlusion).
const R3 = { ready: false, loading: false, G: null, stats: {} };
const WALL_H = 1.3;
function use3D() { return !!(SET.mode3d && R3.ready && G && typeof running !== 'undefined' && running); }

function ensure3D(cb) {
  if (R3.ready) { if (cb) cb(); return; }
  if (R3.loading) { R3.cbs.push(cb); return; }
  R3.loading = true; R3.cbs = [cb];
  const s = document.createElement('script'); s.src = 'lib/three.min.js';
  s.onload = () => {
    try { r3init(); R3.ready = true; }
    catch (e) { console.error(e); SET.mode3d = false; saveSettings(); if (G) msg('Mode 3D indisponible sur cet appareil.', '#ff9a8a'); }
    R3.loading = false; for (const f of R3.cbs) if (f) f();
  };
  s.onerror = () => { R3.loading = false; SET.mode3d = false; saveSettings(); if (G) msg('Impossible de charger le moteur 3D (lib/three.min.js).', '#ff9a8a'); };
  document.head.appendChild(s);
}
function setMode3D(on) {
  SET.mode3d = !!on; saveSettings();
  if (on) ensure3D(() => { if (G) msg('🧊 Mode 3D low-poly activé (F3 pour revenir en 2D).', '#9fe8ff'); });
  else if (G) msg('Mode 2D activé.', '#cfe8ff');
  if (R3.canvas) R3.canvas.style.display = on && R3.ready ? 'block' : 'none';
}

// ---------- utilitaires ----------
const _cc = {};
function C3(h) { return _cc[h] || (_cc[h] = new THREE.Color(h)); }
function m3Hex(a, b, t) { const A = C3(a), B = C3(b); return '#' + new THREE.Color(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t).getHexString(); }
const _pc = {};
function parseCol(s) {
  if (_pc[s]) return _pc[s]; let r = 1, g = 1, b = 1, a = 1;
  if (s[0] === '#') { const c = C3(s); r = c.r; g = c.g; b = c.b; }
  else { const m = /rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[, /]+([\d.]+))?/.exec(s); if (m) { r = m[1] / 255; g = m[2] / 255; b = m[3] / 255; a = m[4] === undefined ? 1 : +m[4]; } }
  return _pc[s] = [r, g, b, a];
}

// ---------- hauteur du terrain ----------
function r3flat(tx, ty) {
  if (!inb(tx, ty)) return 1; const i = IDX(tx, ty), t = G.tiles[i];
  if (G.reserve[i] || G.fp[i] || t === T.ROAD || t === T.FLOOR || t === T.CONC || t === T.TILE || t === T.WALLT || t === T.PALI || t === T.FLESH || G.solid[i] === SO.WALL) return 1;
  return 0;
}
function r3vh(vx, vy) { // hauteur du sommet (entre les 4 tuiles (vx-1..vx, vy-1..vy))
  const W1 = G.W + 1; if (vx < 0 || vy < 0 || vx > G.W || vy > G.H) return 0;
  const k = vy * W1 + vx, c = R3.vh[k]; if (c !== c) { // NaN → à calculer
    let fl = 0, wat = 0;
    for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) { const tx = vx + dx, ty = vy + dy; if (r3flat(tx, ty)) fl = 1; if (inb(tx, ty) && G.tiles[IDX(tx, ty)] === T.WATER) wat++; }
    const sx = G.spawn.x / TS, sy = G.spawn.y / TS, dsp = Math.hypot(vx - sx, vy - sy);
    let h = (vnoise(vx / 17, vy / 17, G.seed + 101) - .5) * 5.2 + (vnoise(vx / 6.5, vy / 6.5, G.seed + 102) - .5) * 1.0;
    h = Math.max(h, -.25); if (fl || dsp < 7) h = 0; else if (dsp < 14) h *= (dsp - 7) / 7;
    if (wat) h = h * (1 - wat / 4) - .45 * (wat / 4) - (wat === 4 ? .15 : 0);
    R3.vh[k] = h; return h;
  }
  return c;
}
function r3ground(x, y) { // x,y en pixels monde → altitude en unités
  const gx = x / TS, gy = y / TS, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
  const h00 = r3vh(ix, iy), h10 = r3vh(ix + 1, iy), h01 = r3vh(ix, iy + 1), h11 = r3vh(ix + 1, iy + 1);
  return fx >= fy ? h00 + (h10 - h00) * fx + (h11 - h10) * fy : h00 + (h11 - h01) * fx + (h01 - h00) * fy;
}
function r3reset() {
  R3.G = G; R3.vh = new Float32Array((G.W + 1) * (G.H + 1)).fill(NaN);
  R3.bidx = new Int16Array(G.W * G.H).fill(-1);
  G.buildings.forEach((b, n) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (inb(x, y)) R3.bidx[IDX(x, y)] = n; });
  R3.bpoi = new Array(G.buildings.length).fill(null); // bâtiment → lieu (pour reconnaître sa fonction)
  G.buildings.forEach((b, n) => { const cx = b.x + b.w / 2, cy = b.y + b.h / 2; for (const p of G.pois) if (cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h && p.type !== 'village') { R3.bpoi[n] = p; break; } if (!R3.bpoi[n]) for (const p of G.pois) if (p.type === 'village' && cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h) { R3.bpoi[n] = p; break; } });
  R3.doorMap = new Map(); R3.doorsByChunk = new Map(); // entrées : tuiles de porte ('in') et paillasson ('out')
  G.buildings.forEach((b, n) => (b.doors || []).forEach(d => {
    const horiz = d.s < 2; for (let k = 0; k < 2; k++) { const ix = horiz ? d.x + k : d.x, iy = horiz ? d.y : d.y + k, ox = horiz ? d.fx + k : d.fx, oy = horiz ? d.fy : d.fy + k; if (inb(ix, iy)) R3.doorMap.set(IDX(ix, iy), 'in'); if (inb(ox, oy)) R3.doorMap.set(IDX(ox, oy), 'out'); }
    const ck = Math.floor(d.y / 16) * 1000 + Math.floor(d.x / 16); (R3.doorsByChunk.get(ck) || R3.doorsByChunk.set(ck, []).get(ck)).push([n, d]);
  }));
  for (const ch of R3.chunks.values()) r3freeChunk(ch); R3.chunks.clear();
  for (const m of R3.roofs.values()) r3freeRoof(m); R3.roofs.clear();
  for (const e of R3.ents.values()) r3dropEnt(e); R3.ents.clear();
  for (const e of R3.structMeshes.values()) { R3.scene.remove(e); } R3.structMeshes.clear();
}

// ---------- géométrie : primitives fusionnées avec couleurs de sommets ----------
function mergeParts(parts) {
  const pos = [], col = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), v = new THREE.Vector3();
  for (const pt of parts) {
    const g = pt.g.index ? pt.g.toNonIndexed() : pt.g.clone(); e.set(pt.rx || 0, pt.ry || 0, pt.rz || 0); q.setFromEuler(e); p.set(pt.x || 0, pt.y || 0, pt.z || 0); s.set(pt.sx || 1, pt.sy || 1, pt.sz || 1); m.compose(p, q, s);
    const c = C3(pt.c), a = g.attributes.position;
    for (let i = 0; i < a.count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(m); pos.push(v.x, v.y, v.z); const j = 1 + ((i * 7 + pt.x * 3) % 5) * .012; col.push(c.r * j, c.g * j, c.b * j); }
    g.dispose();
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals(); return geo;
}
let _G = null;
function GEO() {
  if (_G) return _G;
  return _G = { box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(.5, .5, 1, 6), cyl8: new THREE.CylinderGeometry(.5, .5, 1, 10), cone: new THREE.ConeGeometry(.5, 1, 6), pyr: new THREE.ConeGeometry(.7, 1, 4), ico: new THREE.IcosahedronGeometry(.5, 0), sph: new THREE.SphereGeometry(.5, 7, 5), dode: new THREE.DodecahedronGeometry(.5, 0), oct: new THREE.OctahedronGeometry(.5, 0) };
}
const P_ = (g, c, x, y, z, sx, sy, sz, rx, ry, rz) => ({ g, c, x, y, z, sx, sy, sz, rx, ry, rz });

// ---------- initialisation ----------
function r3init() {
  const cv = document.createElement('canvas'); cv.id = 'gl'; cv.style.cssText = 'position:fixed;inset:0;display:block;z-index:0;'; document.body.insertBefore(cv, $('game'));
  R3.canvas = cv;
  const rd = R3.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: SET.quality > 0, powerPreference: 'high-performance' });
  rd.setPixelRatio(Math.min(window.devicePixelRatio || 1, SET.quality > 0 ? 1.5 : 1)); rd.setSize(VW, VH, false);
  rd.shadowMap.enabled = SET.quality > 0; rd.shadowMap.type = THREE.PCFSoftShadowMap;
  const sc = R3.scene = new THREE.Scene(); sc.fog = new THREE.Fog('#9ec8e8', 46, 96); sc.background = new THREE.Color('#9ec8e8');
  const cam = R3.cam = new THREE.PerspectiveCamera(32, VW / VH, 6, 160);
  R3.hemi = new THREE.HemisphereLight('#dfeaff', '#6a6040', .62); sc.add(R3.hemi);
  const sun = R3.sun = new THREE.DirectionalLight('#fff2d8', .95); sun.castShadow = SET.quality > 0;
  sun.shadow.mapSize.set(2048, 2048); const sh = sun.shadow.camera; sh.left = -30; sh.right = 30; sh.top = 30; sh.bottom = -30; sh.near = 1; sh.far = 120; sh.updateProjectionMatrix(); sun.shadow.bias = -.0007; sun.shadow.normalBias = .03;
  sc.add(sun); sc.add(sun.target);
  R3.pl = []; for (let i = 0; i < 6; i++) { const l = new THREE.PointLight('#ffb060', 0, 11, 1.6); sc.add(l); R3.pl.push(l); }
  R3.spot = new THREE.SpotLight('#fff4dc', 0, 26, .5, .55, 1.2); sc.add(R3.spot); sc.add(R3.spot.target);
  R3.pLight = new THREE.PointLight('#ffd9a0', 0, 8, 1.8); sc.add(R3.pLight);
  R3.chunks = new Map(); R3.roofs = new Map(); R3.ents = new Map(); R3.structMeshes = new Map(); R3.fx = {};
  R3.mats = {
    terrain: new THREE.MeshLambertMaterial({ vertexColors: true }),
    water: new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: .78 }),
    inst: new THREE.MeshLambertMaterial({ vertexColors: true }),
    basic: new THREE.MeshBasicMaterial({ vertexColors: true }),
    win: new THREE.MeshBasicMaterial({ vertexColors: true }),
  };
  r3prefabs(); r3fxInit();
  R3.vec = new THREE.Vector3(); R3.ray = new THREE.Raycaster(); R3.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); R3.m4 = new THREE.Matrix4(); R3.q = new THREE.Quaternion(); R3.e = new THREE.Euler(); R3.s = new THREE.Vector3(); R3.p = new THREE.Vector3();
  R3.camPos = { x: 0, y: 0, z: 0 }; R3.camInit = false;
  if (!SET.mode3d) cv.style.display = 'none';
}
function r3resize() { if (!R3.ready) return; R3.renderer.setPixelRatio(R3.res || r3resMax()); R3.renderer.setSize(VW, VH, false); R3.cam.aspect = VW / VH; R3.cam.updateProjectionMatrix(); }

// ---------- préfabriqués d'objets (instanciés) ----------
function r3prefabs() {
  const g = GEO(), F = R3.pre = {};
  const tree = (kind, v) => {
    const parts = [];
    if (kind === 'pine') { parts.push(P_(g.cyl, '#5a3c22', 0, .3, 0, .16, .6, .16)); const gc = ['#2f5a34', '#356638', '#2a5030', '#3c6c3c']; for (let i = 0; i < 4; i++) parts.push(P_(g.cone, gc[(i + v) % 4], 0, .75 + i * .42, 0, 1.15 - i * .24, .7, 1.15 - i * .24, 0, i * .7, 0)); }
    else if (kind === 'oak') { const gc = [['#4a8a3a', '#5a9a44'], ['#7a8a2a', '#8a9a34'], ['#c0702a', '#d08a34'], ['#3f7a38', '#4f8a40']][v % 4]; parts.push(P_(g.cyl, '#5a3c22', 0, .4, 0, .2, .8, .2)); parts.push(P_(g.ico, gc[0], 0, 1.25, 0, 1.4, 1.2, 1.4, .3, .5, 0)); parts.push(P_(g.ico, gc[1], .22, 1.7, .1, 1, .9, 1, .2, 1, 0)); parts.push(P_(g.ico, gc[0], -.28, 1.45, -.2, .8, .7, .8)); }
    else if (kind === 'birch') { parts.push(P_(g.cyl, '#e6e2d6', 0, .55, 0, .14, 1.1, .14)); parts.push(P_(g.ico, '#7ab04a', 0, 1.3, 0, .95, 1.05, .95, .3, .5, 0)); parts.push(P_(g.ico, '#8ac058', .12, 1.65, -.05, .6, .6, .6)); }
    else if (kind === 'palm') { parts.push(P_(g.cyl, '#8a6a3c', .1, .8, 0, .15, 1.6, .15, 0, 0, -.12)); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; parts.push(P_(g.box, i % 2 ? '#4a9a3a' : '#3a8a30', .2 + Math.cos(a) * .42, 1.62 - .05, Math.sin(a) * .42, .8, .05, .3, 0, -a, .45)); } }
    else if (kind === 'dead') { parts.push(P_(g.cyl, '#4a3c30', 0, .7, 0, .14, 1.4, .14)); parts.push(P_(g.cyl, '#4a3c30', .25, 1.1, 0, .06, .7, .06, 0, 0, -.9)); parts.push(P_(g.cyl, '#4a3c30', -.2, 1.3, .05, .06, .6, .06, 0, 0, .8)); }
    else parts.push(P_(g.cyl, '#6a4a2a', 0, .15, 0, .4, .3, .4));
    return mergeParts(parts);
  };
  for (const [k, n] of [['pine', 4], ['oak', 4], ['birch', 3], ['palm', 2], ['dead', 3]]) for (let v = 0; v < n; v++) F[k + v] = tree(k, v);
  F.stump = tree('stump', 0);
  F.rock = mergeParts([P_(g.dode, '#8a8c94', 0, .22, 0, 1.0, .65, .85, .2, .4, 0), P_(g.dode, '#9a9ca4', .3, .12, .2, .55, .4, .5, 0, 1, 0)]);
  F.rockDep = mergeParts([P_(g.dode, '#8a8c94', 0, .05, 0, .35, .12, .3)]);
  F.bush = mergeParts([P_(g.ico, '#3f7a38', 0, .28, 0, .9, .6, .9, .2, .3, 0), P_(g.ico, '#4f8a40', .2, .4, .1, .6, .5, .6), P_(g.sph, '#c02a4a', .25, .55, .3, .12, .12, .12), P_(g.sph, '#c02a4a', -.2, .45, .3, .12, .12, .12), P_(g.sph, '#b02a6a', .0, .62, -.2, .12, .12, .12)]);
  F.bushEmpty = mergeParts([P_(g.ico, '#3f7a38', 0, .28, 0, .9, .6, .9, .2, .3, 0), P_(g.ico, '#4f8a40', .2, .4, .1, .6, .5, .6)]);
  F.herb = mergeParts([P_(g.cone, '#58a840', -.1, .2, 0, .18, .45, .18), P_(g.cone, '#68b850', .1, .17, .08, .16, .38, .16), P_(g.cone, '#4a984a', 0, .22, -.1, .16, .5, .16), P_(g.sph, '#e080b0', .0, .46, -.1, .1, .1, .1)]);
  F.scrap = mergeParts([P_(g.box, '#7a7c82', 0, .12, 0, .6, .22, .45, 0, .4, 0), P_(g.box, '#8a5a3a', .15, .28, .05, .35, .18, .3, 0, 1, 0), P_(g.cyl, '#5a5c62', -.2, .3, -.1, .2, .3, .2)]);
  const wreck = (c) => mergeParts([P_(g.box, c, 0, .32, 0, 1.5, .4, .8), P_(g.box, m3Hex(c, '#101418', .45), -.1, .62, 0, .8, .3, .7), P_(g.box, '#1a1a1e', .5, .12, .38, .3, .26, .1), P_(g.box, '#1a1a1e', -.5, .12, .38, .3, .26, .1), P_(g.box, '#1a1a1e', .5, .12, -.38, .3, .26, .1), P_(g.box, '#1a1a1e', -.5, .12, -.38, .3, .26, .1)]);
  ['#8a3a2a', '#4a5a7a', '#7a7a70', '#5a6a3a'].forEach((c, i) => F['wreck' + i] = wreck(m3Hex(c, '#5a3a22', .25)));
  F.wreckDep = mergeParts([P_(g.box, '#5a5a60', 0, .05, 0, 1.2, .1, .7)]);
  F.crate = mergeParts([P_(g.box, '#a87a3a', 0, .3, 0, .7, .6, .7), P_(g.box, '#6a4a22', 0, .3, 0, .74, .1, .74), P_(g.box, '#6a4a22', 0, .3, 0, .1, .62, .74), P_(g.box, '#d8d0b8', 0, .62, 0, .5, .04, .5)]);
  F.crateOpen = mergeParts([P_(g.box, '#6a5030', 0, .2, 0, .7, .4, .7), P_(g.box, '#4a3a20', 0, .38, 0, .55, .04, .55)]);
  F.crateAir = mergeParts([P_(g.box, '#4a6a3a', 0, .32, 0, .8, .64, .8), P_(g.box, '#d0d8c0', 0, .66, 0, .5, .05, .5), P_(g.box, '#d03a2a', 0, .34, 0, .82, .1, .82)]);
  F.mast = mergeParts([P_(g.cyl, '#7a7e86', 0, 2, 0, .2, 4, .2), P_(g.box, '#6a6e76', 0, .2, 0, .8, .4, .8), P_(g.box, '#8a8e96', 0, 3.4, 0, 1.1, .08, .08), P_(g.box, '#8a8e96', 0, 2.8, 0, .08, .08, .8), P_(g.sph, '#e33', 0, 4.05, 0, .2, .2, .2)]);
  F.radbarrel = mergeParts([P_(g.cyl8, '#d8c82a', 0, .35, 0, .6, .7, .6), P_(g.cyl8, '#2a2808', 0, .71, 0, .5, .03, .5), P_(g.box, '#1a1808', 0, .36, 0, .62, .12, .62, 0, .78, 0)]);
  F.furn = [0, 1, 2].map(v => mergeParts(v === 0 ? [P_(g.box, '#7a5a3a', 0, .45, 0, .7, .9, .5), P_(g.box, '#5a3e24', 0, .45, .26, .6, .8, .04)] : v === 1 ? [P_(g.box, '#8a6a44', 0, .38, 0, .85, .08, .6), P_(g.box, '#6a4e30', -.34, .18, -.22, .08, .36, .08), P_(g.box, '#6a4e30', .34, .18, -.22, .08, .36, .08), P_(g.box, '#6a4e30', -.34, .18, .22, .08, .36, .08), P_(g.box, '#6a4e30', .34, .18, .22, .08, .36, .08)] : [P_(g.box, '#6a7a8a', 0, .25, 0, .8, .5, .6), P_(g.box, '#8a9aaa', 0, .55, -.2, .8, .3, .2)]));
  F.stairsUp = mergeParts([0, 1, 2, 3].map(i => P_(g.box, i % 2 ? '#b09a78' : '#9a8566', 0, .1 + i * .2, .36 - i * .24, .95, .2 + i * .2, .24)).concat([P_(g.box, '#ffe9a0', 0, 1.05, -.3, .5, .05, .1)]));
  F.stairsDown = mergeParts([P_(g.box, '#14110e', 0, .03, 0, .95, .06, .95), P_(g.box, '#7a6648', 0, .2, .4, .95, .06, .2), P_(g.box, '#6a5840', 0, .14, .12, .95, .06, .24), P_(g.box, '#5a4a36', 0, .08, -.16, .95, .06, .24), P_(g.box, '#3a8aff', 0, .3, .42, .5, .05, .1)]);
  F.tent = ['#b04a3a', '#4a6aa0', '#8a8a44'].map((c, i) => mergeParts([P_(g.pyr, c, 0, .6, 0, 1.45, 1.2, 1.25, 0, Math.PI / 4, 0), P_(g.box, '#2a1e16', 0, .3, .38, .3, .55, .02)]));
  F.sandbag = mergeParts([P_(g.box, '#a89870', -.2, .13, 0, .5, .25, .35), P_(g.box, '#b4a47c', .25, .13, 0, .5, .25, .35), P_(g.box, '#a89870', 0, .37, 0, .55, .25, .35)]);
  F.stall = mergeParts([P_(g.box, '#8a6a44', 0, .3, 0, .9, .6, .55), P_(g.box, '#c8402a', -.22, 1.05, 0, .45, .05, .75), P_(g.box, '#f2ecdc', .22, 1.05, 0, .45, .05, .75), P_(g.box, '#5a3e24', -.4, .6, .3, .05, .9, .05), P_(g.box, '#5a3e24', .4, .6, .3, .05, .9, .05)]);
  F.pew = [0, 1].map(() => mergeParts([P_(g.box, '#6a4426', 0, .24, 0, .9, .1, .4), P_(g.box, '#5a3820', 0, .5, -.18, .9, .5, .06), P_(g.box, '#4a2e1a', -.4, .12, 0, .08, .24, .36), P_(g.box, '#4a2e1a', .4, .12, 0, .08, .24, .36)]));
  F.altar = mergeParts([P_(g.box, '#c8c4b8', 0, .35, 0, .9, .7, .6), P_(g.box, '#8a2a2a', 0, .72, 0, .95, .04, .65), P_(g.cyl, '#f4e4b0', -.3, .88, 0, .06, .26, .06), P_(g.cyl, '#f4e4b0', .3, .88, 0, .06, .26, .06), P_(g.sph, '#ffd070', -.3, 1.06, 0, .1, .12, .1), P_(g.sph, '#ffd070', .3, 1.06, 0, .1, .12, .1)]);
  F.desk = [0, 1].map(() => mergeParts([P_(g.box, '#9a7a4a', 0, .4, 0, .75, .06, .5), P_(g.box, '#5a5a62', -.32, .2, 0, .05, .4, .46), P_(g.box, '#5a5a62', .32, .2, 0, .05, .4, .46), P_(g.box, '#d8d4c0', .1, .45, 0, .3, .02, .22)]));
  F.counter = mergeParts([P_(g.box, '#c8c4b8', 0, .4, 0, 1, .8, .55), P_(g.box, '#4a3a2a', 0, .82, 0, 1.05, .06, .62)]);
  F.labtable = mergeParts([P_(g.box, '#d4dae0', 0, .4, 0, .85, .08, .6), P_(g.box, '#8a929c', 0, .2, 0, .8, .4, .5), P_(g.cyl, '#6ae0a0', -.2, .56, 0, .1, .2, .1), P_(g.cyl, '#e08a6a', .1, .54, .1, .1, .16, .1)]);
  F.tank = mergeParts([P_(g.cyl8, '#7aa0a8', 0, .6, 0, .75, 1.2, .75), P_(g.cyl8, '#3aff8a', 0, .6, 0, .55, 1.0, .55), P_(g.cyl8, '#5a626a', 0, .05, 0, .85, .1, .85), P_(g.cyl8, '#5a626a', 0, 1.22, 0, .85, .06, .85)]);
  F.grave = [0, 1, 2].map(v => mergeParts(v === 0 ? [P_(g.box, '#9a9ca2', 0, .38, .1, .5, .76, .12), P_(g.box, '#4a5a3a', 0, .04, -.1, .5, .08, .8)] : v === 1 ? [P_(g.box, '#a8aaae', 0, .3, .1, .12, .6, .1), P_(g.box, '#a8aaae', 0, .45, .1, .4, .1, .1), P_(g.box, '#4a5a3a', 0, .04, -.1, .5, .08, .8)] : [P_(g.dode, '#8a8c92', 0, .3, .1, .55, .6, .18), P_(g.box, '#4a5a3a', 0, .04, -.1, .5, .08, .8)]));
  F.egg = mergeParts([P_(g.ico, '#e0809a', 0, .5, 0, .85, 1.0, .85, .2, .3, 0), P_(g.ico, '#7a2a50', 0, .3, 0, .6, .5, .6)]);
  F.tower = mergeParts([P_(g.box, '#6a5a48', 0, 1.2, 0, 1.0, 2.4, 1.0), P_(g.box, '#8a8a92', 0, 2.5, 0, 1.2, .2, 1.2), P_(g.box, '#5a5a62', 0, 2.85, 0, .8, .5, .8), P_(g.box, '#1a1a20', 0, 2.88, 0, .82, .1, .82), P_(g.box, '#3a3a42', 0, 3.2, 0, 1.2, .1, 1.2)]);
  F.rails = mergeParts([P_(g.box, '#4a3220', 0, .03, -.3, .9, .06, .14), P_(g.box, '#4a3220', 0, .03, .3, .9, .06, .14), P_(g.box, '#8a8e98', -.15, .08, 0, 1, .05, .06, 0, Math.PI / 2, 0), P_(g.box, '#8a8e98', .15, .08, 0, 1, .05, .06, 0, Math.PI / 2, 0)]);
  F.ore = mergeParts([P_(g.dode, '#6a7078', 0, .25, 0, .9, .6, .8), P_(g.oct, '#6ac0ff', .15, .5, .05, .3, .6, .3, .2, .5, .2), P_(g.oct, '#8ad0ff', -.2, .42, -.1, .22, .45, .22, -.2, 1, 0)]);
  F.orDep = mergeParts([P_(g.dode, '#6a7078', 0, .08, 0, .5, .16, .4)]);
  F.pylon = mergeParts([P_(g.box, '#8a929e', -.38, 2, -.38, .08, 4, .08, 0, 0, .06), P_(g.box, '#8a929e', .38, 2, -.38, .08, 4, .08, 0, 0, -.06), P_(g.box, '#8a929e', -.38, 2, .38, .08, 4, .08, 0, 0, .06), P_(g.box, '#8a929e', .38, 2, .38, .08, 4, .08, 0, 0, -.06),
    P_(g.box, '#6a727e', 0, 1.2, .38, 1.0, .05, .05, 0, 0, .5), P_(g.box, '#6a727e', 0, 2.2, .38, .9, .05, .05, 0, 0, -.5), P_(g.box, '#6a727e', 0, 3.0, 0, 1.6, .08, .08), P_(g.box, '#6a727e', 0, 3.5, 0, 1.2, .08, .08), P_(g.cyl, '#d8d8e0', -.8, 2.9, 0, .1, .2, .1), P_(g.cyl, '#d8d8e0', .8, 2.9, 0, .1, .2, .1)]);
  F.screen = mergeParts([P_(g.box, '#eef0f6', 0, 2.0, 0, 3.2, 1.9, .12), P_(g.box, '#2a2e38', 0, 2.0, 0, 3.35, 2.05, .1), P_(g.box, '#f6f8fc', 0, 2.0, .03, 3.0, 1.7, .08), P_(g.box, '#3a3e48', -1.3, .7, 0, .14, 1.4, .14), P_(g.box, '#3a3e48', 1.3, .7, 0, .14, 1.4, .14)]);
  F.plane = mergeParts([P_(g.cyl8, '#d0d4da', 0, .7, 0, 1.1, 3.4, 1.1, 0, 0, Math.PI / 2), P_(g.cone, '#c0c4ca', 1.9, .7, 0, 1.1, .9, 1.1, 0, 0, -Math.PI / 2), P_(g.box, '#b8bcc4', -.2, .6, 0, .8, .08, 4.2), P_(g.box, '#b8bcc4', -1.6, 1.1, 0, .6, .6, .08), P_(g.box, '#c03a2a', -.2, .72, 0, 3.0, .12, 1.12), P_(g.box, '#2a2e38', .9, .95, 0, .5, .15, .8), P_(g.cyl, '#3a3a40', .4, .35, 1.2, .5, .5, .5)]);
  F.flag = mergeParts([P_(g.cyl, '#3a3a40', 0, .7, 0, .06, 1.4, .06)]);
  F.fallback = mergeParts([P_(g.box, '#aa66aa', 0, .3, 0, .6, .6, .6)]);
  // matériau instancié commun, une InstancedMesh par préfabriqué
  R3.inst = {}; R3.instCount = {}; R3.geo = {};
  for (const k in F) { const geos = Array.isArray(F[k]) ? F[k] : [F[k]]; geos.forEach((geo, i) => { const key = Array.isArray(F[k]) ? k + '#' + i : k; R3.geo[key] = geo; const im = new THREE.InstancedMesh(geo, R3.mats.inst, 1800); im.count = 0; im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(1800 * 3).fill(1), 3); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; R3.scene.add(im); R3.inst[key] = im; }); }
}

// ---------- chunks de terrain ----------
const CHK = 16;
const ACCENT = { house: '#c0392b', cabin: '#6a8a3a', gas: '#e8c030', farm: '#b8742a', market: '#2a7ac0', police: '#2a3f9a', hospital: '#e04a4a', warehouse: '#7a7e86', bunker: '#4a5a3a', church: '#7a4a9a', school: '#3a9a5a', diner: '#c03a34', firestation: '#b82a2a', lab: '#2ab8a0', prison: '#6a6a72', trailer: '#c0c4c8', mine: '#7a5a2a', radio: '#777777', village: '#2a8a4a', camp: '#8a1a14', legion: '#7a1f2a', apartments: '#a0764a', office: '#4a8ac0', hotel: '#b04a6a' };
function r3freeChunk(ch) {
  for (const k of ['mesh', 'water', 'win', 'objMesh']) if (ch[k]) { R3.scene.remove(ch[k]); ch[k].geometry.dispose(); }
}
function r3buildChunk(cx, cy) {
  const pos = [], col = [], wp = [], wc = [], wnp = [], wnc = [], x0 = cx * CHK, y0 = cy * CHK, x1 = Math.min(G.W, x0 + CHK), y1 = Math.min(G.H, y0 + CHK);
  const tri = (a, b, c, hex, j) => { const cc = C3(hex); const k = 1 + (j || 0); for (const p of [a, b, c]) { pos.push(p[0], p[1], p[2]); col.push(cc.r * k, cc.g * k, cc.b * k); } };
  const q = (p0, p1, p2, p3, hx) => { tri(p0, p1, p2, hx, 0); tri(p0, p2, p3, hx, 0); };
  const qUp = (p0, p1, p2, p3, hx) => { const ny = (p1[2] - p0[2]) * (p2[0] - p0[0]) - (p1[0] - p0[0]) * (p2[2] - p0[2]); if (ny < 0) q(p0, p3, p2, p1, hx); else q(p0, p1, p2, p3, hx); };
  const wq = (p0, p1, p2, p3, hx) => { const cc = C3(hx); for (const p of [p0, p1, p2, p0, p2, p3]) { wnp.push(p[0], p[1], p[2]); wnc.push(cc.r, cc.g, cc.b); } };
  const box = (ax, ay, az, bx, by, bz, hx, hx2) => { // parallélépipède (5 faces)
    q([ax, by, az], [ax, by, bz], [bx, by, bz], [bx, by, az], hx2 || hx); q([ax, ay, bz], [bx, ay, bz], [bx, by, bz], [ax, by, bz], hx); q([bx, ay, az], [ax, ay, az], [ax, by, az], [bx, by, az], m3Hex(hx, '#000000', .25));
    q([ax, ay, az], [ax, ay, bz], [ax, by, bz], [ax, by, az], m3Hex(hx, '#000000', .15)); q([bx, ay, bz], [bx, ay, az], [bx, by, az], [bx, by, bz], m3Hex(hx, '#000000', .1));
  };
  const WALLC = ['#6a6a72', '#62626a', '#70707a'];
  const isWall = (a, b) => { if (!inb(a, b)) return false; const tt = G.tiles[IDX(a, b)]; return tt === T.WALLT || tt === T.PALI; };
  for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
    const i = IDX(tx, ty); let t = G.tiles[i]; const h = hash2(tx, ty, 77), dm = R3.doorMap.get(i);
    const h00 = r3vh(tx, ty), h10 = r3vh(tx + 1, ty), h01 = r3vh(tx, ty + 1), h11 = r3vh(tx + 1, ty + 1);
    let hex;
    if (t === T.WALLT || t === T.PALI) hex = G.tiles[i] === T.PALI ? '#7a6a4a' : '#5a5c60'; // sol sous les murs
    else if (t === T.WATER) { const sd = G.shore[i]; hex = sd <= 1 ? '#c8b87c' : sd <= 3 ? '#7a8a78' : '#2a5878'; }
    else {
      const pal = TCOL[t]; hex = pal ? pal[Math.floor(h * pal.length) % pal.length] : (t === T.TILE ? '#c8d2da' : t === T.FLESH ? '#8a3a5a' : '#777');
      if (t === T.GRASS || t === T.FOREST) { const n = vnoise(tx / 5, ty / 5, G.seed + 11); hex = m3Hex(hex, n > .55 ? '#6a9a3a' : '#3f6a30', Math.abs(n - .5) * .7); }
      if (t === T.SAND) hex = m3Hex(hex, '#e2cd96', .2); if (t === T.ROAD) hex = m3Hex(hex, '#2c2e34', .2);
      if (dm === 'in') hex = '#b5803f'; else if (dm === 'out') hex = '#9a3a2c'; // seuil en bois, paillasson rouge
    }
    const j1 = (h - .5) * .08, j2 = (hash2(tx, ty, 78) - .5) * .08;
    tri([tx, h00, ty], [tx, h01, ty + 1], [tx + 1, h11, ty + 1], hex, j1); tri([tx, h00, ty], [tx + 1, h11, ty + 1], [tx + 1, h10, ty], hex, j2);
    if (t === T.WATER) { const sd = G.shore[i], wh = '#' + new THREE.Color(.20 + Math.min(sd, 6) * -.012, .5 - Math.min(sd, 6) * .03, .72 - Math.min(sd, 6) * .03).getHexString(), cc = C3(wh); const y = -.16; for (const p of [[tx, y, ty], [tx, y, ty + 1], [tx + 1, y, ty + 1], [tx, y, ty], [tx + 1, y, ty + 1], [tx + 1, y, ty]]) { wp.push(p[0], p[1], p[2]); wc.push(cc.r, cc.g, cc.b); } }
    if (t === T.WALLT || t === T.PALI) { // extrusion
      const bn = R3.bidx[i], bc = bn >= 0 ? m3Hex(G.buildings[bn].roof || '#888888', '#d8d0c0', .6) : null;
      const H = t === T.PALI ? .7 : WALL_H, top = t === T.PALI ? '#8a7650' : (bc ? m3Hex(bc, '#ffffff', .12) : WALLC[Math.floor(h * 3) % 3]), side = t === T.PALI ? '#6a5a3c' : (bc || '#4a4c54');
      q([tx, H, ty], [tx, H, ty + 1], [tx + 1, H, ty + 1], [tx + 1, H, ty], top);
      if (!isWall(tx, ty + 1)) q([tx, 0, ty + 1], [tx + 1, 0, ty + 1], [tx + 1, H, ty + 1], [tx, H, ty + 1], m3Hex(side, '#000000', 0));
      if (!isWall(tx, ty - 1)) q([tx + 1, 0, ty], [tx, 0, ty], [tx, H, ty], [tx + 1, H, ty], m3Hex(side, '#000000', .25));
      if (!isWall(tx - 1, ty)) q([tx, 0, ty], [tx, 0, ty + 1], [tx, H, ty + 1], [tx, H, ty], m3Hex(side, '#000000', .15));
      if (!isWall(tx + 1, ty)) q([tx + 1, 0, ty + 1], [tx + 1, 0, ty], [tx + 1, H, ty], [tx + 1, H, ty + 1], m3Hex(side, '#000000', .1));
      if (t === T.PALI) { for (let k = 0; k < 3; k++) { const sx = tx + .17 + k * .33; tri([sx - .1, H, ty + .5], [sx + .1, H, ty + .5], [sx, H + .22, ty + .5], '#9a8458', 0); } }
      else if (bn >= 0) { // fenêtres sur les façades extérieures
        const dirs = [[0, 1], [0, -1], [-1, 0], [1, 0]];
        for (let di = 0; di < 4; di++) {
          const nx = tx + dirs[di][0], ny = ty + dirs[di][1]; if (!inb(nx, ny) || isWall(nx, ny) || R3.bidx[IDX(nx, ny)] === bn) continue; if (hash2(tx, ty, 40 + di) < .3) continue;
          const ax = di < 2 ? 1 : 0, ay = di < 2 ? 0 : 1; let nearDoor = false; for (const k of [-1, 0, 1]) if (R3.doorMap.get(IDX(clamp(tx + ax * k, 0, G.W - 1), clamp(ty + ay * k, 0, G.H - 1))) === 'in' || R3.doorMap.get(IDX(clamp(nx + ax * k, 0, G.W - 1), clamp(ny + ay * k, 0, G.H - 1))) === 'out') nearDoor = true; if (nearDoor) continue;
          const P = (u, y, off) => di === 0 ? [tx + u, y, ty + 1 + off] : di === 1 ? [tx + 1 - u, y, ty - off] : di === 2 ? [tx - off, y, ty + u] : [tx + 1 + off, y, ty + 1 - u];
          q(P(.17, .46, .006), P(.83, .46, .006), P(.83, 1.0, .006), P(.17, 1.0, .006), '#3a2c20'); // cadre
          wq(P(.25, .52, .014), P(.75, .52, .014), P(.75, .94, .014), P(.25, .94, .014), '#ffffff'); // vitre (éclairée la nuit)
          q(P(.48, .52, .02), P(.52, .52, .02), P(.52, .94, .02), P(.48, .94, .02), '#3a2c20');
        }
      }
    }
  }
  // entrées : encadrement, linteau, auvent rayé, lanterne
  for (const [bn, d] of R3.doorsByChunk.get(cy * 1000 + cx) || []) {
    const b = G.buildings[bn], pt = R3.bpoi[bn], acc = ACCENT[pt ? pt.type : 'house'] || '#c0392b', horiz = d.s < 2, dir = (d.s === 0 || d.s === 2) ? -1 : 1, wall = m3Hex(b.roof || '#888888', '#d8d0c0', .6), wood = '#4a3220', H = WALL_H;
    if (horiz) {
      const z0 = d.y, z1 = d.y + 1, ze = dir < 0 ? z0 : z1; // face extérieure du mur
      box(d.x - .12, 0, z0, d.x + .06, H, z1, wood); box(d.x + 1.94, 0, z0, d.x + 2.12, H, z1, wood); box(d.x, H - .32, z0, d.x + 2, H, z1, wall, m3Hex(wall, '#ffffff', .12));
      for (let k = 0; k < 4; k++) { const xa = d.x + k * .5, xb = xa + .5, c = k % 2 ? '#f4efe2' : acc; qUp([xa, H - .06, ze], [xb, H - .06, ze], [xb, H - .52, ze + dir * 1.05], [xa, H - .52, ze + dir * 1.05], c); }
      wq([d.x + .85, H - .5, ze + dir * .03], [d.x + 1.15, H - .5, ze + dir * .03], [d.x + 1.15, H - .36, ze + dir * .03], [d.x + .85, H - .36, ze + dir * .03], '#fff0b0');
    } else {
      const x0b = d.x, x1b = d.x + 1, xe = dir < 0 ? x0b : x1b;
      box(x0b, 0, d.y - .12, x1b, H, d.y + .06, wood); box(x0b, 0, d.y + 1.94, x1b, H, d.y + 2.12, wood); box(x0b, H - .32, d.y, x1b, H, d.y + 2, wall, m3Hex(wall, '#ffffff', .12));
      for (let k = 0; k < 4; k++) { const za = d.y + k * .5, zb = za + .5, c = k % 2 ? '#f4efe2' : acc; qUp([xe, H - .06, za], [xe, H - .06, zb], [xe + dir * 1.05, H - .52, zb], [xe + dir * 1.05, H - .52, za], c); }
    }
  }
  const mk = (p, c, mat) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat); m.frustumCulled = true; return m; };
  const mesh = mk(pos, col, R3.mats.terrain); mesh.receiveShadow = true; mesh.castShadow = true; R3.scene.add(mesh);
  let water = null; if (wp.length) { water = mk(wp, wc, R3.mats.water); water.renderOrder = 2; R3.scene.add(water); }
  let win = null; if (wnp.length) { win = mk(wnp, wnc, R3.mats.win); R3.scene.add(win); }
  const ch = { mesh, water, win, objMesh: null, cx, cy, fx: [], inter: [], sig: 0 }; r3bakeObjs(ch);
  return ch;
}

// objets extérieurs fusionnés dans un seul maillage par chunk ; objets intérieurs / animés listés à part
function r3bakeObjs(ch) {
  if (ch.objMesh) { R3.scene.remove(ch.objMesh); ch.objMesh.geometry.dispose(); ch.objMesh = null; }
  ch.fx = []; ch.inter = []; const x0 = ch.cx * CHK, y0 = ch.cy * CHK, x1 = Math.min(G.W, x0 + CHK), y1 = Math.min(G.H, y0 + CHK), items = []; let nv = 0, sig = 0;
  for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
    const i = IDX(tx, ty), o = G.objs.get(i); if (!o) continue; sig = (sig * 31 + (o.dep ? 7 : 1) + (o.opened ? 13 : 0)) | 0;
    if (R3.bidx[i] >= 0) { ch.inter.push([o, tx, ty]); continue; }
    if (R3.FX_KINDS[o.k]) ch.fx.push([o, tx, ty]);
    const sp = r3objSpec(o, tx, ty); if (!sp) continue; const geo = R3.geo[sp.key]; if (!geo) continue; items.push([geo, sp]); nv += geo.attributes.position.count;
  }
  ch.sig = sig;
  if (!items.length) return;
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), Cc = new Float32Array(nv * 3); let o3 = 0;
  for (const [geo, sp] of items) {
    const pa = geo.attributes.position.array, na = geo.attributes.normal.array, ca = geo.attributes.color.array, c = Math.cos(sp.ry), s = Math.sin(sp.ry), tn = sp.tint === undefined ? 1 : sp.tint;
    for (let k = 0; k < pa.length; k += 3) {
      const x = pa[k] * sp.sx, y = pa[k + 1] * sp.sy, z = pa[k + 2] * sp.sz;
      P[o3] = sp.x + x * c + z * s; P[o3 + 1] = sp.y + y; P[o3 + 2] = sp.z - x * s + z * c;
      N[o3] = na[k] * c + na[k + 2] * s; N[o3 + 1] = na[k + 1]; N[o3 + 2] = -na[k] * s + na[k + 2] * c;
      Cc[o3] = ca[k] * tn; Cc[o3 + 1] = ca[k + 1] * tn; Cc[o3 + 2] = ca[k + 2] * tn; o3 += 3;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
  const m = new THREE.Mesh(g, R3.mats.terrain); m.castShadow = true; m.receiveShadow = true; R3.scene.add(m); ch.objMesh = m; R3.stats.baked = (R3.stats.baked || 0) + 1;
}

// ---------- toits des bâtiments ----------
const _it = {};
function iconTex(ch) {
  if (_it[ch]) return _it[ch]; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = 'rgba(255,255,255,.86)'; c.beginPath(); c.arc(64, 64, 58, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(40,30,20,.55)'; c.lineWidth = 5; c.stroke();
  c.font = '72px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return _it[ch] = t;
}
function r3freeRoof(m) { R3.scene.remove(m); m.geometry.dispose(); m.material.dispose(); if (m.userData.decal) m.userData.decal.material.dispose(); if (m.userData.extra) R3.scene.remove(m.userData.extra); }
function r3roof(b, n) {
  let m = R3.roofs.get(n); if (m) return m;
  const g = GEO(), st = b.style, W = b.w, D = b.h, parts = [], rc = b.roof || '#666666', top = WALL_H;
  const flat = ['lab', 'prison', 'trailer', 'fire', 'plant', 'castle', 'mine', 'diner', 'school', 'lighthouse'].includes(st);
  const lit = m3Hex(rc, '#ffffff', .12), dark = m3Hex(rc, '#000000', .25);
  if (st === 'lighthouse') { parts.push(P_(g.cyl8, '#f2f2f2', W / 2, top + .1, D / 2, W - .2, .25, D - .2)); }
  else if (flat) {
    const fc = st === 'lab' ? '#d8e0e8' : st === 'prison' ? '#7a7a82' : st === 'fire' ? '#b83a32' : st === 'plant' ? '#8a94a0' : st === 'castle' ? '#7a7e8a' : st === 'trailer' ? '#b8bec6' : st === 'mine' ? '#6a5a48' : rc;
    parts.push(P_(g.box, fc, W / 2, top + .08, D / 2, W + .3, .16, D + .3));
    parts.push(P_(g.box, dark, W / 2, top + .22, D / 2, W + .3, .14, .12)); parts.push(P_(g.box, dark, W / 2, top + .22, D + .08, W + .3, .14, .12)); parts.push(P_(g.box, dark, -.07, top + .22, D / 2, .12, .14, D + .3)); parts.push(P_(g.box, dark, W + .07, top + .22, D / 2, .12, .14, D + .3));
    if (st === 'castle') for (let x = .3; x < W; x += .8) { parts.push(P_(g.box, '#6a6e7a', x, top + .45, -.06, .4, .3, .12)); parts.push(P_(g.box, '#6a6e7a', x, top + .45, D + .06, .4, .3, .12)); }
    if (st === 'lab') { parts.push(P_(g.cyl8, '#3a4654', W * .3, top + .35, D * .4, .7, .3, .7)); parts.push(P_(g.cyl8, '#3a4654', W * .65, top + .35, D * .4, .7, .3, .7)); }
    if (st === 'plant') parts.push(P_(g.cyl8, '#a8b0bc', W * .25, top + 1.0, D * .4, 1.0, 1.8, 1.0));
    if (st === 'fire') parts.push(P_(g.box, '#f0f0f0', W / 2, top + .2, D / 2, W * .9, .02, .4));
    if (st === 'diner') for (let x = 0; x < W; x += .6) parts.push(P_(g.box, (x / .6) % 2 ? '#f4efe2' : '#c03a34', x + .3, top + .15, D - .35, .6, .1, .6));
    if (st === 'mine') for (let x = .5; x < W; x += 1.2) parts.push(P_(g.box, '#46301a', x, top + .22, D / 2, .22, .16, D));
  } else { // toit à deux pans
    const horiz = W >= D, H = Math.min(W, D) * .36 + .2, L = horiz ? W : D, S = horiz ? D : W;
    const roof = new THREE.BufferGeometry(); const hs = (S + .5) / 2, l = L + .5, ov = .25; // prisme
    const A = [-ov, top, -hs], B = [l - ov, top, -hs], Cc = [l - ov, top, hs], Dd = [-ov, top, hs], E = [-ov, top + H, 0], F2 = [l - ov, top + H, 0];
    const P = []; const quad = (a, b, c, d) => { P.push(...a, ...b, ...c, ...a, ...c, ...d); }; quad(A, E, F2, B); quad(Dd, Cc, F2, E); P.push(...A, ...Dd, ...E, ...B, ...F2, ...Cc);
    roof.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); const cl = C3(rc), cd = C3(dark), col = []; for (let i = 0; i < P.length / 3; i++) { const side = i < 6 ? cl : (i < 12 ? cd : cl); col.push(side.r, side.g, side.b); } roof.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    // coord locales → monde : rotation selon l'axe long
    const m4 = new THREE.Matrix4(); if (horiz) m4.makeTranslation(0, 0, D / 2); else m4.makeRotationY(-Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(W / 2, 0, 0)); roof.applyMatrix4(m4); roof.computeVertexNormals();
    parts._raw = roof;
    if (!st && (!R3.bpoi[n] || ['house', 'cabin', 'farm', 'village'].includes(R3.bpoi[n].type))) { const cx = horiz ? W * .72 : W / 2 - S * .2, cz = horiz ? D / 2 - S * .2 : D * .72; parts.push(P_(g.box, '#8a7a6a', cx, top + H + .05, cz, .34, .9, .34)); parts.push(P_(g.box, '#4a423a', cx, top + H + .52, cz, .42, .08, .42)); }
    if (st === 'church') { parts.push(P_(g.box, '#8a90a0', W / 2, top + H + .8, D * .18, Math.min(W, D) * .5, 1.8, Math.min(W, D) * .5)); parts.push(P_(g.pyr, '#5a606c', W / 2, top + H + 2.2, D * .18, Math.min(W, D) * .6, 1.4, Math.min(W, D) * .6, 0, Math.PI / 4, 0)); parts.push(P_(g.box, '#e8e4d8', W / 2, top + H + 3.1, D * .18, .08, .6, .08)); parts.push(P_(g.box, '#e8e4d8', W / 2, top + H + 3.2, D * .18, .36, .08, .08)); }
  }
  let geo = parts.length ? mergeParts(parts) : null; const raw = parts._raw;
  if (raw) { if (geo) { const pa = geo.attributes.position.array, ca = geo.attributes.color.array, pr = raw.attributes.position.array, cr = raw.attributes.color.array; const np = new Float32Array(pa.length + pr.length), nc = new Float32Array(ca.length + cr.length); np.set(pa); np.set(pr, pa.length); nc.set(ca); nc.set(cr, ca.length); geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(np, 3)); geo.setAttribute('color', new THREE.BufferAttribute(nc, 3)); geo.computeVertexNormals(); } else geo = raw; }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 1 });
  m = new THREE.Mesh(geo, mat); m.position.set(b.x, 0, b.y); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = true; m.renderOrder = 3; R3.scene.add(m); R3.roofs.set(n, m);
  if (st !== 'lighthouse') { // pictogramme de fonction posé sur le toit : on reconnaît d'un coup d'œil maison, église, hôpital…
    const pt = R3.bpoi[n], icon = pt && pt.type !== 'village' ? pt.def.icon : '🏠', small = !pt || pt.type === 'house' || pt.type === 'cabin' || pt.type === 'village';
    const sz = clamp(Math.min(W, D) * (small ? .62 : .5), 1.3, 3.6), dm = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), new THREE.MeshBasicMaterial({ map: iconTex(icon), transparent: true, depthWrite: false }));
    dm.rotation.x = -Math.PI / 2; dm.rotation.z = 0; const ridge = flat ? .32 : Math.min(W, D) * .36 + .32; dm.position.set(W / 2, top + ridge, D / 2); dm.renderOrder = 4; m.add(dm); m.userData.decal = dm;
  }
  if (st === 'lighthouse') { // tour (toujours visible) + lanterne
    const tw = mergeParts([P_(g.cyl8, '#f2f2f2', 0, 2.2, 0, 1.5, 4.4, 1.5), P_(g.cyl8, '#c83a34', 0, 1.2, 0, 1.55, .7, 1.55), P_(g.cyl8, '#c83a34', 0, 3.1, 0, 1.55, .7, 1.55), P_(g.cyl8, '#fff4b0', 0, 4.7, 0, 1.0, .5, 1.0), P_(g.cone, '#c83a34', 0, 5.3, 0, 1.3, .8, 1.3)]);
    const t = new THREE.Mesh(tw, R3.mats.inst); t.position.set(b.x + W / 2, 0, b.y + D / 2); t.castShadow = true; R3.scene.add(t); m.userData.extra = t;
  }
  return m;
}
