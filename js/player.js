import * as THREE from 'three';
import { lam } from './world.js';

const UP = new THREE.Vector3(0, 1, 0);
export function limb(a, b, r, mat, endR = 0) {
  const g = new THREE.Group(); const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r * .92, r, len, 14), mat);
  c.position.copy(a).addScaledVector(d, .5); c.quaternion.setFromUnitVectors(UP, d.normalize()); g.add(c);
  if (endR) { const s = new THREE.Mesh(new THREE.SphereGeometry(endR, 14, 10), mat); s.position.copy(b); g.add(s); }
  return g;
}

export const SHIRTS = { blue: 0x2f8fe8, red: 0xe8403a, green: 0x3fae4a, purple: 0x8b5cff };

// Jointed hero: hips → thighs → knees → shins → feet, spine → shoulders → elbows, head. Parts on layer 1 are hidden in first person but still cast shadows.
export function makeBody(shirt = SHIRTS.blue) {
  const g = new THREE.Group();
  const shirtMat = lam(shirt, { roughness: .9 }), skinMat = lam(0xe8b48c, { roughness: .6 }), pants = lam(0x2f3d66, { roughness: .95 }), shoe = lam(0xf4f4f4, { roughness: .5 }), sole = lam(0xff5fa8), hair = lam(0x3a2418, { roughness: .8 }), pack = lam(0xff8a2a, { roughness: .7 }), dark = lam(0x1d1238);
  const add = (parent, geo, mat, x, y, z, fp = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (!fp) m.layers.set(1); parent.add(m); return m; };
  const hips = new THREE.Group(); hips.position.y = .92; g.add(hips);
  add(hips, new THREE.CylinderGeometry(.2, .19, .16, 16), pants, 0, 0, 0, false).scale.set(1.1, 1, .8);
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * .11, -.02, 0); hips.add(hip);
    add(hip, new THREE.CapsuleGeometry(.085, .3, 6, 12), pants, 0, -.21, 0);
    const knee = new THREE.Group(); knee.position.y = -.43; hip.add(knee);
    add(knee, new THREE.CapsuleGeometry(.075, .3, 6, 12), pants, 0, -.2, 0);
    const foot = new THREE.Group(); foot.position.y = -.42; knee.add(foot);
    add(foot, new THREE.BoxGeometry(.16, .1, .28), shoe, 0, -.02, .06); add(foot, new THREE.BoxGeometry(.17, .035, .29), sole, 0, -.075, .06);
    legs.push({ hip, knee, foot });
  }
  const spine = new THREE.Group(); spine.position.y = .06; hips.add(spine);
  add(spine, new THREE.CapsuleGeometry(.2, .3, 6, 16), shirtMat, 0, .22, -.02, false).scale.set(1.12, 1, .78);
  const stripe = add(spine, new THREE.TorusGeometry(.2, .018, 6, 24), lam(0xffd43b), 0, .3, -.02, false); stripe.rotation.x = Math.PI / 2; stripe.scale.set(1.12, .78, 1);
  add(spine, new THREE.BoxGeometry(.34, .4, .17), pack, 0, .27, -.24, false);
  add(spine, new THREE.BoxGeometry(.26, .08, .05), dark, 0, .38, -.33, false);
  const head = new THREE.Group(); head.position.set(0, .66, 0); spine.add(head);
  add(head, new THREE.SphereGeometry(.17, 20, 14), skinMat, 0, 0, 0, false);
  add(head, new THREE.SphereGeometry(.178, 20, 12, 0, Math.PI * 2, 0, Math.PI * .55), hair, 0, .02, -.01, false);
  add(head, new THREE.SphereGeometry(.185, 20, 10, 0, Math.PI * 2, 0, Math.PI * .45), shirtMat, 0, .04, 0, false);
  add(head, new THREE.CylinderGeometry(.14, .14, .025, 16, 1, false, -Math.PI / 2, Math.PI), shirtMat, 0, .07, .12, false).scale.z = 1.2;
  for (const s of [-1, 1]) add(head, new THREE.SphereGeometry(.024, 8, 6), dark, s * .06, 0, .155, false);
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * .27, .45, 0); sh.rotation.order = 'YXZ'; spine.add(sh);
    add(sh, new THREE.SphereGeometry(.09, 12, 10), shirtMat, 0, 0, 0, false);
    add(sh, new THREE.CapsuleGeometry(.065, .2, 6, 10), shirtMat, 0, -.15, 0, false);
    const elbow = new THREE.Group(); elbow.position.y = -.3; sh.add(elbow);
    add(elbow, new THREE.CapsuleGeometry(.058, .18, 6, 10), skinMat, 0, -.12, 0, false);
    add(elbow, new THREE.SphereGeometry(.07, 12, 10), skinMat, 0, -.26, 0, false);
    arms.push({ sh, elbow });
  }
  // third-person blaster mount, pitched with aim
  const gun = new THREE.Group(); gun.position.set(.1, .42, .06); spine.add(gun);
  const gunMount = new THREE.Group(); gunMount.position.set(0, -.04, .42); gunMount.rotation.y = Math.PI; gun.add(gunMount);
  return { group: g, hips, spine, legs, arms, head, gun, gunMount, shirtMat, skinMat, kick: 0, phase: 0, land: 0, air: 0, lastStep: 0, setShirt: c => shirtMat.color.set(c) };
}

export function updateBody(B, P, dt, view3, pitch, t) {
  const g = B.group, hs = Math.hypot(P.vel.x, P.vel.z);
  g.position.copy(P.pos);
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  if (!view3) { g.position.x -= fx * .12; g.position.z -= fz * .12; }
  g.rotation.y = P.yaw + Math.PI;
  const fwd = (P.vel.x * fx + P.vel.z * fz), side = (P.vel.x * rx + P.vel.z * rz);
  const k = Math.min(1, hs / 5.4), run = Math.min(1, Math.max(0, (hs - 6) / 2.5));
  B.phase += hs * dt * (1.75 - run * .25);
  const dir = fwd < -.5 ? -1 : 1, sideK = hs > .1 ? side / hs : 0;
  const A = (.5 + run * .35) * k;
  if (!P.grounded) B.air = Math.min(1, B.air + dt * 5); else { if (B.air > .6) B.land = 1; B.air = Math.max(0, B.air - dt * 8); }
  B.land = Math.max(0, B.land - dt * 5);
  B.legs.forEach((L, i) => {
    const ph = B.phase + (i ? Math.PI : 0), sw = Math.sin(ph);
    const walkHip = sw * A * dir * (1 - Math.abs(sideK) * .5), walkKnee = (Math.max(0, Math.cos(ph) * dir) * 1.1 + .08) * k;
    const airHip = i ? .15 : -.7, airKnee = i ? .4 : 1.1;
    L.hip.rotation.x = -(walkHip * (1 - B.air) + airHip * B.air);
    L.hip.rotation.z = sw * sideK * .35 * k * (i ? -1 : 1) * .6;
    L.knee.rotation.x = walkKnee * (1 - B.air) + airKnee * B.air + B.land * .5;
    L.foot.rotation.x = -L.knee.rotation.x * .4 - L.hip.rotation.x * .3;
  });
  const bob = Math.abs(Math.cos(B.phase)) * .06 * k;
  B.hips.position.y = .92 - .03 * k + bob - B.land * .12 + Math.sin(t * 2) * .005 * (1 - k);
  B.hips.rotation.y = Math.sin(B.phase) * .12 * k;
  B.spine.rotation.y = -B.hips.rotation.y * .8;
  B.spine.rotation.x = (.1 * k + .12 * run) * dir + B.land * .15;
  B.spine.rotation.z = -sideK * .08 * k;
  B.kick = Math.max(0, B.kick - dt * 8);
  const aim = -Math.PI / 2 - pitch + B.spine.rotation.x * -1;
  B.gun.rotation.x = -pitch - B.spine.rotation.x + B.kick * -.12;
  B.gun.position.z = .06 - B.kick * .05;
  B.arms[1].sh.rotation.set(aim + B.kick * .12, -.35, 0); B.arms[1].elbow.rotation.x = .25;
  B.arms[0].sh.rotation.set(aim + .1, .75, 0); B.arms[0].elbow.rotation.x = .5;
  B.head.rotation.x = -pitch * .6;
  // footstep events at each foot plant
  const step = Math.floor((B.phase + Math.PI / 2) / Math.PI);
  B.stepped = P.grounded && hs > 1.2 && step !== B.lastStep; B.lastStep = step;
}
