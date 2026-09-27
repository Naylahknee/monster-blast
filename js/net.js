// Multiplayer client: private rooms, remote players, emotes. No text chat anywhere.
import * as THREE from 'three';
import { SERVER_URL, FUN_ADJ, FUN_ANI } from './config.js';
import { makeBody, updateBody, SHIRTS } from './player.js';
import { makeBlaster } from './models.js';

export const EMOTES = [['NICE!', '#8ff04a'], ['HELP!', '#ff4a5a'], ['OVER HERE!', '#45d7ff'], ['WOW!', '#ffd43b'], ['GOOD GAME!', '#ff5fa8'], ["LET'S GO!", '#ff8a2a']];
export const funName = () => FUN_ADJ[Math.floor(Math.random() * FUN_ADJ.length)] + ' ' + FUN_ANI[Math.floor(Math.random() * FUN_ANI.length)];

function tagSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.font = 'bold 30px sans-serif'; const w = Math.min(248, x.measureText(text).width + 36);
  x.fillStyle = 'rgba(29,18,56,.85)'; x.beginPath(); x.roundRect((256 - w) / 2, 8, w, 46, 14); x.fill();
  x.fillStyle = color; x.beginPath(); x.arc((256 - w) / 2 + 18, 31, 7, 0, 7); x.fill();
  x.fillStyle = '#fff6e0'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128 + 8, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(2, .5, 1); s.renderOrder = 20; return s;
}
function bubbleSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = color; x.strokeStyle = '#1d1238'; x.lineWidth = 6; x.beginPath(); x.roundRect(10, 6, 236, 64, 20); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(110, 68); x.lineTo(128, 90); x.lineTo(146, 68); x.fill(); x.stroke();
  x.fillStyle = '#1d1238'; x.font = 'bold 36px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 40);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(2.4, .9, 1); s.renderOrder = 21; return s;
}

export class Net {
  constructor(G) { this.G = G; this.ws = null; this.id = null; this.peers = new Map(); this.remote = new Map(); this.hostId = null; this.cfg = null; this.inGame = false; this.sendT = 0; this.pingT = 0; this.listeners = new Set(); }
  get url() { return (this.G.settings.serverUrl || SERVER_URL || '').trim().replace(/\/$/, ''); }
  get isHost() { return this.id !== null && this.id === this.hostId; }
  get connected() { return !!this.ws && this.ws.readyState === 1; }
  get mode() { return this.inGame && this.cfg ? this.cfg.mode : null; }
  get puppet() { return this.mode === 'coop' && !this.isHost; }
  get coopHost() { return this.mode === 'coop' && this.isHost; }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(m) { this.listeners.forEach(f => f(m)); }

  async check() { if (!this.url) return false; try { const r = await fetch(this.url + '/health'); return r.ok; } catch (e) { return false; } }
  async create() { const r = await fetch(this.url + '/new'); if (!r.ok) throw new Error('server'); const { code } = await r.json(); return this.join(code); }
  join(code) {
    this.leave(true);
    return new Promise((res, rej) => {
      let done = false; const fail = e => { if (!done) { done = true; rej(e); } };
      let ws; try { ws = new WebSocket(this.url.replace(/^http/, 'ws') + '/room/' + code); } catch (e) { return fail('bad'); }
      this.ws = ws; this.code = code;
      const to = setTimeout(() => { fail('timeout'); try { ws.close(); } catch (e) {} }, 7000);
      ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', name: this.G.progress.funName }));
      ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } if (m.t === 'welcome') { clearTimeout(to); done = true; res(m); } if (m.t === 'err') fail(m.e); this.onMsg(m); };
      ws.onerror = () => { clearTimeout(to); fail('error'); };
      ws.onclose = () => { clearTimeout(to); fail('closed'); if (this.ws === ws) this.onClose(); };
    });
  }
  leave(silent) {
    const ws = this.ws; this.ws = null; if (ws) { ws.onclose = null; try { ws.close(); } catch (e) {} }
    this.clearRemotes(); this.peers.clear(); this.id = null; this.hostId = null; this.inGame = false; this.cfg = null;
    if (!silent) this.emit({ t: 'left' });
  }
  onClose() { this.clearRemotes(); const was = this.inGame; this.ws = null; this.id = null; this.inGame = false; this.emit({ t: 'closed', was }); }
  send(o) { if (this.connected) this.ws.send(JSON.stringify(o)); }

  onMsg(m) {
    if (m.t === 'welcome') { this.id = m.id; this.hostId = m.host; this.cfg = m.cfg; this.myName = m.name; this.myColor = m.color; this.peers = new Map(m.peers.map(p => [p.id, p])); }
    else if (m.t === 'peers') { this.hostId = m.host; this.peers = new Map(m.peers.map(p => [p.id, p])); if (m.left) this.dropRemote(m.left); }
    else if (m.t === 'cfg') this.cfg = m.cfg;
    else if (m.t === 'start') { this.cfg = m.cfg; this.inGame = true; }
    else if (m.t === 'lobby') { this.inGame = false; this.clearRemotes(); }
    else if (m.t === 'st') this.onState(m);
    else if (m.t === 'emo') this.showEmote(m.from, m.i);
    this.emit(m);
  }
  order() { return [...this.peers.keys()].sort((a, b) => a - b); }
  slot() { return Math.max(0, this.order().indexOf(this.id)); }
  peerName(id) { return id === this.id ? this.myName : this.peers.get(id)?.name || 'PLAYER'; }
  peerColor(id) { const c = (id === this.id ? this.myColor : this.peers.get(id)?.color) || 'blue'; return SHIRTS[c] || SHIRTS.blue; }

  // ----- remote players -----
  makeRemote(id) {
    const G = this.G, col = this.peerColor(id), B = makeBody(col);
    B.group.traverse(o => { if (o.isMesh) o.layers.set(0); });
    const gun = makeBlaster('blaster'); gun.group.scale.setScalar(.8); B.gunMount.add(gun.group);
    const tag = tagSprite(this.peerName(id), '#' + col.toString(16).padStart(6, '0')); tag.position.y = 2.25; B.group.add(tag);
    G.scene.add(B.group);
    const r = { id, B, tag, gun, gunId: 'blaster', pos: new THREE.Vector3(), tgt: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, tyaw: 0, pitch: 0, grounded: true, last: performance.now(), s: 0, f: 0, h: 100, fin: 0 };
    r.P = { pos: r.pos, vel: r.vel, yaw: 0, grounded: true };
    r.T = { pos: r.pos, eye: new THREE.Vector3(), vel: r.vel, grounded: true, id, inv: 0 };
    this.remote.set(id, r); return r;
  }
  dropRemote(id) { const r = this.remote.get(id); if (r) { this.G.scene.remove(r.B.group); this.remote.delete(id); } }
  clearRemotes() { for (const id of [...this.remote.keys()]) this.dropRemote(id); }
  onState(m) {
    if (!this.inGame || !Array.isArray(m.p)) return;
    let r = this.remote.get(m.from); const fresh = !r; if (!r) r = this.makeRemote(m.from);
    r.tgt.set(m.p[0], m.p[1], m.p[2]); if (fresh) r.pos.copy(r.tgt);
    r.tyaw = m.y || 0; r.pitch = m.pi || 0; r.vel.set(m.v?.[0] || 0, 0, m.v?.[1] || 0); r.grounded = !!m.g; r.s = m.s | 0; r.f = m.f | 0; r.h = m.h | 0; r.last = performance.now();
    if (m.w && m.w !== r.gunId && typeof m.w === 'string') { r.B.gunMount.remove(r.gun.group); try { r.gun = makeBlaster(m.w); } catch (e) { r.gun = makeBlaster('blaster'); } r.gun.group.scale.setScalar(.8); r.B.gunMount.add(r.gun.group); r.gunId = m.w; }
  }
  update(dt) {
    const G = this.G; if (!this.inGame || !this.connected) return;
    const P = G.player;
    this.sendT -= dt;
    if (this.sendT <= 0) { this.sendT = .08; this.send({ t: 'st', p: [+P.pos.x.toFixed(2), +P.pos.y.toFixed(2), +P.pos.z.toFixed(2)], y: +P.yaw.toFixed(3), pi: +P.pitch.toFixed(2), v: [+P.vel.x.toFixed(1), +P.vel.z.toFixed(1)], g: P.grounded ? 1 : 0, w: G.weapons.cur === 'x' ? 'blaster' : G.weapons.cur, s: G.score | 0, f: G.map.progress().done, h: Math.round(G.health) }); }
    this.pingT -= dt; if (this.pingT <= 0) { this.pingT = 15; this.send({ t: 'ping' }); }
    const now = performance.now();
    for (const r of this.remote.values()) {
      if (now - r.last > 6000) { this.dropRemote(r.id); continue; }
      const k = Math.min(1, dt * 12); r.pos.lerp(r.tgt, k);
      let d = r.tyaw - r.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); r.yaw += d * k;
      r.P.yaw = r.yaw; r.P.grounded = r.grounded;
      updateBody(r.B, r.P, dt, true, r.pitch, G.time);
      r.T.eye.set(r.pos.x, r.pos.y + 1.6, r.pos.z); r.T.grounded = r.grounded;
      if (r.goo > 0) { r.goo -= dt; r.B.shirtMat.emissive.setRGB(.2, .6, .1); } else r.B.shirtMat.emissive.setRGB(0, 0, 0);
      if (r.emo) { r.emoT -= dt; r.emo.position.y = 2.9 + Math.sin(r.emoT * 6) * .05; if (r.emoT <= 0) { r.B.group.remove(r.emo); r.emo = null; } }
    }
  }
  emote(i) { this.send({ t: 'emo', i }); this.showEmote(this.id, i); }
  showEmote(id, i) {
    const e = EMOTES[i]; if (!e) return; const G = this.G;
    G.hud.feed(this.peerName(id), e[0], '#' + this.peerColor(id).toString(16).padStart(6, '0'));
    G.audio.play('pickup');
    const r = id === this.id ? null : this.remote.get(id); if (!r) return;
    if (r.emo) r.B.group.remove(r.emo); r.emo = bubbleSprite(e[0], e[1]); r.emo.position.y = 2.9; r.emoT = 2.6; r.B.group.add(r.emo);
  }
}
