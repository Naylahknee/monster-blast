import { GAME } from './config.js';

export const DEFAULT_SETTINGS = { sensitivity: 1, fireMode: 'auto', difficulty: 'normal', master: .8, music: .5, sfx: .9, vibration: true, view: 'third', graphics: 'high', shirt: 'blue', v2: true, online: false, pin: '', family: '', serverUrl: '' };
export const DEFAULT_PROGRESS = {
  highScore: 0, bestWave: 0, monsters: 0, slimes: 0, bosses: 0, plays: 0,
  weapons: ['blaster'], worlds: ['woods'], cleared: [], stages: {}, missions: [], achievements: [], xp: 0, lastWorld: 'woods',
};

let db = null;
const STORE = 'kv';

function openDB() {
  return new Promise(res => {
    try {
      const r = indexedDB.open(GAME.db, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => { db = r.result; res(); };
      r.onerror = () => res();
      setTimeout(res, 1500);
    } catch (e) { res(); }
  });
}
function idbGet(key) {
  return new Promise(res => {
    if (!db) return res(undefined);
    try {
      const q = db.transaction(STORE).objectStore(STORE).get(key);
      q.onsuccess = () => res(q.result); q.onerror = () => res(undefined);
    } catch (e) { res(undefined); }
  });
}
function lsGet(key) { try { return JSON.parse(localStorage.getItem(GAME.db + ':' + key)); } catch (e) { return null; } }

export async function loadSave() {
  await openDB();
  const out = {};
  for (const [key, def] of [['settings', DEFAULT_SETTINGS], ['progress', DEFAULT_PROGRESS]]) {
    const v = (await idbGet(key)) || lsGet(key) || {};
    out[key] = { ...structuredClone(def), ...v };
    if (key === 'settings' && !out[key].v2) { out[key].v2 = true; out[key].view = 'third'; }
    if (key === 'progress' && !out[key].v3) { const p = out[key]; p.v3 = true; if (!p.bosses || p.cleared.length > p.bosses) { p.cleared = []; p.lastWorld = 'woods'; } persist('progress', p); }
  }
  return out;
}

export function persist(key, value) {
  const v = JSON.parse(JSON.stringify(value));
  try { localStorage.setItem(GAME.db + ':' + key, JSON.stringify(v)); } catch (e) {}
  if (db) { try { db.transaction(STORE, 'readwrite').objectStore(STORE).put(v, key); } catch (e) {} }
}
