'use strict';
// ===== Sprites de personnages, animaux, véhicules ; rendu des entités =====
function capsule(c, x1, y1, x2, y2, w, c1, c2) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1); c.save(); c.translate(x1, y1); c.rotate(a);
  const g = c.createLinearGradient(0, -w / 2, 0, w / 2); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g; rrect(c, -w / 2, -w / 2, L + w, w, w / 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = .9; c.stroke(); c.restore();
}
const SKIN = ['#e0b896', '#d8a880', '#c89068', '#a87050'];
function torso(c, rx, ry, c1, c2) { const g = c.createLinearGradient(0, -ry, 0, ry); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.1; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1; c.beginPath(); c.ellipse(-.5, -1, rx - 1.6, ry - 2, 0, Math.PI * 1.05, Math.PI * 1.8); c.stroke(); }
function head(c, x, y, r, skin) { const g = c.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r); g.addColorStop(0, skin[0]); g.addColorStop(1, skin[1]); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1; c.stroke(); }
function skinPair(i) { const s = SKIN[i % 4], d = ['#a07858', '#8e6446', '#7a5236', '#5e3c24'][i % 4]; return [s, d]; }

// ---------- joueur ----------
const BODYCOL = { none: ['#5a86c0', '#2e4a78'], jacket: ['#7a8e66', '#46563a'], leather: ['#8a6038', '#4a2e18'], kevlar: ['#3e5062', '#1e2a36'], plate: ['#4e5644', '#262c20'], hazmat: ['#e8d838', '#9a8a14'] };
function playerSprite() {
  const body = P.armor.body ? P.armor.body.id : 'none', hd = P.armor.head ? P.armor.head.id : '-', pk = P.pack, key = 'pl:' + body + ':' + hd + ':' + pk;
  return sprite(key, 56, 56, c => {
    const col = BODYCOL[body] || BODYCOL.none;
    if (pk > 0) { const g = c.createLinearGradient(-14, 0, -4, 0); g.addColorStop(0, ['#6a5a3a', '#4a5a3a', '#3a4a5a'][Math.min(2, pk - 1)]); g.addColorStop(1, '#2a2a22'); c.fillStyle = g; rrect(c, -15 - pk, -8 - pk * .5, 11 + pk, 16 + pk, 3); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.stroke(); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-12, -2, 6, 1.5); }
    capsule(c, 1, 9.5, 12, 6.6, 5.2, col[0], col[1]); capsule(c, 1, -9.5, 12, -6.6, 5.2, col[0], col[1]);
    torso(c, 8, 12.5, col[0], col[1]);
    if (body === 'kevlar' || body === 'plate') { c.fillStyle = 'rgba(0,0,0,.28)'; rrect(c, -5, -9, 10, 18, 3); c.fill(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; c.strokeRect(-4.5, -8, 9, 16); c.fillStyle = body === 'plate' ? '#6a7260' : '#586878'; c.fillRect(-7, -11, 4, 6); c.fillRect(-7, 5, 4, 6); }
    if (body === 'leather') { c.strokeStyle = 'rgba(30,16,6,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(2, -10); c.lineTo(2, 10); c.stroke(); }
    if (body === 'hazmat') { c.strokeStyle = '#2a2a2a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6, -4); c.lineTo(6, -4); c.moveTo(-6, 4); c.lineTo(6, 4); c.stroke(); }
    const sk = skinPair(1); for (const y of [7.2, -7.2]) { gradBall(c, 13.6, y * .93, 2.9, sk[0], sk[1]); }
    head(c, 1.5, 0, 6.8, sk);
    // visage / coiffure / casque
    if (hd === '-') { c.fillStyle = '#3a2814'; c.beginPath(); c.arc(0, 0, 7, Math.PI * .5 + .3, Math.PI * 1.5 - .3); c.lineTo(2, 0); c.fill(); c.beginPath(); c.arc(-.5, 0, 6.9, Math.PI * .5, Math.PI * 1.5); c.fill(); c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.arc(-1, -2, 3.5, Math.PI, Math.PI * 1.8); c.fill(); }
    else if (hd === 'cap') { c.fillStyle = '#7a6a30'; c.beginPath(); c.arc(.5, 0, 7.2, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.stroke(); c.fillStyle = '#4a3e18'; c.beginPath(); c.moveTo(6, -5); c.quadraticCurveTo(13, 0, 6, 5); c.closePath(); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.arc(-1, -2, 3.2, Math.PI, Math.PI * 1.8); c.fill(); }
    else if (hd === 'helmet_moto') { gradBall(c, .5, 0, 7.8, '#5a5a66', '#16161c'); c.fillStyle = 'rgba(120,200,240,.8)'; c.beginPath(); c.moveTo(3, -5.5); c.quadraticCurveTo(9.5, 0, 3, 5.5); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(-1.5, -3, 2.6, Math.PI, Math.PI * 1.8); c.fill(); }
    else if (hd === 'helmet_mil') { gradBall(c, .5, 0, 8, '#5e7048', '#26301c'); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.stroke(); c.strokeStyle = 'rgba(20,28,14,.6)'; c.beginPath(); c.arc(.5, 0, 5, -2, 2); c.stroke(); c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.arc(-1.5, -3, 2.8, Math.PI, Math.PI * 1.8); c.fill(); }
    else if (hd === 'gasmask') { gradBall(c, .5, 0, 7.6, '#4a4e44', '#1e2018'); c.fillStyle = '#16201a'; c.beginPath(); c.ellipse(5, -3, 2.6, 2.2, 0, 0, TAU); c.ellipse(5, 3, 2.6, 2.2, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(160,255,200,.5)'; c.beginPath(); c.arc(5.4, -3.3, 1, 0, TAU); c.arc(5.4, 2.7, 1, 0, TAU); c.fill(); gradBall(c, 9.5, 0, 3, '#6a6e60', '#2a2c24'); }
  });
}

// ---------- zombies ----------
const SHIRTS = [['#5a6e84', '#2e3c4c'], ['#84605a', '#4c322e'], ['#74745a', '#40402e'], ['#4a4a5c', '#26262e'], ['#6a5a74', '#382e44']];
function zombieSprite(m) {
  const t = m.t, v = Math.floor(hash2(m.homeX | 0, m.homeY | 0, 4) * 5), key = 'z:' + t + ':' + v, def = m.def;
  const big = t === 'abomination' ? 2.1 : t === 'brute' ? 1.35 : t === 'bloater' ? 1.25 : 1;
  const size = Math.ceil(64 * big);
  return sprite(key, size, size, c => {
    c.scale(big, big);
    const sh = SHIRTS[v], skin = [def.col, mixHex(def.col, '#000000', .35)], rnd = rngOf(77 + v * 13 + t.length);
    if (t === 'abomination') { c.fillStyle = '#3a1a24'; for (let i = 0; i < 7; i++) { const y = -10 + i * 3.4; c.beginPath(); c.moveTo(-6, y); c.lineTo(-17 - (i % 2) * 3, y - 2); c.lineTo(-6, y + 3); c.fill(); } }
    const armW = t === 'brute' ? 7 : t === 'bloater' ? 5.5 : 4.4, reach = t === 'bloater' ? 12 : 17;
    for (const s of [-1, 1]) {
      const y0 = s * (t === 'brute' ? 12 : 9), y1 = s * (t === 'brute' ? 8 : 6 + (v % 2 ? 1 : 0) * s * 0);
      capsule(c, 1, y0, reach - 5, y1, armW, sh[0], sh[1]); capsule(c, reach - 7, y1, reach, y1, armW * .85, skin[0], skin[1]);
      if (t !== 'brute') { c.strokeStyle = skin[1]; c.lineWidth = 1; c.lineCap = 'round'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(reach, y1 + k * 1.3); c.lineTo(reach + 3.8, y1 + k * 2.4); c.stroke(); } } else gradBall(c, reach + 1, y1, 5, skin[0], skin[1]);
    }
    if (t === 'abomination') capsule(c, 2, 0, 20, 0, 5, sh[0], skin[1]);
    const rx = t === 'brute' ? 11 : t === 'bloater' ? 11 : 8, ry = t === 'brute' ? 15 : t === 'bloater' ? 13 : 12;
    torso(c, rx, ry, t === 'bloater' ? '#9aa850' : sh[0], t === 'bloater' ? '#5a6a24' : sh[1]);
    // déchirures + sang
    c.fillStyle = skin[0]; for (let i = 0; i < 3; i++) { const x = (rnd() - .5) * rx, y = (rnd() - .5) * ry * 1.4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3 + rnd() * 2, y + 1); c.lineTo(x + 1, y + 3 + rnd() * 2); c.closePath(); c.fill(); c.strokeStyle = 'rgba(100,10,10,.7)'; c.lineWidth = .8; c.stroke(); }
    c.fillStyle = 'rgba(110,12,12,.55)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse((rnd() - .5) * rx, (rnd() - .5) * ry, 2 + rnd() * 3, 1.5 + rnd() * 2, rnd() * 3, 0, TAU); c.fill(); }
    if (t === 'bloater') for (let i = 0; i < 6; i++) { const a = rnd() * TAU, d = rnd() * 7; gradBall(c, Math.cos(a) * d, Math.sin(a) * d, 2.4, '#e8f080', '#8a9a2a'); }
    if (t === 'zsoldier') { c.fillStyle = 'rgba(40,52,40,.9)'; rrect(c, -6, -9, 12, 18, 3); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1; c.stroke(); c.fillStyle = '#6a7a5a'; c.fillRect(-4, -6, 3, 4); c.fillRect(1, -6, 3, 4); }
    const hr = t === 'brute' ? 5.6 : t === 'abomination' ? 6.5 : 6.3; head(c, 1.5, 0, hr, skin);
    c.fillStyle = ['#2a1e14', '#4a4a4a', '#1a1a1a', '#6a5a3a', 'rgba(0,0,0,0)'][v]; c.beginPath(); c.arc(-.5, 0, hr - .4, Math.PI * .55, Math.PI * 1.45); c.fill();
    if (t === 'zsoldier') { gradBall(c, .5, 0, hr + 1.5, '#5e7048', '#26301c'); c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke(); }
    // yeux rouges + bouche
    c.fillStyle = '#1a0606'; c.beginPath(); c.arc(hr * .5 + 1.5, -2.3, 1.5, 0, TAU); c.arc(hr * .5 + 1.5, 2.3, 1.5, 0, TAU); c.fill(); c.fillStyle = '#ff3a2a'; c.beginPath(); c.arc(hr * .55 + 1.8, -2.3, .9, 0, TAU); c.arc(hr * .55 + 1.8, 2.3, .9, 0, TAU); c.fill();
    if (t === 'screamer') { c.fillStyle = '#2a0a12'; c.beginPath(); c.ellipse(hr * .85 + 1.5, 0, 2.6, 3.4, 0, 0, TAU); c.fill(); c.fillStyle = '#e8e0d0'; c.fillRect(hr * .85 + .4, -2.6, 1, 1.3); c.fillRect(hr * .85 + .4, 1.4, 1, 1.3); }
    else { c.strokeStyle = '#4a0a0a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(hr * .9 + 1.5, -2); c.lineTo(hr * .9 + 1.9, 0); c.lineTo(hr * .9 + 1.5, 2); c.stroke(); }
    if (t === 'spitter') { gradBall(c, -2, 0, 4.2, '#c8f060', '#5a8a14'); c.fillStyle = 'rgba(190,255,70,.9)'; c.beginPath(); c.arc(hr + 2, 0, 1.4, 0, TAU); c.fill(); }
  });
}
function mixHex(a, b, t) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const r = (pa >> 16 & 255) * (1 - t) + (pb >> 16 & 255) * t, g = (pa >> 8 & 255) * (1 - t) + (pb >> 8 & 255) * t, bb = (pa & 255) * (1 - t) + (pb & 255) * t; return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (bb | 0) + ')'; }

// ---------- nouveaux monstres ----------
const NEWZ = { crawler: 1, toxic: 1, charger: 1, leaper: 1, burner: 1, necro: 1, riot: 1, rats: 1, ghoul: 1, queen: 1 };
function eyes(c, x, y, sp, col, r) { c.fillStyle = '#140404'; c.beginPath(); c.arc(x, y - sp, r + .6, 0, TAU); c.arc(x, y + sp, r + .6, 0, TAU); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(x + .3, y - sp, r * .65, 0, TAU); c.arc(x + .3, y + sp, r * .65, 0, TAU); c.fill(); }
function monsterSprite(t) {
  const def = MOBS[t], size = t === 'queen' ? 130 : 66, skin = [def.col, mixHex(def.col, '#000000', .38)], key = 'mon:' + t;
  return sprite(key, size, size, c => {
    const rnd = rngOf(300 + t.length * 17);
    switch (t) {
      case 'crawler': { // corps plaqué au sol, membres écartés
        for (const s of [-1, 1]) { capsule(c, 2, s * 6, 12, s * 12, 3.6, skin[0], skin[1]); capsule(c, 12, s * 12, 17, s * 11, 3.2, skin[0], skin[1]); capsule(c, -6, s * 5, -13, s * 11, 3.6, skin[0], skin[1]); capsule(c, -13, s * 11, -17, s * 10, 3.2, skin[0], skin[1]); }
        let g = c.createLinearGradient(0, -6, 0, 6); g.addColorStop(0, '#7a8a6a'); g.addColorStop(1, '#3a4630'); c.fillStyle = g; c.beginPath(); c.ellipse(-2, 0, 11, 6.4, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.1; c.stroke(); c.fillStyle = 'rgba(110,12,12,.55)'; c.beginPath(); c.ellipse(-4, 1, 4, 2.5, .4, 0, TAU); c.fill();
        head(c, 11, 0, 4.8, skin); eyes(c, 14, 0, 1.9, '#ff3a2a', 1.2); c.strokeStyle = '#4a0a0a'; c.lineWidth = 1; c.beginPath(); c.moveTo(15.5, -1.5); c.lineTo(16.4, 0); c.lineTo(15.5, 1.5); c.stroke(); break; }
      case 'toxic': {
        for (const s of [-1, 1]) { capsule(c, 1, s * 9, 12, s * 6, 4.6, '#c8d03a', '#7a8218'); capsule(c, 11, s * 6, 17, s * 6, 3.8, skin[0], skin[1]); }
        gradBall(c, -8, 0, 7.4, '#4a5a48', '#1c241c'); gradBall(c, -8, 0, 5, 'rgba(160,255,90,.95)', 'rgba(60,150,20,.95)'); torso(c, 8.4, 12, '#d8dc40', '#8a9018'); c.strokeStyle = 'rgba(30,40,10,.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6, -6); c.lineTo(5, -6); c.moveTo(-6, 6); c.lineTo(5, 6); c.stroke();
        head(c, 1.5, 0, 6.4, skin); c.fillStyle = 'rgba(80,100,30,.9)'; c.beginPath(); c.arc(1, 0, 6.6, Math.PI * .5, Math.PI * 1.5); c.fill(); eyes(c, 5.4, 0, 2.3, '#c8ff4a', 1.3); c.fillStyle = '#9acd32'; c.beginPath(); c.arc(8.4, 1.5, 1.2, 0, TAU); c.fill(); break; }
      case 'charger': {
        for (const s of [-1, 1]) { capsule(c, 1, s * 12, 13, s * 8, 6.4, '#8a4a40', '#3e1e1a'); gradBall(c, 15, s * 7.6, 4.8, skin[0], skin[1]); c.fillStyle = '#9aa0aa'; c.beginPath(); c.moveTo(0, s * 14); c.lineTo(-2, s * 20); c.lineTo(4, s * 15); c.fill(); }
        torso(c, 12, 15, '#9a5a50', '#4a2420'); c.fillStyle = 'rgba(70,74,86,.9)'; rrect(c, -7, -11, 14, 22, 3); c.fill(); c.strokeStyle = '#1e2026'; c.lineWidth = 1.2; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.moveTo(-5, -8); c.lineTo(5, -8); c.stroke(); c.fillStyle = '#c8ccd4'; for (const [x, y] of [[-5, -9], [5, -9], [-5, 9], [5, 9]]) { c.beginPath(); c.arc(x, y, 1.1, 0, TAU); c.fill(); }
        head(c, 3, 0, 5.4, skin); c.strokeStyle = '#f0ece0'; c.lineWidth = 3; c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(4, s * 4); c.quadraticCurveTo(10, s * 10, 16, s * 7); c.stroke(); } c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = .8; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(4, s * 4); c.quadraticCurveTo(10, s * 10, 16, s * 7); c.stroke(); } eyes(c, 6.4, 0, 2, '#ff2a1a', 1.3); break; }
      case 'leaper': {
        for (const s of [-1, 1]) { capsule(c, 3, s * 5, 12, s * 12, 3.4, skin[0], skin[1]); capsule(c, 12, s * 12, 19, s * 8, 3, skin[0], skin[1]); c.strokeStyle = '#2a2a38'; c.lineWidth = 1; c.lineCap = 'round'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(19, s * 8); c.lineTo(23, s * 8 + k * 2.4); c.stroke(); } capsule(c, -3, s * 5, -10, s * 9, 3.6, skin[0], skin[1]); capsule(c, -10, s * 9, -15, s * 5, 3.2, skin[0], skin[1]); }
        torso(c, 5.6, 10, '#6a6a86', '#32324a'); head(c, 3, 0, 5.4, skin); c.fillStyle = '#1a0a10'; c.beginPath(); c.moveTo(6, -3); c.lineTo(12, -2); c.lineTo(12, 2); c.lineTo(6, 3); c.closePath(); c.fill(); c.fillStyle = '#e8e0d0'; for (let i = 0; i < 4; i++) c.fillRect(7 + i * 1.4, -2.4, .8, 1.6); eyes(c, 6, 0, 2.4, '#ffe84a', 1.2); break; }
      case 'burner': {
        for (const s of [-1, 1]) { capsule(c, 1, s * 9, 12, s * 6, 4.4, '#3a3230', '#161212'); capsule(c, 11, s * 6, 17, s * 6, 3.8, '#2a2220', '#100c0c'); }
        torso(c, 8, 12, '#3e3634', '#161212'); c.strokeStyle = '#ff7a1a'; c.lineWidth = 1.4; for (let i = 0; i < 5; i++) { c.beginPath(); let x = (rnd() - .5) * 10, y = -9 + i * 4; c.moveTo(x, y); c.lineTo(x + rnd() * 4, y + 2); c.lineTo(x - rnd() * 3, y + 4); c.stroke(); } c.strokeStyle = 'rgba(255,200,90,.7)'; c.lineWidth = .7; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-3 + i * 2, -8 + i * 3); c.lineTo(-1 + i * 2, -6 + i * 3); c.stroke(); }
        head(c, 1.5, 0, 6.4, ['#3a2e2a', '#161010']); eyes(c, 5.4, 0, 2.3, '#ffd830', 1.3); for (const [x, y, h] of [[-3, -3, 7], [-1, 1, 9], [-3, 3, 7]]) { c.fillStyle = '#ff6a1a'; c.beginPath(); c.moveTo(x, y - 2); c.quadraticCurveTo(x - 6, y, x - h, y); c.quadraticCurveTo(x - 6, y + 1, x, y + 2); c.fill(); c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(x, y - 1); c.quadraticCurveTo(x - 4, y, x - h * .6, y); c.quadraticCurveTo(x - 4, y + .6, x, y + 1); c.fill(); } break; }
      case 'necro': {
        c.fillStyle = 'rgba(40,24,60,.9)'; c.beginPath(); c.moveTo(-14, -12); c.quadraticCurveTo(-20, 0, -14, 12); c.lineTo(6, 8); c.lineTo(6, -8); c.closePath(); c.fill();
        for (const s of [-1, 1]) { capsule(c, 1, s * 9, 11, s * 7, 4.8, '#5a3a7a', '#241438'); }
        torso(c, 9, 12.5, '#6a4a90', '#2a1840'); c.strokeStyle = 'rgba(200,150,255,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-5, -6); c.lineTo(3, 0); c.lineTo(-5, 6); c.stroke();
        c.strokeStyle = '#6a4a2a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(4, 7.4); c.lineTo(24, 7.4); c.stroke(); gradBall(c, 25, 7.4, 3.6, '#e0b0ff', '#8a40d0'); gradBall(c, 12, 7, 2.4, '#d8d0c0', '#8a8272'); gradBall(c, 12, -7, 2.4, '#d8d0c0', '#8a8272');
        gradBall(c, 1.5, 0, 7.6, '#4a2e6a', '#1a0e2a'); c.fillStyle = '#e8e0d4'; c.beginPath(); c.ellipse(5, 0, 4, 3.6, 0, 0, TAU); c.fill(); c.fillStyle = '#16081e'; c.beginPath(); c.arc(6, -1.8, 1.3, 0, TAU); c.arc(6, 1.8, 1.3, 0, TAU); c.fill(); c.fillStyle = '#d070ff'; c.beginPath(); c.arc(6.2, -1.8, .7, 0, TAU); c.arc(6.2, 1.8, .7, 0, TAU); c.fill(); break; }
      case 'riot': {
        for (const s of [-1, 1]) capsule(c, 1, s * 10, 12, s * 7, 5.2, '#4a5a6a', '#1e2832');
        torso(c, 9.4, 13, '#506274', '#1e2a36'); c.fillStyle = 'rgba(20,28,38,.7)'; rrect(c, -6, -9, 12, 18, 3); c.fill();
        head(c, 1.5, 0, 6.6, skin); gradBall(c, .5, 0, 8, '#4a5a6a', '#161e28'); c.fillStyle = 'rgba(150,200,230,.75)'; c.beginPath(); c.moveTo(3, -5); c.lineTo(9, -3); c.lineTo(9, 3); c.lineTo(3, 5); c.closePath(); c.fill(); eyes(c, 6.5, 0, 1.6, '#ff4a3a', .9);
        c.fillStyle = 'rgba(140,196,228,.55)'; rrect(c, 11, -14, 6, 28, 3); c.fill(); c.strokeStyle = '#d8e8f4'; c.lineWidth = 1.6; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(12.5, -10); c.lineTo(15, -3); c.lineTo(12.8, 6); c.moveTo(15, -3); c.lineTo(16, 5); c.stroke(); c.fillStyle = '#e8e8f0'; c.font = 'bold 5px sans-serif'; c.save(); c.translate(15.6, 0); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.fillText('POLICE', 0, 0); c.restore(); break; }
      case 'rats': {
        c.strokeStyle = '#a07070'; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-7, 0); c.quadraticCurveTo(-13, 3, -15, -2); c.stroke(); let g = c.createLinearGradient(0, -4, 0, 4); g.addColorStop(0, '#9a8a78'); g.addColorStop(1, '#4a3e32'); c.fillStyle = g; c.beginPath(); c.ellipse(-1, 0, 7, 3.8, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = .8; c.stroke();
        c.fillStyle = '#8a7a68'; c.beginPath(); c.moveTo(5, -2.6); c.lineTo(11.5, 0); c.lineTo(5, 2.6); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#d89a9a'; for (const s of [-1, 1]) { c.beginPath(); c.arc(4.6, s * 3, 1.7, 0, TAU); c.fill(); } c.fillStyle = '#ff3030'; c.beginPath(); c.arc(8, -1, .8, 0, TAU); c.arc(8, 1, .8, 0, TAU); c.fill(); c.fillStyle = '#d88a8a'; c.beginPath(); c.arc(11.4, 0, .8, 0, TAU); c.fill(); break; }
      case 'ghoul': {
        for (const s of [-1, 1]) { capsule(c, 1, s * 8, 13, s * 5, 3.6, '#c8d8b0', '#788a60'); c.strokeStyle = '#2a3a1a'; c.lineWidth = 1.1; c.lineCap = 'round'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(13, s * 5); c.lineTo(20, s * 5 + k * 2.6); c.stroke(); } }
        torso(c, 6.6, 11, '#b8c8a0', '#6a7a56'); c.strokeStyle = 'rgba(60,80,40,.8)'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-4, -6 + i * 3.8); c.lineTo(4, -6 + i * 3.8); c.stroke(); } c.strokeStyle = 'rgba(150,255,60,.85)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-3, -8); c.lineTo(0, -2); c.lineTo(-2, 5); c.lineTo(3, 9); c.stroke();
        head(c, 2, 0, 5.6, ['#d8e8c0', '#7a8a60']); eyes(c, 5.6, 0, 2.2, '#9aff2a', 1.5); c.strokeStyle = '#2a3a1a'; c.lineWidth = 1; c.beginPath(); c.moveTo(7, -1.5); c.lineTo(8, 0); c.lineTo(7, 1.5); c.stroke(); break; }
      case 'queen': {
        c.scale(1.9, 1.9);
        for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { capsule(c, 4 + k * 3, s * (5 + k * 3), 15 + k * 3, s * (9 + k * 3), 2.8, skin[0], skin[1]); }
        let g = c.createRadialGradient(-10, -2, 2, -9, 0, 15); g.addColorStop(0, '#e8a0c8'); g.addColorStop(1, '#6a2048'); c.fillStyle = g; c.beginPath(); c.ellipse(-9, 0, 15, 12, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(40,6,24,.7)'; c.lineWidth = 1; c.stroke();
        for (let i = 0; i < 8; i++) { const a = rnd() * TAU, d = 3 + rnd() * 8; gradBall(c, -9 + Math.cos(a) * d, Math.sin(a) * d, 2.2 + rnd() * 1.6, 'rgba(255,200,222,.95)', 'rgba(150,50,100,.95)'); }
        c.strokeStyle = 'rgba(80,14,48,.7)'; c.lineWidth = .9; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-20 + i * 3, -8); c.quadraticCurveTo(-10 + i * 2, 0, -20 + i * 3, 8); c.stroke(); }
        torso(c, 6, 8, '#c070a0', '#6a2048'); head(c, 8, 0, 5.2, ['#e0a8c4', '#8a3a62']); c.fillStyle = '#f0d8e4'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(10, s * 2); c.lineTo(15, s * 5); c.lineTo(11, s * 4); c.fill(); } for (let i = -2; i <= 2; i++) { c.fillStyle = '#c04880'; c.beginPath(); c.moveTo(5, i * 2.2); c.lineTo(1, i * 3); c.lineTo(4, i * 2.2 + 1); c.fill(); } eyes(c, 11, 0, 2, '#ffe04a', 1.3); break; }
    }
  });
}

// ---------- humains hostiles ----------
function humanSprite(m) {
  const t = m.t, key = 'h:' + t, def = m.def, big = def.boss ? 1.25 : t === 'legion_hv' ? 1.2 : 1;
  return sprite(key, Math.ceil(60 * big), Math.ceil(60 * big), c => {
    c.scale(big, big);
    const legion = def.fac === 'legion', col = legion ? ['#9a2438', '#4a0e1a'] : ['#8a5a36', '#4a2a16'], sk = skinPair(Math.floor(hash2(t.length, 3, 1) * 4));
    capsule(c, 1, 9.5, 12, 6.2, 5, col[0], col[1]); capsule(c, 1, -9.5, 12, -6.2, 5, col[0], col[1]);
    torso(c, t === 'legion_hv' ? 10 : 8.4, t === 'legion_hv' ? 14 : 12.5, col[0], col[1]);
    if (legion) { c.fillStyle = 'rgba(20,10,14,.75)'; rrect(c, -6, -9, 12, 18, 3); c.fill(); c.strokeStyle = '#d8b040'; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -4); c.lineTo(6, -4); c.stroke(); c.fillStyle = '#d8b040'; c.fillRect(-2, -1, 4, 2); }
    else { c.strokeStyle = 'rgba(30,16,6,.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6, -8); c.lineTo(5, 8); c.moveTo(5, -8); c.lineTo(-6, 8); c.stroke(); c.fillStyle = '#c0c4cc'; for (const y of [-11, 11]) { c.beginPath(); c.moveTo(-1, y); c.lineTo(3, y + Math.sign(y) * 4); c.lineTo(5, y); c.fill(); } }
    for (const y of [6.8, -6.8]) gradBall(c, 13.6, y * .9, 2.8, sk[0], sk[1]);
    head(c, 1.5, 0, 6.8, sk);
    if (legion) { gradBall(c, .5, 0, 8, '#3a3a44', '#14141a'); c.fillStyle = '#ff3a4a'; c.beginPath(); c.moveTo(3, -4.5); c.lineTo(8.5, -2); c.lineTo(8.5, 2); c.lineTo(3, 4.5); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(-1.5, -3, 2.6, Math.PI, Math.PI * 1.8); c.fill(); if (def.boss) { c.fillStyle = '#e8c040'; c.fillRect(-6, -1, 5, 2); } }
    else { c.fillStyle = def.boss ? '#e8e0d0' : '#a82a22'; c.beginPath(); c.arc(0, 0, 7.2, Math.PI * .5, Math.PI * 1.5); c.lineTo(3, 0); c.fill(); if (def.boss) { c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(5, -2.2, 1.3, 0, TAU); c.arc(5, 2.2, 1.3, 0, TAU); c.fill(); c.fillRect(6, -1, 2.5, 2); } else { c.fillRect(-4, 4, 3, 6); } c.fillStyle = 'rgba(255,255,255,.15)'; c.beginPath(); c.arc(-1, -3, 3, Math.PI, Math.PI * 1.8); c.fill(); }
  });
}

// ---------- PNJ / alliés ----------
function npcSprite(n) {
  return sprite('npc:' + n.id, 56, 56, c => {
    const col = [n.col, mixHex(n.col, '#000000', .45)]; capsule(c, 1, 9.5, 11, 7.5, 5, col[0], col[1]); capsule(c, 1, -9.5, 11, -7.5, 5, col[0], col[1]); torso(c, 8.6, 12.5, col[0], col[1]);
    const sk = skinPair(n.id === 'mara' ? 1 : n.id === 'doc' ? 0 : 2); for (const y of [7.6, -7.6]) gradBall(c, 12.4, y * .95, 2.8, sk[0], sk[1]); head(c, 1.5, 0, 6.8, sk);
    if (n.id === 'doc') { c.fillStyle = '#f0f0f0'; rrect(c, -5, -9, 10, 18, 3); c.fill(); c.fillStyle = '#d83a3a'; c.fillRect(-1, -4, 2, 8); c.fillRect(-4, -1, 8, 2); c.fillStyle = '#5a3a24'; c.beginPath(); c.arc(-.5, 0, 7, Math.PI * .5, Math.PI * 1.5); c.fill(); c.beginPath(); c.arc(-5, 0, 3.4, 0, TAU); c.fill(); }
    else if (n.id === 'mara') { gradBall(c, .5, 0, 7.8, '#3a5a8a', '#18284a'); c.fillStyle = '#243a60'; c.beginPath(); c.moveTo(6, -5); c.quadraticCurveTo(12, 0, 6, 5); c.closePath(); c.fill(); c.fillStyle = '#e8c040'; c.beginPath(); c.arc(1.5, 0, 1.6, 0, TAU); c.fill(); }
    else { c.fillStyle = '#6a4a28'; c.beginPath(); c.ellipse(.5, 0, 10, 10, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.stroke(); gradBall(c, .5, 0, 6, '#9a7040', '#4a3018'); c.fillStyle = '#c8a050'; c.beginPath(); c.arc(.5, 0, 6.2, Math.PI * .1, Math.PI * 1.9); c.stroke(); }
  });
}
function gunnerSprite(f) {
  const guard = f.kind === 'guard';
  return sprite('gun:' + f.kind, 56, 56, c => {
    const col = guard ? ['#4a9a68', '#1e4a30'] : ['#4a82c0', '#1e3a68']; capsule(c, 1, 9.5, 12, 6.2, 5, col[0], col[1]); capsule(c, 1, -9.5, 12, -6.2, 5, col[0], col[1]); torso(c, 8.4, 12.5, col[0], col[1]);
    c.fillStyle = 'rgba(0,0,0,.28)'; rrect(c, -5, -9, 10, 18, 3); c.fill(); const sk = skinPair(guard ? 0 : 2); for (const y of [6.8, -6.8]) gradBall(c, 13.6, y * .9, 2.8, sk[0], sk[1]); head(c, 1.5, 0, 6.8, sk);
    gradBall(c, .5, 0, 8, guard ? '#5a8a5a' : '#4a6a9a', guard ? '#1e3a22' : '#1a2a4a'); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.stroke(); c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.arc(-1.5, -3, 2.8, Math.PI, Math.PI * 1.8); c.fill();
  });
}

// ---------- animaux ----------
function animalSprite(t) {
  return sprite('an:' + t, 72, 48, c => {
    const def = MOBS[t], col = def.col, dark = mixHex(col, '#000000', .45), light = mixHex(col, '#ffffff', .3), rnd = rngOf(900 + t.length * 31);
    const body = (rx, ry, x) => { const g = c.createLinearGradient(0, -ry, 0, ry); g.addColorStop(0, light); g.addColorStop(.5, col); g.addColorStop(1, dark); c.fillStyle = g; c.beginPath(); c.ellipse(x || 0, 0, rx, ry, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1.2; c.stroke(); };
    const fur = (rx, ry, n) => { c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = .9; for (let i = 0; i < n; i++) { const x = (rnd() - .5) * rx * 1.6, y = (rnd() - .5) * ry * 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + (rnd() - .5) * 2); c.stroke(); } };
    const eye = (x, y, col2) => { c.fillStyle = '#0a0806'; c.beginPath(); c.arc(x, y, 1.5, 0, TAU); c.fill(); if (col2) { c.fillStyle = col2; c.beginPath(); c.arc(x + .3, y, 1, 0, TAU); c.fill(); } else { c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(x - .3, y - .8, .7, .7); } };
    if (t === 'rabbit') { c.fillStyle = '#f8f8f8'; c.beginPath(); c.arc(-9, 0, 3.2, 0, TAU); c.fill(); body(8.5, 6.4, -1); for (const s of [-1, 1]) { c.fillStyle = col; c.beginPath(); c.ellipse(8, s * 3, 5.5, 1.8, s * -.3, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.stroke(); c.fillStyle = 'rgba(255,170,170,.7)'; c.beginPath(); c.ellipse(8.6, s * 3, 3, 1, s * -.3, 0, TAU); c.fill(); } gradBall(c, 10, 0, 4.6, light, col); eye(12, -2); eye(12, 2); c.fillStyle = '#e88a9a'; c.beginPath(); c.arc(14.5, 0, 1, 0, TAU); c.fill(); return; }
    if (t === 'deer') { body(15, 8, -2); c.fillStyle = '#f4f0e8'; c.beginPath(); c.ellipse(-17, 0, 3, 3.6, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(-8 + rnd() * 16, (rnd() - .5) * 10, 1.1, 0, TAU); c.fill(); } capsule(c, 12, 0, 21, 0, 5, col, dark); gradBall(c, 23, 0, 5, light, col); c.fillStyle = col; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(21, s * 5, 3.4, 1.6, s * .5, 0, TAU); c.fill(); c.stroke(); } eye(25, -2.4); eye(25, 2.4); c.fillStyle = '#2a1a14'; c.beginPath(); c.arc(28, 0, 1.4, 0, TAU); c.fill(); c.strokeStyle = '#8a6a44'; c.lineWidth = 1.6; c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(21, s * 3); c.lineTo(17, s * 9); c.lineTo(13, s * 11); c.moveTo(17, s * 9); c.lineTo(18, s * 13); c.moveTo(19, s * 6); c.lineTo(23, s * 11); c.stroke(); } return; }
    if (t === 'boar') { body(17, 11, -1); fur(17, 11, 18); c.fillStyle = dark; c.beginPath(); c.moveTo(-14, -2); for (let i = 0; i < 9; i++) c.lineTo(-14 + i * 3.5, i % 2 ? -2.5 : 2); c.lineTo(14, 2); c.lineTo(-14, 2); c.fill(); gradBall(c, 17, 0, 8, light, col); c.fillStyle = '#c8a890'; c.beginPath(); c.ellipse(24, 0, 4.4, 4, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1; c.stroke(); c.fillStyle = '#2a1a14'; c.beginPath(); c.arc(26, -1.4, .9, 0, TAU); c.arc(26, 1.4, .9, 0, TAU); c.fill(); c.fillStyle = '#f0ece0'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(22, s * 3.6); c.quadraticCurveTo(27, s * 7, 26, s * 3.6); c.quadraticCurveTo(25, s * 5, 22, s * 3.6); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.stroke(); c.fillStyle = col; c.beginPath(); c.ellipse(14, s * 7.4, 3, 2, 0, 0, TAU); c.fill(); c.fillStyle = '#f0ece0'; } eye(20, -4.5); eye(20, 4.5); return; }
    if (t === 'wolf' || t === 'hound') {
      const m = t === 'hound'; c.strokeStyle = dark; c.lineWidth = 4.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-14, 0); c.quadraticCurveTo(-24, 3, -26, 8); c.stroke(); c.strokeStyle = light; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, -.5); c.quadraticCurveTo(-23, 2, -25, 7); c.stroke();
      body(15, 9, -2); fur(15, 9, 22); if (m) { c.fillStyle = '#c8a0e0'; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-9 + i * 4, -3); c.lineTo(-7 + i * 4, -8); c.lineTo(-5 + i * 4, -3); c.fill(); } c.fillStyle = 'rgba(190,80,220,.4)'; c.beginPath(); c.ellipse(-2, 0, 11, 5, 0, 0, TAU); c.fill(); }
      c.fillStyle = light; c.beginPath(); c.ellipse(-1, 4, 8, 3.4, 0, 0, TAU); c.fill(); gradBall(c, 17, 0, 7, light, col); c.fillStyle = mixHex(col, '#000000', .25); c.beginPath(); c.moveTo(20, -3); c.lineTo(31, -1.2); c.lineTo(31, 1.2); c.lineTo(20, 3); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1; c.stroke(); c.fillStyle = '#16100c'; c.beginPath(); c.arc(31, 0, 1.5, 0, TAU); c.fill();
      for (const s of [-1, 1]) { c.fillStyle = dark; c.beginPath(); c.moveTo(14, s * 5); c.lineTo(11, s * 11); c.lineTo(18, s * 7); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke(); }
      eye(21, -3.6, m ? '#ff40d8' : '#e8c040'); eye(21, 3.6, m ? '#ff40d8' : '#e8c040'); if (m) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,60,220,.6)'; c.beginPath(); c.arc(22, -3.6, 3, 0, TAU); c.arc(22, 3.6, 3, 0, TAU); c.fill(); c.restore(); } return;
    }
    if (t === 'spider') {
      c.strokeStyle = dark; c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round'; for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const a = (i - 1.5) * .55; c.strokeStyle = i % 2 ? dark : mixHex(col, '#000000', .6); c.beginPath(); c.moveTo(4 + Math.cos(a) * 3, s * 3); c.lineTo(8 + Math.cos(a) * 12, s * (13 + i * 2)); c.lineTo(10 + Math.cos(a) * 20 - i * 2, s * (6 + i * 4)); c.stroke(); gradBall(c, 8 + Math.cos(a) * 12, s * (13 + i * 2), 1.4, light, dark); }
      let g = c.createRadialGradient(-8, -2, 2, -8, 0, 13); g.addColorStop(0, '#7a5a80'); g.addColorStop(1, '#241428'); c.fillStyle = g; c.beginPath(); c.ellipse(-8, 0, 12, 9, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = '#e8c030'; c.beginPath(); c.moveTo(-14, 0); c.lineTo(-8, -4); c.lineTo(-3, 0); c.lineTo(-8, 4); c.closePath(); c.fill(); c.fillStyle = '#c03030'; c.beginPath(); c.arc(-8, 0, 1.6, 0, TAU); c.fill();
      gradBall(c, 6, 0, 6.4, '#8a6a90', '#2a1a30'); c.fillStyle = '#ff40a0'; for (const [x, y, r] of [[9, -2.6, 1.4], [9, 2.6, 1.4], [10.4, -.8, 1], [10.4, .8, 1], [7.6, -4, .9], [7.6, 4, .9]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } c.strokeStyle = '#d8d0e0'; c.lineWidth = 1.6; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(11, s * 1.6); c.lineTo(15, s * 3); c.stroke(); } return; }
    if (t === 'scorpion') {
      c.strokeStyle = dark; c.lineWidth = 1.8; c.lineCap = 'round'; for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { c.beginPath(); c.moveTo(-2 + i * 3.6, s * 4); c.lineTo(-4 + i * 3.6, s * 11); c.lineTo(-1 + i * 3.6, s * 14); c.stroke(); }
      let g = c.createLinearGradient(0, -7, 0, 7); g.addColorStop(0, '#e0b060'); g.addColorStop(1, '#8a5a1a'); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 11, 6.4, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.2; c.stroke(); c.strokeStyle = 'rgba(70,40,10,.7)'; c.lineWidth = 1; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 2.6, -5.6); c.lineTo(i * 2.6, 5.6); c.stroke(); }
      c.strokeStyle = '#a8742a'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(-22, -4, -18, -12); c.quadraticCurveTo(-12, -18, -4, -10); c.stroke(); c.strokeStyle = '#e8c070'; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, -1); c.quadraticCurveTo(-21, -5, -18, -12); c.stroke(); c.fillStyle = '#5a1a10'; c.beginPath(); c.moveTo(-4, -10); c.lineTo(1, -8); c.lineTo(-3, -6); c.closePath(); c.fill(); gradBall(c, -4, -10, 2.4, '#d83a2a', '#5a1010');
      for (const s of [-1, 1]) { c.strokeStyle = '#a8742a'; c.lineWidth = 3; c.beginPath(); c.moveTo(9, s * 3); c.quadraticCurveTo(15, s * 8, 20, s * 5); c.stroke(); c.fillStyle = '#c8943a'; c.beginPath(); c.moveTo(20, s * 5); c.quadraticCurveTo(26, s * 10, 29, s * 5); c.quadraticCurveTo(26, s * 6, 22, s * 2); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.stroke(); }
      c.fillStyle = '#1a0e08'; c.beginPath(); c.arc(11, -1.8, 1.2, 0, TAU); c.arc(11, 1.8, 1.2, 0, TAU); c.fill(); return; }
    if (t === 'bear') { body(22, 15, -1); fur(22, 15, 30); c.fillStyle = dark; c.beginPath(); c.ellipse(-4, 0, 11, 8, 0, 0, TAU); c.fill(); c.fillStyle = '#b060e0'; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(-14 + i * 5, -4); c.lineTo(-11 + i * 5, -12); c.lineTo(-8 + i * 5, -4); c.fill(); c.beginPath(); c.moveTo(-14 + i * 5, 4); c.lineTo(-11 + i * 5, 12); c.lineTo(-8 + i * 5, 4); c.fill(); } gradBall(c, 22, 0, 10, light, col); c.fillStyle = '#b89870'; c.beginPath(); c.ellipse(30, 0, 5.4, 4.6, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke(); c.fillStyle = '#16100c'; c.beginPath(); c.arc(33, 0, 1.8, 0, TAU); c.fill(); for (const s of [-1, 1]) { gradBall(c, 17, s * 8.5, 3.2, light, dark); } eye(26, -5, '#80ff50'); eye(26, 5, '#80ff50'); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(100,255,60,.55)'; c.beginPath(); c.arc(26.5, -5, 3.4, 0, TAU); c.arc(26.5, 5, 3.4, 0, TAU); c.fill(); c.restore(); return; }
  });
}
function petCollar(c, sz) { c.fillStyle = '#e04a4a'; c.fillRect(sz * .5, -sz * .55, 3, sz * 1.1); c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(sz * .5 + 1.5, sz * .55, 1.3, 0, TAU); c.fill(); }

// ---------- véhicules ----------
function vehSprite(v) {
  const d = v.def, L = d.len, W = d.wid, key = 'veh:' + v.t + ':' + v.col;
  return sprite(key, L + 18, W + 18, c => {
    const body = v.col, dark = mixHex(v.col, '#000000', .45), light = mixHex(v.col, '#ffffff', .28);
    const wheel = (x, y, w, h) => { c.fillStyle = '#101012'; rrect(c, x - w / 2, y - h / 2, w, h, h / 2.4); c.fill(); c.fillStyle = '#34363c'; c.fillRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, 1.4); };
    if (v.t === 'moto') {
      wheel(-L * .32, 0, L * .3, 5.5); wheel(L * .32, 0, L * .3, 5.5);
      c.strokeStyle = '#2a2c32'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(L * .32, 0); c.lineTo(L * .12, 0); c.stroke(); c.strokeStyle = '#8a8e98'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(L * .2, -W * .55); c.lineTo(L * .2, W * .55); c.stroke(); gradBall(c, L * .2, -W * .55, 1.8, '#444', '#111'); gradBall(c, L * .2, W * .55, 1.8, '#444', '#111');
      const g = c.createLinearGradient(0, -W * .3, 0, W * .3); g.addColorStop(0, light); g.addColorStop(.5, body); g.addColorStop(1, dark); c.fillStyle = g; c.beginPath(); c.ellipse(L * .02, 0, L * .22, W * .32, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#1a1a1e'; rrect(c, -L * .3, -W * .22, L * .2, W * .44, 3); c.fill(); c.fillStyle = '#6a6e78'; c.fillRect(-L * .06, -W * .16, L * .1, W * .32); c.fillStyle = '#ffe9a0'; c.beginPath(); c.arc(L * .46, 0, 2.6, 0, TAU); c.fill(); c.strokeStyle = '#555'; c.lineWidth = .8; c.stroke(); return;
    }
    if (v.t === 'truck') { for (const [x, y] of [[-L * .3, -W / 2], [L * .22, -W / 2], [-L * .3, W / 2], [L * .22, W / 2]]) wheel(x, y, 13, 6.5); }
    else for (const [x, y] of [[-L * .3, -W / 2], [L * .3, -W / 2], [-L * .3, W / 2], [L * .3, W / 2]]) wheel(x, y, 12, 5.5);
    let g = c.createLinearGradient(0, -W / 2, 0, W / 2); g.addColorStop(0, light); g.addColorStop(.18, body); g.addColorStop(.85, dark); g.addColorStop(1, mixHex(v.col, '#000000', .6)); c.fillStyle = g; rrect(c, -L / 2, -W / 2, L, W, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; rrect(c, -L / 2 + 2, -W / 2 + 2, L - 4, W - 4, 5); c.stroke();
    if (v.t === 'truck') {
      c.fillStyle = 'rgba(0,0,0,.38)'; rrect(c, -L / 2 + 4, -W / 2 + 4, L * .5, W - 8, 3); c.fill(); c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = .8; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(-L / 2 + 4 + i * L * .1, -W / 2 + 5); c.lineTo(-L / 2 + 4 + i * L * .1, W / 2 - 5); c.stroke(); }
      g = c.createLinearGradient(0, -W / 2, 0, W / 2); g.addColorStop(0, light); g.addColorStop(1, dark); c.fillStyle = g; rrect(c, L * .02, -W / 2 + 2, L * .46, W - 4, 5); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke();
      g = c.createLinearGradient(L * .22, 0, L * .4, 0); g.addColorStop(0, 'rgba(90,150,190,.85)'); g.addColorStop(1, 'rgba(190,225,245,.9)'); c.fillStyle = g; rrect(c, L * .22, -W / 2 + 5, L * .2, W - 10, 3); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke();
    } else {
      g = c.createLinearGradient(0, -W / 2, 0, W / 2); g.addColorStop(0, mixHex(v.col, '#000000', .2)); g.addColorStop(1, mixHex(v.col, '#000000', .55)); c.fillStyle = g; rrect(c, -L * .1, -W / 2 + 3, L * .38, W - 6, 5); c.fill(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.stroke();
      g = c.createLinearGradient(L * .2, 0, L * .4, 0); g.addColorStop(0, 'rgba(80,140,185,.9)'); g.addColorStop(1, 'rgba(200,232,248,.95)'); c.fillStyle = g; rrect(c, L * .2, -W / 2 + 4, L * .17, W - 8, 3); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke();
      c.fillStyle = 'rgba(70,120,160,.8)'; rrect(c, -L * .3, -W / 2 + 5, L * .12, W - 10, 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke();
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = .9; c.beginPath(); c.moveTo(-L * .1, -W / 2 + 2); c.lineTo(-L * .1, W / 2 - 2); c.moveTo(L * .1, -W / 2 + 2); c.lineTo(L * .1, W / 2 - 2); c.stroke();
    }
    for (const s of [-1, 1]) { c.fillStyle = '#fff4c8'; rrect(c, L / 2 - 5, s * (W / 2 - 6.5) - 2.6, 5, 5.2, 2); c.fill(); c.strokeStyle = '#555'; c.lineWidth = .8; c.stroke(); c.fillStyle = '#c02020'; rrect(c, -L / 2, s * (W / 2 - 6) - 2.2, 3, 4.4, 1); c.fill(); gradBall(c, L * .17, s * (W / 2 + 1.2), 2.2, light, dark); }
  });
}

// ---------- rendu des entités ----------
function shadowE(c, x, y, rx, ry, h) { dropShadow(c, x, y, rx, ry, h || 8); }
function drawPlayer(c, time) {
  const x = P.x, y = P.y, w = curWeapon(), hurt = P.hurtT > 0, closed = P.veh && P.veh.def.closed;
  if (!P.veh) shadowE(c, x, y + 4, 11, 8, 8);
  c.save(); c.translate(x, y); c.rotate(P.ang);
  if (!closed) drawFeet(c, P.walk || 0, 12, P.moving ? 1 : .08, '#2a2418');
  let reach = 0;
  if (w) {
    const b = WEAPONS[w.id];
    if (b.melee) { reach = P.swing > 0 ? 16 : 6; c.save(); c.translate(12, 7); c.rotate(P.swing > 0 ? -.9 + (1 - P.swing / .2) * 1.8 : .3); drawMeleeModel(c, w.id, b); c.restore(); }
    else {
      const len = b.flame ? 26 : ({ pistol: 14, smg: 20, shotgun: 26, hunter: 32, ar: 28, crossbow: 22 }[w.id] || 18);
      let g = c.createLinearGradient(0, -2.6, 0, 2.6); g.addColorStop(0, '#6a6e78'); g.addColorStop(1, '#1c1e24'); c.fillStyle = g; rrect(c, 7, -2.6, len, 5.2, 1.6); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = .8; c.stroke(); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(8, -2, len - 2, 1);
      if (b.flame) { gradBall(c, 14, 4.5, 4.2, '#a82a1c', '#4a100a'); }
      if (w.att.sight) { c.fillStyle = '#16181e'; rrect(c, 13, -5.2, 9, 3, 1); c.fill(); if (w.att.sight === 'scope') { gradBall(c, 21, -3.7, 1.8, '#8ac0e0', '#1a3a50'); } }
      if (w.att.muzzle) { c.fillStyle = '#2a2c32'; rrect(c, 7 + len, -2.2, 7, 4.4, 1.5); c.fill(); }
      if (w.att.mag) { c.fillStyle = '#26282e'; c.fillRect(13, 2.4, 5, 7); }
      reach = 14;
      if (P.flashT > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.rotate(0); blit(c, glowSprite('255,214,110'), 12 + len + 5, 0, 0, .95 + Math.random() * .35); c.restore(); c.fillStyle = 'rgba(255,240,180,.95)'; c.beginPath(); c.moveTo(10 + len, 0); for (let i = 0; i < 6; i++) { const a = -1 + i * .4; c.lineTo(10 + len + Math.cos(a) * (6 + Math.random() * 6), Math.sin(a) * (4 + Math.random() * 3)); c.lineTo(10 + len + Math.cos(a + .2) * 2.5, Math.sin(a + .2) * 2); } c.closePath(); c.fill(); }
    }
  }
  if (!closed) {
    const sp = playerSprite(); if (hurt) { blit(c, flashOf(sp), 0, 0); c.globalAlpha = .55; } blit(c, sp, 0, 0); c.globalAlpha = 1;
  }
  c.restore();
  if (P.swing > 0 && w && WEAPONS[w.id].melee) { const b = WEAPONS[w.id]; c.strokeStyle = 'rgba(255,255,255,' + (P.swing / .2 * .45) + ')'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(x, y, b.range - 6, P.swingA - b.arc / 2, P.swingA + b.arc / 2); c.stroke(); c.strokeStyle = 'rgba(255,255,255,' + (P.swing / .2 * .25) + ')'; c.lineWidth = 9; c.beginPath(); c.arc(x, y, b.range - 8, P.swingA - b.arc / 2.4, P.swingA + b.arc / 2.4); c.stroke(); c.lineCap = 'butt'; }
  if (w && !WEAPONS[w.id].melee && !P.dead) {
    const s = wstat(w);
    if (s.laser) { let lx = x, ly = y; const dx = Math.cos(P.ang), dy = Math.sin(P.ang); for (let d = 20; d < s.range; d += 10) { lx = x + dx * d; ly = y + dy * d; if (solidAt(Math.floor(lx / TS), Math.floor(ly / TS)) === 1) break; } c.strokeStyle = 'rgba(255,40,40,.55)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + dx * 20, y + dy * 20); c.lineTo(lx, ly); c.stroke(); c.save(); c.globalCompositeOperation = 'lighter'; blit(c, glowSprite('255,50,50'), lx, ly, 0, .45); c.restore(); }
  }
  if (P.reloading) { const b = wstat(curWeapon()); const u = 1 - P.reload / b.rel; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - 14, y - 24, 28, 4); c.fillStyle = '#fc4'; c.fillRect(x - 13, y - 23, 26 * clamp(u, 0, 1), 2); }
  if (P.burn > 0) drawFlame(c, x, y - 4, time, .6);
}
function drawMeleeModel(c, id, b) {
  const L = b.range * .45; let g;
  const handle = () => { g = c.createLinearGradient(0, -2, 0, 2); g.addColorStop(0, '#a8804a'); g.addColorStop(1, '#5a3c1c'); c.fillStyle = g; c.fillRect(0, -2, 9, 4); };
  if (id === 'knife' || id === 'machete') { handle(); g = c.createLinearGradient(0, -3, 0, 3); g.addColorStop(0, '#f0f4f8'); g.addColorStop(1, '#8a929c'); c.fillStyle = g; c.beginPath(); c.moveTo(9, -2.4); c.lineTo(9 + L, -1.6); c.lineTo(9 + L + 3, 0); c.lineTo(9, 2.4); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = .8; c.stroke(); }
  else if (id === 'axe') { handle(); c.fillRect(9, -1.6, L - 6, 3.2); g = c.createLinearGradient(0, -8, 0, 8); g.addColorStop(0, '#d8dce4'); g.addColorStop(1, '#6a707c'); c.fillStyle = g; c.beginPath(); c.moveTo(9 + L - 8, -2); c.lineTo(9 + L + 2, -9); c.lineTo(9 + L + 4, 8); c.lineTo(9 + L - 8, 2); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke(); }
  else if (id === 'pickaxe') { handle(); c.fillRect(9, -1.6, L - 6, 3.2); g = c.createLinearGradient(0, -8, 0, 8); g.addColorStop(0, '#d8dce4'); g.addColorStop(1, '#6a707c'); c.fillStyle = g; c.beginPath(); c.moveTo(9 + L - 6, -9); c.quadraticCurveTo(9 + L + 3, 0, 9 + L - 6, 9); c.lineTo(9 + L - 5, 2); c.lineTo(9 + L - 5, -2); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke(); }
  else { g = c.createLinearGradient(0, -3, 0, 3); g.addColorStop(0, '#b88c54'); g.addColorStop(1, '#5e3e1e'); c.fillStyle = g; c.beginPath(); c.moveTo(0, -1.6); c.lineTo(L, -3.6); c.lineTo(L + 4, 0); c.lineTo(L, 3.6); c.lineTo(0, 1.6); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = .8; c.stroke(); if (id === 'bat') { c.fillStyle = '#c8ccd4'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(L - 12 + i * 3, -3); c.lineTo(L - 10.6 + i * 3, -5); c.lineTo(L - 9.4 + i * 3, -3); c.fill(); } } }
}
function drawMob(c, m, time) {
  const def = m.def, r = m.r, hit = m.hitT > 0;
  shadowE(c, m.x, m.y + 2, r * 1.05, r * .8, r * 1.4);
  c.save(); c.translate(m.x, m.y); c.rotate(m.aang);
  let spr, lunge = m.lunge > 0 ? 4 : 0;
  if (def.fac === 'undead') { if (m.t !== 'queen' && m.t !== 'crawler' && m.t !== 'rats') drawFeet(c, m.anim * 1.6, r, m.state === 'idle' ? .1 : 1, '#2a2a2a'); spr = NEWZ[m.t] ? monsterSprite(m.t) : zombieSprite(m); const sw = Math.sin(m.anim) * .05; c.rotate(sw); if (m.t === 'bloater') { c.scale(1 + Math.sin(time * 3 + m.homeX) * .03, 1 + Math.sin(time * 3 + m.homeX) * .03); } blit(c, spr, lunge, 0); if (hit) { c.globalAlpha = .7; blit(c, flashOf(spr), lunge, 0); c.globalAlpha = 1; } }
  else if (def.human) {
    drawFeet(c, m.anim * 1.6, r, m.state === 'combat' || m.state === 'investigate' ? 1 : .1, '#1a1a1a'); const w = WEAPONS[def.gun], gl = def.gun === 'shotgun' || def.gun === 'ar' || def.gun === 'hunter' ? 24 : def.gun === 'smg' ? 18 : 12;
    let g = c.createLinearGradient(0, -2.6, 0, 2.6); g.addColorStop(0, '#6a6e78'); g.addColorStop(1, '#1c1e24'); c.fillStyle = g; rrect(c, 8, -2.6, gl, 5.2, 1.5); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = .8; c.stroke();
    spr = humanSprite(m); blit(c, spr, 0, 0); if (hit) { c.globalAlpha = .7; blit(c, flashOf(spr), 0, 0); c.globalAlpha = 1; }
    if (m.flashT > 0) { m.flashT -= .016; c.save(); c.globalCompositeOperation = 'lighter'; blit(c, glowSprite('255,214,110'), 8 + gl + 4, 0, 0, .9); c.restore(); }
    if (def.boss) { c.strokeStyle = 'rgba(255,208,112,.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, r + 4, 0, TAU); c.stroke(); }
  } else {
    spr = animalSprite(m.t); const k = r / ({ rabbit: 7, deer: 13, boar: 13, wolf: 12, hound: 13, bear: 20 }[m.t] || 12) * ({ rabbit: 1.05, deer: 1.0, boar: 1.0, wolf: 1.0, hound: 1.0, bear: 1.0 }[m.t] || 1);
    c.fillStyle = '#16120e'; const sz = r, s2 = Math.sin(m.anim * 1.8) * sz * .55; c.beginPath(); c.ellipse(sz * .7 + s2, sz * .62, sz * .3, sz * .17, 0, 0, TAU); c.ellipse(sz * .7 - s2, -sz * .62, sz * .3, sz * .17, 0, 0, TAU); c.ellipse(-sz * .8 - s2, sz * .62, sz * .3, sz * .17, 0, 0, TAU); c.ellipse(-sz * .8 + s2, -sz * .62, sz * .3, sz * .17, 0, 0, TAU); c.fill();
    c.scale(k, k); blit(c, spr, 0, 0); if (hit) { c.globalAlpha = .7; blit(c, flashOf(spr), 0, 0); c.globalAlpha = 1; }
  }
  c.restore();
  if (m.windup > 0) { c.strokeStyle = 'rgba(255,60,50,' + (.4 + Math.sin(time * 30) * .3) + ')'; c.lineWidth = 3; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + Math.cos(m.aang) * 420, m.y + Math.sin(m.aang) * 420); c.stroke(); c.setLineDash([]); }
  if (def.ignite || def.aura || def.trail || def.summon || def.hive) { c.save(); c.globalCompositeOperation = 'lighter'; const rgb = def.ignite ? '255,130,40' : def.aura ? '140,255,60' : def.trail ? '150,220,50' : '190,110,255'; c.globalAlpha = .35 + Math.sin(time * 5 + m.homeX) * .1; blit(c, glowSprite(rgb), m.x, m.y, 0, r / 12 * (def.hive ? 2.6 : 1.7)); c.restore(); }
  if (m.stun > 0) { c.font = '14px sans-serif'; c.textAlign = 'center'; c.fillText('💫', m.x, m.y - r - 10); }
  if (m.burn > 0 && !def.fireproof) drawFlame(c, m.x, m.y - 2, time, .55);
  drawHPBar(c, m, Math.max(18, r * 2));
  if (m.name && dist(m.x, m.y, P.x, P.y) < 500) { c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText('☠ ' + m.name, m.x, m.y - r - 16); c.fillStyle = '#ff9a8a'; c.fillText('☠ ' + m.name, m.x, m.y - r - 16); }
  if (def.tame && dist(m.x, m.y, P.x, P.y) < 110) { c.font = '11px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(def.n + ' 🐾', m.x, m.y - r - 14); c.fillStyle = '#ffe9a0'; c.fillText(def.n + ' 🐾', m.x, m.y - r - 14); }
}
function drawFriend(c, f, time) {
  shadowE(c, f.x, f.y + 2, f.r, f.r * .8, f.r * 1.3);
  c.save(); c.translate(f.x, f.y); c.rotate(f.aang); const hit = f.hitT > 0;
  if (f.kind === 'pet') {
    const spr = animalSprite(f.sp), k = f.r / ({ boar: 13, wolf: 12, hound: 13, bear: 20 }[f.sp] || 12), sz = f.r, s2 = Math.sin(f.anim * 1.8) * sz * .55;
    c.fillStyle = '#16120e'; c.beginPath(); c.ellipse(sz * .7 + s2, sz * .62, sz * .3, sz * .17, 0, 0, TAU); c.ellipse(sz * .7 - s2, -sz * .62, sz * .3, sz * .17, 0, 0, TAU); c.ellipse(-sz * .8 - s2, sz * .62, sz * .3, sz * .17, 0, 0, TAU); c.ellipse(-sz * .8 + s2, -sz * .62, sz * .3, sz * .17, 0, 0, TAU); c.fill();
    c.scale(k, k); blit(c, spr, f.lunge > 0 ? 4 : 0, 0); petCollar(c, 12); if (hit) { c.globalAlpha = .7; blit(c, flashOf(spr), 0, 0); c.globalAlpha = 1; }
  } else {
    drawFeet(c, f.anim * 2.4, f.r, .8, '#1a1a1a');
    const w = WEAPONS[f.gun], gl = f.gun === 'shotgun' || f.gun === 'ar' ? 24 : f.gun === 'smg' ? 18 : 12; let g = c.createLinearGradient(0, -2.6, 0, 2.6); g.addColorStop(0, '#6a6e78'); g.addColorStop(1, '#1c1e24'); c.fillStyle = g; rrect(c, 8, -2.6, gl, 5.2, 1.5); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = .8; c.stroke();
    const spr = gunnerSprite(f); blit(c, spr, 0, 0); if (hit) { c.globalAlpha = .7; blit(c, flashOf(spr), 0, 0); c.globalAlpha = 1; }
    if (f.flashT > 0) { c.save(); c.globalCompositeOperation = 'lighter'; blit(c, glowSprite('255,214,110'), 8 + gl + 4, 0, 0, .9); c.restore(); }
  }
  c.restore();
  drawHPBar(c, f, 22);
  c.font = '10px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; const nm = f.name + (f.lvl > 1 ? ' ' + f.lvl : ''); c.strokeText(nm, f.x, f.y - f.r - 12); c.fillStyle = f.kind === 'pet' ? '#ffd0a0' : '#a0d0ff'; c.fillText(nm, f.x, f.y - f.r - 12);
}
function drawNPCs(c, cx, cy) {
  for (const n of G.npcs) {
    if (n.x < cx - 40 || n.x > cx + VW + 40 || n.y < cy - 40 || n.y > cy + VH + 40) continue;
    shadowE(c, n.x, n.y + 3, 10, 8, 8);
    c.save(); c.translate(n.x, n.y); c.rotate(n.face + Math.sin(n.anim) * .05); drawFeet(c, n.anim * 2, 11, .05, '#2a2418'); blit(c, npcSprite(n), 0, 0); c.restore();
    const near = dist(n.x, n.y, P.x, P.y) < 130;
    c.font = (near ? 'bold ' : '') + '11px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(n.name, n.x, n.y - 22); c.fillStyle = '#fff'; c.fillText(n.name, n.x, n.y - 22);
    const hasQ = n.role !== 'trade' ? (questAvailable(n.id).length > 0) : false; const ready = Object.values(G.quests.active).some(st => { const q = questDef(st.id, st); return q && q.giver === n.id && st.ready; });
    const bob = Math.sin(performance.now() / 300) * 2;
    if (ready) { c.fillStyle = '#6f6'; c.font = 'bold 20px sans-serif'; c.strokeText('?', n.x, n.y - 34 + bob); c.fillText('?', n.x, n.y - 34 + bob); } else if (hasQ) { c.fillStyle = '#fd4'; c.font = 'bold 20px sans-serif'; c.strokeText('!', n.x, n.y - 34 + bob); c.fillText('!', n.x, n.y - 34 + bob); }
  }
}
