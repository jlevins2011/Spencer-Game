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
- **🔥 Daddy's SUPER CHALLENGES** — Daddy is in the game too (red hair, glasses,
  and the hurt-leg boot). His challenges use harder words than the kid's
  current level. 3 perfect-ish wins earn the **Voidbreaker Drill** (breaks
  bedrock, opening the **Deep Dark** — 20 layers of deepslate, extra diamonds,
  gem-paying amethyst, and ultra-rare mythril at the bottom). 8 wins earn the
  **Thunder Pick** (mines twice as fast). After that he pays out gems.
- **🐶 Maggie the beagle** wanders every world and loves being petted (tap
  her!). But bomb a challenge badly and she'll dart in and steal something
  small — dirt, a flower — never anything valuable. Sneaky beagle.
- **🐷 Animals!** Pigs, cows, chickens, and sheep roam every world. Tap to
  hunt them (they squeal and run!) — a few bops earn meat 🍖 or wool 🧶 for
  building and for new sister quests. They repopulate over time.
- **🎒 Inventory** — tap the bag button (or press E) to see everything:
  blocks, resources, gems, pickaxe, and legendary tools. Tap a block there
  to start building with it.
- **⚡ WORD STORMS** — go 5 minutes without doing anything educational and a
  storm rolls in: a word challenge takes over the screen and must be answered
  (with a gem reward) before play continues. No coasting!

Difficulty self-adjusts BOTH ways: consistent success unlocks harder words,
and a rough patch automatically drops back to words the kid can win with
(plus a head start toward climbing again), so nobody stays stuck or frustrated.

Words quietly ramp up in difficulty as each kid plays, and missed words come
back around more often until they're nailed. Leveling up unlocks new worlds:
Sunny Meadow → Golden Desert (Lv 3) → Snowy Peaks (Lv 5) → Mushroom Isle (Lv 7) → Crystal Caves (Lv 9).
(Penelope starts at level 3.)

## Weekly parent reports (1-minute setup, no accounts)

1. On the kids' iPad, hold the **GROWN-UPS** button (title screen or pause
   menu) for 1.5 seconds
2. Type a parent email in the box and tap **ADD** — add as many emails as
   you like (mom, dad, grandma…)
3. Tap **SEND REPORT NOW**. The first send triggers a one-time "activate"
   email to each address (from formsubmit.co, the free relay service) —
   click the link in it once

Done — every kid's progress report emails everyone on the list automatically
every 7 days: time played, accuracy by skill, mastered words, and exactly
which words they're finding tricky. Each address can be removed anytime with
the ✕ next to it.

Notes:
- Emails added in the dashboard are stored on that device (private, not in
  this repo). `REPORT_EMAILS` in `js/config.js` can hold defaults instead,
  and Formspree-style endpoint URLs still work via `REPORT_ENDPOINTS`.
- Reports are sent while the game is being played, from the kids' device —
  so add the emails on the iPad they actually use.
- No email at all? The same report is always available in the GROWN-UPS
  dashboard.

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
