import * as THREE from 'three';
import { getHeight } from './world.js';

// Per-world warp style: how the player is carried to the next world.
export const WARP_STYLES = {
  woods: ['light', 0x8ff04a], water: ['bubbles', 0x45d7ff], volcano: ['fire', 0xff6a1a], alien: ['tractor', 0x2cf0a0], space: ['lightning', 0x9ab8ff],
  saturn: ['light', 0xffd070], mars: ['lightning', 0xff6a3a], venus: ['fire', 0xffb020], mercury: ['light', 0xfff0c0], uranus: ['bubbles', 0x9af0f0],
  neptune: ['lightning', 0x6a9aff], pluto: ['light', 0xffb8d8], sun: ['fire', 0xffe060],
};
const V = new THREE.Vector3(), V2 = new THREE.Vector3();
const add = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

export class Warp {
  constructor(G) { this.G = G; this.group = null; this.isOpen = false; this.t = 0; this.going = 0; }

  build(worldId, pos) {
    const G = this.G; if (this.group) G.scene.remove(this.group);
    const [style, color] = WARP_STYLES[worldId] || ['light', 0xffffff];
    this.style = style; this.color = color; this.isOpen = false; this.going = 0; this.t = 0;
    this.pos = pos.clone(); this.pos.y = getHeight(pos.x, pos.z);
    const g = this.group = new THREE.Group(); g.position.copy(this.pos); G.scene.add(g);
    // base pad (always visible so kids learn where it is)
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.3, .3, 40), new THREE.MeshStandardMaterial({ color: 0x3a2a5c, metalness: .5, roughness: .3 })); pad.position.y = .12; pad.receiveShadow = true; g.add(pad);
    this.padRing = new THREE.Mesh(new THREE.TorusGeometry(2.7, .12, 8, 48), new THREE.MeshBasicMaterial({ color: 0x5a4a7a })); this.padRing.rotation.x = Math.PI / 2; this.padRing.position.y = .3; g.add(this.padRing);
    this.fx = new THREE.Group(); this.fx.visible = false; g.add(this.fx);
    this.col = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 60, 32, 1, true), add(color, .22)); this.col.position.y = 30; this.fx.add(this.col);
    this.core = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 60, 20, 1, true), add(0xffffff, .35)); this.core.position.y = 30; this.fx.add(this.core);
    this.rings = [];
    for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.6, .08, 6, 40), add(color, .8)); r.rotation.x = Math.PI / 2; r.userData.o = i / 5; this.fx.add(r); this.rings.push(r); }
    if (style === 'tractor') {
      const ufo = this.ufo = new THREE.Group(); ufo.position.y = 16; this.fx.add(ufo);
      ufo.add(new THREE.Mesh(new THREE.SphereGeometry(4.5, 32, 12).scale(1, .22, 1), new THREE.MeshStandardMaterial({ color: 0xc8ccd8, metalness: .7, roughness: .25 })));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8ff0ff, transparent: true, opacity: .55, roughness: .05 })); dome.position.y = .6; ufo.add(dome);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const l = new THREE.Mesh(new THREE.SphereGeometry(.25, 8, 6), new THREE.MeshBasicMaterial({ color: [0xffe14a, 0x2cf0a0][i % 2] })); l.position.set(Math.cos(a) * 3.8, 0, Math.sin(a) * 3.8); ufo.add(l); }
      this.col.geometry.dispose(); this.col.geometry = new THREE.CylinderGeometry(3.4, 2.4, 16, 32, 1, true); this.col.position.y = 8;
      this.core.geometry.dispose(); this.core.geometry = new THREE.CylinderGeometry(1.4, .9, 16, 20, 1, true); this.core.position.y = 8;
    }
    this.boltT = 0;
  }

  open() {
    if (!this.group || this.isOpen) return;
    this.isOpen = true; this.fx.visible = true; this.padRing.material.color.set(this.color);
    const G = this.G; G.audio.play('warpOpen'); G.fx.ring(V.copy(this.pos).setY(this.pos.y + .3), this.color, 8, .8);
  }

  update(dt) {
    if (!this.group) return;
    const G = this.G; this.t += dt; const t = this.t;
    this.padRing.scale.setScalar(1 + (this.isOpen ? Math.sin(t * 5) * .05 : 0));
    if (!this.isOpen) return;
    const P = V.copy(this.pos);
    this.col.material.opacity = .18 + Math.sin(t * 6) * .06 + this.going * .3; this.core.material.opacity = .3 + Math.sin(t * 9) * .1 + this.going * .5;
    this.col.rotation.y += dt * .8;
    const H = this.style === 'tractor' ? 15 : 22, sp = this.going ? 2.2 : 1;
    this.rings.forEach(r => { const k = (r.userData.o + t * .35 * sp) % 1; r.position.y = k * H; const s = 1 - k * (this.style === 'tractor' ? -.4 : .3); r.scale.setScalar(s); r.material.opacity = (1 - k) * .9; });
    if (this.ufo) { this.ufo.rotation.y += dt * 1.5; this.ufo.position.y = 16 + Math.sin(t * 1.5) * .4; }
    const rate = this.going ? 3 : 1;
    if (this.style === 'lightning') {
      this.boltT -= dt * rate; if (this.boltT <= 0) { this.boltT = .12 + Math.random() * .25; const a = Math.random() * 6.28, r = Math.random() * 2.2;
        let prev = V2.set(P.x + Math.cos(a) * r, P.y + 30, P.z + Math.sin(a) * r).clone();
        for (let i = 0; i < 4; i++) { const nx = prev.clone(); nx.y -= 7.6; nx.x += (Math.random() - .5) * 2; nx.z += (Math.random() - .5) * 2; if (i === 3) nx.set(P.x + Math.cos(a) * 1.5, P.y + .4, P.z + Math.sin(a) * 1.5); G.fx.beam([prev, nx], i % 2 ? 0xffffff : this.color); prev = nx; }
        G.fx.sparks(prev, this.color, 6, 6, .2); if (Math.random() < .5) G.audio.play('zap'); }
    } else if (this.style === 'fire') {
      if (Math.random() < dt * 30 * rate) { V2.set(P.x + (Math.random() - .5) * 4, P.y + .5, P.z + (Math.random() - .5) * 4); G.fx.glow.emit(V2, [this.color, 0xffe14a, 0xffffff][Math.floor(Math.random() * 3)], 2, .35, 1.4, -6, 6); }
    } else if (this.style === 'bubbles') {
      if (Math.random() < dt * 18 * rate) { V2.set(P.x + (Math.random() - .5) * 4, P.y + .3, P.z + (Math.random() - .5) * 4); G.fx.glow.emit(V2, [this.color, 0xffffff][Math.floor(Math.random() * 2)], .6, .25 + Math.random() * .2, 2.2, -3, 3); }
    } else {
      if (Math.random() < dt * 14 * rate) { V2.set(P.x + (Math.random() - .5) * 3.6, P.y + Math.random() * 3, P.z + (Math.random() - .5) * 3.6); G.fx.stars.emit(V2, [this.color, 0xffffff][Math.floor(Math.random() * 2)], .6, .35, 1.6, -4, 4); }
    }
  }

  inside(p) { return this.isOpen && Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 2.6; }
}
