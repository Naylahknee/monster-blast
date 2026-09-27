// Procedural Web Audio: every sound is synthesized, so nothing to download and it works offline.
export class Audio {
  constructor() { this.ctx = null; this.musicMode = null; this.step = 0; this.nextT = 0; }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.comp = c.createDynamicsCompressor(); this.comp.connect(c.destination);
    this.master = c.createGain(); this.master.connect(this.comp);
    this.sfxG = c.createGain(); this.sfxG.connect(this.master);
    this.musG = c.createGain(); this.musG.connect(this.master);
    const len = c.sampleRate; const b = c.createBuffer(1, len, c.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    if (this.vols) this.setVolumes(this.vols);
    this.timer = setInterval(() => this.schedule(), 60);
  }

  setVolumes(s) {
    this.vols = s;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.master, t, .03);
    this.sfxG.gain.setTargetAtTime(s.sfx, t, .03);
    this.musG.gain.setTargetAtTime(s.music * .55, t, .03);
  }

  tone(f, dur, type = 'sine', vol = .3, f2 = null, when = 0, dest = null) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxG); o.start(t); o.stop(t + dur + .05);
  }

  noise(dur, vol = .3, freq = 1200, when = 0, type = 'lowpass', f2 = null, dest = null) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(freq, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || this.sfxG);
    s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }

  play(name) {
    if (!this.ctx) return;
    const T = (...a) => this.tone(...a), N = (...a) => this.noise(...a);
    const r = 1 + (Math.random() - .5) * .08;
    switch (name) {
      case 'blaster': T(900 * r, .11, 'square', .09, 260); T(1800 * r, .05, 'sine', .06, 600); break;
      case 'goo': T(320 * r, .18, 'sine', .25, 110); N(.12, .12, 700); break;
      case 'zap': T(1400 * r, .12, 'sawtooth', .07, 300); N(.14, .12, 4000, 0, 'highpass'); break;
      case 'boom': T(260, .2, 'square', .12, 90); break;
      case 'mega': T(700 * r, .14, 'sawtooth', .08, 180); T(1050 * r, .1, 'square', .05, 400); break;
      case 'scatter': N(.12, .3, 3000, 0, 'highpass'); T(600 * r, .1, 'square', .08, 200); T(1400 * r, .08, 'triangle', .06, 700); break;
      case 'freeze': T(2200 * r, .06, 'sine', .04, 1800); N(.05, .04, 6000, 0, 'highpass'); break;
      case 'bubble': T(500 * r, .12, 'sine', .18, 1100); T(900 * r, .06, 'sine', .08, 1500, .05); break;
      case 'bouncer': T(260 * r, .14, 'square', .08, 520); break;
      case 'boing': T(180, .18, 'sine', .15, 520); break;
      case 'freezeSolid': [1568, 2093, 2637].forEach((f, i) => T(f, .15, 'triangle', .08, null, i * .04)); N(.25, .12, 5000, 0, 'highpass'); break;
      case 'explode': N(.5, .45, 1800, 0, 'lowpass', 120); T(120, .45, 'sine', .4, 35); break;
      case 'hit': T(520 * r, .06, 'triangle', .12, 300); break;
      case 'armor': T(1600, .08, 'square', .05, 1200); break;
      case 'pop': T(380 * r, .16, 'sine', .3, 1300); N(.08, .1, 3000, 0, 'bandpass'); break;
      case 'bigpop': T(200, .35, 'sine', .4, 900); N(.3, .25, 1500); T(600, .3, 'triangle', .15, 1600, .08); break;
      case 'pickup': [660, 880, 1320].forEach((f, i) => T(f, .12, 'triangle', .16, null, i * .05)); break;
      case 'heal': [523, 659, 784, 1046].forEach((f, i) => T(f, .16, 'sine', .18, null, i * .06)); break;
      case 'potion': T(300, .35, 'sine', .22, 1200); N(.3, .06, 2000, 0, 'bandpass'); [880, 1175].forEach((f, i) => T(f, .2, 'triangle', .12, null, .2 + i * .08)); break;
      case 'ammo': T(300, .06, 'square', .1); T(500, .08, 'square', .1, null, .07); break;
      case 'weapon': [392, 523, 659, 784, 1046].forEach((f, i) => T(f, .18, 'square', .09, null, i * .07)); break;
      case 'jump': T(280, .14, 'sine', .15, 560); break;
      case 'land': N(.08, .08, 500); break;
      case 'hurt': T(220, .22, 'square', .14, 80); N(.1, .15, 900); break;
      case 'shieldHit': T(1200, .15, 'sine', .15, 2000); T(1800, .1, 'triangle', .08); break;
      case 'heartbeat': T(62, .12, 'sine', .5, 45); T(58, .12, 'sine', .4, 42, .18); break;
      case 'lifeLost': [523, 392, 330, 262].forEach((f, i) => T(f, .25, 'triangle', .2, null, i * .14)); break;
      case 'gameOver': [392, 370, 349, 262].forEach((f, i) => T(f, .4, 'triangle', .22, null, i * .3)); break;
      case 'waveDone': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => T(f, .18, 'square', .08, null, i * .09)); break;
      case 'secret': [1046, 1318, 1568, 2093, 1568, 2093].forEach((f, i) => T(f, .12, 'triangle', .13, null, i * .06)); break;
      case 'highscore': [523, 659, 784, 1046, 1318].forEach((f, i) => { T(f, .22, 'square', .07, null, i * .1); T(f * 1.5, .22, 'sine', .07, null, i * .1); }); break;
      case 'bossWarn': for (let i = 0; i < 4; i++) { T(440, .35, 'sawtooth', .12, 330, i * .5); T(220, .35, 'square', .08, 165, i * .5); } break;
      case 'slam': N(.6, .5, 900, 0, 'lowpass', 60); T(90, .6, 'sine', .5, 30); break;
      case 'spit': T(500, .12, 'sine', .12, 200); N(.1, .08, 1500, 0, 'bandpass'); break;
      case 'chomp': T(180, .08, 'square', .1, 120); T(160, .08, 'square', .1, 100, .1); break;
      case 'roar': T(140, .8, 'sawtooth', .18, 70); N(.8, .15, 500, 0, 'lowpass', 200); break;
      case 'box': [784, 988, 1175, 1568].forEach((f, i) => T(f, .15, 'triangle', .14, null, i * .08)); N(.2, .1, 3000, .3, 'highpass'); break;
      case 'door': T(150, .3, 'sawtooth', .06, 110); N(.25, .1, 600); break;
      case 'power': N(.5, .3, 3000, 0, 'bandpass', 200); T(80, .5, 'sine', .4, 400); break;
      case 'empty': T(900, .03, 'square', .05); break;
      case 'reload': T(400, .05, 'square', .08); T(700, .05, 'square', .08, null, .15); break;
      case 'click': T(700, .05, 'triangle', .12); break;
      case 'victory': [523, 523, 523, 659, 784, 659, 784, 1046].forEach((f, i) => T(f, .25, 'square', .08, null, i * .14)); break;
      case 'step-grass': N(.07, .05, 700); break;
      case 'step-sand': N(.09, .06, 2500, 0, 'bandpass'); break;
      case 'step-rock': N(.04, .06, 1800, 0, 'bandpass'); T(260 * r, .03, 'triangle', .03); break;
      case 'step-metal': T(900 * r, .05, 'triangle', .03, 700); N(.03, .03, 5000, 0, 'highpass'); break;
      case 'step-goo': T(300 * r, .08, 'sine', .06, 160); break;
      case 'step-water': N(.12, .08, 1600, 0, 'bandpass', 600); break;
      case 'levelup': [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => { T(f, .2, 'square', .06, null, i * .07); T(f * 2, .15, 'triangle', .04, null, i * .07 + .03); }); break;
      case 'lava': N(.3, .2, 900, 0, 'lowpass'); T(300, .2, 'sawtooth', .08, 120); break;
      case 'warpOpen': [392, 523, 659, 784, 1046, 1318].forEach((f, i) => T(f, .5, 'sine', .12, f * 1.5, i * .08)); N(1, .12, 6000, 0, 'highpass', 1500); break;
      case 'warp': T(120, 2.6, 'sawtooth', .12, 1800); T(180, 2.6, 'square', .06, 2600); N(2.6, .2, 400, 0, 'bandpass', 8000); [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => T(f, .3, 'triangle', .08, null, .6 + i * .22)); break;
      case 'spawn': T(160, .2, 'sine', .08, 320); break;
    }
  }

  // ---- music: multi-track sequencer (drums, bass, chords, lead melody, arps, echo) ----
  setMusic(mode) { if (this.musicMode === mode) return; this.musicMode = mode; this.step = 0; if (this.ctx) this.nextT = this.ctx.currentTime + .08; }

  fxBus() {
    if (this.delay) return; const c = this.ctx;
    this.delay = c.createDelay(1); this.delayFb = c.createGain(); this.delayWet = c.createGain(); this.delayFb.gain.value = .32; this.delayWet.gain.value = .28;
    this.delay.connect(this.delayFb); this.delayFb.connect(this.delay); this.delay.connect(this.delayWet); this.delayWet.connect(this.musG);
    const len = c.sampleRate * 1.8, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.verb = c.createConvolver(); this.verb.buffer = ir; this.verbWet = c.createGain(); this.verbWet.gain.value = .22; this.verb.connect(this.verbWet); this.verbWet.connect(this.musG);
  }
  voice(f, dur, o) {
    const c = this.ctx, t = c.currentTime + o.when;
    const g = c.createGain(); let last = g;
    const oscs = (o.det ? [-o.det, o.det] : [0]).map(dt => { const x = c.createOscillator(); x.type = o.wave; x.frequency.setValueAtTime(f, t); x.detune.value = dt; return x; });
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = o.vib; l.connect(lg); oscs.forEach(x => lg.connect(x.frequency)); l.start(t); l.stop(t + dur + .3); }
    let head = g;
    if (o.cut) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.cut, t); if (o.sweep) fl.frequency.exponentialRampToValueAtTime(o.cut * o.sweep, t + dur); fl.Q.value = o.q || 1; oscs.forEach(x => x.connect(fl)); fl.connect(g); } else oscs.forEach(x => x.connect(g));
    const att = o.att || .005, rel = o.rel ?? .08, v = o.vol;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + att);
    if (o.pluck) g.gain.exponentialRampToValueAtTime(v * .25, t + Math.min(dur, .18));
    g.gain.setValueAtTime(o.pluck ? v * .25 : v, t + Math.max(att, dur - rel * .5)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    g.connect(this.musG); if (o.echo) g.connect(this.delay); if (o.verb) g.connect(this.verb);
    oscs.forEach(x => { x.start(t); x.stop(t + dur + rel + .05); });
  }
  drum(kind, when, v = 1) {
    const M = this.musG;
    if (kind === 'k') { this.tone(155, .22, 'sine', .6 * v, 42, when, M); this.noise(.02, .15 * v, 3000, when, 'lowpass', null, M); }
    else if (kind === 's') { this.noise(.16, .22 * v, 1900, when, 'bandpass', null, M); this.tone(210, .08, 'triangle', .1 * v, 150, when, M); }
    else if (kind === 'c') { for (let i = 0; i < 3; i++) this.noise(.05, .14 * v, 1300, when + i * .012, 'bandpass', null, M); }
    else if (kind === 'h') this.noise(.035, .05 * v, 8500, when, 'highpass', null, M);
    else if (kind === 'o') this.noise(.16, .045 * v, 7000, when, 'highpass', null, M);
    else if (kind === 't') this.tone(180, .16, 'sine', .3 * v, 90, when, M);
  }
  schedule() {
    const c = this.ctx; if (!c || !this.musicMode || c.state !== 'running') return;
    const S = SONGS[this.musicMode]; if (!S) return;
    this.fxBus(); prep(S);
    const sd = 60 / S.bpm / 4;
    if (this.nextT < c.currentTime) this.nextT = c.currentTime + .03;
    while (this.nextT < c.currentTime + .3) {
      const s = this.step % 16, bar = Math.floor(this.step / 16), when = this.nextT - c.currentTime + (s % 2 ? (S.swing || 0) * sd : 0);
      const [cr, cq] = S.prog[bar % S.prog.length], root = S.key + cr, third = cq === 'm' ? 3 : 4;
      const fill = bar % 8 === 7 && s >= 12;
      for (const k of ['k', 's', 'c', 'h']) { const ch = S.dr[k]?.[s]; if (ch === 'x') this.drum(k === 'h' ? 'h' : k, when); else if (ch === 'o') this.drum(k === 'h' ? 'o' : k, when, .5); }
      if (fill) this.drum(s % 2 ? 't' : 's', when, .7);
      if (bar % 8 === 0 && s === 0 && bar > 0) this.noise(1.2, .08, 9000, when, 'highpass', 2000, this.musG);
      const b = S.bassP[s]; if (b) this.voice(midi(root - 24 + b.n), b.len * sd * .92, { wave: S.bassWave || 'sawtooth', vol: .2, cut: S.bassCut || 700, when, rel: .05 });
      if (s === 0 && S.pad !== false) [0, third, 7].forEach(iv => this.voice(midi(root + iv + (S.padOct || 0)), 16 * sd, { wave: 'sawtooth', det: 9, vol: .028, cut: 1100, att: .25, rel: .4, when, verb: true }));
      if (S.arpP && bar >= 1) { const a = S.arpP[s]; if (a) { const tones = [0, third, 7, 12, 12 + third, 19]; this.voice(midi(root + 12 + tones[a.n % 6]), sd * .8, { wave: S.arpWave || 'square', vol: .032, cut: 2600, when, echo: true, rel: .04 }); } }
      if (bar >= 2) {
        const pass = Math.floor((bar - 2) / S.leadP.length), lb = S.leadP[(bar - 2) % S.leadP.length], n = lb[s];
        if (n) this.voice(midi(S.key + 12 + (S.leadOct || 0) + n.n + (pass % 2 ? (S.alt || 0) : 0)), n.len * sd * .95, { when, wave: S.leadWave, vol: S.leadVol || .07, cut: S.leadCut, echo: true, verb: true, vib: S.vib, pluck: S.pluck, det: S.leadDet, rel: .1 });
      }
      this.nextT += sd; this.step++;
    }
  }
  haptic(ms) { if (this.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }
}
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function parse(str) { const t = str.trim().split(/\s+/), out = []; for (let i = 0; i < 16; i++) { const x = t[i]; if (x === undefined || x === '.' || x === '_') { out.push(null); continue; } let len = 1; while (t[i + len] === '.') len++; out.push({ n: +x, len }); } return out; }
function prep(S) { if (S.ready) return; S.ready = true; S.bassP = parse(S.bass); S.leadP = S.lead.map(parse); if (S.arp) S.arpP = parse(S.arp); for (const k in S.dr) S.dr[k] = S.dr[k].padEnd(16, '.'); }
const M = 'M', m = 'm';
// Melody tokens: semitones from the key (one bar = 16 steps). '.' holds the note, '_' is a rest.
const SONGS = {
  menu: { bpm: 112, key: 60, prog: [[0, M], [7, M], [9, m], [5, M]], leadWave: 'square', leadVol: .06, leadCut: 3000, alt: 12,
    dr: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...xo' }, bass: '0 . . 0 _ 0 12 . 0 . . 0 _ 7 5 .',
    lead: ['7 . 12 . 11 . 12 . 14 . 12 . 7 . . .', '7 . 11 . 14 . 11 . 7 . 5 . 2 . . .', '9 . 12 . 16 . 14 . 12 . 9 . 12 . 14 .', '12 . 9 . 5 . 9 . 12 . . . _ _ _ _'] },
  woods: { bpm: 124, key: 62, prog: [[0, m], [-4, M], [-2, M], [-5, m]], leadWave: 'square', leadVol: .06, leadCut: 3200, alt: 12, arp: '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 3', arpWave: 'triangle',
    dr: { k: 'x...x..xx...x...', s: '....x.......x..o', h: 'x.x.x.x.x.x.x.xo' }, bass: '0 _ 0 12 _ 0 _ 0 0 _ 0 12 _ 7 _ 5',
    lead: ['0 . 3 . 5 . 7 . 10 . 7 . 5 . 3 .', '2 . . . -2 . 2 . 5 . 2 . -2 . . .', '0 . 3 . 5 . 7 . 12 . 10 . 7 . 5 .', '7 . . . 3 . 7 . 12 . . . _ _ _ _'] },
  water: { bpm: 108, key: 65, swing: .18, prog: [[0, M], [5, M], [7, M], [0, M]], leadWave: 'triangle', leadVol: .16, pluck: true, alt: 12, arp: '0 _ 2 _ 1 _ 2 _ 0 _ 2 _ 1 _ 3 _', arpWave: 'sine', bassWave: 'triangle', bassCut: 900,
    dr: { k: 'x.....x.x.....x.', c: '....x.......x...', h: '.x.x.x.x.x.x.x.x' }, bass: '0 . _ 0 _ _ 7 _ 0 . _ 0 _ 7 _ 5',
    lead: ['0 _ 4 _ 7 _ 9 _ 7 _ 4 _ 5 _ 7 _', '5 _ 9 _ 12 _ 9 _ 10 _ 9 _ 5 _ 2 _', '7 _ 11 _ 14 _ 12 _ 11 _ 7 _ 5 _ 4 _', '0 _ 4 _ 7 _ 12 _ 7 . . . _ _ _ _'] },
  volcano: { bpm: 138, key: 52, prog: [[0, m], [-4, M], [-2, M], [-5, M]], leadWave: 'sawtooth', leadVol: .055, leadCut: 2400, leadDet: 7, alt: 12, bassWave: 'square', bassCut: 520,
    dr: { k: 'x..xx...x..xx...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' }, bass: '0 0 12 0 0 0 12 0 0 0 12 0 0 12 0 12',
    lead: ['12 . 12 . 15 . 12 . 17 . 15 . 12 . 10 .', '8 . . . 7 . 8 . 10 . 12 . 10 . 8 .', '10 . 10 . 14 . 10 . 17 . 14 . 12 . 10 .', '11 . . . 7 . 11 . 14 . 11 . 7 . 3 .'] },
  space: { bpm: 104, key: 57, prog: [[0, m], [-4, M], [3, M], [-2, M]], leadWave: 'square', leadVol: .05, leadCut: 2200, alt: 12, arp: '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1', arpWave: 'sawtooth', padOct: 12,
    dr: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' }, bass: '0 . 0 . 0 . 0 . 0 . 0 . 0 . 12 .',
    lead: ['12 . . . 10 . 12 . 15 . . . 14 . 12 .', '8 . . . 7 . 8 . 12 . . . 10 . 8 .', '7 . . . 10 . 12 . 15 . 14 . 12 . 10 .', '10 . . . 7 . . . 14 . . . _ _ _ _'] },
  alien: { bpm: 116, key: 61, prog: [[0, m], [1, M], [0, m], [-2, M]], leadWave: 'sine', leadVol: .11, vib: 9, alt: 12, arp: '0 2 1 3 0 2 1 3 0 2 1 3 0 2 1 3', arpWave: 'triangle', bassWave: 'square', bassCut: 600,
    dr: { k: 'x..x..x...x..x..', s: '....x.......x...', h: 'x.xx.x.xx.x.xx.x' }, bass: '0 _ _ 0 _ _ 0 _ 1 _ _ 1 _ _ 0 _',
    lead: ['0 . 1 . 4 . 1 . 0 . . . 7 . 6 .', '4 . 3 . 1 . 0 . 1 . . . _ _ _ _', '12 . 13 . 12 . 10 . 8 . 7 . 8 . 10 .', '7 . . . 6 . . . 1 . . . 0 . . .'] },
  boss: { bpm: 150, key: 48, prog: [[0, m], [-4, M], [-2, M], [-5, M]], leadWave: 'sawtooth', leadVol: .055, leadCut: 2800, leadDet: 8, leadOct: 12, alt: 12, arp: '0 1 2 3 0 1 2 3 0 1 2 3 0 1 2 3', bassWave: 'square', bassCut: 600,
    dr: { k: 'x...x.x.x...x.x.', s: '....x.......x...', c: '............x...', h: 'xxxxxxxxxxxxxxxx' }, bass: '0 0 12 0 0 12 0 0 12 0 0 12 0 12 0 12',
    lead: ['0 . 0 . 3 . 0 . 7 . 6 . 7 . 10 .', '8 . 7 . 5 . 3 . 5 . . . 0 . . .', '10 . 10 . 12 . 10 . 14 . 12 . 10 . 7 .', '11 . 7 . 11 . 14 . 11 . 7 . 5 . 2 .'] },
  cosmic: { bpm: 120, key: 62, prog: [[0, M], [-2, M], [-5, M], [-7, M]], leadWave: 'square', leadVol: .05, leadCut: 2600, leadDet: 5, alt: 12, arp: '0 2 4 2 1 3 5 3 0 2 4 2 1 3 5 3', arpWave: 'triangle', padOct: 12, swing: .08,
    dr: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.xox.x.x.xox.x.' }, bass: '0 . 7 . 12 . 7 . 0 . 7 . 12 . 10 .',
    lead: ['7 . 9 . 11 . 14 . 12 . . . 11 . 9 .', '7 . . . 5 . 4 . 2 . . . _ _ _ _', '4 . 7 . 11 . 12 . 14 . 16 . 14 . 12 .', '11 . . . 12 . . . 7 . . . _ _ _ _'] },
  sun: { bpm: 158, key: 50, prog: [[0, m], [-2, M], [-4, M], [-5, M]], leadWave: 'sawtooth', leadVol: .06, leadCut: 3400, leadDet: 9, leadOct: 12, alt: 12, arp: '0 1 2 3 4 3 2 1 0 1 2 3 4 5 4 3', arpWave: 'square', bassWave: 'sawtooth', bassCut: 800,
    dr: { k: 'x.x.x.x.x.x.x.x.', s: '....x.......x.xo', c: 'x...............', h: '.x.x.x.x.x.x.x.x' }, bass: '0 12 0 12 0 12 0 12 -2 10 -2 10 -5 7 -5 7',
    lead: ['12 . 15 . 17 . 19 . 17 . 15 . 12 . 15 .', '10 . 12 . 14 . 15 . 14 . . . 10 . . .', '8 . 12 . 15 . 20 . 19 . 17 . 15 . 12 .', '7 . 10 . 14 . 19 . 17 . . . 14 . 19 .'] },
  break: { bpm: 92, key: 55, prog: [[0, M], [-3, m], [5, M], [7, M]], leadWave: 'triangle', leadVol: .14, pluck: true, alt: 12,
    dr: { k: 'x.......x.......', s: '........x.......', h: '..x...x...x...x.' }, bass: '0 . . . _ _ 7 . 0 . . . _ _ 7 .',
    lead: ['12 _ _ 14 _ _ 16 _ _ _ 19 _ 16 _ _ _', '14 _ _ 12 _ _ 11 _ _ _ 7 _ _ _ _ _'] },
};
