'use strict';
// ===== Entrée : écran titre, réglages, entrées clavier/souris, boucle principale =====
let lastTs = 0, running = false;

function selectSlot(i) {
  if (P.slots[i] && P.sel !== i) { P.lastSel = P.sel; P.sel = i; P.reloading = false; P.cd = Math.max(P.cd, .15); SFX.play('whoosh', .6); }
}
function cycleWeapon(dir) {
  const ids = P.slots.map((w, i) => w ? i : -1).filter(i => i >= 0); if (ids.length < 2) return;
  let k = ids.indexOf(P.sel); k = (k + dir + ids.length) % ids.length; selectSlot(ids[k]);
}
function toggleBuild() {
  if (panelOpen() || P.veh) return;
  G.buildMode = !G.buildMode; refreshBuildBar(); SFX.play('ui');
  if (G.buildMode) msg('Mode construction : clic gauche pour poser, clic droit pour démonter, molette pour choisir.', '#9fe8a8');
}
const MAINTABS = ['inv', 'craft', 'mods', 'skills', 'quests', 'map'];

function onKeyDown(e) {
  if (!G || !running) return;
  if (e.target && (e.target.tagName === 'INPUT')) return;
  const code = e.code, key = e.key.toLowerCase();
  if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1', 'F3', 'F4'].includes(code)) e.preventDefault();
  if (G.over) return;
  if (code === 'F1' || key === '?') { toggleHelp(); return; }
  if (!$('settings').classList.contains('hidden')) { if (key === 'escape') closeSettings(); return; }
  if (!$('help2').classList.contains('hidden')) { if (key === 'escape') toggleHelp(); return; }
  const mv = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd' }[code];
  if (panelOpen() && MAINTABS.includes(panelTab) && (code === 'ArrowLeft' || code === 'ArrowRight' || key === 'q' && false)) { const i = MAINTABS.indexOf(panelTab); panelTab = MAINTABS[(i + (code === 'ArrowRight' ? 1 : -1) + MAINTABS.length) % MAINTABS.length]; renderPanel(); SFX.play('ui'); if (panelTab === 'map') tutEvent('map'); return; }
  if (mv) { G.keys[mv] = true; return; }
  if (code === 'ShiftLeft' || code === 'ShiftRight') { G.keys.shift = true; return; }
  if (key === 'escape') {
    if (panelOpen()) closePanel(); else if (G.buildMode) toggleBuild(); else togglePause();
    return;
  }
  if (G.pausedMenu) return;
  if (key === 'tab' || key === 'i') { if (panelTab === 'inv') closePanel(); else if (!G.paused || panelOpen()) openPanel('inv'); return; }
  if (key === 'j') { if (panelTab === 'quests') closePanel(); else if (!G.paused || panelOpen()) openPanel('quests'); return; }
  if (key === 'k') { if (panelTab === 'skills') closePanel(); else if (!G.paused || panelOpen()) openPanel('skills'); return; }
  if (key === 'm') { if (panelTab === 'map') closePanel(); else if (!G.paused || panelOpen()) openPanel('map'); return; }
  if (G.paused) return;
  const dm = /^(Digit|Numpad)([1-5])$/.exec(code); if (dm) { selectSlot(+dm[2] - 1); return; }
  if (use3D() && (code === 'Equal' || code === 'NumpadAdd' || code === 'Minus' || code === 'NumpadSubtract' || key === '+' || key === '-')) { R3.zoom = clamp((R3.zoom || 1.12) + ((code === 'Equal' || code === 'NumpadAdd' || key === '+') ? -.08 : .08), .8, 1.8); SET.zoom3d = R3.zoom; saveSettings(); return; }
  if (code === 'F3') { setMode3D(!SET.mode3d); return; }
  if (code === 'F4' && use3D()) { R3.showStats = !R3.showStats; return; }
  if (code === 'Space') { if (!e.repeat) dodgeRoll(); return; }
  switch (key) {
    case 'q': if (P.lastSel !== undefined && P.slots[P.lastSel]) selectSlot(P.lastSel); break;
    case 'e': G.keys.e = true; if (!e.repeat) interact(); break;
    case 'r': startReload(); break;
    case 'h': quickHeal(); break;
    case 'v': quickEat(); break;
    case 'c': quickDrink(); break;
    case 'f': useGadget(); break;
    case 'g': { const gl = gadgetList(); if (gl.length) { P.gadSel = (P.gadSel + 1) % gl.length; SFX.play('click'); } break; }
    case 'b': toggleBuild(); break;
    case 'l': G.flashlight = G.flashlight === false; SFX.play('click'); break;
    case 'p': saveGame(false); break;
    case 'x': { const v = P.veh || nearestVehicle(P.x, P.y, 90); if (v) openPanel('veh', v); break; }
  }
}
function onKeyUp(e) {
  if (!G) return;
  const mv = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd' }[e.code];
  if (mv) G.keys[mv] = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') G.keys.shift = false;
  if (e.key.toLowerCase() === 'e') G.keys.e = false;
}
function togglePause() {
  if (G.over) return;
  if (!G.pausedMenu) { const wn = WORLD_SIZES[G.wo.size].n + ' · ' + WORLD_STYLES[G.wo.style].n + ' · lieux ' + WORLD_DENS[G.wo.dens].n.toLowerCase(); $('seedinfo').innerHTML = 'Monde : <b>' + G.seed + '</b> <button class="sm" id="btnCopy">📋 Copier</button><br><small>' + wn + '</small>'; $('btnCopy').onclick = () => { try { navigator.clipboard.writeText(String(G.seed)); msg('Graine copiée : ' + G.seed, '#9fe8a8'); SFX.play('ui'); } catch (e) { } }; }
  G.pausedMenu = !G.pausedMenu; G.paused = G.pausedMenu || panelOpen(); $('pause').classList.toggle('hidden', !G.pausedMenu);
  if (!G.pausedMenu) closeSettings();
}
function toggleHelp() {
  const h = $('help2'), open = h.classList.contains('hidden');
  h.classList.toggle('hidden', !open);
  if (open) { G.helpWasPaused = G.paused; G.paused = true; } else { G.paused = G.helpWasPaused || G.pausedMenu || panelOpen(); }
}
function onMouseMove(e) {
  if (!G) return;
  if (running && G.tut && G.tut.on) tutEvent('aim', Math.hypot(e.clientX - G.mouse.sx, e.clientY - G.mouse.sy));
  G.mouse.sx = e.clientX; G.mouse.sy = e.clientY;
}
function onMouseDown(e) {
  if (!G || !running || G.over) return;
  SFX.init();
  if (e.target !== cvs) return;
  if (G.paused) return;
  if (e.button === 0) { G.lmb = true; G.lmbEdge = true; if (G.buildMode) { G.lastBT = IDX(Math.floor(G.mouse.x / TS), Math.floor(G.mouse.y / TS)); buildClick(false); } }
  else if (e.button === 2) { G.rmb = true; if (G.buildMode) buildClick(true); }
}
function onMouseUp(e) { if (!G) return; if (e.button === 0) G.lmb = false; if (e.button === 2) G.rmb = false; }
function buildClick(remove) {
  const tx = Math.floor(G.mouse.x / TS), ty = Math.floor(G.mouse.y / TS);
  if (remove) { const s = G.structs.get(IDX(tx, ty)); if (s && !s.free && dist(P.x, P.y, s.x, s.y) < 240) dismantle(s); return; }
  const err = checkPlace(G.buildType, tx, ty);
  if (err) { G.errShakeT = performance.now() / 1000 + .25; if (G.clock - (G.errMsgT || 0) > 1) { msg('Impossible : ' + err, '#ff9a8a'); G.errMsgT = G.clock; } SFX.play('click', .5); return; }
  placeStruct(G.buildType, tx, ty);
}
function buildDrag() { // maintenir le clic pour poser en traînant
  if (!G.buildMode || !G.lmb || G.lmbEdge) { if (!G.lmb) G.lastBT = -1; return; }
  const tx = Math.floor(G.mouse.x / TS), ty = Math.floor(G.mouse.y / TS), i = IDX(tx, ty); if (i === G.lastBT) return; G.lastBT = i;
  if (!STRUCTS[G.buildType].solid && G.buildType !== 'plot') return; buildClick(false);
}
function onWheel(e) {
  if (!G || !running || G.paused) return;
  if (G.buildMode) { const ks = Object.keys(STRUCTS); let i = ks.indexOf(G.buildType) + (e.deltaY > 0 ? 1 : -1); i = (i + ks.length) % ks.length; G.buildType = ks[i]; refreshBuildBar(); return; }
  cycleWeapon(e.deltaY > 0 ? 1 : -1);
}

function frame(ts) {
  requestAnimationFrame(frame);
  if (!running || !G) { lastTs = ts; return; }
  let dt = Math.min(.05, (ts - lastTs) / 1000 || .016); lastTs = ts;
  const time = ts / 1000;
  if (use3D()) r3mouse(); else { G.mouse.x = G.mouse.sx + (G.camX || 0); G.mouse.y = G.mouse.sy + (G.camY || 0); }
  if (G.hitstop > 0) { G.hitstop -= dt; dt = 0; }
  if (G.slowT > 0) { G.slowT -= dt; dt *= .35; }
  if (!G.paused && dt > 0) {
    updateGame(dt);
    if (G.flowDirty) { G.flowDirty = false; G.flowP.compute(Math.floor(P.x / TS), Math.floor(P.y / TS)); }
    G.prompt = (!P.dead) ? findInteract() : null;
    if (G.keys.e && G.prompt && G.prompt.t === 'harv') interact();
  }
  updateCamera(Math.max(dt, .001));
  render(time);
  document.body.classList.toggle('uiopen', G.paused);
}

function startGame(opts) {
  let ov = document.getElementById('genov'); if (!ov) { ov = document.createElement('div'); ov.id = 'genov'; ov.style.cssText = 'position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;background:rgba(8,12,16,.86);color:#e8e0c8;font:600 20px sans-serif;letter-spacing:.04em'; document.body.appendChild(ov); }
  if (SET.mode3d) ensure3D(); ov.textContent = '🌍 Génération du monde…'; ov.style.display = 'flex';
  setTimeout(() => { try { startGame2(opts); } finally { ov.style.display = 'none'; } }, 40);
}
function startGame2(opts) {
  SFX.init(); SFX.setVol();
  initGame(opts);
  $('title').classList.add('hidden'); stopTitleBg();
  G.cam.x = P.x - VW / 2; G.cam.y = P.y - VH / 2; G.camX = G.cam.x; G.camY = G.cam.y;
  running = true; G.mouse.sx = VW / 2 + 100; G.mouse.sy = VH / 2;
  refreshBuildBar();
  if (!opts.load) banner('☀ JOUR 1', 'Survivez le plus longtemps possible', '#ffe9a0');
}

// ----- réglages -----
function buildSettings() {
  const row = (label, input) => '<div class="srow"><label>' + label + '</label>' + input + '</div>';
  const slider = (k, min, max, step) => '<input type="range" data-set="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + SET[k] + '"><span class="sv" data-sv="' + k + '">' + Math.round(SET[k] * 100) + '%</span>';
  const check = k => '<input type="checkbox" data-set="' + k + '"' + (SET[k] ? ' checked' : '') + '>';
  $('settings').innerHTML = '<div class="box wide"><h2>⚙️ Options</h2>' +
    row('Volume des effets', slider('vol', 0, 1, .05)) + row('Ambiance sonore', slider('music', 0, 1, .05)) + row('Tremblements d\'écran', slider('shake', 0, 1.5, .1)) + row('Taille de l\'interface', slider('hud', .8, 1.4, .05)) +
    row('Mode 3D low-poly (bêta, F3)', check('mode3d')) + row('Résolution 3D', '<select data-sel="res3d"><option value="0">Auto (adaptative)</option><option value="0.5">Basse (50 %)</option><option value="0.75">Moyenne (75 %)</option><option value="1">Native (100 %)</option><option value="1.5">Haute (150 %)</option></select>') + row('Qualité graphique élevée', check('quality')) + row('Nombres de dégâts', check('dmgNums')) + row('Hit-stop (impact)', check('hitstop')) + row('Conseils contextuels', check('tips')) + row('Tutoriel au démarrage', check('tutorial')) + row('Pause si fenêtre inactive', check('autopause')) +
    '<div class="srow"><button id="btnTips">Réafficher tous les conseils</button><button id="btnSetClose" class="pri">Fermer</button></div></div>';
  $('settings').querySelectorAll('input[data-set]').forEach(inp => {
    inp.oninput = () => { const k = inp.dataset.set; SET[k] = inp.type === 'checkbox' ? (k === 'quality' ? (inp.checked ? 1 : 0) : inp.checked) : +inp.value; const sv = $('settings').querySelector('[data-sv="' + k + '"]'); if (sv) sv.textContent = Math.round(SET[k] * 100) + '%'; saveSettings(); if (k === 'mode3d') setMode3D(SET.mode3d); if (k === 'music' && SFX.ctx) SFX.drone(.3); };
  });
  $('settings').querySelectorAll('select[data-sel]').forEach(sl => { sl.value = String(SET[sl.dataset.sel] || 0); sl.onchange = () => { SET[sl.dataset.sel] = +sl.value; saveSettings(); }; });
  $('btnTips').onclick = () => { TIPS_SEEN = {}; saveTips(); SFX.play('ui'); };
  $('btnSetClose').onclick = closeSettings;
}
function openSettings() { buildSettings(); $('settings').classList.remove('hidden'); SFX.init(); SFX.play('ui'); }
function closeSettings() { $('settings').classList.add('hidden'); }

// ----- fond animé de l'écran titre -----
let titleRAF = 0;
function startTitleBg() {
  const cv = $('tbg'), c = cv.getContext('2d'); const zs = []; for (let i = 0; i < 7; i++) zs.push({ x: Math.random(), s: .008 + Math.random() * .012, o: Math.random() * 6, sc: .8 + Math.random() * .6, y: .0 });
  const stars = []; for (let i = 0; i < 140; i++) stars.push([Math.random(), Math.random() * .6, Math.random() * 6, .5 + Math.random() * 1.5]);
  const embers = []; for (let i = 0; i < 40; i++) embers.push([Math.random(), Math.random(), .02 + Math.random() * .05, Math.random() * 6]);
  function loop(ts) {
    titleRAF = requestAnimationFrame(loop); const w = cv.width = window.innerWidth, h = cv.height = window.innerHeight, t = ts / 1000;
    const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#05070d'); sky.addColorStop(.55, '#1a1424'); sky.addColorStop(.8, '#3a1a1e'); sky.addColorStop(1, '#120a0c'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
    for (const s of stars) { c.fillStyle = 'rgba(255,255,255,' + (.3 + Math.sin(t * 2 + s[2]) * .25) + ')'; c.fillRect(s[0] * w, s[1] * h, s[3], s[3]); }
    const mx = w * .78, my = h * .2, mr = Math.min(w, h) * .07; const mg = c.createRadialGradient(mx, my, mr * .5, mx, my, mr * 4); mg.addColorStop(0, 'rgba(255,230,190,.35)'); mg.addColorStop(1, 'rgba(255,230,190,0)'); c.fillStyle = mg; c.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    c.fillStyle = '#f0e2c0'; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill(); c.fillStyle = 'rgba(160,140,110,.35)'; c.beginPath(); c.arc(mx - mr * .3, my - mr * .2, mr * .25, 0, TAU); c.arc(mx + mr * .25, my + mr * .3, mr * .18, 0, TAU); c.fill();
    // collines
    for (let L = 0; L < 3; L++) { c.fillStyle = ['#1a1220', '#150e18', '#0d080e'][L]; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 20) c.lineTo(x, h * (.68 + L * .08) + Math.sin(x * .004 + L * 2) * h * .04 + Math.sin(x * .011 + L) * h * .015); c.lineTo(w, h); c.fill(); }
    // arbres morts
    c.strokeStyle = '#070508'; c.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const x = (i * .137 + .05) * w, y = h * (.8 + (i % 3) * .05), s = h * (.1 + (i % 4) * .03); c.lineWidth = s * .09; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - s); c.moveTo(x, y - s * .5); c.lineTo(x + s * .35, y - s * .85); c.moveTo(x, y - s * .7); c.lineTo(x - s * .3, y - s * .95); c.stroke(); }
    // zombies
    for (const z of zs) { z.x += z.s * .0016 * 60 * (1 / 60); if (z.x > 1.1) z.x = -.1; const x = z.x * w, y = h * (.86 + (z.o % 1) * .08), s = h * .05 * z.sc, b = Math.sin(t * 2 + z.o) * s * .08; c.fillStyle = '#060406'; c.beginPath(); c.ellipse(x, y - s * 1.3 + b, s * .35, s * .7, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(x + s * .1, y - s * 2.1 + b, s * .25, 0, TAU); c.fill(); c.lineWidth = s * .13; c.strokeStyle = '#060406'; c.beginPath(); c.moveTo(x, y - s * 1.7 + b); c.lineTo(x + s * .8, y - s * 1.6 + b + Math.sin(t * 3 + z.o) * 3); c.moveTo(x, y - s * 1.5 + b); c.lineTo(x + s * .75, y - s * 1.35 + b); c.moveTo(x - s * .1, y - s * .7); c.lineTo(x - s * .15 + Math.sin(t * 2 + z.o) * s * .3, y); c.moveTo(x + s * .1, y - s * .7); c.lineTo(x + s * .1 - Math.sin(t * 2 + z.o) * s * .3, y); c.stroke(); c.fillStyle = 'rgba(255,60,40,.9)'; c.fillRect(x + s * .18, y - s * 2.15 + b, 2, 2); }
    // brume
    for (let i = 0; i < 5; i++) { const x = ((i * 430 + t * (8 + i * 4)) % (w + 800)) - 400; c.fillStyle = 'rgba(160,150,170,.05)'; c.beginPath(); c.ellipse(x, h * (.62 + i * .07), 360, 50, 0, 0, TAU); c.fill(); }
    // braises
    for (const e of embers) { const y = ((e[1] - t * e[2]) % 1 + 1) % 1; c.fillStyle = 'rgba(255,' + (120 + e[3] * 20 | 0) + ',50,' + (.25 + Math.sin(t * 3 + e[3]) * .2) + ')'; c.fillRect(((e[0] + Math.sin(t * .5 + e[3]) * .02) * w), y * h, 2, 2); }
  }
  loop(0);
}
function stopTitleBg() { cancelAnimationFrame(titleRAF); }

function setupTitle() {
  let diff = 1;
  document.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { diff = +b.dataset.diff; document.querySelectorAll('[data-diff]').forEach(x => x.classList.toggle('on', x === b)); SFX.init(); SFX.play('ui'); });
  const wo = { size: 'M', style: 'balanced', dens: 1 };
  const seedOf = () => { const s = $('seedIn').value.trim(); let seed = 0; if (s) seed = /^\d+$/.test(s) ? (+s >>> 0) : [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); return seed || 1; };
  let pt = 0;
  const preview = () => { clearTimeout(pt); pt = setTimeout(() => { try { const r = previewWorld(seedOf(), wo, $('wprev')); $('wsum').textContent = r.pois + ' lieux · ' + r.zones + ' zones radioactives · ' + r.vehicles + ' véhicules'; } catch (e) { console.warn(e); } }, 90); };
  const newSeed = () => { $('seedIn').value = String(Math.floor(Math.random() * 999999999) + 1); preview(); };
  try { const rt = JSON.parse(sessionStorage.getItem('zs_retry') || 'null'); if (rt) { sessionStorage.removeItem('zs_retry'); $('seedIn').value = rt.seed; Object.assign(wo, rt.wo); diff = rt.diff; } } catch (e) { }
  if (!$('seedIn').value) $('seedIn').value = String(Math.floor(Math.random() * 999999999) + 1);
  document.querySelectorAll('.chips').forEach(g => { const k = g.dataset.g; g.querySelectorAll('button').forEach(b => { b.classList.toggle('on', String(wo[k]) === b.dataset.v); b.onclick = () => { wo[k] = k === 'dens' ? +b.dataset.v : b.dataset.v; g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); SFX.init(); SFX.play('ui'); preview(); }; }); });
  document.querySelectorAll('[data-diff]').forEach(x => x.classList.toggle('on', +x.dataset.diff === diff));
  $('seedIn').oninput = preview; $('btnDice').onclick = () => { SFX.init(); SFX.play('click'); newSeed(); };
  $('btnDaily').onclick = () => { const d = new Date(); $('seedIn').value = String(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()); SFX.init(); SFX.play('click'); preview(); };
  preview();
  $('btnNew').onclick = () => startGame({ diff, seed: seedOf(), wo: Object.assign({}, wo) });
  $('btnTut').onclick = () => { SET.tutorial = true; saveSettings(); startGame({ diff: 0, seed: seedOf(), wo: Object.assign({}, wo), tutorial: true }); };
  const cont = $('btnCont');
  if (hasSave()) { cont.classList.remove('hidden'); cont.onclick = () => { const d = loadSaveData(); if (!d) return; startGame({ seed: d.seed, diff: d.diff, wo: d.wo, load: d }); }; }
  $('btnHelp').onclick = () => $('help').classList.toggle('hidden');
  $('btnOpt').onclick = openSettings;
  let best = 0; try { best = +localStorage.getItem('zs_best') || 0; } catch (e) { }
  $('best').textContent = best ? '🏆 Meilleur score : ' + best : '';
  startTitleBg();
}

window.addEventListener('load', () => {
  cvs = $('game'); ctx = cvs.getContext('2d'); lightCvs = document.createElement('canvas'); lightCtx = lightCvs.getContext('2d');
  resizeCanvas(); window.addEventListener('resize', resizeCanvas);
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove); window.addEventListener('mousedown', onMouseDown); window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('blur', () => { if (G) { G.keys = {}; G.lmb = false; G.rmb = false; if (running && SET.autopause && !G.paused && !G.over) togglePause(); } });
  cvs.addEventListener('contextmenu', e => e.preventDefault());
  $('panel').addEventListener('click', onPanelClick); $('dialog').addEventListener('click', onPanelClick);
  $('tut').addEventListener('click', e => { const b = e.target.closest('[data-tut]'); if (b) tutAction(b.dataset.tut); });
  $('buildbar').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (b) { G.buildType = b.dataset.b; refreshBuildBar(); SFX.play('click'); } });
  $('btnResume').onclick = togglePause;
  $('btnPause') && 0; $('btnSave').onclick = () => { saveGame(false); };
  $('btnPOpt').onclick = openSettings; $('btnPHelp').onclick = () => { toggleHelp(); };
  $('btnPTut').onclick = () => { togglePause(); tutStart(); };
  $('btnQuit').onclick = () => { saveGame(true); location.reload(); };
  $('help2').addEventListener('click', e => { if (e.target.id === 'help2' || e.target.closest('[data-x]')) toggleHelp(); });
  setupTitle();
  requestAnimationFrame(frame);
  window.__dbg = { G: () => G, P: () => P, start: startGame2 };
});
