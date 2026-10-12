'use strict';
// ===== Joueur, ennemis, animaux, alliés =====

function newPlayer() {
  const p = {
    x: G.spawn.x, y: G.spawn.y, r: 12, hp: 100, hun: 100, thi: 100, stam: 100, ang: 0, vx: 0, vy: 0,
    inv: {}, gear: [], slots: [null, null, null, null, null], sel: 0, armor: { head: null, body: null, feet: null }, pack: 0,
    known: {}, skills: { str: 0, end: 0, aim: 0, craft: 0, hunt: 0, carry: 0 }, sp: 0, lvl: 1, xp: 0,
    bleed: 0, infect: 0, sick: 0, burn: 0, painT: 0, cd: 0, reload: 0, reloading: false, bloom: 0, swing: 0, swingA: 0, hurtT: 0,
    gadSel: 0, gadCd: 0, rep: 0, dead: false, flashT: 0, useCd: 0, noiseT: 0, sprint: false, moving: false, healCd: 0, mealCd: 0, lastHurt: -99,
  };
  return p;
}
function giveStart() {
  P.hp = maxHP(); P.stam = maxStam();
  giveWeapon(makeWeapon('knife'), true);
  invAdd('bandage', 1); invAdd('bottle_clean', 1); invAdd('canned', 1); invAdd('cloth', 2);
}

// ---------- Mobs ----------
function spawnMob(type, x, y, o) {
  const def = MOBS[type]; o = o || {};
  const dm = difficultyMul(), scale = 1 + .045 * (G.day - 1) + (o.far ? o.far : 0);
  const m = {
    t: type, def, x, y, r: def.r, hp: def.hp * dm.hp * (def.fac === 'wild' ? 1 : scale), maxhp: 0, spd: def.spd * (1 + rnd(-.08, .08)),
    dmg: def.dmg * dm.dmg * (1 + .02 * (G.day - 1)), state: o.state || 'idle', cd: rnd(0, 1), hitT: 0, burn: 0, kx: 0, ky: 0, dead: false,
    homeX: x, homeY: y, poi: o.poi === undefined ? null : o.poi, wx: x, wy: y, wt: rnd(0, 3), aang: rnd(0, TAU), anim: rnd(0, 6), losT: 0, los: false,
    horde: !!o.horde, assault: o.assault || null, chaseT: 0, aggro: false, shootCd: rnd(0, 2), alertT: 0, special: rnd(2, 6), ambient: !!o.ambient, strafe: Math.random() < .5 ? 1 : -1, name: null,
  };
  m.maxhp = m.hp;
  if (o.hpMul) { m.hp *= o.hpMul; m.maxhp = m.hp; }
  G.mobs.push(m); return m;
}

function pickZombieType(night) {
  const d = G.day, r = Math.random();
  const t = [['walker', 60]];
  t.push(['runner', d >= 2 ? 14 + (night ? 12 : 0) : 0]);
  t.push(['spitter', d >= 3 ? 7 + d : 0]);
  t.push(['screamer', d >= 3 ? 4 + (night ? 4 : 0) : 0]);
  t.push(['bloater', d >= 4 ? 5 + d * .6 : 0]);
  t.push(['brute', d >= 5 ? 3 + d * .5 : 0]);
  t.push(['zsoldier', d >= 7 ? 4 + d * .4 : 0]);
  return G.rng.wpick(t.filter(e => e[1] > 0));
}

function mobTarget(m, range) { // cible la plus proche : joueur ou allié
  let best = null, bd = range;
  if (!P.dead) { const d = dist(m.x, m.y, P.x, P.y); if (d < bd) { bd = d; best = P; } }
  for (const f of G.friends) { if (f.dead) continue; const d = dist(m.x, m.y, f.x, f.y); if (d < bd) { bd = d; best = f; } }
  return best;
}

// Déplacement avec évitement : direct si ligne de vue, sinon champ de flux
function steer(m, tx, ty, speed, dt, useFlow) {
  let dx = tx - m.x, dy = ty - m.y; const d = Math.hypot(dx, dy) || 1;
  m.losT -= dt;
  if (m.losT <= 0) { m.losT = .25 + Math.random() * .1; m.los = d < 600 && los(m.x, m.y, tx, ty); }
  let vx = dx / d, vy = dy / d;
  if (!m.los && d > 40) {
    const fl = m.assault ? G.flowB : G.flowP; const dir = fl && fl.dir(m.x, m.y);
    if (dir) { vx = dir[0]; vy = dir[1]; m.flowing = true; } else m.flowing = false;
  }
  // léger lissage
  m.mvx = lerp(m.mvx === undefined ? vx : m.mvx, vx, Math.min(1, dt * 10)); m.mvy = lerp(m.mvy === undefined ? vy : m.mvy, vy, Math.min(1, dt * 10));
  const hit = moveEnt(m, m.mvx * speed * dt, m.mvy * speed * dt, false);
  if (hit) {
    // attaquer la structure qui bloque
    const ax = Math.floor((m.x + m.mvx * (m.r + 10)) / TS), ay = Math.floor((m.y + m.mvy * (m.r + 10)) / TS);
    for (const [ox, oy] of [[0, 0], [Math.sign(m.mvx), 0], [0, Math.sign(m.mvy)]]) {
      const s = G.structs.get(IDX(ax + ox, ay + oy));
      if (s && STRUCTS[s.type].solid) { m.breaking = s; break; }
    }
    // glisser le long du mur
    if (hit & 1) moveEnt(m, 0, Math.sign(m.mvy || 1) * speed * dt * .7, false);
    if (hit & 2) moveEnt(m, Math.sign(m.mvx || 1) * speed * dt * .7, 0, false);
  }
  m.aang = Math.atan2(m.mvy, m.mvx);
  return d;
}
function breakStructs(m, dt) {
  const s = m.breaking; if (!s) return;
  if (!G.structs.has(IDX(s.tx, s.ty)) || dist(m.x, m.y, s.x, s.y) > m.r + 42) { m.breaking = null; return; }
  m.cd -= dt;
  if (m.cd <= 0) { m.cd = .9; damageStruct(s, (m.dmg || 8) * (m.def.kbres > .8 ? 3 : m.t === 'brute' ? 3 : 1.4)); SFX.play('thud', .4); }
}

function updateMob(m, dt) {
  m.anim += dt * (m.spd / 40);
  if (m.hitT > 0) m.hitT -= dt;
  if (m.kx || m.ky) { moveEnt(m, m.kx * dt, m.ky * dt, false); m.kx *= Math.max(0, 1 - dt * 9); m.ky *= Math.max(0, 1 - dt * 9); if (Math.abs(m.kx) < 3 && Math.abs(m.ky) < 3) { m.kx = 0; m.ky = 0; } }
  m.breaking = m.breaking && G.structs.has(IDX(m.breaking.tx, m.breaking.ty)) ? m.breaking : null;
  const f = m.def.fac;
  if (f === 'undead') updateUndead(m, dt);
  else if (m.def.human) updateHuman(m, dt);
  else updateAnimal(m, dt);
}

function updateUndead(m, dt) {
  const def = m.def, night = isNight();
  const sight = (night ? 330 : 400) * (P.crouch ? .6 : 1);
  let tgt = null;
  if (m.horde || m.assault) tgt = mobTarget(m, 1e5); else tgt = mobTarget(m, sight);
  // vision : ligne de vue ou proximité (odorat)
  if (tgt && !m.horde && !m.assault) { const d = dist(m.x, m.y, tgt.x, tgt.y); if (d > 120 && !los(m.x, m.y, tgt.x, tgt.y)) tgt = d < 160 ? tgt : null; }
  if (tgt) {
    if (m.state !== 'chase') {
      m.state = 'chase';
      if (def.scream && !m.screamed) { m.screamed = true; screamAlert(m); }
    }
    m.chaseT = 8;
  }
  if (m.assault && !tgt) { // vers le drapeau
    const p = G.pois[m.assault]; if (p && p.owned) {
      const d = steer(m, p.flag.x, p.flag.y, m.spd * 1.05, dt);
      if (d < 56) { m.cd -= dt; if (m.cd <= 0) { m.cd = 1; damageFlag(p, m.dmg * .45 * (def.kbres ? 2 : 1)); } }
      breakStructs(m, dt); return;
    }
  }
  if (m.state === 'chase') {
    if (!tgt) { m.chaseT -= dt; if (m.chaseT <= 0) m.state = 'wander'; wanderMob(m, dt, .6); return; }
    const d = dist(m.x, m.y, tgt.x, tgt.y);
    if (def.ranged) { // cracheur : garde ses distances
      if (d > 230 || !los(m.x, m.y, tgt.x, tgt.y)) steer(m, tgt.x, tgt.y, m.spd, dt);
      else if (d < 150) { const a = ang(tgt.x, tgt.y, m.x, m.y); moveEnt(m, Math.cos(a) * m.spd * dt, Math.sin(a) * m.spd * dt, false); }
      m.shootCd -= dt;
      if (m.shootCd <= 0 && d < 330 && los(m.x, m.y, tgt.x, tgt.y)) {
        m.shootCd = 2.2; const a = ang(m.x, m.y, tgt.x, tgt.y) + rnd(-.06, .06);
        spawnBullet({ x: m.x, y: m.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, dmg: m.dmg, left: 420, team: 'h', kind: 'acid', col: '#9acd32', r: 5, cause: 'un Cracheur' });
        SFX.play('swing', .4);
      }
      m.aang = ang(m.x, m.y, tgt.x, tgt.y); return;
    }
    if (def.scream && d < 220) { // la hurleuse garde ses distances
      const a = ang(tgt.x, tgt.y, m.x, m.y); moveEnt(m, Math.cos(a) * m.spd * dt, Math.sin(a) * m.spd * dt, false);
      m.special -= dt; if (m.special <= 0) { m.special = rnd(7, 11); screamAlert(m); }
      m.aang = ang(m.x, m.y, tgt.x, tgt.y);
      if (d < 40) zombieStrike(m, tgt, dt); return;
    }
    if (def.boss) bossLogic(m, tgt, d, dt);
    const reach = m.r + (tgt === P ? P.r : tgt.r) + 6;
    if (d > reach) steer(m, tgt.x, tgt.y, m.spd * (m.charge > 0 ? 3 : 1), dt);
    else { m.aang = ang(m.x, m.y, tgt.x, tgt.y); zombieStrike(m, tgt, dt); }
    breakStructs(m, dt);
    if (m.horde && !tgt) m.horde = false;
  } else if (m.state === 'investigate') {
    m.it -= dt; const d = steer(m, m.ix, m.iy, m.spd * .8, dt);
    if (d < 24 || m.it <= 0) { m.state = 'wander'; }
    breakStructs(m, dt);
  } else wanderMob(m, dt, def.spd > 90 ? .5 : .4);
  if (m.state === 'chase' || m.state === 'investigate') { m.groan = (m.groan || rnd(2, 8)) - dt; if (m.groan <= 0) { m.groan = rnd(4, 10); if (dist(m.x, m.y, P.x, P.y) < 500) SFX.play('groan', Math.max(.2, 1 - dist(m.x, m.y, P.x, P.y) / 500)); } }
}
function wanderMob(m, dt, f) {
  m.wt -= dt;
  if (m.wt <= 0) {
    m.wt = rnd(2, 6);
    if (m.poi !== null || m.def.human) { const a = rnd(0, TAU), r = rnd(0, 110); m.wx = m.homeX + Math.cos(a) * r; m.wy = m.homeY + Math.sin(a) * r; }
    else { const a = rnd(0, TAU), r = rnd(30, 140); m.wx = m.x + Math.cos(a) * r; m.wy = m.y + Math.sin(a) * r; }
    m.paused = Math.random() < .35;
  }
  if (m.paused) return;
  const d = dist(m.x, m.y, m.wx, m.wy); if (d < 10) return;
  const a = ang(m.x, m.y, m.wx, m.wy);
  moveEnt(m, Math.cos(a) * m.spd * f * dt, Math.sin(a) * m.spd * f * dt, false); m.aang = a;
}
function screamAlert(m) {
  SFX.play('screech', .9); addText(m.x, m.y - 24, '!!!', '#ffb0d0', true);
  for (const z of G.mobs) if (!z.dead && z.def.fac === 'undead' && dist(z.x, z.y, m.x, m.y) < 700 && z.state !== 'chase') { z.state = 'investigate'; z.ix = P.x + rnd(-80, 80); z.iy = P.y + rnd(-80, 80); z.it = 18; }
}
function zombieStrike(m, tgt, dt) {
  m.cd -= dt;
  if (m.cd <= 0) {
    m.cd = m.def.boss ? .9 : 1; m.lunge = .15;
    if (tgt === P) {
      hurtPlayer(m.dmg, { kind: 'melee', ang: m.aang, bleed: m.t === 'brute' || m.def.boss ? .35 : .08, infect: m.def.boss ? .2 : .07, cause: m.def.n });
      if (m.def.kbres > .5 || m.t === 'brute') { P.vx += Math.cos(m.aang) * 260; P.vy += Math.sin(m.aang) * 260; }
    } else hurtFriend(tgt, m.dmg);
    SFX.play('hit', .4);
  }
}
function bossLogic(m, tgt, d, dt) {
  m.special -= dt;
  if (m.charge > 0) { m.charge -= dt; return; }
  if (m.special <= 0) {
    if (Math.random() < .5 && d > 120) { m.charge = .9; m.special = rnd(4, 6); shake(5); addText(m.x, m.y - 40, 'CHARGE !', '#ff5050', true); }
    else { m.special = rnd(5, 8); shake(12); SFX.play('explode', .5); G.blasts.push({ x: m.x, y: m.y, r: 150, life: .4, max: .4, slam: true }); if (dist(m.x, m.y, P.x, P.y) < 150) hurtPlayer(m.dmg * .7, { kind: 'blast', cause: m.def.n }); for (const f of G.friends) if (dist(m.x, m.y, f.x, f.y) < 150) hurtFriend(f, m.dmg); }
  }
}

function humanGun(m) { const w = WEAPONS[m.def.gun]; return w; }
function updateHuman(m, dt) {
  const def = m.def, w = WEAPONS[def.gun];
  const range = Math.min(w.range, 520);
  if (m.alertT > 0) m.alertT -= dt;
  let tgt = mobTarget(m, range + 40);
  if (tgt && !los(m.x, m.y, tgt.x, tgt.y)) tgt = null;
  if (tgt && m.state === 'idle') { m.state = 'combat'; m.alertT = 8; for (const n of G.mobs) if (!n.dead && n.def.fac === def.fac && n.state === 'idle' && dist(n.x, n.y, m.x, m.y) < 300) { n.state = 'combat'; n.alertT = 8; } }
  if (m.assault && !tgt) { const p = G.pois[m.assault]; if (p && p.owned) { const d = steer(m, p.flag.x, p.flag.y, m.spd, dt); if (d < 200) { m.cd -= dt; if (m.cd <= 0) { m.cd = 1; damageFlag(p, 8); } } breakStructs(m, dt); return; } }
  if (m.state === 'combat') {
    if (tgt) m.alertT = 8; else m.alertT -= dt * 0.5;
    const target = tgt || mobTarget(m, 700);
    if (!target) { m.state = m.alertT <= 0 ? 'idle' : 'combat'; if (m.state === 'idle') { m.homeBack = true; } wanderMob(m, dt, .5); return; }
    const d = dist(m.x, m.y, target.x, target.y), pref = range * .55;
    if (m.alertT <= 0 && dist(m.x, m.y, m.homeX, m.homeY) > 600 && m.poi !== null) { m.state = 'idle'; return; }
    if (!tgt || d > pref + 50) steer(m, target.x, target.y, m.spd, dt);
    else if (d < pref - 70) { const a = ang(target.x, target.y, m.x, m.y); moveEnt(m, Math.cos(a) * m.spd * .8 * dt, Math.sin(a) * m.spd * .8 * dt, false); }
    else { const a = ang(m.x, m.y, target.x, target.y) + Math.PI / 2 * m.strafe; moveEnt(m, Math.cos(a) * m.spd * .5 * dt, Math.sin(a) * m.spd * .5 * dt, false); if (Math.random() < dt * .5) m.strafe *= -1; }
    m.aang = ang(m.x, m.y, target.x, target.y);
    m.shootCd -= dt;
    if (tgt && m.shootCd <= 0 && d < range) {
      m.shootCd = Math.max(w.rate, .35) * (w.auto ? 3.2 : 1.6) * rnd(.9, 1.4); m.flashT = .06;
      const n = w.pellets || 1, acc = (w.spr || .05) * def.acc * 1.6 + d / 3000;
      for (let k = 0; k < n; k++) {
        const a = m.aang + rnd(-acc, acc);
        spawnBullet({ x: m.x + Math.cos(m.aang) * 16, y: m.y + Math.sin(m.aang) * 16, vx: Math.cos(a) * w.spd * .75, vy: Math.sin(a) * w.spd * .75, dmg: w.dmg * (difficultyMul().dmg) * .62 * (1 + .015 * G.day), left: w.range * 1.1, team: 'h', col: '#ffb070', cause: def.n, pierce: 0 });
      }
      SFX.play(w.pellets ? 'shotgun' : (w.auto ? 'smg' : 'pistol'), clamp(1 - d / 900, .15, .6));
    }
  } else if (m.state === 'investigate') {
    m.it -= dt; const d = steer(m, m.ix, m.iy, m.spd * .7, dt); m.aang = ang(m.x, m.y, m.ix, m.iy);
    if (tgt) m.state = 'combat'; else if (d < 30 || m.it <= 0) m.state = 'idle';
  } else { // idle
    wanderMob(m, dt, .35);
    if (m.poi === null && !m.assault && dist(m.x, m.y, P.x, P.y) > 1600) m.dead = true, m.silent = true;
  }
}

function updateAnimal(m, dt) {
  const def = m.def, dP = dist(m.x, m.y, P.x, P.y);
  if (def.ai === 'prey') {
    if (m.state === 'flee' || dP < 200) {
      const a = (m.state === 'flee' && m.fromAng !== undefined && dP > 300) ? m.fromAng : ang(P.x, P.y, m.x, m.y);
      moveEnt(m, Math.cos(a) * m.spd * dt, Math.sin(a) * m.spd * dt, false); m.aang = a;
      if (m.fleeT > 0) { m.fleeT -= dt; if (m.fleeT <= 0) m.state = 'idle'; }
    } else wanderMob(m, dt, .35);
    return;
  }
  // prédateurs / neutres
  const sees = !P.dead && ((def.ai === 'predator' && !m.tamingGrace && dP < 270 && los(m.x, m.y, P.x, P.y)) || m.aggro);
  if (sees) {
    if (!m.aggro && def.ai === 'predator') { m.aggro = true; }
    const reach = m.r + P.r + 6;
    if (dP > reach) steer(m, P.x, P.y, m.spd, dt); else { m.aang = ang(m.x, m.y, P.x, P.y); m.cd -= dt; if (m.cd <= 0) { m.cd = 1; m.lunge = .15; hurtPlayer(m.dmg, { kind: 'melee', ang: m.aang, bleed: .15, cause: def.n }); } }
    if (dP > 750) { m.aggro = false; }
  } else wanderMob(m, dt, .3);
}

// ---------- Alliés ----------
function nearestHostile(x, y, range, needLos) {
  let best = null, bd = range;
  for (const m of G.mobs) {
    if (m.dead || !hostileMob(m)) continue;
    const d = dist(x, y, m.x, m.y); if (d < bd && (!needLos || los(x, y, m.x, m.y))) { bd = d; best = m; }
  }
  return best;
}
function makePet(m) {
  const d = m.def, pd = d.pet;
  const f = { kind: 'pet', id: 'pet' + (G.nextId = (G.nextId || 0) + 1), sp: m.t, name: d.n, x: m.x, y: m.y, r: d.r, hp: pd.hp, maxhp: pd.hp, dmg: pd.dmg, spd: pd.spd, col: d.col, lvl: 1, kills: 0, cd: 0, hitT: 0, dead: false, anim: 0, aang: 0, def: d, tx: 0, ty: 0 };
  G.friends.push(f); return f;
}
function petKill(p) {
  p.kills++;
  if (p.kills >= p.lvl * 6) { p.lvl++; p.maxhp *= 1.15; p.hp = p.maxhp; p.dmg *= 1.15; msg(p.name + ' passe niveau ' + p.lvl + ' !', '#ffe070'); }
}
const RECRUIT_NAMES = ['Théo', 'Nadia', 'Karim', 'Léa', 'Marc', 'Inès', 'Hugo', 'Zoé', 'Yanis', 'Camille', 'Rémi', 'Sofia'];
function makeRecruit(gun, x, y) {
  const f = { kind: 'recruit', id: 'rec' + (G.nextId = (G.nextId || 0) + 1), name: pick(RECRUIT_NAMES), x, y, r: 11, hp: 100, maxhp: 100, gun, spd: 105, col: '#3a7ab0', cd: 0, shootCd: 0, hitT: 0, dead: false, anim: 0, aang: 0, mode: 'follow', def: { n: 'Garde' } };
  G.friends.push(f); return f;
}
function makeGuard(x, y, gun) {
  const f = { kind: 'guard', id: 'gd' + (G.nextId = (G.nextId || 0) + 1), name: 'Garde du fort', x, y, hx: x, hy: y, r: 11, hp: 140, maxhp: 140, gun, spd: 95, col: '#4a8a5a', cd: 0, shootCd: 0, hitT: 0, dead: false, anim: 0, aang: 0, def: { n: 'Garde' } };
  G.friends.push(f); return f;
}

function updateFriend(f, dt) {
  if (f.hitT > 0) f.hitT -= dt;
  f.anim += dt * 4;
  if (f.kind === 'pet') updatePet(f, dt);
  else if (f.kind === 'recruit' || f.kind === 'guard') updateGunner(f, dt);
}
function followPoint(f, hx, hy, dt, slack, speedMul) {
  const d = dist(f.x, f.y, hx, hy);
  if (d > slack) {
    const a = ang(f.x, f.y, hx, hy), sp = f.spd * (speedMul || 1) * (d > 300 ? 1.3 : 1);
    const hit = moveEnt(f, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt, true);
    if (hit) { moveEnt(f, 0, Math.sign(Math.sin(a) || 1) * sp * dt, true); moveEnt(f, Math.sign(Math.cos(a) || 1) * sp * dt, 0, true); }
    f.aang = a;
    f.stuck = hit ? (f.stuck || 0) + dt : 0;
    if (f.stuck > 2 || d > 900) { f.x = hx + rnd(-30, 30); f.y = hy + rnd(-30, 30); f.stuck = 0; }
  }
  return d;
}
function updatePet(f, dt) {
  if (f.hp < f.maxhp && G.clock - (f.lastHit || 0) > 5) f.hp = Math.min(f.maxhp, f.hp + dt * 1.2);
  const tgt = nearestHostile(f.x, f.y, 300, false);
  const dP = dist(f.x, f.y, P.x, P.y);
  if (tgt && dP < 520 && f.mode !== 'stay') {
    const d = dist(f.x, f.y, tgt.x, tgt.y);
    if (d > f.r + tgt.r + 4) { const a = ang(f.x, f.y, tgt.x, tgt.y); moveEnt(f, Math.cos(a) * f.spd * dt, Math.sin(a) * f.spd * dt, true); f.aang = a; }
    else {
      f.cd -= dt; f.aang = ang(f.x, f.y, tgt.x, tgt.y);
      if (f.cd <= 0) { f.cd = .7; f.lunge = .12; hurtMob(tgt, f.dmg, { kind: 'melee', ang: f.aang, kb: 40, src: f.id }); }
    }
  } else if (f.mode !== 'stay') followPoint(f, P.x + Math.cos(f.anim * .1 + f.id.length) * 50, P.y + Math.sin(f.anim * .1) * 50, dt, 60);
}
function updateGunner(f, dt) {
  const w = WEAPONS[f.gun];
  if (f.hp < f.maxhp && G.clock - (f.lastHit || 0) > 6) f.hp = Math.min(f.maxhp, f.hp + dt * 1.5);
  const tgt = nearestHostile(f.x, f.y, Math.min(w.range, 480), true);
  let hx, hy, slack;
  if (f.kind === 'guard') { hx = f.hx; hy = f.hy; slack = 70; }
  else if (f.mode === 'guard' && f.base !== undefined && G.pois[f.base] && G.pois[f.base].owned) { const b = G.pois[f.base]; hx = b.flag.x + (f.id.length % 4 - 1.5) * 40; hy = b.flag.y + 50; slack = 100; }
  else { hx = P.x; hy = P.y; slack = 90; }
  if (tgt) {
    const d = dist(f.x, f.y, tgt.x, tgt.y); f.aang = ang(f.x, f.y, tgt.x, tgt.y);
    if (d < 120) { const a = ang(tgt.x, tgt.y, f.x, f.y); moveEnt(f, Math.cos(a) * f.spd * dt, Math.sin(a) * f.spd * dt, true); }
    else if (dist(f.x, f.y, hx, hy) > slack + 140) followPoint(f, hx, hy, dt, slack);
    f.shootCd -= dt;
    if (f.shootCd <= 0) {
      f.shootCd = Math.max(w.rate, .25) * (w.auto ? 3 : 1.5) * rnd(.9, 1.3); f.flashT = .06;
      const n = w.pellets || 1;
      for (let k = 0; k < n; k++) { const a = f.aang + rnd(-1, 1) * ((w.spr || .05) * 1.2 + .03); spawnBullet({ x: f.x + Math.cos(f.aang) * 16, y: f.y + Math.sin(f.aang) * 16, vx: Math.cos(a) * w.spd, vy: Math.sin(a) * w.spd, dmg: w.dmg * 1.05 * 1, left: w.range, team: 'f', src: f.id, col: '#bde' }); }
      SFX.play(w.pellets ? 'shotgun' : (w.auto ? 'smg' : 'pistol'), clamp(1 - dist(f.x, f.y, P.x, P.y) / 900, .1, .4));
    }
  } else followPoint(f, hx, hy, dt, slack);
}

// ---------- Séparation des mobs ----------
function separateAll(dt) {
  const grid = new Map();
  const all = [];
  for (const m of G.mobs) if (!m.dead && m.act) all.push(m);
  for (const f of G.friends) if (!f.dead) all.push(f);
  for (const e of all) { const k = (Math.floor(e.x / 48)) + (Math.floor(e.y / 48)) * 1000; let c = grid.get(k); if (!c) grid.set(k, c = []); c.push(e); }
  for (const e of all) {
    const cx = Math.floor(e.x / 48), cy = Math.floor(e.y / 48);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const c = grid.get((cx + dx) + (cy + dy) * 1000); if (!c) continue;
      for (const o of c) {
        if (o === e) continue;
        const ddx = e.x - o.x, ddy = e.y - o.y, d2 = ddx * ddx + ddy * ddy, rr = (e.r + o.r) * .85;
        if (d2 < rr * rr && d2 > .01) { const d = Math.sqrt(d2), push = (rr - d) * .5; moveEnt(e, ddx / d * push, ddy / d * push, e.kind !== undefined); }
      }
    }
  }
}

// ---------- NPC ----------
function updateNPCs(dt) {
  for (const n of G.npcs) { n.anim += dt; const d = dist(n.x, n.y, P.x, P.y); if (d < 160) n.face = ang(n.x, n.y, P.x, P.y); }
}
