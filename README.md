# Neon Harbor: Last Light

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jihoonbaee/gta6-game/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jihoonbaee/gta6-game/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original, fully local 3D crime game set in the sunlit coastal grid of Port Meridian. Built during the recorded gta6-01 session with procedural geometry, canvas-generated signs, a locally vendored Three.js engine, and synthesized WebAudio. No account, CDN, font download, build step, or asset service is required.

Run `node serve.ts`, then open `http://localhost:8080` in desktop Chrome. Press Start Your Shift. The amber route and floating beacon lead to each contract. Four connected jobs cover car theft, a harbor delivery, an informant meeting on foot, and reaching a safehouse after the heat expires. Completed jobs reward cash and save locally; finishing the story opens another shift.

Controls: WASD or arrows move/drive, Shift sprints, E steals a nearby vehicle or exits, F / Space / left mouse fires, R reloads, right mouse toggles aiming, mouse turns the camera after pointer lock, wheel adjusts camera distance, Escape pauses. The pause menu resumes or restarts. Health loss can cause a hospital respawn and a cash penalty. Wanted stars rise from theft, gunfire and collisions with pedestrians; patrol cars pursue and damage the player. Heat gradually expires after the crime cooldown.

The open city contains a 500-meter street grid, collidable buildings, sidewalks, crossing stripes, traffic lights, palms, building signs, a waterfront, 20 traffic cars and 44 pedestrians. Cars can be stolen from moving traffic. The HUD includes objectives, cash, health, sprint focus, ammunition, speed, gear, a live minimap, police markers and street coordinates. Generated engine and action sounds work after a user interaction.

Source responsibilities: `game/src/main.js` boots rendering, input, screens and camera; `world.js` constructs the procedural city and simulates actors, vehicles, combat and police; `missions.js` owns contracts and localStorage persistence; `hud.js` renders the live interface/map; `style.css` defines presentation. Three.js is vendored in `game/vendor/three.min.js` with its license notice preserved.

`shots.json` identifies the four real game capture scenes. `.checks/browser.mjs` is a local CDP harness excluded from the Git entry; it drives the real simulation and captures Chromium JPEGs. `MAKEFUN_OUTPUT_DIR=out node main.ts` packages game files and screenshots, with the kit's `buildDossier` implementation. Generated `out/` is ignored.

Known scope: this is a compact procedural open-world prototype, with arcade driving and collision response, a short repeatable story, simplified patrol navigation, and geometric character animation. Progress saves to the current browser only.

Screenshot verification uses four 1280×720 JPEG captures from the running local game. Each capture is checked for image variation and the 256 KiB packaging limit.
