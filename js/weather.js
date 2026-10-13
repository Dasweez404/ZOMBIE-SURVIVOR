'use strict';
// ===== Météo rare : pluie, orage, brouillard =====
const WEATHER = { rain: { n: 'Pluie', i: '🌧️' }, storm: { n: 'Orage', i: '⛈️' }, fog: { n: 'Brouillard', i: '🌫️' } };

function initWeather() {
  G.wType = 'clear'; G.wInt = 0; G.wLeft = 0; G.wNext = G.clock + DAY_LEN * rnd(1.0, 1.7); G.lightT = 8; G.flash = 0; G.bolts = []; G.thunderAt = 0;
}
function startWeather(t) {
  G.wType = t || G.rng.wpick([['rain', 55], ['fog', 25], ['storm', 20]]); G.wLeft = DAY_LEN * rnd(.12, .3);
  const w = WEATHER[G.wType];
  banner(w.i + ' ' + w.n.toUpperCase(), G.wType === 'fog' ? 'Visibilité réduite — les infectés vous voient moins bien' : G.wType === 'storm' ? 'Il fait froid, les routes sont glissantes, la foudre frappe' : 'Il fait plus froid, vous allez vous mouiller', G.wType === 'storm' ? '#9ab8ff' : '#bcd4e8');
  msg(w.i + ' ' + w.n + ' : ' + (G.wType === 'fog' ? 'moins visible, moins vu.' : 'froid, sol glissant, bruit étouffé. Un collecteur de pluie se remplit 4× plus vite.'), '#bcd4e8');
  tip('weather', 'Météo : la pluie vous mouille (froid) — mettez-vous à l\'abri ou près d\'un feu. Le brouillard vous cache aussi des infectés. Les orages font de la foudre.', w.i);
}
function endWeather() {
  G.wType = 'clear'; G.wLeft = 0; G.wNext = G.clock + DAY_LEN * rnd(.7, 1.7); msg('☀️ Le temps se calme.', '#e8e0a0');
}
function updateWeather(dt) {
  if (G.wType === 'clear') { if (G.clock >= G.wNext) { if (G.day >= 2 && Math.random() < .65) startWeather(); else G.wNext = G.clock + DAY_LEN * rnd(.3, .6); } }
  else { G.wLeft -= dt; if (G.wLeft <= 0) endWeather(); }
  const target = G.wType === 'clear' ? 0 : 1;
  G.wInt += (target - G.wInt) * Math.min(1, dt * .35); if (Math.abs(G.wInt - target) < .003) G.wInt = target;
  const wet = G.wType === 'rain' || G.wType === 'storm';
  const inside = G.inside || (P.veh && P.veh.def.closed);
  SFX.rain(wet ? G.wInt * (G.wType === 'storm' ? 1 : .65) * (inside ? .35 : 1) : 0);
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.2);
  if (G.thunderAt && G.clock >= G.thunderAt) { G.thunderAt = 0; SFX.play('thunder', .9); shake(2); }
  if (G.wType === 'storm') {
    G.lightT -= dt;
    if (G.lightT <= 0) {
      G.lightT = rnd(5, 13); G.flash = 1; G.thunderAt = G.clock + rnd(.25, 2);
      if (Math.random() < .35) { // la foudre frappe
        const a = rnd(0, TAU), d = rnd(120, 520), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
        if (inb(Math.floor(x / TS), Math.floor(y / TS))) { G.bolts.push({ x, y, t: .3, seed: Math.random() * 99 }); G.thunderAt = G.clock + .05; explode(x, y, 70, 60, { team: 'f', cause: 'la foudre' }); if (Math.random() < .5) addFire(x, y, 40, 4); }
      }
    }
  }
  for (let i = G.bolts.length - 1; i >= 0; i--) { G.bolts[i].t -= dt; if (G.bolts[i].t <= 0) G.bolts.splice(i, 1); }
  // ondulations sur le sol
  if (wet && G.wInt > .3 && Math.random() < dt * 30 * G.wInt && SET.quality > 0) { const a = rnd(0, TAU), d = rnd(20, 520); addPart(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d * .7, 0, 0, .5, rnd(5, 9), '#cfe6ff', 'ring'); }
}
function weatherMul() { // multiplicateur de discrétion (vue ennemie)
  return 1 - G.wInt * (G.wType === 'fog' ? .45 : G.wType === 'storm' ? .35 : G.wType === 'rain' ? .22 : 0);
}

// ----- rendu (espace écran) -----
let _rain = null;
function drawWeather(c, time) {
  const I = G.wInt; if (I < .01 && G.flash <= 0) return;
  const t = G.wType;
  if (t === 'rain' || t === 'storm') {
    c.fillStyle = 'rgba(' + (t === 'storm' ? '14,20,34,' : '30,42,58,') + (I * (t === 'storm' ? .34 : .2)) + ')'; c.fillRect(0, 0, VW, VH);
    const n = Math.floor((t === 'storm' ? 260 : 150) * I * (SET.quality > 0 ? 1 : .4));
    if (!_rain) { _rain = []; for (let i = 0; i < 320; i++) _rain.push([Math.random(), Math.random(), .75 + Math.random() * .5]); }
    c.strokeStyle = 'rgba(190,215,240,' + (.28 * I) + ')'; c.lineWidth = 1.2; c.beginPath();
    const wind = t === 'storm' ? -170 : -90;
    for (let i = 0; i < n; i++) {
      const r = _rain[i], sp = 780 * r[2], x = ((r[0] * VW + time * wind) % VW + VW) % VW, y = ((r[1] * VH + time * sp) % VH);
      c.moveTo(x, y); c.lineTo(x + wind * .028, y + 15 * r[2]);
    }
    c.stroke();
  } else if (t === 'fog') {
    const g = c.createRadialGradient(VW / 2, VH / 2, VH * .15, VW / 2, VH / 2, VH * .85); g.addColorStop(0, 'rgba(205,214,218,' + (.2 * I) + ')'); g.addColorStop(1, 'rgba(205,214,218,' + (.62 * I) + ')'); c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    c.fillStyle = 'rgba(225,230,232,' + (.08 * I) + ')';
    for (let i = 0; i < 7; i++) { const x = ((i * 337 + time * (10 + i * 3)) % (VW + 600)) - 300, y = (i * 163) % VH; c.beginPath(); c.ellipse(x, y, 260, 60, 0, 0, TAU); c.fill(); }
  }
  if (G.flash > 0) { c.fillStyle = 'rgba(220,230,255,' + (G.flash * .55) + ')'; c.fillRect(0, 0, VW, VH); }
}
function drawBolts(c) {
  for (const b of G.bolts) {
    const a = b.t / .3; c.strokeStyle = 'rgba(235,240,255,' + a + ')'; c.lineWidth = 3 * a + 1; c.beginPath();
    let x = b.x + hash2(1, 2, b.seed | 0) * 60 - 30, y = b.y - 700; c.moveTo(x, y);
    for (let i = 1; i <= 10; i++) { x = lerp(x, b.x, .25) + (hash2(i, 5, (b.seed | 0)) - .5) * 60; y = b.y - 700 + i * 70; c.lineTo(x, y); }
    c.lineTo(b.x, b.y); c.stroke();
    c.fillStyle = 'rgba(255,255,255,' + (a * .6) + ')'; c.beginPath(); c.arc(b.x, b.y, 40 * a, 0, TAU); c.fill();
  }
}
