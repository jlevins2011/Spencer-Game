"use strict";
/* ============================================================
   LEARNING ENGINE
   A small pluggable system. Modules register themselves and the
   game asks the engine for challenges at gameplay moments
   ("kind" describes the moment: pick / spell / sentence / picture).
   Reading (Spencer: hear-and-tap, picture-to-word, independent
   read-the-word, never spelling), spelling (Penelope), and Latin
   (Olivia) modules exist; a future math module would register the
   same way, and each player profile in CONFIG.PLAYERS names the
   module it uses.

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

  // kind: "pick" (hear & find), "spell" (build the word),
  //       "sentence" (read & match), "picture" (big picture → word),
  //       "read" (written word → picture, no audio of the word),
  //       "speak" (experimental: say the written word aloud)
  // The reading module remaps "spell" to hear/picture/read — Spencer
  // never builds words from letter tiles.
  // opts.boost: raise difficulty by N tiers (Daddy's super challenges)
  function getChallenge(kind, opts) {
    var mod = activeModule();
    return mod ? mod.getChallenge(kind, opts) : null;
  }

  function reportResult(challenge, result) {
    var mod = modules[challenge.moduleId];
    if (mod && mod.reportResult) mod.reportResult(challenge, result);
    Stats.recordChallenge(challenge, result);
    Game.notifyEdu();
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

  // Prefer words the kid has recently missed on THIS skill (gentle
  // spaced review). Hearing "cat" correctly should not hide that
  // they still can't read "cat" on their own.
  function chooseTarget(candidates, skill) {
    var misses = Save.data.stats.wordStats || {};
    var struggling = candidates.filter(function (c) {
      var s = misses[c.word.toLowerCase()];
      if (!s) return false;
      var b = (s.bySkill && skill && s.bySkill[skill]) ? s.bySkill[skill] : s;
      return b.miss > b.win;
    });
    if (struggling.length && Math.random() < 0.45) {
      return struggling[Math.floor(Math.random() * struggling.length)];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function picturedWords(tierIdx) {
    var list = wordsOf(tierIdx, function (w) { return w.emoji; });
    if (!list.length) list = wordsOf(0, function (w) { return w.emoji; });
    return list;
  }

  // Decoys must be different pictures, not just different words —
  // "see" and "look" both use 👀, which would test guessing not reading.
  function uniquePictureChoices(target, n, tierIdx) {
    var used = {};
    used[target.emoji] = true;
    var pool = [];
    function addFrom(idx) {
      wordsOf(idx, function (w) {
        return w.emoji && w.word !== target.word && !used[w.emoji];
      }).forEach(function (w) {
        if (used[w.emoji]) return;
        used[w.emoji] = true;
        pool.push(w);
      });
    }
    addFrom(tierIdx);
    for (var t = 0; t < CURRICULUM.TIERS.length && pool.length < n - 1; t++) {
      if (t !== tierIdx) addFrom(t);
    }
    var decoys = sample(pool, n - 1);
    return shuffled([{ word: target.word, emoji: target.emoji }].concat(decoys));
  }

  // Hunger for a skill: untested skills get a nudge; skills with a
  // weak first-try rate get asked more often. Older saves stored hear
  // under "pick" and sentences under "sentence".
  function skillNeed(name) {
    var bag = Save.data.stats.challenges || {};
    var keys = [name];
    if (name === "hear") keys.push("pick");
    if (name === "sentences") keys.push("sentence");
    var tries = 0, clean = 0;
    keys.forEach(function (k) {
      var c = bag[k];
      if (!c) return;
      tries += c.tries || 0;
      clean += c.clean || 0;
    });
    if (tries < 2) return 1.2;
    var rate = clean / Math.max(1, tries);
    return 0.35 + (1 - rate) * 1.8;
  }

  function pickWeighted(options) {
    options = options.filter(function (o) { return o.weight > 0; });
    if (!options.length) return "pick";
    var total = 0;
    options.forEach(function (o) { total += o.weight; });
    var r = Math.random() * total;
    for (var i = 0; i < options.length; i++) {
      r -= options[i].weight;
      if (r <= 0) return options[i].kind;
    }
    return options[0].kind;
  }

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pictureChallenge(tierIdx, boost) {
    var pictured = picturedWords(tierIdx);
    var target = chooseTarget(pictured, "picture");
    var nChoices = (tierIdx >= 2 || boost) ? 4 : 3;
    var decoyWords = sample(wordsOf(tierIdx), nChoices - 1, [target]).map(function (w) { return w.word; });
    return {
      moduleId: "reading", kind: "picture", tier: tierIdx,
      word: target.word, emoji: target.emoji, answer: target.word,
      choices: shuffled([target.word].concat(decoyWords)),
      subtitle: "Tap the picture or 🔊 to hear it, then tap the word!",
      skill: "picture"
    };
  }

  function pickChallenge(tierIdx, boost) {
    var all = wordsOf(tierIdx);
    var target = chooseTarget(all, "hear");
    var nChoices = (tierIdx >= 2 || boost) ? 4 : 3;
    var decoyWords = sample(all, nChoices - 1, [target]).map(function (w) { return w.word; });
    return {
      moduleId: "reading", kind: "pick", tier: tierIdx,
      word: target.word, emoji: target.emoji,
      choices: shuffled([target.word].concat(decoyWords)),
      subtitle: "Tap the word you hear!",
      skill: "hear"
    };
  }

  function readChallenge(tierIdx, boost) {
    var pictured = picturedWords(tierIdx);
    var target = chooseTarget(pictured, "read");
    var nChoices = (tierIdx >= 2 || boost) ? 4 : 3;
    var pictures = uniquePictureChoices(target, nChoices, tierIdx);
    return {
      moduleId: "reading", kind: "read", tier: tierIdx,
      word: target.word, emoji: target.emoji, answer: target.emoji,
      pictures: pictures,
      subtitle: "Read it yourself, then tap the picture!",
      skill: "read"
    };
  }

  function speakChallenge(tierIdx, boost) {
    var pictured = picturedWords(tierIdx);
    var target = chooseTarget(pictured, "speak");
    return {
      moduleId: "reading", kind: "speak", tier: tierIdx,
      word: target.word, emoji: target.emoji,
      subtitle: "Tap the mic and say this word out loud.",
      skill: "speak"
    };
  }

  function sentenceChallenge(tierIdx) {
    var tier = CURRICULUM.TIERS[tierIdx];
    var s = tier.sentences[Math.floor(Math.random() * tier.sentences.length)];
    return {
      moduleId: "reading", kind: "sentence", tier: tierIdx,
      text: s.text, answer: s.answer, choices: shuffled(s.choices),
      skill: "sentences"
    };
  }

  function getChallenge(kind, opts) {
    var boost = (opts && opts.boost) || 0;
    var tierIdx = pickTierIndex(boost);
    var tier = CURRICULUM.TIERS[tierIdx];
    var canPictures = picturedWords(tierIdx).length > 0;
    var canSpeak = !boost && GameAudio.canListen && GameAudio.canListen();

    // Spencer reads. Chests, crafting, and parent quizzes still ASK for
    // "spell", but we turn those into hear / picture / independent read.
    if (kind === "spell") {
      kind = pickWeighted([
        { kind: "picture", weight: skillNeed("picture") },
        { kind: "pick", weight: skillNeed("hear") },
        { kind: "read", weight: canPictures ? skillNeed("read") * 1.15 : 0 }
      ]);
    }

    // Word ore (and storms): mix activity types, leaning toward the
    // skill Spencer is currently weaker at.
    if (kind === "pick" && !boost) {
      var mix = [
        { kind: "pick", weight: skillNeed("hear") },
        { kind: "picture", weight: canPictures ? skillNeed("picture") : 0 },
        { kind: "read", weight: canPictures ? skillNeed("read") * 1.25 : 0 }
      ];
      if (tier.sentences.length) {
        mix.push({ kind: "sentence", weight: skillNeed("sentences") * 0.7 });
      }
      if (canSpeak) {
        mix.push({ kind: "speak", weight: skillNeed("speak") * 0.35 });
      }
      kind = pickWeighted(mix);
    } else if (kind === "pick" && boost && canPictures) {
      kind = pickWeighted([
        { kind: "pick", weight: skillNeed("hear") },
        { kind: "picture", weight: skillNeed("picture") },
        { kind: "read", weight: skillNeed("read") }
      ]);
    }

    if (kind === "read") return readChallenge(tierIdx, boost);
    if (kind === "speak") {
      return canSpeak ? speakChallenge(tierIdx, boost) : readChallenge(tierIdx, boost);
    }
    if (kind === "picture") return pictureChallenge(tierIdx, boost);
    if (kind === "sentence") return sentenceChallenge(tierIdx);
    return pickChallenge(tierIdx, boost);
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
