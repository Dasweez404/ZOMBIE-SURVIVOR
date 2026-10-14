'use strict';
// ===== Rendu 3D : personnages, véhicules, structures, effets =====
const _mm = {};
function lam(hex, o) { const k = hex + (o ? JSON.stringify(o) : ''); return _mm[k] || (_mm[k] = new THREE.MeshLambertMaterial(Object.assign({ color: hex }, o || {}))); }
function bmesh(geo, mat, x, y, z, sx, sy, sz) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; return m; }
function pivot(x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); return g; }

// ----- humanoïdes (orientés vers +X) -----
function mkHumanoid(o) {
  const g = GEO(), root = new THREE.Group(), inner = new THREE.Group(); root.add(inner); const s = o.scale || 1;
  const bodyMat = new THREE.MeshLambertMaterial({ color: o.shirt }); const pantMat = lam(o.pants), skinMat = lam(o.skin);
  const legL = pivot(0, .4, -.11), legR = pivot(0, .4, .11); legL.add(bmesh(g.box, pantMat, 0, -.2, 0, .17, .4, .17)); legR.add(bmesh(g.box, pantMat, 0, -.2, 0, .17, .4, .17));
  const torso = bmesh(g.box, bodyMat, 0, .62, 0, .3 * (o.fat || 1), .44, .5 * (o.fat || 1));
  const head = bmesh(g.sph, skinMat, .02, .98, 0, .34, .34, .34);
  const armL = pivot(0, .8, -.3 * (o.fat || 1)), armR = pivot(0, .8, .3 * (o.fat || 1)); armL.add(bmesh(g.box, bodyMat, 0, -.19, 0, .14, .4, .14)); armR.add(bmesh(g.box, bodyMat, 0, -.19, 0, .14, .4, .14));
  armL.add(bmesh(g.box, skinMat, 0, -.4, 0, .12, .1, .12)); armR.add(bmesh(g.box, skinMat, 0, -.4, 0, .12, .1, .12));
  inner.add(legL, legR, torso, head, armL, armR);
  if (o.hair) inner.add(bmesh(g.sph, lam(o.hair), -.02, 1.04, 0, .36, .26, .36));
  if (o.helmet) inner.add(bmesh(g.sph, lam(o.helmet), 0, 1.04, 0, .4, .3, .4));
  if (o.pack) inner.add(bmesh(g.box, lam(o.pack), -.22, .66, 0, .14, .34, .3));
  let gun = null; if (o.gun) { gun = new THREE.Group(); gun.position.set(.28, .66, .16); gun.add(bmesh(g.box, lam('#2a2c32'), .22, 0, 0, .6, .09, .08)); gun.add(bmesh(g.box, lam('#4a3c2c'), -.05, -.03, 0, .22, .12, .08)); inner.add(gun); }
  root.scale.setScalar(s); root.userData = { legL, legR, armL, armR, bodyMat, inner, gun, head, torso };
  return root;
}
function mkQuad(o) { // animaux à 4 pattes
  const g = GEO(), root = new THREE.Group(), k = o.k || 1, bodyMat = new THREE.MeshLambertMaterial({ color: o.col }), dark = lam(m3Hex(o.col, '#000000', .35)), lt = lam(m3Hex(o.col, '#ffffff', .3));
  const L = o.len || 1, H = o.h || .45, Wd = o.wid || .42, leg = o.leg || .3; const inner = new THREE.Group(); root.add(inner);
  inner.add(bmesh(g.box, bodyMat, 0, leg + H / 2, 0, L, H, Wd));
  inner.add(bmesh(g.box, bodyMat, L * .55, leg + H * .85, 0, L * .32, H * .7, Wd * .7)); // tête
  if (o.ears) { inner.add(bmesh(g.box, lt, L * .5, leg + H * 1.6, .06, .08, .3, .06)); inner.add(bmesh(g.box, lt, L * .5, leg + H * 1.6, -.06, .08, .3, .06)); }
  if (o.antlers) { inner.add(bmesh(g.cone, dark, L * .5, leg + H * 1.6, .1, .06, .35, .06)); inner.add(bmesh(g.cone, dark, L * .5, leg + H * 1.6, -.1, .06, .35, .06)); }
  if (o.tusks) { inner.add(bmesh(g.cone, lam('#e8e0c8'), L * .72, leg + H * .6, .1, .05, .16, .05)); inner.add(bmesh(g.cone, lam('#e8e0c8'), L * .72, leg + H * .6, -.1, .05, .16, .05)); }
  inner.add(bmesh(g.box, dark, -L * .55, leg + H * .8, 0, L * .3, .08, .08)); // queue
  const legs = []; for (const [x, z] of [[.32, .15], [.32, -.15], [-.32, .15], [-.32, -.15]]) { const p = pivot(x * L, leg, z * Wd * 2); p.add(bmesh(g.box, dark, 0, -leg / 2, 0, .1, leg, .1)); inner.add(p); legs.push(p); }
  root.scale.setScalar(k); root.userData = { legs, bodyMat, inner };
  return root;
}
function mkBug(o) { // araignée / scorpion
  const g = GEO(), root = new THREE.Group(), bodyMat = new THREE.MeshLambertMaterial({ color: o.col }), dk = lam('#1a1410'), legs = [];
  const inner = new THREE.Group(); root.add(inner);
  inner.add(bmesh(g.sph, bodyMat, 0, .3, 0, .6, .38, .5)); inner.add(bmesh(g.sph, bodyMat, .35, .32, 0, .35, .28, .32));
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const p = pivot(.1 + i * .08 - .1, .3, sd * .15); const l1 = bmesh(g.box, dk, 0, 0, sd * .25, .06, .06, .55); p.add(l1); p.rotation.x = 0; p.rotation.y = (i - 1.5) * .35; inner.add(p); legs.push(p); }
  if (o.tail) { inner.add(bmesh(g.box, bodyMat, -.45, .5, 0, .5, .12, .12)); inner.add(bmesh(g.cone, lam('#c8a020'), -.75, .72, 0, .12, .3, .12)); inner.add(bmesh(g.box, lam('#caa83a'), .45, .3, .35, .3, .1, .1)); inner.add(bmesh(g.box, lam('#caa83a'), .45, .3, -.35, .3, .1, .1)); }
  root.userData = { legs, bodyMat, inner }; root.scale.setScalar(o.k || 1); return root;
}
const ANIMAL3 = {
  rabbit: { col: '#e8e0d0', len: .55, h: .28, wid: .26, leg: .12, ears: 1, k: 1 }, deer: { col: '#b08050', len: 1.0, h: .5, wid: .36, leg: .5, antlers: 1, k: 1 },
  boar: { col: '#5a4636', len: .95, h: .5, wid: .46, leg: .22, tusks: 1, k: 1 }, wolf: { col: '#8a8a90', len: .95, h: .38, wid: .3, leg: .34, k: 1 },
  hound: { col: '#4a3a30', len: 1.0, h: .4, wid: .32, leg: .34, k: 1 }, bear: { col: '#4a3a2c', len: 1.5, h: .8, wid: .7, leg: .3, k: 1 },
};
function mkMob(m) {
  const d = m.def, t = m.t, r = m.r;
  if (t === 'spider') return mkBug({ col: d.col || '#3a2a4a', k: r / 11 });
  if (t === 'scorpion') return mkBug({ col: d.col || '#8a6a3a', tail: 1, k: r / 11 });
  if (t === 'rats') return mkQuad({ col: '#4a3a30', len: .35, h: .16, wid: .15, leg: .06, k: 1 });
  if (d.fac === 'wild' && ANIMAL3[t]) { const a = Object.assign({}, ANIMAL3[t]); a.col = d.col || a.col; a.k = r / ({ rabbit: 7, deer: 13, boar: 13, wolf: 12, hound: 13, bear: 20 }[t] || 12); return mkQuad(a); }
  if (d.fac === 'wild') return mkQuad({ col: d.col || '#888', k: r / 12 });
  const human = !!d.human;
  const sc = clamp(r / 11, .75, 3) * .95;
  const o = { scale: sc, skin: human ? '#d6a984' : d.col, shirt: human ? (d.col || '#6a6a70') : m3Hex(d.col, '#3a3028', .55), pants: human ? '#3a3a44' : '#2c2a30', gun: human, hair: human ? '#3a2a1a' : null, helmet: human && (d.boss || /legion|sold/.test(t)) ? '#4a5a3a' : null };
  if (t === 'bloater') { o.fat = 1.9; o.shirt = m3Hex(d.col, '#9a8f3c', .4); } if (t === 'brute' || t === 'charger') { o.fat = 1.35; o.scale = sc * 1.15; }
  if (t === 'burner') o.shirt = '#7a3a22'; if (t === 'toxic') o.shirt = '#58802a'; if (t === 'ghoul') { o.skin = '#aab8a0'; o.shirt = '#4a5a48'; }
  if (t === 'riot') { o.shirt = '#2a3a5a'; o.helmet = '#2a3040'; } if (t === 'necro') { o.shirt = '#4a2a6a'; o.hair = '#2a1a3a'; } if (t === 'leaper') { o.scale = sc * .95; }
  const g = mkHumanoid(o), u = g.userData;
  if (!human) { u.armL.rotation.z = u.armR.rotation.z = 1.4; }
  if (t === 'crawler') { u.inner.scale.y = .5; u.inner.position.y = -.05; u.legL.visible = u.legR.visible = false; }
  if (t === 'riot') { const sh = bmesh(GEO().box, lam('#8a9aaa'), .38, .62, 0, .06, .6, .55); u.inner.add(sh); }
  if (t === 'necro') { u.inner.add(bmesh(GEO().cone, lam('#3a1e5a'), 0, .35, 0, .6, .75, .6)); u.inner.add(bmesh(GEO().cyl, lam('#5a3a2a'), .3, .7, .32, .05, 1.2, .05)); u.inner.add(bmesh(GEO().sph, lam('#c060ff', { emissive: '#a040ff' }), .3, 1.3, .32, .16, .16, .16)); }
  if (t === 'queen') { g.scale.setScalar(2.6); u.inner.add(bmesh(GEO().cone, lam('#d8a0e0', { emissive: '#803080' }), 0, 1.3, 0, .35, .5, .35)); }
  if (d.boss && t !== 'queen') u.inner.add(bmesh(GEO().cone, lam('#e8c050', { emissive: '#a07820' }), 0, 1.25, 0, .3, .3, .3));
  return g;
}

// ----- joueur -----
function mkPlayer() {
  const o = mkHumanoid({ skin: '#e0b090', shirt: '#3a6ab0', pants: '#3a3a48', hair: '#4a2c1a', gun: false, scale: 1, pack: '#6a5a3a' });
  const g = GEO(), u = o.userData; u.melee = new THREE.Group(); u.melee.position.set(.3, .62, .3); u.melee.add(bmesh(g.box, lam('#c8ccd4'), .4, 0, 0, .75, .06, .05)); u.melee.add(bmesh(g.box, lam('#4a3220'), -.05, 0, 0, .18, .08, .08)); u.inner.add(u.melee);
  u.rgun = new THREE.Group(); u.rgun.position.set(.3, .66, .17); u.rgun.add(bmesh(g.box, lam('#2a2c32'), .24, 0, 0, .66, .1, .09)); u.rgun.add(bmesh(g.box, lam('#4a3c2c'), -.06, -.04, 0, .24, .14, .09)); u.inner.add(u.rgun);
  return o;
}
function mkVehicle(v) {
  const g = GEO(), root = new THREE.Group(), t = v.t, col = v.col, glass = lam('#9ab8cc'), dk = lam('#1c1c20'), body = new THREE.MeshLambertMaterial({ color: col });
  const wheels = [];
  const wheel = (x, z, r) => { const p = pivot(x, r, z); const w = bmesh(g.cyl8, dk, 0, 0, 0, r * 2, .14, r * 2); w.rotation.x = Math.PI / 2; p.add(w); root.add(p); wheels.push(p); };
  if (t === 'moto') {
    root.add(bmesh(g.box, body, 0, .42, 0, .75, .18, .12)); root.add(bmesh(g.box, lam('#3a3a40'), -.1, .58, 0, .35, .12, .14)); root.add(bmesh(g.box, dk, .3, .72, 0, .06, .06, .46)); wheel(.38, 0, .22); wheel(-.38, 0, .22);
  } else if (t === 'car') {
    root.add(bmesh(g.box, body, 0, .36, 0, 1.55, .42, .84)); root.add(bmesh(g.box, glass, -.08, .74, 0, .8, .34, .72)); root.add(bmesh(g.box, m3Hex(col, '#ffffff', .15), -.08, .93, 0, .78, .05, .7));
    root.add(bmesh(g.box, lam('#fff2b0', { emissive: '#887730' }), .78, .4, .28, .05, .1, .16)); root.add(bmesh(g.box, lam('#fff2b0', { emissive: '#887730' }), .78, .4, -.28, .05, .1, .16)); root.add(bmesh(g.box, lam('#a02020', { emissive: '#601010' }), -.78, .4, .28, .05, .1, .16)); root.add(bmesh(g.box, lam('#a02020', { emissive: '#601010' }), -.78, .4, -.28, .05, .1, .16));
    wheel(.5, .42, .2); wheel(.5, -.42, .2); wheel(-.5, .42, .2); wheel(-.5, -.42, .2);
  } else {
    root.add(bmesh(g.box, body, .55, .52, 0, .8, .7, 1.0)); root.add(bmesh(g.box, glass, .72, .74, 0, .45, .3, .86)); root.add(bmesh(g.box, lam('#6a6a70'), -.45, .5, 0, 1.15, .6, 1.0)); root.add(bmesh(g.box, lam('#5a5a60'), -.45, .84, 0, 1.15, .06, 1.02));
    root.add(bmesh(g.box, lam('#fff2b0', { emissive: '#887730' }), .96, .5, .34, .05, .12, .18)); root.add(bmesh(g.box, lam('#fff2b0', { emissive: '#887730' }), .96, .5, -.34, .05, .12, .18));
    wheel(.65, .52, .26); wheel(.65, -.52, .26); wheel(-.7, .52, .26); wheel(-.7, -.52, .26); wheel(-.2, .52, .26); wheel(-.2, -.52, .26);
  }
  const gun = new THREE.Group(); gun.position.set(0, t === 'moto' ? .8 : 1.0, 0); gun.add(bmesh(g.box, lam('#3a3c44'), .3, 0, 0, .8, .1, .1)); gun.add(bmesh(g.cyl8, lam('#2a2c34'), 0, -.06, 0, .3, .12, .3)); gun.visible = false; root.add(gun);
  root.userData = { wheels, gun, body }; return root;
}

// ----- structures du joueur -----
function mkStruct(type, s) {
  const g = GEO(), root = new THREE.Group(), w = lam('#8a6a44'), st = lam('#8a8c92'), mt = lam('#7a8a9a');
  const add = (geo, mat, x, y, z, sx, sy, sz, r) => { const m = bmesh(geo, mat, x, y, z, sx, sy, sz); if (r) m.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0); root.add(m); return m; };
  switch (type) {
    case 'wall_wood': add(g.box, w, 0, .55, 0, .96, 1.1, .96); for (let i = 0; i < 4; i++) add(g.box, lam('#6a4e30'), 0, .15 + i * .28, 0, 1.0, .05, 1.0); break;
    case 'wall_stone': add(g.box, st, 0, .6, 0, .98, 1.2, .98); for (let i = 0; i < 3; i++) add(g.box, lam('#6a6c72'), 0, .2 + i * .4, 0, 1.0, .04, 1.0); add(g.box, lam('#9a9ca2'), 0, 1.22, 0, .94, .08, .94); break;
    case 'wall_metal': add(g.box, mt, 0, .65, 0, .98, 1.3, .98); add(g.box, lam('#4a5560'), 0, .65, 0, 1.0, .1, 1.0); add(g.box, lam('#4a5560'), 0, 1.0, 0, 1.0, .1, 1.0); add(g.box, lam('#9aaaba'), 0, 1.32, 0, .94, .06, .94); break;
    case 'door': add(g.box, lam('#6a4a2c'), 0, .5, 0, .96, 1.0, .3); add(g.box, lam('#c8a850'), .3, .5, .17, .08, .08, .06); break;
    case 'barricade': add(g.box, w, 0, .3, .1, 1.0, .12, .1, [0, 0, .5]); add(g.box, w, 0, .3, -.1, 1.0, .12, .1, [0, 0, -.5]); add(g.box, lam('#5a3e24'), 0, .45, 0, 1.0, .1, .12); break;
    case 'spikes': for (let i = 0; i < 6; i++) add(g.cone, lam('#8a8a92'), -.3 + (i % 3) * .3, .18, -.15 + Math.floor(i / 3) * .3, .12, .36, .12); break;
    case 'workbench': add(g.box, lam('#8a6a44'), 0, .5, 0, .92, .1, .6); add(g.box, lam('#5a3e24'), -.4, .25, -.22, .08, .5, .08); add(g.box, lam('#5a3e24'), .4, .25, -.22, .08, .5, .08); add(g.box, lam('#5a3e24'), -.4, .25, .22, .08, .5, .08); add(g.box, lam('#5a3e24'), .4, .25, .22, .08, .5, .08); add(g.box, lam('#a0a4ac'), .2, .6, 0, .3, .1, .2); add(g.box, lam('#6a6e76'), -.25, .58, .1, .14, .08, .3); break;
    case 'campfire': for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; add(g.dode, lam('#8a8a92'), Math.cos(a) * .3, .08, Math.sin(a) * .3, .18, .14, .18); } add(g.cyl, lam('#4a3220'), 0, .1, 0, .08, .5, .08, [0, 0, 1.2]); add(g.cyl, lam('#4a3220'), 0, .1, 0, .08, .5, .08, [0, 1.5, 1.2]); break;
    case 'chest': add(g.box, lam('#7a5232'), 0, .3, 0, .8, .5, .55); add(g.box, lam('#5a3a20'), 0, .58, 0, .82, .1, .57); add(g.box, lam('#d0b050'), 0, .45, .29, .12, .14, .04); break;
    case 'bed': add(g.box, lam('#6a4a2c'), 0, .2, 0, .9, .2, .96); add(g.box, lam('#d8d0c0'), 0, .36, .1, .8, .14, .7); add(g.box, lam('#a03a3a'), 0, .4, -.18, .8, .1, .5); add(g.box, lam('#6a4a2c'), -.46, .5, 0, .06, .5, .96); break;
    case 'lamp': add(g.cyl, lam('#4a4a52'), 0, .8, 0, .08, 1.6, .08); add(g.sph, lam('#ffe9a0', { emissive: '#ffcc60' }), 0, 1.68, 0, .26, .26, .26); break;
    case 'plot': add(g.box, lam('#5a3e24'), 0, .08, 0, .96, .16, .96); add(g.box, lam('#3a2a1a'), 0, .17, 0, .86, .04, .86); break;
    case 'barrel': add(g.cyl8, lam('#4a6a8a'), 0, .5, 0, .8, 1.0, .8); add(g.cyl8, lam('#2a4a6a'), 0, .3, 0, .84, .08, .84); add(g.cyl8, lam('#2a4a6a'), 0, .7, 0, .84, .08, .84); break;
    case 'turret': add(g.cyl8, lam('#5a626c'), 0, .25, 0, .9, .5, .9); add(g.box, lam('#3a424c'), 0, .6, 0, .6, .24, .6); break;
    default: add(g.box, lam('#aa66aa'), 0, .4, 0, .8, .8, .8);
  }
  if (type === 'turret') { const gunp = new THREE.Group(); gunp.position.set(0, .66, 0); gunp.add(bmesh(g.box, lam('#b4bcc8'), .45, 0, 0, .8, .12, .12)); gunp.add(bmesh(g.box, lam('#2a2e36'), .85, 0, 0, .14, .18, .18)); root.add(gunp); root.userData.gun = gunp; }
  return root;
}

// ----- effets : particules, balles, lueurs -----
function r3fxInit() {
  const F = R3.fx, MAXP = 1600;
  const pg = new THREE.BufferGeometry(); F.pPos = new Float32Array(MAXP * 3); F.pCol = new Float32Array(MAXP * 4); F.pSize = new Float32Array(MAXP);
  pg.setAttribute('position', new THREE.BufferAttribute(F.pPos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(F.pCol, 4)); pg.setAttribute('size', new THREE.BufferAttribute(F.pSize, 1));
  const mk = (additive) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uScale: { value: 700 } },
    vertexShader: 'attribute float size; attribute vec4 color; varying vec4 vC; uniform float uScale; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*uScale/(-mv.z); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying vec4 vC; void main(){ vec2 d=gl_PointCoord-.5; float r=length(d); if(r>.5) discard; gl_FragColor=vec4(vC.rgb, vC.a*smoothstep(.5,.15,r)); }' });
  F.pts = new THREE.Points(pg, mk(false)); F.pts.frustumCulled = false; F.pts.renderOrder = 6; R3.scene.add(F.pts); F.pg = pg; F.n = 0;
  const ag = new THREE.BufferGeometry(); F.aPos = new Float32Array(900 * 3); F.aCol = new Float32Array(900 * 4); F.aSize = new Float32Array(900);
  ag.setAttribute('position', new THREE.BufferAttribute(F.aPos, 3)); ag.setAttribute('color', new THREE.BufferAttribute(F.aCol, 4)); ag.setAttribute('size', new THREE.BufferAttribute(F.aSize, 1));
  F.add = new THREE.Points(ag, mk(true)); F.add.frustumCulled = false; F.add.renderOrder = 7; R3.scene.add(F.add); F.ag = ag; F.an = 0;
  // balles : petites barres émissives
  F.bul = new THREE.InstancedMesh(GEO().box, new THREE.MeshBasicMaterial({ color: '#ffe8a0' }), 400); F.bul.count = 0; F.bul.frustumCulled = false; R3.scene.add(F.bul);
  // pool de sphères (explosions) et de disques (zones, parcelles, ombres de ramassage)
  F.blast = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff9a40', transparent: true, opacity: .6, depthWrite: false })); m.visible = false; R3.scene.add(m); F.blast.push(m); }
  F.disc = []; for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#80ff30', transparent: true, opacity: .2, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 4; R3.scene.add(m); F.disc.push(m); }
  F.bolt = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#e8f0ff' })); F.bolt.frustumCulled = false; R3.scene.add(F.bolt);
  F.ghost = null; F.tile = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#60ff80', transparent: true, opacity: .35, depthWrite: false })); F.tile.rotation.x = -Math.PI / 2; F.tile.visible = false; R3.scene.add(F.tile);
  F.pick = new THREE.InstancedMesh(GEO().oct, new THREE.MeshLambertMaterial({ color: '#ffe890', emissive: '#a08830' }), 200); F.pick.count = 0; F.pick.frustumCulled = false; R3.scene.add(F.pick);
  F.shadowDisc = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 12), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .28, depthWrite: false }), 600); F.shadowDisc.count = 0; F.shadowDisc.frustumCulled = false; F.shadowDisc.rotation.x = 0; R3.scene.add(F.shadowDisc);
  F.flags = {}; F.pois = new Map();
}
function r3part(x, y, z, size, c, a, add) {
  const F = R3.fx;
  if (add) { if (F.an >= 900) return; const i = F.an++; F.aPos[i * 3] = x; F.aPos[i * 3 + 1] = y; F.aPos[i * 3 + 2] = z; F.aCol[i * 4] = c[0]; F.aCol[i * 4 + 1] = c[1]; F.aCol[i * 4 + 2] = c[2]; F.aCol[i * 4 + 3] = a; F.aSize[i] = size; }
  else { if (F.n >= 1600) return; const i = F.n++; F.pPos[i * 3] = x; F.pPos[i * 3 + 1] = y; F.pPos[i * 3 + 2] = z; F.pCol[i * 4] = c[0]; F.pCol[i * 4 + 1] = c[1]; F.pCol[i * 4 + 2] = c[2]; F.pCol[i * 4 + 3] = a; F.pSize[i] = size; }
}
const RGB_ = { fire: [1, .55, .15], glow: [1, .85, .4], toxic: [.5, 1, .25], rad: [.6, 1, .2], blue: [.5, .8, 1] };
