import * as THREE from 'three';
import { CHECKPOINTS, CHECKPOINT_PTS, ROUTE_BONUS } from './config.js';
import { getHeight } from './world.js';

const V = new THREE.Vector3();
const MAP_R = 76; // world units shown edge-to-edge (half size)

function flagTex(n) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 80; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 80); x.fillStyle = '#1d1238'; x.font = 'bold 60px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 50, 44);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class MapSys {
  constructor(G) {
    this.G = G; this.cps = []; this.group = null; this.img = document.createElement('canvas'); this.img.width = this.img.height = 512;
    this.mini = document.getElementById('minimap'); this.mctx = this.mini.getContext('2d');
    this.full = document.getElementById('bigmap'); this.fctx = this.full.getContext('2d');
    this.t = 0;
  }

  // top-down snapshot of the current world, drawn once per world load
  snapshot() {
    const G = this.G, R = G.renderer, sc = G.scene, W = innerWidth, H = innerHeight, asp = W / H;
    const cam = new THREE.OrthographicCamera(-MAP_R * asp, MAP_R * asp, MAP_R, -MAP_R, 1, 160); cam.position.set(0, 120, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
    const fog = sc.fog; sc.fog = null; const hid = [];
    sc.traverse(o => { if ((o.isMesh || o.isPoints) && o.position.y > 20 && o.parent && o.parent !== sc && !o.isInstancedMesh) { if (o.visible) { hid.push(o); o.visible = false; } } });
    (G.world.clouds || []).forEach(c => { if (c.visible) { hid.push(c); c.visible = false; } });
    const bv = G.body.group.visible; G.body.group.visible = false; const wv = G.weapons.holder.visible; G.weapons.holder.visible = false;
    R.render(sc, cam);
    const ctx = this.img.getContext('2d'), cw = R.domElement.width, ch = R.domElement.height, s = Math.min(cw, ch);
    ctx.drawImage(R.domElement, (cw - s) / 2, (ch - s) / 2, s, s, 0, 0, 512, 512);
    sc.fog = fog; hid.forEach(o => o.visible = true); G.body.group.visible = bv; G.weapons.holder.visible = wv;
  }

  build(worldId) {
    const G = this.G;
    if (this.group) G.scene.remove(this.group);
    this.group = new THREE.Group(); G.scene.add(this.group);
    this.cps = (CHECKPOINTS[worldId] || []).map(([x, z], i) => {
      const g = new THREE.Group(); g.position.set(x, getHeight(x, z), z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .08, 3.4, 8), new THREE.MeshStandardMaterial({ color: 0xdfe4f0, metalness: .5, roughness: .3 })); pole.position.y = 1.7; pole.castShadow = true; g.add(pole);
      const clothMat = new THREE.MeshStandardMaterial({ color: 0x45d7ff, map: flagTex(i + 1), side: THREE.DoubleSide, roughness: .7 });
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .9, 8, 1), clothMat); cloth.position.set(.75, 2.9, 0); cloth.castShadow = true; g.add(cloth);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x45d7ff, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.8, 40).rotateX(-Math.PI / 2), ringMat); ring.position.y = .08; g.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 22, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x45d7ff, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 11; g.add(beam);
      this.group.add(g);
      return { i, pos: new THREE.Vector3(x, g.position.y, z), g, cloth, clothMat, ring, ringMat, beam, done: false };
    });
    this.next = 0; G.lastCP = null;
    this.refresh();
  }

  refresh() {
    this.cps.forEach(c => {
      const active = c.i === this.next;
      c.clothMat.color.set(c.done ? 0xffd43b : active ? 0x45d7ff : 0x8a82a8);
      c.ringMat.color.set(c.done ? 0xffd43b : 0x45d7ff); c.ring.visible = !c.done; c.ringMat.opacity = active ? .7 : .2;
      c.beam.visible = active;
    });
  }

  update(dt) {
    const G = this.G, P = G.player.pos; this.t += dt;
    for (const c of this.cps) {
      c.cloth.rotation.y = Math.sin(this.t * 3 + c.i) * .25;
      const pa = c.cloth.geometry.attributes.position; for (let k = 0; k < pa.count; k++) { const x = pa.getX(k); pa.setZ(k, Math.sin(this.t * 6 + x * 4 + c.i) * .08 * (x + .7)); } pa.needsUpdate = true;
      if (c.i === this.next) { c.ring.scale.setScalar(1 + Math.sin(this.t * 4) * .06); c.beam.rotation.y += dt; }
      if (c.done && c.g.position.y < c.pos.y + .01) c.cloth.position.y = Math.min(2.9, c.cloth.position.y + dt * 3);
    }
    const c = this.cps[this.next];
    if (c && Math.hypot(P.x - c.pos.x, P.z - c.pos.z) < 2.8) this.reach(c);
    // minimap at ~20fps
    if ((this.mt = (this.mt || 0) - dt) <= 0) { this.mt = .05; this.drawMini(); }
  }

  reach(c) {
    const G = this.G; c.done = true; this.next++; G.lastCP = c.pos.clone();
    const pts = CHECKPOINT_PTS + c.i * 100;
    G.addScore(pts, null); G.audio.play('secret'); G.haptic(25);
    V.copy(c.pos).setY(c.pos.y + 3); G.fx.starBurst(V, 12, 7); G.fx.burst(V, 0x45d7ff, 20, 8, .18, 6, .8); G.fx.ring(c.pos.clone().setY(c.pos.y + .1), 0xffd43b, 5, .6);
    if (this.next >= this.cps.length) {
      G.addScore(ROUTE_BONUS, null); G.audio.play('highscore');
      G.hud.banner('ROUTE COMPLETE!', '+' + ROUTE_BONUS + ' BONUS', 2.8, 'level');
      G.items.spawn('mystery', c.pos.clone().add(V.set(2, 0, 2)), { permanent: true });
    } else G.hud.banner('CHECKPOINT ' + (c.i + 1) + '/' + this.cps.length, '+' + pts + '  ·  NEXT FLAG ON YOUR MAP', 2, 'small');
    this.refresh();
  }

  nextPos() { const w = this.G.warp; if (w && w.isOpen) return w.pos; const c = this.cps[this.next]; return c ? c.pos : null; }
  progress() { return { done: this.next, total: this.cps.length }; }

  // world → map pixel (512 image)
  px(x, z) { return [(x / MAP_R * .5 + .5) * 512, (z / MAP_R * .5 + .5) * 512]; }

  markers(ctx, toXY, scale) {
    const G = this.G, dot = (x, z, r, fill, stroke = '#1d1238') => { const [a, b] = toXY(x, z); ctx.beginPath(); ctx.arc(a, b, r * scale, 0, 7); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2 * scale; ctx.strokeStyle = stroke; ctx.stroke(); };
    // route line to next checkpoint
    const nxt = this.nextPos();
    if (nxt) { const [a, b] = toXY(G.player.pos.x, G.player.pos.z), [c2, d] = toXY(nxt.x, nxt.z); ctx.setLineDash([6 * scale, 5 * scale]); ctx.strokeStyle = '#45d7ff'; ctx.lineWidth = 3 * scale; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.stroke(); ctx.setLineDash([]); }
    for (const it of G.items.list) { if (it.dead) continue; if (it.type === G.missionItem) dot(it.pos.x, it.pos.z, 5, '#ffd43b'); else if (it.type === 'mystery') dot(it.pos.x, it.pos.z, 4.5, '#ff5fa8'); else if (it.type === 'weapon') dot(it.pos.x, it.pos.z, 4, '#ffffff'); }
    for (const c of this.cps) {
      const [a, b] = toXY(c.pos.x, c.pos.z), active = c.i === this.next, r = (active ? 8 : 6.5) * scale;
      ctx.fillStyle = c.done ? '#ffd43b' : active ? '#45d7ff' : '#8a82a8'; ctx.strokeStyle = '#1d1238'; ctx.lineWidth = 2.5 * scale;
      ctx.beginPath(); ctx.roundRect(a - r, b - r, r * 2, r * 2, 3 * scale); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1d1238'; ctx.font = `bold ${Math.round(r * 1.3)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.done ? '✓' : c.i + 1, a, b + scale);
    }
    const wp = G.warp; if (wp && wp.pos) { const [a, b] = toXY(wp.pos.x, wp.pos.z); const col = '#' + wp.color.toString(16).padStart(6, '0'); ctx.beginPath(); ctx.arc(a, b, (wp.isOpen ? 11 + Math.sin(this.t * 6) * 2 : 8) * scale, 0, 7); ctx.fillStyle = wp.isOpen ? col : '#3a2a5c'; ctx.fill(); ctx.lineWidth = 3 * scale; ctx.strokeStyle = wp.isOpen ? '#ffffff' : col; ctx.stroke(); }
    for (const e of G.enemies.list) if (e.alive) dot(e.group.position.x, e.group.position.z, e.type === 'boss' ? 9 : 3.6, e.type === 'boss' ? '#ff5fa8' : '#ff4a5a', e.type === 'boss' ? '#fff' : '#1d1238');
  }

  arrow(ctx, x, y, ang, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0, -9 * s); ctx.lineTo(7 * s, 7 * s); ctx.lineTo(0, 3 * s); ctx.lineTo(-7 * s, 7 * s); ctx.closePath();
    ctx.fillStyle = '#fff6e0'; ctx.fill(); ctx.lineWidth = 2.5 * s; ctx.strokeStyle = '#1d1238'; ctx.stroke(); ctx.restore();
  }

  drawMini() {
    const G = this.G, cv = this.mini, dpr = Math.min(2, devicePixelRatio || 1), sz = cv.clientWidth * dpr;
    if (!sz) return; if (cv.width !== sz) { cv.width = cv.height = sz; }
    const ctx = this.mctx, P = G.player, half = sz / 2, view = 34; // world units radius
    const k = half / view, s = sz / 110;
    ctx.clearRect(0, 0, sz, sz); ctx.save(); ctx.beginPath(); ctx.arc(half, half, half - 2, 0, 7); ctx.clip();
    ctx.fillStyle = '#1d1238'; ctx.fillRect(0, 0, sz, sz);
    ctx.translate(half, half); ctx.rotate(P.yaw);
    const ipx = 512 / (MAP_R * 2); // image px per world unit
    ctx.drawImage(this.img, (P.pos.x + MAP_R) * ipx - view * ipx, (P.pos.z + MAP_R) * ipx - view * ipx, view * 2 * ipx, view * 2 * ipx, -half, -half, sz, sz);
    const toXY = (x, z) => [(x - P.pos.x) * k, (z - P.pos.z) * k];
    this.markers(ctx, toXY, s);
    ctx.restore();
    // off-edge pointer for next checkpoint
    const n = this.nextPos();
    if (n) { const dx = n.x - P.pos.x, dz = n.z - P.pos.z, d = Math.hypot(dx, dz); if (d > view * .9) { const cs = Math.cos(P.yaw), sn = Math.sin(P.yaw); const rx = dx * cs - dz * sn, rz = dx * sn + dz * cs; const a = Math.atan2(rz, rx); const ex = half + Math.cos(a) * (half - 9 * s), ey = half + Math.sin(a) * (half - 9 * s); ctx.fillStyle = '#45d7ff'; ctx.strokeStyle = '#1d1238'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(ex, ey, 6 * s, 0, 7); ctx.fill(); ctx.stroke(); } }
    this.arrow(ctx, half, half, 0, s);
    ctx.lineWidth = 3 * s; ctx.strokeStyle = '#1d1238'; ctx.beginPath(); ctx.arc(half, half, half - 2, 0, 7); ctx.stroke();
    ctx.fillStyle = '#fff6e0'; ctx.font = `bold ${Math.round(11 * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const nx = half + Math.sin(P.yaw) * (half - 10 * s), ny = half - Math.cos(P.yaw) * (half - 10 * s); ctx.fillText('N', nx, ny);
  }

  drawFull() {
    const G = this.G, cv = this.full, dpr = Math.min(2, devicePixelRatio || 1), sz = Math.round(cv.clientWidth * dpr);
    if (cv.width !== sz) cv.width = cv.height = sz;
    const ctx = this.fctx, s = sz / 420;
    ctx.clearRect(0, 0, sz, sz); ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, sz, sz, 18 * s); ctx.clip();
    ctx.drawImage(this.img, 0, 0, sz, sz);
    const toXY = (x, z) => [(x / MAP_R * .5 + .5) * sz, (z / MAP_R * .5 + .5) * sz];
    this.markers(ctx, toXY, s * 1.4);
    for (const sc of G.world.secrets) if (sc.found) { const [a, b] = toXY(sc.pos.x, sc.pos.z); ctx.fillStyle = '#ffd43b'; ctx.font = `bold ${Math.round(22 * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', a, b); }
    const [px, py] = toXY(G.player.pos.x, G.player.pos.z); this.arrow(ctx, px, py, -G.player.yaw, s * 1.6);
    ctx.restore();
  }
}
