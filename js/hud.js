'use strict';
// ===== Interface en jeu (canvas) : stats, hotbar, boussole, minimap, viseur, effets =====
function fitText(c, t, w) { if (c.measureText(t).width <= w) return t; while (t.length > 3 && c.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; }
function glass(c, x, y, w, h, r, a) { c.fillStyle = 'rgba(8,12,16,' + (a || .62) + ')'; rrect(c, x, y, w, h, r || 8); c.fill(); c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 1; rrect(c, x + .5, y + .5, w - 1, h - 1, r || 8); c.stroke(); }

// barre de stat avec dégradé, icône, valeur
function statBar(c, x, y, w, h, v, max, c1, c2, label, icon, time, lag) {
  const u = clamp(v / max, 0, 1);
  c.fillStyle = 'rgba(0,0,0,.5)'; rrect(c, x, y, w, h, h / 2); c.fill();
  if (lag !== undefined && lag > v) { c.fillStyle = 'rgba(255,230,160,.55)'; rrect(c, x + 1, y + 1, Math.max(h - 2, (w - 2) * clamp(lag / max, 0, 1)), h - 2, h / 2 - 1); c.fill(); }
  if (u > 0.002) { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g; rrect(c, x + 1, y + 1, Math.max(h - 2, (w - 2) * u), h - 2, h / 2 - 1); c.fill(); c.fillStyle = 'rgba(255,255,255,.18)'; rrect(c, x + 2, y + 2, Math.max(h - 6, (w - 6) * u), (h - 4) * .4, 3); c.fill(); }
  if (u < .25) { const pu = .5 + Math.sin(time * 7) * .5; c.strokeStyle = 'rgba(255,70,60,' + (.35 + pu * .5) + ')'; c.lineWidth = 1.5; rrect(c, x, y, w, h, h / 2); c.stroke(); }
  c.font = '15px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(icon, x - 16, y + h / 2 + 1);
  c.font = 'bold 10px sans-serif'; c.textAlign = 'right'; c.lineWidth = 2.5; c.strokeStyle = 'rgba(0,0,0,.65)'; c.strokeText(label, x + w - 6, y + h / 2 + 1); c.fillStyle = '#fff'; c.fillText(label, x + w - 6, y + h / 2 + 1);
  c.textBaseline = 'alphabetic';
}

function drawHUD(c, time) {
  if (G.noHud || (P.dead && !G.over)) return;
  const S = SET.hud, W = VW / S, H = VH / S;
  drawScreenFx(c, time);
  c.save(); c.scale(S, S);
  drawStats(c, W, H, time);
  drawMessages(c, W, H);
  drawToasts(c, W, H);
  drawHotbar(c, W, H, time);
  drawClock(c, W, H, time);
  drawCompass(c, W, H, time);
  drawTopBars(c, W, H);
  drawMinimap(c, W, H, time);
  if (P.buff && P.buff.t > 0) { c.font = 'bold 12px sans-serif'; const t = '⚡ ' + P.buff.n + ' ' + Math.ceil(P.buff.t) + 's'; const w = c.measureText(t).width + 18; glass(c, W / 2 - w / 2, H - 104, w, 22, 8, .7); c.fillStyle = '#ffe070'; c.textAlign = 'center'; c.fillText(t, W / 2, H - 88); }
  drawQuestTracker(c, W, H);
  drawPrompt(c, W, H, time);
  if (P.veh) drawVehGauge(c, W, H);
  drawBanner(c, W, H);
  c.restore();
  drawCombo(c, W, time);
  drawCrosshair(c, time);
  // fondus
  const sf = G.sleeping ? 1 - clamp(G.sleepFade, 0, 1) : (G.wakeFade > 0 ? G.wakeFade : 0);
  if (sf > 0) { c.fillStyle = 'rgba(0,0,10,' + sf + ')'; c.fillRect(0, 0, VW, VH); if (G.sleeping) { c.fillStyle = '#fff'; c.font = 'bold 24px sans-serif'; c.textAlign = 'center'; c.fillText('Zzz...', VW / 2, VH / 2); } }
  if (G.fadeIn > 0) { c.fillStyle = 'rgba(0,0,0,' + clamp(G.fadeIn, 0, 1) + ')'; c.fillRect(0, 0, VW, VH); }
}

// ----- effets plein écran : vignette, faible vie, indicateurs directionnels, menaces -----
function drawScreenFx(c, time) {
  const low = P.hp < maxHP() * .3 ? 1 - P.hp / (maxHP() * .3) : 0;
  // vignette de base
  const g0 = c.createRadialGradient(VW / 2, VH / 2, VH * .45, VW / 2, VH / 2, VH * .95); g0.addColorStop(0, 'rgba(0,0,0,0)'); g0.addColorStop(1, 'rgba(0,0,0,.42)'); c.fillStyle = g0; c.fillRect(0, 0, VW, VH);
  if (low > 0) {
    c.globalCompositeOperation = 'saturation'; c.fillStyle = 'rgba(128,128,128,' + (low * .6) + ')'; c.fillRect(0, 0, VW, VH); c.globalCompositeOperation = 'source-over';
    const pu = .6 + Math.sin(time * 6) * .3, g = c.createRadialGradient(VW / 2, VH / 2, VH * .3, VW / 2, VH / 2, VH * .85); g.addColorStop(0, 'rgba(150,0,0,0)'); g.addColorStop(1, 'rgba(150,0,0,' + (low * pu * .7) + ')'); c.fillStyle = g; c.fillRect(0, 0, VW, VH);
  }
  if (P.hurtT > 0) { const g = c.createRadialGradient(VW / 2, VH / 2, VH * .25, VW / 2, VH / 2, VH * .8); g.addColorStop(0, 'rgba(200,0,0,0)'); g.addColorStop(1, 'rgba(200,0,0,' + (P.hurtT / .3 * .5) + ')'); c.fillStyle = g; c.fillRect(0, 0, VW, VH); }
  if (G.radLv > 0.05) { c.fillStyle = 'rgba(120,255,40,' + Math.min(.16, G.radLv * .05) * (.6 + Math.sin(time * 9) * .4) + ')'; c.fillRect(0, 0, VW, VH); }
  if (P.temp < 28) { const k = (28 - P.temp) / 28; const g = c.createRadialGradient(VW / 2, VH / 2, VH * .35, VW / 2, VH / 2, VH * .9); g.addColorStop(0, 'rgba(120,180,255,0)'); g.addColorStop(1, 'rgba(120,180,255,' + k * .4 + ')'); c.fillStyle = g; c.fillRect(0, 0, VW, VH); }
  else if (P.temp > 82) { const k = (P.temp - 82) / 18; const g = c.createRadialGradient(VW / 2, VH / 2, VH * .35, VW / 2, VH / 2, VH * .9); g.addColorStop(0, 'rgba(255,140,40,0)'); g.addColorStop(1, 'rgba(255,140,40,' + k * .38 + ')'); c.fillStyle = g; c.fillRect(0, 0, VW, VH); }
  // indicateurs de dégâts
  for (const d of G.dmgInd) { const a = d.t / .9; c.strokeStyle = 'rgba(255,50,40,' + a * .8 + ')'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.arc(VW / 2, VH / 2, Math.min(VW, VH) * .36, d.a - .32, d.a + .32); c.stroke(); c.lineCap = 'butt'; }
  // menaces hors écran
  let n = 0;
  for (const m of G.mobs) {
    if (m.dead || n > 10 || m.def.fac === 'wild' || !(m.state === 'chase' || m.state === 'combat')) continue;
    const dx = m.x - P.x, dy = m.y - P.y, d = Math.hypot(dx, dy); if (d > 800 || d < 120) continue;
    const sx = m.x - G.camX, sy = m.y - G.camY; if (sx > 30 && sx < VW - 30 && sy > 30 && sy < VH - 30) continue;
    const a = Math.atan2(dy, dx), ex = VW / 2 + Math.cos(a) * (VW / 2 - 26), ey = VH / 2 + Math.sin(a) * (VH / 2 - 26), cx = clamp(ex, 20, VW - 20), cy = clamp(ey, 20, VH - 20);
    c.save(); c.translate(cx, cy); c.rotate(a); c.globalAlpha = clamp(1 - d / 900, .3, .85); c.fillStyle = m.def.fac === 'undead' ? '#e0483a' : '#e08a2a'; c.beginPath(); c.moveTo(9, 0); c.lineTo(-6, -6); c.lineTo(-6, 6); c.closePath(); c.fill(); c.restore(); n++;
  }
  c.globalAlpha = 1;
  // flèche objectif (tutoriel > quête)
  let tg = tutTarget();
  if (!tg) { const id = G.quests.tracked; if (id && G.quests.active[id]) { const st = G.quests.active[id]; tg = questTargetPos(questDef(id, st), st); } }
  if (tg) {
    const sx = tg.x - G.camX, sy = tg.y - G.camY;
    if (sx < 30 || sy < 70 || sx > VW - 30 || sy > VH - 140) {
      const a = Math.atan2(tg.y - P.y, tg.x - P.x), ex = clamp(VW / 2 + Math.cos(a) * VW, 44, VW - 44), ey = clamp(VH / 2 + Math.sin(a) * VH, 96, VH - 150), bob = Math.sin(time * 5) * 2;
      c.save(); c.translate(ex, ey); c.rotate(a); c.fillStyle = '#ffd24a'; c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(16 + bob, 0); c.lineTo(-8, -10); c.lineTo(-3, 0); c.lineTo(-8, 10); c.closePath(); c.fill(); c.stroke(); c.restore();
      c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.8)'; const lb = tg.label + ' · ' + Math.round(dist(P.x, P.y, tg.x, tg.y) / TS) + ' m'; c.strokeText(lb, ex, ey + 26); c.fillStyle = '#ffd24a'; c.fillText(lb, ex, ey + 26);
    }
  }
}

// ----- panneau de stats -----
function drawStats(c, W, H, time) {
  const rad = P.rad > .5 || (G.radLv || 0) > 0, rows = rad ? 6 : 5, x = 14, w = 238, h = 20 + rows * 21 + 36, y = H - h - 12;
  glass(c, x, y, w, h, 12, .6);
  G.hpLag = G.hpLag === undefined ? P.hp : (G.hpLag > P.hp ? Math.max(P.hp, G.hpLag - (G.hpLag - P.hp) * .035 - .05) : P.hp);
  const bx = x + 34, bw = w - 48; let by = y + 12;
  statBar(c, bx, by, bw, 16, P.hp, maxHP(), '#f0584a', '#a8281e', Math.ceil(P.hp) + ' / ' + Math.ceil(maxHP()), '❤️', time, G.hpLag); by += 21;
  statBar(c, bx, by, bw, 16, P.hun, 100, '#f0a23a', '#b86a14', Math.ceil(P.hun) + '%', '🍖', time); by += 21;
  statBar(c, bx, by, bw, 16, P.thi, 100, '#4aa8ee', '#1e66a8', Math.ceil(P.thi) + '%', '💧', time); by += 21;
  statBar(c, bx, by, bw, 16, P.stam, maxStam(), '#5ed88a', '#2a9a58', Math.ceil(P.stam) + '', '⚡', time); by += 21;
  { // température
    c.fillStyle = 'rgba(0,0,0,.5)'; rrect(c, bx, by, bw, 16, 8); c.fill();
    const gr = c.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#3a7bd5'); gr.addColorStop(.28, '#3aa8a8'); gr.addColorStop(.5, '#5cc060'); gr.addColorStop(.72, '#e0a830'); gr.addColorStop(1, '#e0402a');
    c.globalAlpha = .8; c.fillStyle = gr; rrect(c, bx + 1, by + 1, bw - 2, 14, 7); c.fill(); c.globalAlpha = 1;
    const mx = bx + 4 + (bw - 8) * clamp(P.temp / 100, 0, 1); c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1; rrect(c, mx - 2, by - 2, 4, 20, 2); c.fill(); c.stroke();
    c.font = '15px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🌡️', bx - 16, by + 9);
    c.font = 'bold 10px sans-serif'; c.textAlign = 'left'; c.lineWidth = 2.5; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(tempLabel() + (P.wet > .3 ? ' · mouillé' : ''), bx + 7, by + 9); c.fillStyle = '#fff'; c.fillText(tempLabel() + (P.wet > .3 ? ' · mouillé' : ''), bx + 7, by + 9); c.textBaseline = 'alphabetic'; by += 21;
  }
  if (rad) { statBar(c, bx, by, bw, 16, P.rad, 100, '#b0e040', '#5a8a12', Math.ceil(P.rad) + '%' + (G.radLv > 0 ? ' +' + G.radLv.toFixed(1) + '/s' : ''), '☢️', time); by += 21; }
  // pied : armure, niveau, xp
  c.font = 'bold 11px sans-serif'; c.textAlign = 'left'; c.fillStyle = '#ddd'; c.fillText('🛡️ ' + armorValue().toFixed(0), x + 12, by + 14);
  c.fillText('⭐ Niv ' + P.lvl + (P.sp ? '   ✚' + P.sp + ' pt [K]' : ''), x + 66, by + 14);
  c.fillStyle = 'rgba(255,255,255,.12)'; rrect(c, x + 12, by + 20, w - 24, 5, 2.5); c.fill(); c.fillStyle = '#8ac8ff'; rrect(c, x + 12, by + 20, Math.max(5, (w - 24) * P.xp / xpNeed(P.lvl)), 5, 2.5); c.fill();
  // statuts
  let sx = x + 4; c.font = '16px sans-serif'; c.textAlign = 'left';
  for (const [on, ic] of [[P.bleed, '🩸'], [P.infect, '☣️'], [P.sick > 0, '🤢'], [P.burn > 0, '🔥'], [P.painT > 0, '💊'], [P.exhausted, '😮‍💨'], [P.wet > .3, '💧'], [P.temp < 30, '🥶'], [P.temp > 80, '🥵'], [G.radLv > 0, '☢️']]) if (on) { glass(c, sx, y - 28, 26, 24, 7, .6); c.fillText(ic, sx + 4, y - 10); sx += 29; }
  G.statsTop = y;
}
function drawMessages(c, W, H) {
  const baseY = (G.statsTop || H - 200) - 40; let my = baseY; c.font = '13px sans-serif'; c.textAlign = 'left';
  for (let i = G.msgs.length - 1; i >= 0; i--) {
    const m = G.msgs[i], a = clamp(m.life, 0, 1), w = Math.min(560, c.measureText(m.t).width + 18);
    c.globalAlpha = a; glass(c, 14, my - 15, w, 21, 7, .5); c.fillStyle = m.col; c.fillText(fitText(c, m.t, 540), 22, my); my -= 24;
  }
  c.globalAlpha = 1;
}
function drawToasts(c, W, H) {
  let y = H - 150; c.textAlign = 'right';
  for (let i = G.toasts.length - 1; i >= 0; i--) {
    const t = G.toasts[i], a = clamp(t.life, 0, 1), pop = t.pop > 0 ? 1 + t.pop * 1.4 : 1; const txt = '+' + t.n + ' ' + t.name; c.font = 'bold 13px sans-serif'; const w = c.measureText(txt).width + 46;
    c.save(); c.globalAlpha = a; c.translate(W - 16, y); c.scale(pop, pop); glass(c, -w, -20, w, 30, 9, .62);
    c.font = '18px sans-serif'; c.textAlign = 'left'; c.fillText(t.icon, -w + 8, 3); c.font = 'bold 13px sans-serif'; c.fillStyle = '#bff5c4'; c.fillText(txt, -w + 34, 3); c.restore(); y -= 34;
  }
  c.globalAlpha = 1;
}

// ----- hotbar -----
function drawHotbar(c, W, H, time) {
  const n = 5, bw = 62, gap = 6, tw = n * bw + (n - 1) * gap, x0 = W / 2 - tw / 2, y0 = H - 78;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (bw + gap), w = P.slots[i], sel = i === P.sel;
    c.save(); if (sel) { c.translate(x + bw / 2, y0 + 33); c.scale(1.07, 1.07); c.translate(-(x + bw / 2), -(y0 + 33)); }
    c.fillStyle = sel ? 'rgba(60,44,16,.85)' : 'rgba(8,12,16,.62)'; rrect(c, x, y0, bw, 60, 8); c.fill();
    c.strokeStyle = sel ? '#ffc850' : 'rgba(255,255,255,.14)'; c.lineWidth = sel ? 2 : 1; rrect(c, x, y0, bw, 60, 8); c.stroke();
    if (sel) { const g = c.createRadialGradient(x + bw / 2, y0 + 30, 4, x + bw / 2, y0 + 30, 40); g.addColorStop(0, 'rgba(255,200,80,.25)'); g.addColorStop(1, 'rgba(255,200,80,0)'); c.fillStyle = g; c.fillRect(x, y0, bw, 60); }
    c.fillStyle = sel ? '#ffd890' : '#8a949e'; c.font = 'bold 10px sans-serif'; c.textAlign = 'left'; c.fillText(String(i + 1), x + 5, y0 + 12);
    if (w) {
      const b = WEAPONS[w.id]; c.font = '26px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(b.i, x + bw / 2, y0 + 33);
      { const d = durOf(w); if (d < 100) { const col = d > 50 ? '#8ad08a' : d > 25 ? '#e8b850' : (Math.sin(time * 9) > 0 ? '#ff6a5a' : '#a03a30'); c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(x + 4, y0 + 3, 3, 40); c.fillStyle = col; c.fillRect(x + 4, y0 + 3 + 40 * (1 - d / 100), 3, 40 * d / 100); } }
      if (!b.melee) {
        const s = wstat(w), res = ammoReserve(w), low = w.mag === 0 || w.mag <= s.mag * .25;
        c.fillStyle = 'rgba(255,255,255,.14)'; rrect(c, x + 6, y0 + 38, bw - 12, 4, 2); c.fill(); c.fillStyle = low ? (Math.sin(time * 10) > 0 || w.mag > 0 ? '#ff6a5a' : '#fff') : '#ffd86a'; rrect(c, x + 6, y0 + 38, Math.max(2, (bw - 12) * w.mag / s.mag), 4, 2); c.fill();
        c.font = 'bold 10px sans-serif'; c.fillStyle = res === 0 && w.mag === 0 ? '#ff7a6a' : '#e8e0c8'; c.fillText(w.mag + ' | ' + res, x + bw / 2, y0 + 54);
        if (P.reloading && sel) { const u = 1 - P.reload / s.rel; c.strokeStyle = '#ffd86a'; c.lineWidth = 3; c.beginPath(); c.arc(x + bw / 2, y0 + 25, 17, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(u, 0, 1)); c.stroke(); }
      } else { c.font = '10px sans-serif'; c.fillStyle = '#9ad'; c.fillText('mêlée' + (w.lvl > 1 ? ' +' + (w.lvl - 1) : ''), x + bw / 2, y0 + 54); }
    }
    c.restore();
  }
  const gl = gadgetList(), gx = x0 + tw + 14;
  glass(c, gx, y0, 74, 60, 8, .62); c.font = 'bold 10px sans-serif'; c.fillStyle = '#8a949e'; c.textAlign = 'left'; c.fillText('G / F', gx + 5, y0 + 12);
  if (gl.length) { const id = gl[P.gadSel % gl.length]; c.font = '26px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(ITEMS[id].i, gx + 37, y0 + 34); c.font = 'bold 10px sans-serif'; c.fillStyle = '#ffe9a0'; c.fillText(fitText(c, ITEMS[id].n, 50) + ' ×' + invCount(id), gx + 37, y0 + 53); }
  else { c.font = '10px sans-serif'; c.fillStyle = '#6a747e'; c.textAlign = 'center'; c.fillText('gadget', gx + 37, y0 + 38); }
  // poids + capsules
  c.font = 'bold 12px sans-serif'; c.textAlign = 'right'; const wt = invWeight(), cap = invCap(); c.fillStyle = wt > cap * .9 ? '#ff8a7a' : '#d8dce0'; c.fillText('🎒 ' + wt.toFixed(0) + '/' + cap, x0 - 12, y0 + 22); c.fillStyle = '#ffd24a'; c.fillText('🪙 ' + invCount('caps'), x0 - 12, y0 + 40);
  c.font = '10px sans-serif'; c.fillStyle = 'rgba(200,210,220,.55)'; c.textAlign = 'center'; c.fillText('Espace esquive · Maj sprint · Q arme précédente · H soin · Tab sac · B construire · F1 aide', W / 2, H - 8);
}

// ----- heure, météo, boussole -----
function drawClock(c, W, H, time) {
  const ph = phaseOf(G.clock), w = 250, x = W / 2 - w / 2, y = 8;
  glass(c, x, y, w, 36, 10, .6);
  c.font = '20px sans-serif'; c.textAlign = 'left'; c.fillText(isNight() ? '🌙' : '☀️', x + 10, y + 25);
  c.font = 'bold 15px sans-serif'; c.fillStyle = '#fff'; c.fillText('Jour ' + G.day, x + 40, y + 17); c.font = '12px sans-serif'; c.fillStyle = '#c8d0d8'; c.fillText(clockText(), x + 40, y + 31);
  if (G.wType !== 'clear') { c.font = '18px sans-serif'; c.fillText(WEATHER[G.wType].i, x + w - 36, y + 24); }
  // piste jour/nuit
  const tx = x + 100, tw = w - 150; const gr = c.createLinearGradient(tx, 0, tx + tw, 0); gr.addColorStop(0, '#2a3a6a'); gr.addColorStop(.08, '#f0a050'); gr.addColorStop(.2, '#f4e08a'); gr.addColorStop(.5, '#f4e08a'); gr.addColorStop(.62, '#f08040'); gr.addColorStop(.72, '#2a3a6a'); gr.addColorStop(1, '#141c3a');
  c.fillStyle = gr; rrect(c, tx, y + 14, tw, 8, 4); c.fill(); const mx = tx + tw * ph; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 1.5; c.beginPath(); c.arc(mx, y + 18, 5, 0, TAU); c.fill(); c.stroke();
}
function drawCompass(c, W, H, time) {
  const w = 380, x = W / 2 - w / 2, y = 50, hd = P.veh ? P.veh.ang : P.ang;
  glass(c, x, y, w, 22, 8, .42); c.save(); rrect(c, x, y, w, 22, 8); c.clip();
  const px = a => x + w / 2 + angDiff(hd, a) / (Math.PI * .6) * (w / 2);
  c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1; for (let a = -180; a < 180; a += 15) { const xx = px(a * Math.PI / 180); if (xx < x || xx > x + w) continue; c.beginPath(); c.moveTo(xx, y + 16); c.lineTo(xx, y + 21); c.stroke(); }
  c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; for (const [a, t, col] of [[-Math.PI / 2, 'N', '#ff7a6a'], [0, 'E', '#dde'], [Math.PI / 2, 'S', '#dde'], [Math.PI, 'O', '#dde']]) { const xx = px(a); c.fillStyle = col; c.fillText(t, xx, y + 15); }
  const mk = (tx, ty, ic, col) => { const a = Math.atan2(ty - P.y, tx - P.x), xx = px(a); if (xx < x + 6 || xx > x + w - 6) return; c.font = '13px sans-serif'; c.fillStyle = col || '#fff'; c.fillText(ic, xx, y + 14); };
  const tg = tutTarget(); if (tg) mk(tg.x, tg.y, '📍'); else { const id = G.quests.tracked; if (id && G.quests.active[id]) { const st = G.quests.active[id], t2 = questTargetPos(questDef(id, st), st); if (t2) mk(t2.x, t2.y, '❗'); } }
  for (const p of G.pois) { if (!p.discovered || p.hidden) continue; if (p.owned) mk(p.cx, p.cy, '🚩'); else if (p.type === 'village') mk(p.cx, p.cy, '🏘️'); }
  const v = nearestVehicle(P.x, P.y, 700); if (v && !P.veh) mk(v.x, v.y, '🚗');
  for (const z of G.radZones) if (z.discovered && dist(P.x, P.y, z.x, z.y) < 1200) mk(z.x, z.y, '☢️');
  c.restore(); c.fillStyle = '#ffd86a'; c.beginPath(); c.moveTo(W / 2, y + 22); c.lineTo(W / 2 - 4, y + 28); c.lineTo(W / 2 + 4, y + 28); c.fill();
}
function drawTopBars(c, W, H) {
  let y = 82;
  if (G.assault) {
    const p = G.pois[G.assault.poi]; if (p) { const left = G.assault.mobs.filter(m => !m.dead).length, w = 300; c.fillStyle = 'rgba(110,10,10,.72)'; rrect(c, W / 2 - w / 2, y, w, 26, 8); c.fill(); c.strokeStyle = '#ff5a4a'; c.lineWidth = 1; rrect(c, W / 2 - w / 2, y, w, 26, 8); c.stroke(); c.fillStyle = '#ff9a8a'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('⚠ ASSAUT · ' + left + ' assaillants · drapeau ' + Math.max(0, Math.round(p.hpFlag / BASE_LEVELS[p.lvl].hp * 100)) + '%', W / 2, y + 17); y += 32; }
  }
  let boss = null; for (const m of G.mobs) if (!m.dead && m.def.boss && dist(m.x, m.y, P.x, P.y) < 700 && (m.state === 'combat' || m.state === 'chase' || (m.x > G.camX && m.x < G.camX + VW && m.y > G.camY && m.y < G.camY + VH))) { boss = m; break; }
  if (boss) { const w = Math.min(440, W - 80); glass(c, W / 2 - w / 2, y, w, 22, 8, .7); const g = c.createLinearGradient(0, y, 0, y + 22); g.addColorStop(0, '#d03040'); g.addColorStop(1, '#801020'); c.fillStyle = g; rrect(c, W / 2 - w / 2 + 2, y + 2, (w - 4) * clamp(boss.hp / boss.maxhp, 0, 1), 18, 6); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.lineWidth = 2.5; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText('☠ ' + boss.def.n, W / 2, y + 15); c.fillText('☠ ' + boss.def.n, W / 2, y + 15); }
}

// ----- interaction, véhicule, bannière -----
function drawPrompt(c, W, H, time) {
  if (G.prompt && !G.paused) {
    const t = G.prompt.text; c.font = 'bold 14px sans-serif'; const w = c.measureText(t).width + 56, y = H - 160;
    glass(c, W / 2 - w / 2, y, w, 32, 10, .7);
    c.fillStyle = '#ffd86a'; rrect(c, W / 2 - w / 2 + 8, y + 5, 22, 22, 5); c.fill(); c.fillStyle = '#222'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('E', W / 2 - w / 2 + 19, y + 21);
    c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(t, W / 2 - w / 2 + 38, y + 21);
    const o = G.prompt.o; if (G.prompt.t === 'harv' && o && o.hp < o.max) { c.fillStyle = 'rgba(255,255,255,.2)'; rrect(c, W / 2 - 40, y + 36, 80, 5, 2.5); c.fill(); c.fillStyle = '#7ad87a'; rrect(c, W / 2 - 40, y + 36, 80 * clamp(o.hp / o.max, 0, 1), 5, 2.5); c.fill(); }
  }
  if (G.buildMode) {
    const d = STRUCTS[G.buildType]; const t = d.i + ' ' + d.n + ' — ' + costText(costOf(d.cost)) + (G.buildErr ? '   ✖ ' + G.buildErr : '   ✔ prêt'); c.font = 'bold 13px sans-serif'; const w = c.measureText(t).width + 28;
    glass(c, W / 2 - w / 2, H - 238, w, 28, 9, .72); c.fillStyle = G.buildErr ? '#ff9a8a' : '#9fe8a8'; c.textAlign = 'center'; c.fillText(t, W / 2, H - 219);
  }
}
function drawVehGauge(c, W, H) {
  const v = P.veh, w = 300, x = W / 2 - w / 2, y = H - 218;
  glass(c, x, y, w, 56, 10, .66);
  const spd = Math.round(Math.abs(v.v) / 4);
  c.textAlign = 'left'; c.font = 'bold 26px sans-serif'; c.fillStyle = '#fff'; const sw = c.measureText(String(spd)).width; c.fillText(String(spd), x + 14, y + 40); c.font = '10px sans-serif'; c.fillStyle = '#9aa4ae'; c.fillText('km/h', x + 18 + sw, y + 40);
  c.font = '11px sans-serif'; c.fillStyle = '#d8dce0'; c.fillText(v.def.i + ' ' + v.def.n, x + 14, y + 14);
  const fb = (yy, val, max, c1, c2, lab) => { c.fillStyle = 'rgba(255,255,255,.1)'; rrect(c, x + 120, yy, 166, 14, 7); c.fill(); const g = c.createLinearGradient(0, yy, 0, yy + 14); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g; rrect(c, x + 120, yy, Math.max(8, 166 * clamp(val / max, 0, 1)), 14, 7); c.fill(); c.font = 'bold 9px sans-serif'; c.fillStyle = '#fff'; c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(lab, x + 126, yy + 10.5); c.fillText(lab, x + 126, yy + 10.5); };
  fb(y + 8, v.fuel, v.maxfuel, v.fuel < 8 ? '#f05a4a' : '#f0b23a', v.fuel < 8 ? '#a82a1e' : '#b87a14', '⛽ ' + Math.round(v.fuel) + '/' + v.maxfuel);
  fb(y + 30, v.hp, v.maxhp, v.hp < v.maxhp * .3 ? '#f05a4a' : '#5ec06a', v.hp < v.maxhp * .3 ? '#a82a1e' : '#2a8a3a', '🔧 ' + Math.round(v.hp) + '/' + v.maxhp);
}
function drawBanner(c, W, H) {
  const b = G.banner; if (!b) return; const T = 3.4, t = b.t, a = t < .4 ? t / .4 : t > T - .8 ? clamp((T - t) / .8, 0, 1) : 1, sc = t < .4 ? .85 + .15 * (t / .4) : 1;
  c.save(); c.globalAlpha = a; c.translate(W / 2, H * .24); c.scale(sc, sc);
  const g = c.createLinearGradient(-300, 0, 300, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.25, 'rgba(0,0,0,.55)'); g.addColorStop(.75, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(-340, -42, 680, b.sub ? 92 : 64);
  c.textAlign = 'center'; c.font = 'bold 34px sans-serif'; c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(b.title, 0, 0); c.fillStyle = b.col; c.fillText(b.title, 0, 0);
  if (b.sub) { c.font = '14px sans-serif'; c.lineWidth = 3; c.strokeText(b.sub, 0, 30); c.fillStyle = '#e8e8e8'; c.fillText(b.sub, 0, 30); }
  c.restore(); c.globalAlpha = 1;
}

// ----- viseur -----
function drawCombo(c, W, time) {
  if (!(G.combo >= 2) || G.comboT <= 0 || G.paused) return;
  const pop = 1 + Math.max(0, G.comboPop || 0) * 1.6, u = clamp(G.comboT / 4.5, 0, 1), x = W / 2, y = 112;
  c.save(); c.translate(x, y); c.scale(pop, pop); c.globalAlpha = Math.min(1, u * 3);
  c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.7)'; const t = 'SÉRIE x' + G.combo; c.strokeText(t, 0, 0); c.fillStyle = G.combo >= 10 ? '#ff9a5a' : '#ffd86a'; c.fillText(t, 0, 0);
  c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(-40, 7, 80, 4); c.fillStyle = c.fillStyle = G.combo >= 10 ? '#ff9a5a' : '#ffd86a'; c.fillRect(-40, 7, 80 * u, 4); c.restore();
}
function drawCrosshair(c, time) {
  if (G.paused || P.dead) return;
  const mx = G.mouse.sx, my = G.mouse.sy, w = curWeapon(); let r = 9;
  c.save();
  if (G.buildMode) { c.strokeStyle = '#6f8'; c.lineWidth = 1.5; c.beginPath(); c.arc(mx, my, 6, 0, TAU); c.stroke(); c.restore(); return; }
  const ranged = w && !WEAPONS[w.id].melee && !P.veh || (w && P.veh && !WEAPONS[w.id].melee);
  if (ranged) { const s = wstat(w); r = clamp((s.spr + P.bloom + (P.moving ? s.spr * .5 : 0)) * dist(P.x, P.y, G.mouse.x, G.mouse.y), 7, 70); }
  const hm = G.hitm; const col = hm && hm.t > 0 ? (hm.kill ? '#ff6a5a' : '#fff') : 'rgba(255,255,255,.88)';
  c.strokeStyle = col; c.lineWidth = 1.6; c.lineCap = 'round';
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; c.beginPath(); c.moveTo(mx + Math.cos(a) * (r - 3), my + Math.sin(a) * (r - 3)); c.lineTo(mx + Math.cos(a) * (r + 6), my + Math.sin(a) * (r + 6)); c.stroke(); }
  c.fillStyle = col; c.fillRect(mx - 1, my - 1, 2, 2);
  if (ranged) {
    const s = wstat(w), u = w.mag / s.mag; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(mx, my, r + 13, 0, TAU); c.stroke();
    if (P.reloading) { c.strokeStyle = '#ffd86a'; c.beginPath(); c.arc(mx, my, r + 13, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(1 - P.reload / s.rel, 0, 1)); c.stroke(); }
    else { c.strokeStyle = u < .25 ? '#ff6a5a' : 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(mx, my, r + 13, -Math.PI / 2, -Math.PI / 2 + TAU * u); c.stroke(); }
    { const hint = !P.reloading && s && w.mag <= Math.max(1, s.mag * .2) && ammoReserve(w) > 0 ? '[R] recharger' : (!P.reloading && w.mag === 0 && ammoReserve(w) === 0 ? 'plus de munitions' : (durOf(w) < 25 ? '⚠ arme usée' : ''));
      if (hint) { c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(hint, mx, my + r + 32); c.fillStyle = Math.sin(time * 8) > -.3 ? '#ffd86a' : '#fff'; c.fillText(hint, mx, my + r + 32); } }
    c.font = 'bold 11px sans-serif'; c.textAlign = 'left'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; const tx = w.mag + (ammoReserve(w) ? ' / ' + ammoReserve(w) : ''); c.strokeText(tx, mx + r + 20, my + 4); c.fillStyle = w.mag === 0 ? '#ff6a5a' : '#fff'; c.fillText(tx, mx + r + 20, my + 4);
  }
  if (hm && hm.t > 0) { const k = hm.t / .18, sz = 7 + (1 - k) * 4; c.strokeStyle = hm.kill ? '#ff5a4a' : '#fff'; c.lineWidth = hm.kill ? 3 : 2; c.globalAlpha = clamp(k * 1.5, 0, 1); c.beginPath(); for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.moveTo(mx + dx * (r + 3), my + dy * (r + 3)); c.lineTo(mx + dx * (r + sz), my + dy * (r + sz)); } c.stroke(); }
  c.restore();
}

// ----- minimap -----
function mapPoiIcon(c, p, x, y) {
  c.font = '14px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill();
  c.strokeStyle = p.owned ? '#5f8' : (p.cleared ? '#ddd' : (p.type === 'camp' || p.type === 'legion' ? '#f55' : '#888')); c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.stroke();
  c.fillStyle = '#fff'; c.fillText(p.def.icon || '•', x, y + 1); c.textBaseline = 'alphabetic';
}
function drawMinimap(c, W, H, time) {
  const S = 160, x0 = W - S - 14, y0 = 14, win = 64;
  const tx = P.x / TS, ty = P.y / TS, sx = clamp(tx - win / 2, 0, G.W - win), sy = clamp(ty - win / 2, 0, G.H - win), k = S / win;
  c.save(); rrect(c, x0, y0, S, S, 12); c.clip(); c.fillStyle = '#0a0e12'; c.fillRect(x0, y0, S, S);
  c.imageSmoothingEnabled = false; c.drawImage(G.mini, sx, sy, win, win, x0, y0, S, S);
  for (const z of G.radZones) if (z.discovered) { const px = x0 + (z.x / TS - sx) * k, py = y0 + (z.y / TS - sy) * k, rr = z.r / TS * k; c.fillStyle = 'rgba(140,255,40,.28)'; c.beginPath(); c.arc(px, py, rr, 0, TAU); c.fill(); c.strokeStyle = 'rgba(170,255,70,.85)'; c.lineWidth = 1; c.stroke(); }
  for (const v of G.vehicles) if (G.explored[IDX(Math.floor(v.x / TS), Math.floor(v.y / TS))]) { c.fillStyle = '#4af'; c.fillRect(x0 + (v.x / TS - sx) * k - 2, y0 + (v.y / TS - sy) * k - 2, 4, 4); }
  for (const p of G.pois) { if (!p.discovered || p.hidden) continue; const px = x0 + (p.cx / TS - sx) * k, py = y0 + (p.cy / TS - sy) * k; if (px < x0 - 8 || px > x0 + S + 8 || py < y0 - 8 || py > y0 + S + 8) continue; mapPoiIcon(c, p, px, py); }
  if (G.airdrop && G.airdrop.o && !G.airdrop.o.opened) { const px = x0 + (G.airdrop.x / TS - sx) * k, py = y0 + (G.airdrop.y / TS - sy) * k; c.font = '14px sans-serif'; c.textAlign = 'center'; c.fillText('📦', px, py + 4); }
  for (const f of G.friends) if (!f.dead && f.kind !== 'guard') { c.fillStyle = '#6cf'; c.fillRect(x0 + (f.x / TS - sx) * k - 1.5, y0 + (f.y / TS - sy) * k - 1.5, 3, 3); }
  for (const m of G.mobs) if (!m.dead && m.def.fac !== 'wild' && dist(m.x, m.y, P.x, P.y) < (G.droneT > 0 ? 1500 : 420) && (G.droneT > 0 || m.state === 'chase' || m.state === 'combat')) { c.fillStyle = '#f44'; c.fillRect(x0 + (m.x / TS - sx) * k - 1.5, y0 + (m.y / TS - sy) * k - 1.5, 3, 3); }
  const ppx = x0 + (tx - sx) * k, ppy = y0 + (ty - sy) * k;
  // cône de vision / direction
  c.fillStyle = 'rgba(255,255,100,.22)'; c.beginPath(); c.moveTo(ppx, ppy); c.arc(ppx, ppy, 26, P.ang - .5, P.ang + .5); c.closePath(); c.fill();
  c.fillStyle = '#ff0'; c.beginPath(); c.arc(ppx, ppy, 3.5, 0, TAU); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke();
  c.restore(); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.5; rrect(c, x0, y0, S, S, 12); c.stroke();
  c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ff7a6a'; c.fillText('N', x0 + S / 2, y0 + 12);
}
function drawQuestTracker(c, W, H) {
  const id = G.quests.tracked; if (!id || !G.quests.active[id]) return;
  const st = G.quests.active[id], q = questDef(id, st); if (!q) return;
  const w = 244, x = W - w - 14, y = 14 + 160 + 10;
  const lines = [{ t: q.title, bold: 1 }].concat(st.ready ? [{ t: '✔ Terminée — voir ' + ({ mara: 'Mara', doc: 'Dr Lin', jonas: 'Jonas' }[q.giver] || '?'), col: '#8affb0' }] : q.objs.map(o => { const p = objProgress(o, st); return { t: (p.cur >= p.need ? '✔ ' : '• ') + p.text + (p.need > 1 ? ' (' + Math.min(p.cur, p.need) + '/' + p.need + ')' : ''), col: p.cur >= p.need ? '#8affb0' : '#e0e4e8' }; }));
  glass(c, x, y, w, 14 + lines.length * 17, 9, .55); c.textAlign = 'left'; let yy = y + 19;
  for (const l of lines) { c.font = (l.bold ? 'bold ' : '') + '12px sans-serif'; c.fillStyle = l.col || '#ffe070'; c.fillText(fitText(c, l.t, w - 18), x + 9, yy); yy += 17; }
}
