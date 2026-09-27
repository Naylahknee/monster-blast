import * as THREE from 'three';
import { lam } from './world.js';

const SPH = new THREE.SphereGeometry(1, 28, 20);
const SPH_LO = new THREE.SphereGeometry(1, 14, 10);
const WHITE = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .15 });
const BLACK = new THREE.MeshBasicMaterial({ color: 0x1d1238 });
const SHINE = new THREE.MeshBasicMaterial({ color: 0xffffff });
const MOUTH = new THREE.MeshBasicMaterial({ color: 0x3a0f2a });
const TOOTH = lam(0xfffbe8);
const SHADOW_G = new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2);
const SHADOW_M = new THREE.MeshBasicMaterial({ color: 0x1d1238, transparent: true, opacity: .12, depthWrite: false });

const mesh = (g, m, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o; };

export function eye(size) {
  const g = new THREE.Group();
  g.add(mesh(SPH, WHITE, 0, 0, 0, size));
  const p = mesh(SPH_LO, BLACK, 0, 0, size * .62, size * .55); g.add(p);
  g.add(mesh(SPH_LO, SHINE, size * .18, size * .22, size * 1.02, size * .17));
  return g;
}
export function shadow(r) { const s = new THREE.Mesh(SHADOW_G, SHADOW_M); s.scale.setScalar(r); s.position.y = .04; return s; }

export function makeEnemy(type) {
  const g = new THREE.Group(), a = {};
  const inner = new THREE.Group(); g.add(inner); a.inner = inner;
  let body, mat;
  if (type === 'slime' || type === 'mini') {
    const s = type === 'mini' ? .5 : 1;
    mat = lam(type === 'mini' ? 0x9ef070 : 0x5fd84a, { emissive: 0x0d3a08, roughness: .22, metalness: .05 });
    body = mesh(SPH, mat, 0, .78 * s, 0, s, .78 * s, s); inner.add(body);
    inner.add(mesh(SPH_LO, SHINE, -.35 * s, 1.15 * s, .45 * s, .14 * s));
    for (const x of [-.32, .32]) { const e = eye(.22 * s); e.position.set(x * s, 1 * s, .72 * s); inner.add(e); }
    inner.add(mesh(SPH_LO, MOUTH, 0, .68 * s, .9 * s, .22 * s, .1 * s, .08 * s));
    g.add(shadow(1 * s));
  } else if (type === 'ghost') {
    mat = new THREE.MeshStandardMaterial({ color: 0xeef4ff, emissive: 0x3a4a6a, roughness: .3, transparent: true, opacity: .88 });
    body = mesh(SPH, mat, 0, .15, 0, .62, .7, .6); inner.add(body);
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(.62, .9, 16, 1, true), mat); skirt.rotation.x = Math.PI; skirt.position.y = -.35; inner.add(skirt); a.skirt = skirt;
    for (let i = 0; i < 5; i++) { const an = i / 5 * Math.PI * 2; inner.add(mesh(SPH_LO, mat, Math.cos(an) * .5, -.75, Math.sin(an) * .5, .16)); }
    for (const x of [-.2, .2]) inner.add(mesh(SPH_LO, BLACK, x, .3, .5, .1, .15, .06));
    inner.add(mesh(SPH_LO, BLACK, 0, .02, .56, .1, .12, .05));
    for (const s of [-1, 1]) { const arm = mesh(SPH_LO, mat, s * .6, -.05, .1, .14, .26, .14); arm.rotation.z = s * .6; inner.add(arm); }
    const sh = shadow(.6); g.add(sh); a.shadow = sh;
  } else if (type === 'hopper') {
    mat = lam(0x9be83a, { emissive: 0x1a3a04, roughness: .35 });
    body = mesh(SPH, mat, 0, .55, 0, .75, .5, .7); inner.add(body);
    inner.add(mesh(SPH, lam(0xfff6c0), 0, .45, .3, .55, .32, .45));
    for (const x of [-.3, .3]) { const e = eye(.2); e.position.set(x, .98, .35); inner.add(e); inner.add(mesh(SPH_LO, mat, x, .92, .3, .22)); }
    inner.add(mesh(new THREE.TorusGeometry(.32, .03, 6, 16, Math.PI), MOUTH, 0, .6, .62)).rotation;
    a.legs = [];
    for (const s of [-1, 1]) { const leg = new THREE.Group(); leg.position.set(s * .55, .35, -.25); inner.add(leg); leg.add(mesh(new THREE.CapsuleGeometry(.14, .4, 4, 8), mat, 0, 0, 0)); leg.children[0].rotation.x = 1.1; leg.add(mesh(SPH_LO, lam(0x7ac82a), 0, -.3, .25, .2, .06, .26)); a.legs.push(leg); }
    g.add(shadow(.8));
  } else if (type === 'bomber') {
    mat = lam(0x3a2a40, { emissive: 0x100008, roughness: .3, metalness: .2 });
    body = mesh(SPH, mat, 0, .55, 0, .55); inner.add(body);
    inner.add(mesh(new THREE.CylinderGeometry(.12, .12, .14, 10), lam(0x8a8098), 0, 1.12, 0));
    inner.add(mesh(new THREE.CylinderGeometry(.025, .025, .3, 5), lam(0xc9a27a), .05, 1.32, 0));
    a.spark = mesh(SPH_LO, new THREE.MeshBasicMaterial({ color: 0xffe14a }), .08, 1.5, 0, .09); inner.add(a.spark);
    for (const x of [-.2, .2]) { const e = eye(.14); e.position.set(x, .72, .42); inner.add(e); const brow = mesh(new THREE.BoxGeometry(1, 1, 1), lam(0xff4a5a), x, .9, .45, .2, .05, .05); brow.rotation.z = x > 0 ? .5 : -.5; inner.add(brow); }
    inner.add(mesh(new THREE.TorusGeometry(.56, .05, 6, 24), lam(0xff4a5a, { emissive: 0x4a0a10 }), 0, .55, 0)).children;
    a.legs = []; for (let i = 0; i < 6; i++) { const s = i < 3 ? -1 : 1, z = (i % 3 - 1) * .25; const l = mesh(new THREE.CylinderGeometry(.03, .03, .35, 5), mat, s * .5, .15, z); l.rotation.z = s * .8; inner.add(l); a.legs.push(l); }
    g.add(shadow(.6));
  } else if (type === 'shelly') {
    mat = lam(0x7ad84a, { emissive: 0x0a2a04 });
    a.shellMat = lam(0xff8a2a, { emissive: 0x2a1000, roughness: .4 });
    const shell = new THREE.Group(); inner.add(shell); a.shellG = shell;
    body = mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), a.shellMat, 0, .35, -.05, 1, .85, 1.05); shell.add(body);
    for (let i = 0; i < 7; i++) { const an = i / 7 * Math.PI * 2; const sp = mesh(new THREE.ConeGeometry(.14, .4, 6), lam(0xffd43b), Math.cos(an) * .55, .95, Math.sin(an) * .55); sp.rotation.set(Math.sin(an) * .6, 0, -Math.cos(an) * .6); shell.add(sp); }
    shell.add(mesh(new THREE.ConeGeometry(.16, .5, 6), lam(0xffd43b), 0, 1.35, 0));
    shell.add(mesh(new THREE.CylinderGeometry(1.02, 1.05, .18, 24), lam(0xffd43b), 0, .35, -.05));
    const head = new THREE.Group(); head.position.set(0, .45, .95); inner.add(head); a.head = head;
    head.add(mesh(SPH, mat, 0, 0, 0, .34)); for (const x of [-.14, .14]) { const e = eye(.1); e.position.set(x, .12, .26); head.add(e); }
    for (const [x, z] of [[-.6, .5], [.6, .5], [-.6, -.5], [.6, -.5]]) inner.add(mesh(SPH_LO, mat, x, .18, z, .2, .16, .2));
    g.add(shadow(1.1));
  } else if (type === 'crystal' || type === 'shard') {
    const s = type === 'shard' ? .38 : 1;
    mat = new THREE.MeshStandardMaterial({ color: 0x45d7ff, emissive: 0x0a4a6a, roughness: .1, metalness: .3, flatShading: true });
    body = mesh(new THREE.OctahedronGeometry(1, 0), mat, 0, 1.2 * s, 0, .8 * s, 1.2 * s, .8 * s); inner.add(body);
    if (type === 'crystal') { for (const [x, y, z, r] of [[-.75, 1.7, -.2, .5], [.7, 1.8, -.1, -.5], [0, 2.4, -.35, 0], [-.4, .5, .3, .3]]) { const c2 = mesh(new THREE.OctahedronGeometry(.4, 0), mat, x, y, z, 1, 1.6, 1); c2.rotation.z = r; inner.add(c2); } a.arms = []; for (const sx of [-1, 1]) { const arm = mesh(new THREE.OctahedronGeometry(.35, 0), mat, sx * 1, 1, .2, 1, 1.4, 1); inner.add(arm); a.arms.push(arm); } }
    for (const x of [-.22, .22]) { const e = eye(.14 * (s < 1 ? 1.4 : 1)); e.position.set(x * s * 1.3, 1.35 * s, .55 * s); inner.add(e); }
    g.add(shadow(.9 * s + .1));
  } else if (type === 'chomper') {
    mat = lam(0xff8a2a, { emissive: 0x3a1400 });
    body = mesh(SPH, mat, 0, .95, 0, .9, .85, .9); inner.add(body);
    const jaw = new THREE.Group(); jaw.position.set(0, .8, .62); inner.add(jaw); a.jaw = jaw;
    jaw.add(mesh(SPH, MOUTH, 0, 0, 0, .6, .36, .3));
    for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(.09, .22, 4), TOOTH); t.position.set(-.4 + i * .2, .22, .12); t.rotation.x = Math.PI; jaw.add(t); }
    for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(.08, .18, 4), TOOTH); t.position.set(-.3 + i * .2, -.24, .14); jaw.add(t); }
    for (const x of [-.3, .3]) { const e = eye(.2); e.position.set(x, 1.55, .45); inner.add(e); const brow = mesh(new THREE.BoxGeometry(1, 1, 1), BLACK, x, 1.8, .55, .3, .06, .06); brow.rotation.z = x > 0 ? .4 : -.4; inner.add(brow); }
    for (const x of [-.4, .4]) inner.add(mesh(new THREE.CylinderGeometry(.14, .18, .3, 6), lam(0xd86a1a), x, .12, 0));
    g.add(shadow(.9));
  } else if (type === 'spitter') {
    mat = lam(0xb05cff, { emissive: 0x220a3a });
    body = mesh(new THREE.CapsuleGeometry(.55, .8, 4, 10), mat, 0, 1.05, 0); inner.add(body);
    const sn = mesh(new THREE.CylinderGeometry(.2, .3, .6, 10), lam(0x9444e6), 0, 1.05, .7); sn.rotation.x = Math.PI / 2; inner.add(sn); a.snout = sn;
    inner.add(mesh(new THREE.CircleGeometry(.16, 10), MOUTH, 0, 1.05, 1.01));
    const e = eye(.3); e.position.set(0, 1.62, .38); inner.add(e);
    for (const [x, y, z] of [[-.45, 1.3, .2], [.42, .8, .3], [-.3, .6, .42], [.35, 1.5, -.1]]) inner.add(mesh(SPH_LO, lam(0xff8fe0), x, y, z, .1));
    for (const x of [-.25, .25]) inner.add(mesh(SPH_LO, lam(0x7a34c8), x, .12, .15, .2, .12, .28));
    g.add(shadow(.8));
  } else if (type === 'bat') {
    mat = lam(0x4fa3ff, { emissive: 0x0a1f40 });
    body = mesh(SPH, mat, 0, 0, 0, .6, .55, .6); inner.add(body);
    const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(1.2, .5); ws.lineTo(1.05, -.05); ws.lineTo(.8, .12); ws.lineTo(.6, -.2); ws.lineTo(.35, .02); ws.lineTo(0, -.25);
    const wg = new THREE.ShapeGeometry(ws); const wm = lam(0x2f6fd8, { side: THREE.DoubleSide });
    a.wings = [];
    for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * .45, .1, 0); const w = new THREE.Mesh(wg, wm); w.rotation.x = -Math.PI / 2 + .2; w.scale.set(s, 1, 1); p.add(w); inner.add(p); a.wings.push(p); }
    for (const x of [-.25, .25]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.12, .3, 4), mat); ear.position.set(x, .55, 0); inner.add(ear); const e = eye(.16); e.position.set(x * .9, .15, .45); inner.add(e); }
    for (const x of [-.08, .08]) { const f = new THREE.Mesh(new THREE.ConeGeometry(.04, .12, 4), TOOTH); f.position.set(x, -.12, .54); f.rotation.x = Math.PI; inner.add(f); }
    const sh = shadow(.7); g.add(sh); a.shadow = sh;
  } else if (type === 'tank') {
    mat = lam(0xd8573c, { emissive: 0x2a0a04 });
    body = mesh(new THREE.DodecahedronGeometry(1.5, 0), mat, 0, 1.6, 0, 1.15, .95, 1); inner.add(body);
    for (const [x, y, z, r] of [[-.6, 2.9, -.5, .3], [.2, 3.1, -.7, -.2], [.8, 2.7, -.3, .5], [0, 2.5, -1.2, 0]]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.28, 1, 5), lam(0x45d7ff, { emissive: 0x0a4050 })); c.position.set(x, y, z); c.rotation.z = r; inner.add(c); }
    a.arms = [];
    for (const s of [-1, 1]) { const arm = mesh(new THREE.DodecahedronGeometry(1, 0), lam(0xb8452e), s * 1.75, 1.2, .3, .65); inner.add(arm); a.arms.push(arm); }
    for (const x of [-.45, .45]) { const e = eye(.2); e.position.set(x, 2.05, 1.3); inner.add(e); const brow = mesh(new THREE.BoxGeometry(1, 1, 1), BLACK, x, 2.32, 1.42, .42, .1, .1); brow.rotation.z = x > 0 ? .35 : -.35; inner.add(brow); }
    inner.add(mesh(new THREE.BoxGeometry(1, .3, .2), MOUTH, 0, 1.35, 1.52));
    for (const x of [-.3, .3]) { const t = new THREE.Mesh(new THREE.ConeGeometry(.1, .3, 4), TOOTH); t.position.set(x, 1.55, 1.6); inner.add(t); }
    g.add(shadow(1.8));
  } else if (type === 'boss') {
    mat = lam(0xb050f0, { emissive: 0x2a0a48, roughness: .25 });
    body = mesh(SPH, mat, 0, 2.6, 0, 3.1, 2.6, 3.1); inner.add(body);
    a.coreMat = new THREE.MeshBasicMaterial({ color: 0xff5fa8, transparent: true, opacity: .0 });
    const core = mesh(SPH, a.coreMat, 0, 2.2, 2.1, 1.1); inner.add(core); a.core = core;
    inner.add(mesh(SPH_LO, SHINE, -1.4, 4, 1.4, .45));
    const crown = new THREE.Group(); crown.position.set(0, 5.05, 0); inner.add(crown); a.crown = crown;
    const gold = lam(0xffd43b, { emissive: 0x4a3200 });
    crown.add(mesh(new THREE.CylinderGeometry(1.25, 1.35, .6, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xffd43b, emissive: 0x4a3200, side: THREE.DoubleSide })));
    for (let i = 0; i < 5; i++) { const an = i / 5 * Math.PI * 2; const c = new THREE.Mesh(new THREE.ConeGeometry(.3, .8, 5), gold); c.position.set(Math.sin(an) * 1.2, .65, Math.cos(an) * 1.2); crown.add(c); crown.add(mesh(SPH_LO, lam([0xff4a5a, 0x45d7ff, 0x8ff04a][i % 3]), Math.sin(an) * 1.32, 0, Math.cos(an) * 1.32, .18)); }
    for (const x of [-.95, .95]) { const e = eye(.62); e.position.set(x, 3.5, 2.4); inner.add(e); }
    const m = mesh(SPH, MOUTH, 0, 2.2, 2.85, 1.2, .45, .3); inner.add(m); a.mouth = m;
    for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(.14, .32, 4), TOOTH); t.position.set(-.6 + i * .4, 2.55, 3.05); t.rotation.x = Math.PI; inner.add(t); }
    for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; inner.add(mesh(SPH_LO, mat, Math.sin(an) * 2.8, .35, Math.cos(an) * 2.8, .5, .4, .5)); }
    a.stars = new THREE.Group(); a.stars.position.y = 6.2; a.stars.visible = false; inner.add(a.stars);
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(STAR_G, new THREE.MeshBasicMaterial({ color: 0xffe14a })); const an = i / 5 * Math.PI * 2; s.position.set(Math.cos(an) * 1.6, 0, Math.sin(an) * 1.6); s.scale.setScalar(.45); a.stars.add(s); }
    g.add(shadow(3.3));
  }
  a.body = body; a.mat = mat;
  g.traverse(o => { if (o.isMesh && o.material !== SHADOW_M && !o.material.transparent) o.castShadow = true; });
  return { group: g, a };
}

function starShape(outer = .5, inner = .22) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? inner : outer, an = i / 10 * Math.PI * 2 + Math.PI / 2; const x = Math.cos(an) * r, y = Math.sin(an) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); } return s; }
export const STAR_G = new THREE.ExtrudeGeometry(starShape(), { depth: .14, bevelEnabled: false }).center();
function heartShape() { const s = new THREE.Shape(); s.moveTo(0, -.45); s.bezierCurveTo(-.2, -.3, -.55, -.05, -.5, .2); s.bezierCurveTo(-.45, .45, -.1, .5, 0, .25); s.bezierCurveTo(.1, .5, .45, .45, .5, .2); s.bezierCurveTo(.55, -.05, .2, -.3, 0, -.45); return s; }
const HEART_G = new THREE.ExtrudeGeometry(heartShape(), { depth: .18, bevelEnabled: true, bevelSize: .04, bevelThickness: .04, bevelSegments: 2 }).center();

let qTex = null;
function questionTex() {
  if (qTex) return qTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#ff5fa8'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#ffd43b'; x.fillRect(8, 8, 112, 112);
  x.fillStyle = '#8b5cff'; x.fillRect(16, 16, 96, 96);
  x.font = 'bold 92px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 10; x.strokeStyle = '#1d1238'; x.strokeText('?', 64, 70); x.fillStyle = '#fff'; x.fillText('?', 64, 70);
  qTex = new THREE.CanvasTexture(c); qTex.colorSpace = THREE.SRGBColorSpace; return qTex;
}

export const MISSION_ITEMS = new Set(['battery', 'pearl', 'gem', 'fuel', 'orb']);
export const ITEM_COLORS = { pearl: 0xfff0f8, gem: 0xff5a1f, fuel: 0x45d7ff, orb: 0x8ff04a,  apple: 0xff4a5a, pizza: 0xffb52e, chicken: 0xd98a3d, green: 0x6bff5a, blue: 0x45d7ff, purple: 0xb05cff, energy: 0xff8a2a, star: 0xffe14a, heart: 0xff5fa8, bomb: 0xff4a5a, ammo: 0x45d7ff, mystery: 0xff5fa8, battery: 0xffe14a, weapon: 0xffffff };

export function makeItem(type, weaponId) {
  const g = new THREE.Group(); const spin = new THREE.Group(); g.add(spin);
  const glow = lam(0xffffff);
  if (type === 'apple') { spin.add(mesh(SPH, lam(0xff3b4a, { emissive: 0x3a0008 }), 0, 0, 0, .34, .32, .34)); spin.add(mesh(new THREE.CylinderGeometry(.03, .03, .2, 5), lam(0x6b3f22), 0, .36, 0)); spin.add(mesh(SPH_LO, lam(0x5fcf3a), .1, .38, 0, .12, .04, .07)); }
  else if (type === 'pizza') { const w = mesh(new THREE.CylinderGeometry(.62, .62, .1, 8, 1, false, 0, Math.PI / 3.2), lam(0xffc93b, { emissive: 0x3a2400 })); w.rotation.x = Math.PI / 2; w.position.set(0, -.3, 0); spin.add(w); const crust = mesh(new THREE.CylinderGeometry(.66, .66, .16, 8, 1, true, 0, Math.PI / 3.2), lam(0xc97a2f, { side: THREE.DoubleSide })); crust.rotation.x = Math.PI / 2; crust.position.copy(w.position); spin.add(crust); for (const [x, y] of [[.12, .05], [.22, -.08], [.28, .12]]) { const p = mesh(new THREE.CylinderGeometry(.06, .06, .12, 8), lam(0xe0303f), x, y, 0); p.rotation.x = Math.PI / 2; spin.add(p); } spin.rotation.z = -.5; }
  else if (type === 'chicken') { spin.add(mesh(SPH, lam(0xc9782f, { emissive: 0x2a1000 }), 0, .1, 0, .3, .38, .3)); spin.add(mesh(new THREE.CylinderGeometry(.06, .06, .35, 6), lam(0xfff6e0), 0, -.38, 0)); spin.add(mesh(SPH_LO, lam(0xfff6e0), -.07, -.58, 0, .08)); spin.add(mesh(SPH_LO, lam(0xfff6e0), .07, -.58, 0, .08)); spin.rotation.z = .5; }
  else if (type === 'green' || type === 'blue' || type === 'purple') { const c = ITEM_COLORS[type]; spin.add(mesh(SPH, new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(.35), transparent: true, opacity: .9 }), 0, -.05, 0, .32)); spin.add(mesh(new THREE.CylinderGeometry(.1, .12, .25, 8), lam(0xdff6ff), 0, .32, 0)); spin.add(mesh(new THREE.CylinderGeometry(.12, .1, .1, 8), lam(0x9a6a3a), 0, .48, 0)); spin.add(mesh(SPH_LO, SHINE, -.12, .06, .22, .07)); }
  else if (type === 'energy') { spin.add(mesh(new THREE.CylinderGeometry(.18, .18, .56, 12), lam(0xff8a2a, { emissive: 0x3a1400 }))); spin.add(mesh(new THREE.CylinderGeometry(.185, .185, .16, 12), lam(0xffe14a))); spin.add(mesh(new THREE.CylinderGeometry(.14, .18, .05, 12), lam(0xdfe4f0), 0, .3, 0)); }
  else if (type === 'star') spin.add(mesh(STAR_G, lam(0xffe14a, { emissive: 0x5a4400 }), 0, 0, 0, 1.2));
  else if (type === 'heart') spin.add(mesh(HEART_G, lam(0xff4f8f, { emissive: 0x4a0a20 }), 0, 0, 0, 1.1));
  else if (type === 'bomb') { spin.add(mesh(SPH, lam(0x2a2240), 0, 0, 0, .34)); spin.add(mesh(new THREE.CylinderGeometry(.1, .1, .12, 8), lam(0x6b6480), 0, .36, 0)); spin.add(mesh(new THREE.CylinderGeometry(.025, .025, .25, 4), lam(0xc9a27a), .06, .5, 0)); const sp = mesh(SPH_LO, new THREE.MeshBasicMaterial({ color: 0xffe14a }), .1, .64, 0, .08); spin.add(sp); g.userData.spark = sp; }
  else if (type === 'ammo') { spin.add(mesh(new THREE.BoxGeometry(.7, .42, .44), lam(0x2fb8e0, { emissive: 0x06303a }))); spin.add(mesh(new THREE.BoxGeometry(.72, .12, .46), lam(0xffd43b))); for (const x of [-.18, 0, .18]) spin.add(mesh(new THREE.CylinderGeometry(.06, .06, .2, 8), lam(0xffe14a), x, .3, 0)); }
  else if (type === 'mystery') { const m = new THREE.MeshLambertMaterial({ map: questionTex(), emissive: 0x222222 }); spin.add(mesh(new THREE.BoxGeometry(.9, .9, .9), m)); }
  else if (type === 'battery') { spin.add(mesh(new THREE.CylinderGeometry(.2, .2, .6, 12), lam(0xffd43b, { emissive: 0x4a3a00 }))); spin.add(mesh(new THREE.CylinderGeometry(.205, .205, .2, 12), lam(0x2a2240), 0, -.22, 0)); spin.add(mesh(new THREE.CylinderGeometry(.08, .08, .1, 8), lam(0xdfe4f0), 0, .35, 0)); }
  else if (type === 'pearl') { const sh = new THREE.MeshStandardMaterial({ color: 0xff9ab8, roughness: .4, side: THREE.DoubleSide }); const lo = mesh(new THREE.SphereGeometry(.38, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), sh); lo.scale.y = .45; spin.add(lo); const up = mesh(new THREE.SphereGeometry(.38, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), sh, 0, .02, -.18); up.scale.y = .45; up.rotation.x = -.9; spin.add(up); spin.add(mesh(SPH, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .05, metalness: .3, emissive: 0x554455 }), 0, .1, .02, .17)); }
  else if (type === 'gem') { const gm = new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff3a00, emissiveIntensity: .7, roughness: .1, metalness: .2, flatShading: true }); spin.add(mesh(new THREE.OctahedronGeometry(.36, 0), gm, 0, 0, 0, 1, 1.4, 1)); }
  else if (type === 'fuel') { spin.add(mesh(new THREE.CylinderGeometry(.2, .2, .55, 16), new THREE.MeshStandardMaterial({ color: 0x45d7ff, emissive: 0x1a8ab0, roughness: .1, transparent: true, opacity: .85 }))); for (const y of [-.3, .3]) spin.add(mesh(new THREE.CylinderGeometry(.23, .23, .08, 16), lam(0xdfe4f0, { metalness: .6, roughness: .3 }), 0, y, 0)); }
  else if (type === 'orb') { spin.add(mesh(SPH, new THREE.MeshBasicMaterial({ color: 0x8ff04a }), 0, 0, 0, .3)); const rg = mesh(new THREE.TorusGeometry(.45, .03, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff })); rg.rotation.x = 1.2; spin.add(rg); }
  else if (type === 'weapon') { const b = makeBlaster(weaponId); b.group.scale.setScalar(1.6); b.group.rotation.y = Math.PI / 2; spin.add(b.group); }
  const c = ITEM_COLORS[type] ?? 0xffffff;
  const ring = new THREE.Mesh(new THREE.RingGeometry(.45, .68, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: type === 'weapon' ? 0xff5fa8 : c, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.y = .06; g.add(ring);
  if (MISSION_ITEMS.has(type) || type === 'mystery' || type === 'weapon') {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 16, 12, 1, true), new THREE.MeshBasicMaterial({ color: MISSION_ITEMS.has(type) ? (ITEM_COLORS[type] === 0xfff0f8 ? 0xffe14a : ITEM_COLORS[type]) : 0xff5fa8, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 8; g.add(beam);
  }
  spin.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.spin = spin; g.userData.ring = ring;
  return g;
}

// Toy-like sci-fi blasters (no realistic firearms)
export function makeBlaster(id) {
  const g = new THREE.Group();
  const C = { blaster: [0x49e3ff, 0xeef0f4], scatter: [0xffd43b, 0x3a2a60], goo: [0x8ff04a, 0x3a2a60], freeze: [0x9be8ff, 0xeef6ff], bubble: [0xd4b0ff, 0xffffff], lightning: [0xffe14a, 0x3a2a60], bouncer: [0xff5fa8, 0xeef0f4], boomer: [0xff8a2a, 0xeef0f4], mega: [0xff4fd8, 0xffe14a] }[id] || [0xffffff, 0x333333];
  const main = lam(C[0], { emissive: new THREE.Color(C[0]).multiplyScalar(.12), roughness: .3, metalness: .2 }), sec = lam(C[1], { roughness: .35, metalness: .1 }), glowM = new THREE.MeshBasicMaterial({ color: C[0] });
  g.add(mesh(new THREE.BoxGeometry(.18, .2, .38), sec, 0, 0, 0)); g.add(mesh(new THREE.BoxGeometry(.19, .06, .3), main, 0, .06, 0));
  const grip = mesh(new THREE.BoxGeometry(.13, .24, .14), sec, 0, -.18, .2); grip.rotation.x = .35; g.add(grip);
  const muzzle = new THREE.Object3D();
  if (id === 'goo') { g.add(mesh(SPH, new THREE.MeshLambertMaterial({ color: 0x8ff04a, emissive: 0x2a5a10, transparent: true, opacity: .85 }), 0, .2, .1, .15)); const b = mesh(new THREE.CylinderGeometry(.09, .12, .42, 10), main, 0, 0, -.35); b.rotation.x = Math.PI / 2; g.add(b); muzzle.position.set(0, 0, -.58); }
  else if (id === 'lightning') { const b = mesh(new THREE.CylinderGeometry(.04, .05, .6, 8), sec, 0, 0, -.4); b.rotation.x = Math.PI / 2; g.add(b); for (let i = 0; i < 3; i++) { const t = mesh(new THREE.TorusGeometry(.09, .025, 6, 12), main, 0, 0, -.2 - i * .16); g.add(t); } g.add(mesh(SPH_LO, glowM, 0, 0, -.72, .06)); muzzle.position.set(0, 0, -.74); }
  else if (id === 'boomer') { const b = mesh(new THREE.CylinderGeometry(.13, .16, .45, 10), main, 0, .02, -.3); b.rotation.x = Math.PI / 2; g.add(b); g.add(mesh(new THREE.TorusGeometry(.14, .03, 6, 12), sec, 0, .02, -.52)); muzzle.position.set(0, .02, -.56); }
  else if (id === 'mega') { for (const [x, y] of [[-.07, .05], [.07, .05], [0, -.06]]) { const b = mesh(new THREE.CylinderGeometry(.045, .05, .6, 8), main, x, y, -.35); b.rotation.x = Math.PI / 2; g.add(b); } g.add(mesh(new THREE.BoxGeometry(.4, .04, .2), main, 0, .1, .15)); g.add(mesh(SPH_LO, glowM, 0, 0, -.66, .08)); muzzle.position.set(0, 0, -.68); }
  else if (id === 'scatter') { const b = mesh(new THREE.CylinderGeometry(.14, .07, .34, 14), main, 0, .02, -.3); b.rotation.x = Math.PI / 2; g.add(b); const s = mesh(STAR_G, glowM, 0, .15, .05, .3); s.rotation.y = Math.PI / 2; g.add(s); muzzle.position.set(0, .02, -.5); }
  else if (id === 'freeze') { const b = mesh(new THREE.CylinderGeometry(.05, .07, .5, 12), sec, 0, .02, -.36); b.rotation.x = Math.PI / 2; g.add(b); for (const r of [0, 2.1, 4.2]) { const f = mesh(new THREE.BoxGeometry(.02, .14, .18), main, Math.sin(r) * .08, .02 + Math.cos(r) * .08, -.36); f.rotation.z = -r; g.add(f); } g.add(mesh(new THREE.CylinderGeometry(.07, .07, .22, 12), new THREE.MeshStandardMaterial({ color: 0x9be8ff, emissive: 0x2a6a8a, transparent: true, opacity: .8, roughness: .05 }), 0, .17, .05)); g.add(mesh(SPH_LO, glowM, 0, .02, -.62, .05)); muzzle.position.set(0, .02, -.64); }
  else if (id === 'bubble') { g.add(mesh(SPH, new THREE.MeshStandardMaterial({ color: 0xd4b0ff, emissive: 0x3a1a6a, transparent: true, opacity: .7, roughness: .05 }), 0, .16, .02, .13)); const b = mesh(new THREE.CylinderGeometry(.05, .06, .3, 10), main, 0, .02, -.3); b.rotation.x = Math.PI / 2; g.add(b); g.add(mesh(new THREE.TorusGeometry(.11, .02, 8, 20), main, 0, .02, -.48)); muzzle.position.set(0, .02, -.5); }
  else if (id === 'bouncer') { const b = mesh(new THREE.CylinderGeometry(.1, .1, .34, 14), main, 0, .03, -.3); b.rotation.x = Math.PI / 2; g.add(b); for (let i = 0; i < 4; i++) g.add(mesh(new THREE.TorusGeometry(.105, .015, 6, 16), sec, 0, .03, -.18 - i * .08)); g.add(mesh(SPH_LO, glowM, 0, .03, -.48, .08)); muzzle.position.set(0, .03, -.52); }
  else { const b = mesh(new THREE.CylinderGeometry(.06, .07, .42, 10), main, 0, .02, -.34); b.rotation.x = Math.PI / 2; g.add(b); g.add(mesh(new THREE.TorusGeometry(.075, .02, 6, 12), glowM, 0, .02, -.54)); g.add(mesh(new THREE.BoxGeometry(.05, .08, .2), main, 0, .13, 0)); muzzle.position.set(0, .02, -.57); }
  g.add(muzzle);
  return { group: g, muzzle };
}
