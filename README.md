# ⛏️ CraftWorlds (SpencerCraft)

A Minecraft-style 3D world where the kids walk around, explore, mine, and build —
and quietly get better at words while they do it.

Two player profiles on the same page, each with its own save, difficulty, and weekly report:
- **Spencer (7)** — reading: sight words, phonics, and sentences
- **Penelope (10)** — spelling: standard 4th-5th grade lists, from "because" to "mischievous"

Built for iPad (touch controls), works in any modern browser. No installs, no accounts.

## How to play

Open `index.html` in a browser, or host the folder anywhere static
(GitHub Pages works great: repo Settings → Pages → deploy from branch).
On the iPad, open the page in Safari and use **Share → Add to Home Screen**
so it launches full-screen like an app.

### Controls (iPad)
- **Left thumb** — touch and drag anywhere on the left side to walk
- **Right thumb** — drag to look around
- **Tap a block** — mine it (⬆️ button jumps)
- **⛏️/🧱 button** — switch between mine mode and build mode
- **Tap a bag item** — select a block, then tap the world to place it
- **Tap Olivia or Penelope** — get a quest!

On a computer: WASD to move, drag the mouse to look, click to mine/place,
SPACE to jump, B to toggle build mode.

### Where the learning hides
- **❓ Word ore** (purple sparkly blocks) — Spencer: hear a word, tap the right one.
  Penelope: tap the correctly-spelled version among realistic misspellings
- **🧰 Treasure chests** — build the word from letter tiles to pop the lock
- **⛏️ Crafting pickaxe upgrades** — spell to craft
- **👧👦 Sibling quests** — each kid's siblings appear in-game with little quests

Words quietly ramp up in difficulty as each kid plays, and missed words come
back around more often until they're nailed. Leveling up unlocks new worlds:
Sunny Meadow → Golden Desert (Lv 3) → Snowy Peaks (Lv 5) → Mushroom Isle (Lv 7) → Crystal Caves (Lv 9).
(Penelope starts at level 3.)

## Weekly parent reports (2-minute setup)

1. Go to [formspree.io](https://formspree.io) and create a free account
2. Create a new form pointed at your email address
3. Copy the endpoint URL it gives you (looks like `https://formspree.io/f/abcdwxyz`)
4. Open `js/config.js` and paste it into `REPORT_ENDPOINT`

That's it — a progress report emails you automatically every 7 days per kid,
covering time played, accuracy by skill, mastered words, and exactly which
words they're finding tricky.

No email needed? Hold the **GROWN-UPS** button (on the title screen or pause
menu) for 1.5 seconds to see the same report in-game any time.

## For tweakers

- `js/config.js` — player profiles, helpers, difficulty pacing, report settings
- `js/curriculum.js` — Spencer's reading words, sentences, and the quests
- `js/spelling.js` — Penelope's spelling lists (swap in school lists here!)
- The learning engine (`js/learning.js`) is pluggable; a future math module
  just calls `Learning.registerModule({...})` and a profile points at it.
  The game itself never needs to change.
- `CONFIG.PEACEFUL` — reserved for a future survival/mobs mode

Progress saves automatically to the browser (localStorage) on the device the
kids play on — each player has a separate save.
