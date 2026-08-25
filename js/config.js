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

  // Set when a player is chosen on the title screen.
  ACTIVE: null,
  PLAYER_NAME: "",

  // Peaceful mode: no monsters, nothing can hurt them.
  PEACEFUL: true,

  // -------- Weekly parent reports --------
  // 2-minute setup: create a free form at https://formspree.io,
  // point it at your email, and paste the endpoint URL here, e.g.
  // REPORT_ENDPOINT: "https://formspree.io/f/abcdwxyz",
  REPORT_ENDPOINT: "",
  REPORT_EVERY_DAYS: 7,

  // -------- Difficulty tuning --------
  TIER_UP_WINS: 12,      // clean wins needed before difficulty ramps
  REVIEW_CHANCE: 0.2     // fraction of challenges that review easier material
};
