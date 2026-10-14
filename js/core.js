'use strict';
// ===== Inventaire, statistiques d'armes, XP =====
let G = null; // état global de la partie
let P = null; // joueur

function msg(text, col) {
  if (!G) return;
  const last = G.msgs[G.msgs.length - 1];
  if (last && last.base === text) { last.n = (last.n || 1) + 1; last.t = text + ' (×' + last.n + ')'; last.life = 7; return; }
  G.msgs.push({ t: text, base: text, col: col || '#e8e8e8', life: 7 });
  if (G.msgs.length > 7) G.msgs.shift();
}
function invCount(id) { return P.inv[id] || 0; }
function invWeight() { let w = 0; for (const k in P.inv) w += (ITEMS[k] ? ITEMS[k].w : 0) * P.inv[k]; return w; }
function invCap() { return 40 + P.pack * 22 + P.skills.carry * 8; }
function invAdd(id, n) {
  n = Math.floor(n); if (n <= 0) return 0;
  const it = ITEMS[id]; if (!it) return 0;
  let can = n;
  if (it.w > 0) { const free = invCap() - invWeight(); can = Math.min(n, Math.floor(free / it.w + 1e-6)); }
  if (can <= 0) return 0;
  P.inv[id] = (P.inv[id] || 0) + can;
  if (id === 'caps') {} 
  return can;
}
function invTake(id, n) {
  const have = P.inv[id] || 0; const t = Math.min(have, n);
  P.inv[id] = have - t; if (P.inv[id] <= 0) delete P.inv[id];
  return t;
}
// Ajoute à l'inventaire ; le surplus tombe au sol
function giveItem(id, n, silent) {
  const got = invAdd(id, n);
  if (!silent && got > 0) { toastItem(id, got); SFX.play('pickup'); questCheckSoon(); }
  if (got < n) { dropPickup(P.x + rnd(-20, 20), P.y + rnd(-20, 20), id, n - got); msg('Inventaire plein ! ' + (n - got) + ' ' + ITEMS[id].n + ' laissé(s) au sol.', '#e0a050'); }
  return got;
}
function craftN(n) { return Math.max(1, Math.ceil(n * (1 - .07 * P.skills.craft))); }
function costOf(cost) { const c = {}; for (const k in cost) c[k] = craftN(cost[k]); return c; }
function hasItems(cost) { for (const k in cost) if (invCount(k) < cost[k]) return false; return true; }
function payItems(cost) { for (const k in cost) invTake(k, cost[k]); }
function costText(cost) { return Object.keys(cost).map(k => (ITEMS[k] ? ITEMS[k].i : '?') + cost[k]).join(' '); }

// ===== Armes =====
function makeWeapon(id) {
  const b = WEAPONS[id];
  return { kind: 'w', id, lvl: 1, mag: b.mag || 0, att: {}, dur: 100 };
}
function durOf(w) { return w.dur === undefined ? 100 : w.dur; }
function repairCost(w) { const m = 100 - durOf(w), t = Math.max(1, Math.round(((WEAPONS[w.id].v || 20) / 40))); return cleanCost({ scrap: Math.ceil(m / 14), metal: Math.ceil(m / 45 * Math.min(2, t)) }); }
function wearGear(w, a) {
  const was = durOf(w); w.dur = Math.max(0, was - a);
  if (was >= 35 && w.dur < 35) { msg('⚠ ' + gearName(w) + ' est usé (' + Math.round(w.dur) + '%) — réparez-le (Tab → Établi).', '#ffb060'); SFX.play('click', .6); }
  else if (was >= 12 && w.dur < 12) { msg('⚠ ' + gearName(w) + ' va lâcher : il s\'enraye et frappe moins fort !', '#ff7a6a'); SFX.play('click', .8); }
}
function makeArmor(id) { return { kind: 'a', id, lvl: 1 }; }
function gearName(g) { return (g.kind === 'w' ? WEAPONS[g.id].n : ARMOR[g.id].n) + (g.lvl > 1 ? ' +' + (g.lvl - 1) : ''); }
function gearIcon(g) { return g.kind === 'w' ? WEAPONS[g.id].i : ARMOR[g.id].i; }
function wstat(inst) {
  const b = WEAPONS[inst.id], lv = inst.lvl - 1, o = Object.assign({}, b);
  o.dmg = b.dmg * (1 + .14 * lv);
  o.rate = b.rate * (1 - .03 * lv);
  const q = Math.min(1, durOf(inst) / 100), wear = q < .5 ? .5 - q : 0; // usure : au-dessous de 50 %
  if (wear) { o.dmg *= 1 - wear * .6; o.rate *= 1 + wear * .5; }
  if (b.melee) {
    o.dmg *= 1 + .12 * P.skills.str;
    return o;
  }
  o.mag = Math.round(b.mag * (1 + (lv >= 2 ? .2 : 0)));
  o.spr = b.spr * (1 - .08 * P.skills.aim) * (1 - .04 * lv) * (1 + wear * 1.2);
  o.rel = b.rel * (1 - .07 * P.skills.aim);
  o.noiseR = b.noise; o.zoom = 0; o.laser = 0;
  for (const slot in inst.att) {
    const e = MOD_EFFECT[inst.att[slot]]; if (!e) continue;
    if (e.range) o.range *= e.range; if (e.spr) o.spr *= e.spr; if (e.noise) o.noiseR *= e.noise;
    if (e.dmg) o.dmg *= e.dmg; if (e.mag) o.mag = Math.ceil(o.mag * e.mag);
    if (e.zoom) o.zoom = 1; if (e.laser) o.laser = 1;
  }
  if (b.scoped) o.zoom = 1;
  o.silenced = o.noiseR < b.noise * .5;
  return o;
}
function curWeapon() { return P.slots[P.sel]; }
function ammoReserve(w) { const b = WEAPONS[w.id]; return (P.inv[b.ammo] || 0) * (AMMO_PER[b.ammo] || 1); }
function giveWeapon(inst, silent) {
  const i = P.slots.indexOf(null);
  if (i >= 0) { P.slots[i] = inst; if (P.slots.filter(Boolean).length === 1) P.sel = i; }
  else P.gear.push(inst);
  if (!silent) msg('Obtenu : ' + gearName(inst) + (i < 0 ? ' (en réserve)' : ''), '#ffd070');
  SFX.play('pickup'); questCheckSoon();
}
function giveArmorInst(inst, silent) {
  const cur = P.armor[ARMOR[inst.id].slot];
  if (!cur) { P.armor[ARMOR[inst.id].slot] = inst; if (!silent) msg('Équipé : ' + gearName(inst), '#ffd070'); }
  else { P.gear.push(inst); if (!silent) msg('Obtenu : ' + gearName(inst) + ' (en réserve)', '#ffd070'); }
  SFX.play('pickup');
}
function giveGear(kind, id, silent) {
  if (kind === 'w') giveWeapon(makeWeapon(id), silent);
  else if (kind === 'a') giveArmorInst(makeArmor(id), silent);
  else if (kind === 'm') giveItem(id, 1, silent);
  else if (kind === 'p') giveItem(id, 1, silent);
}
function armorValue() {
  let a = 0;
  for (const s in P.armor) { const g = P.armor[s]; if (g) a += ARMOR[g.id].ar * (1 + .2 * (g.lvl - 1)); }
  return a;
}
function moveSpeedMul() {
  let m = 1; const f = P.armor.feet; if (f) m += ARMOR[f.id].spd || 0;
  const w = invWeight() / invCap(); if (w > .85) m -= (w - .85) * 1.2;
  return Math.max(.6, m);
}
function maxHPBase() { return 100 + P.skills.end * 10 + (P.lvl - 1) * 2; }
function maxHP() { return Math.max(20, maxHPBase() * (1 - (P.rad || 0) / 160)); }
function armorWarmth() { let a = 0; for (const s in P.armor) { const g = P.armor[s]; if (g) a += (ARMOR[g.id].warm || 0) * (1 + .1 * (g.lvl - 1)); } return a; }
function radResist() { let k = 1; for (const s in P.armor) { const g = P.armor[s]; if (g && ARMOR[g.id].rad) k *= 1 - ARMOR[g.id].rad; } if (P.veh && P.veh.def.closed) k *= .5; return 1 - k; }
function maxStam() { return 100 + P.skills.end * 12; }

// ===== XP / niveaux =====
function xpNeed(l) { return Math.round(50 * Math.pow(l, 1.5)); }
function addXP(n) {
  P.xp += n; if (n >= 3) addText(P.x + rnd(-10, 10), P.y - 38, '+' + Math.round(n) + ' XP', '#8ac8ff');
  while (P.xp >= xpNeed(P.lvl)) {
    P.xp -= xpNeed(P.lvl); P.lvl++; P.sp++;
    msg('Niveau ' + P.lvl + ' ! +1 point de compétence (touche K)', '#ffe070'); SFX.play('levelup'); banner('⭐ NIVEAU ' + P.lvl, '+1 point de compétence (K)', '#ffe070'); for (let i = 0; i < 24; i++) { const a = rnd(0, TAU); addPart(P.x, P.y, Math.cos(a) * 140, Math.sin(a) * 140, .7, 3, '#ffe070', 'fire'); } addPart(P.x, P.y, 0, 0, .8, 60, '#ffe070', 'ring');
    P.hp = Math.min(maxHP(), P.hp + 20);
  }
}

// ===== Temps =====
function phaseOf(clock) { return (clock % DAY_LEN) / DAY_LEN; }
function darkness(p) {
  if (p < .08) return lerp(.88, 0, p / .08);
  if (p < .58) return 0;
  if (p < .72) return lerp(0, .88, (p - .58) / .14);
  return .88 + (p - .72) / .28 * .06;
}
function isNight() { return G.dark > .5; }
function dayNum() { return Math.floor(G.clock / DAY_LEN) + 1; }
function clockText() {
  const h = (5 + phaseOf(G.clock) * 24) % 24; const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
function difficultyMul() { return G.diff === 0 ? { hp: .8, dmg: .7, hun: .7, cnt: .36 } : G.diff === 2 ? { hp: 1.3, dmg: 1.35, hun: 1.3, cnt: .7 } : { hp: 1, dmg: 1, hun: 1, cnt: .5 }; }
