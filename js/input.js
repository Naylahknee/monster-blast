// Multi-touch input: floating left joystick, invisible right look-surface, and right-thumb buttons.
export class Input {
  constructor() {
    this.move = { x: 0, y: 0, mag: 0 };
    this.lookDX = 0; this.lookDY = 0;
    this.fireHeld = false; this.mouseFire = false;
    this.jump = false; this.action = false; this.cycle = 0; this.reload = false; this.pause = false;
    this.keys = {};
    this.joyId = null; this.lookId = null; this.fireId = null;
    this.enabled = false;
    this.joy = document.getElementById('joy'); this.knob = document.getElementById('joyKnob');
    const touch = this.touchEl = document.getElementById('touch');
    touch.addEventListener('lostpointercapture', e => this.up(e));
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.releaseAll(); });
    touch.addEventListener('pointerdown', e => this.down(e));
    window.addEventListener('pointermove', e => this.moveEv(e), { passive: false });
    window.addEventListener('pointerup', e => this.up(e));
    window.addEventListener('pointercancel', e => this.up(e));

    const btn = (id, fn) => { const el = document.getElementById(id); el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('on'); fn(e, el); }); const off = () => el.classList.remove('on'); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off); return el; };
    btn('fireBtn', (e, el) => { this.fireHeld = true; this.fireId = e.pointerId; this.fx = e.clientX; this.fy = e.clientY; try { el.setPointerCapture(e.pointerId); } catch (_) {} });
    btn('jumpBtn', () => { this.jump = true; });
    btn('actionBtn', () => { this.action = true; });
    btn('pauseBtn', () => { this.pause = true; });
    btn('viewBtn', () => { this.view = true; });
    btn('zoomBtn', () => { this.zoom = true; });
    btn('minimapBtn', () => { this.map = true; });

    const wp = document.getElementById('weaponPanel');
    wp.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); this.wId = e.pointerId; this.wx = e.clientX; this.wt = performance.now(); this.wSwiped = false; try { wp.setPointerCapture(e.pointerId); } catch (_) {} });
    wp.addEventListener('pointermove', e => { if (e.pointerId !== this.wId || this.wSwiped) return; const dx = e.clientX - this.wx; if (Math.abs(dx) > 28) { this.cycle = dx > 0 ? 1 : -1; this.wSwiped = true; } });
    wp.addEventListener('pointerup', e => { if (e.pointerId !== this.wId) return; if (!this.wSwiped && performance.now() - this.wt < 400) this.tray = true; this.wId = null; });

    window.addEventListener('keydown', e => { this.keys[e.code] = true; if (!this.enabled) return;
      if (e.code === 'Space') { this.jump = true; e.preventDefault(); }
      if (e.code === 'Escape' || e.code === 'KeyP') this.pause = true;
      if (e.code === 'KeyE') this.cycle = 1; if (e.code === 'KeyQ') this.cycle = -1;
      if (e.code === 'KeyR') this.reload = true; if (e.code === 'Tab') { this.tray = true; e.preventDefault(); } if (/^Digit[1-9]$/.test(e.code)) this.slot = +e.code.slice(5); if (e.code === 'KeyV') this.view = true; if (e.code === 'KeyZ') this.zoom = true; if (e.code === 'KeyM') this.map = true; if (e.code === 'KeyF') this.action = true; });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    // desktop test controls: pointer lock mouse look
    this.canLock = matchMedia('(pointer: fine)').matches;
    document.addEventListener('mousemove', e => { if (document.pointerLockElement) { this.lookDX += e.movementX * .8; this.lookDY += e.movementY * .8; } });
    document.addEventListener('mousedown', e => { if (document.pointerLockElement && e.button === 0) this.mouseFire = true; if (document.pointerLockElement && e.button === 2) this.zoomHold = true; });
    document.addEventListener('mouseup', e => { if (e.button === 0) this.mouseFire = false; if (e.button === 2) this.zoomHold = false; });
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && this.enabled && this.wasLocked) this.pause = true; this.wasLocked = !!document.pointerLockElement; });
    window.addEventListener('wheel', e => { if (this.enabled) this.cycle = e.deltaY > 0 ? 1 : -1; }, { passive: true });
  }

  down(e) {
    if (!this.enabled) return;
    e.preventDefault();
    if (e.pointerType === 'mouse' && this.canLock && !document.pointerLockElement) {
      try { const p = document.body.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {}
    }
    if (e.pointerType === 'mouse' && document.pointerLockElement) return;
    const w = innerWidth;
    try { this.touchEl.setPointerCapture(e.pointerId); } catch (_) {}
    if (e.clientX < w * .42 && this.joyId === null) {
      this.joyId = e.pointerId; this.bx = e.clientX; this.by = e.clientY;
      const m = this.R() + 10; this.bx = Math.max(m, this.bx); this.by = Math.min(innerHeight - m, Math.max(m, this.by));
      this.joy.style.transform = `translate(${this.bx}px,${this.by}px)`; this.knob.style.transform = 'translate(0px,0px)';
      this.joy.classList.add('active');
    } else if (this.lookId === null && e.clientX >= w * .42) {
      this.lookId = e.pointerId; this.lx = e.clientX; this.ly = e.clientY;
    }
  }
  releaseAll() { this.keys = {}; this.joyId = this.lookId = this.fireId = null; this.move.x = this.move.y = this.move.mag = 0; this.fireHeld = this.mouseFire = false; this.joy.classList.remove('active', 'sprint'); }
  R() { return Math.min(64, innerHeight * .15); }
  moveEv(e) {
    if (e.pointerId === this.joyId) {
      e.preventDefault();
      const R = this.R(); let dx = e.clientX - this.bx, dy = e.clientY - this.by; let d = Math.hypot(dx, dy);
      if (d > R * 1.5) { const k = (d - R * 1.5) / d; this.bx += dx * k; this.by += dy * k; dx = e.clientX - this.bx; dy = e.clientY - this.by; d = Math.hypot(dx, dy); this.joy.style.transform = `translate(${this.bx}px,${this.by}px)`; }
      const cl = Math.min(d, R), kx = d ? dx / d * cl : 0, ky = d ? dy / d * cl : 0;
      this.knob.style.transform = `translate(${kx}px,${ky}px)`;
      let mag = Math.min(1, d / R); const dead = .14;
      mag = mag < dead ? 0 : (mag - dead) / (1 - dead);
      this.move.x = d ? dx / d * mag : 0; this.move.y = d ? -dy / d * mag : 0; this.move.mag = mag;
      this.joy.classList.toggle('sprint', this.move.y > .82 && mag > .92);
    } else if (e.pointerId === this.lookId) {
      this.lookDX += e.clientX - this.lx; this.lookDY += e.clientY - this.ly; this.lx = e.clientX; this.ly = e.clientY;
    } else if (e.pointerId === this.fireId) {
      this.lookDX += (e.clientX - this.fx) * .9; this.lookDY += (e.clientY - this.fy) * .9; this.fx = e.clientX; this.fy = e.clientY;
    }
  }
  up(e) {
    if (e.pointerId === this.joyId) { this.joyId = null; this.move.x = this.move.y = this.move.mag = 0; this.joy.classList.remove('active', 'sprint'); }
    if (e.pointerId === this.lookId) this.lookId = null;
    if (e.pointerId === this.fireId) { this.fireId = null; this.fireHeld = false; }
  }
  // merged movement vector (touch + keyboard)
  getMove() {
    let x = this.move.x, y = this.move.y, sprint = this.move.y > .82 && this.move.mag > .92;
    const k = this.keys;
    const kx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), ky = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    if (kx || ky) { const l = Math.hypot(kx, ky); x = kx / l; y = ky / l; sprint = !!k.ShiftLeft || (ky > 0 && !kx && false); if (k.ShiftLeft && ky > 0) sprint = true; }
    return { x, y, sprint };
  }
  takeLook() { const r = [this.lookDX, this.lookDY]; this.lookDX = this.lookDY = 0; return r; }
  reset() {
    this.joyId = this.lookId = this.fireId = null; this.move.x = this.move.y = this.move.mag = 0; this.fireHeld = this.mouseFire = false;
    this.jump = this.action = this.reload = this.pause = this.view = this.tray = this.zoom = this.map = this.zoomHold = false; this.keys = {}; this.cycle = 0; this.lookDX = this.lookDY = 0;
    this.joy.classList.remove('active', 'sprint');
  }
}
