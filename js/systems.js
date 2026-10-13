'use strict';
// ===== Systèmes : quêtes, bases, apparitions, événements, sauvegarde =====

// ---------- Quêtes ----------
function questDef(id, st) { return (st && st.def) || QUESTS.find(q => q.id === id); }
function questDone(id) { return !!G.quests.done[id]; }
function questAvailable(npcId) {
  return QUESTS.filter(q => q.giver === npcId && !questDone(q.id) && !G.quests.active[q.id] && (q.req || []).every(r => questDone(r)));
}
function acceptQuest(q) {
  const st = { id: q.id, kills: {}, poi: null };
  for (const o of q.objs) if (o.t === 'clear') {
    let best = null, bd = 1e9;
    for (const p of G.pois) if (p.type === o.poi && !p.cleared && !p.owned) { const d = dist(p.cx, p.cy, G.village.cx, G.village.cy); if (d < bd) { bd = d; best = p; } }
    if (!best) for (const p of G.pois) if (p.type === o.poi) best = best || p;
    if (best) { st.poi = best.id; best.discovered = true; revealAround(Math.floor(best.cx / TS), Math.floor(best.cy / TS), 6); }
  }
  if (q.contract) st.def = q;
  G.quests.active[q.id] = st;
  if (!G.quests.tracked) G.quests.tracked = q.id;
  msg('Quête acceptée : ' + q.title, '#ffe070'); SFX.play('ui'); questCheckSoon(); tutEvent('accept');
}
function objProgress(o, st) {
  switch (o.t) {
    case 'have': return { cur: invCount(o.item), need: o.n, text: 'Rapporter ' + ITEMS[o.item].i + ' ' + ITEMS[o.item].n };
    case 'kill': { const key = o.mob; return { cur: st.kills[key] || 0, need: o.n, text: 'Éliminer : ' + ({ undead: 'infectés', raider: 'Chacals', legion: 'légionnaires' }[key] || (MOBS[key] ? MOBS[key].n : key)) }; }
    case 'clear': { const p = G.pois[st.poi]; return { cur: p && p.cleared ? 1 : 0, need: 1, text: 'Nettoyer : ' + (p ? p.name : POITYPES[o.poi].n) }; }
    case 'claim': return { cur: G.pois.filter(p => p.owned).length, need: o.n, text: 'Prendre possession d\'un bâtiment' };
    case 'build': return { cur: o.st === 'wall' ? [...G.structs.values()].filter(s => s.type.startsWith('wall_')).length : [...G.structs.values()].filter(s => s.type === o.st).length, need: o.n, text: 'Construire : ' + (o.st === 'wall' ? 'murs' : STRUCTS[o.st].n) };
    case 'survive': return { cur: Math.min(G.day, o.day), need: o.day, text: 'Survivre jusqu\'au jour ' + o.day };
    case 'baselvl': return { cur: Math.max(0, ...G.pois.filter(p => p.owned).map(p => p.lvl)), need: o.n, text: 'Base de niveau ' + o.n };
    case 'tame': return { cur: G.friends.filter(f => f.kind === 'pet' && !f.dead).length, need: o.n, text: 'Apprivoiser un animal' };
    case 'recruit': return { cur: G.friends.filter(f => f.kind === 'recruit' && !f.dead).length, need: o.n, text: 'Recruter des gardes' };
    case 'drive': return { cur: Math.min(o.n, Math.floor((G.stats.driven || 0) / 16)), need: o.n, text: 'Parcourir ' + o.n + ' m en véhicule' };
    case 'radio': return { cur: G.radioOn ? 1 : 0, need: 1, text: 'Réactiver la tour radio' };
  }
  return { cur: 0, need: 1, text: '?' };
}
function questComplete(q, st) { return q.objs.every(o => { const p = objProgress(o, st); return p.cur >= p.need; }); }
function questCheckSoon() { if (G) G.qDirty = true; }
function checkQuests() {
  G.qDirty = false;
  for (const id in G.quests.active) {
    const st = G.quests.active[id], q = questDef(id, st); if (!q) continue;
    const c = questComplete(q, st);
    if (c && !st.ready) { st.ready = true; msg('Quête terminée : ' + q.title + ' — retournez voir ' + ({ mara: 'Mara', doc: 'le Docteur Lin', jonas: 'Jonas' }[q.giver] || 'le donneur') + '.', '#8affb0'); SFX.play('levelup'); }
    else if (!c && st.ready) st.ready = false;
  }
}
function questEvent(type, data) {
  if (type === 'kill') {
    for (const id in G.quests.active) {
      const st = G.quests.active[id]; const f = data.def.fac;
      st.kills[f] = (st.kills[f] || 0) + 1; st.kills[data.t] = (st.kills[data.t] || 0) + 1;
    }
  }
  questCheckSoon();
}
function completeQuest(q) {
  const st = G.quests.active[q.id]; if (!st) return;
  for (const o of q.objs) if (o.t === 'have') invTake(o.item, o.n);
  const r = q.rew;
  for (const k in (r.items || {})) {
    if (WEAPONS[k]) giveGear('w', k); else if (ARMOR[k]) giveGear('a', k); else giveItem(k, r.items[k]);
  }
  if (r.caps) giveItem('caps', r.caps);
  if (r.rep) { P.rep += r.rep; }
  if (r.xp) addXP(r.xp);
  delete G.quests.active[q.id]; G.quests.done[q.id] = 1;
  if (G.quests.tracked === q.id) G.quests.tracked = Object.keys(G.quests.active)[0] || null;
  msg('Quête réussie : ' + q.title + ' (+' + (r.rep || 0) + ' réputation)', '#ffe070'); SFX.play('levelup');
  G.stats.quests++;
}
function makeContract() {
  const n = (G.quests.contractN = (G.quests.contractN || 0) + 1), d = G.day;
  const kinds = ['kill', 'kill', 'have'];
  const k = pick(kinds); let q;
  if (k === 'kill') {
    const cnt = 10 + d * 2 + rint(0, 6);
    q = { id: 'ctr' + n, contract: true, giver: 'mara', title: 'Contrat : purge', desc: 'Éliminer ' + cnt + ' infectés autour du fort.', objs: [{ t: 'kill', mob: 'undead', n: cnt }], rew: { caps: 30 + cnt * 3, rep: 3, xp: 30 + cnt * 3, items: { a9: 12 } } };
  } else {
    const opts = [['wood', 30], ['scrap', 20], ['cloth', 14], ['herb', 8], ['canned', 5], ['metal', 8], ['chem', 6], ['stone', 25]]; const [item, base] = pick(opts); const cnt = base + Math.floor(d * base * .08);
    q = { id: 'ctr' + n, contract: true, giver: 'mara', title: 'Contrat : approvisionnement', desc: 'Rapporter ' + cnt + ' ' + ITEMS[item].n + ' au fort.', objs: [{ t: 'have', item, n: cnt }], rew: { caps: 25 + cnt * 2, rep: 3, xp: 40, items: {} } };
  }
  return q;
}
function questTargetPos(q, st) {
  if (st.ready) { const npc = G.npcs.find(n => n.id === q.giver); return npc ? { x: npc.x, y: npc.y, label: npc.name } : null; }
  for (const o of q.objs) {
    if (o.t === 'clear' && st.poi !== null) { const p = G.pois[st.poi]; if (p && !p.cleared) return { x: p.cx, y: p.cy, label: p.name }; }
    if (o.t === 'radio' && !G.radioOn) { const p = G.pois.find(p => p.type === 'radio'); if (p) return { x: p.cx, y: p.cy, label: p.name }; }
    if (o.t === 'have') { const pr = objProgress(o, st); if (pr.cur < pr.need && o.item === 'medsupply') { const p = G.pois.find(p => p.type === 'hospital'); if (p) return { x: p.cx, y: p.cy, label: p.name }; } }
  }
  return null;
}

function activateRadio(o) {
  for (const m of G.mobs) if (!m.dead && m.def.fac !== 'wild' && dist(m.x, m.y, o.x, o.y) < 380) { msg('Éliminez d\'abord les ennemis proches de la tour !', '#ff8a7a'); return; }
  G.radioOn = true; SFX.play('levelup');
  for (const p of G.pois) if (!p.hidden) { p.discovered = true; revealAround(Math.floor(p.cx / TS), Math.floor(p.cy / TS), 5); }
  msg('Émetteur réactivé ! Tous les lieux sont maintenant visibles sur la carte (M).', '#8affb0'); questCheckSoon();
}

// ---------- POI : apparition des occupants ----------
function activatePOI(p) {
  p.spawned = true; const dm = difficultyMul(); const day = G.day;
  const scale = (n) => Math.max(1, Math.round(n * dm.cnt * (.85 + .06 * day)));
  const spot = () => { const s = p.zspots[Math.floor(Math.random() * p.zspots.length)]; return [s[0] + rnd(-10, 10), s[1] + rnd(-10, 10)]; };
  const put = (t, o) => { for (let k = 0; k < 6; k++) { const [x, y] = p.zspots && p.zspots.length ? spot() : [p.cx + rnd(-60, 60), p.cy + rnd(-60, 60)]; if (!collide(x, y, 10, false)) return spawnMob(t, x, y, Object.assign({ poi: p.id }, o)); } return null; };
  if (p.type === 'camp') {
    const n = scale(rint(6, 8)); for (let i = 0; i < n; i++) put(pick(['raider', 'raider', 'raider_sg', 'raider_smg']));
    put('chief');
  } else if (p.type === 'legion') {
    const n = scale(rint(7, 9)); for (let i = 0; i < n; i++) put(pick(['legion', 'legion', 'legion_sn', 'legion_hv']));
    put('legion_cmd');
  } else if (p.def.z) {
    const n = scale(rint(p.def.z[0], p.def.z[1]));
    for (let i = 0; i < n; i++) {
      const t = G.rng.wpick([['walker', 70], ['runner', day >= 2 ? 15 : 3], ['spitter', p.type === 'hospital' ? 8 : 0], ['screamer', p.type === 'hospital' || p.type === 'market' ? 6 : 1], ['bloater', p.type === 'hospital' ? 8 : 2], ['zsoldier', p.type === 'bunker' || p.type === 'police' ? 20 : 0], ['brute', p.type === 'bunker' || p.type === 'warehouse' ? 8 : 1]]);
      put(t);
    }
    if (p.type === 'bunker' && p.id === G.pois.filter(q => q.type === 'bunker')[0].id) { put('abomination'); G.bossBunker = p.id; }
  }
}
function updatePOIs() {
  for (const p of G.pois) {
    if (p.hidden || p.type === 'village') continue;
    if (!p.spawned && dist(P.x, P.y, p.cx, p.cy) < 1000 && !p.cleared) activatePOI(p);
    if (p.spawned && !p.cleared) {
      if (!G.mobs.some(m => !m.dead && m.poi === p.id)) {
        p.cleared = true; msg('Zone nettoyée : ' + p.name + (p.def.claim ? ' — vous pouvez la réclamer (E sur le drapeau).' : ''), '#8affb0'); addXP(30); SFX.play('levelup');
        questEvent('clear', p);
      }
    }
  }
}

// ---------- Bases ----------
function claimPOI(p) {
  if (!p.spawned) activatePOI(p);
  if (!p.cleared) { msg('Éliminez d\'abord tous les occupants de ' + p.name + ' !', '#ff8a7a'); return; }
  for (const m of G.mobs) if (!m.dead && m.def.fac !== 'wild' && dist(m.x, m.y, p.flag.x, p.flag.y) < 420) { msg('Des ennemis rôdent encore près du drapeau.', '#ff8a7a'); return; }
  p.owned = true; p.lvl = 1; p.baseR = Math.hypot(p.w, p.h) * TS / 2 + 170; p.hpFlag = BASE_LEVELS[1].hp;
  let placed = false;
  for (let r = 1; r < 4 && !placed; r++) for (let dy = -r; dy <= r && !placed; dy++) for (let dx = -r; dx <= r && !placed; dx++) {
    const tx = p.flag.tx + dx, ty = p.flag.ty + dy;
    if (freeTile(tx, ty) && G.tiles[IDX(tx, ty)] !== T.WATER && !(dx === 0 && dy === 0)) { p.chest = placeStruct('chest', tx, ty, true); placed = true; }
  }
  msg('Base établie : ' + p.name + ' ! Construisez des défenses (B) et améliorez-la (E sur le drapeau).', '#8affb0');
  SFX.play('levelup'); addXP(60); G.stats.bases++; questEvent('claim', p);
}
function upgradeBase(p) {
  if (p.lvl >= 5) return; const L = BASE_LEVELS[p.lvl + 1], cost = costOf(L.cost);
  if (!hasItems(cost)) { msg('Ressources insuffisantes.', '#e0a050'); return; }
  payItems(cost); p.lvl++; p.hpFlag = L.hp; msg(p.name + ' passe niveau ' + p.lvl + ' : ' + L.label + ' !', '#8affb0'); SFX.play('levelup'); addXP(40); questCheckSoon();
}
function repairBase(p) {
  const L = BASE_LEVELS[p.lvl]; if (p.hpFlag >= L.hp) { msg('Le drapeau est intact.', '#aaa'); return; }
  const cost = { wood: 3, scrap: 2 }; if (!hasItems(cost)) { msg('Il faut 3 bois et 2 ferrailles.', '#e0a050'); return; }
  payItems(cost); p.hpFlag = Math.min(L.hp, p.hpFlag + L.hp * .25); SFX.play('build');
}
function damageFlag(p, d) {
  if (!p.owned) return; p.hpFlag -= d; p.flagFlash = .15;
  if (p.hpFlag <= 0) loseBase(p);
}
function loseBase(p) {
  p.owned = false; p.lvl = 1; msg('⚠ Votre base ' + p.name + ' est tombée !', '#ff6a5a'); SFX.play('alarm');
  for (const f of G.friends) if (f.kind === 'recruit' && f.base === p.id) f.mode = 'follow';
  if (G.assault && G.assault.poi === p.id) G.assault = null;
}
function baseGuardCap() { let c = 0; for (const p of G.pois) if (p.owned) c += BASE_LEVELS[p.lvl].guards; return Math.max(1, c); }

// ---------- Assauts ----------
function startAssault(p, abstract) {
  const dm = difficultyMul(), day = G.day;
  const n = Math.min(45, Math.round((4 + day * 1.3 + p.lvl * 1.5) * dm.cnt));
  G.assault = { poi: p.id, n, t0: G.clock, mobs: [], done: false };
  msg('⚠ ASSAUT sur ' + p.name + ' ! Défendez le drapeau (' + n + ' assaillants).', '#ff6a5a'); SFX.play('alarm');
  const a0 = rnd(0, TAU);
  for (let i = 0; i < n; i++) {
    let x, y, ok = false;
    for (let k = 0; k < 30 && !ok; k++) { const a = a0 + rnd(-.9, .9), d = rnd(750, 1000); x = p.flag.x + Math.cos(a) * d; y = p.flag.y + Math.sin(a) * d; ok = x > 60 && y > 60 && x < G.W * TS - 60 && y < G.H * TS - 60 && !collide(x, y, 12, false); }
    if (!ok) continue;
    const human = day >= 5 && Math.random() < .22;
    const m = spawnMob(human ? pick(['raider', 'raider_sg', 'raider_smg']) : pickZombieType(true), x, y, { assault: p.id, state: human ? 'combat' : 'chase', horde: true });
    G.assault.mobs.push(m);
  }
  if (P.rep >= 50) {
    for (let i = 0; i < 3; i++) { const f = makeRecruit(pick(['smg', 'shotgun', 'ar']), p.flag.x + rnd(-60, 60), p.flag.y + rnd(-60, 60)); f.expire = G.clock + 260; f.mode = 'follow'; f.base = p.id; f.name = 'Renfort'; f.temp = true; }
    msg('Des gardes de Fort Espoir viennent vous prêter main-forte !', '#8ac0ff');
  }
}
function updateAssault(dt) {
  const a = G.assault; if (!a) return;
  const p = G.pois[a.poi];
  if (!p || !p.owned) { G.assault = null; return; }
  G.flowBT = (G.flowBT || 0) - dt;
  if (G.flowBT <= 0) { G.flowBT = .8; G.flowB.compute(Math.floor(p.flag.x / TS), Math.floor(p.flag.y / TS)); }
  if (a.mobs.every(m => m.dead)) {
    msg('Assaut repoussé ! (+' + (40 + a.n * 3) + ' capsules)', '#8affb0'); SFX.play('levelup');
    dropPickup(p.flag.x, p.flag.y, 'caps', 40 + a.n * 3); addXP(40 + a.n * 4); G.stats.assaults++;
    G.assault = null;
  }
}
function abstractAssault(p) {
  const day = G.day, n = Math.min(50, 5 + day * 1.6 + p.lvl * 2);
  let def = BASE_LEVELS[p.lvl].hp / 12 + p.lvl * 40;
  for (const s of G.structs.values()) if (baseAt(s.x, s.y) === p) { if (s.type === 'turret' && s.ammo > 10) def += 45; else if (s.type.startsWith('wall_')) def += s.hp / 70; }
  for (const f of G.friends) if (f.kind === 'recruit' && f.base === p.id && !f.dead) def += 50;
  const atk = n * (9 + day);
  if (atk > def * 1.25 && Math.random() < .8) { loseBase(p); }
  else { msg('Votre base ' + p.name + ' a subi une attaque mais a tenu bon.', '#e0c070'); p.hpFlag = Math.max(50, p.hpFlag - Math.max(0, (atk - def) * 3)); }
}

// ---------- Nouvelle journée / événements ----------
function onNewDay() {
  G.day = dayNum();
  msg('☀ Jour ' + G.day + ' — vous avez survécu à la nuit.', '#ffe9a0'); banner('☀ JOUR ' + G.day, 'Vous avez survécu à la nuit', '#ffe9a0');
  // production des bases
  for (const p of G.pois) if (p.owned) {
    p.hpFlag = BASE_LEVELS[p.lvl].hp;
    if (p.chest && G.structs.get(IDX(p.chest.tx, p.chest.ty)) === p.chest) {
      const add = (k, n) => { p.chest.stash[k] = (p.chest.stash[k] || 0) + n; };
      if (p.lvl >= 2) add('bottle_clean', 3); if (p.lvl >= 3) { add('veg', 2); add('wood', 6); } if (p.lvl >= 4) add('scrap', 6); if (p.lvl >= 5) add('metal', 3);
      if (p.lvl >= 2) msg('Votre base ' + p.name + ' a produit des ressources (coffre).', '#9fd69f');
    }
  }
  // gardes du fort ressuscités
  for (const f of G.friends) if (f.kind === 'guard' && f.dead && G.clock >= f.respawn) { f.dead = false; f.hp = f.maxhp; f.x = f.hx; f.y = f.hy; }
  // largage
  if (G.day >= 2 && Math.random() < .5) spawnAirdrop();
  // embuscade de pillards
  if (G.day >= 4 && Math.random() < .5) G.ambushAt = G.clock + rnd(.15, .5) * DAY_LEN;
  saveGame(true);
}
function spawnAirdrop() {
  const t = randomLandTile(G.rng, 14, 55); if (!t) return;
  const [tx, ty] = t, i = IDX(tx, ty);
  const o = addObj(tx, ty, 'crate', { solid: 1, loot: rollLoot(LOOT.airdrop, G.rng, 4), gear: [], opened: false, air: true, poi: -1, cid: G.nextCrate = (G.nextCrate || 0) + 1 });
  const rr = rollRare('airdrop', G.rng); if (rr) o.gear.push(rr);
  G.airdrop = { x: o.x, y: o.y, o };
  const n = 4 + Math.floor(G.day / 2);
  for (let k = 0; k < n; k++) { const a = rnd(0, TAU), d = rnd(60, 160); const x = o.x + Math.cos(a) * d, y = o.y + Math.sin(a) * d; if (!collide(x, y, 10, false)) spawnMob(pickZombieType(false), x, y, { ambient: true, state: 'wander' }); }
  msg('📦 Un largage de ravitaillement a été repéré ! (voir la carte M) — attention aux infectés attirés.', '#ffd070'); SFX.play('alarm');
  const p = { id: -1 };
}
function spawnAmbush() {
  const n = 3 + Math.floor(G.day / 2); const a0 = rnd(0, TAU);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 20; k++) { const a = a0 + rnd(-.5, .5), d = rnd(520, 640), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d; if (!collide(x, y, 12, false) && !(G.village && dist(x, y, G.village.cx, G.village.cy) < G.village.safe)) { const m = spawnMob(pick(['raider', 'raider_sg', 'raider_smg']), x, y, { ambient: true, state: 'combat' }); m.alertT = 15; break; } }
  }
  msg('Des pillards vous tendent une embuscade !', '#ff8a7a'); SFX.play('alarm');
}
function spawnHorde() {
  const n = Math.min(45, Math.round((4 + G.day * 2.2) * difficultyMul().cnt));
  const a0 = rnd(0, TAU); let c = 0;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 20; k++) {
      const a = a0 + rnd(-.7, .7), d = rnd(700, 950), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
      if (x < 60 || y < 60 || x > G.W * TS - 60 || y > G.H * TS - 60 || collide(x, y, 12, false)) continue;
      if (G.village && dist(x, y, G.village.cx, G.village.cy) < G.village.safe) continue;
      spawnMob(pickZombieType(true), x, y, { horde: true, state: 'chase', ambient: true }); c++; break;
    }
  }
  if (c) { msg('🧟 Une horde de ' + c + ' infectés approche !', '#ff6a5a'); SFX.play('alarm'); }
  if (G.day % 7 === 0) {
    for (let k = 0; k < 20; k++) { const a = a0 + rnd(-.3, .3), d = 850, x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d; if (!collide(x, y, 26, false)) { const b = spawnMob('abomination', x, y, { horde: true, state: 'chase', ambient: true, hpMul: .6 }); msg('☠ UNE ABOMINATION est parmi eux...', '#ff3a3a'); break; } }
  }
}

function updateEvents(dt) {
  const ph = phaseOf(G.clock);
  const day = G.day;
  // changement de jour
  if (dayNum() !== G.day) { onNewDay(); }
  // coucher du soleil : horde + assaut
  if (ph > .66 && G.hordeDay !== day) {
    G.hordeDay = day; banner('🌙 LA NUIT TOMBE', day >= 2 ? 'Des hordes approchent — restez à l\'abri' : 'Allumez un feu, trouvez un abri', '#9ab8ff');
    if (day >= 2) spawnHorde();
    const bases = G.pois.filter(p => p.owned);
    if (bases.length && day >= 3 && (day % 2 === 1 || Math.random() < .4)) {
      const b = pick(bases);
      if (!G.assault) { if (dist(P.x, P.y, b.cx, b.cy) < 2300) startAssault(b); else abstractAssault(b); }
    }
  }
  if (G.ambushAt && G.clock > G.ambushAt && !isNight()) { G.ambushAt = 0; if (!(G.village && dist(P.x, P.y, G.village.cx, G.village.cy) < G.village.safe)) spawnAmbush(); }
  updateAssault(dt);
}

function updateRadFx(dt) {
  for (const z of G.radZones) {
    if (dist(z.x, z.y, P.x, P.y) > z.r + 700) continue;
    if (Math.random() < dt * 14) { const a = rnd(0, TAU), d = Math.sqrt(Math.random()) * z.r; addPart(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, rnd(-8, 8), rnd(-30, -10), rnd(.8, 1.6), rnd(2, 4), '#9aff3a', 'fire'); }
  }
}
function aliveCount(f) { let n = 0; for (const m of G.mobs) if (!m.dead && f(m)) n++; return n; }
function updateSpawning(dt) {
  G.ambT -= dt;
  if (G.ambT <= 0) {
    const night = isNight(); G.ambT = night ? .9 : 2;
    const dm = difficultyMul();
    const cap = Math.min(70, Math.round((6 + G.day * 1.5) * (night ? 1.8 : 1) * dm.cnt * (tutSafe() ? .3 : 1)));
    const count = aliveCount(m => m.ambient && m.def.fac === 'undead' && !m.horde && !m.assault);
    if (count < cap) {
      for (let k = 0; k < 10; k++) {
        const a = rnd(0, TAU), d = rnd(680, 960), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
        if (x < 60 || y < 60 || x > G.W * TS - 60 || y > G.H * TS - 60 || collide(x, y, 12, false)) continue;
        if (G.village && dist(x, y, G.village.cx, G.village.cy) < G.village.safe) continue;
        const bb = baseAt(x, y); if (bb) continue;
        let inB = false; for (const b of G.buildings) if (x > (b.x - 1) * TS && x < (b.x + b.w + 1) * TS && y > (b.y - 1) * TS && y < (b.y + b.h + 1) * TS) inB = true;
        if (inB) continue;
        const m = spawnMob(pickZombieType(night), x, y, { ambient: true, state: 'wander' });
        if (night && Math.random() < .35) { m.state = 'investigate'; m.ix = P.x + rnd(-100, 100); m.iy = P.y + rnd(-100, 100); m.it = 25; }
        break;
      }
    }
    // animaux
    G.wildT -= 1;
    if (G.wildT <= 0) {
      G.wildT = 12;
      const wc = aliveCount(m => m.def.fac === 'wild');
      if (wc < 44) {
        for (let k = 0; k < 8; k++) {
          const a = rnd(0, TAU), d = rnd(800, 1500), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
          if (x < 80 || y < 80 || x > G.W * TS - 80 || y > G.H * TS - 80 || collide(x, y, 12, false)) continue;
          const t = G.rng.wpick([['rabbit', 40], ['deer', 25], ['boar', 20], ['wolf', 15]]);
          spawnMob(t, x, y, {}); break;
        }
      }
    }
  }
  // dégagement des mobs trop lointains
  G.cullT -= dt;
  if (G.cullT <= 0) {
    G.cullT = 3;
    for (const m of G.mobs) if (!m.dead && m.ambient && !m.assault && dist(m.x, m.y, P.x, P.y) > 1700) { m.dead = true; m.silent = true; }
  }
}

// ---------- Mise à jour principale ----------
function updateGame(dt) {
  G.clock += dt; G.dark = darkness(phaseOf(G.clock)); G.tick++;
  G.playTime += dt;
  if (!P.dead) updatePlayer(dt);
  // champs de flux
  G.flowT -= dt;
  if (G.flowT <= 0) { G.flowT = .5; G.flowP.compute(Math.floor(P.x / TS), Math.floor(P.y / TS)); }
  // mobs actifs
  const R2 = 1500 * 1500;
  for (const m of G.mobs) {
    if (m.dead) continue;
    const dx = m.x - P.x, dy = m.y - P.y;
    m.act = dx * dx + dy * dy < R2 || m.assault;
    if (m.act) updateMob(m, dt);
    if (m.lunge > 0) m.lunge -= dt;
  }
  for (const f of G.friends) { if (!f.dead) { updateFriend(f, dt); if (f.flashT > 0) f.flashT -= dt; if (f.lunge > 0) f.lunge -= dt; if (f.expire && G.clock > f.expire) f.dead = true, f.silent = true; } }
  updateNPCs(dt);
  separateAll(dt);
  updateVehicles(dt); updateRadFx(dt); updateWeather(dt);
  updateBullets(dt); updateFires(dt); updateBurning(dt); updateThrown(dt); updateStructs(dt);
  updateSpawning(dt); updateEvents(dt);
  G.poiT -= dt; if (G.poiT <= 0) { G.poiT = .6; updatePOIs(); updateRegrow(); }
  if (G.qDirty) checkQuests();
  // nettoyage
  if (G.tick % 20 === 0) {
    G.mobs = G.mobs.filter(m => !m.dead); G.friends = G.friends.filter(f => !f.dead || f.kind === 'guard');
  }
  // particules
  for (let i = G.parts.length - 1; i >= 0; i--) { const p = G.parts[i]; p.life -= dt; if (p.life <= 0) { G.parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.max(0, 1 - dt * 3); p.vy *= Math.max(0, 1 - dt * 3); }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt; t.y -= 26 * dt; if (t.life <= 0) G.texts.splice(i, 1); }
  for (let i = G.decals.length - 1; i >= 0; i--) { G.decals[i].life -= dt; if (G.decals[i].life <= 0) G.decals.splice(i, 1); }
  for (let i = G.blasts.length - 1; i >= 0; i--) { G.blasts[i].life -= dt; if (G.blasts[i].life <= 0) G.blasts.splice(i, 1); }
  for (let i = G.msgs.length - 1; i >= 0; i--) { G.msgs[i].life -= dt; if (G.msgs[i].life <= 0) G.msgs.splice(i, 1); }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 22);
  // retours visuels / audio
  for (let i = G.toasts.length - 1; i >= 0; i--) { const t = G.toasts[i]; t.age += dt; t.life -= dt; if (t.pop > 0) t.pop -= dt; if (t.life <= 0) G.toasts.splice(i, 1); }
  for (let i = G.dmgInd.length - 1; i >= 0; i--) { G.dmgInd[i].t -= dt; if (G.dmgInd[i].t <= 0) G.dmgInd.splice(i, 1); }
  if (G.banner) { G.banner.t += dt; if (G.banner.t > 3.4) G.banner = null; }
  if (G.hitm && G.hitm.t > 0) G.hitm.t -= dt;
  G.kick.x *= Math.max(0, 1 - dt * 9); G.kick.y *= Math.max(0, 1 - dt * 9);
  if (G.fadeIn > 0) G.fadeIn -= dt * .8;
  if (!P.dead && P.hp < maxHP() * .28) { G.heartT -= dt; if (G.heartT <= 0) { SFX.play('heart', .8); G.heartT = lerp(.55, 1.2, P.hp / (maxHP() * .28)); } }
  G.tipT -= dt; if (G.tipT <= 0) { G.tipT = 2; updateTips(); }
  updateTutorial(dt);
  G.droneT -= dt; if (G.droneT <= 0) { G.droneT = .7; let th = 0; for (const m of G.mobs) if (!m.dead && m.def.fac !== 'wild' && (m.state === 'chase' || m.state === 'combat') && dist(m.x, m.y, P.x, P.y) < 700) th++; if (SET.music > 0 && SFX.ctx) SFX.drone(clamp(th / 10 + G.dark * .35 + (G.assault ? .4 : 0), 0, 1)); }
  // autosave
  G.saveT -= dt; if (G.saveT <= 0) { G.saveT = 90; saveGame(true); }
  // sommeil
  if (G.sleeping) { G.sleepFade -= dt * .8; if (G.sleepFade <= 0 && G.sleeping) { G.sleeping = false; finishSleep(); G.wakeFade = 1; } }
  if (G.wakeFade > 0) G.wakeFade -= dt * .8;
}

// ---------- Fin de partie ----------
function gameOver(cause) {
  if (P.dead) return;
  P.dead = true; P.hp = 0; SFX.play('explode', .4);
  const res = { cause, day: G.day, clock: clockText(), kills: G.stats.kills, time: G.playTime, lvl: P.lvl, bases: G.stats.bases, built: G.stats.built, score: Math.floor(G.playTime / 6 + G.stats.kills * 3 + G.stats.quests * 40 + G.stats.assaults * 60) };
  let best = 0; try { best = +localStorage.getItem('zs_best') || 0; if (res.score > best) { localStorage.setItem('zs_best', String(res.score)); res.newBest = true; } res.best = Math.max(best, res.score); localStorage.removeItem('zs_save_v1'); } catch (e) { }
  G.over = res; setTimeout(() => showGameOver(res), 1200);
}

// ---------- Sauvegarde ----------
function packExplored() {
  const a = G.explored; let s = '';
  for (let i = 0; i < a.length; i += 6) { let v = 0; for (let k = 0; k < 6; k++) v = (v << 1) | (a[i + k] || 0); s += String.fromCharCode(48 + v); }
  return s;
}
function unpackExplored(s) {
  const a = new Uint8Array(G.W * G.H);
  for (let i = 0, j = 0; i < a.length; i += 6, j++) { const v = s.charCodeAt(j) - 48; for (let k = 0; k < 6; k++) a[i + k] = (v >> (5 - k)) & 1; }
  return a;
}
function saveGame(silent) {
  if (!G || P.dead || G.over) return;
  try {
    const data = {
      v: 1, seed: G.seed, diff: G.diff, wo: G.wo, clock: G.clock, playTime: G.playTime, stats: G.stats, radioOn: G.radioOn, hordeDay: G.hordeDay,
      p: { x: P.x, y: P.y, hp: P.hp, hun: P.hun, thi: P.thi, stam: P.stam, inv: P.inv, gear: P.gear, slots: P.slots, sel: P.sel, armor: P.armor, pack: P.pack, known: P.known, skills: P.skills, sp: P.sp, lvl: P.lvl, xp: P.xp, bleed: P.bleed, infect: P.infect, sick: P.sick, rep: P.rep, temp: P.temp, rad: P.rad, healT: G.docDay },
      structs: [...G.structs.values()].filter(s => !s.free).map(s => ({ type: s.type, tx: s.tx, ty: s.ty, hp: s.hp, ammo: s.ammo, stash: s.stash, plant: s.plant, t0: s.t0, water: s.water })),
      pois: G.pois.map(p => ({ id: p.id, owned: p.owned, lvl: p.lvl, hpFlag: p.hpFlag, cleared: p.cleared, discovered: p.discovered, chest: p.chest ? [p.chest.tx, p.chest.ty] : null })),
      crates: [...G.objs.values()].filter(o => o.k === 'crate' && o.opened).map(o => o.cid),
      airdrops: [...G.objs.values()].filter(o => o.k === 'crate' && o.air && !o.opened).map(o => ({ tx: o.tx, ty: o.ty, loot: o.loot, gear: o.gear, cid: o.cid })),
      dep: G.depleted.map(o => [o.tx, o.ty, Math.round(o.regrowAt - G.clock)]),
      quests: G.quests, mines: G.mines.map(m => ({ x: m.x, y: m.y })),
      friends: G.friends.filter(f => !f.dead && (f.kind === 'pet' || (f.kind === 'recruit' && !f.temp))).map(f => ({ kind: f.kind, sp: f.sp, name: f.name, x: f.x, y: f.y, hp: f.hp, maxhp: f.maxhp, dmg: f.dmg, lvl: f.lvl, kills: f.kills, gun: f.gun, mode: f.mode, base: f.base })),
      vehicles: G.vehicles.map(v => ({ t: v.t, x: v.x, y: v.y, ang: v.ang, hp: v.hp, fuel: v.fuel, stash: v.stash, up: v.up })),
      zones: G.radZones.map(z => z.discovered), weather: { t: G.wType, left: G.wLeft, next: G.wNext },
      exp: packExplored(), docDay: G.docDay,
    };
    localStorage.setItem('zs_save_v1', JSON.stringify(data));
    if (!silent) msg('Partie sauvegardée.', '#9fd69f');
  } catch (e) { console.warn('save failed', e); if (!silent) msg('Échec de la sauvegarde.', '#ff8a7a'); }
}
function hasSave() { try { return !!localStorage.getItem('zs_save_v1'); } catch (e) { return false; } }
function loadSaveData() { try { return JSON.parse(localStorage.getItem('zs_save_v1')); } catch (e) { return null; } }

function applySave(d) {
  G.clock = d.clock; G.playTime = d.playTime || 0; G.day = dayNum(); G.stats = Object.assign(G.stats, d.stats || {}); G.radioOn = d.radioOn; G.hordeDay = d.hordeDay; G.docDay = d.docDay;
  Object.assign(P, d.p); P.known = d.p.known || {}; P.slots = d.p.slots || [null, null, null, null, null];
  // structures
  for (const s of G.structs.values()) { if (!s.free) removeStructRaw(s); }
  for (const e of d.structs) { const s = placeStruct(e.type, e.tx, e.ty, true); s.hp = e.hp; if (e.ammo !== undefined) s.ammo = e.ammo; if (e.stash) s.stash = e.stash; if (e.plant !== undefined) { s.plant = e.plant; s.t0 = e.t0; } if (e.water !== undefined) s.water = e.water; }
  for (const e of d.pois) {
    const p = G.pois[e.id]; if (!p) continue;
    p.owned = e.owned; p.lvl = e.lvl; p.hpFlag = e.hpFlag; p.cleared = e.cleared; p.discovered = e.discovered; p.spawned = e.cleared;
    if (p.owned) { p.baseR = Math.hypot(p.w, p.h) * TS / 2 + 170; if (e.chest) p.chest = G.structs.get(IDX(e.chest[0], e.chest[1])) || null; }
  }
  const opened = new Set(d.crates); for (const o of G.objs.values()) if (o.k === 'crate' && opened.has(o.cid)) o.opened = true;
  for (const a of (d.airdrops || [])) { if (!G.objs.has(IDX(a.tx, a.ty))) addObj(a.tx, a.ty, 'crate', { solid: 1, loot: a.loot, gear: a.gear, opened: false, air: true, poi: -1, cid: a.cid }); }
  G.depleted = []; for (const [tx, ty, left] of d.dep) { const o = G.objs.get(IDX(tx, ty)); if (o) { o.dep = true; o.regrowAt = G.clock + left; const i = IDX(tx, ty); if (HARV[o.k] && HARV[o.k].solid && G.solid[i] === SO.OBJ) G.solid[i] = 0; G.depleted.push(o); } }
  G.quests = d.quests; G.mines = d.mines.map(m => ({ x: m.x, y: m.y, arm: 0 }));
  G.friends = G.friends.filter(f => f.kind === 'guard');
  for (const e of d.friends) {
    if (e.kind === 'pet') { const def = MOBS[e.sp]; const f = makePet({ t: e.sp, def, x: e.x, y: e.y }); Object.assign(f, { hp: e.hp, maxhp: e.maxhp, dmg: e.dmg, lvl: e.lvl, kills: e.kills, mode: e.mode || 'follow', name: e.name }); }
    else { const f = makeRecruit(e.gun, e.x, e.y); Object.assign(f, { hp: e.hp, name: e.name, mode: e.mode, base: e.base }); }
  }
  if (d.vehicles) { G.vehicles = d.vehicles.map(e => { const v = newVehicle(e.t, e.x, e.y); if (e.up) { v.up = Object.assign(v.up, e.up); applyUpgrades(v); } v.ang = e.ang; v.hp = e.hp; v.fuel = e.fuel; v.stash = e.stash || {}; return v; }); }
  if (d.zones) d.zones.forEach((f, i) => { if (G.radZones[i]) G.radZones[i].discovered = f; });
  if (d.weather) { G.wType = d.weather.t; G.wLeft = d.weather.left; G.wNext = d.weather.next; G.wInt = G.wType === 'clear' ? 0 : 1; }
  G.explored = unpackExplored(d.exp);
  repaintMini();
  G.dark = darkness(phaseOf(G.clock)); P.dead = false;
}

// ---------- Initialisation ----------
function initGame(opts) {
  opts = opts || {};
  const seed = opts.seed || Math.floor(Math.random() * 1e9);
  G = {
    W: (WORLD_SIZES[(opts.wo || {}).size] || WORLD_SIZES.M).v, H: (WORLD_SIZES[(opts.wo || {}).size] || WORLD_SIZES.M).v, wo: Object.assign({ size: 'M', style: 'balanced', dens: 1 }, opts.wo || {}), style: (opts.wo || {}).style || 'balanced', dens: (opts.wo || {}).dens === undefined ? 1 : opts.wo.dens, seed, diff: opts.diff === undefined ? 1 : opts.diff, clock: DAY_LEN * 0.12, playTime: 0, day: 1, dark: 0, tick: 0,
    mobs: [], friends: [], npcs: [], bullets: [], pickups: [], parts: [], texts: [], decals: [], fires: [], blasts: [], thrown: [], mines: [], msgs: [], depleted: [],
    toasts: [], dmgInd: [], banner: null, hitm: null, fadeIn: 1.4, kick: { x: 0, y: 0 }, hitstop: 0, tscale: 1, slowT: 0, heartT: 0, tipT: 3, droneT: 0, edgeT: 0, keys: {}, mouse: { x: 0, y: 0, sx: 0, sy: 0 }, lmb: false, rmb: false, lmbEdge: false, shake: 0, cam: { x: 0, y: 0 }, paused: false,
    quests: { active: {}, done: {}, tracked: null, contractN: 0 }, stats: { kills: 0, zkills: 0, built: 0, looted: 0, gathered: 0, quests: 0, bases: 0, assaults: 0 },
    flowP: new Flow(84), flowB: new Flow(84), flowT: 0, flowDirty: false, ambT: 3, wildT: 5, cullT: 3, poiT: 0, saveT: 90, qDirty: false, hordeDay: 0, radioOn: false, assault: null,
    sleeping: false, sleepFade: 0, wakeFade: 0, buildMode: false, buildType: 'wall_wood', prompt: null, over: null, docDay: 0, ambushAt: 0,
  };
  genWorld(seed);
  G.explored = new Uint8Array(G.W * G.H);
  initMini();
  P = newPlayer(); P.x = G.spawn.x; P.y = G.spawn.y;
  initWeather();
  G.structsFree = [];
  const cf = placeStruct('campfire', G.campfireStart.tx, G.campfireStart.ty, true); cf.free = true;
  // animaux
  for (const a of G.mobsInit) spawnMob(a.t, a.x, a.y, {});
  // PNJ
  for (const n of G.npcsDef) G.npcs.push({ id: n.id, name: n.name, role: n.role, col: n.col, x: n.x * TS + 16, y: n.y * TS + 16, r: 12, anim: Math.random() * 6, face: 0 });
  // gardes du fort
  const v = G.village; const guns = ['pistol', 'shotgun', 'pistol', 'ar', 'smg'];
  v.guardSpots.forEach((s, i) => makeGuard(s[0] * TS + 16, s[1] * TS + 16, guns[i % guns.length]));
  v.discovered = false;
  if (!opts.load) giveStart();
  revealAround(Math.floor(P.x / TS), Math.floor(P.y / TS), 16);
  G.flowP.compute(Math.floor(P.x / TS), Math.floor(P.y / TS));
  if (opts.load) { applySave(opts.load); }
  else {
    if (opts.tutorial === true || (opts.tutorial !== false && SET.tutorial)) tutStart();
    else { msg('Bienvenue, survivant. F1 : aide · Tab : sac · J : quêtes · M : carte.', '#cfe8ff'); }
  }
  G.day = dayNum();
}
