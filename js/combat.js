'use strict';
// ===== Combat : projectiles, dégâts, explosions, gadgets, structures =====

// ---------- Effets ----------
function addPart(x, y, vx, vy, life, size, col, kind) {
  if (G.parts.length > 700) return;
  G.parts.push({ x, y, vx, vy, life, max: life, size, col, kind: kind || 'dot' });
}
function addText(x, y, txt, col, big) { G.texts.push({ x, y, txt, col: col || '#fff', life: 0.9, big }); if (G.texts.length > 60) G.texts.shift(); }
function addDecal(x, y, r, col) { G.decals.push({ x, y, r, col, life: 40 }); if (G.decals.length > 260) G.decals.shift(); }
function blood(m, n, ang) {
  const col = m.fac === 'undead' ? '#5f8a22' : (m.def && m.def.fac === 'wild' ? '#8a1a1a' : '#a01414');
  for (let i = 0; i < n; i++) { const a = (ang === undefined ? rnd(0, TAU) : ang + rnd(-.6, .6)), s = rnd(40, 180); addPart(m.x, m.y, Math.cos(a) * s, Math.sin(a) * s, rnd(.25, .6), rnd(1.5, 3), col); }
  if (Math.random() < .5) addDecal(m.x + rnd(-8, 8), m.y + rnd(-8, 8), rnd(3, 7), col);
}
function fxRing(x, y, r, col, life) { (G.rings = G.rings || []).push({ x, y, r, life: life || .45, max: life || .45, col: col || '255,235,190' }); if (G.rings.length > 40) G.rings.shift(); }
function buildFx(s, kind) { // kind: 'place' | 'upgrade' | 'remove'
  const col = kind === 'remove' ? '#b8a888' : kind === 'upgrade' ? '#ffe28a' : '#e8dcb8';
  fxRing(s.x, s.y, kind === 'place' ? 26 : 34, kind === 'upgrade' ? '255,226,138' : kind === 'remove' ? '210,190,160' : '255,240,200');
  for (let i = 0; i < (kind === 'remove' ? 12 : 9); i++) { const a = rnd(0, TAU), v = rnd(40, 110); addPart(s.x + Math.cos(a) * 8, s.y + Math.sin(a) * 8 + 4, Math.cos(a) * v, Math.sin(a) * v * .6 - 10, rnd(.3, .6), rnd(2, 4.5), col); }
  if (kind === 'upgrade') for (let i = 0; i < 8; i++) addPart(s.x + rnd(-12, 12), s.y + rnd(-6, 10), rnd(-14, 14), rnd(-90, -40), rnd(.5, .9), rnd(1.5, 3), '#fff2b0');
  shake(kind === 'remove' ? 1.6 : 1.2);
}
function shake(a) { G.shake = Math.max(G.shake, a * SET.shake); }
function hitstop(t) { if (SET.hitstop) G.hitstop = Math.max(G.hitstop, t); }
function addDmgText(x, y, txt, col, big) { if (SET.dmgNums) addText(x, y, txt, col, big); }

function dropPickup(x, y, id, n, gear) {
  if (G.pickups.length > 160) G.pickups.shift();
  G.pickups.push({ x, y, id, n, gear: gear || null, t: 0, vx: rnd(-60, 60), vy: rnd(-60, 60) });
}
function dropTable(table, x, y, mult) {
  mult = mult || 1;
  for (const e of table) { if (Math.random() < e[1] * mult) dropPickup(x + rnd(-14, 14), y + rnd(-14, 14), e[0], rint(e[2], e[3])); }
}

// ---------- Bruit ----------
function makeNoise(x, y, R, fromPlayer) {
  R *= 1 - G.wInt * (G.wType === 'rain' || G.wType === 'storm' ? .3 : 0);
  for (const m of G.mobs) {
    if (m.dead || m.def.fac === 'wild') continue;
    const d = dist(x, y, m.x, m.y); if (d > R) continue;
    if (m.def.fac === 'undead') {
      if (m.state === 'idle' || m.state === 'wander' || m.state === 'investigate') { m.state = 'investigate'; m.ix = x + rnd(-30, 30); m.iy = y + rnd(-30, 30); m.it = 14; }
    } else if (m.state === 'idle') {
      if (fromPlayer && d < R * .8) { m.state = 'combat'; m.alertT = 8; } else { m.state = 'investigate'; m.ix = x; m.iy = y; m.it = 10; }
    }
  }
}

// ---------- Projectiles ----------
function spawnBullet(o) {
  G.bullets.push(Object.assign({ pierce: 0, hit: null, r: 3, team: 'f', kind: 'b', crit: false, px: o.x, py: o.y }, o));
}
function hostileMob(m) { return !m.dead && (m.def.fac !== 'wild' || m.aggro); }

function updateBullets(dt) {
  const bl = G.bullets;
  for (let i = bl.length - 1; i >= 0; i--) {
    const b = bl[i]; const sp = Math.hypot(b.vx, b.vy);
    const steps = Math.max(1, Math.ceil(sp * dt / 9)); const sdt = dt / steps; let dead = false;
    for (let s = 0; s < steps && !dead; s++) {
      b.px = b.x; b.py = b.y; b.x += b.vx * sdt; b.y += b.vy * sdt; b.left -= sp * sdt;
      if (b.left <= 0) { dead = true; break; }
      const tx = Math.floor(b.x / TS), ty = Math.floor(b.y / TS), sv = solidAt(tx, ty);
      if (sv === SO.WALL || (b.team === 'h' && (sv === SO.STRUCT || sv === SO.DOOR))) {
        if (b.team === 'h' && sv !== SO.WALL) { const st = G.structs.get(IDX(tx, ty)); if (st) damageStruct(st, b.dmg * .5); }
        if (!b.flame) for (let k = 0; k < 3; k++) addPart(b.x, b.y, rnd(-60, 60), rnd(-60, 60), .25, 1.5, '#ddd', 'dot');
        dead = true; break;
      }
      if (b.flame && (sv === SO.OBJ && (G.objs.get(IDX(tx, ty)) || {}).k === 'rock')) { dead = true; break; }
      if (b.team === 'f') {
        for (const m of G.mobs) {
          if (m.dead || Math.abs(m.x - b.x) > 40 || Math.abs(m.y - b.y) > 40) continue;
          if (b.hit && b.hit.has(m)) continue;
          if (Math.hypot(m.x - b.x, m.y - b.y) < m.r + b.r) {
            if (b.hit) b.hit.add(m);
            hurtMob(m, b.dmg, { kind: b.flame ? 'fire' : 'bullet', ang: Math.atan2(b.vy, b.vx), kb: b.flame ? 0 : 30, crit: b.crit, src: b.src || 'p' });
            if (b.flame) m.burn = Math.max(m.burn || 0, 3);
            if (b.pierce > 0) { b.pierce--; b.dmg *= .75; } else { dead = true; break; }
          }
        }
      } else {
        if (!P.dead && Math.hypot(P.x - b.x, P.y - b.y) < P.r + b.r) {
          if (b.kind === 'web') { P.slowT = 3; if (G.clock - (G.webMsg || 0) > 4) { msg('🕸️ Pris dans une toile ! (ralenti)', '#d8d8d8'); G.webMsg = G.clock; } }
          hurtPlayer(b.dmg, { kind: b.kind, ang: Math.atan2(b.vy, b.vx), infect: b.kind === 'acid' ? .25 : 0, cause: b.cause });
          dead = true; break;
        }
        for (const f of G.friends) {
          if (f.dead || Math.hypot(f.x - b.x, f.y - b.y) > f.r + b.r) continue;
          hurtFriend(f, b.dmg); dead = true; break;
        }
      }
    }
    if (dead) bl.splice(i, 1);
  }
}

// ---------- Dégâts ----------
function hurtMob(m, dmg, o) {
  if (m.dead) return; o = o || {};
  let d = dmg;
  if (m.def.fireproof && o.kind === 'fire') return;
  if (m.def.shield && (o.kind === 'bullet' || o.kind === 'melee') && o.ang !== undefined && Math.abs(angDiff(m.aang, o.ang + Math.PI)) < 1.05) { d *= .15; addText(m.x, m.y - m.r - 6, 'BLOQUÉ', '#9ac8ff'); for (let i = 0; i < 4; i++) addPart(m.x + Math.cos(m.aang) * m.r, m.y + Math.sin(m.aang) * m.r, rnd(-80, 80), rnd(-80, 80), .25, 2, '#cfe8ff', 'dot'); SFX.play('click', .7); }
  if (m.def.armor) d *= (o.kind === 'bullet' || o.kind === 'melee') ? (1 - m.def.armor) : (1 - m.def.armor * .5);
  if (o.crit) d *= 1.8;
  m.hp -= d; m.hitT = .12;
  addDmgText(m.x + rnd(-6, 6), m.y - m.r - 6, Math.round(d), o.crit ? '#ffd23a' : (o.kind === 'fire' ? '#ff9a3a' : '#fff'), o.crit);
  if (o.src && o.kind !== 'fire') { G.hitm = { t: .18, kill: false }; SFX.play('hitm', .6); if (o.crit) hitstop(.04); }
  if (o.kind !== 'fire') blood(m, o.crit ? 5 : 3, o.ang);
  if (o.kb) { const k = o.kb * (1 - (m.def.kbres || 0)); m.kx = (m.kx || 0) + Math.cos(o.ang) * k * 6; m.ky = (m.ky || 0) + Math.sin(o.ang) * k * 6; }
  const f = m.def.fac;
  if (f === 'undead') { if (m.state === 'idle' || m.state === 'wander' || m.state === 'investigate') { m.state = 'chase'; m.chaseT = 10; } }
  else if (f === 'wild') { m.aggro = m.def.ai !== 'prey'; m.fleeT = m.def.ai === 'prey' ? 6 : 0; m.state = m.def.ai === 'prey' ? 'flee' : 'chase'; m.fromAng = o.ang; }
  else { // humains
    m.state = 'combat'; m.alertT = 10;
    for (const n of G.mobs) if (!n.dead && n.def.fac === f && n.state === 'idle' && dist(n.x, n.y, m.x, m.y) < 320) { n.state = 'combat'; n.alertT = 8; }
  }
  if (o.kind === 'bullet' || o.kind === 'melee') SFX.play('hit', .5);
  if (m.hp <= 0) killMob(m, o);
}

function killMob(m, o) {
  if (m.dead) return; m.dead = true; o = o || {};
  const def = m.def, hostile = def.fac !== 'wild';
  blood(m, 10, o.ang); addDecal(m.x, m.y, rnd(8, 14), def.fac === 'undead' ? '#46661a' : '#7a1010');
  G.decals.push({ corpse: true, x: m.x, y: m.y, r: m.r, col: def.col, ang: m.aang || 0, life: 50, human: !!def.human }); if (G.decals.length > 300) G.decals.shift();
  if (o.src) { if (G.hitm) { G.hitm.kill = true; G.hitm.t = .24; } else G.hitm = { t: .24, kill: true }; SFX.play('killm', .7); if (def.hp >= 200 || def.boss) hitstop(.07); else hitstop(.02); }
  if (def.boss) { G.slowT = .9; }
  SFX.play(def.fac === 'undead' ? 'zdie' : 'thud', .6);
  const hunt = 1 + .15 * P.skills.hunt;
  if (def.fac === 'undead') dropTable(ZDROPS, m.x, m.y, 1 + G.day * .02);
  else if (def.human) {
    dropTable(HUMANDROPS, m.x, m.y, 1);
    if (def.caps) dropPickup(m.x, m.y, 'caps', rint(def.caps[0], def.caps[1]));
    if (def.boss || Math.random() < .07) { const rr = rollRare(m.def.fac === 'legion' ? 'legion' : 'camp', G.rng); if (rr) dropPickup(m.x, m.y, null, 1, { kind: rr.kind, id: rr.id }); }
  } else if (def.drops) {
    for (const e of def.drops) if (Math.random() < e[1] * (e[1] < 1 ? hunt : 1)) dropPickup(m.x + rnd(-10, 10), m.y + rnd(-10, 10), e[0], Math.round(rint(e[2], e[3]) * (hunt > 1 && Math.random() < hunt - 1 ? 1.5 : 1)));
  }
  if (def.explode) explode(m.x, m.y, 105, 38, { team: 'h', toxic: 1, cause: 'un Gonflé' });
  if (def.trail) addCloud(m.x, m.y, 55, 6, 'toxic');
  if (def.aura) addCloud(m.x, m.y, 60, 8, 'rad');
  if (def.ignite) { addFire(m.x, m.y, 46, 5); }
  if (m.t === 'queen') { banner('☠ REINE VAINCUE', 'La ruche s\'effondre…', '#ff8ad0'); for (const z of G.mobs) if (!z.dead && z.t && (z.t === 'crawler' || z.t === 'rats') && dist(z.x, z.y, m.x, m.y) < 900) z.hp = 1; }
  if (def.boss) {
    msg(def.n + ' vaincu !', '#ffd070'); shake(14);
    for (let i = 0; i < 3; i++) { const rr = rollRare(def.fac === 'legion' ? 'legion' : 'bunker', G.rng); if (rr) dropPickup(m.x + rnd(-20, 20), m.y + rnd(-20, 20), null, 1, { kind: rr.kind, id: rr.id }); }
    dropPickup(m.x, m.y, 'caps', rint(60, 120));
  }
  if (def.fac !== 'wild' || o.src) { G.stats.kills++; if (def.fac === 'undead') G.stats.zkills++; addXP(def.xp * (def.fac === 'undead' ? 1 : 1)); }
  if (def.fac === 'wild') addXP(def.xp);
  if (o.src && o.src !== 'p') { const pet = G.friends.find(f => f.id === o.src); if (pet && pet.kind === 'pet') petKill(pet); }
  questEvent('kill', m);
}

function hurtPlayer(dmg, o) {
  if (P.dead || G.god) return; o = o || {};
  if (P.veh && !o.pure && !o.ignoreVeh) { { const ab = vstat(P.veh).absorb; vehicleDamage(P.veh, dmg * ab); dmg *= 1 - ab; } if (P.dead) return; }
  const ar = armorValue();
  let d = o.pure ? dmg : dmg * (1 - ar / (ar + 30));
  if (P.painT > 0) d *= .8;
  P.hp -= d; P.hurtT = .3; P.lastHurt = G.clock;
  shake(Math.min(9, 2 + d / 4)); SFX.play('hurt', .8);
  addDmgText(P.x, P.y - 24, '-' + Math.round(d), '#ff6a5a');
  if (o.ang !== undefined && !o.pure) G.dmgInd.push({ a: o.ang + Math.PI, t: .9 });
  hitstop(.03);
  for (let i = 0; i < 4; i++) addPart(P.x, P.y, rnd(-90, 90), rnd(-90, 90), .4, 2, '#b01818');
  if (o.bleed && Math.random() < o.bleed && !P.bleed) { P.bleed = 1; msg('Vous saignez ! Utilisez un bandage (H).', '#ff6a5a'); }
  if (o.infect && Math.random() < o.infect && !P.infect) { P.infect = 1; msg('Vous êtes infecté ! Il vous faut des antibiotiques.', '#9acd32'); }
  if (P.hp <= 0) gameOver(o.cause || 'Les morts-vivants');
}
function hurtFriend(f, d) {
  if (f.dead) return;
  f.hp -= d; f.hitT = .12; addText(f.x, f.y - 18, Math.round(d), '#ff8a7a');
  for (let i = 0; i < 3; i++) addPart(f.x, f.y, rnd(-70, 70), rnd(-70, 70), .35, 2, '#a01818');
  if (f.hp <= 0) {
    f.dead = true;
    if (f.kind === 'pet') msg('Votre compagnon ' + f.name + ' est mort...', '#ff8a7a');
    else if (f.kind === 'recruit') msg('Votre garde ' + f.name + ' est tombé...', '#ff8a7a');
    else if (f.kind === 'guard') { f.respawn = G.clock + DAY_LEN * 0.8; }
    addDecal(f.x, f.y, 10, '#7a1010');
  }
}

// ---------- Nuages (gaz toxiques, radiations) ----------
function addCloud(x, y, r, life, kind) { if (G.clouds.length > 40) G.clouds.shift(); G.clouds.push({ x, y, r, life, max: life, kind, tick: 0 }); }
function updateClouds(dt) {
  for (let i = G.clouds.length - 1; i >= 0; i--) {
    const k = G.clouds[i]; k.life -= dt; k.tick -= dt;
    if (k.tick <= 0) {
      k.tick = .4;
      if (!P.dead && dist(k.x, k.y, P.x, P.y) < k.r + 8) { if (k.kind === 'rad') P.rad = Math.min(100, P.rad + 1.6 * (1 - radResist())); else { hurtPlayer(1.4, { pure: true, infect: .02, cause: 'un nuage toxique' }); P.slowT = Math.max(P.slowT, .6); } }
      for (const f of G.friends) if (!f.dead && dist(k.x, k.y, f.x, f.y) < k.r) hurtFriend(f, 1.2);
    }
    if (k.life <= 0) G.clouds.splice(i, 1);
  }
}

// ---------- Explosions, feu ----------
function explode(x, y, R, dmg, o) {
  o = o || {}; const team = o.team || 'f';
  SFX.play('explode', .8); shake(10);
  for (let i = 0; i < 26; i++) { const a = rnd(0, TAU), s = rnd(40, R * 3); addPart(x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(.3, .8), rnd(2, 5), o.toxic ? '#9acd32' : pick(['#ffb030', '#ff6020', '#444']), 'dot'); }
  G.blasts.push({ x, y, r: R, life: .35, max: .35, toxic: !!o.toxic });
  if (team === 'f') {
    for (const m of G.mobs) { if (m.dead) continue; const d = dist(x, y, m.x, m.y); if (d < R + m.r) hurtMob(m, dmg * (1 - d / (R + m.r) * .6), { kind: 'blast', ang: ang(x, y, m.x, m.y), kb: 120 }); }
  }
  if (!P.dead) { const d = dist(x, y, P.x, P.y); if (d < R) hurtPlayer((team === 'f' ? dmg * .6 : dmg * .5) * (1 - d / R * .6), { kind: 'blast', cause: o.cause || 'une explosion', infect: o.toxic ? .3 : 0, pure: false }); }
  for (const f of G.friends) { if (f.dead) continue; const d = dist(x, y, f.x, f.y); if (d < R) hurtFriend(f, dmg * .5 * (1 - d / R * .6)); }
  if (!o.toxic) {
    for (const s of Array.from(G.structs.values())) { const d = dist(x, y, s.x, s.y); if (d < R) damageStruct(s, dmg * 1.1 * (1 - d / R)); }
  }
  if (o.fire) addFire(x, y, R * .7, 6);
}
function addFire(x, y, r, life) { G.fires.push({ x, y, r, life, max: life, tick: 0 }); }
function updateFires(dt) {
  for (let i = G.fires.length - 1; i >= 0; i--) {
    const f = G.fires[i]; f.life -= dt; f.tick -= dt;
    if (Math.random() < dt * 30) addPart(f.x + rnd(-f.r, f.r) * .8, f.y + rnd(-f.r, f.r) * .8, rnd(-10, 10), rnd(-60, -20), rnd(.3, .7), rnd(2, 5), pick(['#ff7a1a', '#ffb02a', '#ff4a10']), 'fire');
    if (f.tick <= 0) {
      f.tick = .3;
      for (const m of G.mobs) if (!m.dead && dist(f.x, f.y, m.x, m.y) < f.r + m.r) m.burn = Math.max(m.burn || 0, 2.5);
      if (!P.dead && dist(f.x, f.y, P.x, P.y) < f.r) P.burn = Math.max(P.burn || 0, 2.5);
      for (const fr of G.friends) if (!fr.dead && dist(f.x, f.y, fr.x, fr.y) < f.r) hurtFriend(fr, 3);
    }
    if (f.life <= 0) G.fires.splice(i, 1);
  }
}
function updateBurning(dt) {
  for (const m of G.mobs) {
    if (m.dead || !(m.burn > 0)) continue;
    m.burn -= dt; m.burnTick = (m.burnTick || 0) - dt;
    if (Math.random() < dt * 14) addPart(m.x + rnd(-6, 6), m.y + rnd(-6, 6), rnd(-10, 10), rnd(-50, -20), .4, rnd(2, 4), pick(['#ff7a1a', '#ffb02a']), 'fire');
    if (m.burnTick <= 0) { m.burnTick = .5; hurtMob(m, 5 + G.day * .3, { kind: 'fire', ang: 0 }); }
  }
  if (P.burn > 0) {
    P.burn -= dt; P.burnTick = (P.burnTick || 0) - dt;
    if (P.burnTick <= 0) { P.burnTick = .5; hurtPlayer(3, { pure: true, cause: 'les flammes' }); }
    if (Math.random() < dt * 12) addPart(P.x + rnd(-6, 6), P.y + rnd(-6, 6), rnd(-10, 10), rnd(-50, -20), .4, rnd(2, 4), '#ff9a2a', 'fire');
  }
}

// ---------- Gadgets lancés ----------
const GADGET_ORDER = ['grenade', 'molotov', 'mine', 'flare', 'cracker'];
function gadgetList() { return GADGET_ORDER.filter(g => invCount(g) > 0); }
function useGadget() {
  const list = gadgetList(); if (!list.length) { msg('Aucun gadget (fabriquez-en à l\'établi).', '#aaa'); return; }
  P.gadSel = P.gadSel % list.length; const id = list[P.gadSel], kind = ITEMS[id].gad;
  if (P.gadCd > 0) return;
  P.gadCd = .5;
  if (kind === 'mine') {
    invTake(id, 1); G.mines.push({ x: P.x, y: P.y, arm: 1.6 }); msg('Mine posée (armée dans 1,5 s).', '#ffd070'); SFX.play('click'); return;
  }
  invTake(id, 1);
  let tx = G.mouse.x, ty = G.mouse.y; const d = dist(P.x, P.y, tx, ty), maxd = 380;
  if (d > maxd) { tx = P.x + (tx - P.x) / d * maxd; ty = P.y + (ty - P.y) / d * maxd; }
  // s'arrêter au mur
  const steps = 20; let lx = P.x, ly = P.y;
  for (let i = 1; i <= steps; i++) { const x = lerp(P.x, tx, i / steps), y = lerp(P.y, ty, i / steps); const s = solidAt(Math.floor(x / TS), Math.floor(y / TS)); if (s === 1 || s === 2 || s === 3 || s === 4) break; lx = x; ly = y; }
  G.thrown.push({ k: kind, x0: P.x, y0: P.y, x: P.x, y: P.y, x1: lx, y1: ly, t: 0, T: .5, state: 'fly', fuse: 1.3, life: 0 });
  SFX.play('swing', .6);
}
function updateThrown(dt) {
  for (let i = G.thrown.length - 1; i >= 0; i--) {
    const g = G.thrown[i];
    if (g.state === 'fly') {
      g.t += dt; const u = Math.min(1, g.t / g.T); g.x = lerp(g.x0, g.x1, u); g.y = lerp(g.y0, g.y1, u); g.z = Math.sin(u * Math.PI) * 26;
      if (u >= 1) {
        g.z = 0;
        if (g.k === 'molotov') { SFX.play('explode', .3); addFire(g.x, g.y, 62, 7); for (let k = 0; k < 10; k++) addPart(g.x, g.y, rnd(-80, 80), rnd(-80, 80), .5, 3, '#ffb02a', 'fire'); makeNoise(g.x, g.y, 300); G.thrown.splice(i, 1); }
        else if (g.k === 'flare') { g.state = 'flare'; g.life = 75; }
        else if (g.k === 'cracker') { g.state = 'cracker'; g.life = 9; g.tick = 0; }
        else g.state = 'fuse';
      }
    } else if (g.state === 'fuse') {
      g.fuse -= dt; if (Math.random() < dt * 20) addPart(g.x, g.y - 4, rnd(-20, 20), rnd(-40, -10), .3, 1.5, '#ffd070');
      if (g.fuse <= 0) { explode(g.x, g.y, 125, 170, { team: 'f', cause: 'votre grenade' }); makeNoise(g.x, g.y, 900); G.thrown.splice(i, 1); }
    } else if (g.state === 'flare') {
      g.life -= dt; if (Math.random() < dt * 12) addPart(g.x, g.y, rnd(-15, 15), rnd(-70, -30), .5, 1.5, '#ff6a6a', 'fire');
      if (g.life <= 0) G.thrown.splice(i, 1);
    } else if (g.state === 'cracker') {
      g.life -= dt; g.tick -= dt;
      if (g.tick <= 0) { g.tick = .55; SFX.play('click', 1); for (let k = 0; k < 6; k++) addPart(g.x, g.y, rnd(-90, 90), rnd(-90, 90), .25, 2, '#ffd23a'); makeNoise(g.x, g.y, 950); }
      if (g.life <= 0) G.thrown.splice(i, 1);
    }
  }
  for (let i = G.mines.length - 1; i >= 0; i--) {
    const m = G.mines[i]; m.arm -= dt; if (m.arm > 0) continue;
    for (const e of G.mobs) {
      if (e.dead || e.def.fac === 'wild' && !e.aggro || e.def.ai === 'prey') continue;
      if (dist(m.x, m.y, e.x, e.y) < 26 + e.r) { explode(m.x, m.y, 115, 190, { team: 'f', cause: 'votre mine' }); makeNoise(m.x, m.y, 900); G.mines.splice(i, 1); break; }
    }
  }
}

// ---------- Structures ----------
const WALLTIER = ['wall_wood', 'wall_stone', 'wall_metal'];
function baseAt(x, y) {
  for (const p of G.pois) if (p.owned && dist(x, y, p.cx, p.cy) < p.baseR) return p;
  return null;
}
function structCount(type, poi) {
  let n = 0; for (const s of G.structs.values()) if (s.type === type && (!poi || dist(s.x, s.y, poi.cx, poi.cy) < poi.baseR)) n++;
  return n;
}
function checkPlace(type, tx, ty) {
  const def = STRUCTS[type];
  if (!inb(tx, ty)) return 'Hors carte';
  const i = IDX(tx, ty);
  if (def.plan && !P.known[def.plan]) return 'Plan requis : ' + PLAN_NAMES[def.plan];
  if (dist(P.x, P.y, tx * TS + 16, ty * TS + 16) > 230) return 'Trop loin';
  if (G.tiles[i] === T.WATER) return 'Sur l\'eau';
  if (G.village && dist(tx * TS, ty * TS, G.village.cx, G.village.cy) < G.village.w * TS / 2 + 40) return 'Zone du fort';
  const ex = G.structs.get(i);
  if (ex) {
    const a = WALLTIER.indexOf(ex.type), b = WALLTIER.indexOf(type);
    if (!(a >= 0 && b > a)) return 'Case occupée';
  } else {
    if (G.solid[i] !== 0 || G.objs.has(i)) return 'Case occupée';
  }
  if (def.solid) {
    const cx = tx * TS + 16, cy = ty * TS + 16;
    if (dist(P.x, P.y, cx, cy) < 26) return 'Vous gênez le passage';
    for (const m of G.mobs) if (!m.dead && dist(m.x, m.y, cx, cy) < m.r + 16) return 'Occupé';
    for (const f of G.friends) if (!f.dead && dist(f.x, f.y, cx, cy) < f.r + 16) return 'Occupé';
  }
  if (type === 'turret') {
    const b = baseAt(tx * TS + 16, ty * TS + 16);
    if (b) { if (structCount('turret', b) >= BASE_LEVELS[b.lvl].turrets) return 'Limite de tourelles (améliorez la base)'; }
    else if (structCount('turret') - structsInBases('turret') >= 2) return 'Max 2 tourelles hors base';
  }
  if (!hasItems(costOf(def.cost))) return 'Ressources insuffisantes';
  return null;
}

function structsInBases(type) {
  let n = 0; for (const s of G.structs.values()) if (s.type === type && baseAt(s.x, s.y)) n++; return n;
}
function placeStruct(type, tx, ty, free) {
  const def = STRUCTS[type], i = IDX(tx, ty);
  if (!free) payItems(costOf(def.cost));
  const old = G.structs.get(i); if (old) removeStructRaw(old);
  const s = { age: free ? 1 : 0, type, tx, ty, x: tx * TS + 16, y: ty * TS + 16, hp: def.hp, max: def.hp, ang: 0, flash: 0, cd: 0 };
  if (type === 'turret') { s.ammo = 0; s.ang = rnd(0, TAU); }
  if (type === 'chest') s.stash = {};
  if (type === 'plot') s.plant = 0;
  if (type === 'barrel') s.water = 0;
  G.structs.set(i, s);
  if (def.solid) G.solid[i] = def.solid === 4 ? SO.DOOR : SO.STRUCT;
  SFX.play('build'); G.flowDirty = true;
  if (!free) {
    G.stats.built++; questEvent('build', s); tutEvent('build'); buildFx(s, old ? 'upgrade' : 'place');
    const cs = costOf(def.cost); let n = 0; for (const k in cs) { if (n++ > 2) break; addText(s.x + (n - 2) * 14, s.y - 18 - n * 9, '-' + cs[k] + ' ' + ((ITEMS[k] || {}).i || k), '#ffd9a0'); }
    if (old) addText(s.x, s.y - 34, 'AMÉLIORÉ !', '#ffe28a', true);
  }
  return s;
}
function removeStructRaw(s) {
  const i = IDX(s.tx, s.ty); G.structs.delete(i);
  if (G.solid[i] === SO.STRUCT || G.solid[i] === SO.DOOR) G.solid[i] = 0;
  G.flowDirty = true;
}
function dismantle(s) {
  const def = STRUCTS[s.type]; const frac = .6 * (s.hp / s.max);
  for (const k in def.cost) giveItem(k, Math.max(0, Math.floor(def.cost[k] * frac)), true);
  if (s.stash) for (const k in s.stash) giveItem(k, s.stash[k], true);
  buildFx(s, 'remove'); addText(s.x, s.y - 20, 'démonté', '#cfc4a8'); removeStructRaw(s); SFX.play('build', .8);
}
function damageStruct(s, d) {
  s.hp -= d; s.flash = .15;
  if (Math.random() < .5) addPart(s.x + rnd(-12, 12), s.y + rnd(-12, 12), rnd(-50, 50), rnd(-50, -10), .4, 2, '#a08050');
  if (s.hp <= 0) {
    for (let k = 0; k < 8; k++) addPart(s.x, s.y, rnd(-100, 100), rnd(-100, 100), .6, rnd(2, 4), '#8a6a40');
    if (s.stash) for (const k in s.stash) dropPickup(s.x + rnd(-10, 10), s.y + rnd(-10, 10), k, s.stash[k]);
    removeStructRaw(s); SFX.play('thud', .7);
    if (baseAt(s.x, s.y)) msg('Une structure de votre base est détruite !', '#ff8a7a');
  }
}

function updateStructs(dt) {
  for (const s of G.structs.values()) {
    if (s.flash > 0) s.flash -= dt;
    if (s.type === 'turret') updateTurret(s, dt);
    else if (s.type === 'barrel') { if (s.water < 6) s.water = Math.min(6, s.water + dt / 45 * (G.wType === 'rain' || G.wType === 'storm' ? 1 + 3 * G.wInt : 1)); }
    else if (s.type === 'plot' && s.plant === 1) { if (G.wType === 'rain' || G.wType === 'storm') s.t0 -= dt * .5 * G.wInt; if (G.clock - s.t0 > DAY_LEN * 1.2) s.plant = 2; }
    else if (s.type === 'spikes') {
      s.cd -= dt;
      if (s.cd <= 0) for (const m of G.mobs) if (!m.dead && m.def.fac !== 'wild' && dist(m.x, m.y, s.x, s.y) < 16 + m.r * .5) { hurtMob(m, 12, { kind: 'melee', ang: 0 }); s.cd = .5; s.hp -= 2; if (s.hp <= 0) { damageStruct(s, 999); } break; }
    }
  }
}
function updateTurret(s, dt) {
  s.cd -= dt;
  let best = null, bd = 340;
  for (const m of G.mobs) {
    if (m.dead || !hostileMob(m)) continue;
    const d = dist(s.x, s.y, m.x, m.y); if (d < bd && los(s.x, s.y, m.x, m.y)) { bd = d; best = m; }
  }
  if (!best) { s.target = null; return; }
  const a = ang(s.x, s.y, best.x, best.y);
  s.ang += clamp(angDiff(s.ang, a), -8 * dt, 8 * dt);
  if (s.ammo > 0 && s.cd <= 0 && Math.abs(angDiff(s.ang, a)) < .12) {
    s.cd = .2; s.ammo--;
    const aa = s.ang + rnd(-.05, .05);
    spawnBullet({ x: s.x + Math.cos(aa) * 16, y: s.y + Math.sin(aa) * 16, vx: Math.cos(aa) * 950, vy: Math.sin(aa) * 950, dmg: 15 + G.day * .3, left: 340, team: 'f', src: 't', col: '#ffe070' });
    s.flashT = .05; SFX.play('smg', .35); makeNoise(s.x, s.y, 520);
  }
}
