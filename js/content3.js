'use strict';
// ===== Contenu additionnel (2) : débris à démonter, objets de valeur, nouveaux consommables, armes et équipements =====
(function () {
  const I = (id, n, i, t, w, v, o) => { ITEMS[id] = Object.assign({ n, i, t, w, v }, o || {}); };

  // ---------- débris (à démonter en ressources) ----------
  I('broken_radio', 'Radio cassée', '📻', 'junk', .6, 6, { scrap: { elec: 2, scrap: 2, metal: 1 } });
  I('old_phone', 'Vieux téléphone', '📱', 'junk', .15, 5, { scrap: { elec: 1, scrap: 1 } });
  I('toolbox', 'Boîte à outils', '🧰', 'junk', 1.2, 12, { scrap: { metal: 3, scrap: 4 } });
  I('car_battery', 'Batterie de voiture', '🔋', 'junk', 2, 14, { scrap: { elec: 3, chem: 1, metal: 1 } });
  I('tire', 'Pneu', '🛞', 'junk', 2, 6, { scrap: { rubber: 3 } });
  I('engine_part', 'Pièce moteur', '⚙️', 'junk', 1.5, 14, { scrap: { metal: 3, scrap: 3 } });
  I('wiring', 'Câblage électrique', '〰️', 'junk', .3, 5, { scrap: { elec: 2 } });
  I('pipe', 'Tuyau métallique', '🪈', 'junk', 1, 4, { scrap: { metal: 1, scrap: 2 } });
  I('circuit_board', 'Carte électronique', '🖥️', 'junk', .2, 10, { scrap: { circuit: 1, elec: 1 } });
  I('motor', 'Moteur électrique', '🔧', 'junk', 1.5, 16, { scrap: { elec: 3, metal: 2 } });
  I('lamp', 'Lampe de bureau', '💡', 'junk', .5, 4, { scrap: { elec: 1, scrap: 1 } });
  I('toaster', 'Grille-pain', '🍞', 'junk', 1, 3, { scrap: { scrap: 3, elec: 1 } });
  I('fan', 'Ventilateur', '🌀', 'junk', 1, 5, { scrap: { metal: 1, scrap: 2, elec: 1 } });
  // ---------- objets de valeur (à vendre) ----------
  I('watch', 'Montre en or', '⌚', 'treasure', .1, 45);
  I('ring', 'Bague en or', '💍', 'treasure', .05, 60);
  I('goldbar', 'Lingot d\'or', '🥇', 'treasure', 1, 220);
  I('antique', 'Vase ancien', '🏺', 'treasure', 1, 90);
  I('vinyl', 'Disque vinyle', '💿', 'treasure', .2, 25);
  I('jewelry', 'Collier de perles', '📿', 'treasure', .1, 70);
  I('medal', 'Médaille militaire', '🎖️', 'treasure', .1, 55);
  I('painting', 'Petit tableau', '🖼️', 'treasure', 1, 110);
  I('gemcase', 'Écrin de pierres précieuses', '💎', 'treasure', .3, 140);
  // ---------- consommables ----------
  I('chips', 'Chips', '🥔', 'food', .1, 4, { use: { hun: 14 } });
  I('chocolate', 'Chocolat', '🍫', 'food', .1, 7, { use: { hun: 12, stam: 20, hp: 2 } });
  I('canned_soup', 'Soupe en conserve', '🍜', 'food', .4, 10, { use: { hun: 36, thi: 12, temp: 8 } });
  I('energy_drink', 'Boisson énergisante', '🥤', 'drink', .3, 12, { use: { thi: 14, stam: 70, buff: { spd: .12, t: 20, n: 'Énergie' } } });
  I('multivit', 'Multivitamines', '💊', 'med', .05, 24, { use: { hp: 5, buff: { regen: 1.6, t: 60, n: 'Vitalité' } } });
  I('salve', 'Baume cicatrisant', '🧴', 'med', .15, 18, { use: { hp: 20, cure: ['bleed'] } });
  I('bandage_adv', 'Pansement hémostatique', '🩹', 'med', .1, 22, { use: { hp: 30, cure: ['bleed'] } });
  I('camo_paint', 'Peinture de camouflage', '🎨', 'med', .2, 30, { use: { buff: { stealth: .35, t: 150, n: 'Camouflage' } } });
  I('hand_warmer', 'Chaufferette', '♨️', 'med', .1, 14, { use: { temp: 15, buff: { warm: 18, t: 120, n: 'Chaleur' } } });
  I('glow', 'Bâton lumineux', '🟢', 'gadget', .1, 10, { gad: 'glow' });
  GADGET_ORDER.push('glow');
  AMMO_PER.stone = 1;

  // ---------- armes ----------
  const M = (id, n, i, o) => { WEAPONS[id] = Object.assign({ n, i, melee: 1, tree: .4, rock: .2, noise: 80, kb: 100, arc: 1.6 }, o); };
  M('knuckles', 'Poing américain', '👊', { dmg: 12, rate: .2, range: 34, arc: 1.2, kb: 60, noise: 40, v: 40 });
  M('whip', 'Fouet', '➰', { dmg: 20, rate: .45, range: 104, arc: .5, kb: 40, noise: 60, bleed: 1, v: 60 });
  M('pitchfork', 'Fourche', '🔱', { dmg: 30, rate: .55, range: 80, arc: .8, kb: 120, tree: .4, v: 30 });
  M('scythe', 'Faux', '🌾', { dmg: 46, rate: .8, range: 74, arc: 2.8, kb: 160, tree: 1.5, bleed: 1, v: 80 });
  const G_ = (id, n, i, o) => { WEAPONS[id] = Object.assign({ n, i, mods: ['sight', 'muzzle', 'mag', 'laser', 'grip', 'barrel', 'ammo'], noise: 700, spd: 1000 }, o); };
  G_('slingshot', 'Lance-pierre', '🪃', { dmg: 14, rate: .45, range: 320, spr: .05, mag: 1, ammo: 'stone', rel: .4, noise: 30, spd: 700, v: 15, mods: ['sight'], len: 12 });
  G_('speargun', 'Fusil harpon', '🔱', { dmg: 55, rate: .8, range: 380, spr: .02, mag: 1, ammo: 'bolt', rel: 1.2, pierce: 1, noise: 60, spd: 1000, v: 110, mods: ['sight', 'laser'], len: 22 });
  G_('ak47', 'AK-47', '🔫', { dmg: 30, rate: .1, range: 520, spr: .09, mag: 30, ammo: 'a762', rel: 2.2, auto: 1, noise: 950, spd: 1200, v: 360, len: 28 });
  G_('carbine', 'Carabine semi-auto', '🔫', { dmg: 36, rate: .2, range: 640, spr: .035, mag: 15, ammo: 'a556', rel: 2, noise: 880, spd: 1300, v: 280, len: 28 });
  G_('blunderbuss', 'Tromblon', '🔫', { dmg: 16, pellets: 14, rate: 1.3, range: 160, spr: .5, mag: 1, ammo: 'shell', rel: 2.2, noise: 1000, spd: 800, v: 90, mods: ['sight'], len: 22 });
  G_('repeater', 'Arbalète à répétition', '🏹', { dmg: 36, rate: .25, range: 450, spr: .03, mag: 10, ammo: 'bolt', rel: 2, noise: 70, spd: 1000, v: 200, mods: ['sight', 'laser', 'mag'], len: 22 });

  // ---------- équipements ----------
  const A = (id, n, i, slot, o) => { ARMOR[id] = Object.assign({ n, i, slot, ar: 0, warm: 0, v: 20 }, o); };
  A('bike_helmet', 'Casque de vélo', '🚴', 'head', { ar: 2, warm: 0, col: '#4ab0d0', v: 22 });
  A('ushanka', 'Chapka', '🧢', 'head', { ar: 1, warm: 14, col: '#7a6a5a', v: 35 });
  A('sunglasses', 'Lunettes de soleil', '😎', 'head', { ar: 0, stealth: .06, col: '#1a1a22', v: 20 });
  A('trenchcoat', 'Trench-coat', '🧥', 'body', { ar: 3, warm: 16, stealth: .05, col: '#7a6a4a', v: 70 });
  A('puffer', 'Doudoune', '🧥', 'body', { ar: 2, warm: 28, wet: .1, col: '#e06a3a', v: 85 });
  A('wetsuit', 'Combinaison de plongée', '🤿', 'body', { ar: 1, warm: 10, wet: .85, col: '#2a2e3a', v: 80 });
  A('chainmail', 'Cotte de mailles', '⛓️', 'body', { ar: 8, warm: 3, spd: -.03, col: '#8a8e96', v: 150 });
  A('waders', 'Cuissardes', '🥾', 'feet', { ar: 1, warm: 3, wet: .9, spd: -.02, col: '#6a7a4a', v: 40 });
  A('leather_gloves', 'Gants en cuir', '🧤', 'hands', { ar: 1, warm: 3, melee: .04, col: '#5a3a22', v: 30 });
  A('quiver', 'Carquois', '🏹', 'back', { ar: 0, carry: 2, reload: .06, col: '#8a5a2a', v: 40 });
  A('bedroll', 'Sac de couchage', '🛏️', 'back', { ar: 0, warm: 8, carry: 4, col: '#4a6a8a', v: 45 });

  // ---------- recettes ----------
  const rc = (cat, name, out, cost, st, plan) => RECIPES.push(R(cat, name, out, cost, st, plan));
  rc('Soins', 'Baume cicatrisant', 'i:salve:1', { herb: 3, cloth: 1 }, 'campfire');
  rc('Soins', 'Pansement hémostatique', 'i:bandage_adv:1', { bandage: 2, chem: 1 }, 'workbench', 'plan_med');
  rc('Soins', 'Multivitamines (x2)', 'i:multivit:2', { herb: 3, chem: 1, berries: 2 }, 'workbench', 'plan_med');
  rc('Soins', 'Peinture de camouflage', 'i:camo_paint:1', { herb: 3, chem: 1, cloth: 1 }, 'workbench', 'plan_stealth');
  rc('Soins', 'Chaufferette (x2)', 'i:hand_warmer:2', { chem: 1, cloth: 2 }, 'workbench');
  rc('Cuisine', 'Soupe en conserve', 'i:canned_soup:1', { veg: 1, bottle_clean: 1 }, 'campfire');
  rc('Gadgets', 'Bâtons lumineux (x3)', 'i:glow:3', { chem: 1, scrap: 1 }, 'workbench');
  rc('Armes', 'Lance-pierre', 'w:slingshot', { wood: 3, cloth: 2, rubber: 1 });
  rc('Armes', 'Fourche', 'w:pitchfork', { wood: 3, metal: 1, scrap: 2 });
  rc('Armes', 'Faux', 'w:scythe', { wood: 3, metal: 3, scrap: 2 }, 'workbench');
  rc('Armes', 'Fouet', 'w:whip', { hide: 4, cloth: 2 }, 'workbench');
  rc('Armes', 'Poing américain', 'w:knuckles', { metal: 2, scrap: 1 }, 'workbench');
  rc('Armes', 'Fusil harpon', 'w:speargun', { metal: 6, scrap: 6, rubber: 1 }, 'workbench', 'plan_guns');
  rc('Armes', 'Arbalète à répétition', 'w:repeater', { metal: 8, scrap: 8, wood: 4, elec: 1 }, 'workbench', 'plan_guns');
  rc('Armes', 'Tromblon', 'w:blunderbuss', { metal: 4, scrap: 4, wood: 3 }, 'workbench', 'plan_guns');
  rc('Armes', 'Carabine semi-auto', 'w:carbine', { steel: 2, metal: 8, wood: 4, scrap: 8 }, 'workbench', 'plan_heavy');
  rc('Armes', 'AK-47', 'w:ak47', { steel: 3, metal: 10, wood: 4, scrap: 10 }, 'workbench', 'plan_heavy');
  rc('Armure', 'Casque de vélo', 'a:bike_helmet', { rubber: 1, scrap: 2, cloth: 1 });
  rc('Armure', 'Chapka', 'a:ushanka', { hide: 3, cloth: 3 });
  rc('Armure', 'Trench-coat', 'a:trenchcoat', { hide: 6, cloth: 8 }, 'workbench');
  rc('Armure', 'Doudoune', 'a:puffer', { cloth: 16, hide: 2, rubber: 1 }, 'workbench');
  rc('Armure', 'Combinaison de plongée', 'a:wetsuit', { rubber: 6, cloth: 6 }, 'workbench');
  rc('Armure', 'Cotte de mailles', 'a:chainmail', { steel: 4, metal: 8, scrap: 12 }, 'workbench', 'plan_armor');
  rc('Armure', 'Cuissardes', 'a:waders', { rubber: 5, cloth: 2 });
  rc('Armure', 'Gants en cuir', 'a:leather_gloves', { hide: 3, cloth: 1 });
  rc('Armure', 'Carquois', 'a:quiver', { hide: 3, wood: 1, cloth: 2 });
  rc('Armure', 'Sac de couchage', 'a:bedroll', { cloth: 10, hide: 2 }, 'workbench');

  // ---------- butin ----------
  const L = (key, rows) => { LOOT[key] = (LOOT[key] || []).concat(rows); };
  const RR = (key, rows) => { RARE_LOOT[key] = (RARE_LOOT[key] || []).concat(rows); };
  L('house', [['lamp', 2, 1, 1], ['toaster', 1, 1, 1], ['old_phone', 2, 1, 1], ['fan', 1, 1, 1], ['chips', 2, 1, 2], ['chocolate', 1, 1, 1], ['watch', 1, 1, 1], ['ring', 1, 1, 1], ['vinyl', 1, 1, 1], ['painting', 1, 1, 1], ['wiring', 2, 1, 2], ['salve', 1, 1, 1]]);
  L('cabin', [['pipe', 1, 1, 1], ['canned_soup', 2, 1, 1], ['hand_warmer', 1, 1, 1], ['chips', 1, 1, 2]]);
  L('gas', [['car_battery', 3, 1, 1], ['tire', 3, 1, 1], ['engine_part', 3, 1, 1], ['toolbox', 2, 1, 1], ['pipe', 2, 1, 2], ['wiring', 2, 1, 2], ['energy_drink', 2, 1, 2], ['chips', 3, 1, 3]]);
  L('farm', [['tire', 1, 1, 1], ['pipe', 1, 1, 2], ['motor', 1, 1, 1], ['canned_soup', 2, 1, 2]]);
  L('market', [['chips', 4, 1, 4], ['chocolate', 3, 1, 3], ['canned_soup', 3, 1, 3], ['energy_drink', 3, 1, 3], ['lamp', 1, 1, 1], ['toaster', 1, 1, 1], ['fan', 1, 1, 1], ['multivit', 1, 1, 1], ['hand_warmer', 1, 1, 2]]);
  L('police', [['broken_radio', 2, 1, 1], ['old_phone', 1, 1, 1], ['bandage_adv', 2, 1, 1], ['medal', 1, 1, 1]]);
  L('hospital', [['bandage_adv', 3, 1, 2], ['salve', 2, 1, 2], ['multivit', 2, 1, 2], ['circuit_board', 1, 1, 1], ['motor', 1, 1, 1]]);
  L('warehouse', [['toolbox', 3, 1, 2], ['motor', 2, 1, 1], ['engine_part', 2, 1, 2], ['car_battery', 2, 1, 1], ['pipe', 3, 1, 3], ['wiring', 3, 1, 3], ['tire', 2, 1, 2], ['fan', 1, 1, 1]]);
  L('bunker', [['broken_radio', 2, 1, 1], ['circuit_board', 2, 1, 1], ['medal', 2, 1, 1], ['bandage_adv', 2, 1, 2], ['camo_paint', 1, 1, 1], ['canned_soup', 3, 1, 3]]);
  L('camp', [['car_battery', 1, 1, 1], ['pipe', 2, 1, 2], ['watch', 2, 1, 1], ['ring', 2, 1, 1], ['jewelry', 1, 1, 1], ['goldbar', 1, 1, 1]]);
  L('legion', [['medal', 3, 1, 2], ['goldbar', 1, 1, 1], ['camo_paint', 2, 1, 1], ['bandage_adv', 2, 1, 2]]);
  L('radio', [['broken_radio', 4, 1, 2], ['circuit_board', 3, 1, 2], ['wiring', 3, 1, 3], ['car_battery', 2, 1, 1]]);
  L('lab', [['circuit_board', 3, 1, 2], ['motor', 1, 1, 1], ['gemcase', 1, 1, 1]]);
  L('prison', [['pipe', 2, 1, 2], ['watch', 1, 1, 1], ['toolbox', 1, 1, 1]]);
  L('school', [['lamp', 2, 1, 1], ['old_phone', 2, 1, 1], ['chips', 3, 1, 3], ['chocolate', 2, 1, 2], ['circuit_board', 1, 1, 1]]);
  L('diner', [['toaster', 2, 1, 1], ['canned_soup', 3, 1, 3], ['chips', 3, 1, 3], ['fan', 1, 1, 1], ['vinyl', 1, 1, 1]]);
  L('fire', [['pipe', 3, 1, 3], ['toolbox', 2, 1, 1], ['motor', 1, 1, 1]]);
  L('mine', [['engine_part', 2, 1, 1], ['pipe', 3, 1, 3], ['toolbox', 2, 1, 1], ['gemcase', 1, 1, 1], ['goldbar', 1, 1, 1]]);
  L('trailer', [['lamp', 1, 1, 1], ['toaster', 2, 1, 1], ['old_phone', 2, 1, 1], ['watch', 1, 1, 1], ['chips', 2, 1, 2]]);
  L('church', [['antique', 2, 1, 1], ['jewelry', 2, 1, 1], ['vinyl', 1, 1, 1], ['ring', 1, 1, 1]]);
  L('graveyard', [['ring', 2, 1, 1], ['watch', 2, 1, 1], ['jewelry', 1, 1, 1], ['antique', 1, 1, 1]]);
  L('castle', [['goldbar', 2, 1, 1], ['antique', 2, 1, 1], ['gemcase', 2, 1, 1], ['painting', 2, 1, 1], ['jewelry', 2, 1, 1]]);
  L('powerplant', [['motor', 3, 1, 2], ['wiring', 4, 2, 4], ['car_battery', 3, 1, 2], ['circuit_board', 2, 1, 2]]);
  L('drivein', [['car_battery', 2, 1, 1], ['tire', 3, 1, 2], ['engine_part', 2, 1, 1], ['vinyl', 2, 1, 1]]);
  L('funfair', [['motor', 2, 1, 1], ['lamp', 2, 1, 1], ['chips', 3, 1, 3], ['chocolate', 2, 1, 2], ['energy_drink', 2, 1, 2]]);
  L('airdrop', [['goldbar', 1, 1, 1], ['gemcase', 1, 1, 1], ['circuit_board', 2, 1, 2], ['multivit', 2, 1, 2], ['camo_paint', 1, 1, 1]]);
  RR('house', [['w', 'knuckles', 1], ['w', 'pitchfork', 1], ['w', 'slingshot', 2], ['a', 'bike_helmet', 2], ['a', 'leather_gloves', 2], ['a', 'trenchcoat', 1], ['a', 'ushanka', 1], ['a', 'bedroll', 1], ['a', 'sunglasses', 2]]);
  RR('cabin', [['w', 'pitchfork', 1], ['w', 'scythe', 1], ['w', 'whip', 1], ['a', 'ushanka', 2], ['a', 'puffer', 1], ['a', 'quiver', 2], ['a', 'bedroll', 2], ['a', 'waders', 1], ['w', 'speargun', 1], ['w', 'repeater', 1]]);
  RR('farm', [['w', 'scythe', 2], ['w', 'pitchfork', 2], ['a', 'waders', 2], ['a', 'leather_gloves', 2], ['w', 'blunderbuss', 1]]);
  RR('gas', [['a', 'bike_helmet', 1], ['a', 'leather_gloves', 1], ['w', 'knuckles', 1], ['a', 'trenchcoat', 1]]);
  RR('market', [['a', 'puffer', 1], ['a', 'sunglasses', 2], ['a', 'bike_helmet', 1], ['a', 'wetsuit', 1], ['a', 'bedroll', 1]]);
  RR('police', [['w', 'carbine', 1], ['w', 'whip', 1], ['a', 'leather_gloves', 1], ['a', 'trenchcoat', 1]]);
  RR('bunker', [['w', 'ak47', 2], ['w', 'carbine', 2], ['a', 'chainmail', 1]]);
  RR('camp', [['w', 'ak47', 1], ['w', 'blunderbuss', 2], ['w', 'whip', 1], ['w', 'knuckles', 2], ['a', 'leather_gloves', 1], ['a', 'trenchcoat', 1]]);
  RR('legion', [['w', 'ak47', 1], ['w', 'carbine', 1], ['a', 'chainmail', 1]]);
  RR('castle', [['a', 'chainmail', 2], ['w', 'scythe', 1], ['w', 'whip', 1], ['a', 'ushanka', 1]]);
  RR('lighthouse', [['a', 'wetsuit', 2], ['a', 'waders', 2], ['w', 'speargun', 2]]);
  RR('trailer', [['w', 'pitchfork', 1], ['w', 'knuckles', 1], ['a', 'puffer', 1], ['a', 'bedroll', 1]]);
  RR('airdrop', [['w', 'ak47', 1], ['w', 'carbine', 1], ['w', 'repeater', 1]]);

  TRADE_STOCK.push(['i', 'chips', 8, 8], ['i', 'chocolate', 6, 14], ['i', 'canned_soup', 4, 20], ['i', 'energy_drink', 3, 24], ['i', 'salve', 3, 34], ['i', 'bandage_adv', 2, 42], ['i', 'multivit', 2, 48], ['i', 'hand_warmer', 4, 26], ['i', 'glow', 5, 18],
    ['w', 'slingshot', 0, 36], ['w', 'pitchfork', 0, 70], ['w', 'scythe', 0, 190], ['w', 'whip', 0, 140], ['w', 'carbine', 0, 560], ['w', 'ak47', 0, 720], ['a', 'bike_helmet', 0, 50], ['a', 'ushanka', 0, 80], ['a', 'leather_gloves', 0, 64], ['a', 'waders', 0, 90], ['a', 'puffer', 0, 190], ['a', 'bedroll', 0, 100], ['a', 'quiver', 0, 90]);
  NOMAD_STOCK.push(['i', 'camo_paint', 3, 60], ['i', 'circuit_board', 2, 40], ['w', 'speargun', 0, 240], ['w', 'repeater', 0, 420], ['a', 'chainmail', 0, 320], ['a', 'trenchcoat', 0, 150], ['a', 'wetsuit', 0, 170]);
})();
