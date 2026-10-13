'use strict';
// ===== Génération du monde, collisions, pathfinding =====
const T = { GRASS: 0, FOREST: 1, SAND: 2, WATER: 3, ROAD: 4, DIRT: 5, FLOOR: 6, CONC: 7, WALLT: 8, PALI: 9, TILE: 10 };
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
const WORLD_SIZES = { S: { n: 'Petit', v: 110 }, M: { n: 'Moyen', v: 150 }, L: { n: 'Grand', v: 200 } };
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
  G.tiles = new Uint8Array(N); G.solid = new Uint8Array(N); G.reserve = new Uint8Array(N); G.moist = new Float32Array(N);
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

function placePOIs(rng) {
  const W = G.W, H = G.H, cx = W / 2, cy = H / 2;
  const f = wScale(), dk = (WORLD_DENS[G.dens] || WORLD_DENS[1]).k, order = [['village', 1]];
  const UNIQ = { hospital: 1, police: 1, bunker: 1, legion: 1, radio: 1, market: 1, warehouse: 1, camp: 2, farm: 1, gas: 1 };
  for (const k of ['hospital', 'police', 'market', 'warehouse', 'bunker', 'legion', 'camp', 'radio', 'farm', 'gas', 'cabin', 'house']) {
    const n = Math.max(UNIQ[k] || 4, Math.round(POICOUNT[k] * f * f * dk * (f < 1 ? 1.25 : 1)));
    for (let i = 0; i < n; i++) order.push([k, 1]);
  }
  const rng_d = { village: [26, 34], hospital: [24, 55], police: [18, 50], market: [20, 55], warehouse: [26, 60], bunker: [46, 64], legion: [44, 64], camp: [24, 58], radio: [34, 62], farm: [16, 60], gas: [12, 60], cabin: [14, 62], house: [8, 64] };
  let id = 0;
  for (const [type] of order) {
    const def = POITYPES[type]; let placed = false;
    for (let tries = 0; tries < 900; tries++) {
      const [w, h] = def.size; let [d0, d1] = rng_d[type]; d0 *= f; d1 *= f;
      if (tries > 450) { d0 = Math.max(6, d0 * .6); d1 = Math.min(W / 2 - 9, d1 * 1.2); }
      const a = rng.range(0, TAU), d = rng.range(d0, d1);
      const x = Math.round(cx + Math.cos(a) * d - w / 2), y = Math.round(cy + Math.sin(a) * d - h / 2);
      if (!rectFree(x, y, w, h, tries > 600 ? 2 : (type === 'house' || type === 'cabin' ? 1 : 3))) continue;
      if (type === 'cabin') { const m = G.moist[(y + (h >> 1)) * W + x + (w >> 1)]; if (m < .5 && tries < 300) continue; }
      const p = { id: id++, type, name: def.n, x, y, w, h, cx: (x + w / 2) * TS, cy: (y + h / 2) * TS, spawned: false, cleared: false, owned: false, discovered: false, lvl: 1, mobs: [], crates: [], hpFlag: 0, stash: null, chest: null, def };
      for (let ty = y - 2; ty < y + h + 2; ty++) for (let tx = x - 2; tx < x + w + 2; tx++) G.reserve[IDX(tx, ty)] = 1;
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
  const b = { x, y, w, h, roof: opts.roof || '#666', a: 1, doors };
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
  const floorT = (t === 'house' || t === 'cabin' || t === 'farm') ? T.FLOOR : T.CONC;
  // terrain autour
  for (let ty = p.y - 3; ty < p.y + p.h + 3; ty++) for (let tx = p.x - 3; tx < p.x + p.w + 3; tx++) {
    const apron = (t === 'house' || t === 'cabin') ? T.DIRT : (t === 'farm' ? T.DIRT : T.CONC);
    if (tx >= p.x - 2 && tx < p.x + p.w + 2 && ty >= p.y - 2 && ty < p.y + p.h + 2) setTile(tx, ty, t === 'cabin' ? T.FOREST : apron, 0);
  }
  const big = p.w >= 11;
  const b = makeBuilding(p.x, p.y, p.w, p.h, floorT, rng, { roof: def.roof, sides: big ? [rng.int(0, 1), rng.int(2, 3)] : [rng.int(0, 3)], partition: big && p.w >= 13 });
  p.b = b; p.front = b.doors[0];
  const tiles = interiorTiles(p, b);
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
  for (let i = 0; i < Math.floor(tiles.length / 14); i++) { const [tx, ty] = tiles.pop(); addObj(tx, ty, 'furn', { solid: 1, fv: rng.int(0, 2) }); }
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
            if (G.tiles[i] === T.FLOOR || G.tiles[i] === T.WALLT || G.tiles[i] === T.PALI) continue;
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
    const r = rng.next(), cl = vnoise(x / 3.5, y / 3.5, G.seed + 9);
    if (t === T.ROAD) { if (r < .012 * kW) addObj(x, y, 'wreck', { ang: rng.range(0, TAU) }); else if (r < .02) addObj(x, y, 'scrappile'); continue; }
    if (t === T.FOREST) {
      const dens = Math.min(.7, (.22 + cl * .35) * kT);
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
  const q = wScale() * wScale(); mk('rabbit', Math.round(26 * q), 4, 60); mk('deer', Math.round(14 * q), 8, 62); mk('boar', Math.round(12 * q), 10, 62); mk('wolf', Math.round(12 * q), 16, 64); mk('hound', Math.max(3, Math.round(5 * q)), 42, 64); mk('bear', Math.max(2, Math.round(3 * q)), 46, 66);
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
      G.mobsInit.push({ t: 'hound', x: z.x + 60, y: z.y }, { t: 'hound', x: z.x - 60, y: z.y + 40 }); if (rng.chance(.5)) G.mobsInit.push({ t: 'bear', x: z.x, y: z.y - 80 });
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
