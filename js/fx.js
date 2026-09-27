import * as THREE from 'three';
import { STAR_G } from './models.js';

class Particles {
  constructor(scene, geo, n, additive = false) {
    this.n = n; this.i = 0;
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: additive, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !additive }), n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.size = new Float32Array(n); this.grav = new Float32Array(n); this.rot = new Float32Array(n);
    this.d = new THREE.Object3D(); const c = new THREE.Color(1, 1, 1);
    for (let k = 0; k < n; k++) { this.d.scale.setScalar(0); this.d.updateMatrix(); this.mesh.setMatrixAt(k, this.d.matrix); this.mesh.setColorAt(k, c); }
    scene.add(this.mesh); this.c = new THREE.Color();
  }
  emit(pos, color, speed, size, life, grav, up = 0) {
    const k = this.i; this.i = (this.i + 1) % this.n;
    this.p[k * 3] = pos.x; this.p[k * 3 + 1] = pos.y; this.p[k * 3 + 2] = pos.z;
    const th = Math.random() * 6.283, ph = Math.acos(Math.random() * 2 - 1), s = speed * (.4 + Math.random() * .6);
    this.v[k * 3] = Math.sin(ph) * Math.cos(th) * s; this.v[k * 3 + 1] = Math.abs(Math.cos(ph)) * s * .8 + up; this.v[k * 3 + 2] = Math.sin(ph) * Math.sin(th) * s;
    this.life[k] = this.max[k] = life * (.7 + Math.random() * .5); this.size[k] = size * (.6 + Math.random() * .6); this.grav[k] = grav; this.rot[k] = Math.random() * 6;
    this.mesh.setColorAt(k, this.c.set(color)); this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    const d = this.d;
    for (let k = 0; k < this.n; k++) {
      if (this.life[k] <= 0) continue;
      this.life[k] -= dt;
      const t = Math.max(0, this.life[k] / this.max[k]);
      this.v[k * 3 + 1] -= this.grav[k] * dt;
      this.v[k * 3] *= 1 - dt * 1.5; this.v[k * 3 + 2] *= 1 - dt * 1.5;
      this.p[k * 3] += this.v[k * 3] * dt; this.p[k * 3 + 1] += this.v[k * 3 + 1] * dt; this.p[k * 3 + 2] += this.v[k * 3 + 2] * dt;
      d.position.set(this.p[k * 3], this.p[k * 3 + 1], this.p[k * 3 + 2]);
      this.rot[k] += dt * 4; d.rotation.set(this.rot[k], this.rot[k] * .7, 0);
      d.scale.setScalar(this.life[k] > 0 ? this.size[k] * Math.min(1, t * 1.6) : 0);
      d.updateMatrix(); this.mesh.setMatrixAt(k, d.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class FX {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.bits = new Particles(scene, new THREE.IcosahedronGeometry(1, 0), 700);
    this.glow = new Particles(scene, new THREE.IcosahedronGeometry(1, 1), 200, true);
    this.stars = new Particles(scene, STAR_G, 140);
    this.rings = []; this.beams = []; this.pops = [];
    const rg = new THREE.RingGeometry(.85, 1, 40).rotateX(-Math.PI / 2);
    for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); m.visible = false; scene.add(m); this.rings.push({ m, t: 0, dur: 1 }); }
    for (let i = 0; i < 16; i++) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(10 * 3), 3)); const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe14a, transparent: true })); l.visible = false; l.frustumCulled = false; scene.add(l); this.beams.push({ l, t: 0 }); }
    this.popEl = document.getElementById('popups');
    for (let i = 0; i < 18; i++) { const el = document.createElement('div'); el.className = 'pop out'; this.popEl.appendChild(el); this.pops.push({ el, t: 0, pos: new THREE.Vector3() }); }
    this.pi = 0; this.v = new THREE.Vector3();
  }
  burst(pos, color, n = 14, speed = 6, size = .14, grav = 12, life = .7) { for (let i = 0; i < n; i++) this.bits.emit(pos, color, speed, size, life, grav); }
  sparks(pos, color, n = 6, speed = 5, size = .1) { for (let i = 0; i < n; i++) this.glow.emit(pos, color, speed, size, .35, 0); }
  starBurst(pos, n = 6, speed = 5) { for (let i = 0; i < n; i++) this.stars.emit(pos, [0xffe14a, 0xffffff, 0xff5fa8][i % 3], speed, .5, .9, 8, 2); }
  ring(pos, color, maxR = 4, dur = .5) { const r = this.rings.find(r => !r.m.visible) || this.rings[0]; r.m.visible = true; r.m.position.copy(pos); r.m.material.color.set(color); r.t = 0; r.dur = dur; r.maxR = maxR; }
  beam(points, color = 0xffe14a) {
    const b = this.beams.find(b => !b.l.visible) || this.beams[0];
    const arr = b.l.geometry.attributes.position.array; const a = points[0], z = points[1];
    for (let i = 0; i < 10; i++) { const t = i / 9; const j = (i === 0 || i === 9) ? 0 : .35; arr[i * 3] = a.x + (z.x - a.x) * t + (Math.random() - .5) * j; arr[i * 3 + 1] = a.y + (z.y - a.y) * t + (Math.random() - .5) * j; arr[i * 3 + 2] = a.z + (z.z - a.z) * t + (Math.random() - .5) * j; }
    b.l.geometry.attributes.position.needsUpdate = true; b.l.material.color.set(color); b.l.visible = true; b.t = .14;
  }
  popup(text, pos, cls = '') { const p = this.pops[this.pi]; this.pi = (this.pi + 1) % this.pops.length; p.el.textContent = text; p.el.className = 'pop out ' + cls; p.pos.copy(pos); p.t = 1; p.el.style.display = 'block'; }
  clear() { this.pops.forEach(p => { p.t = 0; p.el.style.display = 'none'; }); this.rings.forEach(r => r.m.visible = false); this.beams.forEach(b => b.l.visible = false); }
  update(dt) {
    this.bits.update(dt); this.glow.update(dt); this.stars.update(dt);
    for (const r of this.rings) { if (!r.m.visible) continue; r.t += dt; const k = r.t / r.dur; if (k >= 1) { r.m.visible = false; continue; } const s = .3 + r.maxR * k; r.m.scale.set(s, 1, s); r.m.material.opacity = (1 - k) * .9; }
    for (const b of this.beams) { if (!b.l.visible) continue; b.t -= dt; b.l.material.opacity = Math.max(0, b.t / .14); if (b.t <= 0) b.l.visible = false; }
    const W = innerWidth, H = innerHeight;
    for (const p of this.pops) {
      if (p.t <= 0) continue; p.t -= dt * .9;
      if (p.t <= 0) { p.el.style.display = 'none'; continue; }
      this.v.copy(p.pos); this.v.y += (1 - p.t) * 1.2; this.v.project(this.camera);
      if (this.v.z > 1) { p.el.style.opacity = 0; continue; }
      const x = (this.v.x * .5 + .5) * W, y = (-this.v.y * .5 + .5) * H;
      const sc = p.t > .85 ? 1 + (p.t - .85) * 4 : 1;
      p.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${sc})`; p.el.style.opacity = Math.min(1, p.t * 3);
    }
  }
}
