'use strict';
// ===== Véhicules : moto, voiture, camion =====
const VEH = {
  moto:  { n: 'Moto', i: '🏍️', r: 10, hp: 120, fuel: 45, max: 340, acc: 340, steer: 3.3, len: 34, wid: 12, closed: false, ram: .35, rate: .55, cols: ['#b03030', '#2f5fb0', '#2c2c30', '#c8a020'] },
  car:   { n: 'Voiture', i: '🚗', r: 16, hp: 280, fuel: 90, max: 310, acc: 250, steer: 2.5, len: 50, wid: 27, closed: true, ram: .5, rate: 1, cols: ['#a83232', '#3a6a9a', '#7a7a80', '#3a7a4a', '#c0b040'] },
  truck: { n: 'Camion', i: '🛻', r: 21, hp: 480, fuel: 150, max: 245, acc: 175, steer: 1.9, len: 66, wid: 34, closed: true, ram: .85, rate: 1.5, cols: ['#6a5a3a', '#4a5a4a', '#8a3a2a', '#556070'] },
};
function newVehicle(t, x, y) {
  const d = VEH[t];
  return { id: 'v' + (G.nextVid = (G.nextVid || 0) + 1), t, def: d, x, y, ang: 0, v: 0, hp: d.hp, maxhp: d.hp, fuel: d.fuel * .3, maxfuel: d.fuel, stash: {}, col: d.cols[Math.floor(hash2(x | 0, y | 0, 7) * d.cols.length)], r: d.r, smokeT: 0 };
}
function nearestVehicle(x, y, range) {
  let b = null, bd = range; for (const v of G.vehicles) { const d = dist(x, y, v.x, v.y); if (d < bd) { bd = d; b = v; } } return b;
}
function enterVehicle(v) {
  if (Math.abs(v.v) > 50) { msg('Le véhicule roule encore.', '#e0a050'); return; }
  P.veh = v; v.driver = true; P.reloading = false; G.buildMode = false; refreshBuildBar();
  msg(v.def.n + ' : ZQSD/WASD conduire · Maj frein à main · E descendre · X entretien / coffre', '#9fe8ff'); SFX.play('reload');
  if (v.fuel <= 0) msg('Réservoir vide ! Ajoutez du carburant (X).', '#ff9a8a');
}
function exitVehicle() {
  const v = P.veh; if (!v) return;
  const base = v.ang + Math.PI / 2;
  for (let k = 0; k < 16; k++) {
    const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * .4, d = v.def.r + 18;
    const x = v.x + Math.cos(a) * d, y = v.y + Math.sin(a) * d;
    if (!collide(x, y, 10, true)) { P.x = x; P.y = y; break; }
  }
  v.driver = false; P.veh = null; SFX.play('click');
}
function vehicleDamage(v, d) {
  if (v.dead) return; v.hp -= d;
  if (v.hp <= 0) destroyVehicle(v);
}
function destroyVehicle(v) {
  v.dead = true;
  if (P.veh === v) { P.veh = null; P.x = v.x + 30; P.y = v.y; if (collide(P.x, P.y, 10, true)) { P.x = v.x; P.y = v.y; } }
  explode(v.x, v.y, 110, 85, { team: 'f', cause: 'l\'explosion de votre véhicule', fire: 1 });
  for (const k in v.stash) dropPickup(v.x + rnd(-20, 20), v.y + rnd(-20, 20), k, v.stash[k]);
  const i = G.vehicles.indexOf(v); if (i >= 0) G.vehicles.splice(i, 1);
  msg('Votre véhicule a explosé !', '#ff6a5a');
}
function terrainGrip(x, y) {
  const t = G.tiles[IDX(Math.floor(x / TS), Math.floor(y / TS))];
  return t === T.ROAD ? 1.08 : t === T.GRASS ? .88 : t === T.DIRT ? .85 : t === T.SAND ? .72 : t === T.FOREST ? .68 : t === T.CONC || t === T.FLOOR ? .9 : .8;
}

function driveVehicle(dt) {
  const v = P.veh, d = v.def, k = G.keys;
  const thr = (k.w ? 1 : 0) - (k.s ? 1 : 0), st = (k.d ? 1 : 0) - (k.a ? 1 : 0);
  const grip = terrainGrip(v.x, v.y), hpMul = v.hp < v.maxhp * .3 ? .75 : 1;
  const maxF = v.fuel > 0 ? d.max * grip * hpMul : 0, maxR = maxF * .35;
  if (thr > 0 && v.fuel > 0) { v.v += d.acc * dt * (v.v < 0 ? 2.2 : 1); }
  else if (thr < 0 && v.fuel > 0) { v.v -= d.acc * (v.v > 0 ? 1.9 : .8) * dt; }
  else { const f = (70 + Math.abs(v.v) * .35) * dt; v.v = Math.abs(v.v) <= f ? 0 : v.v - Math.sign(v.v) * f; }
  if (k.shift) { const f = d.acc * 2.6 * dt; v.v = Math.abs(v.v) <= f ? 0 : v.v - Math.sign(v.v) * f; }
  if (v.v > maxF) v.v -= (v.v - maxF) * Math.min(1, 3 * dt);
  if (v.v < -maxR) v.v = -maxR;
  // direction
  const sp = Math.abs(v.v), steerFac = clamp(sp / 80, 0, 1) * (1 - .4 * sp / d.max) * (k.shift ? 1.5 : 1);
  v.ang += st * d.steer * steerFac * Math.sign(v.v || 1) * dt;
  // déplacement + collisions
  let hit = false;
  const cr = d.r * .85, dx = Math.cos(v.ang) * v.v * dt, dy = Math.sin(v.ang) * v.v * dt;
  const nx = clamp(v.x + dx, 24, G.W * TS - 24), ny = clamp(v.y + dy, 24, G.H * TS - 24);
  if (!collide(nx, v.y, cr, false)) v.x = nx; else hit = true;
  if (!collide(v.x, ny, cr, false)) v.y = ny; else hit = true;
  if (hit && sp > 40) {
    const fx = v.x + Math.cos(v.ang) * Math.sign(v.v) * (cr + 8), fy = v.y + Math.sin(v.ang) * Math.sign(v.v) * (cr + 8);
    const s = G.structs.get(IDX(Math.floor(fx / TS), Math.floor(fy / TS)));
    if (s) damageStruct(s, sp * .9);
    if (sp > 120) { const dmg = (sp - 110) * .2; vehicleDamage(v, dmg); if (!v.dead) { hurtPlayer(dmg * .12, { pure: true, cause: 'un accident', ignoreVeh: 1 }); shake(Math.min(9, sp / 40)); SFX.play('thud', .8); for (let i = 0; i < 6; i++) addPart(fx, fy, rnd(-90, 90), rnd(-90, 90), .4, 2, '#bbb'); } }
    v.v *= -.25;
  }
  if (v.dead) return;
  // écraser les ennemis
  if (sp > 80) {
    const fx = v.x + Math.cos(v.ang) * Math.sign(v.v) * d.r * .5, fy = v.y + Math.sin(v.ang) * Math.sign(v.v) * d.r * .5;
    for (const m of G.mobs) {
      if (m.dead || m.def.fac === 'wild' && m.def.ai === 'prey' && false) continue;
      if (dist(fx, fy, m.x, m.y) < d.r + m.r) {
        const dmg = sp * d.ram * 1.1 + 10; hurtMob(m, dmg, { kind: 'blast', ang: v.ang, kb: 140, src: 'p' });
        if (m.def.fac !== 'wild' || m.hp <= 0) { const slow = m.dead ? .97 : .88 - Math.min(.2, m.r / 120); v.v *= slow; } else v.v *= .93;
        vehicleDamage(v, Math.min(25, 2 + m.maxhp * .015)); SFX.play('thud', .9); shake(3);
      }
    }
  }
  // carburant
  const use = (d.rate * (sp / d.max) + .04) * dt * (G.diff === 2 ? 1.2 : 1); v.fuel = Math.max(0, v.fuel - use);
  if (v.fuel > 0 && v.fuel < 8 && !v.warnF) { msg('⛽ Réserve de carburant !', '#ff9a8a'); v.warnF = true; } if (v.fuel > 12) v.warnF = false;
  G.stats.driven = (G.stats.driven || 0) + sp * dt;
  questCheckSoon();
  P.x = v.x; P.y = v.y; P.vx = P.vy = 0; P.moving = false; P.sprint = false;
  // bruit / son
  P.noiseT -= dt; if (P.noiseT <= 0) { P.noiseT = .5; makeNoise(v.x, v.y, 220 + sp * 1.3, true); }
  v.engT = (v.engT || 0) - dt; if (v.engT <= 0 && v.fuel > 0) { v.engT = .11; SFX.play('engine', .25 + sp / d.max * .35, sp / d.max); }
  // traces
  if (sp > 60 && Math.random() < dt * 14) addPart(v.x - Math.cos(v.ang) * d.len / 2, v.y - Math.sin(v.ang) * d.len / 2, rnd(-20, 20), rnd(-20, 20), .5, rnd(2, 4), v.col === '#2c2c30' ? '#888' : '#a89a80', 'dot');
  if (k.shift && sp > 120 && Math.random() < dt * 20) addDecal(v.x, v.y, 3, '#222');
}

function updateVehicles(dt) {
  for (let i = G.vehicles.length - 1; i >= 0; i--) {
    const v = G.vehicles[i];
    if (v.dead) { G.vehicles.splice(i, 1); continue; }
    if (v !== P.veh && Math.abs(v.v) > 1) { // inertie
      const f = 160 * dt; v.v = Math.abs(v.v) <= f ? 0 : v.v - Math.sign(v.v) * f;
      const nx = v.x + Math.cos(v.ang) * v.v * dt, ny = v.y + Math.sin(v.ang) * v.v * dt; if (!collide(nx, ny, v.r * .85, false)) { v.x = nx; v.y = ny; } else v.v = 0;
    }
    if (v.hp < v.maxhp * .35) { v.smokeT -= dt; if (v.smokeT <= 0) { v.smokeT = v.hp < v.maxhp * .15 ? .05 : .13; addPart(v.x + Math.cos(v.ang) * v.def.len * .3, v.y + Math.sin(v.ang) * v.def.len * .3, rnd(-12, 12), rnd(-45, -20), rnd(.6, 1.1), rnd(3, 6), v.hp < v.maxhp * .15 ? '#e07a20' : '#555', 'fire'); } }
    if (v.hp < v.maxhp * .1 && v !== P.veh) { v.hp -= dt * 2; if (v.hp <= 0) destroyVehicle(v); }
  }
}

// ----- Dessin -----
function drawVehicle(c, v, time) {
  const d = v.def, L = d.len, W = d.wid;
  c.save(); c.translate(v.x, v.y); c.rotate(v.ang);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(3, 4, L * .55, W * .55, 0, 0, TAU); c.fill();
  const dmg = v.hp / v.maxhp;
  if (v.t === 'moto') {
    c.fillStyle = '#111'; rrect(c, -L / 2, -3, L * .3, 6, 3); c.fill(); rrect(c, L / 2 - L * .3, -3, L * .3, 6, 3); c.fill();
    c.fillStyle = v.col; rrect(c, -L * .28, -W * .3, L * .56, W * .6, 4); c.fill();
    c.fillStyle = '#222'; c.fillRect(L * .12, -W * .55, 4, W * 1.1);
    c.fillStyle = '#ffe9a0'; c.beginPath(); c.arc(L / 2 - 1, 0, 3, 0, TAU); c.fill();
  } else {
    c.fillStyle = '#111'; for (const [wx, wy] of [[-L * .3, -W / 2 - 1], [L * .3, -W / 2 - 1], [-L * .3, W / 2 - 3], [L * .3, W / 2 - 3]]) c.fillRect(wx - 6, wy, 12, 4);
    c.fillStyle = v.col; rrect(c, -L / 2, -W / 2, L, W, 6); c.fill();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-L / 2, -W / 2, L, 3); c.fillRect(-L / 2, W / 2 - 3, L, 3);
    if (v.t === 'truck') { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-L / 2 + 3, -W / 2 + 4, L * .5, W - 8); c.fillStyle = v.col; c.fillRect(-L / 2 + 5, -W / 2 + 6, L * .5 - 4, W - 12); c.fillStyle = '#222'; c.fillRect(L * .02, -W / 2 + 3, L * .46, W - 6); c.fillStyle = 'rgba(150,200,230,.5)'; c.fillRect(L * .26, -W / 2 + 5, 9, W - 10); }
    else { c.fillStyle = 'rgba(30,40,50,.85)'; rrect(c, -L * .08, -W / 2 + 3, L * .36, W - 6, 4); c.fill(); c.fillStyle = 'rgba(150,200,230,.5)'; c.fillRect(L * .2, -W / 2 + 4, 8, W - 8); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(-L * .4, -W / 2 + 4, L * .25, W - 8); }
    c.fillStyle = '#ffe9a0'; c.fillRect(L / 2 - 4, -W / 2 + 3, 4, 5); c.fillRect(L / 2 - 4, W / 2 - 8, 4, 5);
    c.fillStyle = '#b02020'; c.fillRect(-L / 2, -W / 2 + 3, 3, 4); c.fillRect(-L / 2, W / 2 - 7, 3, 4);
    if (dmg < .6) { c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(L * .1, -W / 2); c.lineTo(L * .2, 0); c.lineTo(L * .05, W / 3); c.stroke(); }
  }
  c.restore();
  if (P.veh === v) { if (v.t === 'moto') { /* le pilote est dessiné par drawPlayer */ } }
  else if (dist(v.x, v.y, P.x, P.y) < 110 && !P.veh) { c.font = '10px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#9fe8ff'; c.fillText(d.n + ' ⛽' + Math.round(v.fuel / v.maxfuel * 100) + '%', v.x, v.y - d.r - 8); }
}
function drawVehicles(c, cx, cy, time) {
  for (const v of G.vehicles) if (v.x > cx - 80 && v.x < cx + VW + 80 && v.y > cy - 80 && v.y < cy + VH + 80) drawVehicle(c, v, time);
}

// ----- Panneau d'entretien -----
function vehicleHTML(v) {
  const need = Math.ceil(v.maxfuel - v.fuel);
  let h = '<h3>' + v.def.i + ' ' + esc(v.def.n) + '</h3><div class="cols"><div class="col"><div class="list">' +
    '<div class="item"><span class="ic">❤️</span><span class="nm">État : ' + Math.round(v.hp) + ' / ' + v.maxhp + '<br><small>Réparation : 4⚙️ + 1🔩 → +25 %</small></span><button data-act="vrepair"' + (hasItems({ scrap: 4, metal: 1 }) && v.hp < v.maxhp ? '' : ' disabled') + '>Réparer</button></div>' +
    '<div class="item"><span class="ic">⛽</span><span class="nm">Carburant : ' + Math.round(v.fuel) + ' / ' + v.maxfuel + '<br><small>1 bidon (⛽) = 20 unités · vous avez ' + invCount('fuel') + '</small></span><button data-act="vfuel" data-a="1"' + (invCount('fuel') > 0 && need > 0 ? '' : ' disabled') + '>+1</button><button data-act="vfuel" data-a="all"' + (invCount('fuel') > 0 && need > 0 ? '' : ' disabled') + '>Plein</button></div>' +
    '<p class="mut">Vitesse max ' + Math.round(v.def.max / 4) + ' km/h · Les ennemis écrasés endommagent le véhicule. Les cabines fermées réduisent la radiation de moitié et vous protègent des balles.</p></div></div><div class="col"><h3>Votre sac</h3><div class="list">';
  for (const k of Object.keys(P.inv)) if (P.inv[k] > 0) h += itemRow(k, P.inv[k], '<button class="sm" data-act="store" data-a="' + k + '">1</button><button class="sm" data-act="store" data-a="' + k + ':all">Tout</button>');
  h += '</div><h3>Coffre</h3><div class="list">';
  const ks = Object.keys(v.stash).filter(k => v.stash[k] > 0); if (!ks.length) h += '<p class="mut">Vide.</p>';
  for (const k of ks) h += itemRow(k, v.stash[k], '<button class="sm" data-act="take" data-a="' + k + '">1</button><button class="sm" data-act="take" data-a="' + k + ':all">Tout</button>');
  return h + '</div></div></div>';
}
