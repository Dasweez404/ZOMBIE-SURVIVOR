'use strict';
// ===== Entrée : écran titre, entrées clavier/souris, boucle principale =====
let lastTs = 0, running = false;

function selectSlot(i) {
  if (P.slots[i] && P.sel !== i) { P.sel = i; P.reloading = false; P.cd = Math.max(P.cd, .15); SFX.play('click'); }
}
function cycleWeapon(dir) {
  const ids = P.slots.map((w, i) => w ? i : -1).filter(i => i >= 0); if (ids.length < 2) return;
  let k = ids.indexOf(P.sel); k = (k + dir + ids.length) % ids.length; selectSlot(ids[k]);
}
function toggleBuild() {
  if (panelOpen()) return;
  G.buildMode = !G.buildMode; refreshBuildBar(); SFX.play('ui');
  if (G.buildMode) msg('Mode construction : clic gauche pour poser, clic droit pour démonter.', '#9fe8a8');
}

function onKeyDown(e) {
  if (!G || !running) return;
  if (e.target && (e.target.tagName === 'INPUT')) return;
  const code = e.code, key = e.key.toLowerCase();
  if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) e.preventDefault();
  if (G.over) return;
  const mv = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd' }[code];
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
  switch (key) {
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
    case 'x': G.keys.x = true; break;
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
  G.pausedMenu = !G.pausedMenu; G.paused = G.pausedMenu; $('pause').classList.toggle('hidden', !G.pausedMenu);
}
function onMouseMove(e) { if (!G) return; G.mouse.sx = e.clientX; G.mouse.sy = e.clientY; }
function onMouseDown(e) {
  if (!G || !running || G.over) return;
  SFX.init();
  if (e.target !== cvs) return;
  if (G.paused) return;
  if (e.button === 0) {
    G.lmb = true; G.lmbEdge = true;
    if (G.buildMode) buildClick(false);
  } else if (e.button === 2) {
    G.rmb = true; if (G.buildMode) buildClick(true);
  }
}
function onMouseUp(e) { if (!G) return; if (e.button === 0) G.lmb = false; if (e.button === 2) G.rmb = false; }
function buildClick(remove) {
  const tx = Math.floor(G.mouse.x / TS), ty = Math.floor(G.mouse.y / TS);
  if (remove) {
    const s = G.structs.get(IDX(tx, ty)); if (s && !s.free && dist(P.x, P.y, s.x, s.y) < 240) { dismantle(s); }
    return;
  }
  const err = checkPlace(G.buildType, tx, ty);
  if (err) { if (G.clock - (G.errMsgT || 0) > 1) { msg('Impossible : ' + err, '#ff9a8a'); G.errMsgT = G.clock; } return; }
  placeStruct(G.buildType, tx, ty);
}
function onWheel(e) {
  if (!G || !running || G.paused) return;
  if (G.buildMode) { const ks = Object.keys(STRUCTS); let i = ks.indexOf(G.buildType) + (e.deltaY > 0 ? 1 : -1); i = (i + ks.length) % ks.length; G.buildType = ks[i]; refreshBuildBar(); return; }
  cycleWeapon(e.deltaY > 0 ? 1 : -1);
}

function frame(ts) {
  requestAnimationFrame(frame);
  if (!running || !G) { lastTs = ts; return; }
  const dt = Math.min(.05, (ts - lastTs) / 1000 || .016); lastTs = ts;
  const time = ts / 1000;
  G.mouse.x = G.mouse.sx + (G.camX || 0); G.mouse.y = G.mouse.sy + (G.camY || 0);
  if (!G.paused) {
    updateGame(dt);
    if (G.flowDirty) { G.flowDirty = false; G.flowP.compute(Math.floor(P.x / TS), Math.floor(P.y / TS)); }
    if (G.miniDirty) G.miniDirty = false;
    G.prompt = (!P.dead) ? findInteract() : null;
    if (G.keys.e && G.prompt && G.prompt.t === 'harv') interact();
  }
  updateCamera(dt);
  render(time);
  document.body.classList.toggle('uiopen', G.paused);
}

function startGame(opts) {
  SFX.init();
  initGame(opts);
  $('title').classList.add('hidden');
  G.cam.x = P.x - VW / 2; G.cam.y = P.y - VH / 2; G.camX = G.cam.x; G.camY = G.cam.y;
  running = true; G.mouse.sx = VW / 2 + 100; G.mouse.sy = VH / 2;
  refreshBuildBar();
}

function setupTitle() {
  let diff = 1;
  document.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { diff = +b.dataset.diff; document.querySelectorAll('[data-diff]').forEach(x => x.classList.toggle('on', x === b)); SFX.init(); SFX.play('ui'); });
  $('btnNew').onclick = () => { const s = $('seedIn').value.trim(); let seed = 0; if (s) { seed = /^\d+$/.test(s) ? +s : [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); } startGame({ diff, seed: seed || undefined }); };
  const cont = $('btnCont');
  if (hasSave()) {
    cont.classList.remove('hidden');
    cont.onclick = () => { const d = loadSaveData(); if (!d) return; startGame({ seed: d.seed, diff: d.diff, load: d }); };
  }
  $('btnHelp').onclick = () => $('help').classList.toggle('hidden');
  let best = 0; try { best = +localStorage.getItem('zs_best') || 0; } catch (e) { }
  $('best').textContent = best ? 'Meilleur score : ' + best : '';
}

window.addEventListener('load', () => {
  cvs = $('game'); ctx = cvs.getContext('2d'); lightCvs = document.createElement('canvas'); lightCtx = lightCvs.getContext('2d');
  resizeCanvas(); window.addEventListener('resize', resizeCanvas);
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove); window.addEventListener('mousedown', onMouseDown); window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('blur', () => { if (G) { G.keys = {}; G.lmb = false; G.rmb = false; } });
  cvs.addEventListener('contextmenu', e => e.preventDefault());
  $('panel').addEventListener('click', onPanelClick); $('dialog').addEventListener('click', onPanelClick);
  $('buildbar').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (b) { G.buildType = b.dataset.b; refreshBuildBar(); SFX.play('click'); } });
  $('btnResume').onclick = togglePause; $('btnSave').onclick = () => { saveGame(false); };
  $('btnQuit').onclick = () => { saveGame(true); location.reload(); };
  $('btnMute').onclick = () => { SFX.on = !SFX.on; $('btnMute').textContent = SFX.on ? '🔊 Son : activé' : '🔇 Son : coupé'; };
  setupTitle();
  requestAnimationFrame(frame);
  window.__dbg = { G: () => G, P: () => P, start: startGame };
});
