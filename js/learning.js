"use strict";
/* ============================================================
   LEARNING ENGINE
   A small pluggable system. Modules register themselves and the
   game asks the engine for challenges at gameplay moments
   ("kind" describes the moment: pick / spell / sentence).
   Reading (Spencer) and spelling (Penelope) modules exist; a
   future math module would register the same way, and each
   player profile in CONFIG.PLAYERS names the module it uses.

   The engine also owns adaptive difficulty:
   - tierScore rises on clean wins, falls on misses
   - reaching CONFIG.TIER_UP_WINS unlocks the next tier
   - a slice of challenges quietly reviews earlier tiers
   - missed words are tracked and resurface more often
   ============================================================ */
var Learning = (function () {
  var modules = {};

  function registerModule(mod) { modules[mod.id] = mod; }

  // Each player profile names its module (reading / spelling / ...).
  function activeModule() {
    return CONFIG.ACTIVE ? modules[CONFIG.ACTIVE.module] : null;
  }

  // kind: "pick" (hear & find), "spell" (build the word), "sentence"
  // opts.boost: raise difficulty by N tiers (Daddy's super challenges)
  function getChallenge(kind, opts) {
    var mod = activeModule();
    return mod ? mod.getChallenge(kind, opts) : null;
  }

  function reportResult(challenge, result) {
    var mod = modules[challenge.moduleId];
    if (mod && mod.reportResult) mod.reportResult(challenge, result);
    Stats.recordChallenge(challenge, result);
    // a really rough round? Maggie smells opportunity...
    if (result.mistakes >= 3) Game.maggieSteal();
  }

  // Shared difficulty ramp for all modules: clean wins climb toward the
  // next tier; struggling drops back to a tier where the kid can succeed
  // (with a head start toward re-climbing, so recovery feels quick).
  function applyRamp(st, challenge, result, maxTier, nameOfTier) {
    if (challenge.tier !== st.tier) return;
    if (result.correct && result.mistakes === 0) {
      st.tierWins += 1;
      st.struggle = 0;
      if (st.tierWins >= CONFIG.TIER_UP_WINS && st.tier < maxTier) {
        st.tier += 1;
        st.tierWins = 0;
        UI.toast("📚 New words unlocked: " + nameOfTier(st.tier) + "!");
      }
    } else if (result.mistakes > 0) {
      st.tierWins = Math.max(0, st.tierWins - 1);
      st.struggle = (st.struggle || 0) + (result.mistakes >= 3 ? 2 : 1);
      if (st.struggle >= CONFIG.BACK_OFF_AT && st.tier > 0) {
        st.tier -= 1;
        st.tierWins = Math.floor(CONFIG.TIER_UP_WINS / 2);
        st.struggle = 0;
        UI.toast("💪 Power-up round! Time for some words you ROCK at!", 3200);
      }
    }
    Save.save();
  }

  function currentTier() {
    var mod = activeModule();
    return mod && mod.tier ? mod.tier() : 0;
  }

  function currentFocus() {
    var mod = activeModule();
    return mod && mod.focus ? mod.focus() : { name: "", focus: "" };
  }

  return {
    registerModule: registerModule, getChallenge: getChallenge,
    reportResult: reportResult, currentTier: currentTier, currentFocus: currentFocus,
    applyRamp: applyRamp
  };
})();


/* ================= READING MODULE ================= */
(function () {
  function state() { return Save.data.reading; }

  function currentTier() {
    return Math.min(state().tier, CURRICULUM.TIERS.length - 1);
  }

  function pickTierIndex(boost) {
    if (boost) return Math.min(currentTier() + boost, CURRICULUM.TIERS.length - 1);
    var t = currentTier();
    if (t > 0 && Math.random() < CONFIG.REVIEW_CHANCE) return t - 1;
    return t;
  }

  function wordsOf(tierIdx, filter) {
    return CURRICULUM.TIERS[tierIdx].words.filter(filter || function () { return true; });
  }

  function sample(arr, n, exclude) {
    var pool = arr.slice().filter(function (x) { return !exclude || exclude.indexOf(x) < 0; });
    var out = [];
    while (out.length < n && pool.length) {
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
  }

  // Prefer words the kid has recently missed (gentle spaced review).
  function chooseTarget(candidates) {
    var misses = Save.data.stats.wordStats || {};
    var struggling = candidates.filter(function (c) {
      var s = misses[c.word.toLowerCase()];
      return s && s.miss > s.win;
    });
    if (struggling.length && Math.random() < 0.4) {
      return struggling[Math.floor(Math.random() * struggling.length)];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function getChallenge(kind, opts) {
    var boost = (opts && opts.boost) || 0;
    var tierIdx = pickTierIndex(boost);
    var tier = CURRICULUM.TIERS[tierIdx];

    // a slice of word-ore moments become read-the-sentence instead
    if (kind === "pick" && !boost && Math.random() < 0.25 && tier.sentences.length) {
      kind = "sentence";
    }

    if (kind === "sentence") {
      var s = tier.sentences[Math.floor(Math.random() * tier.sentences.length)];
      return {
        moduleId: "reading", kind: "sentence", tier: tierIdx,
        text: s.text, answer: s.answer, choices: shuffled(s.choices),
        skill: "sentences"
      };
    }

    if (kind === "spell") {
      var spellables = wordsOf(tierIdx, function (w) { return w.spell; });
      if (!spellables.length) spellables = wordsOf(0, function (w) { return w.spell; });
      var target = chooseTarget(spellables);
      var word = target.word.toLowerCase();
      var letters = word.split("");
      var alphabet = "abcdefghijklmnopqrstuvwxyz";
      var decoys = [];
      var nDecoys = Math.min(2 + tierIdx, 4);
      while (decoys.length < nDecoys) {
        var ch = alphabet[Math.floor(Math.random() * 26)];
        if (letters.indexOf(ch) < 0 && decoys.indexOf(ch) < 0) decoys.push(ch);
      }
      return {
        moduleId: "reading", kind: "spell", tier: tierIdx,
        word: word, emoji: target.emoji,
        tiles: shuffled(letters.concat(decoys)),
        skill: target.sight ? "sight" : "phonics"
      };
    }

    // default: "pick" — hear the word, find it
    var all = wordsOf(tierIdx);
    var target2 = chooseTarget(all);
    var nChoices = (tierIdx >= 2 || boost) ? 4 : 3;
    var decoyWords = sample(all, nChoices - 1, [target2]).map(function (w) { return w.word; });
    return {
      moduleId: "reading", kind: "pick", tier: tierIdx,
      word: target2.word, emoji: target2.emoji,
      choices: shuffled([target2.word].concat(decoyWords)),
      skill: target2.sight ? "sight" : "phonics"
    };
  }

  // result: { correct: bool, mistakes: int }
  function reportResult(challenge, result) {
    Learning.applyRamp(state(), challenge, result, CURRICULUM.TIERS.length - 1,
      function (t) { return CURRICULUM.TIERS[t].name; });
  }

  Learning.registerModule({
    id: "reading",
    getChallenge: getChallenge,
    reportResult: reportResult,
    tier: function () { return state().tier; },
    focus: function () {
      var t = CURRICULUM.TIERS[currentTier()];
      return { name: t.name, focus: t.focus };
    }
  });
})();
