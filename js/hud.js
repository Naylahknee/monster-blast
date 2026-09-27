import * as THREE from 'three';
import { WEAPONS, EFFECTS, WEAPON_ORDER, LEVELS, LEVEL_UNLOCKS } from './config.js';

const HEART = '<svg viewBox="0 0 24 22"><path d="M12 21 C5 15.5 1 12 1 7 A5.5 5.5 0 0 1 12 4.2 A5.5 5.5 0 0 1 23 7 C23 12 19 15.5 12 21Z"/></svg>';
export const WICON = {
  blaster: '<svg viewBox="0 0 48 28"><path d="M4 8h26l4-3h8v10h-8l-2 2H20l-3 9h-7l2-9H4z"/><circle cx="42" cy="10" r="3" fill="#fff"/></svg>',
  goo: '<svg viewBox="0 0 48 28"><circle cx="18" cy="8" r="7"/><path d="M4 12h30l3-3h8v10h-8l-3-3H22l-3 10h-7l2-10H4z"/></svg>',
  lightning: '<svg viewBox="0 0 48 28"><path d="M4 9h40v6H22l-3 10h-7l2-10H4z"/><rect x="26" y="5" width="3" height="14" rx="1.5"/><rect x="32" y="5" width="3" height="14" rx="1.5"/><rect x="38" y="5" width="3" height="14" rx="1.5"/></svg>',
  boomer: '<svg viewBox="0 0 48 28"><path d="M4 9h20V4h20v16H24v-3h-2l-3 9h-7l2-9H4z"/></svg>',
  scatter: '<svg viewBox="0 0 48 28"><path d="M4 9h18l14-6v18l-14-6h-2l-3 11h-7l2-11H4z"/><path d="M42 6l1.5 3 3 .4-2.2 2 .6 3-2.9-1.5-2.9 1.5.6-3-2.2-2 3-.4z"/></svg>',
  freeze: '<svg viewBox="0 0 48 28"><path d="M4 9h40v6H22l-3 10h-7l2-10H4z"/><path d="M30 2l3 5-3 5-3-5zM38 2l3 5-3 5-3-5z"/></svg>',
  bubble: '<svg viewBox="0 0 48 28"><circle cx="16" cy="7" r="6"/><path d="M4 11h26v6H22l-3 9h-7l2-9H4z"/><circle cx="38" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
  bouncer: '<svg viewBox="0 0 48 28"><path d="M4 8h32v10H22l-3 8h-7l2-8H4z"/><circle cx="42" cy="13" r="5"/></svg>',
  mega: '<svg viewBox="0 0 48 28"><path d="M4 7h40v4H4zM4 13h40v4H22l-3 9h-7l2-9H4zM10 2h14v4H10z"/></svg>',
};

export class HUD {
  constructor(G) {
    this.G = G; const $ = id => document.getElementById(id); this.$ = $;
    this.el = $('hud'); this.lives = $('lives'); this.hpFill = $('hpFill'); this.hpBar = $('hpBar'); this.pwFill = $('pwFill'); this.pwBar = $('pwBar');
    this.score = $('score'); this.waveLbl = $('waveLbl'); this.waveSub = $('waveSub'); this.mission = $('mission'); this.missionTxt = $('missionTxt');
    this.boss = $('boss'); this.bossFill = $('bossFill'); this.effects = $('effects');
    this.wIcon = $('wIcon'); this.wName = $('wName'); this.wAmmo = $('wAmmo'); this.wPanel = $('weaponPanel'); this.reloadBar = $('reloadBar');
    this.cross = $('crosshair'); this.streakEl = $('streak'); this.bannerEl = $('banner'); this.bMain = $('bannerMain'); this.bSub = $('bannerSub'); this.toastEl = $('toast');
    this.action = $('actionBtn'); this.actionLbl = $('actionLbl'); this.vignette = $('vignette'); this.dmg = $('dmgflash');
    this.ind = []; const box = $('indicators'); for (let i = 0; i < 9; i++) { const d = document.createElement('div'); d.className = 'ind'; box.appendChild(d); this.ind.push(d); }
    this.c = {}; this.shownScore = 0; this.bannerT = 0; this.toastT = 0; this.streakT = 0; this.hitT = 0; this.dmgT = 0;
    this.V = new THREE.Vector3();
  }
  feed(name, text, color) {
    const box = this.$('feed'), d = document.createElement('div'); d.className = 'fd';
    d.innerHTML = '<i style="background:' + color + '"></i><b></b><span></span>'; d.querySelector('b').textContent = name; d.querySelector('span').textContent = text;
    box.appendChild(d); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => d.remove(), 3200);
  }
  toggleTray(on) {
    const t = this.$('weaponTray'); const open = on ?? !t.classList.contains('open');
    if (open) this.renderTray(); t.classList.toggle('open', open); this.G.audio.play('click');
  }
  renderTray() {
    const W = this.G.weapons;
    this.$('trayList').innerHTML = WEAPON_ORDER.filter(id => id !== 'mega' || W.owned.mega).map((id, i) => { const d = WEAPONS[id], w = W.owned[id], ul = LEVEL_UNLOCKS.indexOf(id);
      const sub = w ? (d.clip === Infinity ? '∞' : w.clip + w.reserve) : (ul > 0 ? 'LV ' + (ul + 1) : '?');
      return `<button data-w="${id}" class="ts ${w ? '' : 'locked'} ${W.cur === id ? 'cur' : ''}" style="--c:${d.css}"><i>${WICON[id]}</i><span>${sub}</span></button>`; }).join('');
  }
  show(on) { this.el.classList.toggle('hidden', !on); }
  set(key, val, fn) { if (this.c[key] !== val) { this.c[key] = val; fn(val); } }
  reset() { this.c = {}; this.shownScore = 0; this.bannerT = this.toastT = this.streakT = 0; this.bannerEl.className = ''; this.toastEl.className = ''; this.streakEl.className = 'out'; this.weaponChanged(); }

  banner(main, sub = '', dur = 2, cls = '') { this.bMain.textContent = main; this.bSub.textContent = sub; this.bannerEl.className = ''; void this.bannerEl.offsetWidth; this.bannerEl.className = 'show ' + cls; this.bannerT = dur; }
  toast(t) { this.toastEl.textContent = t; this.toastEl.className = ''; void this.toastEl.offsetWidth; this.toastEl.className = 'show'; this.toastT = 1.6; }
  streak(t) { this.streakEl.textContent = t; this.streakEl.className = 'out'; void this.streakEl.offsetWidth; this.streakEl.className = 'out show'; this.streakT = 1.4; }
  hitMark() { this.hitT = .12; }
  damage(from) { this.dmgT = .5; this.dmg.className = ''; void this.dmg.offsetWidth; this.dmg.className = 'show'; this.dmgFrom = from ? from.clone() : null; this.dmgFromT = 1; }
  weaponChanged(anim) {
    const W = this.G.weapons; if (!W) return; const id = W.cur, d = WEAPONS[id], w = W.owned[id]; if (!d || !w) return;
    this.wIcon.innerHTML = WICON[id]; this.wIcon.style.color = d.css; this.wName.textContent = d.name;
    this.wAmmo.textContent = d.clip === Infinity ? (id === 'mega' ? '' : '∞') : `${w.clip} / ${w.reserve}`;
    this.wAmmo.classList.toggle('low', d.clip !== Infinity && w.clip <= Math.ceil(d.clip * .25));
    this.wPanel.classList.toggle('multi', W.list().length > 1);
    if (this.$('weaponTray').classList.contains('open')) this.renderTray();
    if (anim) { this.wPanel.classList.remove('swap'); void this.wPanel.offsetWidth; this.wPanel.classList.add('swap'); }
  }

  update(dt) {
    const G = this.G;
    this.set('lives', G.lives, n => { let h = ''; for (let i = 0; i < Math.max(3, n); i++) h += `<i class="${i < n ? 'on' : ''}">${HEART}</i>`; this.lives.innerHTML = h; this.lives.classList.remove('bump'); void this.lives.offsetWidth; this.lives.classList.add('bump'); });
    const hp = Math.max(0, Math.round(G.health));
    this.set('hp', hp, v => { this.hpFill.style.width = v + '%'; this.hpBar.className = 'bar hp' + (v <= 30 ? ' low' : v <= 60 ? ' mid' : ''); });
    this.vignette.classList.toggle('low', hp <= 30 && G.state === 'playing');
    this.set('pw', Math.floor(G.power * 20), v => { this.pwFill.style.width = (v * 5) + '%'; this.pwBar.classList.toggle('full', v >= 20); });
    this.set('lvl', G.level(), v => this.$('lvl').textContent = 'LV ' + v);
    { const xp = G.progress.xp || 0, lv = G.level(), a = LEVELS[lv - 1], b = LEVELS[lv]; this.set('xp', b ? Math.floor((xp - a) / (b - a) * 50) : 50, v => this.$('xpFill').style.width = (v * 2) + '%'); }
    this.shownScore += (G.score - this.shownScore) * Math.min(1, dt * 10); if (Math.abs(G.score - this.shownScore) < 1) this.shownScore = G.score;
    this.set('score', Math.round(this.shownScore), v => this.score.textContent = v.toLocaleString());
    const W = G.waves;
    let wl = '', ws = '';
    const mh = G.mpHud && G.mpHud();
    if (mh) { wl = mh[0]; ws = mh[1]; }
    else if (W.state === 'warp') { wl = G.warp.isOpen ? 'WARP GATE OPEN' : (G.stageDef?.boss ? 'BOSS BEATEN!' : 'LEVEL CLEAR!'); ws = G.warp.isOpen ? 'FOLLOW THE BEAM ON YOUR MAP' : ''; }
    else if (W.state === 'boss' || W.state === 'bossIntro' || W.state === 'done') wl = 'BOSS';
    else { wl = `${G.stageName || ''}  ·  WAVE ${W.index + 1}/${W.count}`; ws = W.state === 'active' ? `${W.remaining} ${W.remaining === 1 ? 'MONSTER' : 'MONSTERS'} LEFT` : W.state === 'break' ? `NEXT WAVE ${Math.ceil(W.t)}` : ''; }
    this.set('wl', wl, v => this.waveLbl.textContent = v); this.set('ws', ws, v => this.waveSub.textContent = v);
    this.set('mis', G.mission.done ? 'done' : G.mission.count, v => { this.missionTxt.textContent = v === 'done' ? 'DONE!' : `${G.missionShort} ${v} / ${G.mission.need}`; this.mission.classList.toggle('done', v === 'done'); });
    const b = G.bossE;
    this.set('bossOn', !!(b && b.alive && b.state !== 'intro'), v => this.boss.hidden = !v);
    if (b && b.alive) { this.set('bossHp', Math.ceil(b.hp / b.maxHp * 100), v => this.bossFill.style.width = v + '%'); this.boss.classList.toggle('weak', b.state === 'dizzy'); }
    // effects
    const eff = Object.keys(EFFECTS).filter(k => G.effects[k] > 0).map(k => `${k}:${Math.ceil(G.effects[k])}`).join(',');
    this.set('eff', eff, () => { this.effects.innerHTML = Object.keys(EFFECTS).filter(k => G.effects[k] > 0).map(k => `<div class="eff" style="--c:${EFFECTS[k].css}">${EFFECTS[k].label}<b>${Math.ceil(G.effects[k])}</b></div>`).join(''); });
    if (G.weapons.cur === 'mega') this.set('mega', Math.ceil(G.weapons.megaT), v => this.wAmmo.textContent = v + ' SEC');
    this.reloadBar.style.transform = G.weapons.reloadT > 0 ? `scaleX(${1 - G.weapons.reloadT / G.weapons.reloadMax})` : 'scaleX(0)';
    // crosshair
    this.hitT -= dt;
    this.set('cross', (G.aim.target ? 'lock ' : '') + (this.hitT > 0 ? 'hit' : ''), v => this.cross.className = v);
    // action
    const act = G.context;
    this.set('act', act ? act.label : '', v => { this.action.classList.toggle('show', !!v); this.action.dataset.kind = act ? act.kind : ''; if (v) this.actionLbl.textContent = v; });
    // timers
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.bannerEl.className = 'hide'; }
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.toastEl.className = 'hide'; }
    if (this.streakT > 0) { this.streakT -= dt; if (this.streakT <= 0) this.streakEl.className = 'out hide'; }
    this.indicators(dt);
  }

  indicators(dt) {
    const G = this.G, cam = G.camera, V = this.V, W = innerWidth, H = innerHeight;
    const half = Math.atan(Math.tan(cam.fov * Math.PI / 360) * cam.aspect);
    const list = [];
    for (const e of G.enemies.list) {
      if (!e.alive || e.spawnT > 0) continue;
      const d = e.group.position.distanceTo(G.player.pos); if (d > 26) continue;
      G.enemies.center(e, V).applyMatrix4(cam.matrixWorldInverse);
      const a = Math.atan2(V.x, -V.z); if (Math.abs(a) < half * .92 && V.z < 0) continue;
      list.push({ a, cls: d < 9 ? 'near' : '', d });
    }
    list.sort((x, y) => x.d - y.d);
    if (!G.mission.done) { let best = null, bd = 1e9; for (const it of G.items.list) if (it.type === G.missionItem && !it.dead) { const d = it.pos.distanceTo(G.player.pos); if (d < bd) { bd = d; best = it; } }
      if (best) { V.copy(best.pos).setY(best.pos.y + 1).applyMatrix4(cam.matrixWorldInverse); const a = Math.atan2(V.x, -V.z); if (!(Math.abs(a) < half * .92 && V.z < 0)) list.unshift({ a, cls: 'goal' }); } }
    { const n = G.map && G.map.nextPos(); if (n) { V.copy(n).setY(n.y + 2).applyMatrix4(cam.matrixWorldInverse); const a = Math.atan2(V.x, -V.z); if (!(Math.abs(a) < half * .92 && V.z < 0)) list.unshift({ a, cls: 'cp' }); } }
    if (this.dmgFromT > 0 && this.dmgFrom) { this.dmgFromT -= dt; V.copy(this.dmgFrom).applyMatrix4(cam.matrixWorldInverse); list.unshift({ a: Math.atan2(V.x, -V.z), cls: 'dmg', o: Math.min(1, this.dmgFromT * 2) }); }
    for (let i = 0; i < this.ind.length; i++) {
      const el = this.ind[i], it = list[i];
      if (!it) { if (el.style.display !== 'none') el.style.display = 'none'; continue; }
      el.style.display = 'block'; el.className = 'ind ' + it.cls;
      const x = W / 2 + Math.sin(it.a) * W * .43, y = H / 2 - Math.cos(it.a) * H * .4;
      el.style.transform = `translate(${x}px,${y}px) rotate(${it.a}rad)`; el.style.opacity = it.o ?? 1;
    }
  }
}
