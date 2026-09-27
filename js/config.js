// Central game data. Rename the game by editing GAME.name (and manifest.webmanifest).
export const GAME = { name: 'MONSTER BLAST', line1: 'MONSTER', line2: 'BLAST', version: '1.0.0', db: 'monster-blast' };

export const DIFFICULTY = {
  easy:      { label: 'EASY',      enemySpeed: .82, enemyDamage: .6,  enemyHp: .85, drops: 1.6, assist: 1.8, spawnGap: 1.3 },
  normal:    { label: 'NORMAL',    enemySpeed: 1,   enemyDamage: 1,   enemyHp: 1,   drops: 1,   assist: 1,   spawnGap: 1 },
  challenge: { label: 'CHALLENGE', enemySpeed: 1.15, enemyDamage: 1.35, enemyHp: 1.3, drops: .7, assist: .65, spawnGap: .8 },
};

export const WEAPON_ORDER = ['blaster', 'scatter', 'goo', 'freeze', 'bubble', 'lightning', 'bouncer', 'boomer', 'mega'];
export const WEAPONS = {
  blaster:   { name: 'STARTER BLASTER', color: 0x49e3ff, css: '#49e3ff', damage: 30, rate: 4.2, speed: 80, range: 42, clip: Infinity, kind: 'bolt', size: .13, sfx: 'blaster', desc: 'Never runs out.' , where: '' },
  scatter:   { name: 'STAR SCATTER', color: 0xffd43b, css: '#ffd43b', damage: 15, pellets: 7, spread: .075, rate: 1.7, speed: 70, range: 24, clip: 8, start: 32, kind: 'bolt', size: .1, sfx: 'scatter', desc: 'Sprays 7 stars at once. Best up close.', where: 'Hidden inside a secret spot.' },
  freeze:    { name: 'FREEZE RAY', color: 0x9be8ff, css: '#9be8ff', damage: 11, rate: 7, range: 24, clip: 45, start: 90, kind: 'beam', freeze: 1, sfx: 'freeze', desc: 'Keep zapping to freeze monsters solid.', where: 'Drops after you clear a wave.' },
  bubble:    { name: 'BUBBLE BLASTER', color: 0xd4b0ff, css: '#d4b0ff', damage: 16, rate: 2.6, speed: 22, range: 26, clip: 10, start: 30, kind: 'bubble', size: .38, trap: 3, sfx: 'bubble', desc: 'Traps monsters in floating bubbles.', where: 'Drops after you clear a wave.' },
  bouncer:   { name: 'BOUNCER', color: 0xff5fa8, css: '#ff5fa8', damage: 48, rate: 2.2, speed: 30, range: 40, clip: 10, start: 30, kind: 'bounce', size: .22, gravity: 16, bounces: 3, splash: 1.5, sfx: 'bouncer', desc: 'Bouncy balls that hop around corners.', where: 'Find it in a Mystery Box.' },
  goo:       { name: 'GOO CANNON', color: 0x8ff04a, css: '#8ff04a', damage: 42, rate: 2.2, speed: 40, range: 34, clip: 12, start: 36, kind: 'goo', size: .3, gravity: 7, splash: 1.8, slow: 3, sfx: 'goo', desc: 'Sticky goo slows monsters.', where: 'Find it in a Mystery Box or crate.' },
  lightning: { name: 'LIGHTNING BLASTER', color: 0xffe14a, css: '#ffe14a', damage: 32, rate: 3.2, range: 30, clip: 20, start: 40, kind: 'beam', chain: 3, chainRange: 7.5, sfx: 'zap', desc: 'Zaps jump between monsters.', where: 'Restore the power in Monster Woods.' },
  boomer:    { name: 'BOOMER', color: 0xff8a2a, css: '#ff8a2a', damage: 110, rate: 1.1, speed: 32, range: 38, clip: 6, start: 12, kind: 'boom', size: .36, gravity: 10, splash: 4.6, sfx: 'boom', desc: 'Big explosions, big crowds.', where: 'Something is locked in the old cabin.' },
  mega:      { name: 'MEGA BLASTER', color: 0xff4fd8, css: '#ff4fd8', damage: 130, rate: 7, speed: 95, range: 55, clip: Infinity, duration: 20, kind: 'mega', size: .3, splash: 2.2, sfx: 'mega', desc: 'Rare. Super powerful. 20 seconds!', where: 'Very rare Mystery Box prize.' },
};

export const ENEMIES = {
  slime:   { hp: 60,  speed: 2.3, damage: 10, radius: .85, height: .75, score: 100, color: 0x6ee85a, attack: 'melee', reach: 1.7, cd: 1.3, split: .4 },
  mini:    { hp: 22,  speed: 3.2, damage: 5,  radius: .45, height: .4,  score: 50,  color: 0xa6ff7a, attack: 'melee', reach: 1.2, cd: 1.1 },
  chomper: { hp: 70,  speed: 5.2, damage: 13, radius: .8,  height: .85, score: 150, color: 0xff8a2a, attack: 'melee', reach: 1.8, cd: 1.1 },
  spitter: { hp: 80,  speed: 2.8, damage: 11, radius: .8,  height: 1.1, score: 200, color: 0xb05cff, attack: 'ranged', keep: 11, cd: 2.6, shot: 13 },
  bat:     { hp: 45,  speed: 4.4, damage: 10, radius: .65, height: 3.4, score: 250, color: 0x4fa3ff, attack: 'dive', cd: 3.2, fly: true },
  tank:    { hp: 560, speed: 1.6, damage: 26, radius: 1.7, height: 1.6, score: 500, color: 0xd8573c, attack: 'melee', reach: 2.9, cd: 1.9 },
  ghost:   { name: 'BOO GHOST', hp: 55, speed: 3.4, damage: 10, radius: .7, height: 1.5, score: 200, color: 0xeef4ff, attack: 'float', cd: 1.4, fly: true },
  hopper:  { name: 'HOPPER', hp: 65, speed: 7, damage: 12, radius: .75, height: .6, score: 175, color: 0x9be83a, attack: 'hop', cd: 1 },
  bomber:  { name: 'BOOM BUG', hp: 40, speed: 4.4, damage: 18, radius: .6, height: .55, score: 150, color: 0x3a2a40, attack: 'bomb', cd: 1 },
  shelly:  { name: 'SHELL BUG', hp: 130, speed: 2.4, damage: 14, radius: 1, height: .75, score: 300, color: 0xff8a2a, attack: 'melee', reach: 1.9, cd: 1.3, hides: true },
  crystal: { name: 'CRYSTAL GOLEM', hp: 190, speed: 2, damage: 18, radius: 1.1, height: 1.2, score: 350, color: 0x45d7ff, attack: 'melee', reach: 2.1, cd: 1.6, splitInto: 'shard' },
  shard:   { name: 'SHARD', hp: 25, speed: 4.6, damage: 6, radius: .45, height: .4, score: 60, color: 0x9be8ff, attack: 'melee', reach: 1.2, cd: .9 },
  boss:    { hp: 3600, speed: 2.2, damage: 22, radius: 3.2, height: 3, score: 2500, color: 0xc05cff, attack: 'boss' },
};

export const FOOD = { apple: 10, pizza: 25, chicken: 40 };
export const EFFECTS = {
  shield: { label: 'SHIELD', time: 12, css: '#45d7ff' },
  damage: { label: '2X DAMAGE', time: 15, css: '#b05cff' },
  speed:  { label: 'SPEED', time: 12, css: '#ff8a2a' },
  points: { label: '2X POINTS', time: 20, css: '#ffd43b' },
};

export const SCORE = { streak5: 250, streak10: 750, wave: 1000, secret: 500, mission: 1500 };

export const WORLDS = [
  {
    id: 'woods', name: 'MONSTER WOODS', css: '#5fbf45', css2: '#2f7a3a', music: 'woods', hp: 1,
    waves: [
      { slime: 6, gap: 2.2 },
      { slime: 6, chomper: 3, gap: 1.9 },
      { slime: 5, chomper: 3, spitter: 3, gap: 1.8 },
      { slime: 4, chomper: 4, spitter: 2, bat: 4, gap: 1.6 },
      { slime: 4, chomper: 4, spitter: 3, bat: 3, tank: 1, gap: 1.4 },
    ],
    tips: ['', 'WATCH OUT: CHOMPERS!', 'NEW: SPITTERS!', 'NEW: BAT BLOBS!', 'A TANK MONSTER IS COMING!'],
    mission: { name: 'RESTORE THE POWER', hint: 'Find 3 glowing batteries', item: 'battery', short: 'POWER', count: 3, unlock: 'lightning', done: 'POWER RESTORED!' },
    boss: { name: 'KING GLOOP', color: 0xb050f0 },
  },
  {
    id: 'water', name: 'SPLASH LAGOON', css: '#2fc0e8', css2: '#1a6fa8', music: 'water', hp: 1.1,
    waves: [
      { slime: 7, gap: 2 },
      { slime: 5, chomper: 4, gap: 1.8 },
      { slime: 4, chomper: 3, bat: 4, gap: 1.7 },
      { spitter: 4, bat: 4, chomper: 3, gap: 1.5 },
      { slime: 4, chomper: 4, spitter: 3, bat: 4, tank: 1, gap: 1.3 },
    ],
    tips: ['', 'CRABBY CHOMPERS!', 'SEAGULL BLOBS!', 'SQUIRT SPITTERS!', 'A CORAL TANK!'],
    mission: { name: 'FIND THE PEARLS', hint: 'Find 3 shiny pearls', item: 'pearl', short: 'PEARLS', count: 3, done: 'PEARLS FOUND!' },
    boss: { name: 'CAPTAIN GLOOP', color: 0x22c8b8 },
    tints: { slime: 0x4fd8e8, mini: 0x9ff0ff, chomper: 0xff6f61, spitter: 0x3a8bff, bat: 0xffffff, tank: 0xff8fa0 },
  },
  {
    id: 'volcano', name: 'LAVA PEAKS', css: '#ff6a2a', css2: '#8a1f1a', music: 'volcano', hp: 1.2,
    waves: [
      { slime: 6, chomper: 2, gap: 2 },
      { slime: 5, chomper: 4, spitter: 2, gap: 1.7 },
      { chomper: 5, spitter: 3, bat: 3, gap: 1.6 },
      { slime: 5, spitter: 3, bat: 4, tank: 1, gap: 1.5 },
      { slime: 5, chomper: 5, spitter: 3, bat: 4, tank: 2, gap: 1.2 },
    ],
    tips: ['DON\'T TOUCH THE LAVA!', 'MAGMA CHOMPERS!', 'FIRE BATS!', 'A ROCK TANK!', 'TWO TANKS!'],
    mission: { name: 'GRAB THE FIRE GEMS', hint: 'Find 3 fire gems', item: 'gem', short: 'GEMS', count: 3, done: 'GEMS COLLECTED!' },
    boss: { name: 'MAGMA GLOOP', color: 0xff5a1f },
    tints: { slime: 0xff7a2a, mini: 0xffb04a, chomper: 0x6a5a66, spitter: 0xffd43b, bat: 0xff4a3a, tank: 0x4a3a40 },
  },
  {
    id: 'space', name: 'MOON BASE', css: '#6a7bff', css2: '#1a1c4a', music: 'space', hp: 1.3,
    waves: [
      { slime: 6, bat: 2, gap: 2 },
      { slime: 5, chomper: 4, bat: 2, gap: 1.7 },
      { spitter: 4, bat: 4, chomper: 3, gap: 1.6 },
      { slime: 5, spitter: 4, bat: 4, tank: 1, gap: 1.4 },
      { slime: 5, chomper: 5, spitter: 4, bat: 4, tank: 2, gap: 1.2 },
    ],
    tips: ['LOW GRAVITY — JUMP HIGH!', 'SPACE CHOMPERS!', 'UFO BLOBS!', 'A METEOR TANK!', 'FINAL WAVE!'],
    mission: { name: 'REFUEL THE ROCKET', hint: 'Find 3 fuel cells', item: 'fuel', short: 'FUEL', count: 3, done: 'ROCKET REFUELED!' },
    boss: { name: 'COSMO GLOOP', color: 0x5a7bff },
    tints: { slime: 0xc8f04a, mini: 0xe8ff9a, chomper: 0xb0b8d0, spitter: 0x45d7ff, bat: 0xff5fa8, tank: 0x8a8aa8 },
  },
  {
    id: 'alien', name: 'PLANET ZORB', css: '#c05cff', css2: '#3a1a6a', music: 'alien', hp: 1.4,
    waves: [
      { slime: 7, spitter: 1, gap: 1.9 },
      { slime: 5, chomper: 4, spitter: 2, gap: 1.6 },
      { chomper: 4, spitter: 3, bat: 5, gap: 1.5 },
      { slime: 5, spitter: 4, bat: 4, tank: 2, gap: 1.3 },
      { slime: 6, chomper: 5, spitter: 4, bat: 5, tank: 2, gap: 1.1 },
    ],
    tips: ['WELCOME TO PLANET ZORB!', 'ZORB CHOMPERS!', 'GLOW BATS!', 'TWO ZORB TANKS!', 'FINAL WAVE!'],
    mission: { name: 'CATCH THE GLOW ORBS', hint: 'Find 3 glow orbs', item: 'orb', short: 'ORBS', count: 3, done: 'ORBS CAUGHT!' },
    boss: { name: 'ZORB GLOOP', color: 0x2cf0a0 },
    tints: { slime: 0xff5fa8, mini: 0xff9ad0, chomper: 0x2cf0a0, spitter: 0xffd43b, bat: 0x8ff04a, tank: 0x45d7ff },
  },
];
// Journey order: Planet Zorb comes before the Moon, then the planets, ending at the Sun.
WORLDS.splice(3, 0, WORLDS.splice(4, 1)[0]);

// Planet worlds (generated). Visual themes live in worlds.js; this is gameplay data.
const PLANETS = [
  { id: 'saturn', name: 'SATURN RINGS', css: '#e8c878', css2: '#6a4a1a', music: 'cosmic', item: 'gem', short: 'CRYSTALS', m: 'GRAB RING CRYSTALS', hint: 'Find 3 ring crystals', tip: 'WELCOME TO SATURN!', boss: 'RINGO GLOOP', bc: 0xe8b048, t: [0xffd070, 0xfff0a0, 0xc08a3a, 0x8a6aff, 0xffffff, 0xb07a3a] },
  { id: 'mars', name: 'MARS', css: '#e0582a', css2: '#6a1a0a', music: 'volcano', item: 'fuel', short: 'FUEL', m: 'FUEL THE ROVER', hint: 'Find 3 fuel cells', tip: 'THE RED PLANET!', boss: 'RUSTY GLOOP', bc: 0xd8401a, t: [0xff6a3a, 0xffa07a, 0x8a8a9a, 0x45d7ff, 0xffd43b, 0x7a2a1a] },
  { id: 'venus', name: 'VENUS', css: '#f0b030', css2: '#7a4a0a', music: 'volcano', item: 'gem', short: 'GEMS', m: 'FIND THE SUN GEMS', hint: 'Find 3 sun gems — watch the lava!', tip: 'SUPER HOT CLOUDS!', boss: 'STEAMY GLOOP', bc: 0xffa020, t: [0xffd43b, 0xfff08a, 0xff8a2a, 0xe8403a, 0xffffff, 0xa06a2a] },
  { id: 'mercury', name: 'MERCURY', css: '#a89a90', css2: '#3a302a', music: 'cosmic', item: 'orb', short: 'ORBS', m: 'CATCH SUNLIGHT ORBS', hint: 'Find 3 sunlight orbs', tip: 'CLOSEST TO THE SUN!', boss: 'SPEEDY GLOOP', bc: 0xc8b8a8, t: [0xd8c8b8, 0xfff0e0, 0x8a7a70, 0xffd43b, 0xff8a2a, 0x6a5a50] },
  { id: 'uranus', name: 'URANUS', css: '#6ae0e0', css2: '#1a6a7a', music: 'alien', item: 'pearl', short: 'ICE PEARLS', m: 'FIND ICE PEARLS', hint: 'Find 3 ice pearls', tip: 'THE SIDEWAYS PLANET!', boss: 'ICY GLOOP', bc: 0x6ae8f0, t: [0x9af0f0, 0xe0ffff, 0x4ab8c8, 0xffffff, 0x8a9aff, 0x3a8a9a] },
  { id: 'neptune', name: 'NEPTUNE', css: '#3a6ae8', css2: '#0a1a5a', music: 'alien', item: 'orb', short: 'STORM ORBS', m: 'CATCH STORM ORBS', hint: 'Find 3 storm orbs', tip: 'WINDY BLUE WORLD!', boss: 'STORM GLOOP', bc: 0x3a5aff, t: [0x4a7aff, 0x9ab8ff, 0x2a3ab8, 0x45d7ff, 0xffffff, 0x1a2a8a] },
  { id: 'pluto', name: 'PLUTO', css: '#e8c8d0', css2: '#4a3a5a', music: 'cosmic', item: 'pearl', short: 'SNOW PEARLS', m: 'FIND SNOW PEARLS', hint: 'Find 3 snow pearls', tip: 'TINY ICY PLANET — BIG JUMPS!', boss: 'FROSTY GLOOP', bc: 0xffc8d8, t: [0xffc8d8, 0xffffff, 0xc8a8b8, 0x9ab8ff, 0xff8ab8, 0x8a7a9a] },
  { id: 'sun', name: 'THE SUN', css: '#ffb020', css2: '#a02a00', music: 'sun', item: 'gem', short: 'SOLAR GEMS', m: 'COLLECT SOLAR GEMS', hint: 'Find 3 solar gems — dodge the plasma!', tip: 'THE FINAL WORLD!', boss: 'SOLAR KING GLOOP', bc: 0xffc020, t: [0xffa020, 0xffe060, 0xff5a1a, 0xffffff, 0xffd43b, 0xc03a00] },
];
const PWAVES = [{ slime: 6, bat: 2, gap: 2 }, { slime: 5, chomper: 4, bat: 2, gap: 1.7 }, { spitter: 4, bat: 4, chomper: 3, gap: 1.6 }, { slime: 5, spitter: 4, bat: 4, tank: 1, gap: 1.4 }, { slime: 5, chomper: 5, spitter: 4, bat: 4, tank: 2, gap: 1.2 }];
PLANETS.forEach((p, k) => {
  const add = Math.floor(k / 2);
  WORLDS.push({
    id: p.id, name: p.name, css: p.css, css2: p.css2, music: p.music, hp: 1.45 + k * .12, planet: true, final: p.id === 'sun',
    waves: PWAVES.map(w => Object.fromEntries(Object.entries(w).map(([t, v]) => [t, t === 'gap' ? Math.max(.85, v - k * .04) : v + add]))),
    tips: [p.tip, '', '', '', 'FINAL WAVE!'],
    mission: { name: p.m, hint: p.hint, item: p.item, short: p.short, count: 3, done: p.short + ' COLLECTED!' },
    boss: { name: p.boss, color: p.bc },
    tints: { slime: p.t[0], mini: p.t[1], chomper: p.t[2], spitter: p.t[3], bat: p.t[4], tank: p.t[5] },
  });
});

// Player level: total points earned across all games. Each level unlocks the next weapon for good.
// Extra monster mix added on top of each world's waves (wave index → counts)
export const EXTRA_WAVES = {
  woods:   [{}, { hopper: 2 }, { bomber: 2, ghost: 2 }, { shelly: 2, hopper: 2 }, { crystal: 1, ghost: 2, bomber: 2 }],
  water:   [{ hopper: 2 }, { shelly: 2 }, { ghost: 2, bomber: 2 }, { crystal: 1, hopper: 2 }, { shelly: 2, crystal: 1, ghost: 2 }],
  volcano: [{ bomber: 2 }, { bomber: 2, hopper: 2 }, { crystal: 1, shelly: 2 }, { ghost: 3, bomber: 2 }, { crystal: 2, shelly: 2, bomber: 2 }],
  space:   [{ ghost: 2 }, { crystal: 1, hopper: 2 }, { ghost: 3, shelly: 2 }, { bomber: 3, crystal: 1 }, { crystal: 2, ghost: 3, hopper: 2 }],
  alien:   [{ hopper: 3 }, { ghost: 3, bomber: 2 }, { shelly: 2, crystal: 1 }, { crystal: 2, hopper: 3 }, { crystal: 2, shelly: 2, ghost: 3, bomber: 2 }],
};
PLANETS.forEach((p, k) => { const a = Math.floor(k / 3); EXTRA_WAVES[p.id] = [{ ghost: 2 + a }, { hopper: 2 + a, bomber: 2 }, { shelly: 2, crystal: 1 + a }, { crystal: 1 + a, ghost: 3, bomber: 2 + a }, { crystal: 2 + a, shelly: 2, bomber: 3, ghost: 2 + a }]; });
// Checkpoint route per world (visit in order for bonus points; also become respawn points)
export const CHECKPOINTS = {
  woods:   [[0, 12], [26, -6], [-12, -36], [-30, 40], [-28, 14]],
  water:   [[-36, -10], [0, -40], [34, -17], [40, 30], [-40, 32]],
  volcano: [[-30, 30], [-36, -10], [0, -26], [40, -12], [44, 40]],
  space:   [[20, 24], [-40, 20], [-20, -40], [0, -20], [40, -20]],
  alien:   [[-24, 24], [-40, -8], [0, -24], [44, -30], [30, 30]],
};
PLANETS.forEach(p => { CHECKPOINTS[p.id] = [[20, 24], [-40, 20], [-20, -40], [0, -20], [40, -20]]; });
// Every world has 3 levels: day → sunset → boss night. Waves are indexes into the world's wave list.
export const STAGES = [
  { waves: [0, 1, 2], tod: 'day', label: 'DAY', hp: 1, add: 0 },
  { waves: [1, 2, 3], tod: 'sunset', label: 'SUNSET', hp: 1.12, add: 1 },
  { waves: [3, 4], tod: 'night', label: 'BOSS NIGHT', hp: 1.25, add: 1, boss: true },
];
export const CHECKPOINT_PTS = 300, ROUTE_BONUS = 1500;

export const LEVELS = [0, 1500, 4000, 7500, 12000, 18000, 25000, 34000];
export const LEVEL_UNLOCKS = ['blaster', 'scatter', 'goo', 'freeze', 'bubble', 'lightning', 'bouncer', 'boomer'];
export const levelFor = xp => { let l = 1; for (let i = 1; i < LEVELS.length; i++) if (xp >= LEVELS[i]) l = i + 1; return l; };

export const ACHIEVEMENTS = [
  { id: 'first', name: 'FIRST BLAST', desc: 'Defeat a monster' },
  { id: 'slime50', name: 'SLIME SLAYER', desc: 'Pop 50 slimes' },
  { id: 'wave5', name: 'WAVE RIDER', desc: 'Reach wave 5' },
  { id: 'boss', name: 'BOSS BEATER', desc: 'Defeat a boss' },
  { id: 'secrets', name: 'EXPLORER', desc: 'Find all 3 secrets in one game' },
  { id: 'power', name: 'MISSION PRO', desc: 'Finish a world mission' },
  { id: 'hero', name: 'WORLD HERO', desc: 'Clear every world' },
  { id: 'sun', name: 'SUN CHAMPION', desc: 'Beat the Solar King' },
  { id: 'max', name: 'MAX LEVEL', desc: 'Reach level 8' },
];
