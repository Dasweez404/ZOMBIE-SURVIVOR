'use strict';
// ===== Contenu additionnel : armes, armures, gadgets, soins, modules, recettes, butin =====
// (chargé après ui.js : on complète les tables existantes)
(function () {
  const I = (id, n, i, t, w, v, o) => { ITEMS[id] = Object.assign({ n, i, t, w, v }, o || {}); };

  // ---------- plans et ressources ----------
  I('plan_explosives', 'Plan : explosifs & pièges', '📜', 'plan', 0, 130, { plan: 'plan_explosives' });
  I('plan_energy', 'Plan : technologie énergétique', '📜', 'plan', 0, 220, { plan: 'plan_energy' });
  I('plan_heavy', 'Plan : armes lourdes', '📜', 'plan', 0, 200, { plan: 'plan_heavy' });
  I('plan_stealth', 'Plan : furtivité & survie', '📜', 'plan', 0, 110, { plan: 'plan_stealth' });
  Object.assign(PLAN_NAMES, { plan_explosives: 'explosifs & pièges', plan_energy: 'technologie énergétique', plan_heavy: 'armes lourdes', plan_stealth: 'furtivité & survie' });
  I('steel', 'Acier trempé', '🔧', 'res', .6, 10);
  I('fiber', 'Fibre balistique', '🧶', 'res', .1, 7);
  I('circuit', 'Circuit avancé', '🧠', 'res', .1, 18);
  I('core', 'Noyau énergétique', '⚛️', 'res', .3, 45);
  I('rubber', 'Caoutchouc', '⚫', 'res', .2, 4);

  // ---------- munitions ----------
  I('a45', 'Balles .45', '🔹', 'ammo', .03, 2);
  I('a50', 'Balles .50 BMG', '🟫', 'ammo', .09, 7);
  I('rocket', 'Roquette', '🚀', 'ammo', .7, 32);
  I('arrow', 'Flèches', '➴', 'ammo', .03, 2);
  I('cell', 'Cellule énergétique', '🔋', 'ammo', .1, 9);
  I('nail', 'Clous', '📌', 'ammo', .02, 1);
  AMMO_PER.chem = 20; AMMO_PER.nail = 1;

  // ---------- consommables ----------
  I('stimpack', 'Stimulant', '💉', 'med', .1, 45, { use: { hp: 25, stam: 100, buff: { spd: .3, t: 25, n: 'Stimulant' } } });
  I('adrenaline', 'Adrénaline', '⚡', 'med', .1, 60, { use: { stam: 100, buff: { spd: .2, dmg: .25, t: 30, n: 'Adrénaline' } } });
  I('surgical', 'Kit chirurgical', '🩺', 'med', .6, 90, { use: { hp: 100, cure: ['bleed', 'infect', 'sick'] } });
  I('iodine', 'Pilules d\'iode', '💊', 'med', .05, 22, { use: { rad: -22 } });
  I('splint', 'Attelle de fortune', '🦴', 'med', .2, 16, { use: { hp: 22, cure: ['bleed'] } });
  I('ration', 'Ration militaire', '🍱', 'food', .4, 22, { use: { hun: 65, thi: 5, hp: 5 } });
  I('energybar', 'Barre énergétique', '🍫', 'food', .08, 6, { use: { hun: 18, stam: 25 } });
  I('jerky', 'Viande séchée', '🥓', 'food', .15, 9, { use: { hun: 32 } });
  I('honey', 'Miel', '🍯', 'food', .15, 9, { use: { hun: 14, hp: 8, stam: 15 } });
  I('pie', 'Tarte aux baies', '🥧', 'food', .3, 14, { use: { hun: 34, hp: 5, temp: 4 } });
  I('coffee', 'Café', '☕', 'drink', .2, 9, { use: { thi: 10, stam: 60, temp: 8 } });
  I('tea', 'Thé aux herbes', '🍵', 'drink', .2, 10, { use: { thi: 30, hp: 6, temp: 12 } });
  I('spirit', 'Alcool fort', '🥃', 'drink', .3, 12, { use: { temp: 22, thi: -5, hp: 4 } });

  // ---------- gadgets ----------
  I('smoke', 'Grenade fumigène', '🌫️', 'gadget', .3, 18, { gad: 'smoke' });
  I('flash', 'Grenade assourdissante', '✨', 'gadget', .3, 22, { gad: 'flash' });
  I('cluster', 'Grenade à fragmentation', '🎆', 'gadget', .4, 40, { gad: 'cluster' });
  I('gas', 'Grenade toxique', '☣️', 'gadget', .35, 28, { gad: 'gas' });
  I('incend', 'Grenade incendiaire', '🧯', 'gadget', .4, 32, { gad: 'incend' });
  I('trap', 'Piège à loups', '🪤', 'gadget', .6, 26, { gad: 'trap' });
  I('decoy', 'Radio leurre', '📻', 'gadget', .4, 24, { gad: 'decoy' });
  I('sentry', 'Tourelle portable', '🤖', 'gadget', 1.2, 90, { gad: 'sentry' });
  I('beacon', 'Balise de largage', '🛰️', 'gadget', .5, 110, { gad: 'beacon' });
  I('drone', 'Drone de reconnaissance', '🛸', 'gadget', .6, 80, { gad: 'drone' });
  I('repairkit', 'Kit de réparation véhicule', '🧰', 'gadget', 1, 50, { gad: 'repairkit' });
  I('wkit', 'Kit d\'entretien d\'arme', '🔧', 'gadget', .4, 35, { gad: 'wkit' });
  GADGET_ORDER.push('smoke', 'flash', 'cluster', 'gas', 'incend', 'trap', 'decoy', 'sentry', 'beacon', 'drone', 'repairkit', 'wkit');

  // ---------- modules ----------
  I('holo', 'Viseur holographique', '🟢', 'mod', .2, 55, { slot: 'sight' });
  I('thermal', 'Lunette thermique', '🌡️', 'mod', .4, 140, { slot: 'sight' });
  I('brake', 'Frein de bouche', '🔰', 'mod', .2, 28, { slot: 'muzzle' });
  I('comp', 'Compensateur', '⏏️', 'mod', .2, 34, { slot: 'muzzle' });
  I('drum', 'Chargeur tambour', '🥁', 'mod', .5, 60, { slot: 'mag' });
  I('quick', 'Chargeur rapide', '⏩', 'mod', .15, 40, { slot: 'mag' });
  I('vgrip', 'Poignée verticale', '✊', 'mod', .2, 30, { slot: 'grip' });
  I('stock', 'Crosse réglable', '📐', 'mod', .3, 36, { slot: 'grip' });
  I('longbarrel', 'Canon long', '📏', 'mod', .4, 60, { slot: 'barrel' });
  I('heavybarrel', 'Canon lourd', '🏋️', 'mod', .6, 75, { slot: 'barrel' });
  I('ap', 'Munitions perforantes', '🎯', 'mod', .1, 55, { slot: 'ammo' });
  I('inc', 'Munitions incendiaires', '🔥', 'mod', .1, 60, { slot: 'ammo' });
  I('hollow', 'Munitions expansives', '💥', 'mod', .1, 45, { slot: 'ammo' });
  I('sub', 'Munitions subsoniques', '🤐', 'mod', .1, 45, { slot: 'ammo' });
  Object.assign(MOD_EFFECT, {
    holo: { n: 'Holographique', spr: .66, range: 1.08 }, thermal: { n: 'Thermique', range: 1.5, spr: .52, zoom: 1 },
    brake: { n: 'Frein de bouche', spr: .8 }, comp: { n: 'Compensateur', spr: .72, noise: 1.15 },
    drum: { n: 'Tambour', mag: 2.1, rel: 1.25 }, quick: { n: 'Rapide', rel: .68 },
    vgrip: { n: 'Poignée', spr: .85, rel: .92 }, stock: { n: 'Crosse', spr: .8, range: 1.05 },
    longbarrel: { n: 'Canon long', range: 1.22, dmg: 1.06 }, heavybarrel: { n: 'Canon lourd', dmg: 1.14, spr: .92, noise: 1.1 },
    ap: { n: 'Perforantes', pierce: 1, dmg: 1.05 }, inc: { n: 'Incendiaires', ignite: 1 }, hollow: { n: 'Expansives', dmg: 1.22, range: .9 }, sub: { n: 'Subsoniques', noise: .4, dmg: .92 },
  });
  const GUNMODS = ['sight', 'muzzle', 'mag', 'laser', 'grip', 'barrel', 'ammo'];
  for (const k of ['pistol', 'smg', 'shotgun', 'hunter', 'ar']) WEAPONS[k].mods = GUNMODS.slice();
  WEAPONS.crossbow.mods = ['sight', 'laser', 'grip'];

  // ---------- armes de mêlée ----------
  const M = (id, n, i, o) => { WEAPONS[id] = Object.assign({ n, i, melee: 1, tree: .4, rock: .2, noise: 80, kb: 100, arc: 1.6 }, o); };
  M('bat_wood', 'Batte de baseball', '⚾', { dmg: 28, rate: .4, range: 58, arc: 1.8, kb: 200, noise: 85, tree: .6, rock: .3, v: 25 });
  M('crowbar', 'Pied-de-biche', '🪝', { dmg: 30, rate: .4, range: 52, arc: 1.4, kb: 110, tree: .7, rock: .5, v: 25 });
  M('spear', 'Lance', '🔱', { dmg: 34, rate: .5, range: 86, arc: .55, kb: 90, noise: 60, tree: .5, rock: .2, v: 40 });
  M('sledge', 'Masse', '🔨', { dmg: 68, rate: 1.0, range: 60, arc: 1.9, kb: 340, noise: 130, tree: .8, rock: 2.5, v: 90 });
  M('katana', 'Katana', '⚔️', { dmg: 50, rate: .3, range: 70, arc: 1.9, kb: 80, noise: 55, tree: .8, rock: .3, bleed: 1, v: 190 });
  M('firaxe', 'Hache d\'incendie', '🪓', { dmg: 44, rate: .58, range: 58, arc: 1.7, kb: 130, noise: 100, tree: 3.6, rock: .5, v: 70 });
  M('shovel', 'Pelle', '🥄', { dmg: 24, rate: .5, range: 56, arc: 1.5, kb: 120, tree: .5, rock: 1.3, v: 20 });
  M('tomahawk', 'Tomahawk', '🪓', { dmg: 32, rate: .38, range: 50, arc: 1.5, kb: 100, noise: 70, tree: 1.8, rock: .3, bleed: 1, v: 45 });
  M('cleaver', 'Hachoir', '🔪', { dmg: 38, rate: .32, range: 48, arc: 1.5, kb: 70, noise: 60, tree: .6, rock: .2, bleed: 1, v: 40 });
  M('chainsaw', 'Tronçonneuse', '🪚', { dmg: 15, rate: .1, range: 54, arc: 1.5, kb: 30, noise: 220, tree: 6, rock: .6, fuelUse: 1, v: 250 });
  M('baton', 'Matraque électrique', '⚡', { dmg: 14, rate: .35, range: 52, arc: 1.4, kb: 60, noise: 70, stun: 1.6, v: 80 });
  M('plasma_blade', 'Lame à plasma', '🗡️', { dmg: 74, rate: .28, range: 72, arc: 2.1, kb: 90, noise: 90, ignite: 1, v: 420 });

  // ---------- armes à distance ----------
  const G_ = (id, n, i, o) => { WEAPONS[id] = Object.assign({ n, i, mods: GUNMODS.slice(), noise: 700, spd: 1000 }, o); };
  G_('revolver', 'Revolver .45', '🔫', { dmg: 40, rate: .42, range: 470, spr: .03, mag: 6, ammo: 'a45', rel: 2.4, noise: 720, spd: 1050, v: 150, len: 15 });
  G_('deagle', 'Pistolet lourd', '🔫', { dmg: 54, rate: .5, range: 490, spr: .04, mag: 8, ammo: 'a45', rel: 1.9, noise: 820, spd: 1100, v: 260, len: 17 });
  G_('uzi', 'Micro-mitraillette', '🔫', { dmg: 11, rate: .05, range: 330, spr: .17, mag: 32, ammo: 'a9', rel: 1.5, auto: 1, noise: 680, spd: 950, v: 200, len: 16 });
  G_('p90', 'PDW compact', '🔫', { dmg: 18, rate: .07, range: 460, spr: .1, mag: 50, ammo: 'a556', rel: 2.2, auto: 1, noise: 780, spd: 1150, v: 380, len: 20 });
  G_('sawedoff', 'Canon scié', '🔫', { dmg: 13, pellets: 9, rate: .45, range: 190, spr: .45, mag: 2, ammo: 'shell', rel: 1.6, noise: 980, spd: 850, v: 130, len: 18 });
  G_('combat_sg', 'Fusil de combat', '🔫', { dmg: 11, pellets: 7, rate: .3, range: 250, spr: .28, mag: 10, ammo: 'shell', rel: 3, auto: 1, noise: 950, spd: 850, v: 380, len: 28 });
  G_('burst_rifle', 'Fusil à rafales', '🔫', { dmg: 26, rate: .5, range: 600, spr: .045, mag: 30, ammo: 'a556', rel: 2.1, burst: 3, noise: 880, spd: 1250, v: 340, len: 28 });
  G_('dmr', 'Fusil de précision', '🎯', { dmg: 72, rate: .55, range: 820, spr: .018, mag: 10, ammo: 'a762', rel: 2.3, scoped: 1, noise: 980, spd: 1500, v: 420, len: 32 });
  G_('lmg', 'Mitrailleuse légère', '🔫', { dmg: 26, rate: .085, range: 560, spr: .11, mag: 75, ammo: 'a762', rel: 4.2, auto: 1, heavy: .65, noise: 1000, spd: 1250, v: 520, len: 34 });
  G_('minigun', 'Minigun', '🔫', { dmg: 15, rate: .035, range: 480, spr: .16, mag: 200, ammo: 'a762', rel: 6, auto: 1, heavy: .4, noise: 1100, spd: 1300, v: 900, len: 36 });
  G_('antimat', 'Fusil antimatériel', '🎯', { dmg: 210, rate: 1.7, range: 1100, spr: .008, mag: 5, ammo: 'a50', rel: 3.2, pierce: 4, scoped: 1, heavy: .8, noise: 1300, spd: 1900, v: 700, len: 38 });
  G_('bow', 'Arc de chasse', '🏹', { dmg: 46, rate: .55, range: 500, spr: .025, mag: 1, ammo: 'arrow', rel: .7, pierce: 1, noise: 40, spd: 900, v: 70, mods: ['sight', 'laser'], len: 20 });
  G_('compound', 'Arc à poulies', '🏹', { dmg: 64, rate: .5, range: 620, spr: .012, mag: 1, ammo: 'arrow', rel: .6, pierce: 2, noise: 35, spd: 1100, v: 160, mods: ['sight', 'laser', 'grip'], len: 22 });
  G_('rpg', 'Lance-roquettes', '🚀', { dmg: 230, rate: 1.2, range: 700, spr: .02, mag: 1, ammo: 'rocket', rel: 3.4, expl: 125, noise: 1100, spd: 750, heavy: .75, v: 650, mods: ['sight'], len: 36 });
  G_('glauncher', 'Lance-grenades', '💣', { dmg: 130, rate: .9, range: 520, spr: .03, mag: 4, ammo: 'grenade', rel: 2.8, expl: 95, noise: 900, spd: 700, v: 480, mods: ['sight', 'mag'], len: 24 });
  G_('taser', 'Pistolet à impulsion', '⚡', { dmg: 6, rate: .5, range: 230, spr: .03, mag: 6, ammo: 'cell', rel: 1.4, stun: 2.2, energy: 1, noise: 60, spd: 1400, v: 140, mods: ['sight', 'mag'], len: 14 });
  G_('plasma', 'Fusil à plasma', '🔫', { dmg: 34, rate: .1, range: 640, spr: .05, mag: 40, ammo: 'cell', rel: 2.2, auto: 1, pierce: 1, energy: 1, noise: 320, spd: 1700, v: 600, mods: ['sight', 'mag', 'grip', 'laser'], len: 26 });
  G_('railgun', 'Canon électrique', '🔫', { dmg: 150, rate: 1.5, range: 1000, spr: .004, mag: 4, ammo: 'cell', rel: 2.8, pierce: 6, energy: 1, scoped: 1, noise: 500, spd: 3000, v: 900, mods: ['sight', 'mag'], len: 34 });
  G_('acidgun', 'Cracheur d\'acide', '🧪', { dmg: 9, rate: .08, range: 200, spr: .15, mag: 60, ammo: 'chem', rel: 2.4, auto: 1, acid: 1, noise: 400, spd: 520, v: 380, mods: [], len: 24 });
  G_('nailgun', 'Cloueuse', '📌', { dmg: 20, rate: .11, range: 300, spr: .08, mag: 40, ammo: 'nail', rel: 1.8, auto: 1, pierce: 1, noise: 360, spd: 1100, v: 160, mods: ['sight', 'mag'], len: 20 });
  G_('flaregun', 'Pistolet de détresse', '🎇', { dmg: 12, rate: .8, range: 520, spr: .03, mag: 1, ammo: 'flare', rel: 1.8, ignite: 1, noise: 600, spd: 700, v: 90, mods: ['sight'], len: 14 });

  // ---------- armures ----------
  const A = (id, n, i, slot, o) => { ARMOR[id] = Object.assign({ n, i, slot, ar: 0, warm: 0, v: 20 }, o); };
  // têtes
  A('bandana', 'Bandana', '🎀', 'head', { ar: 0, warm: 1, stealth: .04, col: '#b02a20', v: 8 });
  A('beanie', 'Bonnet', '🧶', 'head', { ar: 0, warm: 8, col: '#4a5a8a', v: 10 });
  A('hood', 'Cagoule', '🥷', 'head', { ar: 1, warm: 4, stealth: .08, col: '#26262e', v: 28 });
  A('hardhat', 'Casque de chantier', '👷', 'head', { ar: 2, warm: 1, col: '#e8b020', v: 25 });
  A('cowboy', 'Chapeau de cow-boy', '🤠', 'head', { ar: 1, warm: 2, harvest: .06, col: '#8a6a3a', v: 30 });
  A('pillard_helm', 'Casque de pillard', '💀', 'head', { ar: 4, warm: 1, melee: .04, col: '#6a2a22', v: 90 });
  A('welding', 'Masque de soudeur', '🥽', 'head', { ar: 3, fire: .3, col: '#5a5a62', v: 70 });
  A('respirator', 'Respirateur', '😷', 'head', { ar: 1, rad: .2, col: '#6a7a6a', v: 60 });
  A('riot_helm', 'Casque anti-émeute', '⛑️', 'head', { ar: 6, warm: 2, col: '#2a3040', v: 150 });
  A('ballistic', 'Casque balistique', '🪖', 'head', { ar: 8, warm: 2, col: '#4a5040', v: 220 });
  A('legion_helm', 'Casque de légionnaire', '🛡️', 'head', { ar: 6, melee: .05, col: '#8a1a2a', v: 200 });
  A('nvg', 'Lunettes de vision nocturne', '🕶️', 'head', { ar: 1, nvg: 1, col: '#2a4a2a', v: 260 });
  A('exo_helm', 'Casque exo-assisté', '🤖', 'head', { ar: 10, stam: 10, nvg: 1, reload: .05, col: '#3a8ab0', v: 520 });
  // torses
  A('poncho', 'Poncho imperméable', '🧥', 'body', { ar: 1, warm: 3, wet: .65, col: '#5a7a6a', v: 25 });
  A('furcoat', 'Manteau de fourrure', '🧥', 'body', { ar: 3, warm: 30, col: '#8a6a4a', v: 80 });
  A('parka', 'Parka polaire', '🧥', 'body', { ar: 3, warm: 24, wet: .3, col: '#c8d0e0', v: 90 });
  A('scavenger', 'Gilet de récupération', '🦺', 'body', { ar: 3, warm: 3, carry: 10, col: '#6a5a3a', v: 50 });
  A('biker', 'Blouson de motard', '🧥', 'body', { ar: 5, warm: 10, col: '#2a2a30', v: 80 });
  A('medic_coat', 'Blouse de médecin', '🥼', 'body', { ar: 1, warm: 3, regen: .25, col: '#e8eef2', v: 70 });
  A('ghillie', 'Tenue de camouflage', '🌿', 'body', { ar: 2, warm: 5, stealth: .35, col: '#4a5a32', v: 130 });
  A('scrapmail', 'Armure de ferraille', '⚙️', 'body', { ar: 7, warm: 3, spd: -.04, col: '#6a5a50', v: 90 });
  A('tactical', 'Gilet tactique', '🦺', 'body', { ar: 6, warm: 4, carry: 6, reload: .04, col: '#4a5046', v: 170 });
  A('fireproof', 'Combinaison ignifuge', '🧑‍🚒', 'body', { ar: 4, warm: 4, fire: .7, rad: .25, col: '#c8a030', v: 190 });
  A('riot_armor', 'Armure anti-émeute', '🛡️', 'body', { ar: 10, warm: 4, spd: -.05, col: '#2a3040', v: 260 });
  A('legion_plate', 'Plastron de légionnaire', '🛡️', 'body', { ar: 11, warm: 4, melee: .08, spd: -.03, col: '#7a1a24', v: 300 });
  A('stealth_suit', 'Combinaison furtive', '🥷', 'body', { ar: 5, warm: 6, stealth: .5, col: '#1a1a22', v: 340 });
  A('power_armor', 'Armure énergétique', '🤖', 'body', { ar: 16, warm: 8, stam: 20, hp: 15, spd: .02, col: '#3a7aa8', v: 700 });
  // pieds
  A('sneakers', 'Baskets', '👟', 'feet', { ar: 0, warm: 1, spd: .09, stealth: .1, col: '#e8e8f0', v: 20 });
  A('rainboots', 'Bottes de pluie', '🥾', 'feet', { ar: 1, warm: 2, wet: .4, spd: .02, col: '#c8b030', v: 22 });
  A('steelboots', 'Bottes à embouts d\'acier', '🥾', 'feet', { ar: 3, warm: 4, col: '#5a5a62', v: 55 });
  A('winterboots', 'Bottes fourrées', '🥾', 'feet', { ar: 2, warm: 14, spd: .02, col: '#8a7a6a', v: 60 });
  A('fireboots', 'Bottes ignifuges', '🥾', 'feet', { ar: 2, warm: 3, fire: .35, spd: .02, col: '#a8722a', v: 80 });
  A('combatboots', 'Bottes de combat', '🥾', 'feet', { ar: 4, warm: 5, spd: .05, stealth: .05, col: '#3a3a30', v: 100 });
  A('runners', 'Chaussures de course', '👟', 'feet', { ar: 0, spd: .14, stam: 8, col: '#e04a4a', v: 90 });
  A('jetboots', 'Bottes à propulsion', '🚀', 'feet', { ar: 2, spd: .2, stam: 15, col: '#5ac0e0', v: 360 });
  // mains
  A('workgloves', 'Gants de travail', '🧤', 'hands', { ar: 1, warm: 2, harvest: .12, col: '#a8803a', v: 18 });
  A('tacgloves', 'Gants tactiques', '🧤', 'hands', { ar: 1, warm: 1, reload: .1, col: '#2a2e2a', v: 60 });
  A('mittens', 'Moufles chauffantes', '🧤', 'hands', { ar: 0, warm: 9, col: '#c04a3a', v: 40 });
  A('brass', 'Gantelets renforcés', '🥊', 'hands', { ar: 2, melee: .1, col: '#7a7a82', v: 80 });
  A('medgloves', 'Gants chirurgicaux', '🧤', 'hands', { ar: 0, regen: .1, col: '#8ac8e0', v: 45 });
  A('insulated', 'Gants isolants', '🧤', 'hands', { ar: 1, fire: .15, warm: 3, col: '#c8a030', v: 55 });
  A('energy_gloves', 'Gants énergétiques', '⚡', 'hands', { ar: 2, melee: .15, reload: .05, col: '#3a9ac8', v: 300 });
  // dos
  A('daypack', 'Sac à dos', '🎒', 'back', { ar: 0, carry: 10, col: '#6a5a3a', v: 40 });
  A('hikerpack', 'Sac de randonneur', '🎒', 'back', { ar: 0, warm: 1, carry: 16, col: '#3a6a5a', v: 85 });
  A('tacpack', 'Sac tactique MOLLE', '🎒', 'back', { ar: 1, carry: 14, reload: .03, col: '#4a5046', v: 140 });
  A('armorpack', 'Sac blindé', '🎒', 'back', { ar: 3, carry: 8, col: '#5a626c', v: 160 });
  A('cape', 'Cape', '🧣', 'back', { ar: 0, warm: 5, stealth: .05, wet: .2, col: '#6a2a3a', v: 30 });
  A('flametank', 'Réservoir ignifuge', '🛢️', 'back', { ar: 2, fire: .2, col: '#a8402a', v: 110 });
  A('medpack', 'Sac de médecin', '🎒', 'back', { ar: 0, carry: 8, regen: .15, col: '#e8e0e0', v: 120 });
  A('generator', 'Générateur dorsal', '🔋', 'back', { ar: 2, regen: .3, stam: 10, col: '#3a8a6a', v: 380 });

  // ---------- recettes ----------
  const rc = (cat, name, out, cost, st, plan) => RECIPES.push(R(cat, name, out, cost, st, plan));
  // base / cuisine / soins
  rc('Cuisine', 'Viande séchée (x2)', 'i:jerky:2', { rawmeat: 2 }, 'campfire');
  rc('Cuisine', 'Thé aux herbes', 'i:tea:1', { herb: 2, bottle_clean: 1 }, 'campfire');
  rc('Cuisine', 'Tarte aux baies', 'i:pie:1', { berries: 4, veg: 1 }, 'campfire');
  rc('Cuisine', 'Barre énergétique (x2)', 'i:energybar:2', { berries: 2, seed: 2 }, 'campfire');
  rc('Cuisine', 'Alcool fort', 'i:spirit:1', { berries: 3, chem: 1 }, 'campfire');
  rc('Soins', 'Attelle de fortune', 'i:splint:1', { wood: 2, cloth: 2 });
  rc('Soins', 'Pilules d\'iode (x3)', 'i:iodine:3', { chem: 2, herb: 1 }, 'workbench', 'plan_med');
  rc('Soins', 'Stimulant', 'i:stimpack:1', { chem: 2, herb: 2, elec: 1 }, 'workbench', 'plan_med');
  rc('Soins', 'Adrénaline', 'i:adrenaline:1', { chem: 3, herb: 3, elec: 1 }, 'workbench', 'plan_med');
  rc('Soins', 'Kit chirurgical', 'i:surgical:1', { medkit: 1, steel: 1, chem: 2 }, 'workbench', 'plan_med');
  // ressources avancées
  rc('Base', 'Acier trempé', 'i:steel:1', { metal: 2, fuel: 1 }, 'workbench');
  rc('Base', 'Fibre balistique', 'i:fiber:1', { cloth: 6, chem: 1 }, 'workbench', 'plan_armor');
  rc('Base', 'Circuit avancé', 'i:circuit:1', { elec: 3, metal: 1, chem: 1 }, 'workbench', 'plan_energy');
  rc('Base', 'Noyau énergétique', 'i:core:1', { circuit: 2, chem: 3, metal: 4 }, 'workbench', 'plan_energy');
  // munitions
  rc('Munitions', 'Balles .45 (x8)', 'i:a45:8', { scrap: 3, powder: 2 }, 'workbench', 'plan_guns');
  rc('Munitions', 'Balles .50 (x3)', 'i:a50:3', { metal: 2, scrap: 3, powder: 3 }, 'workbench', 'plan_heavy');
  rc('Munitions', 'Roquette (x1)', 'i:rocket:1', { metal: 3, powder: 4, fuel: 1 }, 'workbench', 'plan_heavy');
  rc('Munitions', 'Flèches (x6)', 'i:arrow:6', { wood: 2, scrap: 1 }, 'workbench');
  rc('Munitions', 'Clous (x30)', 'i:nail:30', { scrap: 3 }, 'workbench');
  rc('Munitions', 'Cellules énergétiques (x4)', 'i:cell:4', { elec: 2, chem: 1, scrap: 2 }, 'workbench', 'plan_energy');
  // mêlée
  rc('Armes', 'Batte de baseball', 'w:bat_wood', { wood: 5 });
  rc('Armes', 'Pied-de-biche', 'w:crowbar', { metal: 2, scrap: 2 }, 'workbench');
  rc('Armes', 'Lance', 'w:spear', { wood: 4, scrap: 2, stone: 1 });
  rc('Armes', 'Pelle', 'w:shovel', { wood: 3, scrap: 3 });
  rc('Armes', 'Tomahawk', 'w:tomahawk', { wood: 2, metal: 2, hide: 1 }, 'workbench');
  rc('Armes', 'Hachoir', 'w:cleaver', { metal: 3, scrap: 2 }, 'workbench');
  rc('Armes', 'Hache d\'incendie', 'w:firaxe', { metal: 4, wood: 3, scrap: 3 }, 'workbench');
  rc('Armes', 'Masse', 'w:sledge', { steel: 2, wood: 3, scrap: 3 }, 'workbench', 'plan_heavy');
  rc('Armes', 'Katana', 'w:katana', { steel: 3, hide: 2, cloth: 1 }, 'workbench', 'plan_guns');
  rc('Armes', 'Tronçonneuse', 'w:chainsaw', { metal: 10, scrap: 10, fuel: 2, elec: 2 }, 'workbench', 'plan_heavy');
  rc('Armes', 'Matraque électrique', 'w:baton', { metal: 2, elec: 2, cell: 1, rubber: 1 }, 'workbench', 'plan_energy');
  rc('Armes', 'Lame à plasma', 'w:plasma_blade', { steel: 4, core: 1, circuit: 2 }, 'workbench', 'plan_energy');
  // distance
  rc('Armes', 'Arc de chasse', 'w:bow', { wood: 6, cloth: 3, scrap: 1 }, 'workbench');
  rc('Armes', 'Arc à poulies', 'w:compound', { metal: 5, scrap: 6, cloth: 3, elec: 1 }, 'workbench', 'plan_guns');
  rc('Armes', 'Revolver .45', 'w:revolver', { metal: 6, scrap: 8, wood: 2 }, 'workbench', 'plan_guns');
  rc('Armes', 'Pistolet lourd', 'w:deagle', { steel: 3, metal: 4, scrap: 6 }, 'workbench', 'plan_guns');
  rc('Armes', 'Micro-mitraillette', 'w:uzi', { metal: 8, scrap: 10, elec: 1 }, 'workbench', 'plan_guns');
  rc('Armes', 'Canon scié', 'w:sawedoff', { metal: 5, scrap: 5, wood: 2 }, 'workbench', 'plan_guns');
  rc('Armes', 'Fusil de combat', 'w:combat_sg', { steel: 3, metal: 8, scrap: 10, elec: 1 }, 'workbench', 'plan_heavy');
  rc('Armes', 'Fusil à rafales', 'w:burst_rifle', { steel: 3, metal: 10, scrap: 10, elec: 3 }, 'workbench', 'plan_heavy');
  rc('Armes', 'PDW compact', 'w:p90', { steel: 2, metal: 10, scrap: 10, elec: 3 }, 'workbench', 'plan_heavy');
  rc('Armes', 'Fusil de précision', 'w:dmr', { steel: 4, metal: 10, wood: 4, elec: 3 }, 'workbench', 'plan_heavy');
  rc('Armes', 'Mitrailleuse légère', 'w:lmg', { steel: 6, metal: 14, scrap: 14, elec: 3 }, 'workbench', 'plan_heavy');
  rc('Armes', 'Fusil antimatériel', 'w:antimat', { steel: 10, metal: 20, elec: 6, circuit: 1 }, 'workbench', 'plan_heavy');
  rc('Armes', 'Lance-grenades', 'w:glauncher', { steel: 5, metal: 12, scrap: 10, elec: 2 }, 'workbench', 'plan_explosives');
  rc('Armes', 'Lance-roquettes', 'w:rpg', { steel: 8, metal: 16, scrap: 12, elec: 3 }, 'workbench', 'plan_explosives');
  rc('Armes', 'Cloueuse', 'w:nailgun', { metal: 6, scrap: 8, elec: 1 }, 'workbench', 'plan_guns');
  rc('Armes', 'Pistolet de détresse', 'w:flaregun', { metal: 3, scrap: 4, chem: 1 }, 'workbench');
  rc('Armes', 'Cracheur d\'acide', 'w:acidgun', { metal: 10, chem: 8, scrap: 8, elec: 2 }, 'workbench', 'plan_fire');
  rc('Armes', 'Pistolet à impulsion', 'w:taser', { metal: 4, elec: 3, circuit: 1 }, 'workbench', 'plan_energy');
  rc('Armes', 'Fusil à plasma', 'w:plasma', { steel: 6, circuit: 4, core: 1, elec: 4 }, 'workbench', 'plan_energy');
  rc('Armes', 'Canon électrique', 'w:railgun', { steel: 12, circuit: 6, core: 3, elec: 8 }, 'workbench', 'plan_energy');
  // armures
  rc('Armure', 'Bandana', 'a:bandana', { cloth: 1 });
  rc('Armure', 'Bonnet', 'a:beanie', { cloth: 3 });
  rc('Armure', 'Cagoule', 'a:hood', { cloth: 4, hide: 1 }, null, 'plan_stealth');
  rc('Armure', 'Casque de chantier', 'a:hardhat', { metal: 2, scrap: 2 }, 'workbench');
  rc('Armure', 'Masque de soudeur', 'a:welding', { metal: 3, scrap: 3, chem: 1 }, 'workbench');
  rc('Armure', 'Respirateur', 'a:respirator', { cloth: 3, chem: 2, rubber: 1 }, 'workbench', 'plan_armor');
  rc('Armure', 'Casque anti-émeute', 'a:riot_helm', { steel: 2, fiber: 2, rubber: 1 }, 'workbench', 'plan_armor');
  rc('Armure', 'Casque balistique', 'a:ballistic', { steel: 3, fiber: 4, cloth: 2 }, 'workbench', 'plan_armor');
  rc('Armure', 'Lunettes de vision nocturne', 'a:nvg', { circuit: 2, elec: 4, rubber: 1, metal: 2 }, 'workbench', 'plan_energy');
  rc('Armure', 'Poncho imperméable', 'a:poncho', { cloth: 6, rubber: 1 });
  rc('Armure', 'Manteau de fourrure', 'a:furcoat', { hide: 10, cloth: 4 }, 'workbench');
  rc('Armure', 'Parka polaire', 'a:parka', { cloth: 14, hide: 4, rubber: 1 }, 'workbench');
  rc('Armure', 'Gilet de récupération', 'a:scavenger', { cloth: 8, scrap: 4, hide: 2 });
  rc('Armure', 'Blouson de motard', 'a:biker', { hide: 8, metal: 1, cloth: 2 }, 'workbench');
  rc('Armure', 'Blouse de médecin', 'a:medic_coat', { cloth: 8, herb: 2 }, 'workbench', 'plan_med');
  rc('Armure', 'Tenue de camouflage', 'a:ghillie', { cloth: 12, herb: 8, hide: 2 }, 'workbench', 'plan_stealth');
  rc('Armure', 'Armure de ferraille', 'a:scrapmail', { scrap: 24, metal: 4, cloth: 4 }, 'workbench');
  rc('Armure', 'Gilet tactique', 'a:tactical', { fiber: 4, cloth: 6, metal: 2 }, 'workbench', 'plan_armor');
  rc('Armure', 'Combinaison ignifuge', 'a:fireproof', { cloth: 14, chem: 6, fiber: 3, metal: 2 }, 'workbench', 'plan_armor');
  rc('Armure', 'Armure anti-émeute', 'a:riot_armor', { steel: 4, fiber: 6, rubber: 2, cloth: 4 }, 'workbench', 'plan_armor');
  rc('Armure', 'Combinaison furtive', 'a:stealth_suit', { fiber: 6, cloth: 10, circuit: 1, hide: 3 }, 'workbench', 'plan_stealth');
  rc('Armure', 'Baskets', 'a:sneakers', { cloth: 3, rubber: 1 });
  rc('Armure', 'Bottes de pluie', 'a:rainboots', { rubber: 2, cloth: 1 });
  rc('Armure', 'Bottes à embouts d\'acier', 'a:steelboots', { hide: 4, metal: 2 }, 'workbench');
  rc('Armure', 'Bottes fourrées', 'a:winterboots', { hide: 5, cloth: 4 }, 'workbench');
  rc('Armure', 'Bottes ignifuges', 'a:fireboots', { hide: 5, fiber: 2, chem: 1 }, 'workbench', 'plan_armor');
  rc('Armure', 'Bottes de combat', 'a:combatboots', { hide: 6, metal: 2, rubber: 2 }, 'workbench', 'plan_armor');
  rc('Armure', 'Chaussures de course', 'a:runners', { cloth: 4, rubber: 2 }, 'workbench');
  rc('Armure', 'Gants de travail', 'a:workgloves', { hide: 2, cloth: 1 });
  rc('Armure', 'Gants tactiques', 'a:tacgloves', { hide: 2, fiber: 1, cloth: 1 }, 'workbench', 'plan_armor');
  rc('Armure', 'Moufles chauffantes', 'a:mittens', { cloth: 5, hide: 1 });
  rc('Armure', 'Gantelets renforcés', 'a:brass', { metal: 3, hide: 2, scrap: 2 }, 'workbench');
  rc('Armure', 'Gants chirurgicaux', 'a:medgloves', { rubber: 2, herb: 1 }, 'workbench', 'plan_med');
  rc('Armure', 'Gants isolants', 'a:insulated', { rubber: 2, cloth: 2, fiber: 1 }, 'workbench');
  rc('Armure', 'Sac à dos (dos)', 'a:daypack', { cloth: 8, hide: 2 });
  rc('Armure', 'Sac de randonneur', 'a:hikerpack', { cloth: 14, hide: 5, scrap: 4 }, 'workbench');
  rc('Armure', 'Sac tactique MOLLE', 'a:tacpack', { fiber: 4, cloth: 12, metal: 2 }, 'workbench', 'plan_armor');
  rc('Armure', 'Sac blindé', 'a:armorpack', { steel: 2, fiber: 3, cloth: 8 }, 'workbench', 'plan_armor');
  rc('Armure', 'Cape', 'a:cape', { cloth: 6 });
  rc('Armure', 'Réservoir ignifuge', 'a:flametank', { metal: 4, fiber: 2, fuel: 1 }, 'workbench', 'plan_armor');
  rc('Armure', 'Sac de médecin', 'a:medpack', { cloth: 10, herb: 4, rubber: 1 }, 'workbench', 'plan_med');
  rc('Armure', 'Générateur dorsal', 'a:generator', { circuit: 3, core: 1, metal: 6 }, 'workbench', 'plan_energy');
  rc('Armure', 'Armure énergétique', 'a:power_armor', { steel: 14, fiber: 8, circuit: 8, core: 3, elec: 10 }, 'workbench', 'plan_energy');
  // gadgets
  rc('Gadgets', 'Grenade fumigène (x2)', 'i:smoke:2', { chem: 2, cloth: 1, powder: 1 }, 'workbench', 'plan_explosives');
  rc('Gadgets', 'Grenade assourdissante (x2)', 'i:flash:2', { powder: 2, chem: 1, scrap: 2 }, 'workbench', 'plan_explosives');
  rc('Gadgets', 'Grenade à fragmentation', 'i:cluster:1', { grenade: 1, scrap: 6, powder: 2 }, 'workbench', 'plan_explosives');
  rc('Gadgets', 'Grenade toxique', 'i:gas:1', { chem: 4, scrap: 2, powder: 1 }, 'workbench', 'plan_explosives');
  rc('Gadgets', 'Grenade incendiaire', 'i:incend:1', { fuel: 2, chem: 1, scrap: 2 }, 'workbench', 'plan_explosives');
  rc('Gadgets', 'Piège à loups', 'i:trap:1', { metal: 3, scrap: 4 }, 'workbench', 'plan_explosives');
  rc('Gadgets', 'Radio leurre', 'i:decoy:1', { elec: 3, scrap: 2 }, 'workbench', 'plan_stealth');
  rc('Gadgets', 'Tourelle portable', 'i:sentry:1', { metal: 8, scrap: 8, elec: 3, circuit: 1 }, 'workbench', 'plan_turret');
  rc('Gadgets', 'Balise de largage', 'i:beacon:1', { circuit: 2, elec: 4, chem: 2, flare: 1 }, 'workbench', 'plan_energy');
  rc('Gadgets', 'Drone de reconnaissance', 'i:drone:1', { circuit: 2, elec: 5, metal: 3, cell: 1 }, 'workbench', 'plan_energy');
  rc('Gadgets', 'Kit de réparation véhicule', 'i:repairkit:1', { metal: 4, scrap: 8, rubber: 1 }, 'workbench');
  rc('Gadgets', 'Kit d\'entretien d\'arme', 'i:wkit:1', { scrap: 4, metal: 1, cloth: 1 }, 'workbench');
  // modules
  rc('Modules', 'Viseur holographique', 'i:holo:1', { elec: 2, metal: 1, scrap: 2 }, 'workbench', 'plan_optics');
  rc('Modules', 'Lunette thermique', 'i:thermal:1', { circuit: 2, elec: 3, metal: 2 }, 'workbench', 'plan_energy');
  rc('Modules', 'Frein de bouche', 'i:brake:1', { metal: 2, scrap: 2 }, 'workbench', 'plan_optics');
  rc('Modules', 'Compensateur', 'i:comp:1', { metal: 2, scrap: 3 }, 'workbench', 'plan_optics');
  rc('Modules', 'Chargeur tambour', 'i:drum:1', { metal: 4, scrap: 6 }, 'workbench', 'plan_heavy');
  rc('Modules', 'Chargeur rapide', 'i:quick:1', { metal: 2, scrap: 3, rubber: 1 }, 'workbench', 'plan_optics');
  rc('Modules', 'Poignée verticale', 'i:vgrip:1', { scrap: 3, rubber: 1 }, 'workbench', 'plan_optics');
  rc('Modules', 'Crosse réglable', 'i:stock:1', { metal: 2, scrap: 2, wood: 1 }, 'workbench', 'plan_optics');
  rc('Modules', 'Canon long', 'i:longbarrel:1', { steel: 1, metal: 2 }, 'workbench', 'plan_heavy');
  rc('Modules', 'Canon lourd', 'i:heavybarrel:1', { steel: 2, metal: 3 }, 'workbench', 'plan_heavy');
  rc('Modules', 'Munitions perforantes', 'i:ap:1', { steel: 1, powder: 2 }, 'workbench', 'plan_heavy');
  rc('Modules', 'Munitions incendiaires', 'i:inc:1', { fuel: 1, chem: 1, powder: 1 }, 'workbench', 'plan_explosives');
  rc('Modules', 'Munitions expansives', 'i:hollow:1', { scrap: 2, powder: 1 }, 'workbench', 'plan_guns');
  rc('Modules', 'Munitions subsoniques', 'i:sub:1', { scrap: 2, powder: 1, cloth: 1 }, 'workbench', 'plan_stealth');

  // ---------- butin ----------
  const L = (key, rows) => { LOOT[key] = (LOOT[key] || []).concat(rows); };
  const RR = (key, rows) => { RARE_LOOT[key] = (RARE_LOOT[key] || []).concat(rows); };
  L('house', [['coffee', 2, 1, 2], ['energybar', 2, 1, 2], ['honey', 1, 1, 1], ['rubber', 2, 1, 2], ['arrow', 1, 3, 6]]);
  L('cabin', [['jerky', 3, 1, 3], ['arrow', 3, 4, 10], ['tea', 2, 1, 2], ['rubber', 1, 1, 2], ['honey', 2, 1, 2]]);
  L('gas', [['rubber', 4, 1, 3], ['spirit', 2, 1, 1], ['steel', 1, 1, 1], ['repairkit', 1, 1, 1]]);
  L('farm', [['honey', 3, 1, 2], ['pie', 2, 1, 1], ['jerky', 3, 1, 3], ['arrow', 2, 3, 8]]);
  L('market', [['energybar', 4, 1, 4], ['coffee', 3, 1, 3], ['ration', 2, 1, 2], ['tea', 2, 1, 2], ['honey', 2, 1, 2], ['rubber', 1, 1, 2]]);
  L('police', [['a45', 5, 6, 16], ['flash', 3, 1, 2], ['smoke', 2, 1, 2], ['fiber', 3, 1, 3], ['splint', 2, 1, 1], ['trap', 1, 1, 1]]);
  L('hospital', [['surgical', 2, 1, 1], ['iodine', 3, 1, 3], ['stimpack', 2, 1, 1], ['splint', 3, 1, 2], ['adrenaline', 1, 1, 1], ['rubber', 2, 1, 3]]);
  L('warehouse', [['steel', 4, 1, 3], ['fiber', 2, 1, 3], ['rubber', 3, 1, 3], ['nail', 4, 10, 30], ['repairkit', 2, 1, 1], ['wkit', 2, 1, 1]]);
  L('bunker', [['a50', 2, 2, 6], ['rocket', 1, 1, 1], ['ration', 4, 1, 3], ['smoke', 3, 1, 2], ['cluster', 2, 1, 1], ['steel', 3, 1, 3], ['fiber', 3, 2, 4], ['a45', 3, 6, 14]]);
  L('camp', [['a45', 3, 4, 12], ['spirit', 3, 1, 2], ['nail', 3, 10, 25], ['trap', 2, 1, 1], ['jerky', 2, 1, 2], ['wkit', 1, 1, 1]]);
  L('legion', [['a50', 2, 2, 5], ['cluster', 2, 1, 1], ['flash', 3, 1, 2], ['ration', 4, 1, 3], ['stimpack', 2, 1, 1], ['wkit', 2, 1, 1], ['fiber', 2, 2, 4]]);
  L('radio', [['circuit', 3, 1, 2], ['cell', 4, 2, 6], ['elec', 3, 2, 4]]);
  L('lab', [['circuit', 5, 1, 3], ['core', 2, 1, 1], ['cell', 4, 3, 8], ['stimpack', 2, 1, 1], ['iodine', 3, 1, 3], ['adrenaline', 1, 1, 1]]);
  L('prison', [['a45', 3, 4, 10], ['fiber', 3, 1, 3], ['trap', 2, 1, 1], ['flash', 2, 1, 2], ['nail', 2, 8, 20]]);
  L('school', [['energybar', 3, 1, 3], ['coffee', 2, 1, 2], ['rubber', 2, 1, 2], ['tea', 2, 1, 2]]);
  L('diner', [['coffee', 4, 1, 3], ['pie', 3, 1, 2], ['honey', 2, 1, 2], ['tea', 2, 1, 2], ['jerky', 2, 1, 3]]);
  L('fire', [['repairkit', 2, 1, 1], ['rubber', 3, 1, 3], ['incend', 1, 1, 1], ['steel', 2, 1, 2]]);
  L('mine', [['steel', 3, 1, 2], ['nail', 3, 10, 25], ['powder', 2, 2, 4], ['trap', 1, 1, 1]]);
  L('trailer', [['spirit', 2, 1, 1], ['rubber', 2, 1, 2], ['nail', 2, 8, 20], ['honey', 1, 1, 1], ['jerky', 2, 1, 2]]);
  L('lighthouse', [['flare', 3, 1, 3], ['beacon', 1, 1, 1], ['arrow', 2, 4, 8]]);
  L('airdrop', [['a50', 3, 2, 6], ['rocket', 2, 1, 2], ['cell', 3, 4, 10], ['stimpack', 3, 1, 2], ['cluster', 2, 1, 2], ['surgical', 2, 1, 1], ['drone', 1, 1, 1], ['circuit', 2, 1, 3], ['steel', 3, 2, 4], ['fiber', 3, 2, 4]]);
  L('funfair', [['energybar', 3, 1, 3], ['spirit', 2, 1, 1], ['cluster', 1, 1, 1]]);
  L('drivein', [['coffee', 3, 1, 2], ['repairkit', 2, 1, 1], ['rubber', 3, 1, 3]]);
  L('powerplant', [['circuit', 4, 1, 3], ['cell', 5, 3, 8], ['core', 1, 1, 1], ['steel', 3, 1, 3], ['rubber', 3, 1, 3]]);
  L('castle', [['steel', 4, 1, 3], ['a50', 1, 2, 4], ['honey', 2, 1, 2], ['arrow', 4, 6, 14]]);
  L('crash', [['cell', 2, 2, 5], ['stimpack', 1, 1, 1]]);
  RR('house', [['w', 'bat_wood', 2], ['w', 'shovel', 2], ['w', 'cleaver', 1], ['a', 'bandana', 2], ['a', 'beanie', 2], ['a', 'workgloves', 2], ['a', 'sneakers', 2], ['a', 'daypack', 2], ['a', 'poncho', 1], ['w', 'bow', 1]]);
  RR('cabin', [['w', 'bow', 2], ['w', 'tomahawk', 2], ['w', 'spear', 2], ['a', 'furcoat', 1], ['a', 'winterboots', 2], ['a', 'cowboy', 1], ['a', 'hikerpack', 1], ['a', 'mittens', 2], ['a', 'cape', 1]]);
  RR('gas', [['w', 'crowbar', 2], ['a', 'hardhat', 2], ['a', 'rainboots', 2], ['a', 'biker', 1], ['a', 'welding', 1], ['p', 'plan_explosives', 1], ['a', 'insulated', 1]]);
  RR('farm', [['w', 'shovel', 2], ['w', 'sawedoff', 1], ['a', 'cowboy', 2], ['a', 'workgloves', 2], ['a', 'rainboots', 2], ['a', 'poncho', 1], ['w', 'compound', 1]]);
  RR('market', [['a', 'sneakers', 2], ['a', 'scavenger', 2], ['a', 'runners', 1], ['a', 'daypack', 2], ['a', 'beanie', 1], ['a', 'parka', 1]]);
  RR('police', [['w', 'revolver', 3], ['w', 'baton', 1], ['a', 'riot_helm', 1], ['a', 'riot_armor', 1], ['a', 'combatboots', 2], ['a', 'tacgloves', 2], ['p', 'plan_stealth', 1], ['w', 'taser', 1], ['a', 'tactical', 1]]);
  RR('hospital', [['a', 'medic_coat', 3], ['a', 'medgloves', 3], ['a', 'medpack', 2], ['p', 'plan_med', 2], ['a', 'respirator', 1]]);
  RR('warehouse', [['w', 'sledge', 1], ['w', 'crowbar', 2], ['a', 'hardhat', 2], ['a', 'steelboots', 2], ['a', 'scavenger', 2], ['a', 'hikerpack', 2], ['a', 'tacpack', 1], ['w', 'nailgun', 1], ['p', 'plan_heavy', 1]]);
  RR('bunker', [['w', 'dmr', 2], ['w', 'lmg', 1], ['w', 'burst_rifle', 2], ['w', 'combat_sg', 1], ['w', 'p90', 1], ['a', 'ballistic', 2], ['a', 'tactical', 2], ['a', 'combatboots', 2], ['a', 'armorpack', 1], ['p', 'plan_heavy', 2], ['p', 'plan_explosives', 1], ['w', 'glauncher', 1], ['a', 'nvg', 1]]);
  RR('camp', [['w', 'sawedoff', 2], ['w', 'uzi', 2], ['w', 'tomahawk', 2], ['w', 'cleaver', 2], ['a', 'pillard_helm', 3], ['a', 'scrapmail', 2], ['a', 'bandana', 2], ['a', 'steelboots', 1], ['a', 'brass', 1]]);
  RR('legion', [['a', 'legion_helm', 3], ['a', 'legion_plate', 2], ['w', 'burst_rifle', 2], ['w', 'katana', 1], ['a', 'combatboots', 2], ['w', 'lmg', 1], ['a', 'tacgloves', 1], ['p', 'plan_explosives', 1]]);
  RR('radio', [['p', 'plan_energy', 1], ['a', 'nvg', 1], ['m', 'thermal', 1]]);
  RR('lab', [['w', 'taser', 2], ['w', 'plasma', 1], ['a', 'nvg', 1], ['a', 'respirator', 2], ['a', 'fireproof', 1], ['a', 'energy_gloves', 1], ['p', 'plan_energy', 3], ['a', 'generator', 1], ['m', 'thermal', 1], ['w', 'acidgun', 1], ['a', 'insulated', 1]]);
  RR('prison', [['w', 'baton', 3], ['a', 'riot_helm', 2], ['a', 'riot_armor', 2], ['w', 'combat_sg', 1], ['a', 'steelboots', 2], ['a', 'brass', 2], ['w', 'revolver', 1]]);
  RR('school', [['w', 'bat_wood', 2], ['a', 'sneakers', 2], ['a', 'daypack', 3], ['a', 'runners', 1], ['a', 'beanie', 1]]);
  RR('diner', [['w', 'cleaver', 2], ['a', 'sneakers', 1], ['a', 'cowboy', 1]]);
  RR('fire', [['w', 'firaxe', 3], ['a', 'fireproof', 2], ['a', 'fireboots', 2], ['a', 'insulated', 2], ['a', 'flametank', 1], ['a', 'welding', 1], ['a', 'hardhat', 1]]);
  RR('mine', [['w', 'sledge', 1], ['w', 'shovel', 2], ['a', 'hardhat', 3], ['a', 'steelboots', 2], ['a', 'workgloves', 2], ['w', 'nailgun', 1], ['p', 'plan_explosives', 1]]);
  RR('trailer', [['w', 'shovel', 1], ['a', 'poncho', 2], ['a', 'cowboy', 1], ['a', 'rainboots', 1], ['w', 'sawedoff', 1], ['w', 'spear', 1]]);
  RR('lighthouse', [['w', 'flaregun', 3], ['a', 'poncho', 2], ['a', 'rainboots', 2], ['a', 'cape', 1], ['w', 'compound', 1]]);
  RR('church', [['w', 'spear', 1], ['a', 'cape', 2], ['a', 'hood', 1]]);
  RR('graveyard', [['w', 'shovel', 3], ['a', 'hood', 2], ['a', 'cape', 2], ['w', 'tomahawk', 1]]);
  RR('hive', [['w', 'acidgun', 1], ['a', 'respirator', 1], ['a', 'fireproof', 1], ['w', 'spear', 1]]);
  RR('funfair', [['w', 'bat_wood', 1], ['a', 'runners', 2], ['a', 'cowboy', 2], ['w', 'flaregun', 1], ['a', 'cape', 1]]);
  RR('drivein', [['a', 'biker', 2], ['a', 'sneakers', 1], ['w', 'crowbar', 1], ['a', 'rainboots', 1]]);
  RR('powerplant', [['a', 'insulated', 2], ['a', 'fireproof', 1], ['a', 'energy_gloves', 1], ['p', 'plan_energy', 2], ['w', 'baton', 1], ['a', 'generator', 1], ['w', 'taser', 1]]);
  RR('castle', [['w', 'katana', 2], ['w', 'sledge', 1], ['w', 'spear', 2], ['a', 'legion_plate', 1], ['a', 'riot_armor', 1], ['a', 'ballistic', 1], ['w', 'compound', 2], ['a', 'brass', 2], ['a', 'furcoat', 1]]);
  RR('airdrop', [['w', 'antimat', 1], ['w', 'minigun', 1], ['w', 'rpg', 1], ['w', 'railgun', 1], ['w', 'plasma', 1], ['a', 'power_armor', 1], ['a', 'exo_helm', 1], ['a', 'stealth_suit', 1], ['a', 'jetboots', 1], ['w', 'plasma_blade', 1], ['m', 'thermal', 1], ['a', 'nvg', 1], ['w', 'lmg', 1], ['w', 'dmr', 1], ['p', 'plan_energy', 1], ['p', 'plan_heavy', 1]]);
  RR('crash', [['w', 'plasma', 1], ['a', 'exo_helm', 1], ['a', 'jetboots', 1], ['a', 'generator', 1]]);

  // ---------- commerce ----------
  TRADE_STOCK.push(['i', 'a45', 12, 24], ['i', 'a50', 3, 70], ['i', 'arrow', 12, 12], ['i', 'nail', 20, 8], ['i', 'cell', 4, 55], ['i', 'rocket', 1, 260],
    ['i', 'stimpack', 2, 80], ['i', 'surgical', 1, 150], ['i', 'ration', 4, 30], ['i', 'coffee', 4, 16], ['i', 'energybar', 6, 10], ['i', 'iodine', 3, 36],
    ['i', 'smoke', 2, 34], ['i', 'flash', 2, 40], ['i', 'trap', 1, 50], ['i', 'repairkit', 1, 90], ['i', 'wkit', 3, 60], ['i', 'steel', 3, 20], ['i', 'rubber', 4, 8], ['i', 'fiber', 3, 14],
    ['w', 'bat_wood', 0, 50], ['w', 'spear', 0, 80], ['w', 'bow', 0, 130], ['w', 'revolver', 0, 300], ['w', 'sawedoff', 0, 260], ['w', 'katana', 0, 360], ['w', 'taser', 0, 280], ['w', 'crowbar', 0, 50],
    ['a', 'beanie', 0, 22], ['a', 'poncho', 0, 50], ['a', 'sneakers', 0, 40], ['a', 'workgloves', 0, 36], ['a', 'daypack', 0, 80], ['a', 'hardhat', 0, 50], ['a', 'winterboots', 0, 120], ['a', 'tactical', 0, 340], ['a', 'riot_helm', 0, 300], ['a', 'parka', 0, 180],
    ['i', 'plan_explosives', 0, 260], ['i', 'plan_stealth', 0, 220], ['i', 'plan_heavy', 0, 400], ['i', 'plan_energy', 0, 440]);
  NOMAD_STOCK.push(['w', 'compound', 0, 320], ['w', 'dmr', 0, 840], ['w', 'combat_sg', 0, 760], ['w', 'p90', 0, 760], ['w', 'plasma', 0, 1200], ['a', 'ghillie', 0, 260], ['a', 'stealth_suit', 0, 680], ['a', 'nvg', 0, 520], ['a', 'jetboots', 0, 720], ['a', 'legion_helm', 0, 400], ['a', 'tacpack', 0, 280], ['a', 'fireproof', 0, 380], ['a', 'generator', 0, 760],
    ['i', 'beacon', 1, 220], ['i', 'drone', 1, 160], ['i', 'sentry', 1, 180], ['i', 'adrenaline', 2, 120], ['i', 'cluster', 2, 80], ['i', 'gas', 2, 56], ['i', 'incend', 2, 64], ['i', 'a50', 3, 120], ['i', 'cell', 6, 100], ['i', 'thermal', 1, 280], ['i', 'holo', 1, 110]);
})();
