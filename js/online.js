// Online extras: bonus worlds + daily challenge from packs/bonus.json. Only available with an internet connection.
import { WORLDS, CHECKPOINTS, EXTRA_WAVES } from './config.js';
import { registerTheme } from './worlds.js';

export const BONUS = { worlds: [], daily: [], loaded: false, online: navigator.onLine };
const PW = [{ slime: 6, bat: 2, gap: 2 }, { slime: 5, chomper: 4, bat: 2, gap: 1.7 }, { spitter: 4, bat: 4, chomper: 3, gap: 1.6 }, { slime: 5, spitter: 4, bat: 4, tank: 1, gap: 1.4 }, { slime: 5, chomper: 5, spitter: 4, bat: 4, tank: 2, gap: 1.2 }];
const hex = v => typeof v === 'string' && v[0] === '#' ? parseInt(v.slice(1), 16) : v;
const conv = o => Array.isArray(o) ? o.map(conv) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === 'cols' ? v : conv(v)])) : hex(o);

export async function loadBonus() {
  BONUS.online = navigator.onLine;
  if (!navigator.onLine) return BONUS;
  try {
    const r = await fetch('packs/bonus.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('bad');
    const data = await r.json();
    BONUS.worlds = [];
    for (const w0 of data.worlds || []) {
      const w = conv(w0), T = w.theme;
      if (!WORLDS.some(x => x.id === w.id)) {
        registerTheme(w.id, { ...T, sky: [T.skyTop, T.sky] });
        CHECKPOINTS[w.id] = CHECKPOINTS[w.id] || [[20, 24], [-40, 20], [-20, -40], [0, -20], [40, -20]];
        EXTRA_WAVES[w.id] = EXTRA_WAVES[w.id] || [{ ghost: 2 }, { hopper: 2, bomber: 2 }, { shelly: 2, crystal: 1 }, { crystal: 2, ghost: 3 }, { crystal: 2, shelly: 2, bomber: 3 }];
      }
      BONUS.worlds.push({ id: w.id, name: w.name, css: w0.css, css2: w0.css2, music: w.music || 'cosmic', hp: w.hp || 1.4, bonus: true,
        waves: w.waves || PW, tips: [w.name + '!', '', '', '', 'FINAL WAVE!'], mission: w.mission, boss: w.boss, tints: w.tints, skins: w0.skins, names: w0.names, friends: w0.friends, crumbs: w.crumbs });
    }
    BONUS.daily = data.daily || [];
    BONUS.loaded = true; BONUS.online = true;
  } catch (e) { BONUS.loaded = false; BONUS.online = false; }
  return BONUS;
}

// Same challenge for everyone on the same day
export function todaysChallenge(unlocked) {
  if (!BONUS.daily.length) return null;
  const d = new Date(), key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  let s = key; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const mod = BONUS.daily[Math.floor(rnd() * BONUS.daily.length)];
  const pool = [...unlocked, ...BONUS.worlds];
  const world = pool[Math.floor(rnd() * pool.length)];
  const stage = Math.floor(rnd() * 3);
  return { key: String(key), mod, world, stage };
}
