'use strict';
// ===== Interface : panneaux DOM (sac, fabrication, quêtes, base, dialogues, carte) =====
const $ = id => document.getElementById(id);
let panelTab = null, panelCtx = null, dialogNpc = null, craftCat = 'Base', qsel = null;

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function nearStation(st) {
  if (!st) return true;
  for (const s of G.structs.values()) {
    if (dist(P.x, P.y, s.x, s.y) > 190) continue;
    if (st === 'campfire' && (s.type === 'campfire' || s.type === 'workbench')) return true;
    if (st === 'workbench' && s.type === 'workbench') return true;
  }
  if (st === 'campfire') for (const o of G.objs.values()) if (o.k === 'fire' && dist(P.x, P.y, o.x, o.y) < 190) return true;
  return false;
}
function openPanel(tab, ctxObj) {
  if (G.over) return;
  panelTab = tab; panelCtx = ctxObj || null; G.paused = true; G.buildMode = false; refreshBuildBar();
  $('panel').classList.remove('hidden'); renderPanel(); SFX.play('ui'); if (tab === 'map') tutEvent('map');
}
function closePanel() {
  panelTab = null; $('panel').classList.add('hidden'); $('dialog').classList.add('hidden'); G.paused = false; dialogNpc = null;
}
function panelOpen() { return panelTab !== null; }

function tabsHTML() {
  const t = [['inv', '🎒 Sac & équipement'], ['craft', '🛠️ Fabrication'], ['mods', '🔧 Améliorations'], ['skills', '⭐ Compétences'], ['quests', '📜 Quêtes'], ['map', '🗺️ Carte']];
  return '<div class="tabs">' + t.map(([k, n]) => '<button class="tab' + (panelTab === k ? ' on' : '') + '" data-act="tab" data-a="' + k + '">' + n + '</button>').join('') + '<button class="tab close" data-act="close">✖</button></div>';
}
function renderPanel() {
  const el = $('panel'); let body = '';
  const mainTabs = ['inv', 'craft', 'mods', 'skills', 'quests', 'map'];
  switch (panelTab) {
    case 'inv': body = invHTML(); break;
    case 'craft': body = craftHTML(); break;
    case 'mods': body = modsHTML(); break;
    case 'skills': body = skillsHTML(); break;
    case 'quests': body = questsHTML(); break;
    case 'map': body = '<div class="mapwrap"><canvas id="mapCanvas" width="640" height="640"></canvas><div class="legend">' + mapLegend() + '</div></div>'; break;
    case 'base': body = baseHTML(panelCtx); break;
    case 'chest': body = chestHTML(panelCtx); break;
    case 'veh': body = vehicleHTML(panelCtx); break;
  }
  el.innerHTML = (mainTabs.includes(panelTab) ? tabsHTML() : '<div class="tabs"><span class="ptitle">' + (panelTab === 'base' ? '🏴 Base' : panelTab === 'veh' ? '🚗 Véhicule' : '🧳 Coffre') + '</span><button class="tab close" data-act="close">✖</button></div>') + '<div class="pbody">' + body + '</div>';
  if (panelTab === 'map') drawFullMap();
}
function itemDesc(id) {
  const it = ITEMS[id], p = [it.n, 'Poids ' + it.w + ' kg · valeur ' + (it.v || 1)];
  if (it.use) { const u = it.use, e = []; if (u.hun) e.push('+' + u.hun + ' faim'); if (u.thi) e.push('+' + u.thi + ' soif'); if (u.hp) e.push('+' + u.hp + ' PV'); if (u.stam) e.push('+' + u.stam + ' endurance'); if (u.temp) e.push('+' + u.temp + ' chaleur'); if (u.rad) e.push(u.rad + ' radiation'); if (u.cure) e.push('soigne : ' + u.cure.join(', ')); if (u.sick) e.push('risque d\'intoxication ' + Math.round(u.sick * 100) + ' %'); p.push(e.join(' · ')); }
  if (it.t === 'ammo') p.push('Munition'); if (it.t === 'gadget') p.push('Gadget : touches G / F'); if (it.t === 'mod') p.push('Module d\'arme (onglet Améliorations)'); if (it.t === 'plan') p.push('Apprendre pour débloquer des recettes');
  return p.join('\n');
}
function itemRow(id, n, extra) {
  const it = ITEMS[id];
  return '<div class="item" title="' + esc(itemDesc(id)) + '"><span class="ic">' + it.i + '</span><span class="nm">' + esc(it.n) + '</span><span class="ct">x' + n + '</span>' + (extra || '') + '</div>';
}
function invHTML() {
  const wt = invWeight(), cap = invCap();
  let h = '<div class="cols"><div class="col"><h3>Sac <small>(' + wt.toFixed(1) + ' / ' + cap + ' kg)</small></h3><div class="list">';
  const groups = { food: 'Nourriture', drink: 'Boissons', med: 'Soins', ammo: 'Munitions', gadget: 'Gadgets', mod: 'Modules', plan: 'Plans', res: 'Ressources', bait: 'Divers' };
  for (const g in groups) {
    const ids = Object.keys(P.inv).filter(k => ITEMS[k].t === g && P.inv[k] > 0); if (!ids.length) continue;
    h += '<div class="grp">' + groups[g] + '</div>';
    for (const id of ids) {
      const it = ITEMS[id]; let btn = '';
      if (it.use && (it.t === 'food' || it.t === 'drink' || it.t === 'med')) btn = '<button data-act="use" data-a="' + id + '">Utiliser</button>';
      else if (it.t === 'plan') btn = '<button data-act="plan" data-a="' + id + '">Apprendre</button>';
      h += itemRow(id, P.inv[id], btn + '<button class="sm" data-act="drop" data-a="' + id + '" title="Jeter">🗑</button>');
    }
  }
  if (!Object.keys(P.inv).length) h += '<p class="mut">Le sac est vide.</p>';
  h += '</div></div><div class="col"><h3>Armes équipées <small>(touches 1-5)</small></h3><div class="list">';
  P.slots.forEach((w, i) => {
    if (w) {
      const b = WEAPONS[w.id]; const att = Object.keys(w.att).filter(k => w.att[k]).map(k => ITEMS[w.att[k]].i).join('');
      h += '<div class="item gear' + (i === P.sel ? ' sel' : '') + '"><span class="ic">' + b.i + '</span><span class="nm">' + (i + 1) + '. ' + esc(gearName(w)) + ' ' + att + '<br><small>' + gunStatText(w) + '</small></span><button class="sm" data-act="unslot" data-a="' + i + '">Ranger</button></div>';
    } else h += '<div class="item empty">' + (i + 1) + '. — emplacement vide —</div>';
  });
  h += '</div><h3>Armure</h3><div class="list">';
  for (const slot of ['head', 'body', 'feet']) {
    const g = P.armor[slot], nm = { head: 'Tête', body: 'Torse', feet: 'Pieds' }[slot];
    h += g ? '<div class="item gear"><span class="ic">' + ARMOR[g.id].i + '</span><span class="nm">' + nm + ' : ' + esc(gearName(g)) + '<br><small>Armure ' + (ARMOR[g.id].ar * (1 + .2 * (g.lvl - 1))).toFixed(1) + armorExtra(g) + '</small></span><button class="sm" data-act="unarmor" data-a="' + slot + '">Retirer</button></div>' : '<div class="item empty">' + nm + ' : —</div>';
  }
  h += '<p class="mut">Chaleur : +' + armorWarmth().toFixed(0) + ' · Protection radiation : ' + Math.round(radResist() * 100) + '%</p><p class="mut">Armure totale : ' + armorValue().toFixed(1) + ' → réduction ' + Math.round(armorValue() / (armorValue() + 30) * 100) + '% des dégâts</p>';
  h += '<h3>Réserve d\'équipement</h3><div class="list">';
  if (!P.gear.length) h += '<p class="mut">Aucun équipement en réserve.</p>';
  P.gear.forEach((g, i) => {
    h += '<div class="item gear"><span class="ic">' + gearIcon(g) + '</span><span class="nm">' + esc(gearName(g)) + (g.kind === 'a' ? '<br><small>Armure ' + (ARMOR[g.id].ar * (1 + .2 * (g.lvl - 1))).toFixed(1) + '</small>' : '<br><small>' + gunStatText(g) + '</small>') + '</span><button data-act="equip" data-a="' + i + '">Équiper</button><button class="sm" data-act="dropgear" data-a="' + i + '">🗑</button></div>';
  });
  h += '</div></div></div>';
  return h;
}
function armorExtra(g) { const a = ARMOR[g.id]; return ' · 🔥 chaleur +' + (a.warm || 0) + (a.rad ? ' · ☢️ -' + Math.round(a.rad * 100) + '% radiation' : ''); }
function gunStatText(w) {
  const b = WEAPONS[w.id], s = wstat(w);
  if (b.melee) return 'Dégâts ' + s.dmg.toFixed(0) + ' · cadence ' + (1 / s.rate).toFixed(1) + '/s · portée ' + s.range;
  return 'Dégâts ' + s.dmg.toFixed(0) + (s.pellets ? '×' + s.pellets : '') + ' · ' + (1 / s.rate).toFixed(1) + ' tirs/s · portée ' + Math.round(s.range) + ' · dispersion ' + (s.spr * 57.3).toFixed(1) + '° · ' + ITEMS[b.ammo].n + ' (' + w.mag + '/' + s.mag + ')';
}
function craftHTML() {
  const cats = [...new Set(RECIPES.map(r => r.cat))];
  let h = '<div class="subtabs">' + cats.map(c => '<button class="tab sm' + (craftCat === c ? ' on' : '') + '" data-act="ccat" data-a="' + c + '">' + c + '</button>').join('') + '</div>';
  h += '<p class="mut">Stations à proximité : ' + (nearStation('workbench') ? '🛠️ établi ' : '') + (nearStation('campfire') ? '🔥 feu' : '') + (!nearStation('campfire') ? '— (construisez un établi/feu avec B)' : '') + '</p><div class="list recipes">';
  for (const r of RECIPES.filter(r => r.cat === craftCat)) {
    const known = !r.plan || P.known[r.plan], cost = costOf(r.cost), ok = hasItems(cost), st = nearStation(r.st);
    const idx = RECIPES.indexOf(r);
    h += '<div class="item recipe' + (known ? '' : ' locked') + '"><span class="ic">' + recIcon(r) + '</span><span class="nm">' + esc(r.name) + (r.st ? ' <small>(' + (r.st === 'workbench' ? 'établi' : 'feu') + ')</small>' : '') + '<br><small class="cost">' + Object.keys(cost).map(k => '<span class="' + (invCount(k) >= cost[k] ? 'ok' : 'no') + '">' + ITEMS[k].i + ' ' + invCount(k) + '/' + cost[k] + '</span>').join(' ') + '</small></span>' +
      (known ? '<button data-act="craft" data-a="' + idx + '"' + (ok && st ? '' : ' disabled') + '>' + (st ? 'Fabriquer' : 'Station requise') + '</button>' : '<span class="mut">🔒 ' + PLAN_NAMES[r.plan] + '</span>') + '</div>';
  }
  return h + '</div>';
}
function recIcon(r) { const [k, id] = r.out.split(':'); return k === 'v' ? VEH[id].i : k === 'i' ? ITEMS[id].i : k === 'w' ? WEAPONS[id].i : k === 'a' ? ARMOR[id].i : '🎒'; }
function doCraft(idx) {
  const r = RECIPES[idx]; if (!r) return; if (r.plan && !P.known[r.plan]) return;
  const cost = costOf(r.cost); if (!hasItems(cost) || !nearStation(r.st)) return;
  const parts = r.out.split(':');
  if (parts[0] === 'v') { payItems(cost); const nv = spawnCraftedVehicle(parts[1]); msg('Véhicule assemblé : ' + nv.def.n + ' (réservoir presque vide, ajoutez du carburant).', '#ffe070'); SFX.play('levelup'); G.stats.crafted = (G.stats.crafted || 0) + 1; addXP(30); renderPanel(); return; }
  if (parts[0] === 'p') { const lvl = +parts[1]; if (P.pack >= lvl) { msg('Vous avez déjà un meilleur sac.', '#e0a050'); return; } payItems(cost); P.pack = lvl; msg('Nouveau sac équipé : capacité ' + invCap() + ' !', '#ffe070'); }
  else {
    payItems(cost);
    if (parts[0] === 'i') giveItem(parts[1], +parts[2]); else if (parts[0] === 'w') giveWeapon(makeWeapon(parts[1])); else if (parts[0] === 'a') giveArmorInst(makeArmor(parts[1]));
  }
  tutEvent('craft'); addXP(4); SFX.play('build'); G.stats.crafted = (G.stats.crafted || 0) + 1; renderPanel();
}
function upgradeCost(g) {
  const l = g.lvl;
  if (g.kind === 'w') return { scrap: 6 * l, metal: 3 * l, elec: l >= 3 ? l - 1 : 0 };
  return { cloth: 4 * l, hide: 2 * l, metal: 2 * l + (l >= 2 ? 2 : 0) };
}
function cleanCost(c) { const o = {}; for (const k in c) if (c[k] > 0) o[k] = c[k]; return o; }
function modsHTML() {
  const wb = nearStation('workbench');
  let h = '<p class="mut">' + (wb ? '🛠️ Établi à portée.' : '⚠ Il faut être près d\'un établi pour améliorer ou modifier.') + ' Niveau max : 5.</p><div class="cols"><div class="col"><h3>Armes</h3><div class="list">';
  const all = [];
  P.slots.forEach((w, i) => { if (w) all.push([w, 's' + i]); }); P.gear.forEach((g, i) => { if (g.kind === 'w') all.push([g, 'g' + i]); });
  for (const [w, ref] of all) {
    const b = WEAPONS[w.id], cost = costOf(cleanCost(upgradeCost(w))), ok = hasItems(cost) && wb && w.lvl < 5;
    h += '<div class="item gear col1"><span class="ic">' + b.i + '</span><span class="nm">' + esc(gearName(w)) + '<br><small>' + gunStatText(w) + '</small><br><small class="cost">Amélio. : ' + (w.lvl >= 5 ? 'max' : Object.keys(cost).map(k => '<span class="' + (invCount(k) >= cost[k] ? 'ok' : 'no') + '">' + ITEMS[k].i + cost[k] + '</span>').join(' ')) + '</small></span><button data-act="upg" data-a="' + ref + '"' + (ok ? '' : ' disabled') + '>⬆ Améliorer</button></div>';
    if (!b.melee && b.mods.length) {
      h += '<div class="slots">';
      for (const sl of b.mods) {
        const cur = w.att[sl]; const names = { sight: 'Viseur', muzzle: 'Bouche', mag: 'Chargeur', laser: 'Laser' };
        h += '<div class="slot"><b>' + names[sl] + ' :</b> ';
        if (cur) h += ITEMS[cur].i + ' ' + esc(ITEMS[cur].n) + ' <button class="sm" data-act="detach" data-a="' + ref + ':' + sl + '">Retirer</button>';
        else {
          const have = Object.keys(P.inv).filter(k => ITEMS[k].t === 'mod' && ITEMS[k].slot === sl && P.inv[k] > 0);
          if (have.length) h += have.map(k => '<button class="sm" data-act="attach" data-a="' + ref + ':' + k + '">' + ITEMS[k].i + ' ' + esc(ITEMS[k].n) + '</button>').join(' '); else h += '<span class="mut">— aucun module —</span>';
        }
        h += '</div>';
      }
      h += '</div>';
    }
  }
  if (!all.length) h += '<p class="mut">Aucune arme.</p>';
  h += '</div></div><div class="col"><h3>Armures</h3><div class="list">';
  const arm = []; for (const s in P.armor) if (P.armor[s]) arm.push([P.armor[s], 'a' + s]); P.gear.forEach((g, i) => { if (g.kind === 'a') arm.push([g, 'g' + i]); });
  for (const [g, ref] of arm) {
    const cost = costOf(cleanCost(upgradeCost(g))), ok = hasItems(cost) && wb && g.lvl < 5;
    h += '<div class="item gear"><span class="ic">' + ARMOR[g.id].i + '</span><span class="nm">' + esc(gearName(g)) + '<br><small>Armure ' + (ARMOR[g.id].ar * (1 + .2 * (g.lvl - 1))).toFixed(1) + '</small><br><small class="cost">' + (g.lvl >= 5 ? 'max' : Object.keys(cost).map(k => '<span class="' + (invCount(k) >= cost[k] ? 'ok' : 'no') + '">' + ITEMS[k].i + cost[k] + '</span>').join(' ')) + '</small></span><button data-act="upg" data-a="' + ref + '"' + (ok ? '' : ' disabled') + '>⬆ Améliorer</button></div>';
  }
  if (!arm.length) h += '<p class="mut">Aucune armure.</p>';
  return h + '</div></div></div>';
}
function resolveGear(ref) {
  if (ref[0] === 's') return P.slots[+ref.slice(1)];
  if (ref[0] === 'g') return P.gear[+ref.slice(1)];
  if (ref[0] === 'a') return P.armor[ref.slice(1)];
}
function skillsHTML() {
  let h = '<p>Points de compétence disponibles : <b>' + P.sp + '</b> — Niveau ' + P.lvl + ' (' + P.xp + '/' + xpNeed(P.lvl) + ' XP)</p><div class="list">';
  for (const k in SKILLS) {
    const s = SKILLS[k], l = P.skills[k];
    h += '<div class="item"><span class="ic">' + s.i + '</span><span class="nm">' + s.n + ' <b>' + l + '/5</b><br><small>' + s.d + '</small></span><button data-act="skill" data-a="' + k + '"' + (P.sp > 0 && l < 5 ? '' : ' disabled') + '>+1</button></div>';
  }
  return h + '</div><p class="mut">Statistiques : ' + G.stats.kills + ' ennemis éliminés · ' + G.stats.built + ' structures · ' + G.stats.looted + ' caisses fouillées · ' + G.stats.quests + ' quêtes</p>';
}
function questsHTML() {
  let h = '<div class="list">';
  const act = Object.values(G.quests.active);
  if (!act.length) h += '<p class="mut">Aucune quête active. Parlez à Mara, au Dr Lin ou à Jonas dans le village de Fort Espoir.</p>';
  for (const st of act) {
    const q = questDef(st.id, st); if (!q) continue;
    h += '<div class="quest' + (st.ready ? ' ready' : '') + '"><h4>' + esc(q.title) + (G.quests.tracked === st.id ? ' <span class="tag">suivie</span>' : '') + '</h4><p>' + esc(q.desc) + '</p><ul>' +
      q.objs.map(o => { const p = objProgress(o, st); return '<li class="' + (p.cur >= p.need ? 'done' : '') + '">' + (p.cur >= p.need ? '✔ ' : '• ') + esc(p.text) + (p.need > 1 ? ' (' + Math.min(p.cur, p.need) + '/' + p.need + ')' : '') + '</li>'; }).join('') + '</ul><p class="rew">Récompense : ' + rewText(q.rew) + '</p><button data-act="track" data-a="' + st.id + '">Suivre</button></div>';
  }
  h += '</div><p class="mut">Réputation de Fort Espoir : <b>' + P.rep + '</b> (' + repLabel() + ') · quêtes terminées : ' + Object.keys(G.quests.done).length + '</p>';
  return h;
}
function repLabel() { return P.rep < 10 ? 'Inconnu' : P.rep < 30 ? 'Connu' : P.rep < 60 ? 'Allié' : P.rep < 100 ? 'Frère d\'armes' : 'Légende'; }
function rewText(r) {
  const p = []; if (r.caps) p.push('🪙' + r.caps); for (const k in (r.items || {})) p.push((ITEMS[k] ? ITEMS[k].i : WEAPONS[k] ? WEAPONS[k].i : ARMOR[k] ? ARMOR[k].i : '') + ' ' + (ITEMS[k] ? ITEMS[k].n : WEAPONS[k] ? WEAPONS[k].n : ARMOR[k].n) + (r.items[k] > 1 ? ' x' + r.items[k] : '')); if (r.rep) p.push('réputation +' + r.rep); if (r.xp) p.push(r.xp + ' XP'); return p.join(' · ');
}
function mapLegend() {
  return '<p>🟡 Vous · <span style="color:#6cf">■</span> alliés · 📦 largage · 🚗 véhicules · <span style="color:#9aff4a">☢️ zones radioactives</span></p><p>Lieux découverts :</p>' + G.pois.filter(p => p.discovered && !p.hidden).map(p => '<div>' + (p.def.icon || '•') + ' ' + esc(p.name) + (p.owned ? ' <b style="color:#6f8">[base niv ' + p.lvl + ']</b>' : p.cleared ? ' <span class="mut">(nettoyé)</span>' : '') + '</div>').join('');
}
function drawFullMap() {
  const cv = $('mapCanvas'); if (!cv) return; const c = cv.getContext('2d'), S = cv.width, k = S / G.W;
  c.fillStyle = '#0a0e12'; c.fillRect(0, 0, S, S); c.imageSmoothingEnabled = false; c.drawImage(G.mini, 0, 0, S, S);
  for (const z of G.radZones) if (z.discovered) { c.fillStyle = 'rgba(140,255,40,.3)'; c.beginPath(); c.arc(z.x / TS * k, z.y / TS * k, z.r / TS * k, 0, TAU); c.fill(); c.strokeStyle = '#9aff4a'; c.lineWidth = 1.5; c.stroke(); c.font = '14px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('☢️', z.x / TS * k, z.y / TS * k + 5); }
  for (const v of G.vehicles) if (G.explored[IDX(Math.floor(v.x / TS), Math.floor(v.y / TS))]) { c.font = '13px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(v.def.i, v.x / TS * k, v.y / TS * k + 4); }
  for (const p of G.pois) if (p.discovered && !p.hidden) mapPoiIcon(c, p, p.cx / TS * k, p.cy / TS * k);
  if (G.airdrop && G.airdrop.o && !G.airdrop.o.opened) { c.font = '18px sans-serif'; c.textAlign = 'center'; c.fillText('📦', G.airdrop.x / TS * k, G.airdrop.y / TS * k); }
  const id = G.quests.tracked; if (id && G.quests.active[id]) { const st = G.quests.active[id], tg = questTargetPos(questDef(id, st), st); if (tg) { c.strokeStyle = '#ffd24a'; c.lineWidth = 3; c.beginPath(); c.arc(tg.x / TS * k, tg.y / TS * k, 14, 0, TAU); c.stroke(); } }
  c.fillStyle = '#ff0'; c.beginPath(); c.arc(P.x / TS * k, P.y / TS * k, 5, 0, TAU); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1.5; c.stroke();
}

// ----- base & coffre -----
function baseHTML(p) {
  const L = BASE_LEVELS[p.lvl], next = BASE_LEVELS[p.lvl + 1];
  let h = '<h3>' + esc(p.name) + ' — niveau ' + p.lvl + ' (' + L.label + ')</h3><div class="cols"><div class="col"><div class="list">' +
    '<div class="item"><span class="ic">🚩</span><span class="nm">Drapeau : ' + Math.round(p.hpFlag) + ' / ' + L.hp + ' PV<br><small>Si il tombe, la base est perdue.</small></span><button data-act="repair">Réparer (3🪵 2⚙️)</button></div>' +
    '<div class="item"><span class="ic">🔫</span><span class="nm">Tourelles : ' + structCount('turret', p) + ' / ' + L.turrets + '</span></div>' +
    '<div class="item"><span class="ic">🎖️</span><span class="nm">Gardes : ' + G.friends.filter(f => f.kind === 'recruit' && !f.dead && f.base === p.id).length + ' / ' + L.guards + '<br><small>Recrutez chez Mara (Fort Espoir), puis E sur le garde pour le poster ici.</small></span></div>' +
    '<div class="item"><span class="ic">❤️</span><span class="nm">Régénération dans la base : +' + L.regen + ' PV/s</span></div>' +
    '<div class="item"><span class="ic">📦</span><span class="nm">Production quotidienne (coffre) : ' + (p.lvl >= 2 ? '💧3' : '—') + (p.lvl >= 3 ? ' 🥕2 🪵6' : '') + (p.lvl >= 4 ? ' ⚙️6' : '') + (p.lvl >= 5 ? ' 🔩3' : '') + '</span></div></div></div><div class="col">';
  if (next) {
    const cost = costOf(next.cost);
    h += '<h3>Améliorer → ' + next.label + '</h3><p class="cost">' + Object.keys(cost).map(k => '<span class="' + (invCount(k) >= cost[k] ? 'ok' : 'no') + '">' + ITEMS[k].i + ' ' + invCount(k) + '/' + cost[k] + '</span>').join(' ') + '</p><p class="mut">Drapeau ' + next.hp + ' PV · ' + next.turrets + ' tourelles · ' + next.guards + ' gardes · régén +' + next.regen + '</p><button data-act="upbase"' + (hasItems(cost) ? '' : ' disabled') + '>⬆ Améliorer la base</button>';
  } else h += '<h3>Citadelle : niveau maximum</h3>';
  h += '<p class="mut">Conseils : placez des murs (B), des portes, des tourelles (chargez-les en balles 9mm avec E), un lit pour passer la nuit, un établi et des parcelles de culture. Des assauts surviennent certaines nuits.</p></div></div>';
  return h;
}
function chestHTML(s) {
  s.stash = s.stash || {};
  let h = '<div class="cols"><div class="col"><h3>Votre sac</h3><div class="list">';
  for (const k of Object.keys(P.inv)) if (P.inv[k] > 0) h += itemRow(k, P.inv[k], '<button class="sm" data-act="store" data-a="' + k + '">1</button><button class="sm" data-act="store" data-a="' + k + ':all">Tout</button>');
  h += '</div></div><div class="col"><h3>Coffre</h3><div class="list">';
  const ks = Object.keys(s.stash).filter(k => s.stash[k] > 0); if (!ks.length) h += '<p class="mut">Vide.</p>';
  for (const k of ks) h += itemRow(k, s.stash[k], '<button class="sm" data-act="take" data-a="' + k + '">1</button><button class="sm" data-act="take" data-a="' + k + ':all">Tout</button>');
  return h + '</div></div></div>';
}

// ----- dialogues PNJ, commerce -----
const TRADE_STOCK = [
  ['i', 'a9', 24, 20], ['i', 'shell', 8, 16], ['i', 'a556', 15, 28], ['i', 'a762', 8, 26], ['i', 'bolt', 10, 12], ['i', 'bandage', 3, 14], ['i', 'medkit', 1, 70], ['i', 'canned', 3, 12], ['i', 'bottle_clean', 3, 10], ['i', 'seed', 5, 8], ['i', 'fuel', 2, 14], ['i', 'grenade', 1, 45], ['i', 'flare', 3, 14],
  ['w', 'pistol', 0, 120], ['w', 'shotgun', 0, 240], ['w', 'smg', 0, 320], ['w', 'hunter', 0, 420], ['a', 'helmet_moto', 0, 80], ['a', 'leather', 0, 100], ['a', 'rangers', 0, 110], ['a', 'kevlar', 0, 260],
  ['i', 'antirad', 4, 40], ['i', 'fuel', 3, 20], ['a', 'gasmask', 0, 130], ['a', 'hazmat', 0, 260],
  ['i', 'plan_vehicle', 0, 190], ['i', 'plan_guns', 0, 120], ['i', 'plan_med', 0, 100], ['i', 'plan_turret', 0, 170], ['i', 'plan_fort', 0, 130], ['i', 'plan_armor', 0, 190], ['i', 'plan_optics', 0, 160], ['i', 'plan_serum', 0, 180], ['i', 'plan_fire', 0, 260],
];
function discount() { return P.rep >= 60 ? .8 : P.rep >= 30 ? .9 : 1; }
function openDialog(npc) {
  dialogNpc = npc; G.paused = true; panelTab = 'dialog'; $('panel').classList.add('hidden'); $('dialog').classList.remove('hidden'); renderDialog(); SFX.play('ui');
}
function renderDialog() {
  const n = dialogNpc, el = $('dialog'); let h = '<div class="tabs"><span class="ptitle">' + esc(n.name) + '</span><button class="tab close" data-act="close">✖</button></div><div class="pbody">';
  const greet = { mara: 'Je commande la défense de Fort Espoir. Les morts s\'amassent... on a besoin de gens comme toi.', jonas: 'Capsules, ferraille, plans... tout se vend, tout s\'achète.', doc: 'Les blessés affluent. Je soigne ce que je peux.' }[n.id];
  h += '<p class="say">« ' + greet + ' »</p>';
  const ready = Object.values(G.quests.active).filter(st => { const q = questDef(st.id, st); return q && q.giver === n.id && st.ready; });
  for (const st of ready) { const q = questDef(st.id, st); h += '<div class="quest ready"><h4>✔ ' + esc(q.title) + '</h4><p>Terminée ! Récompense : ' + rewText(q.rew) + '</p><button data-act="turnin" data-a="' + st.id + '">Rendre la quête</button></div>'; }
  const act = Object.values(G.quests.active).filter(st => { const q = questDef(st.id, st); return q && q.giver === n.id && !st.ready; });
  for (const st of act) { const q = questDef(st.id, st); h += '<div class="quest"><h4>' + esc(q.title) + ' <span class="tag">en cours</span></h4><ul>' + q.objs.map(o => { const p = objProgress(o, st); return '<li class="' + (p.cur >= p.need ? 'done' : '') + '">' + (p.cur >= p.need ? '✔ ' : '• ') + esc(p.text) + (p.need > 1 ? ' (' + Math.min(p.cur, p.need) + '/' + p.need + ')' : '') + '</li>'; }).join('') + '</ul></div>'; }
  for (const q of questAvailable(n.id)) h += '<div class="quest"><h4>' + esc(q.title) + '</h4><p>' + esc(q.desc) + '</p><p class="rew">Récompense : ' + rewText(q.rew) + '</p><button data-act="accept" data-a="' + q.id + '">Accepter</button></div>';
  if (n.id === 'mara') {
    const hasCtr = Object.values(G.quests.active).some(st => st.def && st.def.contract);
    if (questDone('q_hunt') && !hasCtr) h += '<div class="quest"><h4>Contrats</h4><p>Des missions répétables pour gagner des capsules.</p><button data-act="contract">Nouveau contrat</button></div>';
    const cap = baseGuardCap(), cur = G.friends.filter(f => f.kind === 'recruit' && !f.dead && !f.temp).length;
    const price = Math.round(60 * discount());
    h += '<div class="quest"><h4>Recrutement</h4><p>Gardes armés qui défendent vos bases ou vous suivent. ' + cur + ' / ' + cap + ' recrutés. Réputation requise : 30 (actuelle : ' + P.rep + ').</p><button data-act="recruit"' + (P.rep >= 30 && cur < cap && invCount('caps') >= price ? '' : ' disabled') + '>Recruter (🪙 ' + price + ')</button></div>';
  }
  if (n.id === 'doc') {
    const free = G.docDay !== G.day;
    h += '<div class="quest"><h4>Soins</h4><button data-act="heal"' + (free ? '' : ' disabled') + '>Soins complets (gratuit, 1×/jour)</button> <button data-act="cure"' + (invCount('caps') >= 20 && (P.infect || P.sick > 0 || P.bleed) ? '' : ' disabled') + '>Soigner infection/saignement (🪙 20)</button></div>';
  }
  if (n.id === 'jonas') h += tradeHTML();
  h += '</div>'; el.innerHTML = h;
}
function sellPrice(id) { return Math.max(1, Math.floor((ITEMS[id].v || 1) * .45)); }
function tradeHTML() {
  let h = '<h3>Acheter <small>(🪙 ' + invCount('caps') + ')</small></h3><div class="list">';
  TRADE_STOCK.forEach((s, i) => {
    const [k, id, qty, price] = s; const pr = Math.round(price * discount());
    const it = k === 'i' ? ITEMS[id] : k === 'w' ? WEAPONS[id] : ARMOR[id];
    const owned = k === 'i' && ITEMS[id].t === 'plan' && P.known[ITEMS[id].plan];
    h += '<div class="item"><span class="ic">' + it.i + '</span><span class="nm">' + esc(it.n) + (qty > 1 ? ' x' + qty : '') + '</span><span class="ct">🪙' + pr + '</span><button data-act="buy" data-a="' + i + '"' + (invCount('caps') >= pr && !owned ? '' : ' disabled') + '>' + (owned ? 'Appris' : 'Acheter') + '</button></div>';
  });
  h += '</div><h3>Vendre</h3><div class="list">';
  const ks = Object.keys(P.inv).filter(k => P.inv[k] > 0 && k !== 'caps' && ITEMS[k].t !== 'plan');
  for (const k of ks) h += itemRow(k, P.inv[k], '<span class="ct">🪙' + sellPrice(k) + '</span><button class="sm" data-act="sell" data-a="' + k + '">1</button><button class="sm" data-act="sell" data-a="' + k + ':all">Tout</button>');
  P.gear.forEach((g, i) => { const v = Math.floor(((g.kind === 'w' ? WEAPONS[g.id].v : ARMOR[g.id].v) || 10) * .4 * g.lvl); h += '<div class="item"><span class="ic">' + gearIcon(g) + '</span><span class="nm">' + esc(gearName(g)) + '</span><span class="ct">🪙' + v + '</span><button class="sm" data-act="sellgear" data-a="' + i + '">Vendre</button></div>'; });
  return h + '</div>';
}

// ----- actions UI -----
const ACT = {
  close() { closePanel(); },
  tab(a) { panelTab = a; renderPanel(); SFX.play('ui'); },
  ccat(a) { craftCat = a; renderPanel(); },
  use(a) { useConsumable(a); renderPanel(); },
  plan(a) { usePlan(a); renderPanel(); },
  drop(a) { const n = P.inv[a] || 0; if (!n) return; invTake(a, n); dropPickup(P.x + 30, P.y, a, n); msg('Jeté : ' + ITEMS[a].n + ' x' + n, '#aaa'); renderPanel(); },
  dropgear(a) { const g = P.gear.splice(+a, 1)[0]; if (g) { dropPickup(P.x + 30, P.y, null, 1, { kind: g.kind, id: g.id }); } renderPanel(); },
  unslot(a) { const w = P.slots[+a]; if (!w) return; P.slots[+a] = null; P.gear.push(w); if (P.sel === +a) { const i = P.slots.findIndex(Boolean); P.sel = i < 0 ? 0 : i; } renderPanel(); },
  unarmor(a) { const g = P.armor[a]; if (g) { P.armor[a] = null; P.gear.push(g); } renderPanel(); },
  equip(a) {
    const g = P.gear[+a]; if (!g) return;
    if (g.kind === 'w') { let i = P.slots.indexOf(null); if (i < 0) i = P.sel; const old = P.slots[i]; P.slots[i] = g; P.gear.splice(+a, 1); if (old) P.gear.push(old); P.sel = i; P.reloading = false; }
    else { const sl = ARMOR[g.id].slot, old = P.armor[sl]; P.armor[sl] = g; P.gear.splice(+a, 1); if (old) P.gear.push(old); }
    SFX.play('reload'); renderPanel();
  },
  craft(a) { doCraft(+a); },
  upg(a) {
    const g = resolveGear(a); if (!g || g.lvl >= 5 || !nearStation('workbench')) return;
    const cost = costOf(cleanCost(upgradeCost(g))); if (!hasItems(cost)) return;
    payItems(cost); g.lvl++; msg(gearName(g) + ' amélioré !', '#ffe070'); SFX.play('levelup'); addXP(10); renderPanel();
  },
  attach(a) { const [ref, mod] = a.split(':'); const g = resolveGear(ref); if (!g || invCount(mod) < 1 || !nearStation('workbench')) { if (!nearStation('workbench')) msg('Il faut un établi.', '#e0a050'); return; } invTake(mod, 1); g.att[ITEMS[mod].slot] = mod; SFX.play('reload'); renderPanel(); },
  detach(a) { const [ref, sl] = a.split(':'); const g = resolveGear(ref); if (!g || !g.att[sl] || !nearStation('workbench')) { if (!nearStation('workbench')) msg('Il faut un établi.', '#e0a050'); return; } const mod = g.att[sl]; delete g.att[sl]; giveItem(mod, 1, true); const s = wstat(g); g.mag = Math.min(g.mag, s.mag); renderPanel(); },
  skill(a) { if (P.sp > 0 && P.skills[a] < 5) { P.sp--; P.skills[a]++; SFX.play('levelup'); renderPanel(); } },
  track(a) { G.quests.tracked = a; renderPanel(); },
  repair() { const p = panelCtx; if (p) { repairBase(p); renderPanel(); } },
  upbase() { const p = panelCtx; if (p) { upgradeBase(p); renderPanel(); } },
  store(a) { const [k, all] = a.split(':'); const s = panelCtx; const n = all ? P.inv[k] : 1; const t = invTake(k, n); s.stash[k] = (s.stash[k] || 0) + t; SFX.play('click'); renderPanel(); },
  take(a) { const [k, all] = a.split(':'); const s = panelCtx; const n = all ? s.stash[k] : 1; const got = invAdd(k, Math.min(n, s.stash[k])); s.stash[k] -= got; if (s.stash[k] <= 0) delete s.stash[k]; if (!got) msg('Inventaire plein.', '#e0a050'); SFX.play('click'); renderPanel(); },
  vrepair() { const v = panelCtx; if (!v || !hasItems({ scrap: 4, metal: 1 }) || v.hp >= v.maxhp) return; payItems({ scrap: 4, metal: 1 }); v.hp = Math.min(v.maxhp, v.hp + v.maxhp * .25); SFX.play('build'); renderPanel(); },
  vupg(a) { const v = panelCtx, up = VUPG[a]; if (!v || !up) return; const lv = v.up[a]; if (lv >= up.max || (up.need && !P.known[up.need]) || !nearStation('workbench')) return; const cost = costOf(cleanCost(up.cost(lv + 1))); if (!hasItems(cost)) return; payItems(cost); v.up[a]++; applyUpgrades(v); SFX.play('levelup'); msg(up.n + ' niveau ' + v.up[a] + ' !', '#ffe070'); addXP(15); renderPanel(); },
  vfuel(a) { const v = panelCtx; if (!v) return; let n = a === 'all' ? Math.min(invCount('fuel'), Math.ceil((v.maxfuel - v.fuel) / 20)) : 1; n = Math.min(n, invCount('fuel')); if (n <= 0 || v.fuel >= v.maxfuel) return; invTake('fuel', n); v.fuel = Math.min(v.maxfuel, v.fuel + 20 * n); SFX.play('drink'); renderPanel(); },
  accept(a) { const q = QUESTS.find(x => x.id === a); if (q) { acceptQuest(q); renderDialog(); } },
  contract() { acceptQuest(makeContract()); renderDialog(); },
  turnin(a) { const st = G.quests.active[a], q = st && questDef(a, st); if (q) { checkQuests(); if (questComplete(q, st)) completeQuest(q); } renderDialog(); },
  recruit() {
    const price = Math.round(60 * discount()); if (invCount('caps') < price) return; invTake('caps', price);
    const gun = P.rep >= 80 ? 'ar' : P.rep >= 50 ? pick(['smg', 'shotgun']) : 'pistol';
    const f = makeRecruit(gun, P.x + 30, P.y); const b = nearestOwnedBase(); if (b) { f.mode = 'guard'; f.base = b.id; }
    msg(f.name + ' rejoint vos rangs (' + WEAPONS[gun].n + ').', '#8ac0ff'); SFX.play('levelup'); questCheckSoon(); renderDialog();
  },
  heal() { if (G.docDay === G.day) return; G.docDay = G.day; P.hp = maxHP(); P.bleed = 0; P.infect = 0; P.sick = 0; msg('Le Dr Lin vous a soigné.', '#8affb0'); SFX.play('levelup'); renderDialog(); },
  cure() { if (invCount('caps') < 20) return; invTake('caps', 20); P.bleed = 0; P.infect = 0; P.sick = 0; msg('Soigné !', '#8affb0'); renderDialog(); },
  buy(a) {
    const [k, id, qty, price] = TRADE_STOCK[+a]; const pr = Math.round(price * discount()); if (invCount('caps') < pr) return;
    invTake('caps', pr);
    if (k === 'i') giveItem(id, qty || 1); else if (k === 'w') giveWeapon(makeWeapon(id)); else giveArmorInst(makeArmor(id));
    SFX.play('pickup'); renderDialog();
  },
  sell(a) { const [k, all] = a.split(':'); const n = all ? P.inv[k] : 1; const t = invTake(k, n); giveItem('caps', t * sellPrice(k), true); SFX.play('pickup'); renderDialog(); },
  sellgear(a) { const g = P.gear[+a]; if (!g) return; const v = Math.floor(((g.kind === 'w' ? WEAPONS[g.id].v : ARMOR[g.id].v) || 10) * .4 * g.lvl); P.gear.splice(+a, 1); giveItem('caps', v, true); SFX.play('pickup'); renderDialog(); },
};
function onPanelClick(e) {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const f = ACT[b.dataset.act]; if (f) { f(b.dataset.a); }
}

// ----- barre de construction -----
function refreshBuildBar() {
  const el = $('buildbar'); if (!G || !G.buildMode) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.innerHTML = Object.keys(STRUCTS).map((k, i) => {
    const d = STRUCTS[k], locked = d.plan && !P.known[d.plan];
    return '<button class="bb' + (G.buildType === k ? ' on' : '') + (locked ? ' locked' : '') + '" data-b="' + k + '" title="' + esc(d.n + ' — ' + costText(costOf(d.cost)) + (locked ? ' (plan requis)' : '')) + '"><span>' + d.i + '</span><small>' + esc(d.n) + '</small><small class="c">' + costText(costOf(d.cost)) + '</small></button>';
  }).join('') + '<div class="bhelp">Clic gauche : poser · Clic droit : démonter · B : quitter</div>';
}
function showGameOver(r) {
  const el = $('gameover');
  const mins = Math.floor(r.time / 60);
  el.innerHTML = '<div class="box"><h1>VOUS ÊTES MORT</h1><p class="cause">Tué par : ' + esc(r.cause) + '</p><div class="stats"><div><b>' + r.day + '</b><small>jours</small></div><div><b>' + mins + ' min</b><small>survie</small></div><div><b>' + r.kills + '</b><small>éliminations</small></div><div><b>' + r.lvl + '</b><small>niveau</small></div><div><b>' + r.bases + '</b><small>bases</small></div><div><b>' + r.built + '</b><small>structures</small></div></div><p class="score">Score : <b>' + r.score + '</b>' + (r.newBest ? ' — 🏆 NOUVEAU RECORD !' : ' (record : ' + r.best + ')') + '</p><button id="btnRetry">Rejouer</button><button id="btnSame">Même monde (graine ' + G.seed + ')</button></div>';
  el.classList.remove('hidden'); $('btnRetry').onclick = () => { location.reload(); }; $('btnSame').onclick = () => { try { sessionStorage.setItem('zs_retry', JSON.stringify({ seed: G.seed, wo: G.wo, diff: G.diff })); } catch (e) { } location.reload(); };
}
