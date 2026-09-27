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
