import * as THREE from 'three';
import { lam, lumpy, mergeGeos, noiseTex, rng, smooth, setHeightFn } from './world.js';

const R = 70;
const clamp01 = v => Math.max(0, Math.min(1, v));
const hyp = Math.hypot;
function segD(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az; const t = clamp01(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)); return hyp(px - ax - dx * t, pz - az - dz * t); }
const edgeRise = (x, z, amt = 7) => { const r = hyp(x, z); return r > R - 8 ? smooth(Math.min(1, (r - (R - 8)) / 16)) * amt : 0; };
const V3 = (x, z) => new THREE.Vector3(x, 0, z);
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), P = new THREE.Vector3();
const xf = (g, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => g.applyMatrix4(M4.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz)));
const glowM = c => new THREE.MeshBasicMaterial({ color: c });

// ---------- prop geometry library ----------
const PROPS = {
  palm: () => {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.25, 2, 0), new THREE.Vector3(.8, 3.9, 0), new THREE.Vector3(1.4, 5.3, 0)]);
    const trunk = new THREE.TubeGeometry(curve, 14, .2, 8);
    const fr = []; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; fr.push(xf(new THREE.SphereGeometry(1, 10, 6), 1.4 + Math.cos(a) * 1.1, 5.1, Math.sin(a) * 1.1, 0, -a, -.45, 1.5, .07, .38)); }
    const nuts = mergeGeos([0, 2, 4].map(a => xf(new THREE.SphereGeometry(.17, 10, 8), 1.4 + Math.cos(a) * .25, 5.05, Math.sin(a) * .25)));
    return [{ geo: trunk, mat: lam(0xb08a5a, { roughness: 1 }) }, { geo: mergeGeos(fr), mat: lam(0xffffff, { side: THREE.DoubleSide, roughness: .8 }), pal: [0x2f9e4a, 0x3fb04e, 0x4fbf3a] }, { geo: nuts, mat: lam(0x6a4424) }];
  },
  coral: () => { const g = []; for (let i = 0; i < 6; i++) { const a = i * 1.1, t = .35 + (i % 3) * .2; g.push(xf(new THREE.CylinderGeometry(.08, .14, 1.4, 7), Math.sin(a) * .3, .6, Math.cos(a) * .3, Math.cos(a) * t, 0, Math.sin(a) * t)); g.push(xf(new THREE.SphereGeometry(.13, 8, 6), Math.sin(a) * .55, 1.25, Math.cos(a) * .55)); } return [{ geo: mergeGeos(g), mat: lam(0xffffff, { roughness: .6 }), pal: [0xff6f91, 0xff9a4a, 0xb05cff, 0xffd43b, 0x4ae0d0] }]; },
  rock: pal => [{ geo: lumpy(new THREE.DodecahedronGeometry(1, 1), .14, 3), mat: lam(0xffffff, { flatShading: true, map: noiseTex(128, '#c8c8c8', .3, 2500), roughness: .95 }), pal }],
  basalt: () => { const g = []; for (let i = 0; i < 5; i++) { const h = 1.5 + (i * 1.7) % 3; g.push(xf(new THREE.CylinderGeometry(.42, .45, h, 6), (i % 3 - 1) * .7, h / 2, (i > 2 ? .6 : -.3))); } return [{ geo: mergeGeos(g), mat: lam(0xffffff, { flatShading: true, roughness: .9 }), pal: [0x2e2830, 0x3a3238, 0x26222a] }]; },
  crystal: pal => { const g = []; for (let i = 0; i < 5; i++) { const a = i * 1.3; g.push(xf(new THREE.OctahedronGeometry(1, 0), Math.sin(a) * .35, .7 + (i % 2) * .3, Math.cos(a) * .35, Math.cos(a) * .3, a, Math.sin(a) * .3, .22, .9 + (i % 3) * .3, .22)); } return [{ geo: mergeGeos(g), mat: new THREE.MeshBasicMaterial({ color: 0xffffff }), pal }]; },
  deadTree: () => { const g = [new THREE.CylinderGeometry(.16, .3, 3.4, 8).translate(0, 1.7, 0)]; for (const [y, a, r] of [[2.2, 0, .9], [2.8, 2.2, -.8], [1.7, 4, .7]]) g.push(xf(new THREE.CylinderGeometry(.05, .1, 1.3, 6), Math.cos(a) * .4, y + .3, Math.sin(a) * .4, 0, a, r)); return [{ geo: mergeGeos(g), mat: lam(0x2a2226, { roughness: 1 }) }]; },
  moonRock: () => PROPS.rock([0xa8a8b4, 0x9494a2, 0xbcbcc8]),
  zShroom: () => [{ geo: new THREE.CylinderGeometry(.22, .38, 3, 10).translate(0, 1.5, 0), mat: lam(0xe8dcf4) }, { geo: new THREE.SphereGeometry(1.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .6, 1).translate(0, 2.95, 0), mat: new THREE.MeshBasicMaterial({ color: 0xffffff }), pal: [0x2cf0c0, 0xff5fd0, 0xffb03a, 0x8ff04a] }],
  tentacle: () => { const pts = []; for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(Math.sin(i * .7) * .5 * i / 8, i * .5, Math.cos(i * .7) * .3 * i / 8)); const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .22, 8); const tip = new THREE.SphereGeometry(.3, 12, 8).translate(pts[8].x, 4, pts[8].z); return [{ geo: tube, mat: lam(0xffffff, { roughness: .4 }), pal: [0x8b5cff, 0x2cb8a0, 0xd04ac0] }, { geo: tip, mat: new THREE.MeshBasicMaterial({ color: 0xffffff }), pal: [0xffe14a, 0x8ff04a, 0x45d7ff] }]; },
  pods: () => [{ geo: mergeGeos([xf(new THREE.SphereGeometry(.4, 14, 10), 0, .35, 0), xf(new THREE.SphereGeometry(.3, 12, 8), .5, .26, .2), xf(new THREE.SphereGeometry(.25, 12, 8), -.3, .22, .45)]), mat: new THREE.MeshBasicMaterial({ color: 0xffffff }), pal: [0x8ff04a, 0x45d7ff, 0xff5fd0] }],
  spire: () => [{ geo: lumpy(new THREE.ConeGeometry(.8, 6, 9, 6).translate(0, 3, 0), .08, 4), mat: lam(0xffffff, { roughness: .5 }), pal: [0x5a2a9a, 0x3a1a6a, 0x7a3ac0] }],
  shell: () => [{ geo: new THREE.SphereGeometry(.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .5, 1.2), mat: lam(0xffffff, { roughness: .4 }), pal: [0xffe0e8, 0xfff0d0, 0xffc8a8] }],
};

// ---------- themes ----------
const ISL = [[0, 18, 29, 1.6], [-36, -14, 17, 1.3], [34, -22, 19, 1.8], [0, -46, 18, 1.4], [-44, 36, 11, 1.1], [44, 34, 12, 1.2]];
const BARS = [[0, 18, -36, -14], [0, 18, 34, -22], [34, -22, 0, -46], [-36, -14, 0, -46], [0, 18, -44, 36], [0, 18, 44, 34]];
const CRATERS = [[20, 10, 9, 2.2], [-24, 24, 7, 1.6], [-30, -30, 11, 2.6], [36, -30, 8, 2], [8, -24, 6, 1.4], [-46, 2, 6, 1.4], [46, 30, 7, 1.6], [0, 44, 6, 1.2]];
const lava1 = x => 12 + 6 * Math.sin(x * .07), lava2 = z => 26 + 5 * Math.sin(z * .08);
const VOLC = { x: 0, z: -48 };
const POOLS = [[-24, 10, 7], [28, 22, 6], [20, -30, 5]];

const THEMES = {
  water: {
    sky: [0x1a8ae8, 0xc8f4ff], fog: [0xc8f4ff, 70, 200], hemi: [0xe8f8ff, 0xd8c088, 1.5], sun: [0xfff4d8, 3.6], surface: 'sand', waterY: 0,
    height(x, z) {
      let m = -1.1;
      for (const [cx, cz, r, t] of ISL) { const d = hyp(x - cx, z - cz); if (d < r * 1.3) m = Math.max(m, -1.1 + (t + 1.1) * smooth(clamp01(1 - d / (r * 1.3)))); }
      for (const b of BARS) { const d = segD(x, z, ...b); if (d < 3.5) m = Math.max(m, -.45 + (1 - d / 3.5) * .2); }
      if (m > 0) m += .25 * Math.sin(x * .2) * Math.cos(z * .17) * Math.min(1, m);
      return m;
    },
    color(x, z, h, c) { if (h > .9) c.set(0xe8d49a).lerp(new THREE.Color(0x8ac858), smooth(clamp01((h - .9) / .6))); else if (h > .05) c.set(0xf0dca0); else c.set(0xd8c088).lerp(new THREE.Color(0x3aa8b8), clamp01(-h / 1.1)); },
    water: { color: 0x2ad0e0, opacity: .72 },
    props: [{ kind: 'palm', n: 46, minH: .5, s: [.8, 1.25], col: .35 }, { kind: 'rock', n: 18, minH: -.2, s: [.5, 1.3], col: .9, pal: [0xc8b8a0, 0xa89880, 0xd8c8b0] }, { kind: 'coral', n: 60, maxH: -.35, s: [.7, 1.5] }, { kind: 'shell', n: 60, minH: .05, maxH: .8, s: [.8, 1.4] }],
    grass: { n: 2500, minH: 1, pal: [0x8ac858, 0xa8d868, 0x6ab048] },
    clear: [[0, 26, 7], [34, -22, 5], [-44, 36, 5], [0, -46, 10]],
    spawn: [0, 30], boss: [0, -46], bossSafe: [0, 6], spots: [[40, -12], [-40, -20], [8, -50]],
    secrets: [{ id: 'wreck', p: [-44, 38], r: 2.6, rw: [['mystery', 0, 0]] }, { id: 'light', p: [38, -28], r: 2.6, rw: [['heart', 0, 0], ['ammo', 1.4, 0]] }, { id: 'bar', p: [46, 36], r: 2.6, rw: [['star', 0, 0], ['chicken', 1.2, 0]] }],
    spawns: [[-50, -30], [50, -40], [-58, 0], [58, 10], [-30, 50], [30, 52], [0, -60], [-20, -56], [22, -58], [60, -20], [-60, 30]],
    landmarks(add, T) {
      const light = new THREE.Group(); light.position.set(34, T.height(34, -22), -22);
      for (let i = 0; i < 6; i++) light.add(mesh(new THREE.CylinderGeometry(1.5 - i * .1, 1.6 - i * .1, 2, 20), lam(i % 2 ? 0xffffff : 0xe8403a, { roughness: .5 }), 0, 1 + i * 2, 0));
      light.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 16), new THREE.MeshStandardMaterial({ color: 0xffe14a, emissive: 0xffc830, emissiveIntensity: .8, transparent: true, opacity: .8 }), 0, 12.8, 0));
      light.add(mesh(new THREE.ConeGeometry(1.5, 1.4, 16), lam(0x2a2240), 0, 14.3, 0));
      add(light, 1.8, 34, -22);
      for (const [x, z, r] of [[-38, -10, .3], [-32, -18, -.5]]) { const hut = new THREE.Group(); hut.position.set(x, T.height(x, z), z); hut.rotation.y = r;
        hut.add(mesh(new THREE.BoxGeometry(3, 2.2, 3), lam(0xc89a5a), 0, 1.1, 0)); hut.add(mesh(new THREE.ConeGeometry(2.8, 2, 8), lam(0xe8c870, { roughness: 1 }), 0, 3.2, 0)); hut.add(mesh(new THREE.PlaneGeometry(.9, 1.6), glowM(0x3a2418), 0, .8, 1.51)); add(hut, 2, x, z); }
      const wreck = new THREE.Group(); wreck.position.set(-44, T.height(-44, 36) - .2, 36); wreck.rotation.set(.15, .6, .35);
      const hull = mesh(new THREE.CylinderGeometry(2.2, 2.2, 8, 16, 1, true, 0, Math.PI), lam(0x7a4a2a, { side: THREE.DoubleSide }), 0, 1.4, 0); hull.rotation.set(Math.PI / 2, 0, Math.PI); wreck.add(hull);
      const mast = mesh(new THREE.CylinderGeometry(.14, .16, 6, 8), lam(0x6a3a1a), 0, 3.4, -1); mast.rotation.z = .3; wreck.add(mast);
      wreck.add(mesh(new THREE.PlaneGeometry(2.4, 2), lam(0xf4ecd8, { side: THREE.DoubleSide }), .6, 4.2, -1)); add(wreck, 0, 0, 0); T.W.colliders.push({ x: -46, z: 34, r: 1.4 }, { x: -42, z: 39, r: 1.4 });
      for (let z = 4; z > -26; z -= 1.2) { const y = Math.max(T.height(0, z), 0) + .15; add(mesh(new THREE.BoxGeometry(2.8, .14, 1), lam(0xa87a4a), 0, y, z)); if (Math.round(z * 10) % 36 === 0) for (const sx of [-1.4, 1.4]) add(mesh(new THREE.CylinderGeometry(.1, .1, 1.6, 6), lam(0x7a5a3a), sx, y - .4, z)); }
      T.extraH = (x, z) => (Math.abs(x) < 1.4 && z < 4.5 && z > -26.5) ? Math.max(T.height(x, z), .15) : null;
    },
  },
  volcano: {
    sky: [0x2a1030, 0xff7a3a], fog: [0x6a2a28, 40, 150], hemi: [0xffc8a0, 0x6a3a2a, 1.7], sun: [0xffb070, 3.4], surface: 'rock', lavaY: -.9, sunPos: [60, 30, -80],
    height(x, z) {
      let h = .6 * Math.sin(x * .09) * Math.cos(z * .08) + .4 * Math.sin((x + z) * .13);
      const d = hyp(x - VOLC.x, z - VOLC.z);
      if (d < 30) h += smooth(1 - d / 30) * 15; if (d < 5.5) h -= smooth(1 - d / 5.5) * 5;
      let sd = Math.abs(z - lava1(x)); if (sd < 4.4) h -= smooth(1 - sd / 4.4) * 2.4;
      if (z > -22) { sd = Math.abs(x - lava2(z)); if (sd < 4) h -= smooth(1 - sd / 4) * 2.4; }
      return h + edgeRise(x, z, 9);
    },
    color(x, z, h, c) { c.set(0x5a4a4a).lerp(new THREE.Color(0x7a625a), .5 + .5 * Math.sin(x * .3 + z * .2)); if (h < -.5) c.lerp(new THREE.Color(0xc03a14), smooth(clamp01((-.5 - h) / .6))); if (h > 6) c.lerp(new THREE.Color(0x2a2226), clamp01((h - 6) / 6)); },
    props: [{ kind: 'basalt', n: 30, minH: -.3, maxH: 5, s: [.7, 1.4], col: 1.1 }, { kind: 'crystal', n: 28, minH: -.2, s: [.8, 1.6], col: .5, pal: [0xff5a1f, 0xffb03a, 0xff2a5a] }, { kind: 'deadTree', n: 26, minH: 0, maxH: 5, s: [.8, 1.3], col: .35 }, { kind: 'rock', n: 22, minH: -.2, s: [.5, 1.5], col: .9, pal: [0x4a4046, 0x3a3238, 0x5a4e52] }],
    clear: [[0, 34, 8], [0, lava1(0), 4], [lava2(20), 20, 4], [0, -24, 10]],
    spawn: [0, 34], boss: [0, -24], bossSafe: [0, 24], spots: [[40, -10], [-45, -5], [12, -34]],
    secrets: [{ id: 'behind', p: [20, -64], r: 3, rw: [['mystery', 0, 0]] }, { id: 'ring', p: [-44, 22], r: 3, rw: [['heart', 0, 0], ['ammo', 1.4, 0]] }, { id: 'isle', p: [48, 44], r: 3, rw: [['star', 0, 0], ['chicken', 1.2, 0]] }],
    spawns: [[-50, -30], [50, -34], [-58, 0], [58, 8], [-40, 50], [40, 52], [-24, -44], [26, -42], [-60, 30], [20, 60], [-20, 60]],
    landmarks(add, T) {
      for (const [x, z, rot] of [[0, lava1(0), 0], [lava2(20), 20, Math.PI / 2]]) { const br = new THREE.Group(); br.position.set(x, .1, z); br.rotation.y = rot; br.add(mesh(new THREE.BoxGeometry(3.4, .5, 11), lam(0x6a5a5a, { flatShading: true }))); for (const sx of [-1.6, 1.6]) br.add(mesh(new THREE.BoxGeometry(.3, .6, 11), lam(0x4a4046), sx, .5, 0)); add(br); }
      T.extraH = (x, z) => { if (Math.abs(x) < 1.7 && Math.abs(z - lava1(0)) < 5.5) return .35; if (Math.abs(z - 20) < 1.7 && Math.abs(x - lava2(20)) < 5.5) return .35; return null; };
      const cy = T.height(VOLC.x, VOLC.z) + .3; T.craterY = cy;
      add(mesh(new THREE.CircleGeometry(4.2, 24).rotateX(-Math.PI / 2), T.lavaMat, VOLC.x, cy, VOLC.z));
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; if (a > 1.2 && a < 1.9) continue; add(mesh(lumpy(new THREE.DodecahedronGeometry(1.8, 1), .15, i), lam(0x3a3238, { flatShading: true }), -44 + Math.cos(a) * 5.5, 1, 22 + Math.sin(a) * 5.5, i, i, 0), 1.7, -44 + Math.cos(a) * 5.5, 22 + Math.sin(a) * 5.5); }
      const arch = new THREE.Group(); arch.position.set(-16, 0, 20); arch.rotation.y = .6; arch.add(mesh(new THREE.TorusGeometry(4, .9, 10, 24, Math.PI), lam(0x1e1a22, { roughness: .2, metalness: .3 }))); add(arch); T.W.colliders.push({ x: -16 - 3.3, z: 20 + 2.3, r: 1 }, { x: -16 + 3.3, z: 20 - 2.3, r: 1 });
    },
  },
  space: {
    sky: [0x02030a, 0x16183a], fog: [0x0a0c20, 90, 230], hemi: [0x8a9ad8, 0x30303a, .7], sun: [0xffffff, 4.2], surface: 'metal', gravity: .42, stars: true, sunPos: [-60, 50, 30],
    height(x, z) {
      let h = .25 * Math.sin(x * .13) * Math.cos(z * .11) + .15 * Math.sin((x - z) * .2);
      for (const [cx, cz, r, dp] of CRATERS) { const d = hyp(x - cx, z - cz); if (d < r) h -= dp * (1 - (d / r) ** 2); else if (d < r * 1.4) h += dp * .4 * Math.sin((d - r) / (r * .4) * Math.PI); }
      return h + edgeRise(x, z, 8);
    },
    color(x, z, h, c) { c.set(0xa8a8b4).lerp(new THREE.Color(0xc8c8d2), .5 + .5 * Math.sin(x * .4) * Math.cos(z * .37)); if (h < -.6) c.lerp(new THREE.Color(0x76768a), clamp01((-.6 - h) / 1.5)); },
    props: [{ kind: 'moonRock', n: 44, s: [.4, 1.4], col: .9 }, { kind: 'crystal', n: 22, s: [.7, 1.4], col: .5, pal: [0x45d7ff, 0x8a6aff, 0x4affd0] }],
    clear: [[0, 30, 8], [30, -6, 10], [-30, -18, 6], [0, -40, 10]],
    spawn: [0, 30], boss: [0, -40], bossSafe: [0, 12], spots: [[42, 14], [-40, 30], [-8, -52]],
    secrets: [{ id: 'rocket', p: [-35, -24], r: 2.6, rw: [['mystery', 0, 0]] }, { id: 'crater', p: [-30, -30], r: 3, rw: [['heart', 0, 0], ['ammo', 1.4, 0]] }, { id: 'dish', p: [46, -46], r: 3, rw: [['star', 0, 0], ['chicken', 1.2, 0]] }],
    spawns: [[-50, -40], [50, -34], [-58, 0], [58, 10], [-40, 50], [40, 52], [0, -60], [-24, -54], [24, -58], [60, -20], [-60, 30]],
    landmarks(add, T) {
      const glass = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: .35, roughness: .05, metalness: .4, depthWrite: false });
      for (const [x, z, r] of [[30, -6, 5], [38, 2, 3.2], [24, 2, 3]]) { add(mesh(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), glass, x, T.height(x, z) - .1, z)); add(mesh(new THREE.CylinderGeometry(r + .1, r + .1, .4, 28), lam(0xdfe4f0, { metalness: .5, roughness: .3 }), x, T.height(x, z) + .1, z), r + .2, x, z); }
      const rocket = new THREE.Group(); rocket.position.set(-30, T.height(-30, -18), -18);
      rocket.add(mesh(new THREE.CylinderGeometry(1.2, 1.4, 9, 20), lam(0xf4f4f8, { metalness: .3, roughness: .3 }), 0, 5.5, 0)); rocket.add(mesh(new THREE.ConeGeometry(1.2, 3, 20), lam(0xe8403a), 0, 11.5, 0));
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const fin = mesh(new THREE.BoxGeometry(.2, 3, 2), lam(0xe8403a), Math.sin(a) * 1.4, 1.8, Math.cos(a) * 1.4); fin.rotation.y = a; rocket.add(fin); }
      rocket.add(mesh(new THREE.CircleGeometry(.5, 16), glowM(0x45d7ff), 0, 7, 1.23));
      add(rocket, 1.6, -30, -18);
      const dish = new THREE.Group(); dish.position.set(44, T.height(44, -44), -44); dish.add(mesh(new THREE.CylinderGeometry(.2, .3, 4, 8), lam(0xc8ccd8), 0, 2, 0));
      const bowl = mesh(new THREE.SphereGeometry(3, 24, 10, 0, Math.PI * 2, 0, Math.PI / 3), lam(0xe8ecf4, { side: THREE.DoubleSide, metalness: .4, roughness: .3 }), 0, 5, 0); bowl.rotation.x = Math.PI * .75; dish.add(bowl); add(dish, 1, 44, -44);
      const earthC = document.createElement('canvas'); earthC.width = 256; earthC.height = 128; const ex = earthC.getContext('2d'); ex.fillStyle = '#2a6ae8'; ex.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 26; i++) { ex.fillStyle = i % 3 ? '#3fae4a' : '#ffffff'; ex.beginPath(); ex.ellipse(Math.random() * 256, 20 + Math.random() * 88, 8 + Math.random() * 26, 5 + Math.random() * 14, Math.random() * 3, 0, 7); ex.fill(); }
      const et = new THREE.CanvasTexture(earthC); et.colorSpace = THREE.SRGBColorSpace;
      const earth = mesh(new THREE.SphereGeometry(18, 32, 20), new THREE.MeshBasicMaterial({ map: et, fog: false }), 60, 70, -150); T.root.add(earth); T.spin = earth;
      const ringed = mesh(new THREE.SphereGeometry(8, 24, 16), new THREE.MeshBasicMaterial({ color: 0xe8a860, fog: false }), -110, 55, 90); T.root.add(ringed);
      const ring = mesh(new THREE.RingGeometry(11, 16, 40), new THREE.MeshBasicMaterial({ color: 0xf4d8a8, side: THREE.DoubleSide, transparent: true, opacity: .7, fog: false }), -110, 55, 90); ring.rotation.set(1.2, 0, .3); T.root.add(ring);
    },
  },
  alien: {
    sky: [0x2a1260, 0xff9ad8], fog: [0xd88ad0, 45, 160], hemi: [0xffc8f0, 0x2cb8a0, 1.3], sun: [0xfff0ff, 2.8], surface: 'goo', waterY: -.55, sunPos: [-40, 50, -60],
    height(x, z) {
      let h = 1.3 * Math.sin(x * .055) * Math.cos(z * .065) + .7 * Math.sin((x - z) * .085) + .3 * Math.cos(x * .2 + z * .1);
      for (const [cx, cz, r] of POOLS) { const d = hyp(x - cx, z - cz); if (d < r) h -= smooth(1 - d / r) * 2.2; }
      for (const [cx, cz, r] of [[0, 30, 8], [0, -40, 14], [32, -14, 8]]) { const d = hyp(x - cx, z - cz); if (d < r) h += (.3 - h) * smooth(1 - d / r); }
      return h + edgeRise(x, z, 8);
    },
    color(x, z, h, c) { c.set(0x7a3ab0).lerp(new THREE.Color(0x2c9a8a), smooth(clamp01(.5 + .5 * Math.sin(x * .09 + Math.cos(z * .07) * 2)))); if (h < -.3) c.set(0x8ff04a); },
    water: { color: 0x8ff04a, opacity: .75, emissive: 0x2a8a10 },
    props: [{ kind: 'zShroom', n: 26, minH: -.2, s: [.8, 1.8], col: .45 }, { kind: 'tentacle', n: 26, minH: -.2, s: [.7, 1.3], col: .35 }, { kind: 'pods', n: 30, minH: -.2, s: [.7, 1.4] }, { kind: 'spire', n: 14, minH: -.2, s: [.7, 1.4], col: .7 }],
    grass: { n: 6000, minH: -.25, pal: [0xc05cff, 0xa04ae0, 0x2cc8a0, 0xff7ad8] },
    clear: [[0, 30, 8], [0, -40, 14], [32, -14, 9], [-34, -22, 5]],
    spawn: [0, 30], boss: [0, -40], bossSafe: [0, 10], spots: [[44, 6], [-44, 10], [18, -52]],
    secrets: [{ id: 'ufo', p: [36, -18], r: 2.6, rw: [['mystery', 0, 0]] }, { id: 'tower', p: [-40, -27], r: 2.6, rw: [['heart', 0, 0], ['ammo', 1.4, 0]] }, { id: 'pods', p: [-40, 40], r: 3, rw: [['star', 0, 0], ['chicken', 1.2, 0]] }],
    spawns: [[-50, -30], [50, -34], [-58, 0], [58, 10], [-40, 50], [40, 52], [0, -60], [-24, -56], [24, -58], [60, -20], [-60, 30]],
    landmarks(add, T) {
      const tree = new THREE.Group(); tree.position.set(0, T.height(0, -52), -52);
      tree.add(mesh(new THREE.CylinderGeometry(1.2, 2.2, 12, 14), lam(0xe8dcf4), 0, 6, 0)); tree.add(mesh(new THREE.SphereGeometry(8, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .5, 1), glowM(0xff5fd0), 0, 11.8, 0));
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; tree.add(mesh(new THREE.SphereGeometry(.5, 12, 8), glowM(0xffffff), Math.cos(a) * 5, 13, Math.sin(a) * 5)); }
      add(tree, 2.2, 0, -52);
      const ufo = new THREE.Group(); ufo.position.set(32, T.height(32, -14) + .6, -14); ufo.rotation.set(.35, 0, .25);
      ufo.add(mesh(new THREE.SphereGeometry(4, 32, 12).scale(1, .22, 1), lam(0xc8ccd8, { metalness: .6, roughness: .25 }))); ufo.add(mesh(new THREE.SphereGeometry(1.8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8ff0ff, transparent: true, opacity: .5, roughness: .05 }), 0, .5, 0));
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ufo.add(mesh(new THREE.SphereGeometry(.22, 10, 8), glowM([0xffe14a, 0xff5fd0][i % 2]), Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4)); }
      add(ufo, 3.2, 32, -14);
      const tower = new THREE.Group(); tower.position.set(-34, T.height(-34, -22), -22);
      for (let i = 0; i < 12; i++) { const b = mesh(new THREE.BoxGeometry(2.4 - i * .12, .9, 2.4 - i * .12), lam(i % 2 ? 0x2cf0a0 : 0x8b5cff, { roughness: .4 }), 0, .45 + i * .9, 0); b.rotation.y = i * .3; tower.add(b); }
      add(tower, 1.6, -34, -22);
      T.floaters = [];
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const r = mesh(lumpy(new THREE.DodecahedronGeometry(2 + i % 3, 1), .15, i), lam(0x5a2a9a, { flatShading: true }), Math.cos(a) * 45, 22 + (i % 3) * 6, Math.sin(a) * 45); T.root.add(r); T.floaters.push(r); }
      for (const [x, y, z, r, c] of [[-90, 70, -120, 14, 0xffe0a0], [70, 50, -130, 8, 0x8ff0e0]]) T.root.add(mesh(new THREE.SphereGeometry(r, 28, 18), new THREE.MeshBasicMaterial({ color: c, fog: false }), x, y, z));
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; add(mesh(new THREE.SphereGeometry(.7, 14, 10), glowM([0x8ff04a, 0x45d7ff, 0xff5fd0][i % 3]), -40 + Math.cos(a) * 4.5, T.height(-40 + Math.cos(a) * 4.5, 40 + Math.sin(a) * 4.5) + .6, 40 + Math.sin(a) * 4.5), a > 1.2 && a < 1.9 ? 0 : .8, -40 + Math.cos(a) * 4.5, 40 + Math.sin(a) * 4.5); }
    },
  },
};

// ---------- planet worlds (Saturn → Sun) ----------
function bandTex(cols, rot = 0) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  let y = 0; while (y < 128) { const h = 4 + Math.random() * 14; x.fillStyle = cols[Math.floor(Math.random() * cols.length)]; x.fillRect(0, y, 256, h + 1); y += h; }
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 128, 20 + Math.random() * 30, 3 + Math.random() * 5, 0, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const HEART = (x, z) => { const u = x / 18, v = -(z - 4) / 18; return (u * u + v * v - 1) ** 3 - u * u * v * v * v < 0; };
const PDEF = {
  saturn:  { sky: [0x0a0818, 0x3a3050], fog: [0x2a2440, 90, 230], hemi: [0xfff0d0, 0x5a4a30, 1.2], sun: [0xfff0d0, 3.6], g: [0xe8d8a8, 0xc8b078, 0x9a8458], gravity: .8, rock: [0xd8c8a0, 0xb8a880, 0xf0e8d0], cry: [0xffe8a0, 0xfff4d0, 0xe8c060], stars: true, body: { r: 42, pos: [-70, 55, -130], cols: ['#e8d098', '#d8b870', '#f0e0b0', '#c8a060', '#b89050'], ring: [0xf0dcb0, 1.35] }, lander: 'probe', rug: 1 },
  mars:    { sky: [0xb85a30, 0xf4c098], fog: [0xe8a878, 45, 175], hemi: [0xffe0c0, 0x8a3a1a, 1.6], sun: [0xfff0e0, 3.2], g: [0xc0582a, 0xd87a48, 0x8a3818], gravity: .42, rock: [0x9a3a1a, 0x7a2a10, 0xb85a30], cry: null, motes: 0xffc8a0, moons: true, lander: 'rover', rug: 1.4 },
  venus:   { sky: [0xd89020, 0xfff0a0], fog: [0xf0c860, 25, 110], hemi: [0xfff0b0, 0x8a6a20, 1.7], sun: [0xfff8d0, 2.2], g: [0xc89a40, 0xe8b858, 0x7a5a20], gravity: .9, rock: [0x8a6a3a, 0x6a4a2a, 0xa88a4a], basalt: true, lava: 0xff6a1a, motes: 0xffe080, lander: 'probe', rug: 1.2 },
  mercury: { sky: [0x000000, 0x1a1410], fog: [0x100c0a, 90, 230], hemi: [0xfff8f0, 0x3a3028, 1], sun: [0xffffff, 5], g: [0x8a8078, 0xa89a90, 0x5a524a], gravity: .38, rock: [0x7a706a, 0x6a605a, 0x9a8e86], cry: [0xffd43b, 0xfff0a0, 0xff8a2a], stars: true, bigSun: true, lander: 'probe', rug: 1.6 },
  uranus:  { sky: [0x1a6a7a, 0xa8f4f4], fog: [0xa0ecf4, 55, 185], hemi: [0xe8ffff, 0x4a8a9a, 1.5], sun: [0xe0f8ff, 2.8], g: [0x9ae8e0, 0xc8fff8, 0x5ab8c0], gravity: .9, rock: [0xc8f0f4, 0xa8e0e8, 0xe8ffff], cry: [0x9af0ff, 0xffffff, 0x8a9aff], ring: [0xc8ffff, 1.35], lander: 'probe', rug: .8 },
  neptune: { sky: [0x06104a, 0x3a6ae8], fog: [0x2a4ab8, 40, 165], hemi: [0xc8dcff, 0x1a2a6a, 1.4], sun: [0xc8dcff, 2.6], g: [0x2a4ab8, 0x3a6ad8, 0x1a2a7a], gravity: 1.1, rock: [0x3a4a8a, 0x2a3a6a, 0x5a6aaa], cry: [0x45d7ff, 0x9ab8ff, 0xffffff], spire: [0x1a3a9a, 0x2a4ab8, 0x3a6ad8], motes: 0xc8e0ff, lander: 'probe', rug: 1 },
  pluto:   { sky: [0x02020a, 0x1a1428], fog: [0x0a0814, 90, 230], hemi: [0xf0e8ff, 0x5a4a6a, 1.1], sun: [0xfff4e0, 2.8], g: [0xe8e0e4, 0xd8ccd4, 0x9a8a98], gravity: .3, rock: [0xd8d0d8, 0xc0b4c0, 0xf0e8f0], cry: [0xffc8d8, 0xffffff, 0xc8b8ff], stars: true, heart: true, charon: true, lander: 'probe', rug: .9 },
  sun:     { sky: [0x3a0600, 0xff8a2a], fog: [0xff7a2a, 35, 140], hemi: [0xffe8b0, 0xff4a00, 1.7], sun: [0xfff4c0, 3.2], g: [0xff9a20, 0xffc040, 0xc84000], gravity: 1.15, rock: [0x8a2a00, 0xa83a00, 0x6a1a00], cry: [0xffe060, 0xffffff, 0xffa020], lava: 0xfff0a0, glowGround: 0x5a1a00, motes: 0xffd070, flares: true, lander: 'pylon', rug: 1.3 },
};
function planetTheme(id) {
  const P = PDEF[id];
  const props = [{ kind: 'rock', n: 40, s: [.4, 1.5], col: .9, pal: P.rock }];
  if (P.cry) props.push({ kind: 'crystal', n: 24, s: [.7, 1.5], col: .5, pal: P.cry });
  if (P.basalt) props.push({ kind: 'basalt', n: 20, s: [.7, 1.3], col: 1.1 });
  if (P.spire) props.push({ kind: 'spire', n: 16, s: [.6, 1.2], col: .7, pal: P.spire });
  const T = {
    sky: P.sky, fog: P.fog, hemi: P.hemi, sun: P.sun, surface: id === 'sun' || id === 'venus' ? 'rock' : 'metal', gravity: P.gravity, stars: P.stars, sunPos: [-60, 50, 30],
    lavaY: P.lava ? -1.15 : undefined, lavaColor: P.lava, groundEmissive: P.glowGround, motes: P.motes,
    height(x, z) {
      let h = .3 * P.rug * Math.sin(x * .12) * Math.cos(z * .1) + .18 * P.rug * Math.sin((x - z) * .19);
      for (const [cx, cz, r, dp] of CRATERS) { const d = hyp(x - cx, z - cz); if (d < r) h -= dp * (1 - (d / r) ** 2); else if (d < r * 1.4) h += dp * .4 * Math.sin((d - r) / (r * .4) * Math.PI); }
      return h + edgeRise(x, z, 8);
    },
    color(x, z, h, c) {
      c.set(P.g[0]).lerp(new THREE.Color(P.g[1]), .5 + .5 * Math.sin(x * .33) * Math.cos(z * .29));
      if (h < -.6) c.lerp(new THREE.Color(P.g[2]), clamp01((-.6 - h) / 1.5));
      if (P.heart && HEART(x, z)) c.lerp(new THREE.Color(0xffd0dc), .75);
      if (P.lava && h < -.95) c.set(0x3a1a0a);
    },
    props, clear: [[0, 30, 8], [30, -6, 10], [-30, -18, 6], [0, -40, 10]],
    spawn: [0, 30], boss: [0, -40], bossSafe: [0, 12], spots: [[42, 14], [-40, 30], [-8, -52]],
    secrets: [{ id: 'lander', p: [-35, -24], r: 2.6, rw: [['mystery', 0, 0]] }, { id: 'crater', p: [-30, -30], r: 3, rw: [['heart', 0, 0], ['ammo', 1.4, 0]] }, { id: 'dish', p: [46, -46], r: 3, rw: [['star', 0, 0], ['chicken', 1.2, 0]] }],
    spawns: [[-50, -40], [50, -34], [-58, 0], [58, 10], [-40, 50], [40, 52], [0, -60], [-24, -54], [24, -58], [60, -20], [-60, 30]],
    landmarks(add, T) {
      const glass = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: .35, roughness: .05, metalness: .4, depthWrite: false });
      for (const [x, z, r] of [[30, -6, 5], [38, 2, 3.2], [24, 2, 3]]) { add(mesh(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), glass, x, T.height(x, z) - .1, z)); add(mesh(new THREE.CylinderGeometry(r + .1, r + .1, .4, 28), lam(0xdfe4f0, { metalness: .5, roughness: .3 }), x, T.height(x, z) + .1, z), r + .2, x, z); }
      const L = new THREE.Group(); L.position.set(-30, T.height(-30, -18), -18);
      if (P.lander === 'rover') {
        L.add(mesh(new THREE.BoxGeometry(3.4, 1, 2.2), lam(0xf0f0f4, { metalness: .3 }), 0, 1.5, 0));
        for (const [x, z] of [[-1.3, 1.2], [0, 1.2], [1.3, 1.2], [-1.3, -1.2], [0, -1.2], [1.3, -1.2]]) { const wh = mesh(new THREE.CylinderGeometry(.5, .5, .4, 16), lam(0x2a2a30), x, .5, z); wh.rotation.x = Math.PI / 2; L.add(wh); }
        L.add(mesh(new THREE.CylinderGeometry(.08, .08, 1.6, 8), lam(0xc8ccd8), .9, 2.8, 0)); L.add(mesh(new THREE.BoxGeometry(.6, .4, .5), lam(0xe8e8f0), .9, 3.7, 0)); L.add(mesh(new THREE.SphereGeometry(.12, 10, 8), glowM(0x45d7ff), .9, 3.7, .27));
        L.add(mesh(new THREE.BoxGeometry(2.6, .06, 1.6), lam(0x2a3a8a, { metalness: .6, roughness: .2 }), -.4, 2.05, 0));
      } else if (P.lander === 'pylon') {
        for (let i = 0; i < 3; i++) L.add(mesh(new THREE.CylinderGeometry(.5 - i * .1, .6 - i * .1, 3, 10), lam(0x4a1a00, { metalness: .5 }), 0, 1.5 + i * 3, 0));
        L.add(mesh(new THREE.SphereGeometry(1, 20, 14), glowM(0xffffff), 0, 10, 0));
      } else {
        L.add(mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), lam(0xe8b840, { metalness: .8, roughness: .25 }), 0, 1.6, 0));
        for (const s of [-1, 1]) { const pn = mesh(new THREE.BoxGeometry(3, .06, 1.2), lam(0x2a3a8a, { metalness: .6, roughness: .2 }), s * 2.4, 1.8, 0); L.add(pn); }
        const d = mesh(new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 3), lam(0xf0f0f4, { side: THREE.DoubleSide }), 0, 2.8, 0); d.rotation.x = Math.PI; L.add(d);
        for (const [x, z] of [[-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) { const leg = mesh(new THREE.CylinderGeometry(.05, .05, 1.2, 6), lam(0xc8ccd8), x, .5, z); leg.rotation.z = x * .4; L.add(leg); }
      }
      add(L, 1.8, -30, -18);
      const flag = new THREE.Group(); flag.position.set(-26, T.height(-26, -14), -14); flag.add(mesh(new THREE.CylinderGeometry(.04, .04, 2.4, 6), lam(0xdfe4f0), 0, 1.2, 0)); flag.add(mesh(new THREE.PlaneGeometry(1, .6), lam(0xff5fa8, { side: THREE.DoubleSide }), .5, 2.1, 0)); add(flag);
      const dish = new THREE.Group(); dish.position.set(44, T.height(44, -44), -44); dish.add(mesh(new THREE.CylinderGeometry(.2, .3, 4, 8), lam(0xc8ccd8), 0, 2, 0));
      const bowl = mesh(new THREE.SphereGeometry(3, 24, 10, 0, Math.PI * 2, 0, Math.PI / 3), lam(0xe8ecf4, { side: THREE.DoubleSide, metalness: .4, roughness: .3 }), 0, 5, 0); bowl.rotation.x = Math.PI * .75; dish.add(bowl); add(dish, 1, 44, -44);
      // sky bodies
      const sky = (m) => { m.castShadow = m.receiveShadow = false; T.root.add(m); return m; };
      if (P.body) { const b = sky(mesh(new THREE.SphereGeometry(P.body.r, 40, 24), new THREE.MeshBasicMaterial({ map: bandTex(P.body.cols), fog: false }), ...P.body.pos)); b.rotation.z = .35; T.spin = b;
        if (P.body.ring) { const rg = sky(mesh(new THREE.RingGeometry(P.body.r * 1.3, P.body.r * 2.2, 64), new THREE.MeshBasicMaterial({ color: P.body.ring[0], side: THREE.DoubleSide, transparent: true, opacity: .75, fog: false }), ...P.body.pos)); rg.rotation.set(P.body.ring[1], 0, .35); } }
      if (P.ring) { const rg = sky(mesh(new THREE.TorusGeometry(150, 6, 6, 80), new THREE.MeshBasicMaterial({ color: P.ring[0], transparent: true, opacity: .35, fog: false }), 0, 40, -60)); rg.rotation.set(.3, P.ring[1], 0); }
      if (P.moons) { sky(mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc8a890, fog: false }), 70, 80, -120)); sky(mesh(new THREE.SphereGeometry(2.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xa89080, fog: false }), -90, 60, -100)); }
      if (P.charon) sky(mesh(new THREE.SphereGeometry(14, 24, 16), new THREE.MeshBasicMaterial({ color: 0xb8aab0, fog: false }), 80, 60, -140));
      if (P.bigSun) { sky(mesh(new THREE.SphereGeometry(40, 32, 20), new THREE.MeshBasicMaterial({ color: 0xfff0a0, fog: false }), -120, 70, 80)); sky(mesh(new THREE.SphereGeometry(55, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: .25, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }), -120, 70, 80)); }
      if (P.flares) { T.flares = []; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const f = sky(mesh(new THREE.TorusGeometry(10 + i % 3 * 4, 1.4, 8, 32, Math.PI), new THREE.MeshBasicMaterial({ color: [0xffe060, 0xff8a1a, 0xffffff][i % 3], transparent: true, opacity: .8, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }), Math.cos(a) * 95, -2, Math.sin(a) * 95)); f.rotation.y = -a + Math.PI / 2; T.flares.push(f); } }
    },
  };
  return T;
}
for (const id of Object.keys(PDEF)) THEMES[id] = planetTheme(id);
export function registerTheme(id, P) { PDEF[id] = P; THEMES[id] = planetTheme(id); }

function mesh(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; return m; }

export function buildTheme(scene, id, quality) {
  const T = THEMES[id]; const rand = rng(id.length * 17 + 3); const col = new THREE.Color();
  const root = new THREE.Group(); scene.add(root); T.root = root; T.extraH = null; T.spin = null; T.floaters = null; T.flares = null;
  const W = { id, root, colliders: [], boxes: [], R, waterY: T.waterY ?? -99, gravity: T.gravity ?? 1, surface: T.surface }; T.W = W;
  const H = (x, z) => { if (T.extraH) { const e = T.extraH(x, z); if (e !== null) return e; } return T.height(x, z); };
  setHeightFn(H); W.getHeight = H;
  // sky
  const skyGeo = new THREE.SphereGeometry(200, 24, 12); const sc = []; const top = new THREE.Color(T.sky[0]), hor = new THREE.Color(T.sky[1]);
  for (let i = 0; i < skyGeo.attributes.position.count; i++) { const y = skyGeo.attributes.position.getY(i) / 200; col.copy(hor).lerp(top, Math.max(0, y) ** .45); sc.push(col.r, col.g, col.b); }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  W.skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }); root.add(new THREE.Mesh(skyGeo, W.skyMat));
  if (T.stars) { const n = 1600, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rand() * 6.28, b = Math.acos(rand() * 1.9 - .9); p.set([Math.sin(b) * Math.cos(a) * 180, Math.cos(b) * 180, Math.sin(b) * Math.sin(a) * 180], i * 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, fog: false, sizeAttenuation: true }))); }
  scene.fog = new THREE.Fog(T.fog[0], T.fog[1], T.fog[2]);
  const sp = T.sunPos || [90, 110, -80];
  const sun = new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color: T.sun[0], fog: false })); sun.position.set(...sp); sun.lookAt(0, 0, 0); root.add(sun);
  W.hemi = new THREE.HemisphereLight(T.hemi[0], T.hemi[1], T.hemi[2]); root.add(W.hemi); const hemiI = T.hemi[2];
  const sl = W.sunLight = new THREE.DirectionalLight(T.sun[0], T.sun[1]); root.add(sl, sl.target);
  sl.castShadow = true; sl.shadow.mapSize.set(2048, 2048); const c2 = sl.shadow.camera; c2.left = c2.bottom = -34; c2.right = c2.top = 34; c2.near = 1; c2.far = 180; sl.shadow.bias = -.0006; sl.shadow.normalBias = .03; c2.layers.enable(1);
  const off = new THREE.Vector3(...sp).normalize().multiplyScalar(70);
  W.followSun = p => { sl.position.copy(p).add(off); sl.target.position.copy(p); sl.target.updateMatrixWorld(); };
  // lava material (used by landmarks too)
  if (T.lavaY !== undefined) T.lavaMat = new THREE.MeshStandardMaterial({ color: T.lavaColor || 0xff5a1f, emissive: T.lavaColor ? new THREE.Color(T.lavaColor).multiplyScalar(.8) : 0xff3a00, emissiveIntensity: 1.2, roughness: .6 });
  // ground
  const gg = new THREE.PlaneGeometry(260, 260, 130, 130); gg.rotateX(-Math.PI / 2); const gp = gg.attributes.position, gc = [];
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), h = T.height(x, z); gp.setY(i, h); T.color(x, z, h, col); gc.push(col.r, col.g, col.b); }
  gg.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); gg.computeVertexNormals();
  const tex = noiseTex(256, '#bdbdbd', .22, 8000); tex.repeat.set(70, 70);
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, roughness: id === 'space' ? 1 : .92, emissive: T.groundEmissive || 0 })); ground.receiveShadow = true; root.add(ground);
  if (T.water) { W.waterMat = new THREE.MeshStandardMaterial({ color: T.water.color, emissive: T.water.emissive ?? 0x0a4a6a, roughness: .06, metalness: .3, transparent: true, opacity: T.water.opacity }); W.water = new THREE.Mesh(new THREE.PlaneGeometry(420, 420).rotateX(-Math.PI / 2), W.waterMat); W.water.position.y = W.waterY; root.add(W.water); }
  if (T.lavaMat) { const lv = new THREE.Mesh(new THREE.PlaneGeometry(260, 260).rotateX(-Math.PI / 2), T.lavaMat); lv.position.y = T.lavaY; root.add(lv); }
  // landmarks
  const add = (obj, colR = 0, cx, cz) => { obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); root.add(obj); if (colR) W.colliders.push({ x: cx ?? obj.position.x, z: cz ?? obj.position.z, r: colR }); };
  T.landmarks(add, T);
  // props
  const clears = [...T.clear, ...T.spots.map(([x, z]) => [x, z, 3]), ...T.secrets.map(s => [s.p[0], s.p[1], s.r + 1])];
  const okAt = (x, z) => hyp(x, z) < R - 4 && !clears.some(([cx, cz, r]) => hyp(x - cx, z - cz) < r);
  const d = new THREE.Object3D();
  for (const def of T.props) {
    const parts = PROPS[def.kind](def.pal); const list = []; let tries = 0;
    while (list.length < def.n && tries++ < def.n * 60) {
      const a = rand() * 6.28, r = Math.sqrt(rand()) * (R - 4), x = Math.cos(a) * r, z = Math.sin(a) * r, h = T.height(x, z);
      if (!okAt(x, z) || (def.minH !== undefined && h < def.minH) || (def.maxH !== undefined && h > def.maxH)) continue;
      if (T.lavaY !== undefined && h < T.lavaY + .5) continue;
      const s = def.s[0] + rand() * (def.s[1] - def.s[0]);
      if (def.col && W.colliders.some(c => hyp(c.x - x, c.z - z) < c.r + def.col * s + 1.2)) continue;
      list.push([x, z, s, rand()]); if (def.col) W.colliders.push({ x, z, r: def.col * s });
    }
    for (const pt of parts) {
      const m = new THREE.InstancedMesh(pt.geo, pt.mat, list.length);
      list.forEach(([x, z, s, rr], i) => { d.position.set(x, T.height(x, z) - .05, z); d.rotation.set(0, rr * 6.28, 0); d.scale.set(s, s * (.9 + rr * .25), s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); if (pt.pal) m.setColorAt(i, col.set(pt.pal[Math.floor(rr * 997) % pt.pal.length])); });
      m.castShadow = !(pt.mat.isMeshBasicMaterial); m.receiveShadow = true; root.add(m);
    }
  }
  // grass
  W.grass = null;
  if (T.grass) {
    const blade = (a, h) => { const g = new THREE.BufferGeometry(); const c = Math.cos(a) * .06, s = Math.sin(a) * .06, lx = Math.cos(a + .5) * .12, lz = Math.sin(a + .5) * .12; g.setAttribute('position', new THREE.Float32BufferAttribute([-c, 0, -s, c, 0, s, lx, h, lz], 3)); g.computeVertexNormals(); return g; };
    const tuft = mergeGeos([blade(0, .55), blade(2.1, .45), blade(4.2, .5), blade(1.1, .38), blade(3.3, .42)]);
    const n = T.grass.n, m = new THREE.InstancedMesh(tuft, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 1 }), n); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = (rand() - .5) * 2 * R, z = (rand() - .5) * 2 * R; const h = T.height(x, z); if (hyp(x, z) > R || h < T.grass.minH) continue; d.position.set(x, h - .02, z); d.rotation.set(0, rand() * 6.28, 0); d.scale.set(1, .7 + rand() * .9, 1); d.updateMatrix(); m.setMatrixAt(k, d.matrix); m.setColorAt(k, col.set(T.grass.pal[k % T.grass.pal.length])); k++; }
    m.count = k; m.receiveShadow = true; root.add(m); W.grass = m;
  }
  // embers / space dust
  let motes = null;
  if (id === 'volcano' || id === 'alien' || id === 'space' || T.motes) {
    const n = 260, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set([(rand() - .5) * 60, rand() * 14, (rand() - .5) * 60], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const dc = document.createElement('canvas'); dc.width = dc.height = 32; const dx = dc.getContext('2d'); const gr = dx.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); dx.fillStyle = gr; dx.fillRect(0, 0, 32, 32);
    motes = new THREE.Points(g, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dc), color: T.motes || (id === 'volcano' ? 0xffa040 : id === 'alien' ? 0xc8ffb0 : 0xffffff), size: id === 'space' ? .1 : .22, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })); motes.frustumCulled = false; root.add(motes);
  }
  // mission beacon at spawn (lights up when mission is done)
  const bm = new THREE.MeshStandardMaterial({ color: 0x8a90a8, emissive: 0 });
  const bx = T.spawn[0] + 9, bz = T.spawn[1] - 6;
  add(mesh(new THREE.CylinderGeometry(.3, .5, 3, 10), lam(0x5a6080, { metalness: .4 }), bx, H(bx, bz) + 1.5, bz), .6, bx, bz); add(mesh(new THREE.SphereGeometry(.7, 20, 14), bm, bx, H(bx, bz) + 3.6, bz));
  W.setPower = on => { bm.emissive.set(on ? 0xffe14a : 0); bm.color.set(on ? 0xfff2a0 : 0x8a90a8); };
  // data
  W.spawn = V3(...T.spawn); W.bossSpawn = V3(...T.boss); W.bossSafe = V3(...T.bossSafe);
  W.enemySpawns = T.spawns.map(([x, z]) => V3(x, z));
  W.secrets = T.secrets.map(s => ({ id: s.id, pos: V3(...s.p), r: s.r, rewards: s.rw }));
  W.batterySpots = T.spots.map(([x, z]) => V3(x, z));
  W.okSpot = (x, z) => H(x, z) > W.waterY + .1 && (T.lavaY === undefined || H(x, z) > T.lavaY + .6);
  W.hazard = p => {
    if (T.lavaY === undefined) return null;
    if (p.y < T.lavaY + .35) return 'lava';
    if (T.craterY !== undefined && hyp(p.x - VOLC.x, p.z - VOLC.z) < 4.4 && p.y < T.craterY + .3) return 'lava';
    return null;
  };
  W.setQuality = q => { if (W.grass) W.grass.visible = q !== 'low'; sl.castShadow = q !== 'low'; };
  W.setQuality(quality);
  W.bossT = 0; W.bossK = 0; W.boss = on => { W.bossT = on ? 1 : 0; };
  const fogC = new THREE.Color(T.fog[0]), fogB = new THREE.Color(0x3a1a4a);
  W.update = (dt, t) => {
    W.bossK += (W.bossT - W.bossK) * Math.min(1, dt * 1.2);
    scene.fog.color.copy(fogC).lerp(fogB, W.bossK * .6); W.hemi.intensity = hemiI * (1 - W.bossK * .3);
    W.skyMat.color.setRGB(1 - W.bossK * .35, 1 - W.bossK * .5, 1 - W.bossK * .15);
    if (W.water) { W.water.position.y = W.waterY + Math.sin(t * 1.3) * .04; W.waterMat.emissiveIntensity = .8 + Math.sin(t * 2) * .2; }
    if (T.lavaMat) T.lavaMat.emissiveIntensity = 1.1 + Math.sin(t * 2.2) * .3;
    if (T.spin) T.spin.rotation.y += dt * .03;
    if (T.flares) T.flares.forEach((f, i) => { const s = 1 + Math.sin(t * .7 + i * 1.7) * .25; f.scale.set(s, s, 1); f.material.opacity = .55 + Math.sin(t * 1.3 + i) * .3; });
    if (T.floaters) T.floaters.forEach((f, i) => { f.position.y += Math.sin(t * .8 + i) * dt * .6; f.rotation.y += dt * .1; });
    if (motes) { const a = motes.geometry.attributes.position, pl = W._p; for (let i = 0; i < a.count; i++) { let y = a.getY(i) + dt * (id === 'volcano' ? 1.4 : .3); if (y > 14) y = 0; a.setY(i, y); } a.needsUpdate = true; if (pl) motes.position.set(pl.x, pl.y - 2, pl.z); }
  };
  const fs = W.followSun; W.followSun = p => { W._p = p; fs(p); };
  return W;
}
