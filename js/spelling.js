"use strict";
/* ============================================================
   SPELLING MODULE (Penelope, age 10)
   Standard 4th-5th grade spelling lists in 4 difficulty tiers.
   Challenge kinds:
   - "pick"  -> Which spelling is correct? (realistic misspellings)
   - "spell" -> Build the word from letter tiles (more decoys)
   ============================================================ */
var SPELLING_TIERS = [
  {
    name: "Word Explorer",
    focus: "often-misspelled everyday words like because and friend",
    words: ["friend", "because", "thought", "caught", "enough", "once", "always",
      "favorite", "believe", "beautiful", "until", "guess", "heard", "half",
      "hour", "early", "really", "people", "again", "country", "school",
      "learn", "write", "whole"]
  },
  {
    name: "Word Builder",
    focus: "silent letters, vowel teams, and tricky endings",
    words: ["weight", "neighbor", "straight", "answer", "island", "knowledge",
      "autumn", "calendar", "library", "different", "probably", "surprise",
      "usually", "weird", "tomorrow", "together", "stomach", "chocolate",
      "minute", "special", "business", "clothes", "daughter", "excited"]
  },
  {
    name: "Word Master",
    focus: "doubled letters and endings people mix up",
    words: ["necessary", "separate", "definitely", "embarrass", "occasion",
      "recommend", "disappear", "difference", "beginning", "immediately",
      "interrupt", "opposite", "possession", "successful", "grammar",
      "familiar", "environment", "government", "experience", "curious",
      "argument", "sincerely", "athletic", "temperature"]
  },
  {
    name: "Spelling Legend",
    focus: "champion words that stump most grown-ups",
    words: ["conscience", "mischievous", "restaurant", "rhythm", "privilege",
      "questionnaire", "acknowledge", "exaggerate", "occurrence", "perseverance",
      "pronunciation", "vacuum", "committee", "guarantee", "lightning",
      "medieval", "miniature", "noticeable", "pastime", "playwright"]
  }
];

(function () {
  function state() { return Save.data.spelling; }

  function currentTier() {
    return Math.min(state().tier, SPELLING_TIERS.length - 1);
  }

  function pickTierIndex(boost) {
    if (boost) return Math.min(currentTier() + boost, SPELLING_TIERS.length - 1);
    var t = currentTier();
    if (t > 0 && Math.random() < CONFIG.REVIEW_CHANCE) return t - 1;
    return t;
  }

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // prefer words she has recently missed
  function chooseWord(tierIdx) {
    var words = SPELLING_TIERS[tierIdx].words;
    var misses = Save.data.stats.wordStats || {};
    var struggling = words.filter(function (w) {
      var s = misses[w];
      return s && s.miss > s.win;
    });
    if (struggling.length && Math.random() < 0.4) {
      return struggling[Math.floor(Math.random() * struggling.length)];
    }
    return words[Math.floor(Math.random() * words.length)];
  }

  /* ---- realistic misspellings for "which is correct?" ---- */
  function misspell(word) {
    var tries = shuffled([
      function (w) { return w.replace(/ie/, "ei"); },
      function (w) { return w.replace(/ei/, "ie"); },
      function (w) {                                     // undouble a letter
        var m = w.match(/(.)\1/);
        return m ? w.replace(m[0], m[1]) : w;
      },
      function (w) {                                     // double a consonant
        var i = 1 + Math.floor(Math.random() * (w.length - 2));
        var c = w[i];
        return "aeiou".indexOf(c) < 0 ? w.slice(0, i) + c + w.slice(i) : w;
      },
      function (w) {                                     // swap adjacent letters
        var i = 1 + Math.floor(Math.random() * (w.length - 3));
        return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
      },
      function (w) {                                     // muddle an unstressed vowel
        var i = w.length - 1 - Math.floor(Math.random() * Math.min(4, w.length - 2));
        var c = w[i], swap = { a: "e", e: "a", o: "u", u: "o", i: "e" };
        return swap[c] ? w.slice(0, i) + swap[c] + w.slice(i + 1) : w;
      }
    ]);
    for (var i = 0; i < tries.length; i++) {
      var out = tries[i](word);
      if (out !== word) return out;
    }
    return word.split("").reverse().join("");
  }

  function makeDecoys(word, n) {
    var out = [];
    var guard = 0;
    while (out.length < n && guard++ < 30) {
      var d = misspell(word);
      if (d !== word && out.indexOf(d) < 0) out.push(d);
    }
    return out;
  }

  function getChallenge(kind, opts) {
    var boost = (opts && opts.boost) || 0;
    var tierIdx = pickTierIndex(boost);
    var word = chooseWord(tierIdx);

    if (kind === "spell" || kind === "sentence") {
      var letters = word.split("");
      var alphabet = "abcdefghijklmnopqrstuvwxyz";
      var decoys = [];
      var nDecoys = Math.min(3 + tierIdx, 5);
      while (decoys.length < nDecoys) {
        var ch = alphabet[Math.floor(Math.random() * 26)];
        if (letters.indexOf(ch) < 0 && decoys.indexOf(ch) < 0) decoys.push(ch);
      }
      return {
        moduleId: "spelling", kind: "spell", tier: tierIdx,
        word: word, emoji: null,
        tiles: shuffled(letters.concat(decoys)),
        skill: "spelling"
      };
    }

    // "pick" -> which spelling is right?
    var nChoices = (tierIdx >= 2 || boost) ? 4 : 3;
    return {
      moduleId: "spelling", kind: "pick", tier: tierIdx,
      word: word,
      choices: shuffled([word].concat(makeDecoys(word, nChoices - 1))),
      subtitle: "Tap the CORRECT spelling!",
      skill: "spot"
    };
  }

  function reportResult(challenge, result) {
    var st = state();
    if (challenge.tier === st.tier) {
      if (result.correct && result.mistakes === 0) st.tierWins += 1;
      else if (result.mistakes > 0) st.tierWins = Math.max(0, st.tierWins - 1);
      if (st.tierWins >= CONFIG.TIER_UP_WINS && st.tier < SPELLING_TIERS.length - 1) {
        st.tier += 1;
        st.tierWins = 0;
        UI.toast("📚 New words unlocked: " + SPELLING_TIERS[st.tier].name + "!");
      }
    }
    Save.save();
  }

  Learning.registerModule({
    id: "spelling",
    getChallenge: getChallenge,
    reportResult: reportResult,
    tier: function () { return state().tier; },
    focus: function () {
      var t = SPELLING_TIERS[currentTier()];
      return { name: t.name, focus: t.focus };
    }
  });
})();
