"use strict";
/* ============================================================
   LATIN MODULE (Olivia, age 13)
   Vocabulary and grammar follow Kraken Latin 1 (Natali H.
   Monnette, Canon Press) — 32 lessons in 4 units. Word lists
   come from the publisher's student sample and free weekly
   quizzes. Tiers map to those units:

   0  Unit 1  (lessons 1–7)  1st conj. present; 1st/2nd decl.; sum; adjectives
   1  Unit 2  (lessons 9–15) 2nd conj.; possum; 3rd decl.; perfect system
   2  Unit 3  (lessons 17–23) pronouns; i-stems; passives; numerals
   3  Unit 4  (lessons 25–31) 4th/5th decl.; 3rd/4th/3rd-io verbs; demonstratives

   Review weeks 8/16/24/32 don't add new words.
   Challenge kinds:
   - "pick"     hear the English, tap the Latin
   - "spell"    build the Latin (no macrons — iPad-friendly)
   - "sentence" read a short Latin sentence, tap the English
   ============================================================ */
var LATIN_TIERS = [
  {
    name: "Kraken Unit 1",
    focus: "first conjugation, first & second declension, sum, adjectives (Kraken Latin 1, lessons 1–7)",
    words: [
      // Lesson 1 — 1st conj. present active indicative
      ["ambulō", "I walk"], ["amō", "I love"], ["cantō", "I sing"], ["clāmō", "I shout"],
      ["dō", "I give"], ["laudō", "I praise"], ["līberō", "I set free"], ["necō", "I kill"],
      ["pugnō", "I fight"], ["spectō", "I look at"], ["stō", "I stand"], ["vocō", "I call"],
      ["vulnerō", "I wound"], ["bene", "well"], ["male", "badly"], ["nōn", "not"],
      ["nunc", "now"], ["aut", "or"], ["et", "and"], ["sed", "but"],
      // Lesson 2 — 1st declension
      ["aqua", "water"], ["bēstia", "beast"], ["corōna", "crown"], ["dīvitiae", "riches"],
      ["fābula", "story"], ["fēmina", "woman"], ["īra", "anger"], ["lūna", "moon"],
      ["pīrāta", "pirate"], ["poēta", "poet"], ["rēgia", "palace"], ["rēgīna", "queen"],
      ["turba", "crowd"], ["villa", "farmhouse"], ["cremō", "I burn"], ["narrō", "I tell"],
      ["superō", "I conquer"], ["cūr", "why"], ["hodiē", "today"], ["itaque", "therefore"],
      // Lesson 3 — sum, genitive/ablative, prepositions
      ["agricola", "farmer"], ["harēna", "sand"], ["hasta", "spear"], ["īnsula", "island"],
      ["nauta", "sailor"], ["patria", "native land"], ["pecūnia", "money"], ["puella", "girl"],
      ["sagitta", "arrow"], ["sīca", "dagger"], ["silva", "forest"], ["spēlunca", "cave"],
      ["exspectō", "I wait for"], ["habitō", "I live"], ["sum", "I am"],
      ["ab", "from / away from"], ["ad", "to / toward"], ["ex", "out of"], ["in", "in / into"],
      ["per", "through"],
      // Lesson 4 — 2nd declension masculine
      ["ager", "field"], ["alnus", "ship"], ["camēlus", "camel"], ["caper", "billy goat"],
      ["Christus", "Christ"], ["cibus", "food"], ["Deus", "God"], ["dominus", "lord"],
      ["equus", "horse"], ["fīlius", "son"], ["germānus", "brother"], ["gladius", "sword"],
      ["ōceanus", "ocean"], ["servus", "servant"], ["terra", "land"], ["vir", "man"],
      ["nāvigō", "I sail"], ["oppugnō", "I attack"], ["portō", "I carry"], ["dē", "down from"],
      // Lesson 5 — 2nd declension neuter
      ["ēvangelium", "gospel"], ["dōnum", "gift"], ["regnum", "kingdom"], ["gaudium", "joy"],
      ["oppidum", "town"], ["argentum", "silver"], ["caelum", "heaven"], ["verbum", "word"],
      ["discipulus", "student"], ["perīculum", "danger"], ["fātum", "fate"], ["puer", "boy"],
      ["numquam", "never"], ["semper", "always"],
      // Lesson 6 — imperfect & future
      ["mundus", "world"], ["creō", "I create"], ["ōrō", "I pray"], ["regnō", "I rule"],
      ["rogō", "I ask"], ["pōtō", "I drink"], ["saeculum", "age"], ["saepe", "often"],
      ["dea", "goddess"], ["fīlia", "daughter"], ["nihil", "nothing"],
      // Lesson 7 — adjectives
      ["ferus", "wild"], ["iūstus", "just"], ["pulcher", "beautiful"], ["beātus", "blessed"],
      ["laetus", "happy"], ["mīrus", "wonderful"], ["avārus", "greedy"], ["paucī", "few"],
      ["bonus", "good"], ["malus", "bad"], ["magnus", "great"], ["parvus", "small"],
      ["multus", "much"], ["fidēlis", "faithful"], ["vīnum", "wine"], ["cōgitō", "I think"]
    ],
    sentences: [
      { text: "Cantant aut clāmant.", answer: "They sing or they shout.",
        choices: ["They sing or they shout.", "We walk and we stand.", "She loves the pirate."] },
      { text: "Nōn amās; vulnerās.", answer: "You do not love; you wound.",
        choices: ["You do not love; you wound.", "They never wait.", "I am a farmer."] },
      { text: "Bene amāmus et bene cantāmus.", answer: "We love well and we sing well.",
        choices: ["We love well and we sing well.", "The queen burns the palace.", "He gives the horse food."] },
      { text: "Puellae pīrātārum estis.", answer: "You are the pirates' girls.",
        choices: ["You are the pirates' girls.", "The beasts live in the forest.", "I wait for the sailor."] },
      { text: "Poēta germānus virī est.", answer: "The poet is the man's brother.",
        choices: ["The poet is the man's brother.", "The camel sails the ocean.", "God gives the kingdom."] }
    ]
  },
  {
    name: "Kraken Unit 2",
    focus: "second conjugation, possum, third declension, perfect tenses (lessons 9–15)",
    words: [
      ["habeō", "I have"], ["iaceō", "I lie down"], ["doceō", "I teach"], ["timeō", "I fear"],
      ["terreō", "I frighten"], ["moneō", "I warn"], ["videō", "I see"], ["teneō", "I hold"],
      ["maneō", "I remain"], ["sedeō", "I sit"], ["dēbeō", "I ought"], ["salveō", "I am well"],
      ["festīnō", "I hurry"], ["cum", "with"], ["sine", "without"], ["interim", "meanwhile"],
      ["geminus", "twin"], ["vēnor", "I hunt"], ["līberī", "children"], ["unda", "wave"],
      ["cervus", "stag"], ["centaurus", "centaur"], ["repentē", "suddenly"],
      ["quod", "because"], ["populus", "people"], ["contrā", "against"], ["lūceō", "I shine"],
      ["vīta", "life"], ["tenebrae", "darkness"], ["via", "road"], ["possum", "I am able"],
      ["virtūs", "courage"], ["homō", "human being"], ["lūx", "light"], ["pater", "father"],
      ["soror", "sister"], ["frāter", "brother"], ["caveō", "I beware"], ["quandō", "when"],
      ["tigris", "tiger"], ["leō", "lion"], ["caput", "head"], ["lītus", "shore"],
      ["nōmen", "name"], ["audeō", "I dare"], ["ōs", "mouth"], ["vulnus", "wound"],
      ["diū", "for a long time"], ["iter", "journey"], ["statim", "immediately"],
      ["suprā", "above"], ["exerceō", "I train"], ["parō", "I prepare"], ["vesper", "evening"],
      ["vastō", "I lay waste"], ["vōx", "voice"], ["onus", "burden"], ["amor", "love"],
      ["iam", "already"], ["frūmentum", "grain"], ["mox", "soon"], ["pāx", "peace"],
      ["cōpia", "supply"], ["cūrō", "I care for"], ["tum", "then"], ["aeternus", "eternal"],
      ["bellum", "war"]
    ],
    sentences: [
      { text: "Cibum et crustula teneō.", answer: "I am holding food and cookies.",
        choices: ["I am holding food and cookies.", "The tiger fears the lion.", "We hunt in the forest."] },
      { text: "Puerī bonī nunc estis.", answer: "You are good boys now.",
        choices: ["You are good boys now.", "The wave destroys the shore.", "Father teaches the children."] },
      { text: "Mea soror leōnēs timēbat.", answer: "My sister used to fear lions.",
        choices: ["My sister used to fear lions.", "Peace is already here.", "I sit without a name."] },
      { text: "Possumus vidēre lūcem.", answer: "We are able to see the light.",
        choices: ["We are able to see the light.", "The centaur remains at war.", "They shout against the crowd."] }
    ]
  },
  {
    name: "Kraken Unit 3",
    focus: "personal pronouns, i-stem nouns, third-declension adjectives, passives, numerals (lessons 17–23)",
    words: [
      ["flōreō", "I flourish"], ["ante", "before"], ["post", "after"], ["enim", "for"],
      ["ecce", "behold"], ["urbs", "city"], ["ignis", "fire"], ["nūbēs", "cloud"],
      ["ergō", "therefore"], ["mōns", "mountain"], ["animal", "animal"], ["sī", "if"],
      ["canis", "dog"], ["certātim", "eagerly"], ["paene", "almost"], ["facilis", "easy"],
      ["pāstor", "shepherd"], ["ruber", "red"], ["fessus", "tired"], ["turris", "tower"],
      ["tristis", "sad"], ["ardeō", "I burn"], ["gaudeō", "I rejoice"], ["avia", "grandmother"],
      ["avus", "grandfather"], ["etiam", "also"], ["vidua", "widow"], ["deinde", "then"],
      ["vērus", "true"], ["ūnus", "one"], ["duo", "two"], ["trēs", "three"],
      ["quattuor", "four"], ["quīnque", "five"], ["sex", "six"], ["septem", "seven"],
      ["octō", "eight"], ["novem", "nine"], ["decem", "ten"], ["prīmus", "first"],
      ["secundus", "second"], ["tertius", "third"], ["quārtus", "fourth"], ["quīntus", "fifth"],
      ["ego", "I"], ["tū", "you"], ["nōs", "we"], ["vōs", "you all"]
    ],
    sentences: [
      { text: "Ecce canis in urbe.", answer: "Behold, a dog in the city.",
        choices: ["Behold, a dog in the city.", "The tower is almost red.", "Grandmother is tired."] },
      { text: "Sī ignis est, animalia fugiunt.", answer: "If there is fire, the animals flee.",
        choices: ["If there is fire, the animals flee.", "We are the first three.", "The shepherd is sad."] },
      { text: "Avus et avia gaudent.", answer: "Grandfather and grandmother rejoice.",
        choices: ["Grandfather and grandmother rejoice.", "The mountain is easy.", "I have four widows."] },
      { text: "Pastor bonus trēs ovēs habet.", answer: "The good shepherd has three sheep.",
        choices: ["The good shepherd has three sheep.", "Fire burns the red tower.", "You all are first."] }
    ]
  },
  {
    name: "Kraken Unit 4",
    focus: "fourth & fifth declension, 3rd/4th/3rd-io verbs, demonstratives (lessons 25–31)",
    words: [
      ["cantus", "song"], ["genū", "knee"], ["cornū", "horn"], ["propter", "because of"],
      ["iterum", "again"], ["accēdō", "I approach"], ["salvus", "safe"], ["frūctus", "fruit"],
      ["lūdō", "I play"], ["super", "above"], ["fortasse", "perhaps"], ["quoniam", "since"],
      ["dūcō", "I lead"], ["dīcō", "I say"], ["medius", "middle"], ["novus", "new"],
      ["crēdō", "I believe"], ["cadō", "I fall"], ["vultus", "face"], ["vīvō", "I live"],
      ["perdō", "I lose"], ["lacus", "lake"], ["ac", "and"], ["iungō", "I join"],
      ["modo", "only"], ["pōnō", "I place"], ["gerō", "I wear"], ["surgō", "I arise"],
      ["spēs", "hope"], ["posteā", "afterwards"], ["cōgō", "I force"], ["mittō", "I send"],
      ["merīdiēs", "noon"], ["clam", "secretly"], ["quoque", "also"], ["veniō", "I come"],
      ["audiō", "I hear"], ["dormiō", "I sleep"], ["agō", "I do"], ["colō", "I cultivate"],
      ["vītō", "I avoid"], ["vetus", "old"], ["trahō", "I drag"], ["classis", "fleet"],
      ["satis", "enough"], ["nesciō", "I do not know"], ["iste", "that (of yours)"],
      ["hic", "this"], ["eō", "I go"]
    ],
    sentences: [
      { text: "Veniō et audiō cantum.", answer: "I come and I hear the song.",
        choices: ["I come and I hear the song.", "The old fleet falls.", "Hope secretly sleeps."] },
      { text: "Posteā surgō et eō.", answer: "Afterwards I arise and I go.",
        choices: ["Afterwards I arise and I go.", "I lose the new fruit.", "The lake is enough."] },
      { text: "Hic frūctus novus est.", answer: "This fruit is new.",
        choices: ["This fruit is new.", "I drag the fleet at noon.", "We only play above the lake."] },
      { text: "Spēs nōn cadit.", answer: "Hope does not fall.",
        choices: ["Hope does not fall.", "I send the horn again.", "The face is secretly old."] }
    ]
  }
];

(function () {
  function state() { return Save.data.latin; }

  function currentTier() {
    return Math.min(state().tier, LATIN_TIERS.length - 1);
  }

  function pickTierIndex(boost) {
    if (boost) return Math.min(currentTier() + boost, LATIN_TIERS.length - 1);
    var t = currentTier();
    if (t > 0 && Math.random() < CONFIG.REVIEW_CHANCE) return t - 1;
    return t;
  }

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }

  function bare(s) {
    return String(s).toLowerCase()
      .replace(/ā/g, "a").replace(/ē/g, "e").replace(/ī/g, "i")
      .replace(/ō/g, "o").replace(/ū/g, "u").replace(/ȳ/g, "y");
  }

  function choosePair(tierIdx) {
    var words = LATIN_TIERS[tierIdx].words;
    var misses = Save.data.stats.wordStats || {};
    var struggling = words.filter(function (w) {
      var s = misses[bare(w[0])];
      return s && s.miss > s.win;
    });
    if (struggling.length && Math.random() < 0.4) {
      return struggling[Math.floor(Math.random() * struggling.length)];
    }
    return words[Math.floor(Math.random() * words.length)];
  }

  function latinChoices(tierIdx, correctLa, n) {
    var pool = LATIN_TIERS[tierIdx].words.filter(function (w) { return w[0] !== correctLa; });
    var out = [correctLa];
    pool = shuffled(pool);
    for (var i = 0; i < pool.length && out.length < n; i++) out.push(pool[i][0]);
    return shuffled(out);
  }

  function getChallenge(kind, opts) {
    var boost = (opts && opts.boost) || 0;
    var tierIdx = pickTierIndex(boost);
    var tier = LATIN_TIERS[tierIdx];

    if (kind === "pick" && !boost && Math.random() < 0.22 && tier.sentences.length) {
      kind = "sentence";
    }

    if (kind === "sentence") {
      var s = tier.sentences[Math.floor(Math.random() * tier.sentences.length)];
      return {
        moduleId: "latin", kind: "sentence", tier: tierIdx,
        text: s.text, answer: s.answer, choices: shuffled(s.choices.slice()),
        speak: "What does this Latin mean?",
        subtitle: "Tap the English meaning!",
        word: bare(s.text.split(" ")[0]),
        skill: "latin-read"
      };
    }

    var pair = choosePair(tierIdx);
    var la = pair[0], en = pair[1];

    if (kind === "spell") {
      var word = bare(la);
      var letters = word.split("");
      var alphabet = "abcdefghijklmnopqrstuvwxyz";
      var decoys = [];
      var nDecoys = Math.min(3 + tierIdx, 5);
      while (decoys.length < nDecoys) {
        var ch = alphabet[Math.floor(Math.random() * 26)];
        if (letters.indexOf(ch) < 0 && decoys.indexOf(ch) < 0) decoys.push(ch);
      }
      return {
        moduleId: "latin", kind: "spell", tier: tierIdx,
        word: word, speak: en,
        subtitle: "Spell the LATIN for: " + en,
        tiles: shuffled(letters.concat(decoys)),
        skill: "latin-spell"
      };
    }

    var nChoices = (tierIdx >= 2 || boost) ? 4 : 3;
    return {
      moduleId: "latin", kind: "pick", tier: tierIdx,
      word: bare(la), speak: en, answer: la,
      choices: latinChoices(tierIdx, la, nChoices),
      subtitle: "Tap the LATIN for the word you hear!",
      skill: "latin-vocab"
    };
  }

  function reportResult(challenge, result) {
    Learning.applyRamp(state(), challenge, result, LATIN_TIERS.length - 1,
      function (t) { return LATIN_TIERS[t].name; });
  }

  Learning.registerModule({
    id: "latin",
    getChallenge: getChallenge,
    reportResult: reportResult,
    tier: function () { return state().tier; },
    focus: function () {
      var t = LATIN_TIERS[currentTier()];
      return { name: t.name, focus: t.focus };
    }
  });
})();
