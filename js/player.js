'use strict';
// ===== Logique du joueur : déplacement, tir, survie, interactions =====

function dodgeRoll() {
  if (!G || G.paused || P.dead || P.veh || P.dodgeT > 0 || (P.dodgeCd || 0) > 0) return;
  if (P.stam < 16) { if (G.clock - (G.noStamMsg || 0) > 1.5) { addText(P.x, P.y - 30, 'Essoufflé', '#9ac', false); G.noStamMsg = G.clock; } return; }
  const k = G.keys; let ix = (k.d ? 1 : 0) - (k.a ? 1 : 0), iy = (k.s ? 1 : 0) - (k.w ? 1 : 0);
  if (!ix && !iy) { ix = -Math.cos(P.ang); iy = -Math.sin(P.ang); } const l = Math.hypot(ix, iy) || 1;
  P.dodgeDx = ix / l; P.dodgeDy = iy / l; P.dodgeT = .26; P.invuln = .34; P.dodgeCd = .6; P.stam -= 16; P.staRegenT = 1; P.reloading = false;
  SFX.play('whoosh', .9); fxRing(P.x, P.y + 6, 24, '220,210,190', .3);
  for (let i = 0; i < 8; i++) addPart(P.x, P.y + 8, -P.dodgeDx * rnd(40, 120) + rnd(-30, 30), -P.dodgeDy * rnd(40, 120) + rnd(-30, 10), rnd(.3, .6), rnd(2, 4.5), 'rgba(180,160,125,.75)', 'dot');
}
function updatePlayer(dt) {
  const k = G.keys; if (P.dodgeCd > 0) P.dodgeCd -= dt; if (P.invuln > 0) P.invuln -= dt;
  if (P.dodgeT > 0) { // roulade : déplacement rapide, invulnérable
    P.dodgeT -= dt; moveEnt(P, P.dodgeDx * 430 * dt, P.dodgeDy * 430 * dt, true); P.moving = true;
    if (Math.random() < dt * 40) addPart(P.x, P.y + 8, rnd(-20, 20), rnd(-20, 0), .35, rnd(2, 3.5), 'rgba(200,185,150,.6)', 'dot');
    P.ang = Math.atan2(G.mouse.y - P.y, G.mouse.x - P.x); P.walk = (P.walk || 0) + 16 * dt; return;
  } if (G.buildMode && !G.paused) buildDrag();
  let ix = (k.d ? 1 : 0) - (k.a ? 1 : 0), iy = (k.s ? 1 : 0) - (k.w ? 1 : 0);
  const il = Math.hypot(ix, iy); if (il > 0) { ix /= il; iy /= il; }
  P.moving = il > 0 && !P.veh;
  const wantSprint = k.shift && P.moving && P.stam > 2 && !P.exhausted;
  P.sprint = wantSprint;
  const aiming = G.rmb;
  const coldM = P.temp < 30 ? .93 : 1;
  if (P.veh) { driveVehicle(dt); P.stam = Math.min(maxStam(), P.stam + 15 * dt); }
  else {
    let sp = 138 * moveSpeedMul() * coldM * (P.sprint ? 1.6 : 1) * (aiming ? .82 : 1);
    if (G.tiles[IDX(Math.floor(P.x / TS), Math.floor(P.y / TS))] === T.ROAD) sp *= 1.06;
    if (P.infect) sp *= .92;
    if (P.slowT > 0) { P.slowT -= dt; sp *= .55; }
    moveEnt(P, (ix * sp + P.vx) * dt, (iy * sp + P.vy) * dt, true);
    P.vx *= Math.max(0, 1 - dt * 8); P.vy *= Math.max(0, 1 - dt * 8);
    if (P.sprint) { P.stam -= 22 * dt; P.staRegenT = .7; if (P.stam <= 0) { P.stam = 0; P.exhausted = true; } }
    else { P.staRegenT = (P.staRegenT || 0) - dt; if (P.staRegenT <= 0) P.stam = Math.min(maxStam(), P.stam + (P.hun > 15 ? 20 : 8) * (P.temp < 30 ? .5 : P.temp > 80 ? .6 : 1) * dt); if (P.exhausted && P.stam > 25) P.exhausted = false; }
  }
  if (!P.veh && G.tick % 6 === 0) unstick(P, true);
  P.ang = Math.atan2(G.mouse.y - P.y, G.mouse.x - P.x);
  P.walk = (P.walk || 0) + (P.moving ? (P.sprint ? 14 : 9) * dt : 0);
  if (P.sprint && Math.random() < dt * 12) addPart(P.x - ix * 10, P.y - iy * 10 + 6, rnd(-15, 15), rnd(-15, 0), .45, rnd(2, 4), 'rgba(170,150,120,.7)', 'dot');

  // bruit des pas
  P.noiseT -= dt;
  if (P.noiseT <= 0 && P.moving && !P.veh) { P.noiseT = .6; makeNoise(P.x, P.y, P.sprint ? 230 : 95, true); }

  // timers
  if (P.perfectT > 0) P.perfectT -= dt;
  P.cd -= dt; P.gadCd -= dt; P.useCd -= dt; P.healCd -= dt;
  if (P.swing > 0) P.swing -= dt; if (P.hurtT > 0) P.hurtT -= dt; if (P.flashT > 0) P.flashT -= dt; if (P.painT > 0) P.painT -= dt;
  P.bloom = Math.max(0, P.bloom - dt * .4);
  const w = curWeapon();
  if (P.reloading) {
    P.reload -= dt;
    if (!w || w !== P.reloadW) { P.reloading = false; }
    else if (P.reload <= 0) finishReload(w);
  }
  if (w && !P.dead && !G.paused) {
    const s = wstat(w);
    if (G.lmbEdge) G.edgeT = .12;
    if (G.lmb && P.cd <= 0 && !P.reloading && !G.buildMode) {
      if (s.melee) { if (!P.veh) meleeSwing(w, s); }
      else if (s.auto || G.edgeT > 0) fireGun(w, s);
    }
  }
  G.edgeT -= dt; G.lmbEdge = false;
  survivalTick(dt);
  collectPickups(dt);
  if (!P.dead) updateExploration();
}

function fireGun(w, s) {
  if (w.mag <= 0) { startReload(); if (G.edgeT > 0) SFX.play('click'); return; }
  { const d = durOf(w); if (d < 25 && Math.random() < .09 * (1 - d / 25)) { P.cd = .8; G.edgeT = 0; SFX.play('click'); addText(P.x, P.y - 30, 'ENRAYÉ !', '#ff9a6a', true); shake(1); return; } }
  w.mag--; P.cd = s.rate; G.edgeT = 0; wearGear(w, s.flame ? .1 : (s.pellets ? .45 : .28));
  const spread = s.spr + P.bloom + (P.moving ? s.spr * .5 : 0) * (G.rmb ? 0 : 1) - (G.rmb ? s.spr * .3 : 0);
  const n = s.pellets || 1;
  for (let i = 0; i < n; i++) {
    const a = P.ang + rnd(-1, 1) * Math.max(.003, spread);
    const sp = s.spd * (s.flame ? rnd(.7, 1.1) : 1);
    spawnBullet({
      x: P.x + Math.cos(P.ang) * 18, y: P.y + Math.sin(P.ang) * 18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: s.dmg,
      left: s.range * (s.flame ? rnd(.6, 1) : 1), team: 'f', pierce: s.pierce || 0, hit: (s.pierce || s.flame) ? new Set() : null, crit: Math.random() < .05 + .02 * P.skills.aim,
      flame: !!s.flame, r: s.flame ? 9 : 3, src: 'p', col: s.ammo === 'bolt' ? '#d8c8a0' : '#ffe9a0', kind: s.ammo === 'bolt' ? 'bolt' : 'b',
    });
  }
  P.bloom = Math.min(.25, P.bloom + s.spr * .25 + .004);
  { const kk = Math.min(9, 1.5 + s.dmg / 14) * (s.flame ? .2 : 1); G.kick.x -= Math.cos(P.ang) * kk; G.kick.y -= Math.sin(P.ang) * kk; }
  tutEvent('shots');
  P.flashT = .06; shake(s.flame ? .5 : Math.min(4, s.dmg / 18));
  const snd = s.silenced ? 'silenced' : s.flame ? 'flame' : s.ammo === 'bolt' ? 'bow' : s.pellets ? 'shotgun' : (s.ammo === 'a762' || s.ammo === 'a556') ? 'rifle' : s.auto ? 'smg' : 'pistol';
  SFX.play(snd);
  if (!s.flame && snd !== 'silenced') for (let i = 0; i < 2; i++) addPart(P.x, P.y, Math.cos(P.ang + 1.6) * rnd(60, 130) + rnd(-20, 20), Math.sin(P.ang + 1.6) * rnd(60, 130), .55, 3, '#d8b24a', 'shell');
  if (s.noiseR) makeNoise(P.x, P.y, s.noiseR, true);
  if (w.mag <= 0 && ammoReserve(w) > 0) startReload();
}

function startReload() {
  const w = curWeapon(); if (!w || P.reloading) return; const b = WEAPONS[w.id]; if (b.melee) return;
  const s = wstat(w);
  if (w.mag >= s.mag) return;
  if (ammoReserve(w) <= 0) { if (G.clock - (G.noAmmoMsg || 0) > 2) { msg('Plus de munitions (' + ITEMS[b.ammo].n + ') !', '#e0a050'); G.noAmmoMsg = G.clock; } return; }
  P.reloading = true; P.reload = s.rel; P.reloadW = w; SFX.play('reload');
}
function finishReload(w) {
  const b = WEAPONS[w.id], s = wstat(w), per = AMMO_PER[b.ammo] || 1;
  const need = s.mag - w.mag, units = Math.min(Math.ceil(need / per), invCount(b.ammo));
  invTake(b.ammo, units); w.mag = Math.min(s.mag, w.mag + units * per);
  P.reloading = false; tutEvent('reload'); SFX.play('click');
}

function toolPower(kind) {
  let best = 0.5;
  for (const w of P.slots) if (w && WEAPONS[w.id].melee) best = Math.max(best, WEAPONS[w.id][kind] || 0);
  return best;
}
function meleeSwing(w, s) {
  P.mStep = (G.clock - (P.mLast || -9) < .75) ? ((P.mStep || 0) + 1) % 3 : 0; P.mLast = G.clock; const fin = P.mStep === 2; P.swingDir = P.mStep % 2 ? -1 : 1;
  P.cd = s.rate * (fin ? 1.25 : 1); P.swing = fin ? .26 : .2; P.swingA = P.ang; SFX.play('swing', fin ? 1 : .7);
  { const lu = fin ? 20 : 11; moveEnt(P, Math.cos(P.ang) * lu, Math.sin(P.ang) * lu, true); G.kick.x += Math.cos(P.ang) * 2; G.kick.y += Math.sin(P.ang) * 2; } // fente
  let hitAny = false;
  for (const m of G.mobs) {
    if (m.dead) continue; const d = dist(P.x, P.y, m.x, m.y);
    if (d > s.range + m.r) continue;
    const a = ang(P.x, P.y, m.x, m.y);
    if (Math.abs(angDiff(P.ang, a)) < s.arc / 2 + m.r / Math.max(d, 1)) { hurtMob(m, s.dmg * (fin ? 1.7 : 1) * (P.perfectT > 0 ? 1.3 : 1), { kind: 'melee', ang: a, kb: s.kb * (fin ? 2.2 : 1), crit: fin || Math.random() < .08 + .02 * P.skills.aim, src: 'p' }); hitAny = true; if (fin) { hitstop(.06); addPart(m.x, m.y, 0, 0, .25, 9, '#fff', 'dot'); } }
  }
  if (!hitAny) { // récolte
    const o = nearestHarvestable(P.x + Math.cos(P.ang) * 26, P.y + Math.sin(P.ang) * 26, s.range + 16, true);
    if (o) { harvestHit(o, WEAPONS[w.id]); hitAny = true; }
  }
  if (hitAny) { shake(fin ? 4 : 1.5); wearGear(w, .45); if (fin) { addText(P.x, P.y - 32, 'COUP FINAL !', '#ffd86a', true); fxRing(P.x + Math.cos(P.ang) * 30, P.y + Math.sin(P.ang) * 30, 40, '255,220,140', .3); } }
  makeNoise(P.x, P.y, s.noise, true);
}

function nearestHarvestable(x, y, range, needTool) {
  let best = null, bd = range;
  const r = Math.ceil(range / TS) + 1, cx = Math.floor(x / TS), cy = Math.floor(y / TS);
  for (let ty = cy - r; ty <= cy + r; ty++) for (let tx = cx - r; tx <= cx + r; tx++) {
    if (!inb(tx, ty)) continue; const o = G.objs.get(IDX(tx, ty)); if (!o || o.dep) continue;
    const h = HARV[o.k]; if (!h) continue; if (needTool && !h.tool) continue;
    const d = dist(x, y, o.x, o.y); if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function harvestHit(o, wdef) {
  const h = HARV[o.k]; let power;
  if (h.tool) { const mult = wdef ? (wdef[h.tool] || .3) : .5; power = Math.max(5, mult * 12) * (1 + .12 * P.skills.str); if (!wdef) power = 6 * (1 + .12 * P.skills.str); }
  else power = 99;
  o.hp -= power; o.shakeT = .15;
  for (let i = 0; i < 3; i++) addPart(o.x, o.y, rnd(-70, 70), rnd(-70, 70), .35, 2, o.k === 'rock' || o.k === 'wreck' ? '#aaa' : o.k === 'tree' ? '#5a8a3a' : '#7ab04a');
  SFX.play(o.k === 'rock' || o.k === 'wreck' ? 'thud' : 'hit', .6);
  makeNoise(o.x, o.y, o.k === 'rock' || o.k === 'wreck' ? 160 : 130, true);
  if (o.hp <= 0) depleteObj(o);
}
function depleteObj(o) {
  const h = HARV[o.k];
  for (const e of h.drop) if (Math.random() < e[1]) giveItem(e[0], rint(e[2], e[3]) + (e[0] === 'wood' && P.skills.str > 3 ? 1 : 0));
  o.dep = true; o.regrowAt = G.clock + h.regrow * DAY_LEN;
  const i = IDX(o.tx, o.ty); if (h.solid && G.solid[i] === SO.OBJ) G.solid[i] = 0;
  G.depleted.push(o); addXP(1); G.stats.gathered++; G.flowDirty = true;
}
function updateRegrow() {
  for (let i = G.depleted.length - 1; i >= 0; i--) {
    const o = G.depleted[i]; if (G.clock < o.regrowAt) continue;
    const idx = IDX(o.tx, o.ty);
    if (HARV[o.k].solid) { if (G.solid[idx] !== 0 || G.structs.has(idx) || dist(o.x, o.y, P.x, P.y) < 30) continue; G.solid[idx] = SO.OBJ; }
    o.dep = false; o.hp = o.max; G.depleted.splice(i, 1);
  }
}

// ---------- Survie ----------
function survivalTick(dt) {
  if (P.dead) return;
  const dm = difficultyMul(), endm = 1 - .06 * P.skills.end;
  const sickM = P.sick > 0 ? 1.8 : 1;
  const hotM = P.temp > 80 ? 1.8 : 1;
  P.hun = Math.max(0, P.hun - .068 * dm.hun * endm * sickM * dt * (P.sprint ? 1.5 : 1));
  P.thi = Math.max(0, P.thi - .105 * dm.hun * endm * sickM * hotM * dt * (P.sprint ? 1.6 : 1));
  const starving = P.hun <= 0 || P.thi <= 0;
  if (starving) { P.starveT = (P.starveT || 0) - dt; if (P.starveT <= 0) { P.starveT = 1; hurtPlayer(2, { pure: true, cause: P.thi <= 0 ? 'la soif' : 'la faim' }); } }
  if (P.bleed) { P.bleedT = (P.bleedT || 0) - dt; if (P.bleedT <= 0) { P.bleedT = 1; hurtPlayer(1.6, { pure: true, cause: 'une hémorragie' }); addDecal(P.x, P.y, rnd(2, 4), '#8a1010'); } }
  if (P.infect) { P.infT = (P.infT || 0) - dt; if (P.infT <= 0) { P.infT = 2; hurtPlayer(1.2, { pure: true, cause: 'l\'infection' }); } }
  if (P.sick > 0) { P.sick -= dt; P.sickT = (P.sickT || 0) - dt; if (P.sickT <= 0) { P.sickT = 3; hurtPlayer(1, { pure: true, cause: 'une intoxication' }); } }
  // température
  const target = 50 + ambientTemp() + armorWarmth();
  const rainy = (G.wType === 'rain' || G.wType === 'storm') && G.wInt > .3 && !G.inside && !(P.veh && P.veh.def.closed);
  if (rainy) P.wet = Math.min(1, P.wet + dt * .045 * G.wInt); else P.wet = Math.max(0, P.wet - dt * (P.nearFire ? .12 : .025));
  if (P.wet > .6 && !P.wetWarn) { msg('💧 Vous êtes trempé : abritez-vous ou séchez-vous près d\'un feu.', '#8ac8ff'); P.wetWarn = true; } if (P.wet < .2) P.wetWarn = false;
  P.temp = clamp(P.temp + (target - P.temp) * Math.min(1, .035 * dt), 0, 100);
  if (P.temp < 15 || P.temp > 93) { P.tempT = (P.tempT || 0) - dt; if (P.tempT <= 0) { P.tempT = 1; hurtPlayer(1.3, { pure: true, cause: P.temp < 15 ? 'le froid' : 'la chaleur' }); } }
  if (P.temp < 30 && !P.coldWarn) { msg('🥶 Vous avez froid ! Approchez-vous d\'un feu, couvrez-vous.', '#8ac8ff'); P.coldWarn = true; } if (P.temp > 38) P.coldWarn = false;
  if (P.temp > 80 && !P.hotWarn) { msg('🥵 Il fait très chaud ! Cherchez l\'ombre/les bâtiments, enlevez des couches, buvez.', '#ff9a6a'); P.hotWarn = true; } if (P.temp < 72) P.hotWarn = false;
  // radiations
  const rl = radAt(P.x, P.y), res = radResist(); G.radLv = rl * (1 - res);
  if (rl > 0) {
    P.rad = Math.min(100, P.rad + rl * (1 - res) * dt);
    if (!P.radWarn) { msg('☢️ ZONE RADIOACTIVE ! Combinaison NRBC/masque à gaz requis, ou quittez la zone.', '#9aff4a'); SFX.play('alarm', .5); P.radWarn = true; }
    if (Math.random() < dt * (G.radLv + .4) * 5) SFX.play('click', .3 + Math.min(.4, G.radLv * .15));
  } else { P.rad = Math.max(0, P.rad - .03 * dt); if (P.radWarn && rl === 0) P.radWarn = false; }
  if (P.rad > 85) { P.radT = (P.radT || 0) - dt; if (P.radT <= 0) { P.radT = 1; hurtPlayer(2, { pure: true, cause: 'les radiations' }); } }
  if (P.rad >= 100) gameOver('les radiations');
  // régénération
  let reg = 0;
  if (P.hun > 55 && P.thi > 55 && !P.bleed && !P.infect && P.temp > 20 && P.temp < 88 && G.clock - P.lastHurt > 4) reg = .35;
  const b = baseAt(P.x, P.y); if (b && !starving) reg += BASE_LEVELS[b.lvl].regen;
  if (reg > 0 && P.hp < maxHP()) P.hp = Math.min(maxHP(), P.hp + reg * dt);
  if (P.hp > maxHP()) P.hp = maxHP();
  if (P.hun < 20 && !P.hunWarn) { msg('Vous avez faim.', '#e0a050'); P.hunWarn = true; } if (P.hun > 30) P.hunWarn = false;
  if (P.thi < 20 && !P.thiWarn) { msg('Vous avez soif.', '#6ab0e0'); P.thiWarn = true; } if (P.thi > 30) P.thiWarn = false;
  // eau : on peut nager ? non (bloqué), mais l'eau éteint le feu
  if (P.burn > 0) { const t = G.tiles; for (const [ox, oy] of [[20, 0], [-20, 0], [0, 20], [0, -20]]) if (t[IDX(Math.floor((P.x + ox) / TS), Math.floor((P.y + oy) / TS))] === T.WATER) P.burn = 0; }
}

function ambientTemp() {
  const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS), t = G.tiles[IDX(tx, ty)];
  const dayB = { [T.GRASS]: 6, [T.FOREST]: 0, [T.SAND]: 18, [T.DIRT]: 14, [T.ROAD]: 8, [T.FLOOR]: 8, [T.CONC]: 6 }[t] || 4;
  const nightB = { [T.GRASS]: -26, [T.FOREST]: -22, [T.SAND]: -36, [T.DIRT]: -34, [T.ROAD]: -26, [T.FLOOR]: -22, [T.CONC]: -26 }[t] || -26;
  let a = lerp(dayB, nightB, clamp(G.dark / .8, 0, 1));
  G.inside = false;
  for (const b of G.buildings) if (P.x > b.x * TS && P.x < (b.x + b.w) * TS && P.y > b.y * TS && P.y < (b.y + b.h) * TS) { a = a * .5 + 8; G.inside = true; break; }
  let fire = 0;
  for (const s of G.structs.values()) if (s.type === 'campfire') { const d = dist(P.x, P.y, s.x, s.y); if (d < 170) fire = Math.max(fire, 1 - d / 170); }
  if (!G.fireObjs) G.fireObjs = [...G.objs.values()].filter(o => o.k === 'fire');
  for (const o of G.fireObjs) { const d = dist(P.x, P.y, o.x, o.y); if (d < 170) fire = Math.max(fire, 1 - d / 170); }
  for (const g of G.fires) { const d = dist(P.x, P.y, g.x, g.y); if (d < g.r + 120) fire = Math.max(fire, .8); }
  a += fire * 32;
  if (P.veh) a += 12;
  a -= G.wInt * (G.wType === 'storm' ? 9 : G.wType === 'rain' ? 6 : G.wType === 'fog' ? 2 : 0) + 11 * P.wet;
  if (fire > .3) P.nearFire = true; else P.nearFire = false;
  if (radAt(P.x, P.y) > 0) a += 4;
  return a;
}
function tempLabel() { return P.temp < 15 ? 'Gelé' : P.temp < 30 ? 'Froid' : P.temp > 93 ? 'Hyperthermie' : P.temp > 80 ? 'Chaud' : 'Confortable'; }

function useConsumable(id) {
  const it = ITEMS[id]; if (!it || invCount(id) < 1) return false;
  const u = it.use; if (!u) return false;
  if (it.t === 'med' && P.healCd > 0) return false;
  if (u.hp && P.hp >= maxHP() && !u.cure) { msg('Vous êtes en pleine forme.', '#aaa'); return false; }
  if (it.t === 'med' && !(u.rad && P.rad > 0) && !(u.hp && P.hp < maxHP()) && !(u.cure && u.cure.some(c => P[c === 'bleed' ? 'bleed' : c === 'infect' ? 'infect' : 'sick']))) { msg('Aucun effet nécessaire.', '#aaa'); return false; }
  invTake(id, 1);
  if (u.hun) P.hun = Math.min(100, P.hun + u.hun);
  if (u.thi) P.thi = Math.min(100, P.thi + u.thi);
  if (u.rad) { P.rad = Math.max(0, P.rad + u.rad); addText(P.x, P.y - 24, '☢ ' + u.rad, '#9aff4a'); }
  if (u.temp) P.temp = Math.min(100, P.temp + u.temp);
  if (u.stam) P.stam = Math.min(maxStam(), P.stam + u.stam);
  if (u.hp) { P.hp = Math.min(maxHP(), P.hp + u.hp); addText(P.x, P.y - 24, '+' + u.hp, '#7cff7c'); }
  if (u.cure) for (const c of u.cure) { if (c === 'bleed') P.bleed = 0; if (c === 'infect') P.infect = 0; if (c === 'sick') P.sick = 0; }
  if (u.sick && Math.random() < u.sick) { P.sick = 40; msg('Vous ne vous sentez pas bien... (intoxication)', '#9acd32'); }
  if (it.t === 'med') { P.healCd = .8; SFX.play('pickup'); } else SFX.play(it.t === 'drink' ? 'drink' : 'eat');
  tutEvent('consume');
  if (id === 'painkiller') P.painT = 25;
  return true;
}
function quickHeal() {
  if (P.rad > 25 && invCount('antibio') + invCount('antirad') > 0 && invCount('antirad')) return useConsumable('antirad');
  if (P.bleed || P.hp < 70) {
    if (P.bleed && invCount('bandage')) return useConsumable('bandage');
    if (P.hp < 45 && invCount('medkit')) return useConsumable('medkit');
    if (P.hp < maxHP() && invCount('bandage')) return useConsumable('bandage');
    if (P.hp < maxHP() && invCount('painkiller')) return useConsumable('painkiller');
    if (invCount('medkit') && P.hp < maxHP()) return useConsumable('medkit');
  }
  if (P.infect && invCount('antibio')) return useConsumable('antibio');
  if (P.sick > 0 && invCount('antibio')) return useConsumable('antibio');
  if (P.hp < maxHP()) { for (const id of ['bandage', 'painkiller', 'medkit']) if (invCount(id)) return useConsumable(id); }
  msg('Rien à soigner ou aucun soin disponible.', '#aaa'); return false;
}
function quickEat() { for (const id of ['stew', 'canned', 'cooked', 'veg', 'berries', 'rawmeat']) if (invCount(id)) return useConsumable(id); msg('Rien à manger.', '#aaa'); return false; }
function quickDrink() { for (const id of ['bottle_clean', 'soda', 'bottle_dirty']) if (invCount(id)) return useConsumable(id); msg('Rien à boire (puisez à un lac avec E).', '#aaa'); return false; }
function usePlan(id) { const it = ITEMS[id]; if (invCount(id) < 1) return; invTake(id, 1); P.known[it.plan] = true; msg('Plan appris : ' + PLAN_NAMES[it.plan] + ' !', '#ffe070'); SFX.play('levelup'); }

// ---------- Ramassage ----------
function collectPickups(dt) {
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const p = G.pickups[i]; p.t += dt;
    if (p.vx || p.vy) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.max(0, 1 - dt * 6); p.vy *= Math.max(0, 1 - dt * 6); if (collide(p.x, p.y, 4, true)) { p.x -= p.vx * dt * 2; p.y -= p.vy * dt * 2; p.vx = p.vy = 0; } }
    const d = dist(p.x, p.y, P.x, P.y);
    if (p.t > .35 && d < 70) { p.x += (P.x - p.x) * Math.min(1, dt * 9); p.y += (P.y - p.y) * Math.min(1, dt * 9); }
    if (p.t > .35 && d < 24) {
      if (p.gear) { giveGear(p.gear.kind, p.gear.id); G.pickups.splice(i, 1); continue; }
      const got = invAdd(p.id, p.n);
      if (got > 0) { toastItem(p.id, got); SFX.play('pickup', .7); questCheckSoon(); }
      if (got >= p.n) G.pickups.splice(i, 1);
      else { p.n -= got; if (got === 0 && G.clock - (G.fullMsg || 0) > 3) { msg('Inventaire plein !', '#e0a050'); G.fullMsg = G.clock; } }
    }
    if (p.t > 600) G.pickups.splice(i, 1);
  }
}

// ---------- Interactions ----------
function findInteract() {
  if (P.veh) return { t: 'exitveh', text: 'Descendre — X : entretien/coffre (⛽ ' + Math.round(P.veh.fuel) + '/' + P.veh.maxfuel + ')' };
  let best = null, bd = 1e9;
  const consider = (d, o) => { if (d < bd) { bd = d; best = o; } };
  const cx = Math.floor(P.x / TS), cy = Math.floor(P.y / TS);
  for (let ty = cy - 2; ty <= cy + 2; ty++) for (let tx = cx - 2; tx <= cx + 2; tx++) {
    if (!inb(tx, ty)) continue; const i = IDX(tx, ty);
    const o = G.objs.get(i);
    if (o && !o.dep) {
      const d = dist(P.x, P.y, o.x, o.y);
      if (o.k === 'crate' && !o.opened && d < 56) consider(d, { t: 'crate', o, text: o.air ? 'Ouvrir le largage' : 'Fouiller la caisse' });
      else if (o.k === 'mast' && d < 60 && !G.radioOn) consider(d, { t: 'mast', o, text: 'Réactiver l\'émetteur radio' });
      else if (HARV[o.k] && d < 52) consider(d, { t: 'harv', o, text: HARV[o.k].verb });
    }
    const s = G.structs.get(i);
    if (s) {
      const d = dist(P.x, P.y, s.x, s.y); if (d > 58) continue;
      const tx2 = { workbench: 'Utiliser l\'établi', campfire: 'Cuisiner / se réchauffer', chest: 'Ouvrir le coffre', bed: 'Dormir', turret: 'Recharger la tourelle (' + (s.ammo | 0) + '/80)', barrel: 'Récupérer l\'eau (' + Math.floor(s.water) + ')', plot: s.plant === 0 ? 'Planter des graines' : s.plant === 1 ? 'Pousse en cours...' : 'Récolter' }[s.type];
      if (tx2) consider(d + 4, { t: 'struct', s, text: tx2 });
    }
  }
  for (const p of G.pois) {
    if (p.flag && !p.hidden && p.def.claim) { const d = dist(P.x, P.y, p.flag.x, p.flag.y); if (d < 58) consider(d, { t: 'flag', p, text: p.owned ? 'Gérer la base : ' + p.name : 'Prendre possession : ' + p.name }); }
  }
  for (const v of G.vehicles) { const d = dist(P.x, P.y, v.x, v.y); if (d < v.def.r + 52) consider(d - 24, { t: 'veh', v, text: 'Monter : ' + v.def.n + ' (⛽ ' + Math.round(v.fuel) + '/' + v.maxfuel + ', ❤ ' + Math.round(v.hp / v.maxhp * 100) + '%) — X : entretien' }); }
  for (const n of G.npcs) { const d = dist(P.x, P.y, n.x, n.y); if (d < 70) consider(d - 8, { t: 'npc', n, text: 'Parler à ' + n.name }); }
  for (const m of G.mobs) {
    if (m.dead || !m.def.tame) continue; const d = dist(P.x, P.y, m.x, m.y);
    if (d < 80) consider(d, { t: 'tame', m, text: 'Apprivoiser ' + m.def.n + ' (' + ITEMS[m.def.tame].i + ' ' + ITEMS[m.def.tame].n + ')' });
  }
  for (const f of G.friends) {
    if (f.dead) continue; const d = dist(P.x, P.y, f.x, f.y);
    if (d < 60 && f.kind === 'pet') consider(d, { t: 'pet', f, text: f.name + ' : nourrir / ' + (f.mode === 'stay' ? 'suivre' : 'attendre') });
    if (d < 60 && f.kind === 'recruit') consider(d, { t: 'recruit', f, text: f.name + ' : ' + (f.mode === 'guard' ? 'suivre' : 'garder la base') });
  }
  // eau
  const ex = Math.floor((P.x + Math.cos(P.ang) * 30) / TS), ey = Math.floor((P.y + Math.sin(P.ang) * 30) / TS);
  if (inb(ex, ey) && G.tiles[IDX(ex, ey)] === T.WATER && G.solid[IDX(ex, ey)] === SO.WATER && !best) best = { t: 'water', text: 'Boire / remplir une bouteille' };
  return best;
}

function interact() {
  const it = G.prompt; if (!it) return;
  switch (it.t) {
    case 'crate': openCrate(it.o); break;
    case 'mast': activateRadio(it.o); break;
    case 'harv': {
      if (P.useCd > 0) return; const h = HARV[it.o.k]; P.useCd = h.tool ? .4 : .2;
      let wd = null, mult = 0;
      if (h.tool) for (const w of P.slots) if (w && WEAPONS[w.id].melee && (WEAPONS[w.id][h.tool] || 0) > mult) { mult = WEAPONS[w.id][h.tool]; wd = WEAPONS[w.id]; }
      P.swing = .2; P.swingA = ang(P.x, P.y, it.o.x, it.o.y); harvestHit(it.o, wd); break;
    }
    case 'struct': interactStruct(it.s); break;
    case 'flag': if (it.p.owned) openPanel('base', it.p); else claimPOI(it.p); break;
    case 'npc': openDialog(it.n); break;
    case 'tame': tryTame(it.m); break;
    case 'pet': {
      const f = it.f; const foods = ['cooked', 'rawmeat', 'canned', 'berries', 'veg'];
      if (f.hp < f.maxhp * .95) { const fd = foods.find(id => invCount(id)); if (fd) { invTake(fd, 1); f.hp = Math.min(f.maxhp, f.hp + f.maxhp * .4); SFX.play('eat'); addText(f.x, f.y - 20, '♥', '#ff8aa0', true); break; } }
      f.mode = f.mode === 'stay' ? 'follow' : 'stay'; msg(f.name + (f.mode === 'stay' ? ' attend ici.' : ' vous suit.'), '#cde'); SFX.play('ui'); break;
    }
    case 'recruit': { const f = it.f; const b = nearestOwnedBase(); if (f.mode === 'guard') { f.mode = 'follow'; msg(f.name + ' vous suit.', '#cde'); } else if (b) { f.mode = 'guard'; f.base = b.id; msg(f.name + ' garde ' + b.name + '.', '#cde'); } else msg('Vous n\'avez pas de base à faire garder.', '#e0a050'); SFX.play('ui'); break; }
    case 'water': drinkWater(); break;
    case 'veh': enterVehicle(it.v); break;
    case 'exitveh': exitVehicle(); break;
  }
}
function nearestOwnedBase() { let b = null, bd = 1e9; for (const p of G.pois) if (p.owned) { const d = dist(P.x, P.y, p.cx, p.cy); if (d < bd) { bd = d; b = p; } } return b; }
function drinkWater() {
  if (P.useCd > 0) return; P.useCd = .6;
  if (P.thi < 96) { P.thi = Math.min(100, P.thi + 22); SFX.play('drink'); if (Math.random() < .2) { P.sick = Math.max(P.sick, 35); msg('L\'eau n\'était pas très saine...', '#9acd32'); } }
  else { const got = invAdd('bottle_dirty', 1); if (got) { msg('Bouteille remplie (non potable : faites-la bouillir au feu de camp).', '#9fd69f'); SFX.play('drink'); } else msg('Inventaire plein.', '#e0a050'); }
}

function openCrate(o) {
  o.opened = true; for (let i = 0; i < 10; i++) addPart(o.x, o.y, rnd(-90, 90), rnd(-110, -20), .6, 2.5, '#ffe9a0', 'fire'); const got = []; SFX.play('pickup');
  for (const k in o.loot) { giveItem(k, o.loot[k], true); got.push(ITEMS[k].i + o.loot[k]); }
  for (const g of o.gear) { giveGear(g.kind, g.id, true); const nm = g.kind === 'w' ? WEAPONS[g.id].n : g.kind === 'a' ? ARMOR[g.id].n : ITEMS[g.id].n; got.push('★ ' + nm); }
  msg((got.length ? 'Trouvé : ' + got.join('  ') : 'La caisse est vide.'), '#ffd070');
  G.stats.looted++; questCheckSoon();
}

function tryTame(m) {
  const need = m.def.tame;
  if (G.friends.filter(f => f.kind === 'pet' && !f.dead).length >= 3) { msg('Vous avez déjà 3 compagnons.', '#e0a050'); return; }
  if (invCount(need) < 1) { msg('Il vous faut : ' + ITEMS[need].n, '#e0a050'); return; }
  if (P.useCd > 0) return; P.useCd = 1;
  invTake(need, 1);
  const chance = clamp((m.def.mutant ? .45 : .5) + (1 - m.hp / m.maxhp) * .35 + P.skills.hunt * .08, .1, .95);
  if (Math.random() < chance) {
    m.dead = true; m.silent = true; const pet = makePet(m);
    msg(m.def.n + ' est apprivoisé ! (E : nourrir/attendre)', '#ffe070'); addText(m.x, m.y - 20, '♥', '#ff8aa0', true); SFX.play('levelup'); addXP(25);
    questEvent('tame', pet);
  } else {
    msg(m.def.n + ' refuse et se met en colère !', '#ff8a7a'); m.aggro = true; m.state = 'chase';
    if (m.def.ai === 'neutral') m.aggro = true;
  }
}

function interactStruct(s) {
  switch (s.type) {
    case 'workbench': openPanel('craft'); break;
    case 'campfire': openPanel('craft'); break;
    case 'chest': openPanel('chest', s); break;
    case 'bed': sleepBed(s); break;
    case 'turret': {
      const add = Math.min(80 - (s.ammo | 0), invCount('a9')); if (add <= 0) { msg(invCount('a9') ? 'Tourelle pleine.' : 'Il faut des balles 9mm.', '#e0a050'); break; }
      invTake('a9', add); s.ammo = (s.ammo | 0) + add; SFX.play('reload'); msg('Tourelle rechargée (' + s.ammo + ').', '#9fd69f'); break;
    }
    case 'barrel': { const n = Math.floor(s.water); if (n > 0) { s.water -= n; giveItem('bottle_clean', n); } else msg('Le collecteur est vide.', '#aaa'); break; }
    case 'plot': {
      if (s.plant === 0) { if (invCount('seed') >= 1) { invTake('seed', 1); s.plant = 1; s.t0 = G.clock; SFX.play('build'); msg('Graines plantées (récolte dans ~1 jour).', '#9fd69f'); } else msg('Il vous faut des graines.', '#e0a050'); }
      else if (s.plant === 2) { giveItem('veg', rint(3, 5)); if (Math.random() < .7) giveItem('seed', rint(1, 2)); s.plant = 0; addXP(5); }
      break;
    }
  }
}
function sleepBed(s) {
  if (!isNight() && G.dark < .3) { msg('Vous n\'avez pas sommeil (attendez la nuit).', '#aaa'); return; }
  for (const m of G.mobs) if (!m.dead && hostileMob(m) && m.def.fac !== 'wild' && dist(m.x, m.y, P.x, P.y) < 650) { msg('Impossible de dormir : des ennemis rôdent !', '#ff8a7a'); return; }
  if (P.hun < 15 || P.thi < 15) { msg('Vous avez trop faim / soif pour dormir.', '#e0a050'); return; }
  G.sleepFade = 1; G.sleeping = true;
}
function finishSleep() {
  const target = (Math.floor(G.clock / DAY_LEN) + 1) * DAY_LEN + DAY_LEN * 0.09;
  const skipped = target - G.clock;
  while (G.clock + DAY_LEN * 0.05 < target) { const nextDay = (Math.floor(G.clock / DAY_LEN) + 1) * DAY_LEN; if (nextDay > target) break; G.clock = nextDay; onNewDay(); }
  G.clock = target; G.day = dayNum();
  P.hun = Math.max(5, P.hun - skipped * .068 * .5); P.thi = Math.max(5, P.thi - skipped * .105 * .5);
  P.hp = Math.min(maxHP(), P.hp + 50); P.stam = maxStam(); P.infect = P.infect; msg('Vous vous réveillez à l\'aube. Jour ' + dayNum() + '.', '#ffe9a0');
  saveGame(true);
}

// ---------- Exploration (brouillard de guerre) ----------
function updateExploration() {
  const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
  if (tx === G.lastExpX && ty === G.lastExpY) return; G.lastExpX = tx; G.lastExpY = ty;
  revealAround(tx, ty, 15);
  for (const z of G.radZones) if (!z.discovered && dist(P.x, P.y, z.x, z.y) < z.r + 15 * TS) { z.discovered = true; msg('☢️ Zone radioactive repérée sur la carte.', '#9aff4a'); }
  for (const p of G.pois) if (!p.discovered && dist(P.x, P.y, p.cx, p.cy) < 16 * TS) { p.discovered = true; if (!p.hidden) { msg('Découvert : ' + p.name, '#a0d0ff'); } }
}
function revealAround(tx, ty, R) {
  const W = G.W; let ch = false;
  for (let y = Math.max(0, ty - R); y <= Math.min(G.H - 1, ty + R); y++) for (let x = Math.max(0, tx - R); x <= Math.min(W - 1, tx + R); x++) {
    if ((x - tx) * (x - tx) + (y - ty) * (y - ty) > R * R) continue; const i = y * W + x;
    if (!G.explored[i]) { G.explored[i] = 1; ch = true; paintMini(x, y); }
  }
  if (ch) G.miniDirty = true;
}
