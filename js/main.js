import * as THREE from 'three';
import { GAME, DIFFICULTY, WEAPONS, WEAPON_ORDER, ENEMIES, EFFECTS, SCORE, WORLDS, ACHIEVEMENTS, LEVELS, LEVEL_UNLOCKS, levelFor, EXTRA_WAVES, STAGES } from './config.js';
import { MapSys } from './map.js';
import { Warp, WARP_STYLES } from './warp.js';
import { BONUS, loadBonus, todaysChallenge } from './online.js';
import { Net } from './net.js';
import { setupMP } from './mp.js';
import { loadSave, persist } from './save.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { buildWorld, disposeWorld, getHeight, resolveCollision } from './world.js';
import { toonify } from './worlds.js';
import { FX } from './fx.js';
import { Enemies, skinSprite, skinURL } from './enemies.js';
import { Weapons } from './weapons.js';
import { Items } from './items.js';
import { HUD, WICON } from './hud.js';
import { makeBody, updateBody, SHIRTS } from './player.js';

const $ = id => document.getElementById(id);
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), F = new THREE.Vector3();
const G = window.MB = { time: 0, shake: 0, state: 'boot', effects: { shield: 0, damage: 0, speed: 0, points: 0 }, aim: { target: null }, context: null, power: 0 };
let world = WORLDS[0];

async function boot() {
  document.title = GAME.name.replace(/\b\w+/g, w => w[0] + w.slice(1).toLowerCase());
  $('logo1').textContent = GAME.line1; $('logo2').textContent = GAME.line2;
  const save = await loadSave(); G.settings = save.settings; G.progress = save.progress;

  const canvas = $('game');
  const R = G.renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 2, powerPreference: 'high-performance', preserveDrawingBuffer: window.parent !== window });
  G.pr = Math.min(devicePixelRatio, 1.75); R.setPixelRatio(G.pr); R.setSize(innerWidth, innerHeight);
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  const scene = G.scene = new THREE.Scene();
  const camera = G.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .05, 240); camera.rotation.order = 'YXZ'; scene.add(camera);
  world = WORLDS.find((w, i) => w.id === G.progress.lastWorld && worldOpen(i)) || WORLDS[0]; G.worldDef = world;
  G.world = buildWorld(scene, G.settings.graphics, world.id);
  G.aimOrigin = new THREE.Vector3();
  G.body = makeBody(SHIRTS[G.settings.shirt] || SHIRTS.blue); G.body.group.visible = false; scene.add(G.body.group);
  G.fx = new FX(scene, camera);
  G.audio = new Audio(); G.audio.setVolumes(G.settings); G.audio.vibrate = G.settings.vibration;
  G.input = new Input();
  G.hud = new HUD(G);
  G.enemies = new Enemies(G);
  G.items = new Items(G);
  G.weapons = new Weapons(G);
  G.map = new MapSys(G);
  G.warp = new Warp(G);
  G.net = new Net(G);
  G.player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), eye: new THREE.Vector3(), yaw: 0, pitch: 0, grounded: true, bob: 0, invuln: 0 };
  G.waves = { index: 0, count: world.waves.length, state: 'idle', t: 0, remaining: 0, queue: [] };
  G.mission = { count: 0, need: world.mission.count, done: false };
  addEventListener('resize', resize); resize();
  wireUI();
  $('loading').classList.add('gone');
  showScreen('menu');
  let last = performance.now(), lastRaf = 0;
  const tick = now => { const dt = Math.min(.05, (now - last) / 1000); last = now; if (dt > 0) frame(dt); };
  const loop = now => { lastRaf = performance.now(); tick(now); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  setInterval(() => { if (performance.now() - lastRaf > 250) tick(performance.now()); }, 33); // fallback when rAF is throttled
}

function resize() {
  G.camera.aspect = innerWidth / innerHeight; G.camera.fov = G.camera.aspect < 1.3 ? 80 : 72; G.camera.updateProjectionMatrix();
  G.renderer.setSize(innerWidth, innerHeight);
}

G.haptic = p => { if (G.settings.vibration && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} };
const findWorld = id => WORLDS.find(w => w.id === id) || BONUS.worlds.find(w => w.id === id);
function loadWorld(id) {
  world = findWorld(id) || WORLDS[0]; G.worldDef = world;
  const style = world.skinBase ? (G.settings.foodArt || '3d') : '';
  if (G.world && G.world.id === id && G.world.style === style) return;
  G.enemies.clear(); G.items.clear(); G.fx.clear();
  disposeWorld(G.scene, G.world);
  G.world = buildWorld(G.scene, G.settings.graphics, id);
  G.world.style = style;
  if (world.friends) addFriends(G.world, world.friends.map(n => skinURL(G, n)));
  if (style === 'toon') toonify(G.world.root);
  if (!world.bonus) { G.progress.lastWorld = id; persist('progress', G.progress); }
}
// Friendly drawn characters that stand around a world and cheer (they can't be hit).
function addFriends(W, list) {
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const grp = new THREE.Group(); W.root.add(grp);
  for (let i = 0; i < 14; i++) {
    const url = list[i % list.length], an = rnd() * Math.PI * 2, r = 12 + rnd() * 44;
    const x = Math.cos(an) * r, z = Math.sin(an) * r;
    if (W.colliders.some(c => Math.hypot(c.x - x, c.z - z) < c.r + 1.5)) continue;
    const s = skinSprite(url, 1.8 + rnd() * .8); s.position.set(x, getHeight(x, z), z); grp.add(s);
    const ph = rnd() * 6, base = s.position.y; s.onBeforeRender = () => { s.position.y = base + Math.abs(Math.sin(G.time * 3 + ph)) * .35; };
  }
}
G.level = () => levelFor(G.progress.xp || 0);
function checkUnlocks(announce) {
  const lv = G.level(); let got = null;
  for (let i = 0; i < Math.min(lv, LEVEL_UNLOCKS.length); i++) { const id = LEVEL_UNLOCKS[i]; if (!G.progress.weapons.includes(id)) { G.progress.weapons.push(id); got = id; } }
  if (lv >= LEVELS.length) G.achieve('max');
  if (got) persist('progress', G.progress);
  return got;
}
G.unlockWeapon = id => { if (id !== 'mega' && !G.progress.weapons.includes(id)) { G.progress.weapons.push(id); persist('progress', G.progress); } };
G.achieve = id => { if (G.progress.achievements.includes(id)) return; G.progress.achievements.push(id); persist('progress', G.progress); const a = ACHIEVEMENTS.find(a => a.id === id); if (a) setTimeout(() => G.hud.toast('BADGE: ' + a.name), 900); };

// ---------------- run lifecycle ----------------
const TOD = { day: { sky: [1, 1, 1], sun: [1, 1, 1], si: 1, hemi: 1 }, sunset: { sky: [1.12, .6, .48], sun: [1, .6, .35], si: .8, hemi: .72 }, night: { sky: [.32, .36, .62], sun: [.55, .62, 1], si: .45, hemi: .6 } };
const TODC = new THREE.Color();
function applyTOD() {
  const t = TOD[G.stageDef?.tod || 'day'], W = G.world; if (!W || !G.sunBase) return;
  G.scene.fog.color.multiply(TODC.setRGB(...t.sky)); W.skyMat.color.multiply(TODC);
  W.hemi.intensity *= t.hemi; W.sunLight.color.copy(G.sunBase.c).multiply(TODC.setRGB(...t.sun)); W.sunLight.intensity = G.sunBase.i * t.si;
}
const stageName = (w, s) => (w.bonus ? 'B' : WORLDS.indexOf(w) + 1) + '-' + (s + 1);
function startRun(o = {}) {
  const stage = o.stage ?? G.stage ?? 0; G.stage = stage; G.stageDef = STAGES[stage]; G.stageHp = G.stageDef.hp; G.stageName = stageName(world, stage);
  if (!o.carry) G.daily = o.daily || (o.again ? G.daily : null); G.gooT = 0; if (!G.net.inGame && G.mpEnd) G.mpEnd();
  const md = G.daily?.mod || {}; G.pointMul = md.points || 1; G.gravMul = md.gravity || 1; G.enemyScale = md.scale || 1; G.stageHp *= md.hp || 1; if (G.daily) G.stageName = 'DAILY';
  G.sunBase = { c: G.world.sunLight.color.clone(), i: G.world.sunLight.intensity };
  G.audio.unlock(); G.audio.setMusic(world.music);
  G.missionItem = world.mission.item; G.missionShort = world.mission.short; $('bossName').textContent = world.boss.name;
  G.waves.count = G.stageDef.waves.length; G.mission.need = world.mission.count; G.startLevel = G.level(); checkUnlocks();
  G.enemies.clear(); G.items.clear(); G.fx.clear();
  G.diff = { ...(DIFFICULTY[G.settings.difficulty] || DIFFICULTY.normal) }; if (md.speed) G.diff.enemySpeed *= md.speed;
  if (!o.carry) { G.score = 0; G.lives = 3; G.health = 100; G.power = 0; G.kills = 0; G.bossKills = 0; G.beatHigh = false; }
  G.streak = 0; G.streakT = 0; G.secretsFound = 0; G.bossE = null;
  for (const k in G.effects) G.effects[k] = 0;
  const P = G.player; P.pos.copy(G.world.spawn); P.pos.y = getHeight(P.pos.x, P.pos.z); P.vel.set(0, 0, 0); P.yaw = 0; P.pitch = -.05; P.invuln = 1;
  if (!o.carry) G.weapons.reset(G.progress.weapons);
  G.mission.count = 0; G.mission.done = false; G.world.setPower(false); G.world.boss(false);
  for (const s of G.world.batterySpots) G.items.spawn(world.mission.item, s, { permanent: true });
  for (const s of G.world.secrets) { s.found = false; for (const [t, dx, dz, wid] of s.rewards) G.items.spawn(t, V.set(s.pos.x + dx, 0, s.pos.z + dz), { permanent: true, weapon: wid }); }
  G.doorOpen = false; if (G.world.cabinDoor) G.world.cabinDoor.rotation.y = 0;
  const W = G.waves; W.index = 0; W.state = 'intro'; W.t = 3; W.queue = []; W.remaining = 0;
  G.progress.plays++; persist('progress', G.progress);
  G.hud.reset(); G.hud.show(true); G.seen = new Set(['slime', 'mini', 'chomper', 'spitter', 'bat', 'tank', 'boss', 'shard']); G.zoom = false; G.zoomK = 0;
  G.body.group.visible = false; G.map.snapshot(); G.map.build(world.id); G.warp.build(world.id, G.map.cps[G.map.cps.length - 1].pos); G.warping = 0; G.warpHint = false;
  { const sp = stage === 1 ? G.map.cps[1].pos : stage === 2 ? G.world.bossSafe : G.world.spawn; P.pos.set(sp.x + 1.5, 0, sp.z + 1.5); resolveCollision(G.world, P.pos, .6); P.pos.y = getHeight(P.pos.x, P.pos.z); if (stage === 2) P.yaw = Math.atan2(-(G.world.bossSpawn.x - P.pos.x), -(G.world.bossSpawn.z - P.pos.z)); }
  if (G.daily) G.hud.banner(G.daily.mod.name, G.daily.mod.desc, 3, 'level'); else G.hud.banner('LEVEL ' + G.stageName, world.name + '  ·  ' + G.stageDef.label, 2.8, 'level');
  $('moveHint').classList.remove('used'); $('lookHint').classList.remove('used');
  setTimeout(() => { if (G.state === 'playing' && !G.mission.done && G.hud.bannerT <= 0) G.hud.banner(world.mission.name, world.mission.hint, 2.6, 'small'); }, 3200);
  G.state = 'playing'; G.input.enabled = true; G.input.reset(); placeCamera();
  showScreen(null);
  goFullscreen();
}

function goFullscreen() {
  if (!matchMedia('(pointer: coarse)').matches) return;
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
}

function waveQueue(def) { const q = []; for (const t in def) if (ENEMIES[t]) for (let i = 0; i < def[t]; i++) q.push(t); for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; } return q; }

function updateWaves(dt) {
  const W = G.waves, E = G.enemies;
  const alive = E.list.filter(e => e.alive && e.type !== 'boss').length;
  W.t -= dt;
  if (W.state === 'intro') { if (W.t <= 0) { W.state = 'active'; const wi = G.stageDef.waves[W.index], base = world.waves[wi], ex = EXTRA_WAVES[world.id]?.[wi] || {}; const def = {}; for (const k of new Set([...Object.keys(base), ...Object.keys(ex)])) if (k !== 'gap') def[k] = (base[k] || 0) + (ex[k] || 0) + (base[k] ? G.stageDef.add : 0); W.queue = waveQueue(def); W.gapDef = base.gap; W.spawnT = .5; if (wi >= 4) G.achieve('wave5'); G.progress.bestWave = Math.max(G.progress.bestWave, wi + 1); } }
  else if (W.state === 'active') {
    W.spawnT -= dt;
    const cap = 7 + W.index * 1.5;
    if (W.spawnT <= 0 && W.queue.length && alive < cap) {
      const type = W.queue.pop(); spawnAway(type);
      if (type === 'slime' && W.queue[W.queue.length - 1] === 'slime' && Math.random() < .5) spawnAway(W.queue.pop());
      W.spawnT = (W.gapDef || 1.6) * G.diff.spawnGap * (.7 + Math.random() * .6);
    }
    W.remaining = W.queue.length + alive;
    if (!W.queue.length && alive === 0) {
      G.addScore(SCORE.wave, null); G.audio.play('waveDone'); G.haptic(30);
      G.hud.banner('WAVE COMPLETE!', '+' + SCORE.wave, 2.4);
      W.state = 'break'; W.t = W.index === W.count - 1 ? 5 : 8; G.audio.setMusic('break');
      if (W.index === 1 || W.index === 3) { const p = findOpenSpot(12); G.items.spawn('mystery', p, { permanent: true }); setTimeout(() => G.hud.toast('A MYSTERY BOX APPEARED!'), 2600); }
      if (G.health < 60) G.items.spawn('pizza', findOpenSpot(5), {});
      if (W.index === 0 || W.index === 2) { const lk = G.weapons.locked().filter(id => id !== 'lightning' && id !== 'boomer' && id !== 'scatter'); if (lk.length) { const id = lk[Math.floor(Math.random() * lk.length)]; G.items.spawn('weapon', findOpenSpot(7), { weapon: id, permanent: true }); setTimeout(() => G.hud.toast('A NEW WEAPON DROPPED!'), 2600); } }
    }
  } else if (W.state === 'break') {
    if (W.t <= 0) {
      if (W.index < W.count - 1) { W.index++; W.state = 'intro'; W.t = 2.4; G.hud.banner('WAVE ' + (W.index + 1), world.tips?.[G.stageDef.waves[W.index]] || '', 2.4); G.audio.setMusic(world.music); }
      else if (!G.stageDef.boss) { stageClear(); }
      else { W.state = 'bossIntro'; W.t = 3.6; G.hud.banner('BOSS INCOMING', world.boss.name, 3.4, 'boss'); G.audio.play('bossWarn'); G.audio.setMusic('boss'); G.world.boss(true); G.haptic([80, 60, 80]); G.shake = .5; }
    }
  } else if (W.state === 'bossIntro') {
    G.shake = Math.max(G.shake, .12);
    if (W.t <= 0) { W.state = 'boss'; G.bossE = E.spawn('boss', G.world.bossSpawn); G.bossE.spawnT = 0; G.bossE.group.scale.setScalar(1); }
  } else if (W.state === 'done') {
    if (W.t <= 0) endRun(true);
  }
}

function spawnAway(type) {
  const P = G.player.pos; const pts = G.world.enemySpawns.filter(s => { const d = s.distanceTo(P); return d > 20 && d < 60; });
  const s = (pts.length ? pts : G.world.enemySpawns)[Math.floor(Math.random() * (pts.length || G.world.enemySpawns.length))];
  V.set(s.x + (Math.random() - .5) * 6, 0, s.z + (Math.random() - .5) * 6); resolveCollision(G.world, V, 1);
  G.enemies.spawn(type, V);
}
function findOpenSpot(dist) {
  const P = G.player; for (let i = 0; i < 20; i++) { const a = P.yaw + (Math.random() - .5) * 1.6; const p = new THREE.Vector3(P.pos.x - Math.sin(a) * dist, 0, P.pos.z - Math.cos(a) * dist); const q = p.clone(); resolveCollision(G.world, q, 1); if (q.distanceTo(p) < .01 && G.world.okSpot(p.x, p.z)) return p; }
  const p = P.pos.clone(); p.x += 3; resolveCollision(G.world, p, 1); return p;
}

// ---------------- scoring / combat callbacks ----------------
G.addScore = (n, pos) => {
  n = Math.round(n * (G.effects.points > 0 ? 2 : 1) * (G.pointMul || 1)); G.score += n;
  const before = G.level(); G.progress.xp = (G.progress.xp || 0) + n; const after = G.level();
  if (after > before) { const got = checkUnlocks(); G.audio.play('levelup'); G.haptic([30, 40, 30]); G.fx.starBurst(V2.copy(G.player.eye).addScaledVector(F.set(-Math.sin(G.player.yaw), 0, -Math.cos(G.player.yaw)), 2.5), 12, 6);
    if (got) { G.hud.banner('LEVEL ' + after + '!', 'UNLOCKED: ' + WEAPONS[got].name, 2.6, 'level'); setTimeout(() => { if (G.state === 'playing') G.weapons.give(got); }, 900); }
    else { G.hud.banner('LEVEL ' + after + '!', 'AMMO REFILL', 2, 'level'); G.weapons.addAmmo(2); }
    persist('progress', G.progress); }
  if (pos) G.fx.popup('+' + n, pos, G.effects.points > 0 ? 'gold' : '');
  if (!G.beatHigh && G.progress.highScore > 0 && G.score > G.progress.highScore) { G.beatHigh = true; G.hud.toast('NEW HIGH SCORE!'); G.audio.play('highscore'); }
};

G.onKill = (e, pos, noScore) => {
  if (e.type === 'boss') return onBossDefeated(e, pos, noScore);
  G.kills++; G.progress.monsters++; if (e.type === 'slime' || e.type === 'mini') G.progress.slimes++;
  if (G.progress.slimes >= 50) G.achieve('slime50');
  G.achieve('first');
  G.addScore(e.def.score, pos);
  G.power = Math.min(1, G.power + (e.type === 'tank' ? .3 : .08));
  G.streak++; G.streakT = 3.5;
  const s = G.streak;
  if (s === 3) G.hud.streak('3 HIT STREAK');
  else if (s === 5) { G.hud.streak('5 HIT STREAK +' + SCORE.streak5); G.addScore(SCORE.streak5, null); G.audio.play('pickup'); }
  else if (s === 7) G.hud.streak('MONSTER MAYHEM!');
  else if (s === 10) { G.hud.streak('10X STREAK +' + SCORE.streak10); G.addScore(SCORE.streak10, null); G.audio.play('highscore'); }
  else if (s > 10 && s % 5 === 0) { G.hud.streak(s + 'X MONSTER MAYHEM! +' + SCORE.streak5); G.addScore(SCORE.streak5, null); }
  G.items.drop(e, pos);
};

function onBossDefeated(e, pos, noScore) {
  G.bossKills++; G.progress.bosses++; G.achieve('boss');
  if (!noScore) G.addScore(e.def.score, pos);
  G.audio.play('victory'); G.haptic([100, 50, 100, 50, 200]); G.shake = 1;
  for (let i = 0; i < 6; i++) setTimeout(() => { V.copy(pos).add(V2.set((Math.random() - .5) * 6, Math.random() * 4, (Math.random() - .5) * 6)); G.fx.burst(V, [0xc05cff, 0xff5fa8, 0xffd43b, 0x45d7ff][i % 4], 30, 12, .3, 8, 1.2); G.fx.starBurst(V, 10, 10); G.audio.play('explode'); }, i * 220);
  G.hud.banner(world.final ? 'THE SUN IS SAVED!' : 'YOU BEAT ' + world.boss.name + '!', '+' + e.def.score, 3.5);
  G.world.boss(false); G.audio.setMusic('break');
  for (const o of G.enemies.list) if (o.alive) G.enemies.kill(o, true);
  const next = world.bonus || G.daily ? null : WORLDS[WORLDS.indexOf(world) + 1];
  saveStage(); const pr = G.progress; if (!G.daily && !pr.cleared.includes(world.id)) pr.cleared.push(world.id); persist('progress', pr);
  if (world.final || !next) { G.waves.state = 'done'; G.waves.t = 4.5; return; }
  G.waves.state = 'warp';
  if (G.net.puppet || (G.net.inGame && G.net.mode !== 'coop')) return;
  setTimeout(() => { if (G.state !== 'playing' && G.state !== 'paused' && G.state !== 'map') return; G.warp.open(); G.hud.banner('WARP GATE OPEN!', 'Step into the beam to go to ' + next.name, 3.2, 'level'); }, 3800);
}

G.hurtPlayer = (amount, from, contact) => {
  const P = G.player; if (G.state !== 'playing' || P.invuln > 0) return;
  if (G.effects.shield > 0) { G.audio.play('shieldHit'); G.fx.sparks(V.copy(P.eye).addScaledVector(F.set(0, 0, -1).applyQuaternion(G.camera.quaternion), .8), 0x45d7ff, 6, 3, .15); P.invuln = .2; return; }
  G.health -= amount * G.diff.enemyDamage; P.invuln = .4;
  G.hud.damage(from); G.audio.play('hurt'); G.haptic(35); G.shake = Math.max(G.shake, .25);
  if (G.streak >= 3) G.hud.streak('STREAK ENDED'); G.streak = 0;
  if (from && contact) { V.copy(P.pos).sub(from).setY(0).normalize(); P.vel.addScaledVector(V, 9); }
  if (G.health <= 0) loseLife();
};
function loseLife() {
  G.lives--; G.health = 0; G.audio.play('lifeLost'); G.haptic([60, 40, 60]);
  if (G.lives <= 0) { if (G.net.inGame) { G.lives = 1; setTimeout(() => G.hud.toast('TEAM REVIVE! KEEP GOING!'), 600); } else return endRun(false); }
  G.health = 100; const P = G.player;
  const safe = G.waves.state === 'boss' ? G.world.bossSafe.clone() : (G.lastCP ? G.lastCP.clone().add(V.set(1.5, 0, 1.5)) : G.world.spawn.clone());
  P.pos.copy(safe); P.pos.y = getHeight(safe.x, safe.z); P.vel.set(0, 0, 0); P.yaw = 0; P.invuln = 3;
  for (const e of G.enemies.list) if (e.alive && e.type !== 'boss' && e.group.position.distanceTo(P.pos) < 12) { V.copy(e.group.position).sub(P.pos).setY(0).normalize(); e.group.position.addScaledVector(V, 10); e.cd = 2; }
  for (const s of G.enemies.shots) { s.life = 0; s.m.visible = false; }
  $('respawnFlash').className = ''; void $('respawnFlash').offsetWidth; $('respawnFlash').className = 'show';
  G.hud.banner('OOPS!', G.lives === 1 ? 'LAST LIFE — YOU CAN DO IT!' : G.lives + ' LIVES LEFT', 2.2);
}
G.heal = n => { G.health = Math.min(100, G.health + n); };
G.addLife = () => { G.lives = Math.min(5, G.lives + 1); };
G.addEffect = k => { G.effects[k] = EFFECTS[k].time; G.haptic(15); };
G.bomb = pos => {
  G.audio.play('explode'); G.audio.play('power'); G.shake = .8; G.haptic([40, 30, 40]);
  G.fx.burst(pos, 0xff8a2a, 50, 14, .3, 6, 1); G.fx.burst(pos, 0xffe14a, 30, 10, .25, 6, 1); G.fx.ring(V.copy(G.player.pos).setY(G.player.pos.y + .2), 0xff8a2a, 16, .7); G.fx.ring(V, 0xffffff, 10, .5);
  G.hud.toast('KA-BOOM!');
  for (const e of G.enemies.list) if (e.alive && e.group.position.distanceTo(G.player.pos) < 15) G.enemies.damage(e, e.type === 'boss' ? 900 : 9999, { from: G.player.pos, kb: 12 });
};
G.collectBattery = pos => {
  const M = G.mission; M.count++; G.audio.play('pickup'); G.haptic(20); G.fx.popup(world.mission.short + ' ' + M.count + '/' + M.need, pos, 'gold');
  if (M.count >= M.need && !M.done) {
    M.done = true; G.addScore(SCORE.mission, null); G.world.setPower(true); G.audio.play('power');
    const lk = G.weapons.locked(); const gift = world.mission.unlock && !G.weapons.owned[world.mission.unlock] ? world.mission.unlock : lk[0];
    G.hud.banner(world.mission.done, '+' + SCORE.mission + (gift ? '  ·  ' + WEAPONS[gift].name : '  ·  AMMO'), 2.8);
    setTimeout(() => { if (G.state === 'over') return; if (gift) G.weapons.give(gift); else G.weapons.addAmmo(2); }, 1200);
    const key = world.id + ':mission'; if (!G.progress.missions.includes(key)) G.progress.missions.push(key); G.achieve('power');
  }
};
function usePower() {
  G.power = 0; const P = G.player; G.audio.play('power'); G.audio.play('explode'); G.shake = .6; G.haptic([30, 30, 60]);
  V.copy(P.pos).setY(P.pos.y + .3); G.fx.ring(V, 0xffd43b, 22, .7); G.fx.ring(V, 0xff5fa8, 14, .5); G.fx.burst(V.setY(P.pos.y + 1), 0xffd43b, 40, 14, .22, 2, .8);
  G.hud.toast('POWER BLAST!');
  for (const e of G.enemies.list) if (e.alive && e.group.position.distanceTo(P.pos) < 11) G.enemies.damage(e, e.type === 'boss' ? 350 : 160, { from: P.pos, kb: 14 });
}

// ---------------- player + aim ----------------
function placeCamera() {
  const P = G.player, cam = G.camera, mode = G.settings.view, z = G.zoomK || 0; G.view3 = mode !== 'first' && z < .6;
  cam.rotation.set(P.pitch, P.yaw, G.roll || 0);
  if (!G.view3) cam.position.copy(P.eye);
  else {
    F.set(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch));
    const far = mode === 'far', zz = Math.min(1, z / .6), dist = (far ? 6 : 2.7) * (1 - zz), up = (far ? 1.1 : .25) * (1 - zz), side = (far ? .4 : .75) * (1 - zz);
    cam.position.copy(P.eye).add(V.set(Math.cos(P.yaw) * side, up, -Math.sin(P.yaw) * side));
    for (let d = dist; d > -.01; d -= .2) { V2.copy(cam.position).addScaledVector(F, -d); if (V2.y > getHeight(V2.x, V2.z) + .35) break; }
    cam.position.copy(V2);
  }
  cam.updateMatrixWorld(); G.aimOrigin.copy(cam.position);
  if (G.view3) cam.layers.enable(1); else cam.layers.disable(1);
  G.body.group.visible = true;
}

function updatePlayer(dt) {
  const P = G.player, I = G.input;
  const [lx, ly] = I.takeLook();
  G.zoomK = (G.zoomK || 0) + ((G.zoom || I.zoomHold ? 1 : 0) - (G.zoomK || 0)) * Math.min(1, dt * 12);
  const sens = .0052 * G.settings.sensitivity * (G.aim.target ? .72 : 1) * (1 - .55 * G.zoomK);
  P.yaw -= lx * sens; P.pitch = Math.max(-1.25, Math.min(1.2, P.pitch - ly * sens));
  const m = I.getMove();
  const moving = Math.abs(m.x) + Math.abs(m.y) > .05;
  updateAim(dt, lx !== 0 || ly !== 0 || I.fireHeld || I.mouseFire);
  G.swayX = (G.swayX || 0) * Math.max(0, 1 - dt * 10) + lx * .0006; G.swayY = (G.swayY || 0) * Math.max(0, 1 - dt * 10) + ly * .0006;
  G.roll = (G.roll || 0) + (-m.x * .022 - (G.roll || 0)) * Math.min(1, dt * 6);
  const inWater = P.pos.y < G.world.waterY + .15;
  const speed = 5.4 * (G.gooT > 0 ? .55 : 1) * (m.sprint ? 1.55 : 1) * (G.effects.speed > 0 ? 1.45 : 1) * (inWater ? .72 : 1);
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  const tx = (-sy * m.y + cy * m.x) * speed, tz = (-cy * m.y - sy * m.x) * speed;
  const acc = Math.min(1, dt * (P.grounded ? 12 : 4));
  P.vel.x += (tx - P.vel.x) * acc; P.vel.z += (tz - P.vel.z) * acc;
  if (I.jump) { I.jump = false; if (P.grounded || P.coyote > 0) { P.vel.y = G.world.gravity * (G.gravMul || 1) < 1 ? 9.2 : 7.4; P.grounded = false; P.coyote = 0; G.audio.play('jump'); } }
  P.vel.y -= 22 * G.world.gravity * (G.gravMul || 1) * dt;
  P.pos.addScaledVector(P.vel, dt);
  resolveCollision(G.world, P.pos, .5);
  for (const e of G.enemies.list) { if (!e.alive || e.def.fly || e.air) continue; const dx = P.pos.x - e.group.position.x, dz = P.pos.z - e.group.position.z, rr = e.radius + .45, d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-4) { const d = Math.sqrt(d2); P.pos.x += dx / d * (rr - d); P.pos.z += dz / d * (rr - d); } }
  const gy = getHeight(P.pos.x, P.pos.z);
  const wasG = P.grounded;
  if (P.pos.y <= gy || (wasG && P.vel.y <= 0 && P.pos.y - gy < .35)) { if (!wasG && P.vel.y < -6) { G.audio.play('land'); G.body.land = 1; } P.pos.y = gy; P.vel.y = 0; P.grounded = true; P.coyote = .12; }
  else { P.grounded = false; P.coyote = (P.coyote || 0) - dt; }
  if (!moving && P.grounded) { P.vel.x *= Math.max(0, 1 - dt * 18); P.vel.z *= Math.max(0, 1 - dt * 18); if (Math.hypot(P.vel.x, P.vel.z) < .15) P.vel.x = P.vel.z = 0; }
  const hs = Math.hypot(P.vel.x, P.vel.z);
  if (P.grounded) P.bob += hs * dt * 1.5;
  if (inWater && hs > 1 && Math.random() < dt * 8) G.fx.burst(V.set(P.pos.x, G.world.waterY + .1, P.pos.z), 0xbfeeff, 2, 2, .1, 10, .4);
  const hz = G.world.hazard && G.world.hazard(P.pos); G.lavaT = (G.lavaT || 0) - dt;
  if (hz === 'lava' && G.lavaT <= 0) { G.lavaT = .6; P.invuln = 0; G.hurtPlayer(9, null); P.vel.y = 8.5; P.grounded = false; G.audio.play('lava'); G.hud.toast('HOT HOT HOT!'); G.fx.burst(V.copy(P.pos).setY(P.pos.y + .3), 0xff8a2a, 14, 5, .18, 8, .6); }
  G.surf = inWater ? 'water' : G.world.surface;
  P.invuln -= dt;
  P.eye.set(P.pos.x, P.pos.y + 1.6 + (G.view3 ? 0 : Math.abs(Math.cos(G.body.phase)) * .07 * Math.min(1, hs / 5) - (G.body.land || 0) * .1), P.pos.z);
  const baseF = (G.camera.aspect < 1.3 ? 80 : 72) + (m.sprint && hs > 6 && !G.zoom ? 8 : 0), tf = baseF * (1 - .55 * G.zoomK); G.camera.fov += (tf - G.camera.fov) * Math.min(1, dt * 10);
  $('scope').style.opacity = G.zoomK.toFixed(2); $('zoomBtn').classList.toggle('sel', !!G.zoom);
  G.camera.updateProjectionMatrix();
}

function updateAim(dt, active) {
  const P = G.player, d = WEAPONS[G.weapons.cur], assist = G.diff.assist;
  F.set(-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch));
  let best = null, be = 1e9, bto = new THREE.Vector3();
  for (const e of G.enemies.list) {
    if (!e.alive || e.spawnT > 0) continue;
    G.enemies.center(e, V).sub(G.aimOrigin); const dist = V.length(); if (dist > d.range) continue;
    const ang = Math.acos(Math.max(-1, Math.min(1, V.dot(F) / dist))); const eff = ang - Math.atan(e.radius / dist);
    if (eff < be) { be = eff; best = e; bto.copy(V); }
  }
  const lock = .035 + .03 * assist, pull = .15 * assist;
  G.aim.target = best && be < lock ? best : null;
  if (best && be < pull && active) {
    const k = (1 - Math.max(0, be) / pull) * Math.min(1, dt * 2.4 * assist) * .4;
    const ty = Math.atan2(-bto.x, -bto.z), tp = Math.atan2(bto.y, Math.hypot(bto.x, bto.z));
    let dy = ty - P.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    P.yaw += dy * k; P.pitch += (tp - P.pitch) * k * .6;
  }
}

function updateContext() {
  const P = G.player.pos;
  if (G.world.doorSpot && !G.doorOpen && Math.hypot(P.x - G.world.doorSpot.x, P.z - G.world.doorSpot.z) < 2.6) return { label: 'OPEN', kind: 'open', fn: openDoor };
  const box = G.items.nearestBox(P); if (box) return { label: 'OPEN', kind: 'open', fn: () => G.items.openBox(box) };
  if (G.power >= 1) return { label: 'POWER', kind: 'power', fn: usePower };
  return null;
}
function openDoor() {
  G.doorOpen = true; G.audio.play('door'); G.doorAnim = 0;
  const p = G.world.doorSpot.clone(); p.y = getHeight(p.x, p.z) + 1.2;
  setTimeout(() => {
    if (!G.weapons.owned.boomer) G.items.spawn('weapon', p, { pop: true, weapon: 'boomer' }); else G.items.spawn('ammo', p, { pop: true });
    G.items.spawn('pizza', p, { pop: true }); G.addScore(250, p); G.hud.toast('SOMETHING WAS INSIDE!');
  }, 450);
}

function updateSecrets() {
  const P = G.player.pos;
  for (const s of G.world.secrets) {
    if (s.found || Math.hypot(P.x - s.pos.x, P.z - s.pos.z) > s.r) continue;
    s.found = true; G.secretsFound++; G.addScore(SCORE.secret, null); G.audio.play('secret'); G.haptic(20);
    G.hud.banner('SECRET FOUND!', '+' + SCORE.secret, 2);
    G.fx.starBurst(V.copy(P).setY(P.y + 1.5), 10, 6);
    if (G.secretsFound >= 3) G.achieve('secrets');
  }
}

// ---------------- frame ----------------
let fpsAcc = 0, fpsN = 0;
function frame(dt) {
  G.time += dt;
  const portrait = matchMedia('(pointer: coarse) and (orientation: portrait)').matches;
  if (G.state === 'playing') {
    if (portrait || G.input.pause) { G.input.pause = false; pause(); }
    else {
      const I = G.input;
      updatePlayer(dt);
      for (const k in G.effects) if (G.effects[k] > 0) { G.effects[k] -= dt; if (G.effects[k] <= 0) G.hud.toast(EFFECTS[k].label + ' ENDED'); }
      G.streakT -= dt; if (G.streakT <= 0 && G.streak) G.streak = 0;
      if (I.cycle) { G.weapons.cycle(I.cycle); I.cycle = 0; }
      if (I.tray) { I.tray = false; G.hud.toggleTray(); }
      if (I.zoom) { I.zoom = false; G.zoom = !G.zoom; G.audio.play('click'); }
      if (I.map) { I.map = false; openMap(); return; }
      if (I.slot) { const id = G.weapons.list()[I.slot - 1]; if (id) G.weapons.equip(id); I.slot = 0; }
      if (I.reload) { I.reload = false; G.weapons.reload(); }
      G.context = updateContext();
      if (I.action) { I.action = false; if (G.context) G.context.fn(); }
      const wantFire = I.fireHeld || I.mouseFire || (G.settings.fireMode === 'auto' && !!G.aim.target);
      if (I.view) { I.view = false; const VM = ['third', 'far', 'first'], VL = { third: 'OVER THE SHOULDER', far: 'FAR VIEW', first: 'FIRST PERSON' }; G.settings.view = VM[(VM.indexOf(G.settings.view) + 1) % 3]; persist('settings', G.settings); G.hud.toast(VL[G.settings.view]); G.hud.c.x = 0; G.hud.toast(G.settings.view === 'third' ? 'BEHIND ME VIEW' : 'FIRST PERSON VIEW'); }
      placeCamera(); updateBody(G.body, G.player, dt, G.view3, G.player.pitch, G.time); G.world.followSun(G.player.pos);
      if (G.body.stepped) G.audio.play('step-' + (G.surf || 'grass'));
      G.weapons.update(dt, wantFire, G.aim.target);
      G.enemies.update(dt);
      G.items.update(dt);
      if (!G.net.puppet && G.waves.state !== 'tag') updateWaves(dt);
      updateSecrets();
      G.map.update(dt); G.warp.update(dt); updateWarp(dt); G.mpTick && G.mpTick(dt);
      if (G.doorOpen && G.world.cabinDoor && G.world.cabinDoor.rotation.y > -1.9) G.world.cabinDoor.rotation.y -= dt * 3;
      if (G.health <= 30 && G.health > 0) { G.hbT = (G.hbT || 0) - dt; if (G.hbT <= 0) { G.audio.play('heartbeat'); G.hbT = 1.1; } }
      G.hud.update(dt);
      if (I.joyId !== null || I.keys.KeyW) $('moveHint').classList.add('used');
      if (I.lookId !== null || document.pointerLockElement) $('lookHint').classList.add('used');
    }
  } else if (G.state === 'menu' || G.state === 'boot') {
    const a = G.time * .05; G.camera.position.set(Math.sin(a) * 34, 9 + Math.sin(G.time * .2), Math.cos(a) * 34); G.camera.lookAt(0, 1, -8); G.world.followSun(V.set(0, 0, -4)); G.body.group.visible = false; G.weapons.holder.visible = false;
  }
  G.world.update(dt, G.time); if (G.state !== 'menu') applyTOD();
  if (G.state !== 'paused') G.fx.update(dt);
  if (G.state === 'playing') {
    G.shake = Math.max(0, G.shake - dt * 1.8);
    if (G.shake > 0) { const s = G.shake * .15; G.camera.position.x += (Math.random() - .5) * s; G.camera.position.y += (Math.random() - .5) * s; }
  }
  G.renderer.render(G.scene, G.camera);
  // adaptive resolution
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 2.5) { const avg = fpsAcc / fpsN; if (avg > 1 / 45) { if (G.pr > .9) { G.pr = Math.max(.9, G.pr - .25); G.renderer.setPixelRatio(G.pr); } else if (G.world.grass && G.world.grass.visible) { G.world.setQuality('low'); } } fpsAcc = 0; fpsN = 0; }
}

function saveStage() { if (G.daily) return; const pr = G.progress; pr.stages = pr.stages || {}; pr.stages[world.id] = Math.max(pr.stages[world.id] || 0, G.stage + 1); if (G.score > pr.highScore) pr.highScore = G.score; persist('progress', pr); }
function stageClear() {
  saveStage(); G.waves.state = 'warp'; G.audio.play('victory'); G.addScore(500, null);
  G.hud.banner('LEVEL ' + G.stageName + ' CLEAR!', '+500', 2.6, 'level');
  if (G.net.inGame && G.net.mode !== 'coop') return;
  setTimeout(() => { if (G.waves.state !== 'warp' || G.warp.isOpen) return; G.warp.open(); G.hud.banner('WARP GATE OPEN!', 'Beam up to LEVEL ' + stageName(world, G.stage + 1), 3, 'level'); }, 2800);
}
function warpTarget() { if (G.daily) return null; if (G.stage < STAGES.length - 1) return { w: world, stage: G.stage + 1 }; if (world.bonus) return null; const n = WORLDS[WORLDS.indexOf(world) + 1]; return n ? { w: n, stage: 0 } : null; }
function updateWarp(dt) {
  const P = G.player;
  if (!G.warping) {
    if (G.warp.inside(P.pos)) { if (G.net.puppet) { if (!(G.warpReqT > G.time)) { G.warpReqT = G.time + 2; G.net.send({ t: 'warpReq', to: G.net.hostId }); G.hud.toast('WARPING THE TEAM…'); } } else startWarp(); }
    else if (!G.warp.isOpen && !G.warpHint && G.warp.pos && Math.hypot(P.pos.x - G.warp.pos.x, P.pos.z - G.warp.pos.z) < 3) { G.warpHint = true; G.hud.toast('WARP GATE: BEAT THE BOSS TO POWER IT!'); }
    return;
  }
  G.warping += dt; const k = G.warping, c = G.warp.pos;
  P.pos.x += (c.x - P.pos.x) * Math.min(1, dt * 3); P.pos.z += (c.z - P.pos.z) * Math.min(1, dt * 3);
  P.pos.y = c.y + .3 + k * k * 2.2; P.vel.set(0, 0, 0); P.invuln = 9; P.grounded = false;
  P.yaw += dt * (1 + k * 2.5); P.pitch += (.55 - P.pitch) * Math.min(1, dt * 2);
  G.camera.fov += (110 - G.camera.fov) * Math.min(1, dt * 1.5); G.camera.updateProjectionMatrix(); G.shake = Math.max(G.shake, .15 + k * .1);
  if (G.warp.style === 'lightning' && Math.random() < dt * 10) G.haptic(8);
  $('warpFx').style.opacity = Math.max(0, Math.min(1, (k - .9) / 1.3)).toFixed(3);
  if (k > 2.7) finishWarp();
}
function startWarp() {
  const tg = G.forcedTarget || warpTarget(); if (!tg) return endRun(true); const next = tg.w; G.forcedTarget = tg;
  if (G.net.coopHost) G.net.send({ t: 'goto', w: tg.w.id, s: tg.stage });
  G.warping = .001; G.warp.going = 1; G.input.enabled = false; G.input.reset(); if (document.pointerLockElement) document.exitPointerLock();
  G.audio.setMusic(null); G.audio.play('warp'); G.haptic([40, 60, 40, 60, 120]);
  const [style, col] = WARP_STYLES[world.id] || ['light', 0xffffff];
  const fx = $('warpFx'); fx.style.setProperty('--wc', '#' + col.toString(16).padStart(6, '0')); fx.dataset.style = style; fx.classList.add('on');
  $('warpTxt').innerHTML = 'WARPING TO<b>' + (tg.w === world ? 'LEVEL ' + stageName(world, tg.stage) : next.name) + '</b>';
  G.hud.show(false);
}
function finishWarp() {
  const tg = G.forcedTarget || warpTarget(), next = tg.w, same = next === world; G.forcedTarget = null; saveStage();
  const pr = G.progress; const wasHigh = G.score > pr.highScore; if (wasHigh) pr.highScore = G.score; pr.bestWave = Math.max(pr.bestWave, G.waves.count);
  if (!pr.cleared.includes(world.id)) pr.cleared.push(world.id); if (WORLDS.every(w => pr.cleared.includes(w.id))) G.achieve('hero'); persist('progress', pr);
  G.warping = 0; G.state = 'loading';
  setTimeout(() => {
    if (!same) loadWorld(next.id); startRun({ stage: tg.stage, carry: true });
    G.player.pos.y += 5; G.player.vel.y = 2; G.player.grounded = false; G.player.pitch = -.3;
    const fx = $('warpFx'); fx.style.transition = 'opacity 1.2s'; fx.style.opacity = '0';
    setTimeout(() => { fx.classList.remove('on'); fx.style.transition = ''; }, 1300);
    G.audio.play('warpOpen'); G.hud.toast(same ? 'LEVEL ' + G.stageName + ': ' + G.stageDef.label + '!' : 'WELCOME TO ' + next.name + '!');
    if (wasHigh) setTimeout(() => G.hud.toast('NEW HIGH SCORE SAVED!'), 1800);
  }, 60);
}
let lockT = null;
function showLockMsg(t) { const el = $('lockMsg'); el.textContent = t; el.classList.add('show'); clearTimeout(lockT); lockT = setTimeout(() => el.classList.remove('show'), 1800); }
function openMap() {
  G.state = 'map'; G.input.enabled = false; G.input.reset(); if (document.pointerLockElement) document.exitPointerLock();
  const p = G.map.progress(); $('mapCP').textContent = p.done >= p.total ? 'ALL CHECKPOINTS DONE!' : 'CHECKPOINTS ' + p.done + ' / ' + p.total;
  $('mapWorld').textContent = world.name; showScreen('mapScr'); setTimeout(() => G.map.drawFull(), 40); G.audio.play('click');
}
function closeMap() { if (G.state !== 'map') return; G.state = 'playing'; G.input.enabled = true; G.input.reset(); showScreen(null); }
G.onFirstSeen = type => { if (!G.seen || G.seen.has(type) || G.state !== 'playing') return; G.seen.add(type); const n = world?.names?.[type] || ENEMIES[type].name; if (n) setTimeout(() => G.hud.toast('NEW MONSTER: ' + n + '!'), 400); };
function pause() {
  if (G.state !== 'playing') return;
  G.state = 'paused'; G.input.enabled = false; G.input.reset(); if (document.pointerLockElement) document.exitPointerLock();
  G.audio.setMusic(null); showScreen('pauseScr');
}
function resume() { G.state = 'playing'; G.input.enabled = true; G.input.reset(); G.audio.setMusic(G.waves.state === 'boss' || G.waves.state === 'bossIntro' ? 'boss' : world.music); showScreen(null); }

function endRun(win) {
  G.state = 'over'; G.input.enabled = false; G.input.reset(); if (document.pointerLockElement) document.exitPointerLock();
  G.audio.setMusic(null); G.audio.play(win ? 'victory' : 'gameOver'); G.postScore && G.postScore(G.score);
  const pr = G.progress; const isHigh = G.score > pr.highScore; const prevHigh = pr.highScore;
  if (isHigh) pr.highScore = G.score;
  pr.bestWave = Math.max(pr.bestWave, G.waves.index + 1);
  if (win && !G.daily && !pr.cleared.includes(world.id)) pr.cleared.push(world.id);
  if (G.daily) { pr.daily = pr.daily || {}; if (pr.daily.key !== G.daily.key) pr.daily = { key: G.daily.key, best: 0 }; pr.daily.best = Math.max(pr.daily.best, G.score); }
  if (WORLDS.every(w => pr.cleared.includes(w.id))) G.achieve('hero');
  persist('progress', pr);
  const finalWin = win && world.final; if (finalWin) G.achieve('sun');
  $('overTitle').textContent = G.daily ? (win ? 'DAILY CHALLENGE DONE!' : 'DAILY CHALLENGE OVER') : finalWin ? 'YOU SAVED THE SOLAR SYSTEM!' : win ? 'WORLD CLEARED!' : 'GAME OVER';
  const ni = WORLDS.indexOf(world) + 1; G.nextWorld = win && !world.bonus && !G.daily && ni > 0 && ni < WORLDS.length ? WORLDS[ni] : null; $('nextBtn').hidden = !G.nextWorld; if (G.nextWorld) { const newly = G.nextWorld && !pr.cleared.includes(G.nextWorld.id); $('unlockMsg').hidden = !newly; $('unlockMsg').textContent = 'NEW WORLD UNLOCKED: ' + G.nextWorld.name + '!'; } else $('unlockMsg').hidden = true; if (G.nextWorld) $('nextBtn').textContent = 'NEXT: ' + G.nextWorld.name;
  const lvl = G.level(); $('oLevel').textContent = 'LEVEL ' + lvl + (lvl > G.startLevel ? '  ·  LEVEL UP!' : '');
  $('overScr').classList.toggle('win', win);
  $('oScore').textContent = G.score.toLocaleString();
  $('oHigh').textContent = pr.highScore.toLocaleString();
  $('oWave').textContent = win ? 'BOSS' : (G.waves.state === 'boss' || G.waves.state === 'bossIntro' ? 'BOSS' : G.waves.index + 1);
  $('oKills').textContent = G.kills; $('oBoss').textContent = G.bossKills;
  $('newHigh').hidden = !(isHigh && G.score > 0);
  $('overNext').textContent = win ? '' : (isHigh ? '' : prevHigh - G.score > 0 ? `${(prevHigh - G.score).toLocaleString()} points to beat your best!` : '');
  if (isHigh && G.score > 0) setTimeout(() => G.audio.play('highscore'), 900);
  setTimeout(() => { G.hud.show(false); showScreen('overScr'); }, win ? 200 : 900);
}

function toMenu() {
  if (G.net.connected) G.net.leave(true); G.mpEnd && G.mpEnd();
  G.state = 'menu'; G.input.enabled = false; G.hud.show(false); G.enemies.clear(); G.items.clear(); G.fx.clear(); G.world.boss(false);
  G.audio.setMusic('menu'); showScreen('menu');
}

// ---------------- menus ----------------
let screenStack = null;
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('open', s.id === id));
  if (id === 'menu') { const lv = G.level(); $('menuBest').textContent = 'LEVEL ' + lv + (G.progress.highScore ? '  ·  BEST ' + G.progress.highScore.toLocaleString() : ''); if (G.state !== 'menu') G.state = 'menu'; }
}
function wireUI() {
  const click = (id, fn) => $(id).addEventListener('click', e => { G.audio.unlock(); G.audio.play('click'); fn(e); });
  const first = () => { G.audio.unlock(); if (G.state === 'menu') G.audio.setMusic('menu'); };
  addEventListener('pointerdown', first, { once: true });
  click('playBtn', () => { showScreen('worldScr'); setTab(G.worldTab || 'journey'); renderWorlds(); });
  wireOnline();
  setupMP(G, { loadWorld, startRun, startWarp, showScreen, toMenu, worldOpen, endRun });
  click('nextBtn', () => { if (G.nextWorld) { loadWorld(G.nextWorld.id); startRun({ stage: 0 }); } });
  $('worldList').addEventListener('click', e => { const b = e.target.closest('[data-world]'); if (!b) return; if (b.classList.contains('locked')) { G.audio.play('empty'); const i = WORLDS.findIndex(w => w.id === b.dataset.world); showLockMsg('Clear ' + WORLDS[i - 1].name + ' to unlock!'); return; } G.audio.unlock(); G.audio.play('click'); renderStages(b.dataset.world); }); 
  $('stageList').addEventListener('click', e => { if (!findWorld($('stageList').dataset.world)) return; const b = e.target.closest('[data-stage]'); if (!b) return; if (b.classList.contains('locked')) { G.audio.play('empty'); showLockMsg('Clear the level before it first!'); return; } G.audio.play('click'); const wid = $('stageList').dataset.world, st = +b.dataset.stage; $('loading').classList.remove('gone'); $('loadMsg').textContent = 'Loading ' + findWorld(wid).name + '…'; setTimeout(() => { loadWorld(wid); $('loading').classList.add('gone'); startRun({ stage: st }); }, 30); });
  $('weaponTray').addEventListener('pointerdown', e => { e.stopPropagation(); const b = e.target.closest('[data-w]'); if (b && G.weapons.owned[b.dataset.w]) { G.weapons.equip(b.dataset.w); G.hud.toggleTray(false); } else if (b) { G.audio.play('empty'); } else if (e.target.closest('#trayReload')) { G.weapons.reload(); G.hud.toggleTray(false); } });
  click('weaponsBtn', () => { renderWeapons(); showScreen('weaponsScr'); });
  click('scoresBtn', () => { renderScores(); showScreen('scoresScr'); });
  click('settingsBtn', () => { screenStack = 'menu'; renderSettings(); showScreen('settingsScr'); });
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { G.audio.play('click'); showScreen(b.dataset.back === 'auto' ? screenStack : b.dataset.back); }));
  click('resumeBtn', resume);
  click('mapClose', closeMap); $('bigmap').addEventListener('click', closeMap);
  addEventListener('keydown', e => { if (G.state === 'map' && (e.code === 'KeyM' || e.code === 'Escape')) closeMap(); });
  click('restartBtn', () => { G.hud.show(false); startRun({ again: true }); });
  click('pSettingsBtn', () => { screenStack = 'pauseScr'; renderSettings(); showScreen('settingsScr'); });
  click('pMenuBtn', toMenu);
  click('againBtn', () => { startRun({ again: true }); });
  click('oMenuBtn', toMenu);
  document.addEventListener('visibilitychange', () => { if (document.hidden && !window.__test) pause(); });
  // block browser gestures
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu']) document.addEventListener(ev, e => e.preventDefault());
  document.addEventListener('touchmove', e => { if (!e.target.closest('.scroll')) e.preventDefault(); }, { passive: false });
  // settings controls
  document.querySelectorAll('#settingsScr [data-set]').forEach(el => {
    const key = el.dataset.set;
    if (el.type === 'range') el.addEventListener('input', () => { G.settings[key] = +el.value; applySettings(); });
    else el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { G.audio.play('click'); let v = b.dataset.v; if (v === 'true') v = true; if (v === 'false') v = false; G.settings[key] = v; applySettings(); renderSettings(); }));
  });
}
function applySettings() { G.world.setQuality(G.settings.graphics); G.body.setShirt(SHIRTS[G.settings.shirt] || SHIRTS.blue); G.audio.setVolumes(G.settings); G.audio.vibrate = G.settings.vibration; if (G.state !== 'boot' && G.diff) G.diff = DIFFICULTY[G.settings.difficulty]; persist('settings', G.settings); }
function renderSettings() {
  document.querySelectorAll('#settingsScr [data-set]').forEach(el => {
    const v = G.settings[el.dataset.set];
    if (el.type === 'range') el.value = v; else el.querySelectorAll('button').forEach(b => b.classList.toggle('sel', String(v) === b.dataset.v));
  });
  $('diffNote').hidden = G.state !== 'paused';
}
function renderWeapons() {
  const xp = G.progress.xp || 0, lv = G.level(); const nxt = LEVELS[lv];
  $('lvlInfo').innerHTML = `<b>LEVEL ${lv}</b><div class="bar xp"><div style="width:${nxt ? Math.min(100, (xp - LEVELS[lv - 1]) / (nxt - LEVELS[lv - 1]) * 100) : 100}%"></div></div><span>${nxt ? (nxt - xp).toLocaleString() + ' points to level ' + (lv + 1) : 'MAX LEVEL!'}</span>`;
  $('weaponList').innerHTML = WEAPON_ORDER.map(id => { const d = WEAPONS[id], has = G.progress.weapons.includes(id), ul = LEVEL_UNLOCKS.indexOf(id);
    return `<div class="wslot ${has ? '' : 'locked'}" style="--c:${d.css}"><div class="wico">${WICON[id]}</div><div class="wn">${has ? d.name : '???'}</div><div class="wd">${has ? d.desc : (ul > 0 ? 'Unlocks at LEVEL ' + (ul + 1) + '. ' : '') + d.where}</div></div>`; }).join('');
}
function renderScores() {
  const p = G.progress; G.renderFamily && G.renderFamily();
  $('sBest').textContent = p.highScore.toLocaleString();
  $('sStats').innerHTML = [['BEST WAVE', p.bestWave || '-'], ['MONSTERS', p.monsters.toLocaleString()], ['BOSSES', p.bosses], ['GAMES', p.plays]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
  $('sBadges').innerHTML = ACHIEVEMENTS.map(a => `<div class="badge ${p.achievements.includes(a.id) ? 'got' : ''}"><i>★</i><div><b>${a.name}</b><span>${a.desc}</span></div></div>`).join('');
  $('sWorlds').innerHTML = WORLDS.map((w, i) => `<div class="world ${p.cleared.includes(w.id) ? 'got' : ''}"><b>${i + 1}</b><span>${w.name}</span>${p.cleared.includes(w.id) ? '<em>CLEARED</em>' : ''}</div>`).join('');
}
const WORLD_ART = {
  woods: '<svg viewBox="0 0 60 60"><path d="M30 6 44 28H36L48 46H12L24 28H16Z"/><rect x="27" y="46" width="6" height="8"/></svg>',
  water: '<svg viewBox="0 0 60 60"><path d="M26 44c0-14 4-26 10-32M36 12c-8-2-14 2-16 6M36 12c6-3 12 0 14 5M36 12c-4 4-6 10-4 14" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M4 48q7-6 13 0t13 0 13 0 13 0v8H4z"/></svg>',
  volcano: '<svg viewBox="0 0 60 60"><path d="M4 54 24 20h12l20 34z"/><path d="M26 14c-2-4 2-8 6-6 2-4 8-2 7 3" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>',
  space: '<svg viewBox="0 0 60 60"><path d="M30 4c8 8 10 20 8 32H22C20 24 22 12 30 4z"/><path d="M22 30l-8 10 8 2zM38 30l8 10-8 2zM26 44h8l-4 10z"/></svg>',
  alien: '<svg viewBox="0 0 60 60"><ellipse cx="30" cy="34" rx="26" ry="8"/><path d="M18 30a12 12 0 0 1 24 0z"/><path d="M20 44l-6 10M40 44l6 10M30 44v10" stroke="currentColor" stroke-width="3"/></svg>',
};
const LOCK_ART = '<svg viewBox="0 0 60 60"><rect x="14" y="26" width="32" height="26" rx="5"/><path d="M20 26v-6a10 10 0 0 1 20 0v6" fill="none" stroke="currentColor" stroke-width="5"/></svg>';
function planetArt(w) {
  if (w.id === 'sun') return '<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="13"/>' + [...Array(10)].map((_, i) => { const a = i / 10 * Math.PI * 2; return `<path d="M${30 + Math.cos(a) * 17} ${30 + Math.sin(a) * 17}L${30 + Math.cos(a) * 26} ${30 + Math.sin(a) * 26}" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`; }).join('') + '</svg>';
  const ring = { saturn: 1, uranus: 2 }[w.id];
  return '<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="15"/>' + (ring ? `<ellipse cx="30" cy="30" rx="27" ry="7" fill="none" stroke="currentColor" stroke-width="3.5" transform="rotate(${ring === 2 ? 70 : -18} 30 30)"/>` : '') + (w.id === 'pluto' ? '<path d="M30 38c-6-4-9-7-9-10a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 3-3 6-9 10z" fill="#fff"/>' : '') + (w.id === 'mars' ? '<circle cx="24" cy="26" r="3" fill="rgba(255,255,255,.35)"/><circle cx="36" cy="35" r="2.4" fill="rgba(255,255,255,.35)"/>' : '') + '</svg>';
}
const TOD_ART = {
  day: '<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="11"/>' + [...Array(8)].map((_, i) => { const a = i / 8 * Math.PI * 2; return `<path d="M${30 + Math.cos(a) * 16} ${30 + Math.sin(a) * 16}L${30 + Math.cos(a) * 23} ${30 + Math.sin(a) * 23}" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`; }).join('') + '</svg>',
  sunset: '<svg viewBox="0 0 60 60"><path d="M12 40a18 18 0 0 1 36 0z"/><path d="M6 46h48M14 52h32" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
  night: '<svg viewBox="0 0 60 60"><path d="M38 10a20 20 0 1 0 12 30 16 16 0 0 1-12-30z"/><path d="M14 14l1.5 3 3 .5-2.2 2 .6 3-2.9-1.5-2.9 1.5.6-3-2.2-2 3-.5z"/></svg>',
};
function renderStages(wid) {
  const w = findWorld(wid), done = (G.progress.stages || {})[wid] || (G.progress.cleared.includes(wid) ? 3 : 0);
  $('stageTitle').textContent = w.name; $('stageList').dataset.world = wid; $('stageScr').style.setProperty('--c', w.css); $('stageScr').style.setProperty('--c2', w.css2);
  $('stageList').innerHTML = STAGES.map((s, i) => { const open = i <= done, clr = i < done;
    return (i ? `<span class="wpath ${open ? 'on' : ''}"></span>` : '') + `<button class="scard ${open ? '' : 'locked'} ${clr ? 'done' : ''} tod-${s.tod}" data-stage="${i}"><span class="snum">${stageName(w, i)}</span><span class="wart">${open ? TOD_ART[s.tod] : LOCK_ART}</span><span class="wname">${s.label}</span><span class="wstat">${clr ? '★ CLEARED' : open ? 'PLAY' : 'LOCKED'}</span></button>`; }).join('');
  showScreen('stageScr');
}
// ---------- online extras + install ----------
function setTab(t) { G.worldTab = t; document.querySelectorAll('.wtab').forEach(b => b.classList.toggle('sel', b.dataset.tab === t)); $('worldList').hidden = t !== 'journey'; $('bonusList').hidden = t !== 'online'; if (t === 'online') renderBonus(); }
function netState() {
  const on = navigator.onLine && BONUS.loaded;
  const b = $('netBadge'); b.className = 'netbadge ' + (on ? 'on' : 'off'); b.textContent = on ? 'ONLINE · ' + (BONUS.worlds.length) + ' BONUS WORLDS + DAILY' : 'OFFLINE · ALL ' + WORLDS.length + ' WORLDS READY';
  const dot = $('onlineDot'); if (dot) dot.classList.toggle('on', on);
}
async function refreshOnline() { await loadBonus(); netState(); if (G.worldTab === 'online' && $('worldScr').classList.contains('open')) renderBonus(); }
function renderBonus() {
  const el = $('bonusList');
  if (!navigator.onLine || !BONUS.loaded) { el.innerHTML = '<div class="offcard"><div class="wart">' + OFF_ART + '</div><b>CONNECT TO THE INTERNET</b><span>Bonus worlds and the Daily Challenge need a connection. Everything else works offline!</span><button class="btn" data-retry>TRY AGAIN</button></div>'; return; }
  const unlocked = WORLDS.filter((w, i) => worldOpen(i)); const dc = G.todays = todaysChallenge(unlocked); const best = G.progress.daily && dc && G.progress.daily.key === dc.key ? G.progress.daily.best : 0;
  const art = G.settings.foodArt || '3d', ab = (k, l) => `<button data-art="${k}" style="padding:6px 14px;border-radius:10px;font:inherit;${art === k ? 'background:#ffd43b;color:#1d1238' : 'background:transparent;color:#fff'}">${l}</button>`;
  const hasFood = BONUS.worlds.some(w => w.skinBase);
  let h = hasFood ? `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;margin-right:14px;color:#fff;font-size:14px">FOOD WORLD ART<div style="display:flex;gap:4px;background:#1d1238;padding:4px;border-radius:12px">${ab('3d', '3D')}${ab('toon', 'CARTOON')}</div></div>` : '';
  h += dc ? `<button class="wcard daily" data-daily style="--c:#ffd43b;--c2:#ff5fa8"><span class="wnum">★</span><span class="wart">${WORLD_ART[dc.world.id] || planetArt(dc.world)}</span><span class="wname">${dc.mod.name}</span><span class="dsub">DAILY · ${dc.world.name}</span><span class="wstat">${best ? 'BEST ' + best.toLocaleString() : 'PLAY'}</span></button>` : '';
  h += BONUS.worlds.map(w => { const sd = (G.progress.stages || {})[w.id] || 0; return `<span class="wpath on"></span><button class="wcard" data-bonus="${w.id}" style="--c:${w.css};--c2:${w.css2}"><span class="wnum">B</span><span class="wart">${w.icon ? `<img src="${skinURL({ worldDef: w, settings: G.settings }, w.icon)}" style="height:100%;max-width:100%;object-fit:contain">` : WORLD_ART[w.id] || planetArt(w)}</span><span class="wname">${w.name}</span><span class="wstat">${sd >= 3 ? '★ CLEARED' : sd ? 'LEVEL ' + (sd + 1) + '/3' : 'PLAY'}</span><span class="wstars">${[0, 1, 2].map(k => `<i class="${k < sd ? 'on' : ''}">★</i>`).join('')}</span></button>`; }).join('');
  el.innerHTML = h;
}
WORLD_ART.candy = '<svg viewBox="0 0 60 60"><circle cx="30" cy="22" r="15"/><path d="M30 37v20" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M30 22m-8 0a8 8 0 1 1 8 8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';
WORLD_ART.slimecity = '<svg viewBox="0 0 60 60"><path d="M6 54V30h12v24zM20 54V14h14v40zM36 54V24h12v30zM50 54V36h6v18z"/><path d="M20 14q7-6 14 0" fill="none" stroke="currentColor" stroke-width="3"/></svg>';
WORLD_ART.icecastle = '<svg viewBox="0 0 60 60"><path d="M8 54V26h8v6h6V18h6v6h4v-6h6v14h6v-6h8v28z"/><path d="M25 18l3-10 3 10M11 26l1-6 1 6M47 26l1-6 1 6" stroke="currentColor" stroke-width="2.5"/></svg>';
const OFF_ART = '<svg viewBox="0 0 60 60"><path d="M8 24a32 32 0 0 1 44 0M16 32a20 20 0 0 1 28 0M24 40a8 8 0 0 1 12 0" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><circle cx="30" cy="48" r="4"/><path d="M10 10l40 40" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>';
let installEvt = null;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
function installState() { const b = $('installBtn'); b.hidden = isStandalone(); }
const IC = {
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M12 3 7.5 7.5M12 3l4.5 4.5M5 11v9h14v-9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="19" r="2.2" fill="currentColor"/></svg>',
  safari: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" fill="currentColor"/></svg>',
  app: '<img src="icons/icon-180.png" alt="">', link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};
function renderInstall() {
  const ua = navigator.userAgent, ios = isIOS(), iosOther = ios && /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua), inApp = /FBAN|FBAV|Instagram|Line\/|Snapchat|Twitter/i.test(ua);
  const samsung = /SamsungBrowser/.test(ua), android = /Android/.test(ua), firefox = /Firefox/.test(ua) && !ios;
  const preview = !isSecureContext || /claudeusercontent|localhost:0/.test(location.host);
  let steps, note = '';
  if (preview) { steps = [[IC.link, 'Open your <b>published link</b> (like monster-blast.pages.dev)'], [IC.share, 'This preview can\'t be installed'], [IC.app, 'Then install from there']]; note = 'Installing needs the game hosted on a secure https site — see README.'; }
  else if (inApp) steps = [[IC.dots, 'Tap the <b>⋯ menu</b>'], [IC.safari, 'Choose <b>Open in Safari</b> (or Chrome)'], [IC.app, 'Then tap INSTALL GAME again']];
  else if (ios && iosOther) steps = [[IC.share, 'Tap <b>Share</b> (top right or bottom)'], [IC.plus, 'Choose <b>Add to Home Screen</b>'], [IC.app, 'Tap the icon to play — even offline!']], note = "Don't see it? Open this page in Safari instead (iPhone/iPad need iOS 16.4+ for other browsers).";
  else if (ios) steps = [[IC.share, 'Tap the <b>Share</b> button in Safari'], [IC.plus, 'Scroll and choose <b>Add to Home Screen</b>'], [IC.app, 'Tap <b>Add</b>, then play from the icon — even offline!']], note = 'On iPad the Share button is at the top right.';
  else if (samsung) steps = [[IC.dots, 'Tap the <b>≡ menu</b> at the bottom'], [IC.plus, 'Choose <b>Add page to → Home screen</b>'], [IC.app, 'Play from the new icon']];
  else if (firefox) steps = [[IC.dots, 'Tap the <b>⋮ menu</b>'], [IC.plus, 'Choose <b>Install</b> or <b>Add to Home screen</b>'], [IC.app, 'Play from the new icon']];
  else if (android) steps = [[IC.dots, 'Tap Chrome\'s <b>⋮ menu</b>'], [IC.plus, 'Choose <b>Install app</b> or <b>Add to Home screen</b>'], [IC.app, 'Play from the new icon — even offline!']];
  else steps = [[IC.plus, 'Click the <b>install icon</b> in the address bar'], [IC.dots, 'or open the browser menu → <b>Install Monster Blast</b>'], [IC.app, 'Open it from your apps']];
  $('isteps').innerHTML = steps.map(([ic, t], i) => `<div class="istep"><b>${i + 1}</b><span class="iic">${ic}</span><p>${t}</p></div>`).join('');
  $('inote').textContent = note;
}
function wireOnline() {
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; installState(); });
  addEventListener('appinstalled', () => { installEvt = null; installState(); G.hud.toast && G.hud.toast('INSTALLED! FIND IT ON YOUR HOME SCREEN'); });
  $('installBtn').addEventListener('click', async () => { G.audio.play('click'); if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; installState(); } else { renderInstall(); showScreen('installScr'); } });
  addEventListener('online', refreshOnline); addEventListener('offline', () => { BONUS.loaded = false; netState(); if (G.worldTab === 'online') renderBonus(); });
  document.querySelectorAll('.wtab').forEach(b => b.addEventListener('click', () => { G.audio.play('click'); setTab(b.dataset.tab); }));
  $('bonusList').addEventListener('click', e => {
    if (e.target.closest('[data-retry]')) { G.audio.play('click'); refreshOnline(); return; }
    const d = e.target.closest('[data-daily]'), bw = e.target.closest('[data-bonus]');
    if (bw) { G.audio.play('click'); renderStages(bw.dataset.bonus); return; }
    const ar = e.target.closest('[data-art]'); if (ar) { G.audio.play('click'); G.settings.foodArt = ar.dataset.art; persist('settings', G.settings); renderBonus(); return; }
    if (d && G.todays) { const dc = G.todays; G.audio.play('click'); $('loading').classList.remove('gone'); $('loadMsg').textContent = 'Loading the Daily Challenge…'; setTimeout(() => { loadWorld(dc.world.id); $('loading').classList.add('gone'); startRun({ stage: dc.stage, daily: { key: dc.key, mod: dc.mod } }); }, 30); }
  });
  installState(); netState(); refreshOnline();
}
function worldOpen(i) { return i === 0 || G.progress.cleared.includes(WORLDS[i - 1].id) || G.progress.cleared.includes(WORLDS[i].id); }
function renderWorlds() {
  const p = G.progress;
  let cur = 0;
  $('worldList').innerHTML = WORLDS.map((w, i) => { const open = worldOpen(i), done = p.cleared.includes(w.id); if (open) cur = i;
    const art = WORLD_ART[w.id] || planetArt(w);
    const sd = (p.stages || {})[w.id] || (done ? 3 : 0);
    return (i ? `<span class="wpath ${open ? 'on' : ''}"></span>` : '') + `<button class="wcard ${open ? '' : 'locked'} ${done ? 'done' : ''}" data-world="${w.id}" style="--c:${w.css};--c2:${w.css2}"><span class="wnum">${i + 1}</span><span class="wart">${open ? art : LOCK_ART}</span><span class="wname">${open ? w.name : '???'}</span><span class="wstat">${done ? '★ CLEARED' : open ? (sd ? 'LEVEL ' + (sd + 1) + '/3' : 'PLAY') : 'LOCKED'}</span><span class="wstars">${[0, 1, 2].map(k => `<i class="${k < sd ? 'on' : ''}">★</i>`).join('')}</span></button>`; }).join('');
  setTimeout(() => { const el = $('worldList'), card = el.querySelectorAll('.wcard')[cur]; if (card) el.scrollTo({ left: Math.max(0, card.offsetLeft - el.offsetLeft - el.clientWidth / 2 + card.offsetWidth / 2), behavior: 'instant' }); }, 30);
}

// PWA
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

boot().catch(err => { console.error(err); $('loadMsg').textContent = 'Could not start the game. Reload to try again.'; });
