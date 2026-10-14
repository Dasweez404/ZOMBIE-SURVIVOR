'use strict';
// ===== Génération du monde, collisions, pathfinding =====
const T = { GRASS: 0, FOREST: 1, SAND: 2, WATER: 3, ROAD: 4, DIRT: 5, FLOOR: 6, CONC: 7, WALLT: 8, PALI: 9, TILE: 10, FLESH: 11 };
const SO = { NONE: 0, WALL: 1, OBJ: 2, STRUCT: 3, DOOR: 4, WATER: 5 };
const DAY_LEN = 360; // secondes par jour

// Récolte : outil adéquat, pv, butin [item, chance, min, max], repousse (jours)
const HARV = {
  tree:     { tool: 'tree', hp: 70, drop: [['wood', 1, 3, 5]], regrow: 2.5, solid: 1, verb: 'Abattre l\'arbre' },
  deadtree: { tool: 'tree', hp: 40, drop: [['wood', 1, 2, 3]], regrow: 3, solid: 1, verb: 'Couper l\'arbre mort' },
  rock:     { tool: 'rock', hp: 100, drop: [['stone', 1, 3, 5], ['scrap', .35, 1, 2], ['metal', .12, 1, 1]], regrow: 4, solid: 1, verb: 'Casser le rocher' },
  wreck:    { tool: 'rock', hp: 130, drop: [['scrap', 1, 3, 6], ['metal', .5, 1, 2], ['fuel', .25, 1, 1], ['elec', .2, 1, 1]], regrow: 99, solid: 1, verb: 'Démonter l\'épave' },
  bush:     { tool: null, hp: 1, drop: [['berries', 1, 2, 4], ['herb', .25, 1, 1], ['seed', .2, 1, 1]], regrow: 1.2, solid: 0, verb: 'Cueillir des baies' },
  herb:     { tool: null, hp: 1, drop: [['herb', 1, 1, 3]], regrow: 1.5, solid: 0, verb: 'Cueillir des herbes' },
  ore:      { tool: 'rock', hp: 130, drop: [['metal', 1, 2, 4], ['scrap', .7, 1, 3], ['stone', .8, 2, 4]], regrow: 5, solid: 1, verb: 'Miner le filon' },
  scrappile:{ tool: null, hp: 1, drop: [['scrap', 1, 2, 4], ['cloth', .3, 1, 2], ['metal', .15, 1, 1]], regrow: 99, solid: 0, verb: 'Fouiller le tas' },
};

function IDX(tx, ty) { return ty * G.W + tx; }
function inb(tx, ty) { return tx >= 0 && ty >= 0 && tx < G.W && ty < G.H; }
function tileOf(x, y) { return [Math.floor(x / TS), Math.floor(y / TS)]; }
function solidAt(tx, ty) { return inb(tx, ty) ? G.solid[ty * G.W + tx] : SO.WALL; }
function blockedFor(tx, ty, fr) { // fr: true = joueur/alliés (franchissent les portes)
  const s = solidAt(tx, ty);
  if (s === 0) return false;
  if (s === SO.DOOR && fr) return false;
  return true;
}
function collide(x, y, r, fr) {
  const x0 = Math.floor((x - r) / TS), x1 = Math.floor((x + r) / TS), y0 = Math.floor((y - r) / TS), y1 = Math.floor((y + r) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (blockedFor(tx, ty, fr)) return true;
  return false;
}
// Déplace une entité en gérant les collisions (axes séparés). Retourne bit 1 = bloqué en x, 2 = bloqué en y
function moveEnt(e, dx, dy, fr) {
  let hit = 0; const r = e.r * .8;
  if (dx) { const nx = clamp(e.x + dx, 20, G.W * TS - 20); if (!collide(nx, e.y, r, fr)) e.x = nx; else hit |= 1; }
  if (dy) { const ny = clamp(e.y + dy, 20, G.H * TS - 20); if (!collide(e.x, ny, r, fr)) e.y = ny; else hit |= 2; }
  return hit;
}
// Dégage une entité coincée dans un obstacle solide (structure posée dessus, arbre qui repousse…)
function unstick(e, fr) {
  const r = e.r * .8; if (!collide(e.x, e.y, r, fr)) return false;
  for (let d = 8; d <= 120; d += 8) for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d; if (!collide(x, y, r, fr)) { e.x = x; e.y = y; return true; } }
  return false;
}
function los(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.ceil(d / 14);
  for (let i = 1; i < n; i++) {
    const t = i / n, s = solidAt(Math.floor((x0 + (x1 - x0) * t) / TS), Math.floor((y0 + (y1 - y0) * t) / TS));
    if (s === 1 || s === 2 || s === 3 || s === 4) return false;
  }
  return true;
}
function freeTile(tx, ty) { return inb(tx, ty) && G.solid[IDX(tx, ty)] === 0 && !G.structs.has(IDX(tx, ty)) && !G.objs.has(IDX(tx, ty)); }
function walkableAt(x, y) { return !collide(x, y, 12, false); }

// ===== Champ de flux (pathfinding vers une cible) =====
class Flow {
  constructor(size) { this.size = size; this.cost = new Float32Array(size * size); this.x0 = 0; this.y0 = 0; this.valid = false; this.q = new Int32Array(size * size * 6); this.inq = new Uint8Array(size * size); }
  compute(gx, gy) {
    const S = this.size, half = S >> 1; this.x0 = gx - half; this.y0 = gy - half; this.valid = true;
    const c = this.cost, q = this.q, inq = this.inq; c.fill(1e9); inq.fill(0);
    const gi = half * S + half; c[gi] = 0; let qh = 0, qt = 0; q[qt++] = gi; inq[gi] = 1;
    const W = G.W, solid = G.solid, x0 = this.x0, y0 = this.y0;
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.45], [-1, 1, 1.45], [1, -1, 1.45], [-1, -1, 1.45]];
    const tcost = (lx, ly) => {
      const tx = x0 + lx, ty = y0 + ly;
      if (lx < 0 || ly < 0 || lx >= S || ly >= S || tx < 0 || ty < 0 || tx >= W || ty >= G.H) return 1e9;
      const s = solid[ty * W + tx];
      return s === 0 ? 1 : s === 4 ? 7 : s === 3 ? 12 : 1e9;
    };
    while (qh !== qt) {
      const cur = q[qh]; qh = (qh + 1) % q.length; inq[cur] = 0;
      const cx = cur % S, cy = (cur / S) | 0, cc = c[cur];
      for (let k = 0; k < 8; k++) {
        const nx = cx + D[k][0], ny = cy + D[k][1];
        const tc = tcost(nx, ny); if (tc >= 1e9) continue;
        if (k >= 4 && (tcost(cx + D[k][0], cy) >= 1e9 || tcost(cx, cy + D[k][1]) >= 1e9)) continue;
        const nc = cc + tc * D[k][2];
        const ni = ny * S + nx;
        if (nc < c[ni]) { c[ni] = nc; if (!inq[ni]) { inq[ni] = 1; q[qt] = ni; qt = (qt + 1) % q.length; } }
      }
    }
  }
  dir(wx, wy) {
    if (!this.valid) return null;
    const S = this.size, lx = Math.floor(wx / TS) - this.x0, ly = Math.floor(wy / TS) - this.y0;
    if (lx < 1 || ly < 1 || lx >= S - 1 || ly >= S - 1) return null;
    const c = this.cost; let best = c[ly * S + lx], bx = 0, by = 0;
    if (best >= 1e9) return null;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const v = c[(ly + dy) * S + lx + dx];
      if (v < best && (dx === 0 || dy === 0 || (c[ly * S + lx + dx] < 1e9 && c[(ly + dy) * S + lx] < 1e9))) { best = v; bx = dx; by = dy; }
    }
    if (!bx && !by) return null;
    const l = Math.hypot(bx, by); return [bx / l, by / l];
  }
}

// ===== Génération =====
function addObj(tx, ty, kind, props) {
  const i = IDX(tx, ty); const h = HARV[kind];
  const o = Object.assign({ k: kind, tx, ty, x: tx * TS + TS / 2, y: ty * TS + TS / 2, hp: h ? h.hp : 1, max: h ? h.hp : 1, v: hash2(tx, ty, G.seed + 5), dep: false }, props || {});
  G.objs.set(i, o);
  const sol = h ? h.solid : (props && props.solid);
  if (sol) G.solid[i] = SO.OBJ;
  return o;
}
function removeObj(o) { const i = IDX(o.tx, o.ty); G.objs.delete(i); if (G.solid[i] === SO.OBJ) G.solid[i] = 0; }

// ----- options de monde -----
const WORLD_SIZES = { S: { n: 'Petit', v: 130 }, M: { n: 'Moyen', v: 180 }, L: { n: 'Grand', v: 240 } };
const WORLD_STYLES = {
  balanced: { n: 'Équilibré', scale: 30, off: .07, moist: 0, trees: 1, rocks: 1, wrecks: 1, lakes: 0 },
  forest:   { n: 'Forêts denses', scale: 30, off: .07, moist: .14, trees: 1.35, rocks: .8, wrecks: .8, lakes: 0 },
  desert:   { n: 'Terres arides', scale: 30, off: .09, moist: -.2, trees: .35, rocks: 1.9, wrecks: 1.6, lakes: 0 },
  archipel: { n: 'Archipel', scale: 21, off: -.02, moist: .02, trees: 1, rocks: 1, wrecks: .8, lakes: 1 },
};
const WORLD_DENS = { 0: { n: 'Rare', k: .6 }, 1: { n: 'Normal', k: 1 }, 2: { n: 'Dense', k: 1.4 } };
function wScale() { return G.W / 150; }
function genTerrain(seed) {
  const W = G.W, H = G.H, N = W * H, st = WORLD_STYLES[G.style] || WORLD_STYLES.balanced, f = W / 150;
  G.tiles = new Uint8Array(N); G.solid = new Uint8Array(N); G.reserve = new Uint8Array(N); G.fp = new Uint8Array(N); G.moist = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let e = fbm(x / (st.scale * (f > 1 ? 1 + (f - 1) * .5 : 1)), y / (st.scale * (f > 1 ? 1 + (f - 1) * .5 : 1)), seed, 4) + st.off;
    const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2), d = Math.max(Math.abs(dx), Math.abs(dy));
    e -= Math.pow(d, 6) * .6;
    const dc = Math.hypot(x - W / 2, y - H / 2), cr = 20 * f; if (dc < cr) e += (1 - dc / cr) * (st.lakes ? .16 : .3);
    const m = fbm(x / 20 + 100, y / 20 + 100, seed + 7, 4) + st.moist; G.moist[y * W + x] = m;
    let t;
    if (e < .335) t = T.WATER; else if (e < .365) t = T.SAND; else if (m < .4 && e > .5 || (m < .4 && st.moist < -.1 && e > .4)) t = T.DIRT; else if (m > .56) t = T.FOREST; else t = T.GRASS;
    G.tiles[y * W + x] = t; if (t === T.WATER) G.solid[y * W + x] = SO.WATER;
  }
}
function computeShore() { // distance à la côte pour les tuiles d'eau (0 = bord) — sert au dégradé de profondeur
  const W = G.W, H = G.H, N = W * H; const d = new Uint8Array(N).fill(255); const q = [];
  for (let i = 0; i < N; i++) if (G.tiles[i] !== T.WATER) { d[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0, nd = d[i] + 1; if (nd > 9) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (d[j] > nd) { d[j] = nd; q.push(j); } } }
  G.shore = d;
}
function genWorld(seed) {
  const W = G.W, H = G.H;
  G.objs = new Map(); G.structs = new Map(); G.pois = []; G.buildings = []; G.npcsDef = [];
  const rng = G.rng = new RNG(seed);
  genTerrain(seed);
  const cx = W >> 1, cy = H >> 1;
  G.spawn = { x: cx * TS + 16, y: cy * TS + 16 };
  placePOIs(rng);
  carveRoads(rng);
  scatterObjects(rng);
  spawnAnimals(rng);
  buildStartCamp(rng);
  genRadZones(rng);
  genVehicles(rng);
  computeShore();
}

function rectFree(x, y, w, h, margin) {
  if (x - margin < 3 || y - margin < 3 || x + w + margin > G.W - 3 || y + h + margin > G.H - 3) return false;
  for (let ty = y - margin; ty < y + h + margin; ty++) for (let tx = x - margin; tx < x + w + margin; tx++) {
    const i = IDX(tx, ty);
    if (G.reserve[i]) return false;
    if (G.tiles[i] === T.WATER && tx >= x - 2 && tx < x + w + 2 && ty >= y - 2 && ty < y + h + 2) return false;
  }
  return true;
}

function nearWater(x, y, w, h) {
  for (let ty = y - 7; ty < y + h + 7; ty++) for (let tx = x - 7; tx < x + w + 7; tx++) { if (!inb(tx, ty) || (tx >= x - 2 && tx < x + w + 2 && ty >= y - 2 && ty < y + h + 2)) continue; if (G.tiles[IDX(tx, ty)] === T.WATER) return true; }
  return false;
}
function inSafeZone(x, y) {
  if (G.village && dist(x, y, G.village.cx, G.village.cy) < G.village.safe) return true;
  if (G.nomads && dist(x, y, G.nomads.cx, G.nomads.cy) < G.nomads.safe) return true;
  if (G.spawn && dist(x, y, G.spawn.x, G.spawn.y) < 560) return true; // camp de départ
  return false;
}
function placePOIs(rng) {
  const W = G.W, H = G.H, cx = W / 2, cy = H / 2;
  const f = wScale(), dk = (WORLD_DENS[G.dens] || WORLD_DENS[1]).k, order = [['village', 1], ['nomads', 1]];
  const UNIQ = { hospital: 1, police: 1, bunker: 1, legion: 1, radio: 1, market: 1, warehouse: 1, camp: 2, farm: 1, gas: 1, church: 1, school: 1, diner: 1, firestation: 1, lab: 1, lighthouse: 1, prison: 1, trailer: 1, mine: 1, hive: 1, crash: 1, graveyard: 1, funfair: 1, drivein: 1, powerplant: 1, castle: 1 };
  for (const k of ['hospital', 'camp', 'legion', 'castle', 'drivein', 'police', 'prison', 'lab', 'hive', 'mine', 'school', 'firestation', 'church', 'trailer', 'crash', 'funfair', 'powerplant', 'graveyard', 'lighthouse', 'diner', 'market', 'warehouse', 'bunker', 'radio', 'farm', 'gas', 'cabin', 'house']) {
    if (k === 'nomads') continue;
    const sparse = ['house', 'cabin', 'farm', 'gas', 'camp'].includes(k) ? .55 : .8; // monde aéré : moins de lieux, plus d'espace
    const n = Math.max(UNIQ[k] || 3, Math.round(POICOUNT[k] * f * f * dk * sparse * (f < 1 ? 1.25 : 1)));
    for (let i = 0; i < n; i++) order.push([k, 1]);
  }
  const rng_d = { nomads: [18, 40], church: [12, 60], school: [18, 56], diner: [10, 60], firestation: [18, 56], lab: [30, 58], lighthouse: [20, 62], prison: [34, 60], trailer: [14, 60], mine: [26, 60], hive: [46, 64], crash: [20, 62], funfair: [20, 58], drivein: [16, 58], powerplant: [30, 62], castle: [36, 62], graveyard: [12, 60], village: [26, 34], hospital: [24, 55], police: [18, 50], market: [20, 55], warehouse: [26, 60], bunker: [46, 64], legion: [44, 64], camp: [24, 58], radio: [34, 62], farm: [16, 60], gas: [12, 60], cabin: [14, 62], house: [8, 64] };
  let id = 0;
  for (const [type] of order) {
    const def = POITYPES[type]; let placed = false;
    for (let tries = 0; tries < 1800; tries++) {
      const [w, h] = def.size; let [d0, d1] = rng_d[type]; d0 *= f; d1 *= f;
      if (tries > 450) { d0 = Math.max(6, d0 * .6); d1 = Math.min(W / 2 - 9, d1 * 1.2); } if (tries > 1200) { d0 = 6; d1 = W / 2 - 9; }
      const a = rng.range(0, TAU), d = rng.range(d0, d1);
      const x = Math.round(cx + Math.cos(a) * d - w / 2), y = Math.round(cy + Math.sin(a) * d - h / 2);
      if (type !== 'village' && type !== 'nomads' && Math.hypot(x + w / 2 - cx, y + h / 2 - cy) < (type === 'house' || type === 'cabin' ? 13 : 24)) continue; // départ au calme
      if (!rectFree(x, y, w, h, tries > 1000 ? 1 : tries > 500 ? 2 : (type === 'house' || type === 'cabin' ? 3 : f < 1 ? 4 : 6))) continue;
      if (def.coast && tries < 1000 && !nearWater(x, y, w, h)) continue;
      if (type === 'cabin') { const m = G.moist[(y + (h >> 1)) * W + x + (w >> 1)]; if (m < .5 && tries < 300) continue; }
      const p = { id: id++, type, name: def.n, x, y, w, h, cx: (x + w / 2) * TS, cy: (y + h / 2) * TS, spawned: false, cleared: false, owned: false, discovered: false, lvl: 1, mobs: [], crates: [], hpFlag: 0, stash: null, chest: null, def };
      for (let ty = y - 2; ty < y + h + 2; ty++) for (let tx = x - 2; tx < x + w + 2; tx++) G.reserve[IDX(tx, ty)] = 1;
      for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) G.fp[IDX(tx, ty)] = 1;
      G.pois.push(p);
      buildPOI(p, rng); placed = true;
      break;
    }
    if (!placed && type === 'village') { // secours : on aplanit un terrain près du centre
      const [w, h] = def.size; const a = rng.range(0, TAU), d = rng.range(10, 20) * f;
      const x = Math.round(cx + Math.cos(a) * d - w / 2), y = Math.round(cy + Math.sin(a) * d - h / 2);
      for (let ty = y - 4; ty < y + h + 4; ty++) for (let tx = x - 4; tx < x + w + 4; tx++) if (inb(tx, ty)) { const i = IDX(tx, ty); G.tiles[i] = T.GRASS; G.solid[i] = 0; }
      const p = { id: id++, type, name: def.n, x, y, w, h, cx: (x + w / 2) * TS, cy: (y + h / 2) * TS, spawned: false, cleared: false, owned: false, discovered: false, lvl: 1, mobs: [], crates: [], hpFlag: 0, stash: null, chest: null, def };
      for (let ty = y - 2; ty < y + h + 2; ty++) for (let tx = x - 2; tx < x + w + 2; tx++) G.reserve[IDX(tx, ty)] = 1;
      G.pois.push(p); buildPOI(p, rng);
    }
  }
}

function setTile(tx, ty, t, solid) { const i = IDX(tx, ty); G.tiles[i] = t; G.solid[i] = solid || 0; }

function makeBuilding(x, y, w, h, floorT, rng, opts) {
  opts = opts || {};
  for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) {
    const edge = tx === x || ty === y || tx === x + w - 1 || ty === y + h - 1;
    setTile(tx, ty, edge ? T.WALLT : floorT, edge ? SO.WALL : 0);
  }
  const sides = opts.sides || [rng.int(0, 3)];
  const doors = [];
  for (const s of sides) {
    let dx, dy;
    if (s === 0) { dx = x + 1 + rng.int(0, w - 4); dy = y; } else if (s === 1) { dx = x + 1 + rng.int(0, w - 4); dy = y + h - 1; }
    else if (s === 2) { dx = x; dy = y + 1 + rng.int(0, h - 4); } else { dx = x + w - 1; dy = y + 1 + rng.int(0, h - 4); }
    const horiz = s < 2;
    for (let k = 0; k < 2; k++) setTile(horiz ? dx + k : dx, horiz ? dy : dy + k, floorT, 0);
    doors.push({ s, x: dx, y: dy, fx: horiz ? dx : (s === 2 ? dx - 1 : dx + 1), fy: horiz ? (s === 0 ? dy - 1 : dy + 1) : dy });
  }
  if (opts.partition && w >= 11) {
    const px = x + (w >> 1);
    for (let ty = y + 1; ty < y + h - 1; ty++) setTile(px, ty, T.WALLT, SO.WALL);
    const gy = y + 2 + rng.int(0, h - 6); setTile(px, gy, floorT, 0); setTile(px, gy + 1, floorT, 0);
  }
  if (opts.partition && h >= 10) {
    const py = y + (h >> 1);
    for (let tx = x + 1; tx < x + w - 1; tx++) if (G.solid[IDX(tx, py)] === 0) setTile(tx, py, T.WALLT, SO.WALL);
    const gx = x + 2 + rng.int(0, w - 6); setTile(gx, py, floorT, 0); setTile(gx + 1, py, floorT, 0);
  }
  for (let ty = y - 1; ty <= y + h; ty++) for (let tx = x - 1; tx <= x + w; tx++) G.reserve[IDX(tx, ty)] = 1;
  const b = { x, y, w, h, roof: opts.roof || '#666', a: 1, doors, style: opts.style || '' };
  G.buildings.push(b);
  return b;
}

function interiorTiles(p, b) {
  const list = [];
  for (let ty = b.y + 1; ty < b.y + b.h - 1; ty++) for (let tx = b.x + 1; tx < b.x + b.w - 1; tx++) if (G.solid[IDX(tx, ty)] === 0) {
    // éviter les cases devant les portes
    let near = false; for (const d of b.doors) if (Math.abs(tx - d.x) < 3 && Math.abs(ty - d.y) < 3) near = true;
    if (!near) list.push([tx, ty]);
  }
  return list;
}

function rollLoot(table, rng, rolls) {
  const out = {};
  for (let i = 0; i < rolls; i++) {
    const e = rng.wpick(table.map(t => [t, t[1]])); if (!e || e[1] <= 0) continue;
    out[e[0]] = (out[e[0]] || 0) + rng.int(e[2], e[3]);
  }
  return out;
}
function rollRare(type, rng) {
  const tb = RARE_LOOT[type]; if (!tb) return null;
  const e = rng.wpick(tb.map(t => [t, t[2]]));
  return { kind: e[0], id: e[1] };
}

function addCrate(p, tx, ty, rng, lootKey, extra) {
  const loot = rollLoot(LOOT[lootKey], rng, rng.int(2, 4));
  const gear = [];
  if (rng.chance(.5)) { const r = rollRare(lootKey, rng); if (r) gear.push(r); }
  const o = addObj(tx, ty, 'crate', { solid: 1, loot, gear, opened: false, poi: p.id, cid: G.nextCrate = (G.nextCrate || 0) + 1 });
  if (extra) Object.assign(o.loot, extra);
  p.crates.push(o); return o;
}

function buildPOI(p, rng) {
  const def = p.def, t = p.type;
  if (t === 'village') return buildVillage(p, rng);
  if (t === 'camp' || t === 'legion') return buildCompound(p, rng);
  if (def.kind) return BUILDERS[def.kind](p, rng);
  const floorT = (t === 'house' || t === 'cabin' || t === 'farm' || t === 'church' || t === 'diner') ? T.FLOOR : t === 'lab' ? T.TILE : T.CONC;
  // terrain autour
  for (let ty = p.y - 3; ty < p.y + p.h + 3; ty++) for (let tx = p.x - 3; tx < p.x + p.w + 3; tx++) {
    const apron = (t === 'house' || t === 'cabin' || t === 'church' || t === 'lighthouse' || t === 'farm') ? T.DIRT : T.CONC;
    if (tx >= p.x - 2 && tx < p.x + p.w + 2 && ty >= p.y - 2 && ty < p.y + p.h + 2) setTile(tx, ty, t === 'cabin' ? T.FOREST : apron, 0);
  }
  const big = p.w >= 11;
  const sides = t === 'church' ? [1] : t === 'firestation' ? [1] : (big ? [rng.int(0, 1), rng.int(2, 3)] : [rng.int(0, 3)]);
  const b = makeBuilding(p.x, p.y, p.w, p.h, floorT, rng, { roof: def.roof, sides, partition: big && p.w >= 13 && t !== 'church', style: def.style });
  if (t === 'firestation') { const d = b.doors[0]; for (let k = 2; k < 4; k++) setTile(d.x + k, d.y, floorT, 0); }
  p.b = b; p.front = b.doors[0];
  decorBuilding(p, b, rng);
  const tiles = interiorTiles(p, b).filter(([x, y]) => !G.objs.has(IDX(x, y)));
  // rotation aléatoire
  for (let i = tiles.length - 1; i > 0; i--) { const j = rng.int(0, i); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
  const nC = rng.int(def.n_c[0], def.n_c[1]);
  for (let i = 0; i < nC && tiles.length; i++) {
    const [tx, ty] = tiles.pop();
    let extra = null;
    if (t === 'hospital' && i < 4) extra = { medsupply: 1 };
    addCrate(p, tx, ty, rng, def.loot, extra);
  }
  // décor
  if (t !== 'church' && t !== 'lab' && t !== 'diner' && t !== 'school') for (let i = 0; i < Math.floor(tiles.length / 14); i++) { const [tx, ty] = tiles.pop(); addObj(tx, ty, 'furn', { solid: 1, fv: rng.int(0, 2) }); }
  if (t === 'radio') { const m = tiles.pop(); if (m) { addObj(m[0], m[1], 'mast', { solid: 1 }); p.mast = { x: m[0] * TS + 16, y: m[1] * TS + 16 }; } }
  const f = tiles.pop() || [p.x + 2, p.y + 2];
  p.flag = { tx: f[0], ty: f[1], x: f[0] * TS + 16, y: f[1] * TS + 16 };
  // points de spawn zombies
  p.zspots = tiles.slice(-14).map(([tx, ty]) => [tx * TS + 16, ty * TS + 16]);
  if (!p.zspots.length) p.zspots = [[p.cx, p.cy]];
  if (t === 'farm') { // petits champs devant
    for (let i = 0; i < 6; i++) { const tx = p.x + 1 + i, ty = p.y + p.h + 3; if (inb(tx, ty) && tx < p.x + p.w) setTile(tx, ty, T.DIRT, 0); }
  }
}

function decorBuilding(p, b, rng) {
  const t = p.type, cx = b.x + (b.w >> 1);
  const put = (x, y, k, props) => { if (inb(x, y) && G.solid[IDX(x, y)] === 0 && !G.objs.has(IDX(x, y))) addObj(x, y, k, Object.assign({ solid: 1 }, props || {})); };
  const nearDoor = (x, y) => b.doors.some(d => Math.abs(x - d.x) < 3 && Math.abs(y - d.y) < 3);
  if (t === 'church') {
    put(cx, b.y + 2, 'altar');
    for (let y = b.y + 5; y < b.y + b.h - 3; y += 2) for (const dx of [-3, -2, 2, 3]) if (!nearDoor(cx + dx, y)) put(cx + dx, y, 'pew', { fv: dx < 0 ? 0 : 1 });
  } else if (t === 'school') {
    for (let y = b.y + 2; y < b.y + b.h - 2; y += 2) for (let x = b.x + 2; x < b.x + b.w - 2; x += 2) if (rng.chance(.55) && !nearDoor(x, y) && G.solid[IDX(x, y)] === 0) put(x, y, 'desk', { fv: rng.int(0, 1) });
  } else if (t === 'diner') {
    for (let x = b.x + 2; x < b.x + b.w - 3; x++) put(x, b.y + 2, 'counter');
    for (const [dx, dy] of [[2, 5], [5, 5], [7, 5], [2, 4], [6, 4]]) if (!nearDoor(b.x + dx, b.y + dy) && rng.chance(.7)) put(b.x + dx, b.y + b.h - 1 - dy + 1, 'furn', { fv: 0 });
  } else if (t === 'lab') {
    for (let y = b.y + 2; y < b.y + b.h - 2; y += 3) for (let x = b.x + 2; x < b.x + b.w - 2; x += 3) if (rng.chance(.6) && !nearDoor(x, y) && G.solid[IDX(x, y)] === 0) put(x, y, 'labtable');
    for (const [x, y] of [[b.x + 1, b.y + 1], [b.x + b.w - 2, b.y + 1], [b.x + 1, b.y + b.h - 2], [b.x + b.w - 2, b.y + b.h - 2]]) if (!nearDoor(x, y)) put(x, y, 'tank');
  }
}

// ----- constructeurs de sites spéciaux -----
function clearArea(p, margin, tile) {
  for (let ty = p.y - margin; ty < p.y + p.h + margin; ty++) for (let tx = p.x - margin; tx < p.x + p.w + margin; tx++) if (inb(tx, ty)) { const i = IDX(tx, ty); G.tiles[i] = tile; G.solid[i] = 0; const o = G.objs.get(i); if (o) G.objs.delete(i); }
}
function ring(p, tile, solid, gapSide, gapW) {
  const gx = p.x + (p.w >> 1) - 1, gy = p.y + (p.h >> 1) - 1;
  for (let i = 0; i < p.w; i++) { setTile(p.x + i, p.y, tile, solid); if (!(gapSide === 1 && i >= gx - p.x && i < gx - p.x + gapW)) setTile(p.x + i, p.y + p.h - 1, tile, solid); }
  for (let j = 0; j < p.h; j++) { setTile(p.x, p.y + j, tile, solid); setTile(p.x + p.w - 1, p.y + j, tile, solid); }
  return { gx, gy };
}
function shuffleArr(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = rng.int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function setSpots(p, list) { p.zspots = list.slice(0, 16).map(([tx, ty]) => [tx * TS + 16, ty * TS + 16]); if (!p.zspots.length) p.zspots = [[p.cx, p.cy]]; }
function freeList(x0, y0, x1, y1) { const l = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y) && G.solid[IDX(x, y)] === 0 && !G.objs.has(IDX(x, y)) && !G.structs.has(IDX(x, y))) l.push([x, y]); return l; }
function crateRing(p, rng, tiles, key) { const nC = rng.int(p.def.n_c[0], p.def.n_c[1]); for (let i = 0; i < nC && tiles.length; i++) { const [tx, ty] = tiles.pop(); addCrate(p, tx, ty, rng, key || p.def.loot, null); } }
const BUILDERS = {
  prison(p, rng) {
    clearArea(p, 2, T.DIRT); const { gx } = ring(p, T.WALLT, SO.WALL, 1, 3);
    for (const [x, y] of [[p.x + 1, p.y + 1], [p.x + p.w - 2, p.y + 1], [p.x + 1, p.y + p.h - 2], [p.x + p.w - 2, p.y + p.h - 2]]) addObj(x, y, 'tower', { solid: 1 });
    const bx = p.x + 4, by = p.y + 2, bw = p.w - 8, bh = 7;
    const b = makeBuilding(bx, by, bw, bh, T.CONC, rng, { roof: p.def.roof, sides: [1], style: 'prison' });
    for (let x = bx + 3; x < bx + bw - 2; x += 3) for (let y = by + 1; y <= by + 3; y++) if (G.solid[IDX(x, y)] === 0) setTile(x, y, T.WALLT, SO.WALL);
    p.b = b; p.front = { fx: gx + 1, fy: p.y + p.h, x: gx + 1, y: p.y + p.h - 1 };
    const tiles = shuffleArr(interiorTiles(p, b).filter(([x, y]) => G.solid[IDX(x, y)] === 0), rng); crateRing(p, rng, tiles);
    const yard = freeList(p.x + 2, by + bh + 1, p.x + p.w - 3, p.y + p.h - 2); shuffleArr(yard, rng);
    const f = [p.x + (p.w >> 1) + 2, p.y + p.h - 4]; p.flag = { tx: f[0], ty: f[1], x: f[0] * TS + 16, y: f[1] * TS + 16 };
    setSpots(p, yard.concat(tiles));
  },
  trailer(p, rng) {
    clearArea(p, 2, T.DIRT); const bs = []; let k = 0;
    for (const y of [p.y + 1, p.y + 7]) for (const x of [p.x + 1, p.x + 7, p.x + 13]) { const b = makeBuilding(x, y, 5, 3, T.FLOOR, rng, { roof: p.def.roof, sides: [y < p.y + 5 ? 1 : 0], style: 'trailer' }); bs.push(b); k++; }
    p.b = bs[0]; p.front = { fx: p.x + 9, fy: p.y + p.h + 1, x: p.x + 9, y: p.y + p.h - 1 };
    const nC = rng.int(p.def.n_c[0], p.def.n_c[1]); shuffleArr(bs, rng);
    for (let i = 0; i < nC && i < bs.length; i++) addCrate(p, bs[i].x + (rng.chance(.5) ? 1 : 3), bs[i].y + 1, rng, p.def.loot, null);
    const cx = p.x + 9, cy = p.y + 5; addObj(cx, cy, 'fire', { solid: 0 });
    for (let i = 0; i < 6; i++) { const [tx, ty] = [p.x + rng.int(1, p.w - 2), p.y + rng.int(4, 6)]; if (freeTile(tx, ty)) addObj(tx, ty, rng.chance(.5) ? 'scrappile' : 'wreck', { ang: rng.range(0, TAU) }); }
    p.flag = { tx: cx + 2, ty: cy, x: (cx + 2) * TS + 16, y: cy * TS + 16 };
    setSpots(p, shuffleArr(freeList(p.x + 1, p.y + 4, p.x + p.w - 2, p.y + 6), rng).concat(shuffleArr(freeList(p.x, p.y, p.x + p.w, p.y + p.h), rng)));
  },
  mine(p, rng) {
    clearArea(p, 2, T.DIRT); const ex = p.x + 5, ey = p.y;
    const b = makeBuilding(ex, ey, 8, 6, T.FLOOR, rng, { roof: p.def.roof, sides: [1], style: 'mine' }); p.b = b; p.front = b.doors[0];
    const door = b.doors[0]; for (let y = ey + 6; y < p.y + p.h; y++) if (G.solid[IDX(door.x, y)] === 0) addObj(door.x, y, 'rails', { solid: 0 });
    const tiles = shuffleArr(interiorTiles(p, b).filter(([x, y]) => G.solid[IDX(x, y)] === 0), rng); crateRing(p, rng, tiles);
    let n = 0; for (let tries = 0; tries < 200 && n < 11; tries++) { const x = p.x + rng.int(1, p.w - 2), y = p.y + rng.int(7, p.h - 1); if (Math.abs(x - door.x) < 2 && true) continue; if (freeTile(x, y)) { addObj(x, y, 'ore', {}); n++; } }
    const f = [door.x + 2, ey + 8]; p.flag = { tx: f[0], ty: f[1], x: f[0] * TS + 16, y: f[1] * TS + 16 };
    setSpots(p, shuffleArr(freeList(p.x + 1, p.y + 7, p.x + p.w - 2, p.y + p.h - 1), rng).concat(tiles));
  },
  hive(p, rng) {
    clearArea(p, 3, T.DIRT); const cx = p.x + (p.w >> 1), cy = p.y + (p.h >> 1), R = 8;
    for (let y = cy - R - 1; y <= cy + R + 1; y++) for (let x = cx - R - 1; x <= cx + R + 1; x++) { if (!inb(x, y)) continue; const d = Math.hypot(x - cx, y - cy); if (d <= R + (vnoise(x / 3, y / 3, G.seed + 31) - .5) * 3) { G.tiles[IDX(x, y)] = T.FLESH; G.solid[IDX(x, y)] = 0; } }
    const spots = []; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + rng.range(-.2, .2), d = rng.range(4.5, 7); const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d); if (freeTile(x, y)) addObj(x, y, 'egg', { solid: 1 }); }
    const crates = freeList(cx - 6, cy - 6, cx + 6, cy + 6).filter(([x, y]) => Math.hypot(x - cx, y - cy) > 3 && Math.hypot(x - cx, y - cy) < 6.5); shuffleArr(crates, rng); crateRing(p, rng, crates);
    p.front = { fx: cx, fy: cy + R + 2, x: cx, y: cy + R + 1 }; p.flag = null; p.cx = cx * TS + 16; p.cy = cy * TS + 16; p.queenPos = [cx * TS + 16, cy * TS + 16];
    setSpots(p, shuffleArr(freeList(cx - 6, cy - 6, cx + 6, cy + 6), rng));
  },
  crash(p, rng) {
    clearArea(p, 2, T.DIRT); const cx = p.x + (p.w >> 1), cy = p.y + (p.h >> 1) - 1;
    for (let y = cy - 1; y <= cy; y++) for (let x = cx - 2; x <= cx + 1; x++) addObj(x, y, 'planepart', { solid: 1 });
    const pl = G.objs.get(IDX(cx, cy)); pl.k = 'plane'; pl.px = cx * TS; pl.py = cy * TS;
    for (const [dx, dy] of [[-3, 2], [3, -2]]) addObj(cx + dx, cy + dy, 'fire', { solid: 0 });
    for (let i = 0; i < 8; i++) { const x = p.x + rng.int(1, p.w - 2), y = p.y + rng.int(1, p.h - 2); if (freeTile(x, y)) addObj(x, y, 'scrappile'); }
    const c = shuffleArr(freeList(cx - 5, cy - 3, cx + 4, cy + 4).filter(([x, y]) => !(y >= cy - 1 && y <= cy && x >= cx - 2 && x <= cx + 1)), rng); crateRing(p, rng, c);
    p.front = { fx: cx, fy: p.y + p.h + 1, x: cx, y: p.y + p.h }; p.flag = null; setSpots(p, shuffleArr(freeList(p.x + 1, p.y + 1, p.x + p.w - 2, p.y + p.h - 2), rng));
  },
  funfair(p, rng) {
    clearArea(p, 2, T.DIRT); const fx = p.x + 14, fy = p.y + 6, ccx = p.x + 5, ccy = p.y + 7;
    addObj(fx, fy, 'ferris', { solid: 1 }); addObj(ccx, ccy, 'carousel', { solid: 1 });
    for (const [dx, dy] of [[2, 2], [6, 2], [10, 2], [3, 11], [9, 11], [17, 11]]) if (freeTile(p.x + dx, p.y + dy)) addObj(p.x + dx, p.y + dy, rng.chance(.5) ? 'stall' : 'tent', { solid: 1 });
    for (let i = 0; i < 6; i++) { const x = p.x + rng.int(1, p.w - 2), y = p.y + rng.int(1, p.h - 2); if (freeTile(x, y)) addObj(x, y, rng.chance(.5) ? 'scrappile' : 'wreck', { ang: rng.range(0, TAU) }); }
    const c = shuffleArr(freeList(p.x + 1, p.y + 1, p.x + p.w - 2, p.y + p.h - 2).filter(([x, y]) => Math.hypot(x - fx, y - fy) > 3 && Math.hypot(x - ccx, y - ccy) > 3), rng); crateRing(p, rng, c);
    p.front = { fx: p.x + 10, fy: p.y + p.h + 1, x: p.x + 10, y: p.y + p.h }; p.flag = null; setSpots(p, shuffleArr(freeList(p.x + 1, p.y + 1, p.x + p.w - 2, p.y + p.h - 2), rng));
  },
  drivein(p, rng) {
    clearArea(p, 2, T.CONC); const sx = p.x + (p.w >> 1);
    addObj(sx - 1, p.y + 1, 'screenpart', { solid: 1 }); addObj(sx, p.y + 1, 'screen', { solid: 1 }); addObj(sx + 1, p.y + 1, 'screenpart', { solid: 1 });
    for (const y of [p.y + 5, p.y + 8, p.y + 11]) for (let x = p.x + 2; x < p.x + p.w - 2; x += 3) if (rng.chance(.68) && freeTile(x, y)) addObj(x, y, 'wreck', { ang: Math.PI / 2 + rng.range(-.25, .25) });
    addObj(p.x + p.w - 3, p.y + 2, 'stall', { solid: 1 }); addObj(p.x + 2, p.y + 2, 'fire', { solid: 0 });
    const c = shuffleArr(freeList(p.x + 1, p.y + 3, p.x + p.w - 2, p.y + p.h - 2), rng); crateRing(p, rng, c);
    p.front = { fx: p.x + 10, fy: p.y + p.h + 1, x: p.x + 10, y: p.y + p.h }; p.flag = null; setSpots(p, shuffleArr(freeList(p.x + 1, p.y + 3, p.x + p.w - 2, p.y + p.h - 2), rng));
  },
  powerplant(p, rng) {
    clearArea(p, 2, T.DIRT); const { gx } = ring(p, T.PALI, SO.WALL, 1, 3);
    const b = makeBuilding(p.x + 2, p.y + 2, 8, 6, T.CONC, rng, { roof: p.def.roof, sides: [1], style: 'plant' }); p.b = b;
    for (const [dx, dy] of [[12, 2], [15, 2], [12, 6], [15, 6]]) addObj(p.x + dx, p.y + dy, 'pylon', { solid: 1 });
    for (let i = 0; i < 3; i++) { const x = p.x + rng.int(2, p.w - 3), y = p.y + rng.int(9, p.h - 2); if (freeTile(x, y)) addObj(x, y, 'radbarrel', { solid: 1 }); }
    const tiles = shuffleArr(interiorTiles(p, b).filter(([x, y]) => G.solid[IDX(x, y)] === 0), rng); crateRing(p, rng, tiles);
    p.front = { fx: gx + 1, fy: p.y + p.h, x: gx + 1, y: p.y + p.h - 1 }; p.flag = null;
    setSpots(p, shuffleArr(freeList(p.x + 1, p.y + 8, p.x + p.w - 2, p.y + p.h - 2), rng).concat(tiles));
  },
  castle(p, rng) {
    clearArea(p, 2, T.GRASS); const { gx } = ring(p, T.WALLT, SO.WALL, 1, 3);
    for (const [x, y] of [[p.x + 1, p.y + 1], [p.x + p.w - 2, p.y + 1], [p.x + 1, p.y + p.h - 2], [p.x + p.w - 2, p.y + p.h - 2]]) addObj(x, y, 'tower', { solid: 1 });
    for (let y = p.y + 1; y < p.y + p.h - 1; y++) for (let x = p.x + 1; x < p.x + p.w - 1; x++) if (G.solid[IDX(x, y)] === 0) G.tiles[IDX(x, y)] = T.CONC;
    const b = makeBuilding(p.x + 7, p.y + 2, 8, 6, T.CONC, rng, { roof: p.def.roof, sides: [1], style: 'castle' }); p.b = b;
    p.front = { fx: gx + 1, fy: p.y + p.h, x: gx + 1, y: p.y + p.h - 1 };
    const tiles = shuffleArr(interiorTiles(p, b).filter(([x, y]) => G.solid[IDX(x, y)] === 0), rng); crateRing(p, rng, tiles);
    const cx = p.x + (p.w >> 1), cy = p.y + 12; addObj(cx, cy, 'fire', { solid: 0 });
    for (const dx of [-5, 5]) if (freeTile(cx + dx, cy - 1)) addObj(cx + dx, cy - 1, 'sandbag', { solid: 1 });
    p.flag = { tx: cx + 2, ty: cy, x: (cx + 2) * TS + 16, y: cy * TS + 16 };
    setSpots(p, shuffleArr(freeList(p.x + 1, p.y + 9, p.x + p.w - 2, p.y + p.h - 2), rng).concat(tiles));
  },
  graveyard(p, rng) {
    clearArea(p, 2, T.GRASS); const { gx } = ring(p, T.PALI, SO.WALL, 1, 3);
    for (let y = p.y + 2; y < p.y + p.h - 3; y += 2) for (let x = p.x + 2; x < p.x + p.w - 2; x += 2) { if (Math.abs(x - (p.x + (p.w >> 1))) < 2) continue; if (rng.chance(.78)) addObj(x, y, 'grave', { solid: 1, gv: rng.int(0, 2) }); }
    for (let i = 0; i < 3; i++) { const x = p.x + rng.int(1, p.w - 2), y = p.y + rng.int(1, p.h - 4); if (freeTile(x, y)) addObj(x, y, 'deadtree', {}); }
    const c = shuffleArr(freeList(p.x + 1, p.y + 1, p.x + p.w - 2, p.y + 3), rng); crateRing(p, rng, c);
    p.front = { fx: gx + 1, fy: p.y + p.h, x: gx + 1, y: p.y + p.h - 1 }; p.flag = null; setSpots(p, shuffleArr(freeList(p.x + 1, p.y + 1, p.x + p.w - 2, p.y + p.h - 2), rng));
  },
  nomads(p, rng) {
    clearArea(p, 2, T.DIRT); const cx = p.x + (p.w >> 1), cy = p.y + (p.h >> 1);
    addObj(cx, cy, 'fire', { solid: 0 });
    const ts = [[-4, -2], [4, -2], [-4, 2], [4, 2], [0, -4], [0, 4]]; ts.forEach(([dx, dy], i) => { if (freeTile(cx + dx, cy + dy)) addObj(cx + dx, cy + dy, 'tent', { solid: 1 }); });
    addObj(cx - 2, cy + 1, 'stall', { solid: 1 }); addObj(cx + 2, cy + 1, 'stall', { solid: 1 });
    p.front = { fx: p.x - 1, fy: cy, x: p.x, y: cy }; p.flag = null; p.safe = Math.hypot(p.w, p.h) * TS / 2 + 260; G.nomads = p;
    G.npcsDef.push({ id: 'nomad', name: 'Zara la nomade', role: 'trade', col: '#c0764a', x: cx + 1, y: cy - 1 });
    p.guardSpots = [[cx - 5, cy], [cx + 5, cy]]; p.zspots = [[p.cx, p.cy]];
  },
};

function buildCompound(p, rng) {
  const L = p.type === 'legion';
  for (let ty = p.y - 2; ty < p.y + p.h + 2; ty++) for (let tx = p.x - 2; tx < p.x + p.w + 2; tx++) {
    const edge = tx < p.x || ty < p.y || tx >= p.x + p.w || ty >= p.y + p.h;
    setTile(tx, ty, edge && (tx < p.x - 1 || ty < p.y - 1 || tx > p.x + p.w || ty > p.y + p.h) ? G.tiles[IDX(tx, ty)] : T.DIRT, 0);
  }
  // clôture
  const gaps = [{ s: 0, o: rng.int(3, p.w - 5) }, { s: 3, o: rng.int(3, p.h - 5) }];
  const isGap = (side, i) => gaps.some(g => g.s === side && i >= g.o && i < g.o + 3);
  for (let i = 0; i < p.w; i++) {
    if (!isGap(0, i)) { setTile(p.x + i, p.y, T.PALI, SO.OBJ); }
    setTile(p.x + i, p.y + p.h - 1, T.PALI, SO.OBJ);
  }
  for (let j = 0; j < p.h; j++) {
    setTile(p.x, p.y + j, T.PALI, SO.OBJ);
    if (!isGap(3, j)) setTile(p.x + p.w - 1, p.y + j, T.PALI, SO.OBJ);
  }
  p.front = { fx: p.x + gaps[0].o + 1, fy: p.y - 1, x: p.x + gaps[0].o + 1, y: p.y };
  // tentes / sacs de sable
  const spots = [];
  for (let ty = p.y + 2; ty < p.y + p.h - 2; ty++) for (let tx = p.x + 2; tx < p.x + p.w - 2; tx++) spots.push([tx, ty]);
  for (let i = spots.length - 1; i > 0; i--) { const j = rng.int(0, i); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  const ccx = p.x + (p.w >> 1), ccy = p.y + (p.h >> 1);
  const used = (tx, ty) => Math.abs(tx - ccx) < 2 && Math.abs(ty - ccy) < 2;
  let nt = 0;
  while (nt < (L ? 5 : 4) && spots.length) { const [tx, ty] = spots.pop(); if (used(tx, ty) || G.objs.has(IDX(tx, ty))) continue; addObj(tx, ty, L ? 'sandbag' : 'tent', { solid: 1 }); nt++; }
  // feu central + caisses
  addObj(ccx, ccy, 'fire', { solid: 0 });
  const nC = rng.int(p.def.n_c[0], p.def.n_c[1]);
  for (let i = 0; i < nC && spots.length; i++) { const [tx, ty] = spots.pop(); if (used(tx, ty) || G.objs.has(IDX(tx, ty))) { i--; continue; } addCrate(p, tx, ty, rng, p.def.loot); }
  p.flag = { tx: ccx + 2, ty: ccy, x: (ccx + 2) * TS + 16, y: ccy * TS + 16 };
  p.zspots = spots.slice(-12).map(([tx, ty]) => [tx * TS + 16, ty * TS + 16]);
  if (!p.zspots.length) p.zspots = [[p.cx, p.cy]];
}

function buildVillage(p, rng) {
  for (let ty = p.y - 2; ty < p.y + p.h + 2; ty++) for (let tx = p.x - 2; tx < p.x + p.w + 2; tx++) setTile(tx, ty, T.DIRT, 0);
  const gapy = p.y + (p.h >> 1) - 1;
  for (let i = 0; i < p.w; i++) { setTile(p.x + i, p.y, T.PALI, SO.WALL); setTile(p.x + i, p.y + p.h - 1, T.PALI, SO.WALL); }
  for (let j = 0; j < p.h; j++) {
    if (j < gapy - p.y || j > gapy - p.y + 2) { setTile(p.x, p.y + j, T.PALI, SO.WALL); setTile(p.x + p.w - 1, p.y + j, T.PALI, SO.WALL); }
  }
  p.front = { fx: p.x - 1, fy: gapy + 1, x: p.x, y: gapy + 1 };
  // maisons
  const hs = [[p.x + 2, p.y + 2], [p.x + 9, p.y + 2], [p.x + 15, p.y + 2], [p.x + 2, p.y + p.h - 7], [p.x + 15, p.y + p.h - 7]];
  for (const [hx, hy] of hs) {
    const b = makeBuilding(hx, hy, 5, 5, T.FLOOR, rng, { roof: '#7a5a3a', sides: [hy < p.y + 5 ? 1 : 0] });
    const ts = interiorTiles(p, b); if (ts.length) { const [tx, ty] = ts[0]; addObj(tx, ty, 'furn', { solid: 1, fv: 1 }); }
  }
  const ccx = p.x + (p.w >> 1), ccy = p.y + (p.h >> 1);
  addObj(ccx, ccy, 'fire', { solid: 0 });
  addObj(ccx - 4, ccy - 1, 'stall', { solid: 1 }); addObj(ccx + 4, ccy - 1, 'stall', { solid: 1 }); addObj(ccx - 4, ccy + 2, 'stall', { solid: 1 });
  for (let i = 0; i < 6; i++) { const tx = ccx - 3 + i, ty = p.y + p.h - 4; if (G.solid[IDX(tx, ty)] === 0) setTile(tx, ty, T.DIRT, 0); }
  p.flag = null;
  p.safe = Math.hypot(p.w, p.h) * TS / 2 + 380;
  G.village = p;
  G.npcsDef = [
    { id: 'mara', name: 'Capitaine Mara', role: 'quest', col: '#4a7ab0', x: ccx + 1, y: ccy - 2 },
    { id: 'jonas', name: 'Jonas le marchand', role: 'trade', col: '#b08a3a', x: ccx - 3, y: ccy },
    { id: 'doc', name: 'Docteur Lin', role: 'doc', col: '#e0e0e0', x: ccx + 3, y: ccy + 1 },
  ];
  p.discovered = false;
  p.guardSpots = [[p.x + 2, p.y + 6], [p.x + p.w - 3, p.y + 6], [p.x + 3, p.y + p.h - 3], [p.x + p.w - 3, p.y + p.h - 3], [ccx, ccy + 4]];
}

function carveRoads(rng) {
  const vill = G.village; if (!vill) return;
  const connected = [vill]; const rest = G.pois.filter(p => p !== vill && p.front);
  const carve = (ax, ay, bx, by) => {
    let x = ax, y = ay;
    const dirH = rng.chance(.5);
    const stepTo = (tx, ty) => {
      while (x !== tx || y !== ty) {
        if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y);
        for (let k = 0; k < 2; k++) {
          for (const [ux, uy] of [[x, y + k], [x + k, y]]) {
            if (!inb(ux, uy)) continue;
            const i = IDX(ux, uy);
            if (G.reserve[i] && (G.tiles[i] === T.WALLT || G.tiles[i] === T.PALI || G.tiles[i] === T.FLOOR)) continue;
            if (G.tiles[i] === T.FLOOR || G.tiles[i] === T.WALLT || G.tiles[i] === T.PALI || G.fp[i]) continue;
            if (G.solid[i] === SO.WALL || G.solid[i] === SO.OBJ && G.objs.has(i)) continue;
            G.tiles[i] = T.ROAD; G.solid[i] = 0;
          }
        }
      }
    };
    if (dirH) { stepTo(bx, ay); stepTo(bx, by); } else { stepTo(ax, by); stepTo(bx, by); }
  };
  while (rest.length) {
    let best = null, bd = 1e9, bc = null;
    for (const p of rest) for (const c of connected) { const d = dist(p.front.fx, p.front.fy, c.front.fx, c.front.fy); if (d < bd) { bd = d; best = p; bc = c; } }
    carve(best.front.fx, best.front.fy, bc.front.fx, bc.front.fy);
    connected.push(best); rest.splice(rest.indexOf(best), 1);
  }
  // route de départ vers le village
  carve(G.spawn.x / TS | 0, G.spawn.y / TS | 0, vill.front.fx, vill.front.fy);
}

function scatterObjects(rng) {
  const W = G.W, H = G.H, sx = G.spawn.x / TS, sy = G.spawn.y / TS, st = WORLD_STYLES[G.style] || WORLD_STYLES.balanced, kT = st.trees, kR = st.rocks, kW = st.wrecks;
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = y * W + x, t = G.tiles[i];
    if (G.solid[i] || G.objs.has(i) || G.reserve[i]) continue;
    if (Math.hypot(x - sx, y - sy) < 4) continue;
    const r = rng.next() * (t === T.FOREST ? 1.2 : 2.1), cl = vnoise(x / 3.5, y / 3.5, G.seed + 9);
    if (t === T.ROAD) { if (r < .012 * kW) addObj(x, y, 'wreck', { ang: rng.range(0, TAU) }); else if (r < .02) addObj(x, y, 'scrappile'); continue; }
    if (t === T.FOREST) {
      const dens = Math.min(.6, (.22 + cl * .35) * kT);
      if (r < dens) addObj(x, y, 'tree');
      else if (r < dens + .02) addObj(x, y, 'bush');
      else if (r < dens + .035) addObj(x, y, 'herb');
      else if (r < dens + .035 + .008 * kR) addObj(x, y, 'rock');
    } else if (t === T.GRASS) {
      if (r < (.03 + (cl > .62 ? .12 : 0)) * kT) addObj(x, y, 'tree');
      else if (r < .047) addObj(x, y, 'bush');
      else if (r < .058) addObj(x, y, 'herb');
      else if (r < .058 + .012 * kR) addObj(x, y, 'rock');
      else if (r < .0725 + .012 * kR) addObj(x, y, 'scrappile');
    } else if (t === T.DIRT) {
      if (r < .05 * kR) addObj(x, y, 'rock'); else if (r < .05 * kR + .015) addObj(x, y, 'deadtree'); else if (r < .05 * kR + .015 + .004 * kW) addObj(x, y, 'wreck', { ang: rng.range(0, TAU) });
    } else if (t === T.SAND) {
      if (r < .012) addObj(x, y, 'deadtree'); else if (r < .012 + .008 * kR) addObj(x, y, 'rock');
    }
  }
}

function randomLandTile(rng, minD, maxD) {
  const cx = G.W / 2, cy = G.H / 2, f = wScale(); minD *= f; maxD *= f;
  for (let k = 0; k < 400; k++) {
    const a = rng.range(0, TAU), d = rng.range(minD, maxD);
    const tx = Math.round(cx + Math.cos(a) * d), ty = Math.round(cy + Math.sin(a) * d);
    if (inb(tx, ty) && freeTile(tx, ty) && G.tiles[IDX(tx, ty)] !== T.WATER && !G.reserve[IDX(tx, ty)]) return [tx, ty];
  }
  return null;
}

function spawnAnimals(rng) {
  G.mobs = G.mobs || [];
  const mk = (t, n, d0, d1) => { for (let i = 0; i < n; i++) { const p = randomLandTile(rng, d0, d1); if (p) G.mobsInit.push({ t, x: p[0] * TS + 16, y: p[1] * TS + 16 }); } };
  G.mobsInit = [];
  const q = wScale() * wScale(); mk('rabbit', Math.round(17 * q), 4, 60); mk('deer', Math.round(9 * q), 8, 62); mk('boar', Math.round(7 * q), 10, 62); mk('wolf', Math.round(7 * q), 16, 64); mk('spider', Math.max(3, Math.round(6 * q)), 22, 64); mk('scorpion', Math.max(3, Math.round(6 * q)), 22, 64); mk('hound', Math.max(3, Math.round(5 * q)), 42, 64); mk('bear', Math.max(2, Math.round(3 * q)), 46, 66);
}

function buildStartCamp(rng) {
  const sx = G.spawn.x / TS | 0, sy = G.spawn.y / TS | 0;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const tx = sx + dx, ty = sy + dy, i = IDX(tx, ty);
    if (G.tiles[i] === T.WATER) setTile(tx, ty, T.GRASS, 0);
    const o = G.objs.get(i); if (o) removeObj(o);
    if (G.tiles[i] !== T.ROAD && Math.hypot(dx, dy) < 3.2) G.tiles[i] = T.DIRT;
  }
  G.startCamp = { tx: sx, ty: sy };
  const p = { id: G.pois.length, type: 'start', name: 'Votre point de départ', x: sx - 2, y: sy - 2, w: 5, h: 5, cx: sx * TS + 16, cy: sy * TS + 16, crates: [], mobs: [], def: {}, spawned: true, cleared: true, discovered: true, hidden: true };
  addCrate(p, sx + 2, sy - 1, rng, 'start', null);
  G.pois.push(p); G.startPOI = p;
  G.startCrate = p.crates[0];
  p.crates[0].gear = [{ kind: 'w', id: 'pistol' }];
  p.crates[0].loot.a9 = (p.crates[0].loot.a9 || 0) + 24; p.crates[0].loot.bandage = 2;
  G.campfireStart = { tx: sx, ty: sy };
}

// ===== Zones radioactives =====
function genRadZones(rng) {
  G.radZones = []; const fake = { id: -2, crates: [] };
  for (let k = 0; k < Math.max(3, Math.round(5 * wScale() * wScale())); k++) {
    for (let tries = 0; tries < 800; tries++) {
      const t = randomLandTile(rng, 20, 64); if (!t) continue;
      const rt = rng.int(5, 8), tx = t[0], ty = t[1];
      let ok = true;
      for (const p of G.pois) if (dist(tx, ty, p.cx / TS, p.cy / TS) < Math.max(p.w, p.h) / 2 + rt + 1) ok = false;
      for (const z of G.radZones) if (dist(tx, ty, z.x / TS, z.y / TS) < rt + z.r / TS + 4) ok = false;
      if (!ok) continue;
      const z = { id: k, x: tx * TS + 16, y: ty * TS + 16, r: rt * TS, p: rng.range(1.6, 2.6), discovered: false };
      G.radZones.push(z);
      for (let y = ty - rt; y <= ty + rt; y++) for (let x = tx - rt; x <= tx + rt; x++) {
        if (!inb(x, y)) continue; const d = Math.hypot(x - tx, y - ty); if (d > rt) continue;
        const i = IDX(x, y); if (G.reserve[i]) continue;
        const o = G.objs.get(i); if (o && (o.k === 'tree' || o.k === 'bush' || o.k === 'herb')) removeObj(o);
        if (G.tiles[i] === T.GRASS || G.tiles[i] === T.FOREST) G.tiles[i] = T.DIRT;
        if (G.solid[i] === 0 && !G.objs.has(i) && G.tiles[i] !== T.WATER && d > 1.5) {
          const r = rng.next();
          if (r < .035) addObj(x, y, 'radbarrel', { solid: 1 }); else if (r < .06) addObj(x, y, 'deadtree'); else if (r < .075) addObj(x, y, 'wreck', { ang: rng.range(0, TAU) });
        }
      }
      for (let c = 0; c < 2; c++) { for (let q = 0; q < 30; q++) { const cx = tx + rng.int(-2, 2), cy = ty + rng.int(-2, 2); if (freeTile(cx, cy)) { addCrate(fake, cx, cy, rng, 'rad', null); break; } } }
      G.mobsInit.push({ t: 'hound', x: z.x + 60, y: z.y }, { t: 'ghoul', x: z.x - 60, y: z.y + 40 }, { t: 'ghoul', x: z.x + 20, y: z.y - 70 }, { t: 'ghoul', x: z.x - 40, y: z.y - 30 }); if (rng.chance(.5)) G.mobsInit.push({ t: 'bear', x: z.x, y: z.y - 80 });
      break;
    }
  }
}
function radAt(x, y) {
  let lv = 0;
  for (const z of G.radZones) { const d = dist(x, y, z.x, z.y); if (d < z.r) lv = Math.max(lv, .5 + (1 - d / z.r) * z.p); }
  return lv;
}

// ===== Véhicules =====
function genVehicles(rng) {
  G.vehicles = [];
  const mk = (x, y, fuelFrac) => { const t = rng.wpick([['moto', 40], ['car', 40], ['truck', 20]]); const v = newVehicle(t, x, y); v.ang = rng.range(0, TAU); v.fuel = v.def.fuel * (fuelFrac === undefined ? rng.range(.15, .55) : fuelFrac); v.hp = v.maxhp * rng.range(.5, 1); G.vehicles.push(v); return v; };
  const okAt = (x, y, r) => !collide(x, y, r, false);
  // à côté du camp de départ : une moto
  const sx = G.spawn.x, sy = G.spawn.y;
  for (let k = 0; k < 40; k++) { const x = sx + rng.range(-160, 160), y = sy + rng.range(100, 220); if (okAt(x, y, 18)) { const v = newVehicle('moto', x, y); v.fuel = v.def.fuel * .3; v.hp = v.maxhp * .8; v.ang = rng.range(0, TAU); G.vehicles.push(v); break; } }
  // le long des routes
  let n = 0; const maxV = Math.max(5, Math.round(9 * wScale() * wScale())); for (let tries = 0; tries < 4000 && n < maxV; tries++) { const tx = rng.int(4, G.W - 5), ty = rng.int(4, G.H - 5); if (G.tiles[IDX(tx, ty)] !== T.ROAD) continue; const x = tx * TS + 16, y = ty * TS + 16; if (!okAt(x, y, 22)) continue; if (G.vehicles.some(v => dist(v.x, v.y, x, y) < 400)) continue; mk(x, y); n++; }
  // stations-service et fermes
  for (const p of G.pois) if ((p.type === 'gas' || p.type === 'farm') && p.front) {
    for (let k = 0; k < 20; k++) { const x = (p.front.fx + rng.int(-5, 5)) * TS + 16, y = (p.front.fy + rng.int(-5, 5)) * TS + 16; if (okAt(x, y, 22) && !G.vehicles.some(v => dist(v.x, v.y, x, y) < 100)) { mk(x, y); break; } }
  }
  // camion de pompiers dans la caserne
  for (const p of G.pois) if (p.type === 'firestation' && p.b) { const d = p.b.doors[0]; const x = (d.x + (d.s === 2 ? 4 : d.s === 3 ? -4 : 1.5)) * TS + 16, y = (d.y + (d.s === 0 ? 4 : d.s === 1 ? -4 : 1.5)) * TS + 16; if (okAt(x, y, 24)) { const v = newVehicle('truck', x, y); v.col = '#a02a2a'; v.fuel = v.def.fuel * .5; v.hp = v.maxhp * .9; v.ang = d.s < 2 ? (d.s === 1 ? -Math.PI / 2 : Math.PI / 2) : (d.s === 2 ? 0 : Math.PI); G.vehicles.push(v); } }
  // près du village
  const v0 = G.village; if (v0) for (let k = 0; k < 30; k++) { const x = (v0.front.fx - 4 + rng.int(-2, 2)) * TS, y = (v0.front.fy + rng.int(-4, 4)) * TS; if (okAt(x, y, 22)) { const v = newVehicle('car', x, y); v.fuel = v.def.fuel * .35; v.hp = v.maxhp * .7; G.vehicles.push(v); break; } }
}

// ===== Aperçu du monde (écran titre) : génère un monde complet dans un état temporaire =====
function previewWorld(seed, opts, cv) {
  const prev = G; const sz = (WORLD_SIZES[opts.size] || WORLD_SIZES.M).v;
  G = { W: sz, H: sz, seed, style: opts.style, dens: opts.dens, nextCrate: 0, nextVid: 0, mobsInit: [] };
  try {
    genWorld(seed);
    const S = cv.width, k = S / sz, c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    const img = c.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = Math.floor(y / k) * sz + Math.floor(x / k), t = G.tiles[i]; let col = MINICOL[t] || '#444';
      if (t === T.WATER) { const sd = G.shore[i]; col = sd <= 1 ? '#3a78a8' : sd <= 3 ? '#2a5a8a' : '#1e4470'; }
      const o = G.objs.get(i); if (o && (o.k === 'tree')) col = '#24481e';
      const v = parseInt(col.slice(1), 16), j = (y * S + x) * 4; img.data[j] = v >> 16 & 255; img.data[j + 1] = v >> 8 & 255; img.data[j + 2] = v & 255; img.data[j + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    for (const p of G.pois) { if (p.hidden) continue; const col = p.type === 'village' ? '#5f8' : (p.type === 'camp' || p.type === 'legion') ? '#f55' : p.type === 'house' || p.type === 'cabin' ? '#c8b080' : '#8ac'; c.fillStyle = col; const r = p.type === 'village' ? 4 : (p.w > 10 ? 3 : 2); c.fillRect(p.cx / TS * k - r, p.cy / TS * k - r, r * 2, r * 2); }
    for (const z of G.radZones) { c.strokeStyle = '#9aff4a'; c.lineWidth = 1; c.beginPath(); c.arc(z.x / TS * k, z.y / TS * k, z.r / TS * k, 0, TAU); c.stroke(); }
    c.fillStyle = '#ff0'; c.beginPath(); c.arc(G.spawn.x / TS * k, G.spawn.y / TS * k, 3, 0, TAU); c.fill();
    return { pois: G.pois.length, zones: G.radZones.length, vehicles: G.vehicles.length };
  } finally { G = prev; }
}
