"use strict";
/* ============================================================
   SPENCERCRAFT — CONFIG
   Everything a parent might want to tweak lives here.
   ============================================================ */
var CONFIG = {
  PLAYER_NAME: "Spencer",

  // In-game helper characters (his sisters!)
  SISTERS: [
    { name: "Olivia",   hair: "#6b4226", shirt: "#9b59d0", role: "oldest"  },
    { name: "Penelope", hair: "#e8b84a", shirt: "#3ba7d9", role: "middle"  }
  ],

  // Peaceful mode: no monsters, nothing can hurt him.
  // Flip to false later if you ever add mobs (engine hooks exist,
  // but no combat is implemented yet).
  PEACEFUL: true,

  // Which learning modules are active. Only "reading" exists today.
  // To add e.g. math later: create js/modules/math.js that calls
  // Learning.registerModule({...}) and add "math" here.
  MODULES: ["reading"],

  // -------- Weekly parent reports --------
  // 2-minute setup: create a free form at https://formspree.io,
  // point it at your email, and paste the endpoint URL here, e.g.
  // REPORT_ENDPOINT: "https://formspree.io/f/abcdwxyz",
  REPORT_ENDPOINT: "",
  REPORT_EVERY_DAYS: 7,

  // -------- Difficulty tuning --------
  // Wins-in-a-row-ish score needed before the reading tier ramps up.
  TIER_UP_WINS: 12,
  // Fraction of challenges that quietly review easier material.
  REVIEW_CHANCE: 0.2,

  SAVE_KEY: "spencercraft_save_v2"
};
