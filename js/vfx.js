// Extra visual effects: flipbook sprites, projectile trails, glow beams, muzzle flashes and
// emitters attached to characters. Everything is drawn once onto canvases at start-up and
// pooled, so nothing is created while playing.
import * as THREE from 'three';

// ---------- flipbook sheets (grid of animation frames drawn on a canvas) ----------
const FR = 128; // frame size in px
function sheet(cols, rows, draw) {
  const c = document.createElement('canvas'); c.width = cols * FR; c.height = rows * FR; const x = c.getContext('2d');
  const n = cols * rows;
  for (let i = 0; i < n; i++) { x.save(); x.translate((i % cols) * FR + FR / 2, Math.floor(i / cols) * FR + FR / 2); draw(x, i / (n - 1), i); x.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1 / cols, 1 / rows);
  return { tex: t, cols, rows, n };
}
function star(x, pts, r1, r2) { x.beginPath(); for (let i = 0; i < pts * 2; i++) { const r = i % 2 ? r2 : r1, a = i / (pts * 2) * Math.PI * 2 - Math.PI / 2; i ? x.lineTo(Math.cos(a) * r, Math.sin(a) * r) : x.moveTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); }
function blob(x, r, seed, bumps = 9) { x.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; const rr = r * (1 + .18 * Math.sin(a * bumps + seed) + .08 * Math.sin(a * 3 + seed * 2)); i ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); }

const SHEETS = {};
function makeSheets() {
  // comic "POW" hit star — pops in, wobbles, shrinks away
  SHEETS.pow = sheet(4, 2, (x, t, i) => {
    const s = t < .25 ? t / .25 * 1.15 : 1.15 - (t - .25) * 1.3; if (s <= 0) return;
    x.rotate((i % 2 ? .12 : -.12)); x.scale(s, s);
    star(x, 10, 56, 30); x.fillStyle = '#ffffff'; x.fill(); x.lineWidth = 7; x.strokeStyle = '#1d1238'; x.stroke();
    star(x, 10, 42, 22); x.fillStyle = '#ffd43b'; x.fill();
    x.fillStyle = '#ff4a5a'; x.font = '900 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = '#1d1238';
    const w = ['POW!', 'BAM!', 'ZAP!', 'POP!'][i % 4]; x.strokeText(w, 0, 2); x.fillText(w, 0, 2);
  });
  // fireball explosion
  SHEETS.boom = sheet(4, 4, (x, t) => {
    const r = 18 + t * 44, a = t < .6 ? 1 : 1 - (t - .6) / .4;
    x.globalAlpha = a;
    if (t > .35) { blob(x, r * 1.05, t * 9, 7); x.fillStyle = 'rgba(90,70,110,' + (.6 * (t - .35)) + ')'; x.fill(); }
    blob(x, r, t * 7); const g = x.createRadialGradient(0, 0, 0, 0, 0, r * 1.2);
    g.addColorStop(0, '#fffbe0'); g.addColorStop(.35, t < .5 ? '#ffe14a' : '#ffb52e'); g.addColorStop(.75, t < .5 ? '#ff8a2a' : '#e0502a'); g.addColorStop(1, 'rgba(200,60,40,0)');
    x.fillStyle = g; x.fill();
    if (t < .5) { for (let k = 0; k < 8; k++) { const an = k / 8 * 6.28 + t; x.beginPath(); x.arc(Math.cos(an) * r * 1.1, Math.sin(an) * r * 1.1, 6 * (1 - t), 0, 7); x.fillStyle = '#fff6c0'; x.fill(); } }
  });
  // cartoon smoke puff
  SHEETS.smoke = sheet(4, 2, (x, t) => {
    const r = 20 + t * 34; x.globalAlpha = .85 * (1 - t);
    for (let k = 0; k < 5; k++) { const an = k / 5 * 6.28 + t * 2; x.beginPath(); x.arc(Math.cos(an) * r * .5, Math.sin(an) * r * .5 - t * 10, r * .55, 0, 7); x.fillStyle = k % 2 ? '#f2eefa' : '#ffffff'; x.fill(); }
  });
  // gooey splat
  SHEETS.splat = sheet(4, 2, (x, t, i) => {
    const s = Math.min(1, t * 3), a = t < .6 ? 1 : 1 - (t - .6) / .4; x.globalAlpha = a; x.scale(s, s);
    blob(x, 34, i * .7, 6); x.fillStyle = '#8ff04a'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#2f7a1f'; x.stroke();
    for (let k = 0; k < 6; k++) { const an = k / 6 * 6.28 + .3; x.beginPath(); x.arc(Math.cos(an) * 48, Math.sin(an) * 48, 8, 0, 7); x.fillStyle = '#8ff04a'; x.fill(); }
    x.beginPath(); x.arc(-10, -10, 8, 0, 7); x.fillStyle = 'rgba(255,255,255,.7)'; x.fill();
  });
  // muzzle flash
  SHEETS.flash = sheet(4, 1, (x, t) => {
    const s = 1 - t * .7; x.globalAlpha = 1 - t * .6; star(x, 8, 58 * s, 22 * s);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 58 * s); g.addColorStop(0, '#ffffff'); g.addColorStop(.4, '#fff6c0'); g.addColorStop(1, 'rgba(255,200,80,0)'); x.fillStyle = g; x.fill();
  });
  // round soft glow used for trails / beams / emitters
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); SHEETS.glowTex = new THREE.CanvasTexture(c);
  // beam strip: bright core fading to the edges (across the width)
  const b = document.createElement('canvas'); b.width = 4; b.height = 64; const bx = b.getContext('2d');
  const bg = bx.createLinearGradient(0, 0, 0, 64); bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(.5, 'rgba(255,255,255,1)'); bg.addColorStop(1, 'rgba(255,255,255,0)');
  bx.fillStyle = bg; bx.fillRect(0, 0, 4, 64); SHEETS.beamTex = new THREE.CanvasTexture(b);
}

// ---------- ribbon trail (strip of quads that always faces the camera) ----------
const TN = 12;
class Trail {
  constructor(scene) {
    this.pts = []; for (let i = 0; i < TN; i++) this.pts.push(new THREE.Vector3());
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(TN * 2 * 3); this.alpha = new Float32Array(TN * 2);
    const uv = new Float32Array(TN * 2 * 2), idx = [];
    for (let i = 0; i < TN; i++) { uv.set([i / (TN - 1), 0, i / (TN - 1), 1], i * 4); if (i < TN - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1)); geo.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: SHEETS.beamTex }, color: { value: new THREE.Color() } },
      vertexShader: 'attribute float alpha; varying float vA; varying vec2 vUv; void main(){ vA=alpha; vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D map; uniform vec3 color; varying float vA; varying vec2 vUv; void main(){ float m=texture2D(map,vec2(.5,vUv.y)).a; gl_FragColor=vec4(mix(color,vec3(1.0),m*m*.6), m*vA); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.frustumCulled = false; this.mesh.visible = false; scene.add(this.mesh);
    this.owner = null; this.fade = 0; this.width = .2;
  }
  start(owner, pos, color, width) { this.owner = owner; this.pts.forEach(p => p.copy(pos)); this.mat.uniforms.color.value.set(color); this.width = width; this.fade = 1; this.mesh.visible = true; }
  update(dt, cam) {
    if (!this.mesh.visible) return;
    if (this.owner && this.owner.life > 0) { for (let i = TN - 1; i > 0; i--) this.pts[i].copy(this.pts[i - 1]); this.pts[0].copy(this.owner.m.position); }
    else { this.owner = null; this.fade -= dt * 5; for (let i = TN - 1; i > 0; i--) this.pts[i].copy(this.pts[i - 1]); if (this.fade <= 0) { this.mesh.visible = false; return; } }
    const D = Trail.D, S = Trail.S, E = Trail.E;
    for (let i = 0; i < TN; i++) {
      const a = this.pts[Math.max(0, i - 1)], b = this.pts[Math.min(TN - 1, i + 1)];
      D.subVectors(a, b); if (D.lengthSq() < 1e-8) D.set(0, 0, 1);
      E.subVectors(cam.position, this.pts[i]); S.crossVectors(D, E).normalize();
      const k = 1 - i / (TN - 1), w = this.width * (.25 + .75 * k);
      const p = this.pts[i], o = i * 6;
      this.pos[o] = p.x + S.x * w; this.pos[o + 1] = p.y + S.y * w; this.pos[o + 2] = p.z + S.z * w;
      this.pos[o + 3] = p.x - S.x * w; this.pos[o + 4] = p.y - S.y * w; this.pos[o + 5] = p.z - S.z * w;
      this.alpha[i * 2] = this.alpha[i * 2 + 1] = k * Math.max(0, this.fade) * .9;
    }
    const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.attributes.alpha.needsUpdate = true;
  }
}
Trail.D = new THREE.Vector3(); Trail.S = new THREE.Vector3(); Trail.E = new THREE.Vector3();

// ---------- the VFX manager ----------
export class VFX {
  constructor(scene, camera) {
    makeSheets();
    this.scene = scene; this.camera = camera;
    this.books = [];
    for (let i = 0; i < 28; i++) {
      const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
      const s = new THREE.Sprite(mat); s.visible = false; s.renderOrder = 15; scene.add(s);
      this.books.push({ s, t: 0, dur: 1, sh: null });
    }
    this.trails = []; for (let i = 0; i < 40; i++) this.trails.push(new Trail(scene));
    // soft glow beam (a stretched quad between two points)
    this.beams = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: SHEETS.beamTex, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.visible = false; m.frustumCulled = false; scene.add(m); this.beams.push({ m, t: 0, a: new THREE.Vector3(), b: new THREE.Vector3(), w: .3 });
    }
    // particle "attachments": emitters glued to a character or object
    this.attached = [];
    this.motes = [];
    for (let i = 0; i < 160; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SHEETS.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.visible = false; scene.add(s); this.motes.push({ s, v: new THREE.Vector3(), t: 0, dur: 1, g: 0, size: .2 });
    }
    this.mi = 0; this.V = new THREE.Vector3(); this.low = false;
  }

  // Play a flipbook (sheet name) at a point. size = world units.
  flip(name, pos, size = 1.5, dur = .45, tint) {
    const sh = SHEETS[name]; if (!sh) return;
    const b = this.books.find(b => !b.s.visible) || this.books.reduce((o, b) => b.t > o.t ? b : o);
    if (b.sh !== sh) { const tex = sh.tex.clone(); tex.needsUpdate = true; if (b.s.material.map) b.s.material.map.dispose(); b.s.material.map = tex; b.s.material.needsUpdate = true; b.sh = sh; }
    b.s.material.color.set(tint || 0xffffff); b.s.material.rotation = (Math.random() - .5) * .6;
    b.s.position.copy(pos); b.s.scale.set(size, size, 1); b.t = 0; b.dur = dur; b.s.visible = true; this.frame(b, 0);
  }
  frame(b, k) {
    const sh = b.sh, f = Math.min(sh.n - 1, Math.floor(k * sh.n)), m = b.s.material.map;
    m.offset.set((f % sh.cols) / sh.cols, 1 - (Math.floor(f / sh.cols) + 1) / sh.rows);
  }

  // Glowing trail that follows a projectile until it lands.
  trail(proj, color, width = .18) { if (this.low) return; const t = this.trails.find(t => !t.mesh.visible); if (t) t.start(proj, proj.m.position, color, width); }

  // Thick glowing energy beam between two points.
  beam(a, b, color, width = .35, dur = .12) {
    const B = this.beams.find(b => !b.m.visible) || this.beams[0];
    B.a.copy(a); B.b.copy(b); B.w = width; B.t = dur; B.dur = dur; B.m.material.color.set(color); B.m.visible = true; this.placeBeam(B);
  }
  placeBeam(B) {
    const m = B.m, V = this.V; m.position.addVectors(B.a, B.b).multiplyScalar(.5);
    const len = B.a.distanceTo(B.b); m.scale.set(len, B.w, 1);
    // orient: x axis along the beam, face toward the camera as much as possible
    const dir = V.subVectors(B.b, B.a).normalize(); const toCam = new THREE.Vector3().subVectors(this.camera.position, m.position).normalize();
    const up = new THREE.Vector3().crossVectors(toCam, dir).normalize(); const n = new THREE.Vector3().crossVectors(dir, up);
    m.matrix.makeBasis(dir, up, n); m.quaternion.setFromRotationMatrix(m.matrix);
  }

  // Small glowing dots (sparkles, drips, snowflakes).
  mote(pos, color, size = .2, speed = 1.5, dur = .7, grav = 0, up = 0) {
    const M = this.motes[this.mi]; this.mi = (this.mi + 1) % this.motes.length;
    M.s.position.copy(pos); M.v.set((Math.random() - .5) * speed, Math.random() * speed * .6 + up, (Math.random() - .5) * speed);
    M.s.material.color.set(color); M.size = size * (.6 + Math.random() * .6); M.t = 0; M.dur = dur * (.7 + Math.random() * .6); M.g = grav; M.s.visible = true;
  }
  // Attach an emitter to an object: fn(obj) returns a world position (or null to stop).
  attach(key, getPos, opts) {
    let A = this.attached.find(a => a.key === key);
    if (!A) { A = { key, acc: 0 }; this.attached.push(A); }
    Object.assign(A, { getPos, rate: 12, color: 0xffffff, size: .2, speed: 1, dur: .8, grav: 0, up: .5, spread: .5 }, opts);
    return A;
  }
  detach(key) { this.attached = this.attached.filter(a => a.key !== key); }

  // Food crumbs / confetti from a list of colors
  confetti(pos, colors, n = 14) { for (let i = 0; i < n; i++) this.mote(pos, colors[i % colors.length], .28, 7, .9, 9, 3); }

  clear() { this.books.forEach(b => b.s.visible = false); this.trails.forEach(t => { t.mesh.visible = false; t.owner = null; }); this.beams.forEach(b => b.m.visible = false); this.motes.forEach(m => m.s.visible = false); this.attached = []; }

  update(dt) {
    for (const b of this.books) { if (!b.s.visible) continue; b.t += dt; const k = b.t / b.dur; if (k >= 1) { b.s.visible = false; continue; } this.frame(b, k); b.s.position.y += dt * .4; }
    for (const t of this.trails) t.update(dt, this.camera);
    for (const B of this.beams) { if (!B.m.visible) continue; B.t -= dt; if (B.t <= 0) { B.m.visible = false; continue; } const k = B.t / B.dur; B.m.material.opacity = k; B.m.scale.y = B.w * (.4 + .6 * k); }
    const V = this.V;
    for (const A of this.attached) {
      const P0 = this.P0 || (this.P0 = new THREE.Vector3());
      const p = A.getPos(P0); if (!p) { A.dead = true; continue; }
      A.acc += dt * A.rate;
      while (A.acc >= 1) { A.acc--; this.mote(V.set(p.x + (Math.random() - .5) * A.spread, p.y + (Math.random() - .5) * A.spread, p.z + (Math.random() - .5) * A.spread), Array.isArray(A.color) ? A.color[Math.floor(Math.random() * A.color.length)] : A.color, A.size, A.speed, A.dur, A.grav, A.up); }
    }
    if (this.attached.some(a => a.dead)) this.attached = this.attached.filter(a => !a.dead);
    for (const M of this.motes) {
      if (!M.s.visible) continue; M.t += dt; const k = M.t / M.dur; if (k >= 1) { M.s.visible = false; continue; }
      M.v.y -= M.g * dt; M.v.multiplyScalar(1 - dt * 1.2); M.s.position.addScaledVector(M.v, dt);
      const s = M.size * (k < .2 ? k / .2 : 1 - (k - .2) / .8 * .7); M.s.scale.set(s, s, 1); M.s.material.opacity = 1 - k * k;
    }
  }
}
