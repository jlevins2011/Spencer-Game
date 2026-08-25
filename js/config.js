"use strict";
/* ============================================================
   CRAFTWORLDS — CONFIG
   Everything a parent might want to tweak lives here.
   ============================================================ */
var CONFIG = {
  // The kids. Each gets their own save, learning module, difficulty
  // and weekly report. Their siblings appear as in-game helpers.
  PLAYERS: [
    {
      id: "spencer", name: "Spencer", emoji: "⛏️",
      module: "reading",                    // learns: reading (age 7)
      saveKey: "spencercraft_save_v2",      // original key: keeps his progress
      startLevel: 1,
      helpers: [
        { name: "Olivia",   hair: "#6b4226", shirt: "#9b59d0" },
        { name: "Penelope", hair: "#8a5433", shirt: "#3ba7d9" }
      ]
    },
    {
      id: "penelope", name: "Penelope", emoji: "✨",
      module: "spelling",                   // learns: spelling (age 10)
      saveKey: "craftworlds_save_penelope",
      startLevel: 3,                        // 10yo: skip the baby ramp
      helpers: [
        { name: "Olivia",  hair: "#6b4226", shirt: "#9b59d0" },
        { name: "Spencer", hair: "#5a3a1e", shirt: "#3fae5f", boy: true }
      ]
    }
  ],

  // Daddy appears in every kid's world: extra tall, red hair, glasses,
  // and a big boot on his hurt right leg. His SUPER CHALLENGES are
  // harder than normal and earn legendary tools.
  DADDY: { name: "Daddy", hair: "#c1471e", shirt: "#4a6a8a", daddy: true },

  // Mommy: dark brown hair, always holding a cup of tea. Her SUPER
  // CHALLENGES unlock Minecraft-style capabilities (smelting ore, torches).
  MOMMY: { name: "Mommy", hair: "#3d2314", shirt: "#c4786a", mommy: true },

  // Set when a player is chosen on the title screen.
  ACTIVE: null,
  PLAYER_NAME: "",

  // Peaceful mode: no monsters, nothing can hurt them.
  PEACEFUL: true,

  // -------- Weekly parent reports --------
  // EASIEST SETUP: don't edit anything here! Open the game on the
  // kids' iPad, hold GROWN-UPS, and add parent emails right in the
  // dashboard. Reports send free via formsubmit.co — the first
  // report triggers a one-time "activate" email to each address.
  //
  // Optional: emails listed here are built-in defaults (note: this
  // file is public if the repo is public, so the dashboard method
  // above is more private).
  REPORT_EMAILS: [],
  // Optional: full form endpoints (e.g. Formspree URLs) also work.
  REPORT_ENDPOINTS: [],
  REPORT_EVERY_DAYS: 7,

  // Maggie the beagle: wanders the world, can be petted, and STEALS
  // something small when a challenge goes really badly (comic relief).
  MAGGIE: { name: "Maggie", dog: true },

  // -------- Difficulty tuning --------
  TIER_UP_WINS: 12,      // clean wins needed before difficulty ramps
  REVIEW_CHANCE: 0.2,    // fraction of challenges that review easier material
  // struggle points before difficulty backs off a tier
  // (a rough challenge = 1 point, a really rough one = 2; a perfect win clears them)
  BACK_OFF_AT: 5,

  // If a kid goes this long without doing anything educational,
  // a WORD STORM rolls in and must be answered to keep playing.
  EDU_NUDGE_MINUTES: 5
};
