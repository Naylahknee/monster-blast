// Monster Blast multiplayer server — Cloudflare Worker + Durable Objects.
// Private rooms (5-digit codes, max 4 players), relay-only, no chat: only whitelisted game messages
// with numbers and short lowercase tokens can pass through. Also hosts private family leaderboards.

const ADJ = ['Zippy', 'Bouncy', 'Cosmic', 'Sparkly', 'Mighty', 'Giggly', 'Turbo', 'Fuzzy', 'Happy', 'Super', 'Speedy', 'Jolly', 'Wobbly', 'Sneaky', 'Brave', 'Lucky', 'Silly', 'Shiny', 'Rocket', 'Bubbly'];
const ANI = ['Frog', 'Panda', 'Tiger', 'Otter', 'Koala', 'Penguin', 'Llama', 'Fox', 'Bunny', 'Dino', 'Puppy', 'Kitten', 'Dragon', 'Owl', 'Monkey', 'Turtle', 'Unicorn', 'Bear', 'Shark', 'Robot'];
const COLORS = ['blue', 'red', 'green', 'purple'];
const MODES = ['coop', 'race', 'tag'];
const RELAY = new Set(['st', 'es', 'hit', 'kill', 'wave', 'hurt', 'splat', 'emo', 'fin', 'goto', 'warpReq', 'warpOpen', 'shot', 'end', 'ping', 'again']);
const TOKEN = /^[a-z0-9]{1,12}$/;

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });
const validName = n => { if (typeof n !== 'string') return false; const [a, b] = n.split(' '); return ADJ.includes(a) && ANI.includes(b); };
const randName = () => ADJ[Math.floor(Math.random() * ADJ.length)] + ' ' + ANI[Math.floor(Math.random() * ANI.length)];

// Only numbers, booleans, arrays and short lowercase tokens survive — no free text can be relayed.
function clean(v, depth = 0) {
  if (depth > 5) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return TOKEN.test(v) ? v : null;
  if (Array.isArray(v)) return v.slice(0, 80).map(x => clean(x, depth + 1));
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).slice(0, 24)) if (/^[a-zA-Z]{1,8}$/.test(k)) o[k] = clean(v[k], depth + 1); return o; }
  return null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'health') return json({ ok: true, game: 'monster-blast' });
    if (parts[0] === 'new') return json({ code: String(10000 + Math.floor(Math.random() * 90000)) });
    if (parts[0] === 'room' && /^\d{5}$/.test(parts[1] || '')) return env.ROOMS.get(env.ROOMS.idFromName('room-' + parts[1])).fetch(req);
    if (parts[0] === 'board') {
      if (parts[1] === 'new') return json({ code: String(100000 + Math.floor(Math.random() * 900000)) });
      if (/^\d{6}$/.test(parts[1] || '')) return env.BOARDS.get(env.BOARDS.idFromName('board-' + parts[1])).fetch(req);
    }
    return json({ error: 'not found' }, 404);
  },
};

export class Room {
  constructor(state) { this.state = state; this.players = new Map(); this.cfg = { mode: 'coop', world: 'woods', stage: 0 }; this.started = false; this.host = null; this.next = 1; }

  peers() { return [...this.players.values()].map(p => ({ id: p.id, name: p.name, color: p.color })); }
  broadcast(msg, except) { const s = JSON.stringify(msg); for (const p of this.players.values()) if (p.id !== except) { try { p.ws.send(s); } catch (e) {} } }

  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'websocket only' }, 426);
    if (this.players.size >= 4) return json({ error: 'full' }, 403);
    const pair = new WebSocketPair(); const [client, ws] = Object.values(pair); ws.accept();
    const id = this.next++;
    const used = new Set([...this.players.values()].map(p => p.color));
    const p = { id, ws, name: randName(), color: COLORS.find(c => !used.has(c)) || 'blue', last: Date.now(), hello: false };
    ws.addEventListener('message', ev => this.onMsg(p, ev.data));
    const bye = () => this.leave(p);
    ws.addEventListener('close', bye); ws.addEventListener('error', bye);
    return new Response(null, { status: 101, webSocket: client });
  }

  onMsg(p, raw) {
    if (typeof raw !== 'string' || raw.length > 12000) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const now = Date.now();
    if (m.t === 'hello') {
      if (p.hello) return;
      if (this.started) { p.ws.send(JSON.stringify({ t: 'err', e: 'started' })); p.ws.close(); return; }
      p.hello = true; if (validName(m.name)) p.name = m.name;
      this.players.set(p.id, p); if (!this.host) this.host = p.id;
      p.ws.send(JSON.stringify({ t: 'welcome', id: p.id, name: p.name, color: p.color, host: this.host, peers: this.peers(), cfg: this.cfg }));
      this.broadcast({ t: 'peers', peers: this.peers(), host: this.host }, p.id);
      return;
    }
    if (!p.hello) return;
    if (m.t === 'cfg' && p.id === this.host && !this.started) {
      this.cfg = { mode: MODES.includes(m.mode) ? m.mode : 'coop', world: TOKEN.test(m.world || '') ? m.world : 'woods', stage: Math.max(0, Math.min(2, m.stage | 0)) };
      this.broadcast({ t: 'cfg', cfg: this.cfg }); return;
    }
    if (m.t === 'start' && p.id === this.host && !this.started) { this.started = true; this.broadcast({ t: 'start', cfg: this.cfg, seed: Math.floor(Math.random() * 1e9), at: now }); return; }
    if (m.t === 'lobby' && p.id === this.host) { this.started = false; this.broadcast({ t: 'lobby', cfg: this.cfg }); return; }
    if (m.t === 'emo') { if (now - (p.lastEmo || 0) < 700) return; p.lastEmo = now; this.broadcast({ t: 'emo', from: p.id, i: Math.max(0, Math.min(5, m.i | 0)) }); return; }
    if (!RELAY.has(m.t)) return;
    const out = clean(m); out.t = m.t; out.from = p.id;
    if (typeof m.to === 'number') { const q = this.players.get(m.to); if (q) try { q.ws.send(JSON.stringify(out)); } catch (e) {} }
    else this.broadcast(out, p.id);
  }

  leave(p) {
    if (!this.players.has(p.id)) return;
    this.players.delete(p.id);
    if (this.host === p.id) this.host = this.players.size ? [...this.players.keys()][0] : null;
    if (!this.players.size) { this.started = false; this.cfg = { mode: 'coop', world: 'woods', stage: 0 }; }
    this.broadcast({ t: 'peers', peers: this.peers(), host: this.host, left: p.id });
  }
}

export class Board {
  constructor(state) { this.state = state; }
  async fetch(req) {
    let list = (await this.state.storage.get('list')) || [];
    if (req.method === 'POST') {
      let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad' }, 400); }
      const score = Math.max(0, Math.min(99999999, b.score | 0)), world = TOKEN.test(b.world || '') ? b.world : 'woods';
      if (!validName(b.name) || !score) return json({ error: 'bad' }, 400);
      list.push({ name: b.name, score, world, at: Date.now() });
      list.sort((a, c) => c.score - a.score); list = list.slice(0, 20);
      await this.state.storage.put('list', list);
    }
    return json({ list });
  }
}
