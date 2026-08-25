# ⛏️ SpencerCraft

A Minecraft-style 3D world where Spencer walks around, explores, mines, and builds —
and quietly becomes a stronger reader while he does it.

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
- **❓ Word ore** (purple sparkly blocks) — hear a word, tap the right one
- **🧰 Treasure chests** — spell the word to pop the lock
- **⛏️ Crafting pickaxe upgrades** — spell to craft
- **👧 Sister quests** — read what Olivia or Penelope needs and go get it

Words start at easy sight words and short-vowel words, and quietly ramp up
(blends, digraphs, silent-e, vowel teams) as he plays. Words he misses come
back around more often until he nails them. Leveling up unlocks new worlds:
Sunny Meadow → Golden Desert (Lv 3) → Snowy Peaks (Lv 5) → Mushroom Isle (Lv 7) → Crystal Caves (Lv 9).

## Weekly parent reports (2-minute setup)

1. Go to [formspree.io](https://formspree.io) and create a free account
2. Create a new form pointed at your email address
3. Copy the endpoint URL it gives you (looks like `https://formspree.io/f/abcdwxyz`)
4. Open `js/config.js` and paste it into `REPORT_ENDPOINT`

That's it — a progress report emails you automatically every 7 days, covering
time played, accuracy by skill (sight words / phonics / sentences), what he's
mastered, and exactly which words he's finding tricky.

No email needed? Hold the **GROWN-UPS** button (on the title screen or pause
menu) for 1.5 seconds to see the same report in-game any time.

## For tweakers

- `js/config.js` — name, sisters, difficulty pacing, report settings
- `js/curriculum.js` — every word, sentence, and quest in the game
- `js/modules/` pattern — the learning engine (`js/learning.js`) is pluggable;
  a future math module just calls `Learning.registerModule({...})` and gets
  added to `CONFIG.MODULES`. The game itself never needs to change.
- `CONFIG.PEACEFUL` — reserved for a future survival/mobs mode

Progress saves automatically to the browser (localStorage) on the device he
plays on.
