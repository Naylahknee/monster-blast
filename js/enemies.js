import * as THREE from 'three';
import { ENEMIES } from './config.js';
import { makeEnemy } from './models.js';
import { getHeight, resolveCollision } from './world.js';

const V = new THREE.Vector3(), V2 = new THREE.Vector3();
const SHELL_G = new THREE.SphereGeometry(1, 24, 16);

// ---- drawing "skins": a world can swap an enemy's 3D body for a hand-drawn picture ----
const SKIN_H = { slime: 1.9, mini: 1.1, chomper: 2.1, spitter: 2.4, bat: 1.9, tank: 3.4, ghost: 2.2, hopper: 1.9, bomber: 1.5, shelly: 2.2, crystal: 2.8, shard: 1.2, boss: 8 };
const TEX = {}, LOADER = new THREE.TextureLoader();
export function skinTexture(url) {
  if (!TEX[url]) { const rec = { tex: null, ar: 1, waiting: [] }; TEX[url] = rec; rec.tex = LOADER.load(url, t => { rec.ar = t.image.width / t.image.height; rec.waiting.forEach(f => f()); rec.waiting = []; }); rec.tex.colorSpace = THREE.SRGBColorSpace; rec.tex.anisotropy = 4; }
  return TEX[url];
}
export function skinSprite(url, h, grounded = true) {
  const rec = skinTexture(url);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: rec.tex, transparent: true, alphaTest: .35 }));
  s.center.set(.5, grounded ? 0 : .5);
  const size = () => s.scale.set(h * rec.ar, h, 1); size(); if (!rec.tex.image) rec.waiting.push(size);
  return s;
}
function applySkin(type, a, url, fly) {
  a.inner.traverse(o => { if (o.isMesh) o.visible = false; });
  const s = skinSprite(url, SKIN_H[type] || 2, !fly); if (fly) s.position.y = 0; a.inner.add(s); a.sprite = s;
}
function tintSkin(e) {
  const s = e.a.sprite; if (!s) return; const c = s.material.color;
  if (e.flashT > 0) c.setRGB(1, .45, .45); else if (e.frozenT > 0) c.setRGB(.6, .85, 1); else if (e.trapT > 0) c.setRGB(.85, .7, 1); else if (e.slowT > 0) c.setRGB(.7, 1, .6); else c.setRGB(1, 1, 1);
}

export class Enemies {
  constructor(G) {
    this.G = G; this.list = [];
    this.shots = [];
    const geo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xd06bff })); m.visible = false; G.scene.add(m); this.shots.push({ m, v: new THREE.Vector3(), life: 0, dmg: 0, r: .25 }); }
  }

  spawn(type, pos, opts = {}) {
    const G = this.G, def = ENEMIES[type];
    const { group, a } = makeEnemy(type);
    const tint = type === 'boss' ? G.worldDef?.boss?.color : G.worldDef?.tints?.[type]; if (tint) a.mat.color.set(tint);
    const skin = G.worldDef?.skins?.[type]; if (skin) applySkin(type, a, skin, !!def.fly);
    group.position.set(pos.x, getHeight(pos.x, pos.z), pos.z);
    const hp = def.hp * G.diff.enemyHp * (G.worldDef?.hp || 1) * (type === 'boss' ? 1 : (G.stageHp || 1));
    const e = { type, def, group, a, hp, maxHp: hp, radius: def.radius, cd: def.cd ? def.cd * (.5 + Math.random()) : 1, t: Math.random() * 10, slowT: 0, flashT: 0, spawnT: opts.instant ? 0 : .6, state: 'move', stateT: 0, alive: true, strafe: Math.random() < .5 ? 1 : -1, ang: Math.random() * 6.28, flyY: 3.4, kb: new THREE.Vector3(), baseEm: a.mat.emissive.clone(), yaw: 0 };
    e.sc = type === 'boss' ? 1 : (G.enemyScale || 1); e.radius *= e.sc; if (!e.spawnT) group.scale.setScalar(e.sc);
    if (type === 'bat') group.position.y += e.flyY;
    if (type === 'ghost') { e.flyY = 1.2; group.position.y += 1.2; }
    if (type === 'hopper') { e.hopT = .6 + Math.random(); e.vy = 0; e.air = false; }
    if (def.hides) e.hideT = 2 + Math.random() * 2;
    if (G.onFirstSeen) G.onFirstSeen(type);
    if (type === 'boss') G.fx.vfx.attach(e, o => e.alive && e.group.parent ? this.center(e, o) : null, { rate: 18, color: [0xffe14a, 0xff5fa8, 0xffffff], size: .45, speed: 2.5, dur: 1, spread: 5, up: 1.2 });
    this.nextNid = (this.nextNid || 0) + 1; e.nid = opts.nid ?? this.nextNid;
    if (type === 'boss') { e.state = 'intro'; e.stateT = 3.2; e.attackIdx = 0; e.shake = 0; group.position.y -= 7; }
    if (e.spawnT > 0) group.scale.setScalar(.01);
    G.scene.add(group); this.list.push(e);
    if (e.spawnT > 0) { G.fx.burst(V.copy(group.position).setY(group.position.y + .3), 0xb9b3d6, 10, 4, .18, 6, .6); G.fx.ring(V.copy(group.position).setY(group.position.y + .1), 0xffffff, 2.5, .5); }
    return e;
  }

  center(e, out) {
    out.copy(e.group.position);
    if (e.def.fly) return out;
    if (e.type === 'boss') { out.y += 2.6 + e.a.inner.position.y; return out; }
    out.y += e.def.height * (e.sc || 1); return out;
  }

  alive() { return this.list.filter(e => e.alive); }

  targets() {
    const G = this.G, L = G.player; this.me = this.me || { pos: L.pos, eye: L.eye, vel: L.vel, grounded: true, id: null };
    this.me.grounded = L.grounded; const out = [this.me];
    if (G.net?.coopHost) for (const r of G.net.remote.values()) out.push(r.T);
    return out;
  }
  hurt(T, amt, from, contact) {
    const G = this.G; if (T.id == null) return G.hurtPlayer(amt, from, contact);
    const now = performance.now(); if (T.inv > now) return; T.inv = now + 450;
    G.net.send({ t: 'hurt', to: T.id, a: +amt.toFixed(1), x: +(from?.x || 0).toFixed(1), z: +(from?.z || 0).toFixed(1), c: contact ? 1 : 0 });
  }
  update(dt) {
    const G = this.G;
    if (G.net?.puppet) return this.updatePuppets(dt);
    const TL = this.targets();
    for (const e of this.list) {
      if (!e.alive) continue;
      let T = TL[0]; if (TL.length > 1) { let bd = 1e9; for (const t of TL) { const d = t.pos.distanceToSquared(e.group.position); if (d < bd) { bd = d; T = t; } } }
      const P = T.pos; this.T = T;
      e.t += dt; e.cd -= dt; e.slowT -= dt; e.flashT -= dt;
      const g = e.group, a = e.a;
      if (e.spawnT > 0) { e.spawnT -= dt; const k = 1 - Math.max(0, e.spawnT) / .6; g.scale.setScalar((k < 1 ? Math.max(.01, 1 + Math.sin(k * Math.PI * 1.5) * (1 - k) * .6) * k : 1) * e.sc); if (e.spawnT <= 0) g.scale.setScalar(e.sc); continue; }
      if (e.frozenT > 0 || e.trapT > 0) { this.stuck(e, dt); continue; }
      const dx = P.x - g.position.x, dz = P.z - g.position.z, dist = Math.hypot(dx, dz) || .001;
      const nx = dx / dist, nz = dz / dist;
      const spd = e.def.speed * G.diff.enemySpeed * (e.slowT > 0 ? .45 : 1);
      let mx = 0, mz = 0;
      if (e.type === 'boss') { this.updateBoss(e, dt, dist, nx, nz); }
      else if (e.def.attack === 'float') {
        e.ang += dt * 1.2; const wob = Math.sin(e.t * 2.4) * .7;
        mx = nx + -nz * wob; mz = nz + nx * wob; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
        if (dist < 1.2) { mx *= .2; mz *= .2; }
        const gy = getHeight(g.position.x, g.position.z); const ty = Math.max(gy + .9, T.eye.y - .4) + Math.sin(e.t * 3) * .25; g.position.y += (ty - g.position.y) * Math.min(1, dt * 2.5);
        a.skirt.rotation.y += dt * 3; a.inner.rotation.z = Math.sin(e.t * 2.4) * .15;
        e.fade = .45 + .45 * (.5 + .5 * Math.sin(e.t * 1.3)); a.mat.opacity = e.fade;
        if (a.shadow) a.shadow.position.y = gy - g.position.y + .05;
        if (dist < 1.4 && Math.abs(g.position.y - T.eye.y) < 1.6 && e.cd <= 0) { this.hurt(T, e.def.damage, g.position); e.cd = e.def.cd; G.audio.play('spawn'); }
      } else if (e.def.attack === 'hop') {
        const gy = getHeight(g.position.x, g.position.z);
        if (e.air) {
          e.vy -= 22 * dt; g.position.y += e.vy * dt; mx = e.hx; mz = e.hz;
          a.legs.forEach(l => l.rotation.x = -.9); a.inner.scale.set(.9, 1.15, .9);
          if (g.position.y <= gy && e.vy < 0) { g.position.y = gy; e.air = false; e.hopT = .7 + Math.random() * .6; a.inner.scale.set(1.25, .75, 1.25); G.fx.ring(V.copy(g.position).setY(gy + .1), e.def.color, 2.2, .3); if (dist < 2.3) this.hurt(T, e.def.damage, g.position); }
        } else {
          e.hopT -= dt; a.inner.scale.lerp(V.set(1, 1, 1), Math.min(1, dt * 8)); a.legs.forEach(l => l.rotation.x = 0);
          if (e.hopT <= 0) { e.air = true; e.vy = 8.5; const jitter = (Math.random() - .5) * .5; e.hx = nx + -nz * jitter; e.hz = nz + nx * jitter; if (dist < 6) { e.hx *= dist / 6; e.hz *= dist / 6; } G.audio.play('boing'); }
        }
      } else if (e.def.attack === 'bomb') {
        if (e.state === 'fuse') {
          e.stateT -= dt; const bl = Math.floor(e.stateT * 12) % 2; a.mat.emissive.setRGB(bl ? .9 : .2, 0, 0); a.inner.scale.setScalar(1 + (1 - e.stateT / .9) * .45);
          if (e.stateT <= 0) { this.explode(e, true); continue; }
        } else {
          mx = nx; mz = nz; a.legs.forEach((l, i) => l.rotation.x = Math.sin(e.t * 22 + i) * .5); a.spark.scale.setScalar(.06 + Math.random() * .07);
          if (dist < 2.2) { e.state = 'fuse'; e.stateT = .9; G.audio.play('empty'); }
        }
      }
      else if (e.def.attack === 'melee') {
        if (e.def.hides && e.hideT !== undefined) { e.hideT -= dt; if (e.hideT < 0) { a.head.scale.setScalar(Math.max(.01, a.head.scale.x - dt * 8)); a.shellG.position.y = -.25; if (e.hideT < -1.6) { e.hideT = 2.5 + Math.random() * 2; } e.hiding = true; } else { a.head.scale.setScalar(Math.min(1, a.head.scale.x + dt * 6)); a.shellG.position.y = 0; e.hiding = false; } if (e.hiding) { e.cd = Math.max(e.cd, .3); a.mat.emissive.copy(e.baseEm); g.rotation.y = e.yaw; continue; } }
        if (e.state === 'windup') {
          e.stateT -= dt; const k = 1 - e.stateT / e.windT;
          a.inner.scale.set(1 + k * .25, 1 - k * .25, 1 + k * .25);
          if (e.type === 'chomper') { a.jaw.scale.y = 1 + k; mx = nx * 3; mz = nz * 3; }
          if (e.type === 'tank' || e.type === 'crystal') a.arms.forEach((arm, i) => arm.position.y = (e.type === 'tank' ? 1.2 : 1) + k * 1.2);
          if (e.stateT <= 0) {
            a.inner.scale.set(1, 1, 1); if (a.jaw) a.jaw.scale.y = 1; if (a.arms) a.arms.forEach(arm => arm.position.y = e.type === 'tank' ? 1.2 : 1);
            if (dist < e.def.reach + .7 && Math.abs(T.pos.y - g.position.y) < 2.2) this.hurt(T, e.def.damage, g.position);
            G.audio.play(e.type === 'tank' ? 'slam' : 'chomp'); if (e.type === 'tank') { G.fx.ring(V.copy(g.position).setY(g.position.y + .1), 0xd8573c, 4, .5); G.shake = Math.max(G.shake, .3); }
            e.state = 'move'; e.cd = e.def.cd;
          }
        } else {
          if (dist > e.def.reach * .75) { mx = nx; mz = nz; }
          if (dist < e.def.reach && e.cd <= 0) { e.state = 'windup'; e.windT = e.stateT = e.type === 'tank' ? .7 : e.type === 'chomper' ? .3 : .4; }
          if (e.type === 'slime' || e.type === 'mini') { const h = Math.abs(Math.sin(e.t * 5)); a.inner.position.y = h * .35 * (e.type === 'mini' ? .6 : 1); a.inner.scale.set(1 + (1 - h) * .12, 1 - (1 - h) * .15, 1 + (1 - h) * .12); }
          else if (e.type === 'chomper') { a.inner.position.y = Math.abs(Math.sin(e.t * 12)) * .15; a.jaw.scale.y = 1 + Math.sin(e.t * 16) * .15; }
          else if (e.type === 'tank') { a.inner.rotation.z = Math.sin(e.t * 3) * .06; a.arms.forEach((arm, i) => arm.position.z = .3 + Math.sin(e.t * 3 + i * 3.14) * .3); }
        }
      } else if (e.def.attack === 'ranged') {
        if (e.state === 'windup') {
          e.stateT -= dt; a.snout.scale.set(1 + (1 - e.stateT / .5) * .6, 1, 1 + (1 - e.stateT / .5) * .6);
          if (e.stateT <= 0) { a.snout.scale.set(1, 1, 1); this.center(e, V); V.x += nx * .8; V.z += nz * .8; V2.copy(T.eye).addScaledVector(T.vel, .35).sub(V).normalize().multiplyScalar(e.def.shot); this.shoot(V, V2, e.def.damage, 0xd06bff, .25); G.audio.play('spit'); e.state = 'move'; e.cd = e.def.cd * (.8 + Math.random() * .5); }
        } else {
          if (Math.random() < dt * .3) e.strafe *= -1;
          if (dist > e.def.keep + 2) { mx = nx; mz = nz; } else if (dist < e.def.keep - 3) { mx = -nx; mz = -nz; } else { mx = -nz * e.strafe * .7; mz = nx * e.strafe * .7; }
          if (e.cd <= 0 && dist < 26) { e.state = 'windup'; e.stateT = .5; }
          a.inner.position.y = Math.abs(Math.sin(e.t * 4)) * .12;
        }
      } else if (e.def.attack === 'dive') {
        const gy = getHeight(g.position.x, g.position.z);
        a.wings.forEach((w, i) => w.rotation.z = Math.sin(e.t * (e.state === 'dive' ? 26 : 16)) * .7 * (i ? -1 : 1));
        if (e.state === 'dive') {
          e.stateT += dt; V.copy(e.diveTo).sub(g.position); const l = V.length();
          g.position.addScaledVector(V.normalize(), Math.min(l, 11 * G.diff.enemySpeed * dt));
          if (g.position.distanceTo(T.eye) < 1.3) { this.hurt(T, e.def.damage, g.position); e.state = 'rise'; G.audio.play('chomp'); }
          else if (l < .6 || e.stateT > 2.2) e.state = 'rise';
        } else {
          e.ang += dt * .7 * e.strafe;
          const tx = P.x + Math.cos(e.ang) * 7 - g.position.x, tz = P.z + Math.sin(e.ang) * 7 - g.position.z, tl = Math.hypot(tx, tz) || 1;
          mx = tx / tl * Math.min(1, tl / 2); mz = tz / tl * Math.min(1, tl / 2);
          const ty = gy + e.flyY + Math.sin(e.t * 2) * .4; g.position.y += (ty - g.position.y) * Math.min(1, dt * (e.state === 'rise' ? 1.5 : 3));
          if (e.state === 'rise' && Math.abs(ty - g.position.y) < .5) { e.state = 'move'; e.cd = e.def.cd; }
          if (e.state === 'move' && e.cd <= 0 && dist < 15) { e.state = 'dive'; e.stateT = 0; e.diveTo = T.eye.clone().add(V.set(0, -.2, 0)); G.audio.play('spawn'); }
        }
        if (a.shadow) { a.shadow.position.y = gy - g.position.y + .05; }
      }
      // separation
      for (const o of this.list) { if (o === e || !o.alive || o.type === 'boss' && e.type === 'boss') continue; const ox = g.position.x - o.group.position.x, oz = g.position.z - o.group.position.z, rr = e.radius + o.radius; const d2 = ox * ox + oz * oz; if (d2 < rr * rr && d2 > 1e-4) { const d = Math.sqrt(d2), k = (rr - d) / d * .5; g.position.x += ox * k; g.position.z += oz * k; } }
      if (e.type !== 'boss') { g.position.x += (mx * spd + e.kb.x) * dt; g.position.z += (mz * spd + e.kb.z) * dt; }
      e.kb.multiplyScalar(Math.max(0, 1 - dt * 6));
      if (!e.def.fly) { resolveCollision(G.world, g.position, e.radius * .7); if ((e.type !== 'boss' || e.state !== 'intro') && !e.air) g.position.y = getHeight(g.position.x, g.position.z); }
      else resolveCollision({ colliders: [], boxes: [], R: G.world.R }, g.position, 0);
      const ty = Math.atan2(dx, dz); let d = ty - e.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); e.yaw += d * Math.min(1, dt * 8); g.rotation.y = e.yaw;
      a.mat.emissive.copy(e.flashT > 0 ? V.set(.9, .9, .9) : e.slowT > 0 ? V.set(.2, .5, .1) : e.baseEm);
      tintSkin(e); this.status(e);
    }
    this.list = this.list.filter(e => e.alive || e.group.parent);
    this.updateShots(dt);
  }

  // Particle emitters attached to an enemy while it is slowed (goo drips) or frozen (snowflakes).
  status(e) {
    const vfx = this.G.fx.vfx, st = e.frozenT > 0 ? 'ice' : e.slowT > 0 ? 'goo' : null;
    if (st === e.fxState) return; e.fxState = st;
    const key = 'st' + e.nid; if (!st) return vfx.detach(key);
    const get = o => e.alive && e.fxState === st ? this.center(e, o) : null;
    if (st === 'goo') vfx.attach(key, get, { rate: 10, color: [0x8ff04a, 0x6ee85a], size: .3, speed: .6, dur: .8, grav: 6, up: 0, spread: e.radius * 1.4 });
    else vfx.attach(key, get, { rate: 14, color: [0xffffff, 0xc8f2ff], size: .28, speed: .8, dur: 1, grav: -.5, up: .6, spread: e.radius * 1.6 });
  }

  stuck(e, dt) {
    const G = this.G, g = e.group, a = e.a;
    if (!e.shell) { e.shell = new THREE.Mesh(SHELL_G, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .42, roughness: .05, metalness: .25, depthWrite: false })); g.add(e.shell); }
    e.state = 'move'; if (a.inner.scale.x !== 1) a.inner.scale.set(1, 1, 1);
    e.shell.position.y = e.def.fly ? 0 : e.def.height + a.inner.position.y; e.shell.scale.setScalar(e.radius * 1.5);
    if (e.frozenT > 0) {
      e.frozenT -= dt; e.shell.material.color.set(0xc8f2ff); a.mat.emissive.setRGB(.22, .42, .6);
      if (e.frozenT <= 0) { G.fx.burst(this.center(e, V), 0xdff8ff, 16, 5, .16, 10, .6); G.audio.play('hit'); }
    } else {
      e.trapT -= dt; e.shell.material.color.set(0xe0c4ff); a.mat.emissive.copy(e.baseEm);
      const gy = getHeight(g.position.x, g.position.z) + (e.def.fly ? e.flyY : 0) + 1.8;
      g.position.y += (gy - g.position.y) * Math.min(1, dt * 1.8); a.inner.rotation.z = Math.sin(e.t * 3) * .35; e.t += dt;
      e.hp -= 9 * dt; if (e.hp <= 0) { this.kill(e); return; }
      if (e.trapT <= 0) { a.inner.rotation.z = 0; G.fx.burst(this.center(e, V), 0xe0c4ff, 14, 4, .12, 4, .5); G.fx.ring(V, 0xffffff, 2, .3); G.audio.play('bubble'); }
    }
    if (e.flashT > 0) a.mat.emissive.setRGB(.9, .9, .9);
    tintSkin(e); this.status(e);
    e.shell.visible = e.frozenT > 0 || e.trapT > 0;
  }

  updateBoss(e, dt, dist, nx, nz) {
    const G = this.G, g = e.group, a = e.a, T = this.T;
    const enr = e.hp < e.maxHp * .5;
    if (enr && !e.enraged) { e.enraged = true; G.hud.banner((G.worldDef?.boss?.name || 'THE BOSS') + ' IS ANGRY!', '', 2); G.audio.play('roar'); }
    const spd = e.def.speed * (enr ? 1.3 : 1) * G.diff.enemySpeed * (e.slowT > 0 ? .6 : 1);
    a.crown.rotation.y += dt * .5;
    a.inner.scale.set(1 + Math.sin(e.t * 3) * .03, 1 - Math.sin(e.t * 3) * .03, 1 + Math.sin(e.t * 3) * .03);
    if (dist < e.radius + 1 && e.cd <= 0 && e.state !== 'intro') { this.hurt(T, 15, g.position, true); e.cd = 1; }
    switch (e.state) {
      case 'intro': {
        e.stateT -= dt; const gy = getHeight(g.position.x, g.position.z);
        g.position.y = gy - 7 * Math.max(0, e.stateT / 3.2); G.shake = Math.max(G.shake, .25);
        g.position.z += dt * 2.5;
        if (e.stateT <= 0) { g.position.y = gy; e.state = 'chase'; e.stateT = 2.5; G.audio.play('roar'); }
        break;
      }
      case 'chase':
        e.stateT -= dt; if (dist > 6) { g.position.x += nx * spd * dt; g.position.z += nz * spd * dt; }
        a.inner.position.y = Math.abs(Math.sin(e.t * 2.5)) * .4;
        if (e.stateT <= 0) { const seq = ['barrage', 'slam', 'summon', 'barrage', 'slam']; e.state = seq[e.attackIdx++ % seq.length]; e.stateT = 0; e.n = 0;
          if (e.state === 'summon' && this.list.filter(o => o.alive && o.type === 'mini').length > 5) e.state = 'barrage'; }
        break;
      case 'barrage':
        e.stateT -= dt; a.inner.position.y *= .9;
        if (e.stateT <= 0) {
          if (e.n >= 3) { e.state = 'chase'; e.stateT = enr ? 1.6 : 2.4; break; }
          e.n++; e.stateT = .7; a.mouth.scale.y = .9;
          const cnt = enr ? 9 : 7, base = Math.atan2(nx, nz);
          this.center(e, V); V.y += .2;
          for (let i = 0; i < cnt; i++) { const an = base + (i - (cnt - 1) / 2) * .13; V2.set(Math.sin(an), 0, Math.cos(an)); const dy = (T.eye.y - V.y) / Math.max(4, dist); V2.y = dy + .12; V2.normalize().multiplyScalar(13); this.shoot(V.clone().addScaledVector(V2, .22), V2.clone(), 12, 0xff5fa8, .38, 3); }
          G.audio.play('spit');
        }
        a.mouth.scale.y += (.45 - a.mouth.scale.y) * dt * 5;
        break;
      case 'slam': {
        e.stateT += dt;
        if (e.n === 0) { a.inner.position.y = Math.sin(Math.min(1, e.stateT / .9) * Math.PI / 2) * 6; g.position.x += nx * spd * 2.2 * dt; g.position.z += nz * spd * 2.2 * dt; if (e.stateT > 1.1) { e.n = 1; e.stateT = 0; } }
        else if (e.n === 1) { a.inner.position.y = Math.max(0, 6 - e.stateT * 28); if (a.inner.position.y <= 0) { e.n = 2; e.stateT = 0; e.wave = 0; e.waveHit = false; G.audio.play('slam'); G.shake = .8; G.haptic(60); V.copy(g.position); V.y += .2; G.fx.ring(V, 0xff5fa8, 20, 1.3); G.fx.ring(V, 0xffffff, 12, .8); G.fx.burst(V, 0xc05cff, 30, 10, .3, 14, .9); G.hud.toast('JUMP!'); } }
        else if (e.n === 2) { e.wave += dt * 15.5; const pd = Math.hypot(T.pos.x - g.position.x, T.pos.z - g.position.z);
          if (!e.waveHit && Math.abs(pd - e.wave) < 1.3 && T.grounded) { e.waveHit = true; this.hurt(T, 18, g.position); }
          if (e.wave > 20) { e.state = 'dizzy'; e.stateT = enr ? 2.8 : 3.6; a.stars.visible = true; G.hud.banner('WEAK SPOT!', 'Blast him now!', 1.6); G.audio.play('secret'); } }
        break;
      }
      case 'dizzy':
        e.stateT -= dt; a.stars.rotation.y += dt * 4; a.coreMat.opacity = .45 + Math.sin(e.t * 12) * .25;
        a.inner.rotation.z = Math.sin(e.t * 5) * .12;
        if (e.stateT <= 0) { e.state = 'chase'; e.stateT = 2; a.stars.visible = false; a.coreMat.opacity = 0; a.inner.rotation.z = 0; }
        break;
      case 'summon':
        e.stateT += dt; a.mouth.scale.y = .45 + Math.sin(e.stateT * 10) * .3;
        if (e.stateT > .5 && e.n < 3) { e.n++; e.stateT = .2; const an = Math.random() * 6.28; this.spawn('mini', V.set(g.position.x + Math.cos(an) * 4.5, 0, g.position.z + Math.sin(an) * 4.5)); G.audio.play('spit'); }
        if (e.n >= 3 && e.stateT > .8) { e.state = 'chase'; e.stateT = 2.4; a.mouth.scale.y = .45; }
        break;
    }
  }

  shoot(pos, vel, dmg, color, r = .25, grav = 1.5, ghost = false) {
    const s = this.shots.find(s => s.life <= 0); if (!s) return;
    s.m.position.copy(pos); s.v.copy(vel); s.life = 4; s.dmg = dmg; s.r = r; s.grav = grav; s.m.scale.setScalar(r); s.m.material.color.set(color); s.m.visible = true; s.color = color; s.ghost = !!ghost;
    if (!ghost && this.G.net?.coopHost) this.G.net.send({ t: 'shot', p: [pos.x, pos.y, pos.z].map(v => +v.toFixed(2)), v: [vel.x, vel.y, vel.z].map(v => +v.toFixed(2)), c: color, r, g: grav });
  }
  updateShots(dt) {
    const G = this.G;
    for (const s of this.shots) {
      if (s.life <= 0) continue;
      s.life -= dt; s.v.y -= s.grav * dt; s.m.position.addScaledVector(s.v, dt);
      const p = s.m.position;
      if (Math.random() < .5) G.fx.sparks(p, s.color, 1, 1, .12);
      let hitT = null; if (!s.ghost) for (const T of this.targets()) if (p.distanceTo(T.eye) < .75 + s.r || p.distanceTo(V.copy(T.pos).setY(T.pos.y + .8)) < .7 + s.r) { hitT = T; break; }
      if (hitT) { this.hurt(hitT, s.dmg, V2.copy(p).sub(s.v)); s.life = 0; }
      else if (p.y < getHeight(p.x, p.z)) { G.fx.burst(p, s.color, 8, 3, .14, 10, .5); s.life = 0; }
      if (s.life <= 0) s.m.visible = false;
    }
  }

  damage(e, amt, o = {}) {
    if (!e.alive || e.spawnT > 0) return false;
    const G = this.G;
    if (G.net?.puppet) { e.flashT = .07; G.net.send({ t: 'hit', to: G.net.hostId, n: e.nid, a: +amt.toFixed(1), sl: o.slow || 0, fz: o.freeze ? 1 : 0, tp: o.trap || 0, sp: o.splashHit ? 1 : 0 }); return false; }
    e.lastBy = o.by ?? G.net?.id ?? null;
    if (e.type === 'boss') {
      if (e.state === 'intro') return false;
      if (e.state !== 'dizzy') { amt *= .3; if (Math.random() < .15) { G.audio.play('armor'); } } else { amt *= 1.5; }
    }
    if (e.frozenT > 0) amt *= 1.5;
    const tough = e.type === 'boss' || e.type === 'tank';
    if (o.freeze) { e.slowT = Math.max(e.slowT, 1.2); if (!tough && !(e.frozenT > 0)) { e.chill = (e.chill || 0) + 1; if (e.chill >= 6) { e.chill = 0; e.frozenT = 2.6; e.trapT = 0; G.audio.play('freezeSolid'); G.fx.popup('FROZEN!', this.center(e, V).clone(), 'blue'); } } }
    if (o.trap) { if (tough) e.slowT = 2.5; else if (!(e.trapT > 0) && !(e.frozenT > 0)) { e.trapT = o.trap; G.fx.popup('BUBBLED!', this.center(e, V).clone(), 'purple'); } }
    if (e.hiding && !o.splashHit) { amt *= .1; if (Math.random() < .3) { G.audio.play('armor'); G.fx.popup('BLOCK!', this.center(e, V).clone(), ''); } }
    if (e.type === 'ghost' && e.fade < .55) amt *= .6;
    e.hp -= amt; e.flashT = .07;
    if (o.slow) e.slowT = o.slow;
    if (o.from && e.type !== 'boss' && e.type !== 'tank') { V.copy(e.group.position).sub(o.from).setY(0).normalize().multiplyScalar(o.kb ?? 3); e.kb.add(V); }
    if (e.hp <= 0) { this.kill(e); return true; }
    return false;
  }

  kill(e, silent, by) {
    const G = this.G; e.alive = false; const pup = !!G.net?.puppet;
    if (G.net?.coopHost && !silent) { this.center(e, V); G.net.send({ t: 'kill', n: e.nid, by: e.lastBy || G.net.id, p: [V.x, V.y, V.z].map(v => +v.toFixed(2)) }); }
    this.center(e, V);
    const big = e.type === 'tank' || e.type === 'boss';
    G.fx.burst(V, e.def.color, big ? 50 : 18, big ? 10 : 7, big ? .3 : .17, 12, .9);
    G.fx.burst(V, 0xffffff, big ? 16 : 6, 5, .12, 4, .6);
    G.fx.starBurst(V, big ? 12 : 5, big ? 8 : 5);
    G.fx.ring(V.clone().setY(e.group.position.y + .1), e.def.color, big ? 8 : 3, .45);
    G.fx.sparks(V, 0xffffff, 8, 6, .2);
    const vfx = G.fx.vfx; e.fxState = null; vfx.detach('st' + e.nid); vfx.detach(e);
    vfx.flip(big ? 'boom' : 'pow', V, big ? 9 : 1.5 + e.radius, big ? .9 : .45); vfx.flip('smoke', V.clone().setY(V.y + .3), big ? 8 : 1.2 + e.radius * 1.5, .8);
    if (G.worldDef?.crumbs) vfx.confetti(V, G.worldDef.crumbs, big ? 40 : 14);
    G.scene.remove(e.group);
    if (silent) return;
    if (e.type === 'bomber') this.explode(e, false);
    const mine = pup ? by === G.net.id : (!e.lastBy || e.lastBy === G.net?.id);
    if (pup) { G.audio.play(big ? 'bigpop' : 'pop'); if (mine) G.onKill(e, V.clone()); else if (e.type === 'boss') G.hud.banner('BOSS BEATEN!', 'GREAT TEAMWORK!', 3); return; }
    if (e.def.splitInto) for (let i = 0; i < 3; i++) { const an = i / 3 * Math.PI * 2; const s = this.spawn(e.def.splitInto, V2.set(e.group.position.x + Math.cos(an) * 1.2, 0, e.group.position.z + Math.sin(an) * 1.2), { instant: true }); s.kb.set(Math.cos(an) * 5, 0, Math.sin(an) * 5); }
    G.audio.play(big ? 'bigpop' : 'pop');
    if (e.type === 'slime' && Math.random() < e.def.split) for (const s of [-1, 1]) { const m = this.spawn('mini', V2.set(e.group.position.x + s * .9, 0, e.group.position.z), { instant: true }); m.kb.set(s * 4, 0, 0); }
    if (mine) G.onKill(e, V.clone()); else if (e.type === 'boss') G.onKill(e, V.clone(), true);
  }

  snapshot() {
    return this.list.filter(e => e.alive).slice(0, 40).map(e => [e.nid, e.type, +e.group.position.x.toFixed(2), +e.group.position.y.toFixed(2), +e.group.position.z.toFixed(2), +e.yaw.toFixed(2), Math.round(e.hp / e.maxHp * 100), (e.state === 'dizzy' ? 1 : 0) | (e.frozenT > 0 ? 2 : 0) | (e.trapT > 0 ? 4 : 0) | (e.hiding ? 8 : 0), +(e.a.inner.position.y).toFixed(2)]);
  }
  applySnapshot(list) {
    const seen = new Set();
    for (const row of list) { if (!Array.isArray(row)) continue; const [nid, type, x, y, z, yaw, hp, fl, iy] = row;
      if (typeof type !== 'string' || !ENEMIES[type]) continue; seen.add(nid);
      let e = this.list.find(q => q.nid === nid && q.alive);
      if (!e) { e = this.spawn(type, V.set(x, 0, z), { nid }); e.group.position.y = y; }
      e.net = e.net || new THREE.Vector3(); e.net.set(x, y, z); e.nyaw = yaw; e.hp = hp / 100 * e.maxHp; e.flags = fl; e.niy = iy || 0; e.seenAt = performance.now();
    }
    for (const e of this.list) if (e.alive && !seen.has(e.nid) && performance.now() - (e.seenAt || 0) > 1200) { e.alive = false; this.G.scene.remove(e.group); }
  }
  updatePuppets(dt) {
    for (const e of this.list) {
      if (!e.alive) continue; const g = e.group, a = e.a; e.t += dt; e.flashT -= dt;
      if (e.spawnT > 0) { e.spawnT -= dt; const k = 1 - Math.max(0, e.spawnT) / .6; g.scale.setScalar(Math.max(.01, k) * e.sc); if (e.spawnT <= 0) g.scale.setScalar(e.sc); }
      if (e.net) { g.position.lerp(e.net, Math.min(1, dt * 10)); let d = (e.nyaw || 0) - e.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); e.yaw += d * Math.min(1, dt * 10); g.rotation.y = e.yaw; }
      if (e.type === 'boss') { a.inner.position.y += ((e.niy || 0) - a.inner.position.y) * Math.min(1, dt * 12); a.stars.visible = !!(e.flags & 1); if (a.stars.visible) a.stars.rotation.y += dt * 4; a.crown.rotation.y += dt * .5; }
      else if (e.type === 'slime' || e.type === 'mini' || e.type === 'hopper') a.inner.position.y = Math.abs(Math.sin(e.t * 5)) * .25;
      else if (a.wings) a.wings.forEach((w, i) => w.rotation.z = Math.sin(e.t * 16) * .7 * (i ? -1 : 1));
      if (a.head && e.type === 'shelly') a.head.scale.setScalar(e.flags & 8 ? .01 : 1);
      a.mat.emissive.copy(e.flashT > 0 ? V.set(.9, .9, .9) : e.flags & 2 ? V.set(.22, .42, .6) : e.baseEm);
    }
    this.list = this.list.filter(e => e.alive || e.group.parent);
    this.updateShots(dt);
  }
  explode(e, self) {
    const G = this.G, p = this.center(e, new THREE.Vector3());
    if (self) { e.alive = false; G.scene.remove(e.group); }
    G.fx.burst(p, 0xff8a2a, 24, 9, .22, 8, .6); G.fx.burst(p, 0xffe14a, 12, 6, .18, 4, .5); G.fx.ring(p, 0xff4a5a, 4.5, .4); G.audio.play('explode'); G.shake = Math.max(G.shake, .3);
    if (!G.net?.puppet) for (const T of this.targets()) if (T.pos.distanceTo(p) < 3.4) this.hurt(T, e.def.damage, p);
    if (!self && !G.net?.puppet) for (const o of this.list) if (o.alive && o !== e && o.group.position.distanceTo(p) < 3.6) this.damage(o, 80, { from: p, kb: 8, splashHit: true });
  }

  clear() { for (const e of this.list) G_remove(e); this.list = []; for (const s of this.shots) { s.life = 0; s.m.visible = false; } }
}
function G_remove(e) { if (e.group.parent) e.group.parent.remove(e.group); }
