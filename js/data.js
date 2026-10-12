'use strict';
// ===== Données statiques du jeu =====
const ITEMS = {
  // Ressources
  wood:   { n: 'Bois', i: '🪵', w: .3, v: 1, t: 'res' },
  stone:  { n: 'Pierre', i: '🪨', w: .4, v: 1, t: 'res' },
  scrap:  { n: 'Ferraille', i: '⚙️', w: .2, v: 2, t: 'res' },
  metal:  { n: 'Métal', i: '🔩', w: .5, v: 5, t: 'res' },
  cloth:  { n: 'Tissu', i: '🧵', w: .1, v: 2, t: 'res' },
  hide:   { n: 'Peau', i: '🐾', w: .3, v: 4, t: 'res' },
  herb:   { n: 'Herbes', i: '🌿', w: .05, v: 3, t: 'res' },
  chem:   { n: 'Produits chimiques', i: '🧪', w: .15, v: 6, t: 'res' },
  powder: { n: 'Poudre', i: '💥', w: .05, v: 3, t: 'res' },
  fuel:   { n: 'Carburant', i: '⛽', w: .4, v: 6, t: 'res' },
  elec:   { n: 'Électronique', i: '🔌', w: .2, v: 8, t: 'res' },
  caps:   { n: 'Capsules', i: '🪙', w: 0, v: 1, t: 'res' },
  seed:   { n: 'Graines', i: '🌱', w: .02, v: 3, t: 'res' },
  medsupply: { n: 'Fournitures médicales', i: '📦', w: .3, v: 10, t: 'res' },
  // Nourriture / boisson
  rawmeat: { n: 'Viande crue', i: '🥩', w: .3, v: 4, t: 'food', use: { hun: 14, sick: .4 } },
  cooked:  { n: 'Viande cuite', i: '🍖', w: .3, v: 10, t: 'food', use: { hun: 38, hp: 4 } },
  berries: { n: 'Baies', i: '🫐', w: .05, v: 2, t: 'food', use: { hun: 8, thi: 5 } },
  veg:     { n: 'Légumes', i: '🥕', w: .1, v: 4, t: 'food', use: { hun: 20 } },
  canned:  { n: 'Conserve', i: '🥫', w: .3, v: 8, t: 'food', use: { hun: 42 } },
  stew:    { n: 'Ragoût', i: '🍲', w: .4, v: 18, t: 'food', use: { hun: 55, thi: 15, hp: 12 } },
  bottle_dirty: { n: 'Eau non potable', i: '🥤', w: .4, v: 1, t: 'drink', use: { thi: 30, sick: .35 } },
  bottle_clean: { n: 'Eau propre', i: '🚰', w: .4, v: 6, t: 'drink', use: { thi: 55 } },
  soda:    { n: 'Soda', i: '🧃', w: .3, v: 7, t: 'drink', use: { thi: 28, hun: 6, stam: 40 } },
  // Soins
  bandage: { n: 'Bandage', i: '🩹', w: .1, v: 8, t: 'med', use: { hp: 15, cure: ['bleed'] } },
  painkiller: { n: 'Antidouleur', i: '💊', w: .05, v: 12, t: 'med', use: { hp: 30 } },
  antibio: { n: 'Antibiotiques', i: '💉', w: .05, v: 25, t: 'med', use: { hp: 10, cure: ['infect', 'sick'] } },
  medkit:  { n: 'Trousse de soins', i: '🧰', w: .5, v: 40, t: 'med', use: { hp: 70, cure: ['bleed'] } },
  serum:   { n: 'Sérum d\'apprivoisement', i: '🧬', w: .1, v: 50, t: 'bait' },
  // Munitions
  a9:    { n: 'Balles 9mm', i: '🔸', w: .02, v: 1, t: 'ammo' },
  shell: { n: 'Cartouches', i: '🟥', w: .04, v: 2, t: 'ammo' },
  a556:  { n: 'Balles 5.56', i: '🔶', w: .03, v: 2, t: 'ammo' },
  a762:  { n: 'Balles 7.62', i: '🟧', w: .05, v: 3, t: 'ammo' },
  bolt:  { n: 'Carreaux', i: '➳', w: .04, v: 2, t: 'ammo' },
  // Gadgets
  grenade: { n: 'Grenade', i: '💣', w: .3, v: 20, t: 'gadget', gad: 'grenade' },
  molotov: { n: 'Cocktail Molotov', i: '🍾', w: .4, v: 14, t: 'gadget', gad: 'molotov' },
  mine:    { n: 'Mine', i: '🪤', w: .5, v: 25, t: 'gadget', gad: 'mine' },
  flare:   { n: 'Fusée éclairante', i: '🕯️', w: .2, v: 8, t: 'gadget', gad: 'flare' },
  cracker: { n: 'Pétard leurre', i: '🧨', w: .1, v: 8, t: 'gadget', gad: 'cracker' },
  // Modules d'armes
  scope:  { n: 'Lunette', i: '🔭', w: .3, v: 40, t: 'mod', slot: 'sight' },
  reddot: { n: 'Viseur point rouge', i: '🔴', w: .2, v: 30, t: 'mod', slot: 'sight' },
  suppr:  { n: 'Silencieux', i: '🤫', w: .3, v: 35, t: 'mod', slot: 'muzzle' },
  magext: { n: 'Chargeur étendu', i: '🧱', w: .2, v: 30, t: 'mod', slot: 'mag' },
  laser:  { n: 'Pointeur laser', i: '🔺', w: .1, v: 30, t: 'mod', slot: 'laser' },
  // Plans
  plan_guns:  { n: 'Plan : armes à feu', i: '📜', w: 0, v: 80, t: 'plan', plan: 'plan_guns' },
  plan_med:   { n: 'Plan : médecine', i: '📜', w: 0, v: 70, t: 'plan', plan: 'plan_med' },
  plan_armor: { n: 'Plan : armures lourdes', i: '📜', w: 0, v: 100, t: 'plan', plan: 'plan_armor' },
  plan_optics:{ n: 'Plan : optiques & modules', i: '📜', w: 0, v: 90, t: 'plan', plan: 'plan_optics' },
  plan_fire:  { n: 'Plan : lance-flammes', i: '📜', w: 0, v: 160, t: 'plan', plan: 'plan_fire' },
  plan_serum: { n: 'Plan : sérum', i: '📜', w: 0, v: 120, t: 'plan', plan: 'plan_serum' },
  plan_turret:{ n: 'Plan : tourelle', i: '📜', w: 0, v: 120, t: 'plan', plan: 'plan_turret' },
  plan_fort:  { n: 'Plan : fortifications', i: '📜', w: 0, v: 90, t: 'plan', plan: 'plan_fort' },
};
const PLAN_NAMES = {
  plan_guns: 'armes à feu', plan_med: 'médecine', plan_armor: 'armures lourdes', plan_optics: 'optiques & modules',
  plan_fire: 'lance-flammes', plan_serum: 'sérum', plan_turret: 'tourelles', plan_fort: 'fortifications',
};
const AMMO_PER = { fuel: 20 };

// ===== Armes =====
// melee: dmg, rate (s), range(px), arc (rad), kb ; guns: dmg, rate, range, spr (rad), mag, ammo, rel (s), auto, noise (px), spd, pellets, pierce
const WEAPONS = {
  knife:   { n: 'Couteau', i: '🔪', melee: 1, dmg: 15, rate: .26, range: 46, arc: 1.3, kb: 40, noise: 50, tree: .4, rock: .2, v: 15 },
  club:    { n: 'Gourdin', i: '🏏', melee: 1, dmg: 22, rate: .45, range: 54, arc: 1.7, kb: 140, noise: 80, tree: .8, rock: .3, v: 10 },
  bat:     { n: 'Batte à clous', i: '🏑', melee: 1, dmg: 34, rate: .55, range: 58, arc: 1.8, kb: 180, noise: 90, tree: .8, rock: .3, v: 30 },
  axe:     { n: 'Hache', i: '🪓', melee: 1, dmg: 36, rate: .6, range: 54, arc: 1.6, kb: 120, noise: 100, tree: 3, rock: .4, v: 35 },
  pickaxe: { n: 'Pioche', i: '⛏️', melee: 1, dmg: 26, rate: .6, range: 54, arc: 1.5, kb: 90, noise: 100, tree: .6, rock: 3, v: 35 },
  machete: { n: 'Machette', i: '🗡️', melee: 1, dmg: 42, rate: .36, range: 62, arc: 2, kb: 100, noise: 70, tree: 1.2, rock: .3, v: 60 },
  pistol:  { n: 'Pistolet 9mm', i: '🔫', dmg: 21, rate: .26, range: 440, spr: .05, mag: 12, ammo: 'a9', rel: 1.2, noise: 620, spd: 950, v: 80, mods: ['sight', 'muzzle', 'mag', 'laser'] },
  smg:     { n: 'Pistolet-mitrailleur', i: '🔫', dmg: 14, rate: .075, range: 400, spr: .13, mag: 30, ammo: 'a9', rel: 1.7, auto: 1, noise: 700, spd: 950, v: 180, mods: ['sight', 'muzzle', 'mag', 'laser'] },
  shotgun: { n: 'Fusil à pompe', i: '🔫', dmg: 12, pellets: 8, rate: .85, range: 270, spr: .3, mag: 6, ammo: 'shell', rel: 2.1, noise: 950, spd: 850, v: 150, mods: ['sight', 'muzzle', 'mag', 'laser'] },
  hunter:  { n: 'Fusil de chasse', i: '🎯', dmg: 95, rate: 1.1, range: 950, spr: .012, mag: 5, ammo: 'a762', rel: 2.4, noise: 1000, spd: 1500, pierce: 1, scoped: 1, v: 260, mods: ['sight', 'muzzle', 'mag', 'laser'] },
  ar:      { n: 'Fusil d\'assaut', i: '🔫', dmg: 24, rate: .095, range: 580, spr: .07, mag: 30, ammo: 'a556', rel: 2, auto: 1, noise: 900, spd: 1200, v: 320, mods: ['sight', 'muzzle', 'mag', 'laser'] },
  crossbow:{ n: 'Arbalète', i: '🏹', dmg: 62, rate: .9, range: 540, spr: .02, mag: 1, ammo: 'bolt', rel: 1.3, noise: 70, spd: 1000, pierce: 1, v: 90, mods: ['sight', 'laser'] },
  flamer:  { n: 'Lance-flammes', i: '🔥', dmg: 6, rate: .05, range: 175, spr: .22, mag: 60, ammo: 'fuel', rel: 2.6, auto: 1, noise: 450, spd: 380, flame: 1, v: 300, mods: [] },
};
const MOD_EFFECT = {
  scope:  { n: 'Lunette', range: 1.35, spr: .6, zoom: 1 },
  reddot: { n: 'Point rouge', spr: .72 },
  suppr:  { n: 'Silencieux', noise: .2, dmg: .9 },
  magext: { n: 'Chargeur étendu', mag: 1.5 },
  laser:  { n: 'Laser', spr: .85, laser: 1 },
};

// ===== Armures =====
const ARMOR = {
  cap:        { n: 'Casquette renforcée', i: '🧢', slot: 'head', ar: 1, v: 10 },
  helmet_moto:{ n: 'Casque de moto', i: '⛑️', slot: 'head', ar: 3, v: 40 },
  helmet_mil: { n: 'Casque militaire', i: '🪖', slot: 'head', ar: 5, v: 100 },
  jacket:     { n: 'Veste en tissu', i: '🧥', slot: 'body', ar: 2, v: 15 },
  leather:    { n: 'Veste en cuir', i: '🥼', slot: 'body', ar: 4, v: 45 },
  kevlar:     { n: 'Gilet Kevlar', i: '🦺', slot: 'body', ar: 8, v: 150 },
  plate:      { n: 'Plaques militaires', i: '🛡️', slot: 'body', ar: 12, v: 280 },
  shoes:      { n: 'Chaussures de rando', i: '👟', slot: 'feet', ar: 1, spd: .04, v: 20 },
  rangers:    { n: 'Rangers', i: '🥾', slot: 'feet', ar: 3, spd: .06, v: 70 },
};

// ===== Structures constructibles =====
// solid: 0 non, 3 solide, 4 porte
const STRUCTS = {
  wall_wood:  { n: 'Mur en bois', i: '🟫', hp: 140, cost: { wood: 4 }, solid: 3 },
  wall_stone: { n: 'Mur en pierre', i: '⬜', hp: 360, cost: { stone: 5 }, solid: 3 },
  wall_metal: { n: 'Mur en métal', i: '⬛', hp: 800, cost: { metal: 4, scrap: 2 }, solid: 3, plan: 'plan_fort' },
  door:       { n: 'Porte', i: '🚪', hp: 200, cost: { wood: 6, scrap: 2 }, solid: 4 },
  barricade:  { n: 'Barricade', i: '🚧', hp: 90, cost: { wood: 2, scrap: 1 }, solid: 3 },
  spikes:     { n: 'Pièges à pointes', i: '🔻', hp: 60, cost: { wood: 3, scrap: 2 }, solid: 0 },
  workbench:  { n: 'Établi', i: '🛠️', hp: 200, cost: { wood: 10, scrap: 6 }, solid: 3, uniq: 1 },
  campfire:   { n: 'Feu de camp', i: '🔥', hp: 60, cost: { wood: 5, stone: 3 }, solid: 0 },
  chest:      { n: 'Coffre', i: '🧳', hp: 150, cost: { wood: 8 }, solid: 3 },
  bed:        { n: 'Lit', i: '🛏️', hp: 100, cost: { cloth: 6, wood: 4 }, solid: 3 },
  lamp:       { n: 'Lampadaire', i: '💡', hp: 40, cost: { wood: 2, cloth: 1, fuel: 1 }, solid: 0 },
  plot:       { n: 'Parcelle de culture', i: '🌱', hp: 40, cost: { wood: 4, stone: 1 }, solid: 0 },
  barrel:     { n: 'Collecteur de pluie', i: '🛢️', hp: 80, cost: { wood: 6, scrap: 2 }, solid: 3 },
  turret:     { n: 'Tourelle auto', i: '🔫', hp: 220, cost: { metal: 8, scrap: 8, elec: 2 }, solid: 3, plan: 'plan_turret' },
};

// ===== Recettes =====
// out: 'i:id:n' | 'w:id' | 'a:id' | 'p:lvl'  ; st: null | 'campfire' | 'workbench'
function R(cat, name, out, cost, st, plan) { return { cat, name, out, cost, st: st || null, plan: plan || null }; }
const RECIPES = [
  R('Base', 'Bandage', 'i:bandage:1', { cloth: 2 }),
  R('Base', 'Couteau', 'w:knife', { scrap: 2, wood: 1 }),
  R('Base', 'Gourdin', 'w:club', { wood: 3 }),
  R('Base', 'Hache', 'w:axe', { wood: 2, stone: 3 }),
  R('Base', 'Pioche', 'w:pickaxe', { wood: 2, stone: 3, scrap: 1 }),
  R('Base', 'Graines (x3)', 'i:seed:3', { berries: 3 }),
  R('Base', 'Sac à dos léger', 'p:1', { cloth: 8, hide: 2 }),
  R('Base', 'Sac à dos renforcé', 'p:2', { cloth: 14, hide: 6, scrap: 6 }, 'workbench'),
  R('Base', 'Sac tactique', 'p:3', { cloth: 22, hide: 10, metal: 4, elec: 2 }, 'workbench'),
  R('Cuisine', 'Viande cuite', 'i:cooked:1', { rawmeat: 1 }, 'campfire'),
  R('Cuisine', 'Eau propre (bouillie)', 'i:bottle_clean:1', { bottle_dirty: 1 }, 'campfire'),
  R('Cuisine', 'Ragoût', 'i:stew:1', { rawmeat: 1, veg: 1, bottle_clean: 1 }, 'campfire'),
  R('Soins', 'Antidouleur', 'i:painkiller:2', { herb: 2, chem: 1 }, 'workbench'),
  R('Soins', 'Antibiotiques', 'i:antibio:1', { herb: 3, chem: 2 }, 'workbench', 'plan_med'),
  R('Soins', 'Trousse de soins', 'i:medkit:1', { bandage: 3, herb: 2, chem: 1 }, 'workbench', 'plan_med'),
  R('Soins', 'Sérum d\'apprivoisement', 'i:serum:2', { herb: 4, chem: 3, rawmeat: 1 }, 'workbench', 'plan_serum'),
  R('Munitions', 'Poudre (x3)', 'i:powder:3', { chem: 1, scrap: 1 }, 'workbench'),
  R('Munitions', 'Balles 9mm (x12)', 'i:a9:12', { scrap: 2, powder: 1 }, 'workbench'),
  R('Munitions', 'Cartouches (x4)', 'i:shell:4', { scrap: 2, powder: 2 }, 'workbench'),
  R('Munitions', 'Balles 5.56 (x10)', 'i:a556:10', { scrap: 3, powder: 2 }, 'workbench', 'plan_guns'),
  R('Munitions', 'Balles 7.62 (x6)', 'i:a762:6', { scrap: 3, powder: 2 }, 'workbench', 'plan_guns'),
  R('Munitions', 'Carreaux (x5)', 'i:bolt:5', { wood: 2, scrap: 1 }, 'workbench'),
  R('Armes', 'Batte à clous', 'w:bat', { wood: 4, scrap: 4 }, 'workbench'),
  R('Armes', 'Machette', 'w:machete', { metal: 3, cloth: 1, scrap: 2 }, 'workbench'),
  R('Armes', 'Arbalète', 'w:crossbow', { wood: 6, metal: 2, cloth: 3, scrap: 3 }, 'workbench'),
  R('Armes', 'Pistolet 9mm', 'w:pistol', { metal: 4, scrap: 6, elec: 1 }, 'workbench', 'plan_guns'),
  R('Armes', 'Fusil à pompe', 'w:shotgun', { metal: 8, scrap: 10, wood: 4 }, 'workbench', 'plan_guns'),
  R('Armes', 'Pistolet-mitrailleur', 'w:smg', { metal: 10, scrap: 12, elec: 2 }, 'workbench', 'plan_guns'),
  R('Armes', 'Fusil de chasse', 'w:hunter', { metal: 12, scrap: 10, wood: 6, elec: 2 }, 'workbench', 'plan_guns'),
  R('Armes', 'Lance-flammes', 'w:flamer', { metal: 12, scrap: 12, fuel: 4, elec: 3 }, 'workbench', 'plan_fire'),
  R('Armure', 'Casquette renforcée', 'a:cap', { cloth: 3, scrap: 1 }),
  R('Armure', 'Veste en tissu', 'a:jacket', { cloth: 8 }),
  R('Armure', 'Chaussures de rando', 'a:shoes', { cloth: 3, hide: 2 }),
  R('Armure', 'Veste en cuir', 'a:leather', { hide: 6, cloth: 4 }, 'workbench'),
  R('Armure', 'Casque de moto', 'a:helmet_moto', { metal: 3, cloth: 2, scrap: 2 }, 'workbench'),
  R('Armure', 'Rangers', 'a:rangers', { hide: 5, metal: 2, cloth: 2 }, 'workbench'),
  R('Armure', 'Gilet Kevlar', 'a:kevlar', { cloth: 10, metal: 8, hide: 4 }, 'workbench', 'plan_armor'),
  R('Gadgets', 'Pétard leurre (x2)', 'i:cracker:2', { powder: 1, cloth: 1 }, 'workbench'),
  R('Gadgets', 'Fusée éclairante (x2)', 'i:flare:2', { chem: 1, cloth: 1 }, 'workbench'),
  R('Gadgets', 'Cocktail Molotov (x2)', 'i:molotov:2', { fuel: 1, cloth: 2 }, 'workbench'),
  R('Gadgets', 'Grenade', 'i:grenade:1', { scrap: 3, powder: 2, metal: 1 }, 'workbench'),
  R('Gadgets', 'Mine', 'i:mine:1', { scrap: 4, powder: 3, elec: 1 }, 'workbench'),
  R('Modules', 'Point rouge', 'i:reddot:1', { metal: 1, elec: 1, scrap: 2 }, 'workbench'),
  R('Modules', 'Chargeur étendu', 'i:magext:1', { metal: 2, scrap: 4 }, 'workbench'),
  R('Modules', 'Silencieux', 'i:suppr:1', { metal: 3, cloth: 2, scrap: 2 }, 'workbench', 'plan_optics'),
  R('Modules', 'Lunette', 'i:scope:1', { metal: 3, elec: 2, scrap: 3 }, 'workbench', 'plan_optics'),
  R('Modules', 'Pointeur laser', 'i:laser:1', { elec: 3, chem: 1, metal: 1 }, 'workbench', 'plan_optics'),
];

// ===== Ennemis, animaux =====
// fac: undead | raider | legion | wild
const MOBS = {
  walker:  { n: 'Rôdeur', hp: 45, spd: 52, dmg: 9, r: 11, fac: 'undead', col: '#6e8f5c', xp: 6 },
  runner:  { n: 'Coureur', hp: 30, spd: 120, dmg: 7, r: 10, fac: 'undead', col: '#8a9a4f', xp: 8 },
  brute:   { n: 'Colosse', hp: 280, spd: 46, dmg: 28, r: 17, fac: 'undead', col: '#5c7050', xp: 30, kbres: .85 },
  spitter: { n: 'Cracheur', hp: 50, spd: 64, dmg: 12, r: 11, fac: 'undead', col: '#7aa83a', xp: 14, ranged: 1 },
  screamer:{ n: 'Hurleuse', hp: 36, spd: 80, dmg: 5, r: 10, fac: 'undead', col: '#b08fa0', xp: 14, scream: 1 },
  bloater: { n: 'Gonflé', hp: 110, spd: 38, dmg: 10, r: 15, fac: 'undead', col: '#9a8f3c', xp: 20, explode: 1 },
  zsoldier:{ n: 'Zombie soldat', hp: 150, spd: 58, dmg: 16, r: 12, fac: 'undead', col: '#546050', xp: 20, armor: .35 },
  abomination: { n: 'Abomination', hp: 1800, spd: 70, dmg: 40, r: 26, fac: 'undead', col: '#7b4a5a', xp: 300, kbres: 1, boss: 1 },
  raider:  { n: 'Chacal', hp: 70, spd: 80, dmg: 0, r: 11, fac: 'raider', col: '#a05a3a', xp: 14, gun: 'pistol', acc: 1.3, human: 1, caps: [2, 8] },
  raider_sg:{ n: 'Chacal (fusil)', hp: 85, spd: 76, dmg: 0, r: 11, fac: 'raider', col: '#b06a3a', xp: 18, gun: 'shotgun', acc: 1.2, human: 1, caps: [3, 10] },
  raider_smg:{ n: 'Chacal (PM)', hp: 80, spd: 82, dmg: 0, r: 11, fac: 'raider', col: '#c07a3a', xp: 20, gun: 'smg', acc: 1.4, human: 1, caps: [3, 10] },
  chief:   { n: 'Chef des Chacals', hp: 300, spd: 72, dmg: 0, r: 13, fac: 'raider', col: '#d04a2a', xp: 120, gun: 'smg', acc: .8, human: 1, armor: .3, caps: [40, 80], boss: 1 },
  legion:  { n: 'Légionnaire', hp: 120, spd: 78, dmg: 0, r: 11, fac: 'legion', col: '#7a1f2a', xp: 28, gun: 'ar', acc: .9, human: 1, armor: .25, caps: [5, 15] },
  legion_sn:{ n: 'Tireur d\'élite', hp: 90, spd: 66, dmg: 0, r: 11, fac: 'legion', col: '#5a1f3a', xp: 36, gun: 'hunter', acc: .7, human: 1, caps: [8, 18] },
  legion_hv:{ n: 'Lourd', hp: 320, spd: 56, dmg: 0, r: 14, fac: 'legion', col: '#4a1020', xp: 50, gun: 'shotgun', acc: 1, human: 1, armor: .45, caps: [10, 25] },
  legion_cmd:{ n: 'Commandant de la Légion', hp: 700, spd: 64, dmg: 0, r: 14, fac: 'legion', col: '#a01030', xp: 250, gun: 'ar', acc: .6, human: 1, armor: .4, caps: [100, 160], boss: 1 },
  rabbit:  { n: 'Lapin', hp: 8, spd: 130, dmg: 0, r: 7, fac: 'wild', col: '#c9b9a0', xp: 1, ai: 'prey', drops: [['rawmeat', 1, 1, 1]] },
  deer:    { n: 'Cerf', hp: 55, spd: 150, dmg: 0, r: 13, fac: 'wild', col: '#a9783a', xp: 4, ai: 'prey', drops: [['rawmeat', 1, 2, 3], ['hide', 1, 1, 2]] },
  boar:    { n: 'Sanglier', hp: 90, spd: 100, dmg: 14, r: 13, fac: 'wild', col: '#6a4a3a', xp: 8, ai: 'neutral', tame: 'berries', pet: { hp: 130, dmg: 14, spd: 110 }, drops: [['rawmeat', 1, 2, 4], ['hide', .7, 1, 2]] },
  wolf:    { n: 'Loup', hp: 70, spd: 125, dmg: 13, r: 12, fac: 'wild', col: '#8a8a92', xp: 10, ai: 'predator', tame: 'rawmeat', pet: { hp: 110, dmg: 16, spd: 140 }, drops: [['rawmeat', 1, 1, 2], ['hide', .8, 1, 1]] },
  hound:   { n: 'Chien mutant', hp: 120, spd: 140, dmg: 18, r: 13, fac: 'wild', col: '#7a4a6a', xp: 22, ai: 'predator', tame: 'serum', mutant: 1, pet: { hp: 170, dmg: 22, spd: 150 }, drops: [['rawmeat', 1, 2, 3], ['chem', .6, 1, 2]] },
  bear:    { n: 'Ours mutant', hp: 420, spd: 90, dmg: 38, r: 20, fac: 'wild', col: '#5a3a2a', xp: 60, ai: 'predator', tame: 'serum', mutant: 1, pet: { hp: 520, dmg: 40, spd: 95 }, drops: [['rawmeat', 1, 4, 6], ['hide', 1, 2, 4], ['chem', 1, 1, 3]] },
};
const ZDROPS = [['scrap', .22, 1, 2], ['cloth', .18, 1, 2], ['a9', .12, 3, 8], ['canned', .04, 1, 1], ['bottle_dirty', .05, 1, 1], ['bandage', .04, 1, 1], ['herb', .05, 1, 2], ['caps', .08, 1, 6]];
const HUMANDROPS = [['caps', .9, 3, 12], ['a9', .35, 4, 12], ['shell', .2, 2, 6], ['a556', .15, 4, 10], ['bandage', .2, 1, 2], ['canned', .15, 1, 1], ['scrap', .3, 1, 3], ['metal', .15, 1, 2]];

// ===== Tables de butin =====
const LOOT = {
  start:    [['a9', 3, 15, 25], ['bandage', 2, 2, 3], ['canned', 2, 1, 1], ['bottle_clean', 2, 1, 1], ['cloth', 2, 3, 5]],
  house:    [['scrap', 6, 1, 4], ['cloth', 6, 2, 5], ['canned', 4, 1, 2], ['bottle_dirty', 3, 1, 2], ['soda', 2, 1, 1], ['bandage', 3, 1, 2], ['wood', 3, 2, 4], ['a9', 3, 4, 10], ['herb', 2, 1, 2], ['seed', 1, 2, 3], ['painkiller', 1, 1, 1], ['caps', 3, 3, 12], ['hide', 1, 1, 1]],
  cabin:    [['wood', 5, 3, 6], ['hide', 3, 1, 3], ['canned', 3, 1, 2], ['shell', 3, 2, 6], ['herb', 3, 1, 3], ['cloth', 3, 2, 4], ['seed', 2, 2, 3], ['bolt', 2, 3, 6], ['caps', 2, 3, 10]],
  gas:      [['fuel', 7, 1, 3], ['scrap', 6, 2, 5], ['soda', 5, 1, 2], ['canned', 3, 1, 2], ['chem', 3, 1, 2], ['elec', 2, 1, 1], ['metal', 3, 1, 2], ['caps', 3, 3, 12]],
  farm:     [['veg', 6, 2, 5], ['seed', 5, 3, 5], ['berries', 3, 3, 6], ['rawmeat', 3, 1, 2], ['wood', 4, 3, 6], ['hide', 2, 1, 2], ['shell', 3, 3, 8], ['bottle_clean', 3, 1, 2], ['caps', 2, 3, 10]],
  market:   [['canned', 8, 2, 4], ['soda', 6, 1, 3], ['bottle_clean', 6, 1, 3], ['cooked', 3, 1, 2], ['veg', 3, 1, 3], ['cloth', 3, 2, 4], ['bandage', 3, 1, 2], ['caps', 3, 5, 20]],
  police:   [['a9', 8, 8, 20], ['shell', 5, 4, 10], ['bandage', 4, 1, 3], ['metal', 3, 1, 3], ['elec', 3, 1, 2], ['a556', 3, 6, 14], ['painkiller', 3, 1, 2], ['caps', 4, 8, 25]],
  hospital: [['bandage', 7, 2, 4], ['painkiller', 5, 1, 3], ['antibio', 3, 1, 2], ['medkit', 3, 1, 1], ['herb', 3, 1, 3], ['chem', 6, 1, 3], ['cloth', 4, 3, 6], ['caps', 3, 8, 22]],
  warehouse:[['scrap', 8, 3, 8], ['metal', 6, 2, 5], ['elec', 4, 1, 3], ['wood', 4, 3, 8], ['cloth', 4, 3, 6], ['fuel', 3, 1, 3], ['chem', 3, 1, 3], ['powder', 3, 2, 5], ['caps', 3, 8, 25]],
  bunker:   [['a556', 7, 10, 24], ['a762', 6, 6, 14], ['metal', 5, 3, 7], ['elec', 5, 2, 4], ['medkit', 4, 1, 2], ['grenade', 3, 1, 3], ['mine', 2, 1, 2], ['powder', 4, 3, 7], ['chem', 3, 2, 4], ['caps', 4, 20, 60]],
  camp:     [['a9', 6, 8, 20], ['shell', 5, 4, 10], ['canned', 4, 1, 3], ['molotov', 3, 1, 2], ['scrap', 5, 2, 5], ['metal', 3, 1, 3], ['bandage', 3, 1, 3], ['soda', 3, 1, 2], ['caps', 6, 10, 40]],
  legion:   [['a556', 7, 12, 30], ['a762', 5, 6, 16], ['medkit', 3, 1, 2], ['grenade', 4, 1, 3], ['metal', 5, 3, 7], ['elec', 4, 2, 4], ['canned', 3, 2, 4], ['caps', 6, 25, 70]],
  radio:    [['elec', 7, 3, 7], ['metal', 5, 2, 5], ['scrap', 5, 3, 7], ['chem', 3, 1, 3], ['caps', 3, 10, 30]],
  airdrop:  [['a556', 6, 12, 30], ['a762', 4, 8, 16], ['medkit', 5, 1, 3], ['grenade', 4, 2, 4], ['metal', 5, 4, 8], ['elec', 4, 2, 5], ['canned', 4, 3, 6], ['bottle_clean', 4, 2, 4], ['suppr', 1, 1, 1], ['scope', 1, 1, 1], ['caps', 5, 30, 80]],
};
const RARE_LOOT = { // armes / armures / plans trouvables (type, id, poids)
  house: [['w', 'pistol', 2], ['w', 'bat', 2], ['a', 'jacket', 3], ['a', 'cap', 3], ['a', 'shoes', 2], ['w', 'axe', 2], ['w', 'knife', 2], ['m', 'reddot', 1]],
  cabin: [['w', 'crossbow', 2], ['w', 'axe', 2], ['a', 'leather', 2], ['w', 'machete', 1], ['p', 'plan_fort', 1]],
  gas: [['w', 'pickaxe', 2], ['a', 'helmet_moto', 2], ['w', 'bat', 1]],
  farm: [['w', 'shotgun', 2], ['w', 'axe', 2], ['a', 'shoes', 2], ['w', 'hunter', 1]],
  market: [['a', 'jacket', 2], ['a', 'shoes', 2]],
  police: [['w', 'pistol', 4], ['w', 'smg', 2], ['w', 'shotgun', 3], ['a', 'helmet_moto', 3], ['a', 'kevlar', 2], ['m', 'laser', 2], ['p', 'plan_guns', 2]],
  hospital: [['p', 'plan_med', 5], ['p', 'plan_serum', 2], ['a', 'jacket', 1]],
  warehouse: [['w', 'smg', 1], ['a', 'rangers', 2], ['a', 'leather', 2], ['m', 'magext', 3], ['p', 'plan_turret', 2], ['p', 'plan_fort', 2]],
  bunker: [['w', 'ar', 4], ['w', 'hunter', 3], ['a', 'helmet_mil', 3], ['a', 'kevlar', 3], ['a', 'plate', 1], ['a', 'rangers', 2], ['m', 'scope', 3], ['m', 'suppr', 3], ['p', 'plan_optics', 2], ['p', 'plan_armor', 2], ['p', 'plan_fire', 1]],
  camp: [['w', 'shotgun', 3], ['w', 'smg', 2], ['w', 'machete', 2], ['a', 'leather', 2], ['m', 'suppr', 1], ['p', 'plan_guns', 1]],
  legion: [['w', 'ar', 4], ['w', 'hunter', 3], ['a', 'helmet_mil', 3], ['a', 'plate', 2], ['m', 'scope', 2], ['m', 'suppr', 2], ['m', 'laser', 2], ['p', 'plan_armor', 2]],
  radio: [['m', 'scope', 2], ['m', 'laser', 2], ['p', 'plan_optics', 2]],
  airdrop: [['w', 'ar', 3], ['w', 'hunter', 2], ['a', 'kevlar', 2], ['a', 'helmet_mil', 2], ['w', 'flamer', 1]],
};

// ===== Points d'intérêt =====
// size [w,h] tuiles ; z = zombies ; claim = peut devenir une base
const POITYPES = {
  village:   { n: 'Fort Espoir', size: [22, 18], roof: null, icon: '🏘️' },
  house:     { n: 'Maison', size: [7, 6], roof: '#8a4a3a', loot: 'house', n_c: [1, 2], z: [1, 3], claim: 1, icon: '🏠' },
  cabin:     { n: 'Cabane', size: [6, 5], roof: '#6a4a2a', loot: 'cabin', n_c: [1, 2], z: [0, 2], claim: 1, icon: '🛖' },
  gas:       { n: 'Station-service', size: [9, 7], roof: '#8a8a3a', loot: 'gas', n_c: [2, 3], z: [2, 4], claim: 1, icon: '⛽' },
  farm:      { n: 'Ferme', size: [11, 8], roof: '#9a5a2a', loot: 'farm', n_c: [2, 3], z: [3, 5], claim: 1, icon: '🌾' },
  market:    { n: 'Supermarché', size: [13, 9], roof: '#4a6a8a', loot: 'market', n_c: [3, 4], z: [4, 7], claim: 1, icon: '🛒' },
  police:    { n: 'Commissariat', size: [11, 9], roof: '#3a4a6a', loot: 'police', n_c: [3, 4], z: [5, 8], claim: 1, icon: '🚓' },
  hospital:  { n: 'Hôpital', size: [16, 11], roof: '#8a9aaa', loot: 'hospital', n_c: [5, 6], z: [8, 12], claim: 1, icon: '🏥' },
  warehouse: { n: 'Entrepôt', size: [15, 10], roof: '#5a5a5a', loot: 'warehouse', n_c: [4, 5], z: [5, 8], claim: 1, icon: '🏭' },
  bunker:    { n: 'Bunker militaire', size: [13, 11], roof: '#3a4a3a', loot: 'bunker', n_c: [4, 5], z: [8, 12], claim: 1, icon: '🪖' },
  camp:      { n: 'Camp des Chacals', size: [16, 14], roof: null, loot: 'camp', n_c: [3, 4], claim: 1, icon: '☠️' },
  legion:    { n: 'Avant-poste de la Légion', size: [18, 14], roof: null, loot: 'legion', n_c: [4, 5], claim: 1, icon: '⚔️' },
  radio:     { n: 'Tour radio', size: [9, 8], roof: '#555555', loot: 'radio', n_c: [2, 3], z: [4, 6], claim: 1, icon: '📡' },
};
const POICOUNT = { house: 24, cabin: 8, gas: 3, farm: 3, market: 2, police: 1, hospital: 1, warehouse: 2, bunker: 2, camp: 4, legion: 2, radio: 1 };

const BASE_LEVELS = [
  null,
  { cost: {}, hp: 800, turrets: 2, guards: 1, regen: 0, label: 'Campement' },
  { cost: { wood: 30, scrap: 20 }, hp: 1400, turrets: 4, guards: 2, regen: .6, label: 'Avant-poste' },
  { cost: { metal: 20, scrap: 30, elec: 5 }, hp: 2200, turrets: 6, guards: 3, regen: 1.2, label: 'Place forte' },
  { cost: { metal: 40, elec: 12, cloth: 20 }, hp: 3400, turrets: 8, guards: 4, regen: 1.8, label: 'Forteresse' },
  { cost: { metal: 80, elec: 25, chem: 10, scrap: 60 }, hp: 5500, turrets: 12, guards: 6, regen: 2.5, label: 'Citadelle' },
];

// ===== Compétences =====
const SKILLS = {
  str:   { n: 'Force', i: '💪', d: '+12% dégâts mêlée et récolte par niveau' },
  end:   { n: 'Endurance', i: '🫀', d: '+10 PV max, +12 endurance, faim/soif plus lentes' },
  aim:   { n: 'Précision', i: '🎯', d: '-8% dispersion, rechargement 7% plus rapide' },
  craft: { n: 'Artisanat', i: '🛠️', d: '-7% coût des fabrications et améliorations' },
  hunt:  { n: 'Chasse & dressage', i: '🐺', d: '+15% butin animal, +10% dressage' },
  carry: { n: 'Porteur', i: '🎒', d: '+8 capacité de transport' },
};

// ===== Quêtes =====
// objectifs : have(item,n) [rendu] | kill(mob,n) | clear(poi type) | claim(n) | build(struct,n) | survive(day) | baselvl(n) | tame(n) | recruit(n) | radio
const QUESTS = [
  { id: 'q_start', giver: 'mara', title: 'Premiers pas', desc: 'Fort Espoir manque de matériaux de base. Rapporte du bois et de la pierre : coupe des arbres (E ou arme) et ramasse des rochers.', objs: [{ t: 'have', item: 'wood', n: 12 }, { t: 'have', item: 'stone', n: 6 }], rew: { items: { bandage: 3, canned: 2 }, caps: 30, rep: 10, xp: 40 } },
  { id: 'q_herb', giver: 'doc', req: ['q_start'], title: 'Besoin de soins', desc: 'Le docteur Lin a besoin d\'herbes médicinales (buissons verts) pour soigner les blessés.', objs: [{ t: 'have', item: 'herb', n: 6 }], rew: { items: { antibio: 2, plan_med: 1 }, caps: 25, rep: 8, xp: 40 } },
  { id: 'q_hunt', giver: 'mara', req: ['q_start'], title: 'Nettoyage des environs', desc: 'Les rôdeurs s\'approchent du fort. Élimine 15 infectés.', objs: [{ t: 'kill', mob: 'undead', n: 15 }], rew: { items: { a9: 30, shell: 10 }, caps: 40, rep: 10, xp: 60 } },
  { id: 'q_scrap', giver: 'jonas', req: ['q_start'], title: 'Ferraille pour le commerce', desc: 'Jonas veut 25 ferrailles pour réparer ses étals. Il t\'en sera reconnaissant.', objs: [{ t: 'have', item: 'scrap', n: 25 }], rew: { items: { plan_guns: 1 }, caps: 20, rep: 8, xp: 40 } },
  { id: 'q_tame', giver: 'doc', req: ['q_herb'], title: 'Un compagnon', desc: 'Les animaux sont de bons alliés. Apprivoise une bête (approche-la avec de la nourriture : viande pour les loups, baies pour les sangliers).', objs: [{ t: 'tame', n: 1 }], rew: { items: { seed: 6, serum: 1, rawmeat: 3 }, caps: 30, rep: 8, xp: 60 } },
  { id: 'q_camp', giver: 'mara', req: ['q_hunt'], title: 'Les Chacals', desc: 'Une milice de pillards campe non loin et attaque nos convois. Détruis leur camp et élimine leur chef.', objs: [{ t: 'clear', poi: 'camp' }], rew: { items: { smg: 1, a9: 40, medkit: 1 }, caps: 120, rep: 20, xp: 150 } },
  { id: 'q_claim', giver: 'mara', req: ['q_hunt'], title: 'Un toit à soi', desc: 'Nettoie un bâtiment des infectés, puis plante-y ton drapeau (E sur le drapeau) pour le transformer en base.', objs: [{ t: 'claim', n: 1 }], rew: { items: { plan_turret: 1, metal: 10, scrap: 15 }, caps: 40, rep: 10, xp: 80 } },
  { id: 'q_hosp', giver: 'doc', req: ['q_herb', 'q_hunt'], title: 'Dans les ruines de l\'hôpital', desc: 'L\'hôpital abandonné contient des fournitures médicales. Rapportes-en 4 (elles sont dans les caisses).', objs: [{ t: 'have', item: 'medsupply', n: 4 }], rew: { items: { medkit: 2, plan_serum: 1, antibio: 2 }, caps: 80, rep: 15, xp: 120 } },
  { id: 'q_build', giver: 'mara', req: ['q_claim'], title: 'Fortification', desc: 'Prouve que ta base peut tenir : construis 2 tourelles automatiques et 8 murs.', objs: [{ t: 'build', st: 'turret', n: 2 }, { t: 'build', st: 'wall', n: 8 }], rew: { items: { plan_armor: 1, plan_fort: 1 }, caps: 100, rep: 15, xp: 120 } },
  { id: 'q_optics', giver: 'jonas', req: ['q_scrap'], title: 'Composants rares', desc: 'Jonas cherche 8 composants électroniques et 4 produits chimiques (entrepôts, stations-service, hôpital).', objs: [{ t: 'have', item: 'elec', n: 8 }, { t: 'have', item: 'chem', n: 4 }], rew: { items: { plan_optics: 1 }, caps: 60, rep: 8, xp: 80 } },
  { id: 'q_radio', giver: 'mara', req: ['q_camp'], title: 'Signal radio', desc: 'Atteins la tour radio, élimine ce qui rôde autour et réactive l\'émetteur (E). Cela révélera la carte.', objs: [{ t: 'radio' }], rew: { items: { elec: 6, flare: 3 }, caps: 150, rep: 20, xp: 200 } },
  { id: 'q_legion', giver: 'mara', req: ['q_camp', 'q_radio'], title: 'La Légion rouge', desc: 'Une milice militaire s\'est installée plus loin. Détruis son avant-poste et tue son commandant.', objs: [{ t: 'clear', poi: 'legion' }], rew: { items: { ar: 1, helmet_mil: 1, a556: 60 }, caps: 250, rep: 30, xp: 400 } },
  { id: 'q_night', giver: 'mara', req: ['q_build'], title: 'La longue nuit', desc: 'Survis jusqu\'au jour 8 avec une base de niveau 3.', objs: [{ t: 'survive', day: 8 }, { t: 'baselvl', n: 3 }], rew: { items: { plan_fire: 1, kevlar: 1, medkit: 3 }, caps: 300, rep: 25, xp: 300 } },
  { id: 'q_bunker', giver: 'mara', req: ['q_legion'], title: 'Le Bunker', desc: 'Les militaires ont laissé un bunker bourré d\'armes. Prends-le et nettoie-le.', objs: [{ t: 'clear', poi: 'bunker' }], rew: { items: { plate: 1, hunter: 1, a762: 30 }, caps: 400, rep: 30, xp: 500 } },
  { id: 'q_allies', giver: 'mara', req: ['q_claim'], title: 'Constituer une garnison', desc: 'Recrute 2 gardes auprès de Mara (réputation 30 requise, 60 capsules l\'unité).', objs: [{ t: 'recruit', n: 2 }], rew: { items: { medkit: 2, a556: 40 }, caps: 100, rep: 15, xp: 150 } },
];
