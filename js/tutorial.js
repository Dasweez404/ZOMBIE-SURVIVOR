'use strict';
// ===== Tutoriel guidé, conseils contextuels, bannières, notifications d'objets =====
let TIPS_SEEN = {};
try { TIPS_SEEN = JSON.parse(localStorage.getItem('zs_tips') || '{}'); } catch (e) { }
function saveTips() { try { localStorage.setItem('zs_tips', JSON.stringify(TIPS_SEEN)); } catch (e) { } }

function tip(id, text, icon) {
  if (!SET.tips || TIPS_SEEN[id] || !G) return;
  TIPS_SEEN[id] = 1; saveTips();
  const box = document.getElementById('tips'); if (!box) return;
  const el = document.createElement('div'); el.className = 'tip'; el.innerHTML = '<span class="ti">' + (icon || '💡') + '</span><span>' + text + '</span><button title="Fermer">✕</button>';
  el.querySelector('button').onclick = () => el.remove();
  box.appendChild(el); while (box.children.length > 2) box.firstChild.remove();
  SFX.play('banner', .5);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 11000);
}
function banner(title, sub, col) { if (!G) return; G.banner = { t: 0, title, sub: sub || '', col: col || '#ffe9a0' }; SFX.play('banner'); }
function toastItem(id, n) {
  const it = ITEMS[id]; if (!it || !G) return;
  const last = G.toasts[G.toasts.length - 1];
  if (last && last.id === id && last.age < 2) { last.n += n; last.age = 0; last.life = 3; last.pop = .25; return; }
  G.toasts.push({ id, n, icon: it.i, name: it.n, age: 0, life: 3, pop: .25 }); if (G.toasts.length > 7) G.toasts.shift();
}

// ---------- Tutoriel ----------
const TUT = [
  { id: 'move', icon: '🏃', title: 'Se déplacer', txt: 'Marchez avec <kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> (ou <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, ou les flèches). Maintenez <kbd>Maj</kbd> pour sprinter — cela consomme l\'endurance ⚡.', prog: () => [Math.min(200, Math.floor(G.tut.c.move)), 200] },
  { id: 'aim', icon: '🎯', title: 'Viser', txt: 'Bougez la <b>souris</b> : votre personnage regarde le curseur. Le viseur s\'élargit quand vous bougez ou tirez en rafale.', prog: () => [Math.min(700, Math.floor(G.tut.c.aim)), 700] },
  { id: 'crate', icon: '📦', title: 'Fouiller', txt: 'Approchez-vous de la <b>caisse brillante</b> près du feu de camp et appuyez sur <kbd>E</kbd>. Les caisses des bâtiments contiennent armes, soins et ressources.', target: () => G.startCrate && !G.startCrate.opened ? { x: G.startCrate.x, y: G.startCrate.y, label: 'Caisse' } : null, prog: () => [G.startCrate.opened ? 1 : 0, 1] },
  { id: 'shoot', icon: '🔫', title: 'Tirer', txt: 'Touche <kbd>2</kbd> pour sortir le pistolet (<kbd>1</kbd>–<kbd>5</kbd> ou molette pour changer d\'arme), puis <b>clic gauche</b> pour tirer. Tirez 3 fois. Le bruit attire les infectés !', prog: () => [Math.min(3, G.tut.c.shots), 3] },
  { id: 'reload', icon: '🔄', title: 'Recharger', txt: 'Appuyez sur <kbd>R</kbd> pour recharger. Un clic gauche à vide recharge aussi. Surveillez le chargeur sous votre viseur.', prog: () => [Math.min(1, G.tut.c.reload), 1] },
  { id: 'gather', icon: '🪵', title: 'Récolter', txt: 'Les arbres donnent du <b>bois</b> : approchez-vous et maintenez <kbd>E</kbd> (ou frappez avec une arme de mêlée : <kbd>1</kbd> puis clic gauche). Rassemblez 5 bois. Haches et pioches récoltent plus vite.', target: () => { const o = nearestTree(); return o ? { x: o.x, y: o.y, label: 'Arbre' } : null; }, prog: () => [Math.min(5, invCount('wood')), 5] },
  { id: 'craft', icon: '🛠️', title: 'Fabriquer', txt: '<kbd>Tab</kbd> ouvre le sac. Onglet <b>Fabrication</b> : créez un <b>Gourdin</b> (3 bois). À l\'<b>établi</b> (à construire), vous débloquerez munitions, armures, gadgets et améliorations.', prog: () => [Math.min(1, G.tut.c.craft), 1] },
  { id: 'build', icon: '🏗️', title: 'Construire', txt: '<kbd>B</kbd> active le mode construction : molette = choisir (mur, feu de camp, établi…), <b>clic gauche</b> = poser, <b>clic droit</b> = démonter. Posez une structure, puis <kbd>B</kbd> pour sortir.', prog: () => [Math.min(1, G.tut.c.build), 1] },
  { id: 'survive', icon: '❤️', title: 'Survivre', txt: 'Vos barres : ❤️ vie · 🍖 faim · 💧 soif · ⚡ endurance · 🌡️ température (chaud/froid) · ☢️ radiation. <kbd>V</kbd> mange, <kbd>C</kbd> boit, <kbd>H</kbd> soigne. Utilisez un objet maintenant (conserve, eau, bandage).', prog: () => [Math.min(1, G.tut.c.consume), 1] },
  { id: 'map', icon: '🗺️', title: 'La carte', txt: '<kbd>M</kbd> ouvre la carte : lieux découverts, véhicules 🚗, zones radioactives ☢️ et objectif suivi. <kbd>J</kbd> = quêtes, <kbd>K</kbd> = compétences.', prog: () => [Math.min(1, G.tut.c.map), 1] },
  { id: 'village', icon: '🏘️', title: 'Fort Espoir', txt: 'Suivez la <b>flèche jaune</b> jusqu\'au village allié (une route y mène). Bonus : une <b>moto</b> est garée près du camp de départ (<kbd>E</kbd> pour monter, <kbd>X</kbd> carburant/coffre). Le village est sûr : ses gardes vous défendent.', target: () => G.village ? { x: G.village.cx, y: G.village.cy, label: 'Fort Espoir' } : null, prog: () => [dist(P.x, P.y, G.village.cx, G.village.cy) < 300 ? 1 : 0, 1] },
  { id: 'talk', icon: '💬', title: 'Parler à Mara', txt: 'Approchez-vous de la <b>Capitaine Mara</b> et appuyez sur <kbd>E</kbd>. Acceptez une quête : les quêtes donnent plans, armes, réputation et mènent à vos premières bases. Jonas vend et achète, le Dr Lin soigne.', target: () => { const n = G.npcs.find(n => n.id === 'mara'); return n ? { x: n.x, y: n.y, label: 'Mara' } : null; }, prog: () => [Math.min(1, G.tut.c.accept), 1] },
];
function tutStart(forceReset) {
  G.tut = { on: true, i: 0, c: { move: 0, aim: 0, shots: 0, reload: 0, craft: 0, build: 0, consume: 0, map: 0, accept: 0 }, doneT: 0, lx: P.x, ly: P.y, key: '' };
  tutRender(true);
}
function tutStop(finished) {
  if (!G.tut) return; G.tut.on = false; const el = document.getElementById('tut'); el.classList.add('hidden');
  if (finished) { banner('🎓 TUTORIEL TERMINÉ', 'Bonne chance, survivant. Vous pouvez le revoir depuis le menu pause.', '#8affb0'); SET.tutorial = false; saveSettings(); SFX.play('levelup'); }
  else { SET.tutorial = false; saveSettings(); }
}
function tutEvent(name, n) { if (G && G.tut && G.tut.on) G.tut.c[name] = (G.tut.c[name] || 0) + (n === undefined ? 1 : n); }
function tutSafe() { return G && G.tut && G.tut.on && G.tut.i < 9; }
function nearestTree() {
  let best = null, bd = 1e9; const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
  for (let r = 1; r < 30 && !best; r += 4) for (let y = ty - r - 3; y <= ty + r + 3; y++) for (let x = tx - r - 3; x <= tx + r + 3; x++) { if (!inb(x, y)) continue; const o = G.objs.get(IDX(x, y)); if (o && o.k === 'tree' && !o.dep) { const d = dist(P.x, P.y, o.x, o.y); if (d < bd) { bd = d; best = o; } } }
  return best;
}
function tutTarget() { if (!G.tut || !G.tut.on) return null; const s = TUT[G.tut.i]; return s && s.target ? s.target() : null; }
function tutRender(force) {
  const t = G.tut, el = document.getElementById('tut'); if (!t || !t.on) { el.classList.add('hidden'); return; }
  const s = TUT[t.i]; const pr = s.prog(); const key = t.i + ':' + pr[0] + ':' + (t.doneT > 0);
  if (!force && key === t.key) return; t.key = key; el.classList.remove('hidden'); el.classList.toggle('done', t.doneT > 0);
  const pct = Math.round(pr[0] / pr[1] * 100);
  el.innerHTML = '<div class="th"><span class="tn">TUTORIEL · ' + (t.i + 1) + '/' + TUT.length + '</span><button data-tut="skip" title="Passer cette étape">⏭</button><button data-tut="quit" title="Quitter le tutoriel">✕</button></div>' +
    '<div class="tt"><span class="ti">' + (t.doneT > 0 ? '✅' : s.icon) + '</span> ' + s.title + '</div><div class="tx">' + s.txt + '</div>' +
    '<div class="tb"><i style="width:' + pct + '%"></i></div><div class="tp">' + (t.doneT > 0 ? 'Bien joué !' : pr[1] > 1 ? pr[0] + ' / ' + pr[1] : 'À faire') + '</div>';
}
function updateTutorial(dt) {
  const t = G.tut; if (!t || !t.on) return;
  t.c.move += dist(P.x, P.y, t.lx, t.ly) > 0 && dist(P.x, P.y, t.lx, t.ly) < 80 ? dist(P.x, P.y, t.lx, t.ly) : 0; t.lx = P.x; t.ly = P.y;
  const s = TUT[t.i];
  if (t.doneT > 0) { t.doneT -= dt; if (t.doneT <= 0) { t.i++; t.key = ''; if (t.i >= TUT.length) { tutStop(true); return; } SFX.play('ui'); tutRender(true); } else tutRender(); return; }
  const pr = s.prog(); if (pr[0] >= pr[1]) { t.doneT = 1.1; SFX.play('levelup', .5); tutRender(true); return; }
  tutRender();
}
function tutAction(a) {
  if (!G.tut || !G.tut.on) return;
  if (a === 'quit') tutStop(false); else if (a === 'skip') { G.tut.i++; G.tut.doneT = 0; G.tut.key = ''; if (G.tut.i >= TUT.length) tutStop(true); else tutRender(true); }
}

// ---------- Conseils contextuels ----------
function updateTips() {
  if (!SET.tips || !G || P.dead) return;
  if (G.tut && G.tut.on && G.tut.i < 10) return;
  const v = nearestVehicle(P.x, P.y, 130); if (v && !P.veh) tip('veh', '<b>Véhicule</b> : <kbd>E</kbd> pour monter, <kbd>ZQSD</kbd> pour conduire, <kbd>Maj</kbd> frein à main. Écrasez les infectés ! <kbd>X</kbd> : carburant (bidons ⛽), réparation, améliorations et coffre.', '🏍️');
  if (G.dark > .35) tip('night', '<b>La nuit tombe</b> : les infectés sont plus nombreux et des hordes arrivent. Restez près d\'un feu ou d\'un abri, la lampe (<kbd>L</kbd>) éclaire devant vous. Dormez dans un lit pour passer la nuit.', '🌙');
  if (P.temp < 32) tip('cold', '<b>Froid</b> 🥶 : la nuit est glaciale. Approchez-vous d\'un feu de camp, entrez dans un bâtiment, ou habillez-vous (vestes, cuir, bonnets).', '🌡️');
  if (P.temp > 78) tip('hot', '<b>Chaleur</b> 🥵 : le désert brûle le jour. Cherchez l\'ombre des bâtiments, buvez et retirez des couches.', '🌡️');
  if (G.radLv > 0) tip('rad', '<b>Radiation</b> ☢️ : sortez de la zone ! Combinaison NRBC + masque à gaz réduisent la dose, les anti-radiations 🟢 la soignent. Les caisses des zones contiennent du butin rare.', '☢️');
  if (P.hun < 30) tip('hungry', '<b>Faim</b> : mangez (<kbd>V</kbd>). Cuisinez la viande crue au feu de camp, cultivez des parcelles ou fouillez les supermarchés.', '🍖');
  if (P.thi < 30) tip('thirsty', '<b>Soif</b> : buvez (<kbd>C</kbd>). Puisez à un lac avec <kbd>E</kbd> (eau non potable : faites-la bouillir au feu), ou posez un collecteur de pluie.', '💧');
  if (P.bleed) tip('bleed', '<b>Saignement</b> 🩸 : utilisez un bandage (<kbd>H</kbd>) avant de perdre trop de sang.', '🩹');
  if (P.infect) tip('infect', '<b>Infection</b> ☣️ : seuls les antibiotiques 💉 ou le Dr Lin (Fort Espoir) la soignent.', '💉');
  if (invWeight() > invCap() * .92) tip('weight', '<b>Sac presque plein</b> : une charge lourde ralentit. Stockez dans un coffre, fabriquez un sac plus grand ou vendez à Jonas.', '🎒');
  if (P.sp > 0) tip('skill', '<b>Point de compétence disponible</b> : appuyez sur <kbd>K</kbd> pour l\'attribuer.', '⭐');
  for (const m of G.mobs) if (!m.dead && dist(m.x, m.y, P.x, P.y) < 650) {
    if (m.def.fac === 'raider') { tip('raider', '<b>Chacals</b> : milice de pillards, armés et en groupe. Utilisez les couverts, éliminez le chef pour piller leur camp.', '☠️'); break; }
    if (m.def.fac === 'legion') { tip('legion', '<b>Légion rouge</b> : militaires lourdement équipés. Préparez armure, soins et armes puissantes.', '⚔️'); break; }
    if (m.t === 'screamer') { tip('screamer', '<b>Hurleuse</b> : son cri attire toute la horde. Tuez-la vite !', '📢'); break; }
    if (m.t === 'bloater') { tip('bloater', '<b>Gonflé</b> : il explose en nuage toxique à sa mort. Tirez de loin.', '🤢'); break; }
    if (m.t === 'spitter') { tip('spitter', '<b>Cracheur</b> : crache de l\'acide à distance. Esquivez ou foncez le tuer.', '🧪'); break; }
    if (m.def.tame && !m.aggro) { tip('tame', '<b>Apprivoisement</b> : approchez-vous d\'un loup/sanglier avec de la nourriture (viande, baies), <kbd>E</kbd>. Chiens et ours mutants demandent du sérum 🧬.', '🐺'); }
  }
  if (G.pois.some(p => p.cleared && p.def.claim && !p.owned && !p.hidden && dist(P.x, P.y, p.cx, p.cy) < 600)) tip('claim', '<b>Zone nettoyée</b> : plantez-y votre drapeau (<kbd>E</kbd> sur le drapeau) pour en faire une <b>base</b> : coffre, construction, tourelles, gardes. Attention aux assauts nocturnes !', '🚩');
  if (G.pois.some(p => p.owned)) tip('base', '<b>Votre base</b> : améliorez-la en montant le drapeau (<kbd>E</kbd>), construisez avec <kbd>B</kbd>, chargez les tourelles en balles 9mm (<kbd>E</kbd>) et recrutez des gardes chez Mara.', '🏴');
  if (G.assault) tip('assault', '<b>ASSAUT</b> ! Défendez le drapeau : si ses PV tombent à 0, la base est perdue. Les tourelles, murs et gardes vous aident.', '⚠️');
}
