import * as THREE from 'three';
import { FOOD, WEAPONS } from './config.js';
import { makeItem, ITEM_COLORS, MISSION_ITEMS } from './models.js';
import { getHeight, resolveCollision } from './world.js';

const V = new THREE.Vector3();
const AUTO = new Set(['apple', 'pizza', 'chicken', 'green', 'blue', 'purple', 'energy', 'star', 'heart', 'bomb', 'ammo', 'battery', 'pearl', 'gem', 'fuel', 'orb', 'weapon']);
const pick = table => { const tot = table.reduce((s, [, w]) => s + w, 0); let r = Math.random() * tot; for (const [k, w] of table) { if ((r -= w) <= 0) return k; } return table[0][0]; };

export class Items {
  constructor(G) { this.G = G; this.list = []; }

  spawn(type, pos, o = {}) {
    const g = makeItem(type, o.weapon);
    const it = { type, g, weapon: o.weapon, t: Math.random() * 6, life: o.permanent ? Infinity : 24, pos: new THREE.Vector3(pos.x, 0, pos.z), vy: 0, vx: 0, vz: 0, air: false, secret: o.secret };
    it.pos.y = getHeight(pos.x, pos.z);
    if (o.pop) { it.air = true; it.pos.y = pos.y ?? it.pos.y + 1; it.vy = 5 + Math.random() * 2; const a = Math.random() * 6.28; it.vx = Math.cos(a) * 2.2; it.vz = Math.sin(a) * 2.2; }
    g.position.copy(it.pos); this.G.scene.add(g); this.list.push(it);
    return it;
  }

  update(dt) {
    const G = this.G, P = G.player.pos;
    for (const it of this.list) {
      if (it.dead) continue;
      it.t += dt; it.life -= dt;
      if (it.life <= 0) { this.remove(it); continue; }
      if (it.air) {
        it.vy -= 16 * dt; it.pos.x += it.vx * dt; it.pos.z += it.vz * dt; it.pos.y += it.vy * dt;
        resolveCollision(G.world, it.pos, .3); const gy = getHeight(it.pos.x, it.pos.z);
        if (it.pos.y <= gy && it.vy < 0) { it.pos.y = gy; it.air = false; }
      }
      const s = it.g.userData.spin;
      s.position.y = (it.air ? 0 : .75) + Math.sin(it.t * 2.6) * .14; s.rotation.y += dt * 1.8;
      it.g.userData.ring.scale.setScalar(1 + Math.sin(it.t * 4) * .12);
      if (it.g.userData.spark) it.g.userData.spark.scale.setScalar(.05 + Math.random() * .06);
      it.g.visible = it.life > 5 || Math.floor(it.t * 8) % 2 === 0;
      const dx = P.x - it.pos.x, dz = P.z - it.pos.z, d = Math.hypot(dx, dz);
      if (AUTO.has(it.type) && !it.air && Math.abs(P.y - it.pos.y) < 2.2) {
        if (d < 3.2 && d > .01) { const k = Math.min(1, dt * 6 * (1 - d / 3.2) + dt * 2); it.pos.x += dx * k; it.pos.z += dz * k; it.pos.y = getHeight(it.pos.x, it.pos.z); }
        if (d < 1.2) { this.collect(it); continue; }
      }
      it.g.position.copy(it.pos);
    }
    this.list = this.list.filter(i => !i.dead);
  }

  remove(it) { it.dead = true; this.G.scene.remove(it.g); }

  collect(it) {
    const G = this.G; this.remove(it);
    V.copy(it.pos); V.y += 1;
    G.fx.sparks(V, ITEM_COLORS[it.type] ?? 0xffffff, 10, 5, .16); G.fx.ring(V.clone().setY(it.pos.y + .1), ITEM_COLORS[it.type] ?? 0xffffff, 2, .35);
    this.apply(it.type, V, it);
  }

  apply(type, pos, it = {}) {
    const G = this.G;
    if (FOOD[type]) { const n = FOOD[type]; G.heal(n); G.fx.popup('+' + n, pos, 'heal'); G.audio.play('heal'); G.addScore(10, null); return; }
    switch (type) {
      case 'green': G.heal(100); G.fx.popup('FULL HEALTH!', pos, 'heal'); G.audio.play('potion'); break;
      case 'blue': G.addEffect('shield'); G.fx.popup('SHIELD!', pos, 'blue'); G.audio.play('potion'); break;
      case 'purple': G.addEffect('damage'); G.fx.popup('2X DAMAGE!', pos, 'purple'); G.audio.play('potion'); break;
      case 'energy': G.addEffect('speed'); G.fx.popup('SPEED!', pos, 'orange'); G.audio.play('potion'); break;
      case 'star': G.addEffect('points'); G.fx.popup('2X POINTS!', pos, 'gold'); G.audio.play('pickup'); break;
      case 'heart': G.addLife(); G.fx.popup('+1 LIFE!', pos, 'pink'); G.audio.play('highscore'); G.haptic([20, 30, 20]); break;
      case 'bomb': G.bomb(pos); break;
      case 'ammo': G.weapons.addAmmo() ? G.fx.popup('AMMO!', pos, 'blue') : G.fx.popup('+50', pos); if (!G.weapons.list().some(id => WEAPONS[id].clip !== Infinity)) G.addScore(50, null); G.audio.play('ammo'); break;
      case 'battery': case 'pearl': case 'gem': case 'fuel': case 'orb': G.collectBattery(pos); break;
      case 'weapon': G.weapons.give(it.weapon); break;
      case 'points': G.addScore(750, pos); G.audio.play('pickup'); break;
    }
  }

  drop(e, pos) {
    const G = this.G, wave = G.waves.index;
    let chance = (e.type === 'tank' ? 1 : .3) * G.diff.drops * (1.25 - wave * .07);
    if (G.health < 40) chance *= 1.4;
    if (e.type === 'mini') chance *= .3;
    if (Math.random() > chance) return;
    const low = G.health < 50;
    const type = pick([['apple', 28], ['pizza', low ? 22 : 14], ['chicken', low ? 12 : 6], ['ammo', 20], ['green', 2], ['blue', 5], ['purple', 5], ['energy', 4], ['star', 5], ['bomb', 2], ['heart', .8], ['mystery', 2.5]]);
    this.spawn(type, pos, { pop: true });
  }

  nearestBox(p, r = 2.6) {
    let best = null, bd = r;
    for (const it of this.list) { if (it.dead || it.type !== 'mystery' || it.air) continue; const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z); if (d < bd) { bd = d; best = it; } }
    return best;
  }

  openBox(it) {
    const G = this.G; this.remove(it);
    V.copy(it.pos); V.y += 1;
    G.fx.burst(V, 0xff5fa8, 20, 7, .18, 10, .8); G.fx.burst(V, 0xffd43b, 16, 7, .16, 10, .8); G.fx.starBurst(V, 8, 6); G.audio.play('box'); G.haptic(25);
    const locked = G.weapons.locked();
    const r = pick([['weapon', locked.length ? 22 : 10], ['ammo', 16], ['food', 14], ['potion', 16], ['points', 12], ['heart', 6], ['mega', 7], ['slimes', 7]]);
    const P = V.clone();
    if (r === 'weapon') { const all = ['scatter', 'goo', 'freeze', 'bubble', 'bouncer', 'boomer', 'lightning']; const id = locked.length ? locked[Math.floor(Math.random() * locked.length)] : all[Math.floor(Math.random() * all.length)]; this.spawn('weapon', P, { pop: true, weapon: id }); G.hud.toast('A WEAPON!'); }
    else if (r === 'mega') { this.spawn('weapon', P, { pop: true, weapon: 'mega' }); G.hud.toast('WHOA! MEGA BLASTER!'); }
    else if (r === 'ammo') { this.spawn('ammo', P, { pop: true }); this.spawn('ammo', P, { pop: true }); G.hud.toast('AMMO!'); }
    else if (r === 'food') { ['chicken', 'pizza', 'apple'].forEach(t => this.spawn(t, P, { pop: true })); G.hud.toast('SNACK TIME!'); }
    else if (r === 'potion') { this.spawn(['green', 'blue', 'purple', 'energy'][Math.floor(Math.random() * 4)], P, { pop: true }); G.hud.toast('A POTION!'); }
    else if (r === 'points') { G.addScore(750, P); G.hud.toast('BONUS POINTS!'); }
    else if (r === 'heart') { this.spawn('heart', P, { pop: true }); G.hud.toast('EXTRA LIFE!'); }
    else { G.hud.toast('SURPRISE! SLIMES!'); for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; G.enemies.spawn('mini', V.set(it.pos.x + Math.cos(a) * 3, 0, it.pos.z + Math.sin(a) * 3)); } this.spawn('apple', P, { pop: true }); }
  }

  clear() { this.list.forEach(i => this.G.scene.remove(i.g)); this.list = []; }
}
