// Multiplayer flows + screens: hub, create, keypad, lobby, results, grown-ups (PIN), family board, emotes, Race & Goo Tag rules.
import * as THREE from 'three';
import { WORLDS, TAG_TIME } from './config.js';
import { EMOTES, funName } from './net.js';
import { persist } from './save.js';
import { SHIRTS } from './player.js';

const $ = id => document.getElementById(id);
const V = new THREE.Vector3(), D = new THREE.Vector3();
const MODES = { coop: ['CO-OP', 'Team up against the monsters and bosses', '#8ff04a'], race: ['RACE', 'First to reach all 5 flags wins', '#45d7ff'], tag: ['GOO TAG', 'Splat friends with goo for points. No damage!', '#ff5fa8'] };
const hex = n => '#' + n.toString(16).padStart(6, '0');

export function setupMP(G, A) {
  const N = G.net, S = G.settings;
  if (!G.progress.funName) { G.progress.funName = funName(); persist('progress', G.progress); }
  const saveS = () => persist('settings', S);
  const click = (id, fn) => $(id).addEventListener('click', e => { G.audio.unlock(); G.audio.play('click'); fn(e); });
  const msg = (el, t) => { $(el).textContent = t; };

  // ---------- keypad (codes + PIN, no letters so kids never type words) ----------
  let kp = null;
  G.keypad = o => { kp = { v: '', ...o }; $('kpTitle').textContent = o.title; $('kpHint').textContent = o.hint || ''; kpDraw(); A.showScreen('keypadScr'); };
  const kpDraw = () => { $('kpDisplay').innerHTML = [...Array(kp.len)].map((_, i) => `<i class="${i < kp.v.length ? 'on' : ''}">${i < kp.v.length ? (kp.secret ? '●' : kp.v[i]) : ''}</i>`).join(''); };
  $('kpKeys').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b || !kp) return; G.audio.play('click'); const k = b.dataset.k;
    if (k === 'del') kp.v = kp.v.slice(0, -1); else if (k === 'back') { const o = kp; kp = null; (o.onBack || (() => A.showScreen(o.backTo || 'menu')))(); return; } else if (kp.v.length < kp.len) kp.v += k;
    kpDraw(); if (kp.v.length === kp.len) { const o = kp, v = kp.v; setTimeout(() => o.onDone(v, () => { o.v = ''; kpDraw(); $('kpDisplay').classList.remove('shake'); void $('kpDisplay').offsetWidth; $('kpDisplay').classList.add('shake'); }), 150); }
  });

  // ---------- grown-ups ----------
  const openParents = () => { renderParents(); A.showScreen('parentsScr'); };
  const askPin = then => {
    if (!S.pin) G.keypad({ title: 'CREATE A GROWN-UP PIN', hint: 'Pick 4 numbers kids won\'t guess', len: 4, secret: true, backTo: 'settingsScr', onDone: v => G.keypad({ title: 'TYPE THE PIN AGAIN', len: 4, secret: true, backTo: 'settingsScr', onDone: (v2, bad) => { if (v2 !== v) { $('kpHint').textContent = "Those didn't match. Try again."; return bad(); } S.pin = v; saveS(); then(); } }) });
    else G.keypad({ title: 'GROWN-UP PIN', hint: 'Grown-ups only', len: 4, secret: true, backTo: 'settingsScr', onDone: (v, bad) => { if (v !== S.pin) { $('kpHint').textContent = 'Wrong PIN'; return bad(); } then(); } });
  };
  click('parentsBtn', () => askPin(openParents));
  function renderParents() {
    document.querySelectorAll('#parentsScr [data-pset]').forEach(el => el.querySelectorAll('button').forEach(b => b.classList.toggle('sel', String(S[el.dataset.pset]) === b.dataset.v)));
    $('pFamily').textContent = S.family ? S.family.replace(/(\d{3})(\d{3})/, '$1 $2') : 'NOT SET UP';
    $('pServer').value = S.serverUrl || ''; $('pServerMsg').textContent = N.url ? '' : 'Paste your Cloudflare Worker address (see README).';
  }
  document.querySelectorAll('#parentsScr [data-pset]').forEach(el => el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { G.audio.play('click'); S[el.dataset.pset] = b.dataset.v === 'true'; saveS(); renderParents(); })));
  click('pNewBoard', async () => { if (!N.url) return msg('pServerMsg', 'Set the server address first.'); try { const r = await fetch(N.url + '/board/new'); const { code } = await r.json(); S.family = code; saveS(); renderParents(); } catch (e) { msg('pServerMsg', 'Could not reach the server.'); } });
  click('pJoinBoard', () => G.keypad({ title: 'FAMILY BOARD CODE', hint: 'The 6 numbers from another device', len: 6, onBack: openParents, onDone: v => { S.family = v; saveS(); openParents(); } }));
  click('pLeaveBoard', () => { S.family = ''; saveS(); renderParents(); });
  click('pChangePin', () => { S.pin = ''; saveS(); askPin(openParents); });
  click('pTest', async () => { S.serverUrl = $('pServer').value.trim(); saveS(); msg('pServerMsg', 'Checking…'); msg('pServerMsg', await N.check() ? 'Connected! Multiplayer is ready.' : 'Could not reach the server. Check the address.'); });
  $('pServer').addEventListener('change', () => { S.serverUrl = $('pServer').value.trim(); saveS(); });

  // ---------- hub ----------
  click('mpBtn', () => { renderHub(); A.showScreen('mpScr'); });
  function renderHub() {
    const ok = S.online && N.url && navigator.onLine;
    $('mpLocked').hidden = ok; $('mpReady').hidden = !ok;
    $('mpLocked').querySelector('span').textContent = !S.online ? 'Ask a grown-up to turn on online play in SETTINGS → GROWN-UPS.' : !N.url ? 'A grown-up needs to add the game server in SETTINGS → GROWN-UPS.' : 'Connect to the internet to play with friends.';
    $('mpName').textContent = G.progress.funName;
  }
  click('mpReroll', () => { G.progress.funName = funName(); persist('progress', G.progress); $('mpName').textContent = G.progress.funName; });
  let pick = { mode: 'coop', world: 'woods', stage: 0 };
  click('mpCreate', () => { renderCreate(); A.showScreen('mpCreateScr'); });
  function renderCreate() {
    $('mpModes').innerHTML = Object.entries(MODES).map(([k, [n, d, c]]) => `<button class="mcard ${pick.mode === k ? 'sel' : ''}" data-mode="${k}" style="--c:${c}"><b>${n}</b><span>${d}</span></button>`).join('');
    const open = WORLDS.filter((w, i) => A.worldOpen(i));
    if (!open.some(w => w.id === pick.world)) pick.world = 'woods';
    $('mpWorlds').innerHTML = open.map(w => `<button class="wchip ${pick.world === w.id ? 'sel' : ''}" data-w="${w.id}" style="--c:${w.css}">${w.name}</button>`).join('');
    $('mpStage').querySelectorAll('button').forEach(b => b.classList.toggle('sel', +b.dataset.v === pick.stage));
  }
  $('mpModes').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) { G.audio.play('click'); pick.mode = b.dataset.mode; renderCreate(); } });
  $('mpWorlds').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) { G.audio.play('click'); pick.world = b.dataset.w; renderCreate(); } });
  $('mpStage').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { G.audio.play('click'); pick.stage = +b.dataset.v; renderCreate(); } });
  click('mpGo', async () => { msg('mpCreateMsg', 'Making your room…'); try { await N.create(); N.send({ t: 'cfg', ...pick }); msg('mpCreateMsg', ''); renderLobby(); A.showScreen('lobbyScr'); } catch (e) { msg('mpCreateMsg', 'Could not make a room. Check the internet and try again.'); } });
  click('mpJoin', () => G.keypad({ title: 'ENTER ROOM CODE', hint: 'Ask your friend for their 5 numbers', len: 5, backTo: 'mpScr', onDone: async (v, bad) => {
    $('kpHint').textContent = 'Joining…';
    try { await N.join(v); renderLobby(); A.showScreen('lobbyScr'); } catch (e) { $('kpHint').textContent = e === 'started' ? 'That game already started.' : 'Room not found or full. Check the code.'; bad(); }
  } }));

  // ---------- lobby ----------
  function renderLobby() {
    if (!N.connected) return;
    $('lobCode').textContent = N.code; const c = N.cfg || pick, m = MODES[c.mode] || MODES.coop, w = WORLDS.find(x => x.id === c.world);
    $('lobInfo').innerHTML = `<b style="color:${m[2]}">${m[0]}</b> · ${w ? w.name : ''} · LEVEL ${(c.stage | 0) + 1}`;
    const ids = N.order(); const slots = [];
    for (let i = 0; i < 4; i++) { const id = ids[i]; slots.push(id ? `<div class="pslot" style="--c:${hex(N.peerColor(id))}"><i></i><b>${N.peerName(id)}</b>${id === N.hostId ? '<em>HOST</em>' : ''}${id === N.id ? '<em class="you">YOU</em>' : ''}</div>` : '<div class="pslot empty"><i></i><b>Waiting…</b></div>'); }
    $('lobSlots').innerHTML = slots.join('');
    $('lobStart').hidden = !N.isHost; $('lobWait').hidden = N.isHost;
  }
  click('lobStart', () => N.send({ t: 'start' }));
  click('lobLeave', () => { N.leave(); A.showScreen('mpScr'); renderHub(); });

  // ---------- messages ----------
  N.on(m => {
    const lobbyOpen = $('lobbyScr').classList.contains('open');
    if ((m.t === 'peers' || m.t === 'cfg' || m.t === 'welcome') && lobbyOpen) renderLobby();
    if (m.t === 'peers' && G.state === 'playing' && m.left) G.hud.toast(N.peerName(m.left) === 'PLAYER' ? 'A PLAYER LEFT' : 'A PLAYER LEFT');
    if (m.t === 'start') startGame(m);
    if (m.t === 'lobby') { if (G.state !== 'menu') { G.state = 'menu'; G.input.enabled = false; G.hud.show(false); G.enemies.clear(); G.items.clear(); } renderLobby(); A.showScreen('lobbyScr'); G.audio.setMusic('menu'); }
    if (m.t === 'closed') { if (m.was && G.state === 'playing') G.hud.toast('LOST CONNECTION — PLAYING SOLO'); else if (lobbyOpen) { A.showScreen('mpScr'); renderHub(); } G.mpEnd(); }
    if (!N.inGame) return;
    switch (m.t) {
      case 'es': if (N.puppet) G.enemies.applySnapshot(m.e || []); break;
      case 'wave': if (N.puppet) { const W = G.waves; W.index = m.i | 0; W.state = m.s || W.state; W.remaining = m.r | 0; W.count = m.c | 0; W.t = m.tt || 0; if (m.s === 'bossIntro' && !G.mpBossWarned) { G.mpBossWarned = true; G.hud.banner('BOSS INCOMING', G.worldDef.boss.name, 3.4, 'boss'); G.audio.play('bossWarn'); G.audio.setMusic('boss'); G.world.boss(true); } } break;
      case 'hit': if (N.coopHost) { const e = G.enemies.list.find(q => q.nid === m.n && q.alive); if (e) G.enemies.damage(e, Math.min(400, +m.a || 0), { by: m.from, slow: m.sl, freeze: !!m.fz, trap: m.tp, splashHit: !!m.sp }); } break;
      case 'kill': if (N.puppet) { const e = G.enemies.list.find(q => q.nid === m.n && q.alive); if (e) { if (Array.isArray(m.p)) e.group.position.set(m.p[0], m.p[1] - (e.def.fly ? 0 : e.def.height), m.p[2]); G.enemies.kill(e, false, m.by); } } break;
      case 'hurt': G.hurtPlayer(Math.min(60, +m.a || 0), V.set(m.x || 0, G.player.pos.y, m.z || 0), !!m.c); break;
      case 'shot': if (N.puppet && Array.isArray(m.p)) G.enemies.shoot(V.set(...m.p), D.set(...m.v), 0, m.c | 0, m.r || .25, m.g || 1.5, true); break;
      case 'warpOpen': if (N.puppet) { G.warp.open(); G.hud.banner('WARP GATE OPEN!', 'Step into the beam — everyone warps together!', 3, 'level'); G.world.boss(false); } break;
      case 'warpReq': if (N.coopHost && G.warp.isOpen && !G.warping) A.startWarp(); break;
      case 'goto': if (N.puppet && !G.warping) { G.forcedTarget = { w: WORLDS.find(w => w.id === m.w) || G.worldDef, stage: m.s | 0 }; A.startWarp(); } break;
      case 'splat': if (N.mode === 'tag') { G.gooT = 1.6; G.audio.play('goo'); G.hud.toast('SPLAT! ' + N.peerName(m.from)); G.fx.burst(V.copy(G.player.eye).add(D.set(0, 0, -1).applyQuaternion(G.camera.quaternion)), 0x8ff04a, 14, 4, .15, 8, .6); $('gooFx').className = ''; void $('gooFx').offsetWidth; $('gooFx').className = 'show'; } break;
      case 'fin': if (N.mode === 'race') raceFin(m.from, m.ms | 0); break;
      case 'end': if (N.mode === 'tag' || N.mode === 'race') showResults(); break;
    }
  });

  function startGame(m) {
    const c = m.cfg; G.mpStartAt = performance.now(); G.mpBossWarned = false; G.mpFin = {}; G.mpEndAt = 0; G.mpDone = false;
    $('loading').classList.remove('gone'); $('loadMsg').textContent = 'Starting ' + (MODES[c.mode] || MODES.coop)[0] + '…';
    setTimeout(() => {
      A.loadWorld(c.world); $('loading').classList.add('gone');
      A.startRun({ stage: c.stage | 0, mp: c.mode });
      G.body.setShirt(N.peerColor(N.id));
      const slot = N.slot(), P = G.player; P.pos.x += (slot % 2 ? 2.5 : -2.5); P.pos.z += slot > 1 ? 2.5 : 0; P.pos.y = G.world.getHeight ? G.world.getHeight(P.pos.x, P.pos.z) : P.pos.y;
      if (c.mode === 'tag') { G.waves.state = 'tag'; G.weapons.give('goo'); G.weapons.owned.goo.reserve = 9999; G.hud.banner('GOO TAG!', 'Splat friends for points — ' + (TAG_TIME / 60) + ' minutes', 3, 'level'); }
      if (c.mode === 'race') G.hud.banner('RACE!', 'First to reach all 5 flags wins!', 3, 'level');
      if (c.mode === 'coop') G.hud.banner('CO-OP!', 'Team up — ' + N.peers.size + ' players', 2.6, 'level');
      $('emoteBtn').hidden = false; $('mpList').hidden = false;
    }, 40);
  }
  G.mpEnd = () => { $('emoteBtn').hidden = true; $('mpList').hidden = true; $('emoteMenu').classList.remove('open'); };

  // ---------- per-frame ----------
  let listT = 0, snapT = 0, waveT = 0;
  G.mpTick = dt => {
    if (!N.inGame) return;
    N.update(dt);
    if (N.coopHost) {
      snapT -= dt; if (snapT <= 0) { snapT = .1; N.send({ t: 'es', e: G.enemies.snapshot() }); }
      waveT -= dt; if (waveT <= 0) { waveT = .4; const W = G.waves; N.send({ t: 'wave', i: W.index, s: W.state, r: W.remaining, c: W.count, tt: +(W.t || 0).toFixed(1) }); }
    }
    if (G.gooT > 0) G.gooT -= dt;
    if (N.mode === 'race' && !G.mpDone) {
      const pr = G.map.progress(); if (pr.done >= pr.total && !G.mpFin[N.id]) { const ms = Math.round(performance.now() - G.mpStartAt); N.send({ t: 'fin', ms }); raceFin(N.id, ms); }
      if (G.mpEndAt && performance.now() > G.mpEndAt) showResults();
    }
    if (N.mode === 'tag' && !G.mpDone && performance.now() - G.mpStartAt > TAG_TIME * 1000) showResults();
    listT -= dt; if (listT <= 0) { listT = .25; drawList(); }
  };
  function rows() {
    const out = [{ id: N.id, s: G.score, f: G.map.progress().done, me: true }];
    for (const r of N.remote.values()) out.push({ id: r.id, s: r.s, f: r.f });
    return out;
  }
  function drawList() {
    const mode = N.mode, total = G.map.progress().total;
    $('mpList').innerHTML = rows().map(r => `<div class="mprow ${r.me ? 'me' : ''}"><i style="background:${hex(N.peerColor(r.id))}"></i><b>${N.peerName(r.id)}</b><span>${mode === 'race' ? (G.mpFin[r.id] ? '★ DONE' : r.f + '/' + total) : r.s.toLocaleString()}</span></div>`).join('');
  }
  G.mpHud = () => {
    const mode = N.mode; if (!mode || mode === 'coop') return null;
    if (mode === 'tag') { const left = Math.max(0, TAG_TIME - (performance.now() - G.mpStartAt) / 1000); return ['GOO TAG', 'TIME ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0')]; }
    const pr = G.map.progress(); return ['RACE!', G.mpEndAt ? 'RACE ENDS IN ' + Math.ceil((G.mpEndAt - performance.now()) / 1000) : 'FLAGS ' + pr.done + '/' + pr.total];
  };
  function raceFin(id, ms) {
    if (G.mpFin[id]) return; G.mpFin[id] = ms || 1;
    if (!G.mpEndAt) { G.mpEndAt = performance.now() + 20000; G.hud.banner(id === N.id ? 'YOU FINISHED FIRST!' : N.peerName(id) + ' FINISHED!', 'Race ends in 20 seconds', 2.6, 'level'); G.audio.play(id === N.id ? 'victory' : 'bossWarn'); }
    else if (id === N.id) G.hud.banner('FINISHED!', 'Great racing!', 2, 'level');
  }

  // ---------- goo tag hits (called from weapons) ----------
  const lastSplat = {};
  G.mpSplat = r => {
    const now = performance.now(); if (lastSplat[r.id] > now) return; lastSplat[r.id] = now + 900;
    N.send({ t: 'splat', to: r.id }); r.goo = 1.6; G.addScore(100, V.copy(r.pos).setY(r.pos.y + 2)); G.audio.play('pop'); G.hud.hitMark();
  };

  // ---------- results ----------
  function showResults() {
    if (G.mpDone) return; G.mpDone = true; if (N.isHost) N.send({ t: 'end' });
    const mode = N.mode, list = rows();
    list.sort((a, b) => mode === 'race' ? ((G.mpFin[a.id] || 1e12) - (G.mpFin[b.id] || 1e12)) || (b.f - a.f) || (b.s - a.s) : b.s - a.s);
    $('resTitle').textContent = list[0].id === N.id ? 'YOU WIN!' : N.peerName(list[0].id) + ' WINS!';
    $('resRows').innerHTML = list.map((r, i) => `<div class="rrow ${r.id === N.id ? 'me' : ''}"><em>${i + 1}</em><i style="background:${hex(N.peerColor(r.id))}"></i><b>${N.peerName(r.id)}</b><span>${mode === 'race' ? (G.mpFin[r.id] ? (G.mpFin[r.id] / 1000).toFixed(1) + ' SEC' : r.f + ' FLAGS') : r.s.toLocaleString() + ' PTS'}</span></div>`).join('');
    $('resAgain').hidden = !N.isHost; $('resWait').hidden = N.isHost;
    G.state = 'over'; G.input.enabled = false; G.input.reset(); if (document.pointerLockElement) document.exitPointerLock();
    G.audio.setMusic(null); G.audio.play(list[0].id === N.id ? 'victory' : 'waveDone'); G.postScore(G.score);
    setTimeout(() => { G.hud.show(false); A.showScreen('mpResScr'); }, 1200);
  }
  click('resAgain', () => N.send({ t: 'lobby' }));
  click('resLeave', () => { N.leave(); G.mpEnd(); A.toMenu(); });

  // ---------- emotes ----------
  $('emoteMenu').innerHTML = EMOTES.map(([t, c], i) => `<button data-e="${i}" style="--c:${c}">${t}</button>`).join('');
  $('emoteBtn').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); G.audio.play('click'); $('emoteMenu').classList.toggle('open'); });
  $('emoteMenu').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); const b = e.target.closest('[data-e]'); if (!b) return; N.emote(+b.dataset.e); $('emoteMenu').classList.remove('open'); });

  // ---------- family board ----------
  G.postScore = score => { if (!S.family || !N.url || !navigator.onLine || !(score > 0)) return; fetch(N.url + '/board/' + S.family, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: G.progress.funName, score: Math.round(score), world: G.worldDef.id }) }).catch(() => {}); };
  G.renderFamily = async () => {
    const el = $('famBoard'); if (!el) return;
    if (!S.family) { el.innerHTML = '<p class="maptip">A grown-up can set up a private FAMILY BOARD in SETTINGS → GROWN-UPS.</p>'; return; }
    if (!N.url || !navigator.onLine) { el.innerHTML = '<p class="maptip">Connect to the internet to see the family board.</p>'; return; }
    el.innerHTML = '<p class="maptip">Loading…</p>';
    try { const r = await fetch(N.url + '/board/' + S.family); const { list } = await r.json();
      el.innerHTML = list.length ? list.slice(0, 10).map((x, i) => `<div class="rrow ${x.name === G.progress.funName ? 'me' : ''}"><em>${i + 1}</em><b>${x.name}</b><span>${x.score.toLocaleString()}</span></div>`).join('') : '<p class="maptip">No scores yet. Play a game to be first!</p>';
    } catch (e) { el.innerHTML = '<p class="maptip">Could not load the family board.</p>'; }
  };
}

// Hit tests against remote players (Goo Tag)
export function segHitRemote(N, a, b, r) {
  let best = null;
  for (const R of N.remote.values()) {
    V.set(R.pos.x, R.pos.y + 1, R.pos.z); D.copy(b).sub(a); const len = D.length() || 1e-4; D.divideScalar(len);
    const t = Math.max(0, Math.min(len, (V.x - a.x) * D.x + (V.y - a.y) * D.y + (V.z - a.z) * D.z));
    const dx = a.x + D.x * t - V.x, dy = a.y + D.y * t - V.y, dz = a.z + D.z * t - V.z; const rr = .7 + r;
    if (dx * dx + dy * dy * .4 + dz * dz < rr * rr) { best = R; break; }
  }
  return best;
}
