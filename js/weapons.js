import * as THREE from 'three';
import { WEAPONS, WEAPON_ORDER } from './config.js';
import { makeBlaster } from './models.js';
import { getHeight } from './world.js';
import { limb } from './player.js';
import { segHitRemote } from './mp.js';

const V = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), V4 = new THREE.Vector3();
const RAINBOW = [0xff4fd8, 0xffe14a, 0x49e3ff, 0x8ff04a, 0xff8a2a];

export class Weapons {
  constructor(G) {
    this.G = G; this.owned = {}; this.cur = 'blaster'; this.cd = 0; this.reloadT = 0; this.switchT = 0; this.kick = 0; this.megaT = 0; this.prev = 'blaster';
    this.holder = new THREE.Group(); this.holder.scale.setScalar(.55); G.camera.add(this.holder);
    // first-person arms: sleeves + gloves holding the blaster
    const B = G.body;
    this.holder.add(limb(new THREE.Vector3(.1, -.62, .95), new THREE.Vector3(.02, -.24, .26), .085, B.shirtMat));
    this.holder.add(limb(new THREE.Vector3(.02, -.24, .26), new THREE.Vector3(0, -.2, .2), .07, B.skinMat, .075));
    this.holder.add(limb(new THREE.Vector3(-.55, -.62, .7), new THREE.Vector3(-.06, -.13, -.16), .08, B.shirtMat));
    this.holder.add(limb(new THREE.Vector3(-.06, -.13, -.16), new THREE.Vector3(-.02, -.1, -.2), .065, B.skinMat, .07));
    this.vms = {}; this.tps = {};
    for (const id of WEAPON_ORDER) {
      const b = makeBlaster(id); b.group.visible = false; this.holder.add(b.group); this.vms[id] = b;
      const t = makeBlaster(id); t.group.visible = false; t.group.scale.setScalar(.8); t.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.layers.set(1); } }); B.gunMount.add(t.group); this.tps[id] = t;
    }
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false, blending: THREE.AdditiveBlending })); this.flash.renderOrder = 11;
    this.proj = [];
    const geo = new THREE.SphereGeometry(1, 12, 8);
    for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); m.visible = false; G.scene.add(m); this.proj.push({ m, v: new THREE.Vector3(), prev: new THREE.Vector3(), life: 0 }); }
  }
  reset(unlocked) {
    this.owned = { blaster: { clip: Infinity, reserve: Infinity } };
    for (const id of unlocked) if (id !== 'blaster' && id !== 'mega' && WEAPONS[id]) { const d = WEAPONS[id]; this.owned[id] = { clip: d.clip, reserve: Math.max(0, Math.round(d.start * .5) - d.clip) }; }
    this.cur = 'none'; this.equip('blaster', true); this.megaT = 0; this.reloadT = 0; this.cd = 0;
    this.proj.forEach(p => { p.life = 0; p.m.visible = false; });
  }
  list() { return WEAPON_ORDER.filter(id => this.owned[id]); }
  locked() { return WEAPON_ORDER.filter(id => id !== 'blaster' && id !== 'mega' && !this.owned[id]); }
  equip(id, silent) {
    if (id === this.cur || !this.owned[id]) return;
    if (this.vms[this.cur]) { this.vms[this.cur].group.visible = false; this.tps[this.cur].group.visible = false; }
    this.cur = id; this.vms[id].group.visible = true; this.tps[id].group.visible = true; this.vms[id].muzzle.add(this.flash);
    this.switchT = silent ? 0 : .28; this.reloadT = 0;
    if (!silent) this.G.audio.play('click');
    this.G.hud.weaponChanged(!silent);
  }
  cycle(dir) { const l = this.list(); if (l.length < 2) return; const i = l.indexOf(this.cur); this.equip(l[(i + dir + l.length) % l.length]); }
  give(id) {
    const G = this.G, d = WEAPONS[id];
    if (id === 'mega') { if (this.cur !== 'mega') this.prev = this.cur; this.owned.mega = { clip: Infinity, reserve: Infinity }; this.megaT = d.duration; this.equip('mega'); G.hud.banner('MEGA BLASTER!', '20 seconds of power', 2); G.audio.play('weapon'); G.haptic([30, 40, 30]); G.unlockWeapon(id); return; }
    if (this.owned[id]) { this.owned[id].reserve += d.clip * 2; G.hud.toast(d.name + ' AMMO'); G.audio.play('ammo'); }
    else { this.owned[id] = { clip: d.clip, reserve: d.start - d.clip }; G.hud.banner('NEW WEAPON!', d.name, 2.2); G.audio.play('weapon'); G.haptic([30, 40, 30]); G.unlockWeapon(id); }
    this.equip(id);
  }
  addAmmo(mult = 1) {
    let any = false;
    for (const id of this.list()) { const d = WEAPONS[id]; if (d.clip === Infinity) continue; this.owned[id].reserve += Math.ceil(d.clip * 1.5 * mult); any = true; }
    return any;
  }
  reload() {
    const d = WEAPONS[this.cur], w = this.owned[this.cur];
    if (!w || d.clip === Infinity || w.reserve <= 0 || w.clip >= d.clip || this.reloadT > 0) return;
    this.reloadT = this.reloadMax = 1.1; this.G.audio.play('reload');
  }

  update(dt, wantFire, target) {
    const G = this.G;
    this.cd -= dt; this.switchT = Math.max(0, this.switchT - dt);
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) { const d = WEAPONS[this.cur], w = this.owned[this.cur]; const n = Math.min(d.clip - w.clip, w.reserve); w.clip += n; w.reserve -= n; G.hud.weaponChanged(); } }
    if (this.megaT > 0) { this.megaT -= dt; if (this.megaT <= 0) { delete this.owned.mega; const p = this.owned[this.prev] ? this.prev : 'blaster'; this.vms.mega.group.visible = false; this.tps.mega.group.visible = false; this.cur = 'x'; this.equip(p); G.hud.toast('MEGA BLASTER DONE'); } }
    if (wantFire && this.cd <= 0 && this.reloadT <= 0 && this.switchT <= 0) this.fire(target);
    this.holder.visible = !G.view3;
    const vm = this.vms[this.cur]; if (vm) {
      this.kick = Math.max(0, this.kick - dt * 7);
      const b = G.player.bob, rl = this.reloadT > 0 ? Math.sin((1 - this.reloadT / this.reloadMax) * Math.PI) : 0;
      this.holder.position.set(.3 + Math.cos(b) * .01, -.3 + Math.abs(Math.sin(b)) * .013 - this.switchT * .9 - rl * .08, -.8 + this.kick * .05);
      this.holder.rotation.set(.04 + this.kick * .12 - rl * .7 + (G.swayY || 0), .14 + (G.swayX || 0), rl * .3 + (G.swayX || 0) * .6);
      this.flash.visible = this.kick > .6 && !G.view3; this.flash.scale.setScalar(.6 + Math.random() * .8);
      if (this.cur === 'mega') { const c = RAINBOW[Math.floor(G.time * 8) % 5]; vm.group.children[1].material.color.setHex(c); }
    }
    this.updateProj(dt);
  }

  aimPoint(target, out) {
    const G = this.G, d = WEAPONS[this.cur];
    if (target) return G.enemies.center(target, out);
    G.camera.getWorldDirection(V3); return out.copy(G.aimOrigin).addScaledVector(V3, d.range);
  }
  muzzle(out) { return (this.G.view3 ? this.tps[this.cur] : this.vms[this.cur]).muzzle.getWorldPosition(out); }

  fire(target) {
    const G = this.G, d = WEAPONS[this.cur], w = this.owned[this.cur];
    if (w.clip <= 0) {
      if (w.reserve > 0) this.reload();
      else { G.audio.play('empty'); this.cd = .3; G.hud.toast('OUT OF AMMO'); this.equip('blaster'); }
      return;
    }
    this.cd = 1 / d.rate; if (d.clip !== Infinity) { w.clip--; G.hud.weaponChanged(); }
    this.kick = 1; G.audio.play(d.sfx); G.haptic(6); G.body.kick = 1;
    const muzzle = this.muzzle(V);
    G.fx.vfx.flip('flash', muzzle, d.kind === 'boom' || d.kind === 'mega' ? .9 : .55, .09, d.color);
    const aim = this.aimPoint(target, V2);
    const mul = G.effects.damage > 0 ? 2 : 1;
    if (d.kind === 'beam') {
      let hit = target;
      if (!hit) { G.camera.getWorldDirection(V3); hit = this.raycast(G.aimOrigin, V3, d.range); }
      if (!hit && G.net?.mode === 'tag') { const R = segHitRemote(G.net, G.aimOrigin, V4.copy(G.aimOrigin).addScaledVector(V3, d.range), .2); if (R) { G.mpSplat(R); G.fx.beam([muzzle.clone(), R.pos.clone().setY(R.pos.y + 1)], d.color); return; } }
      const end = hit ? G.enemies.center(hit, new THREE.Vector3()) : aim.clone();
      G.fx.beam([muzzle.clone(), end], d.color); G.fx.sparks(end, d.color, 5, 5, .15); G.fx.vfx.beam(muzzle, end, d.color, d.freeze ? .45 : .3);
      if (hit) G.fx.vfx.flip(d.freeze ? 'smoke' : 'pow', end, d.freeze ? 1 : 1.1, .35, d.freeze ? 0xc8f2ff : undefined);
      if (d.freeze) { G.fx.beam([muzzle.clone(), end], 0xffffff); if (Math.random() < .5) G.fx.burst(end, 0xdff8ff, 3, 3, .1, 4, .4); }
      if (hit) {
        const done = new Set([hit]); let fromP = end.clone();
        G.enemies.damage(hit, d.damage * mul, { from: G.player.pos, kb: d.freeze ? .5 : 2, freeze: d.freeze }); G.hud.hitMark();
        for (let i = 0; i < (d.chain || 0); i++) {
          let best = null, bd = d.chainRange;
          for (const e of G.enemies.list) { if (!e.alive || done.has(e)) continue; const dd = G.enemies.center(e, V3).distanceTo(fromP); if (dd < bd) { bd = dd; best = e; } }
          if (!best) break;
          const p = G.enemies.center(best, new THREE.Vector3()); G.fx.beam([fromP, p], 0xffffff); G.fx.vfx.beam(fromP, p, d.color, .25); G.fx.sparks(p, d.color, 4, 4, .12);
          G.enemies.damage(best, d.damage * .7 * mul, { from: fromP, kb: 2 }); done.add(best); fromP = p;
        }
      }
      return;
    }
    const n = d.pellets || 1;
    V4.copy(aim).sub(muzzle).normalize();
    for (let i = 0; i < n; i++) {
      const p = this.proj.find(p => p.life <= 0); if (!p) return;
      p.m.position.copy(muzzle); p.prev.copy(muzzle);
      p.v.copy(V4);
      if (n > 1) { p.v.x += (Math.random() - .5) * d.spread * 2; p.v.y += (Math.random() - .5) * d.spread * 1.4; p.v.z += (Math.random() - .5) * d.spread * 2; p.v.normalize(); }
      p.v.multiplyScalar(d.speed * (n > 1 ? .9 + Math.random() * .2 : 1));
      if (d.gravity) { const dist = aim.distanceTo(muzzle), tt = dist / d.speed; p.v.y += .5 * d.gravity * tt; }
      p.life = d.range / d.speed + (d.kind === 'bounce' ? 1.2 : .4); p.d = d; p.mul = mul; p.target = n > 1 ? null : target; p.bounces = d.bounces || 0;
      const col = d.kind === 'bubble' ? [0xd4b0ff, 0xa8f0ff, 0xffc8f0][i % 3] : d.color;
      p.m.material.color.set(col); p.m.material.opacity = d.kind === 'bubble' ? .55 : 1;
      p.m.scale.set(d.size, d.size, d.kind === 'bolt' || d.kind === 'mega' ? d.size * 5 : d.size);
      p.m.visible = true;
      if (d.kind !== 'bubble') G.fx.vfx.trail(p, col, Math.max(.08, (d.size || .1) * (d.kind === 'mega' ? 1.6 : 1.1)));
    }
  }

  raycast(o, dir, range) {
    let best = null, bt = range;
    for (const e of this.G.enemies.list) {
      if (!e.alive) continue; const c = this.G.enemies.center(e, V3);
      const lx = c.x - o.x, ly = c.y - o.y, lz = c.z - o.z; const t = lx * dir.x + ly * dir.y + lz * dir.z; if (t < 0 || t > bt) continue;
      const d2 = lx * lx + ly * ly + lz * lz - t * t; const r = e.radius * 1.15; if (d2 < r * r) { bt = t; best = e; }
    }
    return best;
  }

  updateProj(dt) {
    const G = this.G;
    for (const p of this.proj) {
      if (p.life <= 0) continue;
      p.life -= dt; p.prev.copy(p.m.position);
      const d = p.d;
      if (d.gravity) p.v.y -= d.gravity * dt;
      if (d.kind === 'bubble') { p.v.multiplyScalar(1 - dt * .6); p.v.y += dt * 1.2; p.m.scale.setScalar(d.size * (1 + Math.sin(G.time * 20 + p.life * 9) * .08)); }
      if (p.target && p.target.alive && !d.gravity) { const sp = p.v.length(); G.enemies.center(p.target, V3).sub(p.m.position).normalize().multiplyScalar(sp); p.v.lerp(V3, Math.min(1, dt * 6)); }
      p.m.position.addScaledVector(p.v, dt);
      if (d.kind === 'bolt' || d.kind === 'mega') p.m.lookAt(V3.copy(p.m.position).add(p.v));
      if (d.kind === 'mega') p.m.material.color.setHex(RAINBOW[Math.floor(G.time * 12) % 5]);
      if (d.kind !== 'bolt' && d.kind !== 'bubble' && Math.random() < .6) G.fx.sparks(p.m.position, d.color, 1, 1, d.size * .6);
      let hit = null; const a = p.prev, b = p.m.position; V.copy(b).sub(a); const len = V.length() || 1e-4; V.divideScalar(len);
      for (const e of G.enemies.list) {
        if (!e.alive || e.spawnT > 0) continue; const c = G.enemies.center(e, V2);
        const t = Math.max(0, Math.min(len, (c.x - a.x) * V.x + (c.y - a.y) * V.y + (c.z - a.z) * V.z));
        const dx = a.x + V.x * t - c.x, dy = a.y + V.y * t - c.y, dz = a.z + V.z * t - c.z; const r = e.radius + (d.size || .1);
        if (dx * dx + dy * dy + dz * dz < r * r) { hit = e; break; }
      }
      if (!hit && G.net?.mode === 'tag') { const R = segHitRemote(G.net, a, b, d.size || .1); if (R) { G.mpSplat(R); G.fx.burst(b, d.color, 12, 5, .16, 10, .6); p.life = 0; p.m.visible = false; continue; } }
      const gy = getHeight(b.x, b.z);
      let blocked = b.y < gy;
      if (blocked && !hit && p.bounces > 0) { p.bounces--; b.y = gy + .02; p.v.y = Math.abs(p.v.y) * .72 + 2; p.v.x *= .85; p.v.z *= .85; blocked = false; G.audio.play('boing'); G.fx.ring(V3.set(b.x, gy + .05, b.z), d.color, 1.4, .25); }
      if (!hit && !blocked && b.y < 4) for (const c of G.world.colliders) { if (Math.abs(c.x - b.x) < c.r && Math.abs(c.z - b.z) < c.r && Math.hypot(c.x - b.x, c.z - b.z) < c.r) { blocked = true; break; } }
      if (hit || blocked || p.life <= 0) { this.impact(p, hit); p.life = 0; p.m.visible = false; }
    }
  }

  impact(p, hit) {
    const G = this.G, d = p.d, pos = p.m.position;
    if (d.kind === 'bubble') {
      G.fx.burst(pos, 0xd4b0ff, 8, 3, .1, 2, .4); G.fx.ring(pos, 0xa8f0ff, 1.2, .25);
      if (hit) { G.enemies.damage(hit, d.damage * p.mul, { trap: d.trap }); G.audio.play('bubble'); G.hud.hitMark(); }
      return;
    }
    if (d.splash) {
      const R = d.splash;
      for (const e of G.enemies.list) { if (!e.alive) continue; const dist = G.enemies.center(e, V2).distanceTo(pos) - e.radius; if (dist < R) { const k = e === hit ? 1 : Math.max(.35, 1 - dist / R); G.enemies.damage(e, d.damage * k * p.mul, { slow: d.slow, from: pos, kb: d.kind === 'boom' ? 9 : 3, splashHit: d.kind === 'boom' }); } }
      if (d.kind === 'boom') { G.fx.vfx.flip('boom', pos, R * 1.7, .6); G.fx.vfx.flip('smoke', pos.clone().setY(pos.y + .6), R * 1.5, .9); G.fx.burst(pos, 0xff8a2a, 26, 9, .25, 8, .7); G.fx.burst(pos, 0xffe14a, 14, 6, .2, 4, .6); G.fx.sparks(pos, 0xffe14a, 10, 8, .5); G.fx.ring(pos, 0xff8a2a, R * 1.3, .45); G.audio.play('explode'); G.shake = Math.max(G.shake, .35); G.haptic(20); }
      else if (d.kind === 'goo') { G.fx.vfx.flip('splat', pos, R * 1.1, .5); G.fx.burst(pos, 0x8ff04a, 16, 5, .18, 12, .7); G.fx.ring(pos, 0x8ff04a, R * 1.2, .35); G.audio.play('hit'); }
      else if (d.kind === 'bounce') { G.fx.vfx.flip('pow', pos, 1.4, .4); G.fx.burst(pos, d.color, 16, 6, .16, 8, .5); G.fx.ring(pos, d.color, R * 1.4, .3); G.fx.starBurst(pos, 3, 4); G.audio.play('pop'); }
      else { G.fx.burst(pos, RAINBOW[Math.floor(Math.random() * 5)], 14, 7, .16, 6, .5); G.fx.ring(pos, 0xff4fd8, R * 1.3, .3); G.fx.starBurst(pos, 2, 4); }
      if (hit) G.hud.hitMark();
    } else if (hit) { if (!d.pellets || Math.random() < .35) G.fx.vfx.flip('pow', pos, d.pellets ? .8 : 1.1, .35); G.enemies.damage(hit, d.damage * p.mul, { from: G.player.pos, kb: d.pellets ? 1.2 : 2.5 }); G.fx.sparks(pos, d.color, d.pellets ? 3 : 6, 5, .15); if (!d.pellets || Math.random() < .3) G.audio.play('hit'); G.hud.hitMark(); }
    else G.fx.sparks(pos, d.color, 4, 3, .1);
  }
}
