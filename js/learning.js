"use strict";
/* ============================================================
   LEARNING ENGINE
   A small pluggable system. Modules register themselves and the
   game asks the engine for challenges at gameplay moments
   ("kind" describes the moment: pick / spell / sentence).
   Today only the reading module exists; a future math module
   would register the same way and CONFIG.MODULES decides what
   is active.

   The engine also owns adaptive difficulty:
   - tierScore rises on clean wins, falls on misses
   - reaching CONFIG.TIER_UP_WINS unlocks the next tier
   - a slice of challenges quietly reviews earlier tiers
   - missed words are tracked and resurface more often
   ============================================================ */
var Learning = (function () {
  var modules = {};

  function registerModule(mod) { modules[mod.id] = mod; }

  function activeModule() {
    // With multiple modules we would rotate/weight here.
    for (var i = 0; i < CONFIG.MODULES.length; i++) {
      var m = modules[CONFIG.MODULES[i]];
      if (m) return m;
    }
    return null;
  }

  // kind: "pick" (hear & find), "spell" (build the word), "sentence"
  function getChallenge(kind) {
    var mod = activeModule();
    return mod ? mod.getChallenge(kind) : null;
  }

  function reportResult(challenge, result) {
    var mod = modules[challenge.moduleId];
    if (mod && mod.reportResult) mod.reportResult(challenge, result);
    Stats.recordChallenge(challenge, result);
  }

  return { registerModule: registerModule, getChallenge: getChallenge, reportResult: reportResult };
})();


/* ================= READING MODULE ================= */
(function () {
  function state() { return Save.data.reading; }

  function currentTier() {
    return Math.min(state().tier, CURRICULUM.TIERS.length - 1);
  }

  function pickTierIndex() {
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

  function getChallenge(kind) {
    var tierIdx = pickTierIndex();
    var tier = CURRICULUM.TIERS[tierIdx];

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
    var nChoices = tierIdx >= 2 ? 4 : 3;
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
    var st = state();
    // Only challenges at the current tier move the ramp.
    if (challenge.tier === st.tier) {
      if (result.correct && result.mistakes === 0) st.tierWins += 1;
      else if (result.mistakes > 0) st.tierWins = Math.max(0, st.tierWins - 1);
      if (st.tierWins >= CONFIG.TIER_UP_WINS && st.tier < CURRICULUM.TIERS.length - 1) {
        st.tier += 1;
        st.tierWins = 0;
        UI.toast("📚 New words unlocked: " + CURRICULUM.TIERS[st.tier].name + "!");
      }
    }
    Save.save();
  }

  Learning.registerModule({ id: "reading", getChallenge: getChallenge, reportResult: reportResult });
})();
