# Monster Blast

A kid-friendly 3D monster-blasting arcade game that runs in the browser and installs as an app (PWA) on phones, tablets and computers. There are no ads, no accounts and no purchases.

## Put it online (needed so it can be installed)

Installing only works from a secure **https** address. Any free static host works. Upload this whole folder as it is:

- **Netlify Drop:** go to app.netlify.com/drop and drag this folder in.
- **GitHub Pages:** push the folder to a repo, then turn on Pages in the repo settings.
- **Cloudflare Pages:** connect the repo, or upload the folder directly.

Then open the link on the device:
- **Android, Chrome or Edge:** tap **INSTALL GAME** on the main menu.
- **iPhone or iPad (Safari):** tap Share, then **Add to Home Screen**.

## Offline and online

- Open the game once while online and everything is saved to the device. After that, the 13 main worlds work with no internet.
- With internet, the **ONLINE BONUS** tab adds bonus worlds and a Daily Challenge from `packs/bonus.json`. Edit that file to add new content, and players get it without an app update.

## Installing on iPhone, iPad, Android phones and tablets

- **The link has to be your published https site** (for example `monster-blast.pages.dev`). The design preview can't be installed.
- **iPhone / iPad:** open the link in **Safari**, then Share → **Add to Home Screen**. On iOS 16.4 and later this also works from Chrome and Edge. If the link was opened inside another app, like Messages previews, Facebook or Instagram, open it in Safari first.
- **Android phones and tablets:** in Chrome, use ⋮ → **Install app**, or tap INSTALL GAME in the menu. On Samsung Internet, use ≡ → Add page to → Home screen.
- The **INSTALL GAME** button on the main menu shows the right steps for each device.

## Multiplayer (private rooms, up to 4 players)

Modes:
- **Co-op:** team up on the same world.
- **Race:** first to reach all 5 flags wins.
- **Goo Tag:** splat friends for points, no damage.

A private **family leaderboard** is also included.

Safety: there is no chat. Kids choose from random fun names like "Zippy Frog" and communicate only with 6 preset emotes. Rooms need a 5-number code. Online play is **off** until a grown-up turns it on in **Settings → Grown-ups**, which is protected by a PIN. The server only passes game data along and blocks any free text.

### Deploy the free multiplayer server (Cloudflare Workers, about 10 minutes)

1. Install Node.js from nodejs.org if you don't have it.
2. Open a terminal in the `server` folder and run:
   ```
   npx wrangler login
   npx wrangler deploy
   ```
3. It prints an address like `https://monster-blast-server.YOURNAME.workers.dev`. Open `/health` on it to check; you should see `{"ok":true}`.
4. In the game, go to **Settings → Grown-ups**, create a PIN, turn **Online multiplayer ON**, paste the address and tap **SAVE & TEST**.
   Or paste it into `SERVER_URL` in `js/config.js` before uploading, so every device gets it automatically.
5. Optional: tap **NEW BOARD** to make a family leaderboard. On each other device, enter the same 6 numbers with **JOIN BOARD**.

The free Workers plan easily covers family use.

## Testing on a computer

Run a local server from this folder, for example `npx serve .` or `python3 -m http.server`. Then open http://localhost:3000 (or :8000). Opening index.html directly from the file won't work, because the game's scripts only load from a server.

Keyboard: WASD to move, mouse to look (click first), left click to fire, right click or Z to zoom, Space to jump, V for camera, M for the map, Tab or 1–9 for weapons, F for the action button, Esc to pause.

## Files

- `index.html`: screens, heads-up display and styles
- `manifest.webmanifest`, `sw.js`, `icons/`: app install and offline support
- `js/config.js`: game name, worlds, weapons, monsters, levels. **Rename the game here** and in the manifest.
- `js/main.js`: game loop, levels, menus
- `js/world.js`, `js/worlds.js`: the 3D worlds
- `js/enemies.js`, `js/weapons.js`, `js/items.js`, `js/player.js`: monsters, weapons, pickups, your character
- `js/map.js`, `js/warp.js`, `js/hud.js`, `js/audio.js`, `js/input.js`, `js/save.js`, `js/online.js`
- `packs/bonus.json`: online bonus worlds and daily challenges

When you change any files, bump `VERSION` in `sw.js` so installed copies download the update.
