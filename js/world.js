import * as THREE from 'three';

export const R = 72;
export const WATER_Y = -.75;
export const streamZ = x => 7 * Math.sin(x * .055) + 3;

const FLATS = [[34, -16, 8, .25], [0, -42, 15, .1], [0, 30, 7, .2], [7, 27, 4, .2], [-50, 24, 6, .4]];
export function smooth(k) { return k * k * (3 - 2 * k); }
export function baseH(x, z) {
  let h = .55 * Math.sin(x * .07 + 1) * Math.cos(z * .06) + .35 * Math.sin((x - z) * .1) + .2 * Math.cos(x * .15 + z * .05);
  for (const [cx, cz, r, t] of FLATS) { const d = Math.hypot(x - cx, z - cz); if (d < r) h += (t - h) * smooth(1 - d / r); }
  const sd = Math.abs(z - streamZ(x)); if (sd < 4.6) h -= smooth(1 - sd / 4.6) * 1.8;
  const r = Math.hypot(x, z); if (r > R - 8) h += smooth(Math.min(1, (r - (R - 8)) / 16)) * 7;
  return h;
}
const BR = { x: 0, hw: 1.8, z0: -3.2, z1: 9.2 };
let HF = woodsHeight;
export function setHeightFn(f) { HF = f; }
export function getHeight(x, z) { return HF(x, z); }
function woodsHeight(x, z) {
  let h = baseH(x, z);
  if (Math.abs(x - BR.x) < BR.hw && z > BR.z0 && z < BR.z1) h = Math.max(h, .25 + .45 * Math.sin((z - BR.z0) / (BR.z1 - BR.z0) * Math.PI));
  return h;
}

export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function mergeGeos(list) {
  const pos = [], nor = [];
  for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
export const lam = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: 0, flatShading: false, ...o });
// noise-displaced geometry for organic, less "blocky" shapes
export function lumpy(geo, amt, seed = 1) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 3.1 + seed) * Math.cos(v.y * 2.7 + seed * 2) * Math.sin(v.z * 3.3 + seed * 3); v.multiplyScalar(1 + n * amt); p.setXYZ(i, v.x, v.y, v.z); }
  if (geo.index) geo.computeVertexNormals(); else { const nn = geo.attributes.normal; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); nn.setXYZ(i, v.x, v.y, v.z); } }
  return geo;
}
export function noiseTex(size, base, vary, dots) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  for (let i = 0; i < dots; i++) { const l = Math.random(); x.fillStyle = `rgba(${l < .5 ? '0,0,0' : '255,255,255'},${Math.random() * vary})`; const s = 1 + Math.random() * 3; x.fillRect(Math.random() * size, Math.random() * size, s, s * (1 + Math.random() * 2)); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

const PATHS = [[0, 36, 0, -40], [0, 16, 32, -12], [0, 18, -42, 16], [-4, -30, -18, -48], [30, -10, 44, -2]];
function segDist(px, pz, [ax, az, bx, bz]) { const dx = bx - ax, dz = bz - az; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
const pathDist = (x, z) => Math.min(...PATHS.map(p => segDist(x, z, p)));

import { buildTheme } from './worlds.js';
export function disposeWorld(scene, W) {
  scene.remove(W.root);
  W.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
}
export function buildWorld(scene, quality = 'high', id = 'woods') {
  if (id !== 'woods') return buildTheme(scene, id, quality);
  setHeightFn(woodsHeight);
  const root = new THREE.Group(); scene.add(root);
  const W = { id, root, colliders: [], boxes: [], R, getHeight, streamZ, anim: [], waterY: WATER_Y, gravity: 1, surface: 'grass', okSpot: (x, z) => Math.abs(z - streamZ(x)) > 5, bossSafe: new THREE.Vector3(0, 0, -18) };
  const rand = rng(11);
  const col = new THREE.Color();

  // sky dome + fog
  const skyGeo = new THREE.SphereGeometry(190, 24, 12);
  const sc = []; const top = new THREE.Color(0x2f86e0), hor = new THREE.Color(0xd8f1ff);
  for (let i = 0; i < skyGeo.attributes.position.count; i++) { const y = skyGeo.attributes.position.getY(i) / 190; col.copy(hor).lerp(top, Math.max(0, y) ** .45); sc.push(col.r, col.g, col.b); }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  W.skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  W.sky = new THREE.Mesh(skyGeo, W.skyMat); root.add(W.sky);
  scene.fog = new THREE.Fog(0xd8f1ff, 55, 180);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color: 0xfff6c2, fog: false }));
  sun.position.set(90, 110, -80); sun.lookAt(0, 0, 0); root.add(sun);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: .25, fog: false, depthWrite: false, blending: THREE.AdditiveBlending })); glow.position.copy(sun.position).multiplyScalar(.99); glow.lookAt(0, 0, 0); root.add(glow);

  W.hemi = new THREE.HemisphereLight(0xdff2ff, 0x6a8a3a, 1.35); root.add(W.hemi);
  W.sunLight = new THREE.DirectionalLight(0xfff0d8, 3.4); W.sunLight.position.set(40, 60, 25); root.add(W.sunLight); root.add(W.sunLight.target);
  const sl = W.sunLight; sl.castShadow = true; sl.shadow.mapSize.set(2048, 2048); const sc2 = sl.shadow.camera; sc2.left = sc2.bottom = -34; sc2.right = sc2.top = 34; sc2.near = 1; sc2.far = 160; sl.shadow.bias = -.0006; sl.shadow.normalBias = .03;
  sc2.layers.enable(1);
  W.sunOff = new THREE.Vector3(40, 60, 25);
  W.followSun = p => { sl.position.copy(p).add(W.sunOff); sl.target.position.copy(p); sl.target.updateMatrixWorld(); };

  // ground
  const gg = new THREE.PlaneGeometry(230, 230, 115, 115); gg.rotateX(-Math.PI / 2);
  const gp = gg.attributes.position, gc = [];
  const g1 = new THREE.Color(0x4f9a36), g2 = new THREE.Color(0x76b246), dirt = new THREE.Color(0xa87a4e), sand = new THREE.Color(0xd8c088), bed = new THREE.Color(0x3f8fa8), edge = new THREE.Color(0x3f9a45);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i); const h = baseH(x, z); gp.setY(i, h);
    col.copy(g1).lerp(g2, .5 + .5 * Math.sin(x * .21 + Math.cos(z * .17) * 2));
    const pd = pathDist(x, z); if (pd < 2.4) col.lerp(dirt, smooth(Math.min(1, (2.4 - pd) / 1.2)));
    const sd = Math.abs(z - streamZ(x)); if (sd < 5.2) col.lerp(sand, smooth(Math.min(1, (5.2 - sd) / 1.5)));
    if (h < WATER_Y + .1) col.copy(bed);
    const r = Math.hypot(x, z); if (r > R - 6) col.lerp(edge, Math.min(1, (r - R + 6) / 8));
    gc.push(col.r, col.g, col.b);
  }
  gg.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); gg.computeVertexNormals();
  const grassTex = noiseTex(256, '#b9b9b9', .22, 9000); grassTex.repeat.set(70, 70);
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, map: grassTex, roughness: .95 })); ground.receiveShadow = true; root.add(ground);

  // stream ribbon
  const wp = [], wi = [];
  for (let x = -115, i = 0; x <= 115; x += 2.5, i++) { const z = streamZ(x); wp.push(x, WATER_Y, z - 4.4, x, WATER_Y, z + 4.4); if (i) { const a = (i - 1) * 2; wi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.setIndex(wi); wg.computeVertexNormals();
  W.waterMat = new THREE.MeshStandardMaterial({ color: 0x3aa8e0, emissive: 0x0b5a8c, roughness: .08, metalness: .35, transparent: true, opacity: .82 });
  root.add(new THREE.Mesh(wg, W.waterMat));

  // bridge
  const wood = lam(0xb77a45), woodD = lam(0x8a5530);
  const bridge = new THREE.Group();
  for (let z = BR.z0 + .3; z < BR.z1; z += .62) { const y = .25 + .45 * Math.sin((z - BR.z0) / (BR.z1 - BR.z0) * Math.PI); const p = new THREE.Mesh(new THREE.BoxGeometry(3.6, .16, .54), wood); p.position.set(0, y - .08, z); bridge.add(p); }
  for (const sx of [-1.8, 1.8]) for (let z = BR.z0 + .3; z < BR.z1; z += 3) { const y = .25 + .45 * Math.sin((z - BR.z0) / (BR.z1 - BR.z0) * Math.PI); const post = new THREE.Mesh(new THREE.BoxGeometry(.18, 1, .18), woodD); post.position.set(sx, y + .4, z); bridge.add(post); }
  for (const sx of [-1.8, 1.8]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, 12.4), woodD); rail.position.set(sx, 1.05, 3); bridge.add(rail); }
  bridge.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); root.add(bridge);

  const clear = (x, z) => {
    if (pathDist(x, z) < 3.8) return false;
    if (Math.abs(z - streamZ(x)) < 5.5) return false;
    for (const [cx, cz, r] of [[34, -16, 9], [0, -42, 17], [0, 30, 9], [7, 27, 5], [-50, 24, 8], [0, -60, 12], [-36, 47, 5], [42, -2, 3], [-44, 8, 3], [-16, -50, 3]]) if (Math.hypot(x - cx, z - cz) < r) return false;
    return true;
  };

  // trees (instanced)
  const trunkG = new THREE.CylinderGeometry(.14, .28, 1.8, 10, 3).translate(0, .9, 0);
  const pineG = mergeGeos([lumpy(new THREE.ConeGeometry(1.45, 1.9, 14, 3), .08, 1).translate(0, 1.9, 0), lumpy(new THREE.ConeGeometry(1.12, 1.6, 14, 3), .08, 2).translate(0, 2.75, 0), lumpy(new THREE.ConeGeometry(.78, 1.3, 12, 2), .08, 3).translate(0, 3.5, 0), new THREE.ConeGeometry(.4, .9, 10).translate(0, 4.2, 0)]);
  const roundG = mergeGeos([lumpy(new THREE.IcosahedronGeometry(1.35, 3), .12, 1).translate(0, 2.6, 0), lumpy(new THREE.IcosahedronGeometry(.95, 2), .14, 2).translate(.75, 3.3, .2), lumpy(new THREE.IcosahedronGeometry(.85, 2), .14, 3).translate(-.65, 3.1, -.4), lumpy(new THREE.IcosahedronGeometry(.8, 2), .14, 4).translate(.1, 3.7, -.5)]);
  const pines = [], rounds = [];
  let tries = 0;
  while (pines.length + rounds.length < 150 && tries++ < 4000) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * (R - 5); const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!clear(x, z)) continue;
    if (W.colliders.some(c => Math.hypot(c.x - x, c.z - z) < 3.2)) continue;
    const s = .8 + rand() * .55; (rand() < .55 ? pines : rounds).push([x, z, s, rand()]);
    W.colliders.push({ x, z, r: .45 * s + .15 });
  }
  for (let i = 0; i < 110; i++) { const a = i / 110 * Math.PI * 2 + rand() * .05, r = R - 1 + rand() * 9; (rand() < .6 ? pines : rounds).push([Math.cos(a) * r, Math.sin(a) * r, 1.2 + rand() * .7, rand()]); }
  const pineCols = [0x2a7a48, 0x33894f, 0x22703f, 0x3b9656], roundCols = [0x5da83a, 0x78b843, 0xe8923e, 0xf08bb8, 0x4f9a36, 0xe8b640];
  const inst = (geo, mat, list, cols) => {
    const m = new THREE.InstancedMesh(geo, mat, list.length); const d = new THREE.Object3D();
    list.forEach(([x, z, s, rr], i) => { d.position.set(x, baseH(x, z) - .1, z); d.rotation.set(0, rr * 6.28, 0); d.scale.set(s, s * (.9 + rr * .3), s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); if (cols) m.setColorAt(i, col.set(cols[Math.floor(rr * 997) % cols.length])); });
    m.castShadow = true; m.receiveShadow = true; root.add(m); return m;
  };
  const barkTex = noiseTex(64, '#8a5a36', .35, 600); barkTex.repeat.set(1, 3); const trunkMat = lam(0xffffff, { map: barkTex, roughness: 1 });
  inst(trunkG, trunkMat, pines); inst(trunkG, trunkMat, rounds);
  inst(pineG, lam(0xffffff, { roughness: .9 }), pines, pineCols); inst(roundG, lam(0xffffff, { roughness: .9 }), rounds, roundCols);

  // rocks
  const rocks = [];
  const addRock = (x, z, sx, sy, sz, rr = rand()) => { rocks.push([x, z, sx, sy, sz, rr]); W.colliders.push({ x, z, r: Math.max(sx, sz) * .85 }); };
  for (let i = 0; i < 26; i++) { const a = rand() * 6.28, r = 8 + rand() * (R - 14); const x = Math.cos(a) * r, z = Math.sin(a) * r; if (!clear(x, z) || W.colliders.some(c => Math.hypot(c.x - x, c.z - z) < 3)) continue; const s = .6 + rand() * 1.1; addRock(x, z, s, s * .75, s * (.8 + rand() * .4)); }
  // secret rock ring (west) with a gap facing west
  for (let i = 0; i < 9; i++) { const a = i / 10 * Math.PI * 2 + .35; addRock(-50 + Math.cos(a) * 5.2, 24 + Math.sin(a) * 5.2, 1.9, 2.6 + rand(), 1.9); }
  // cave rocks
  const caveRocks = [[-5.5, -58, 3.2, 6, 3.2], [5.5, -58, 3.2, 6.4, 3.2], [-9.5, -60, 3.6, 4.2, 3.6], [9.5, -60, 3.6, 4.4, 3.6], [0, -63.5, 9, 7.5, 5], [-14, -63, 4, 3.4, 4], [14, -62, 4, 3, 4]];
  for (const r of caveRocks) addRock(...r);
  { const rockTex = noiseTex(128, '#c8c8c8', .3, 3000); const m = new THREE.InstancedMesh(lumpy(new THREE.DodecahedronGeometry(1, 1), .12, 5), lam(0xffffff, { map: rockTex, flatShading: true, roughness: .95 }), rocks.length); m.castShadow = m.receiveShadow = true; const d = new THREE.Object3D(); const rc = [0x9a97a8, 0x8a8898, 0xa8a4b4, 0x7e7c8c];
    rocks.forEach(([x, z, sx, sy, sz, rr], i) => { d.position.set(x, baseH(x, z) + sy * .35, z); d.rotation.set(rr, rr * 5, rr * 2); d.scale.set(sx, sy, sz); d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, col.set(rc[i % 4])); }); root.add(m); }
  const lintel = new THREE.Mesh(lumpy(new THREE.DodecahedronGeometry(1, 1), .12, 6), lam(0x8a8898, { flatShading: true })); lintel.castShadow = true; lintel.scale.set(8, 2.6, 3.4); lintel.position.set(0, 7.2, -58); root.add(lintel);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(4.4, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x140a24 })); mouth.position.set(0, baseH(0, -56.5) - .2, -56.4); root.add(mouth);
  W.caveEyes = [];
  for (const [x, y] of [[-1.8, 2.2], [1.6, 3.2], [-.2, 1.2]]) { const g = new THREE.Group(); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe14a, fog: false })); e.position.x = s * .28; g.add(e); } g.position.set(x, baseH(0, -56.5) + y, -56.3); root.add(g); W.caveEyes.push(g); }
  W.colliders.push({ x: 0, z: -60.5, r: 4.8 });

  // cabin
  const cabin = new THREE.Group(); cabin.position.set(34, .25, -16);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 5), lam(0xa8703f)); walls.position.y = 1.6; cabin.add(walls);
  for (let y = .3; y < 3.2; y += .55) { const log = new THREE.Mesh(new THREE.BoxGeometry(7.1, .08, 5.1), lam(0x7d4f2a)); log.position.y = y; cabin.add(log); }
  const roofG = new THREE.CylinderGeometry(3.6, 3.6, 7.9, 3); roofG.rotateY(Math.PI / 2); roofG.rotateZ(Math.PI / 2);
  const roof = new THREE.Mesh(roofG, lam(0xe0523f)); roof.position.y = 3.2 + 1.8; cabin.add(roof);
  const chim = new THREE.Mesh(new THREE.BoxGeometry(.8, 2, .8), lam(0x9a90a8)); chim.position.set(2, 5.3, -1); cabin.add(chim);
  const doorPivot = new THREE.Group(); doorPivot.position.set(-.65, 0, 2.56); cabin.add(doorPivot);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, .14), lam(0x6b3f22)); door.position.set(.65, 1.15, 0); doorPivot.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), lam(0xffd43b)); knob.position.set(1.1, 1.1, .1); doorPivot.add(knob);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.3), new THREE.MeshBasicMaterial({ color: 0x2a160a })); hole.position.set(0, 1.15, 2.52); cabin.add(hole);
  for (const wx of [-2.3, 2.3]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .9), new THREE.MeshBasicMaterial({ color: 0x2a3a5c })); win.position.set(wx, 1.8, 2.53); cabin.add(win); for (const r of [.6, -.6]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(1.4, .14, .06), lam(0xc99a5e)); pl.position.set(wx, 1.8, 2.58); pl.rotation.z = r; cabin.add(pl); } }
  cabin.traverse(o => { if (o.isMesh && o.material.isMeshStandardMaterial) { o.castShadow = o.receiveShadow = true; } }); root.add(cabin);
  W.cabinDoor = doorPivot;
  W.boxes.push({ x0: 34 - 3.7, x1: 34 + 3.7, z0: -16 - 2.7, z1: -16 + 2.7 });
  W.doorSpot = new THREE.Vector3(34, 0, -12.4);

  // bushes (behind cabin hide a secret nook) + scattered
  const bushes = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; if (a > 1.2 && a < 1.9) continue; bushes.push([34 + Math.cos(a) * 3.4, -25 + Math.sin(a) * 3.4, 1.1 + rand() * .4]); }
  for (let i = 0; i < 40; i++) { const a = rand() * 6.28, r = 6 + rand() * (R - 10); const x = Math.cos(a) * r, z = Math.sin(a) * r; if (clear(x, z)) bushes.push([x, z, .6 + rand() * .6]); }
  { const m = new THREE.InstancedMesh(lumpy(new THREE.IcosahedronGeometry(1, 3), .15, 7), lam(0xffffff, { roughness: .9 }), bushes.length); m.castShadow = m.receiveShadow = true; const d = new THREE.Object3D();
    bushes.forEach(([x, z, s], i) => { d.position.set(x, baseH(x, z) + s * .5, z); d.scale.set(s, s * .8, s); d.rotation.y = i; d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, col.set([0x3f8f32, 0x4f9e38, 0x357f2e][i % 3])); }); root.add(m); }

  // mushrooms + flowers
  const shrooms = [];
  for (let i = 0; i < 26; i++) { const a = rand() * 6.28, r = 6 + rand() * (R - 10); const x = Math.cos(a) * r, z = Math.sin(a) * r; if (clear(x, z)) shrooms.push([x, z, .35 + rand() * .4]); }
  for (const [x, z] of [[-42, 30], [-44, 36], [-38, 33], [12, -40], [-12, -38], [14, -46], [-13, -46]]) { shrooms.push([x, z, 1.6 + rand() * .8]); W.colliders.push({ x, z, r: .5 }); }
  { const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(.3, .45, 1.4, 14).translate(0, .7, 0), lam(0xf4e6cc), shrooms.length); stem.castShadow = true;
    const capG = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.3, 0);
    const cap = new THREE.InstancedMesh(capG, lam(0xffffff, { roughness: .45 }), shrooms.length); cap.castShadow = true; const d = new THREE.Object3D();
    shrooms.forEach(([x, z, s], i) => { d.position.set(x, baseH(x, z), z); d.scale.setScalar(s); d.rotation.set(0, i, 0); d.updateMatrix(); stem.setMatrixAt(i, d.matrix); cap.setMatrixAt(i, d.matrix); cap.setColorAt(i, col.set([0xff4a5a, 0xff5fa8, 0xb05cff, 0xff8a2a][i % 4])); });
    root.add(stem, cap); }
  { const n = 320, m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.14, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), n); const d = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < 2000 && k < n; i++) { const x = (rand() - .5) * 2 * R, z = (rand() - .5) * 2 * R; if (Math.hypot(x, z) > R - 4 || Math.abs(z - streamZ(x)) < 5) continue; d.position.set(x, baseH(x, z) + .14, z); d.updateMatrix(); m.setMatrixAt(k, d.matrix); m.setColorAt(k, col.set([0xffffff, 0xffd43b, 0xff5fa8, 0x9d7bff, 0xff8a2a][k % 5])); k++; }
    m.count = k; root.add(m); }

  // grass blades (instanced tufts)
  W.grass = null;
  { const blade = (a, h) => { const g = new THREE.BufferGeometry(); const c = Math.cos(a) * .06, s = Math.sin(a) * .06, lx = Math.cos(a + .5) * .12, lz = Math.sin(a + .5) * .12;
      g.setAttribute('position', new THREE.Float32BufferAttribute([-c, 0, -s, c, 0, s, lx, h, lz], 3)); g.computeVertexNormals(); return g; };
    const tuft = mergeGeos([blade(0, .55), blade(2.1, .45), blade(4.2, .5), blade(1.1, .38), blade(3.3, .42)]);
    const n = 9000, m = new THREE.InstancedMesh(tuft, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 1 }), n); const d = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = (rand() - .5) * 2 * (R + 4), z = (rand() - .5) * 2 * (R + 4); if (Math.hypot(x, z) > R + 4 || Math.abs(z - streamZ(x)) < 4.2 || pathDist(x, z) < 1.8) continue;
      d.position.set(x, baseH(x, z) - .02, z); d.rotation.y = rand() * 6.28; d.scale.set(1, .7 + rand() * .9, 1); d.updateMatrix(); m.setMatrixAt(k, d.matrix); m.setColorAt(k, col.set([0x5a9e36, 0x6aae3e, 0x4a8e30, 0x7cb848][k % 4])); k++; }
    m.count = k; m.receiveShadow = true; root.add(m); W.grass = m; }

  // hollow log (secret 3)
  const log = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 6, 18, 1, true), lam(0xffffff, { map: barkTex, side: THREE.DoubleSide })); log.castShadow = true; log.rotation.z = Math.PI / 2; log.position.set(-36, baseH(-36, 45) + 1.1, 45); root.add(log);
  W.colliders.push({ x: -38, z: 45, r: 1.3 }, { x: -34, z: 45, r: 1.3 }, { x: -36, z: 45, r: 1.3 });

  // generator tower (mission) + string lights
  const gen = new THREE.Group(); gen.position.set(7, baseH(7, 27), 27);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.2), lam(0x6b7a99)); base.position.y = .6; gen.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.12, .14, 4, 6), lam(0x4a5570)); pole.position.y = 3; gen.add(pole);
  W.bulbMat = new THREE.MeshLambertMaterial({ color: 0x8a90a8, emissive: 0x000000 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.55, 12, 8), W.bulbMat); bulb.position.y = 5.3; gen.add(bulb);
  for (let i = 0; i < 3; i++) { const slot = new THREE.Mesh(new THREE.BoxGeometry(.3, .5, .1), lam(0x2a2f40)); slot.position.set(-.45 + i * .45, .7, .62); gen.add(slot); }
  gen.traverse(o => { if (o.isMesh) o.castShadow = true; }); root.add(gen); W.colliders.push({ x: 7, z: 27, r: 1.1 });
  W.lights = [];
  const lc = [0xff4a5a, 0xffd43b, 0x45d7ff, 0x8ff04a, 0xff5fa8];
  for (let z = 22, i = 0; z > -36; z -= 4.5, i++) { if (z > -4 && z < 10) continue; for (const sx of [-2.6, 2.6]) { const x = sx; const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.6, 5), woodD); post.position.set(x, baseH(x, z) + .8, z); root.add(post);
    const mat = new THREE.MeshLambertMaterial({ color: 0x777788, emissive: 0 }); const b = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), mat); b.position.set(x, baseH(x, z) + 1.7, z); root.add(b); W.lights.push({ mat, c: lc[(i + (sx > 0 ? 2 : 0)) % 5] }); } }
  W.setPower = on => { W.bulbMat.emissive.set(on ? 0xffe14a : 0); W.bulbMat.color.set(on ? 0xfff2a0 : 0x8a90a8); W.lights.forEach(l => { l.mat.emissive.set(on ? l.c : 0); l.mat.color.set(on ? l.c : 0x777788); }); };

  // clouds
  W.clouds = [];
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9aa6c8, fog: false });
  for (let i = 0; i < 10; i++) { const g = new THREE.Group(); for (let j = 0; j < 4; j++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + rand() * 3, 0), cloudMat); p.position.set(j * 4 - 6, rand() * 2, rand() * 3); p.scale.y = .55; g.add(p); } g.position.set((rand() - .5) * 240, 48 + rand() * 18, (rand() - .5) * 240); root.add(g); W.clouds.push(g); }

  W.spawn = new THREE.Vector3(0, 0, 30); W.spawnYaw = 0;
  W.bossSpawn = new THREE.Vector3(0, 0, -55);
  W.arena = new THREE.Vector3(0, 0, -42);
  W.enemySpawns = [[-50, -30], [50, -34], [-58, 0], [58, 12], [-40, 50], [40, 50], [0, -52], [-24, -54], [24, -52], [58, -12], [-60, 34], [22, 58], [-22, 58]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  W.secrets = [
    { id: 'cabin', pos: new THREE.Vector3(34, 0, -25), r: 2.6, rewards: [['mystery', 0, 0]] },
    { id: 'rocks', pos: new THREE.Vector3(-50, 0, 24), r: 3, rewards: [['star', -1, 0], ['chicken', 1, 0], ['weapon', 0, 1.4, 'scatter']] },
    { id: 'log', pos: new THREE.Vector3(-36, 0, 48.5), r: 2.4, rewards: [['heart', 0, 0], ['ammo', 1.4, .3]] },
  ];
  W.batterySpots = [new THREE.Vector3(44, 0, -2), new THREE.Vector3(-44, 0, 8), new THREE.Vector3(-17, 0, -49)];
  W.generator = gen.position.clone();

  W.boss = on => { W.bossT = on ? 1 : 0; };
  W.bossT = 0; W.bossK = 0;
  const fogDay = new THREE.Color(0xd8f1ff), fogBoss = new THREE.Color(0x5a3a8c);
  W.setQuality = q => { W.grass.visible = q !== 'low'; sl.castShadow = q !== 'low'; };
  W.setQuality(quality);
  W.update = (dt, t) => {
    W.waterMat.emissive.setRGB(.02, .16 + .04 * Math.sin(t * 2), .3 + .05 * Math.sin(t * 2.4));
    W.caveEyes.forEach((g, i) => { const b = Math.sin(t * .9 + i * 2.1); g.scale.y = b > .96 ? .1 : 1; g.visible = W.bossK < .5; });
    W.clouds.forEach((c, i) => { c.position.x += dt * (1.2 + i * .1); if (c.position.x > 140) c.position.x = -140; });
    W.bossK += (W.bossT - W.bossK) * Math.min(1, dt * 1.2);
    scene.fog.color.copy(fogDay).lerp(fogBoss, W.bossK);
    W.skyMat.color.setRGB(1 - W.bossK * .45, 1 - W.bossK * .6, 1 - W.bossK * .2);
    W.hemi.intensity = 1.35 - W.bossK * .4; W.sunLight.color.setRGB(1, .94 - W.bossK * .25, .82 + W.bossK * .1);
  };
  return W;
}

export function resolveCollision(W, p, radius) {
  for (const c of W.colliders) { const dx = p.x - c.x, dz = p.z - c.z, rr = c.r + radius; const d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), k = (rr - d) / d; p.x += dx * k; p.z += dz * k; } }
  for (const b of W.boxes) { if (p.x > b.x0 - radius && p.x < b.x1 + radius && p.z > b.z0 - radius && p.z < b.z1 + radius) {
    const l = p.x - (b.x0 - radius), r = (b.x1 + radius) - p.x, f = p.z - (b.z0 - radius), k = (b.z1 + radius) - p.z; const m = Math.min(l, r, f, k);
    if (m === l) p.x = b.x0 - radius; else if (m === r) p.x = b.x1 + radius; else if (m === f) p.z = b.z0 - radius; else p.z = b.z1 + radius; } }
  const d = Math.hypot(p.x, p.z), lim = (W.R || R) - 3; if (d > lim) { p.x *= lim / d; p.z *= lim / d; }
}
