"use strict";
/* ============================================================
   READING CURRICULUM
   Tier 0: pre-primer sight words + easy CVC (starting point, age ~7 early reader)
   Tier 1: primer/1st sight words + full CVC
   Tier 2: blends & digraphs + 2nd grade sight words
   Tier 3: long vowels, silent-e, vowel teams
   Words with an emoji are used for picture-to-word matching (tap the
   word that matches a big picture). Spencer never spells — letter-tile
   spelling is Penelope's job (and Olivia's Latin). The spell:true flag
   is leftover data and is not used by the reading module.
   ============================================================ */
var CURRICULUM = (function () {

  function w(word, opts) {
    opts = opts || {};
    return { word: word, emoji: opts.e || null, spell: !!opts.s, sight: !!opts.g };
  }

  var TIERS = [
    { // ---- TIER 0 ----
      name: "First Words",
      focus: "easy sight words and short-vowel words like cat and sun",
      words: [
        w("a",   {g:1}), w("I",   {g:1}), w("the", {g:1}), w("and", {g:1}),
        w("go",  {g:1, s:1}), w("me",  {g:1, s:1}), w("we",  {g:1, s:1}),
        w("to",  {g:1}), w("in",  {g:1, s:1}), w("it",  {g:1, s:1}),
        w("up",  {g:1, s:1, e:"⬆️"}), w("you", {g:1}), w("see", {g:1, e:"👀"}),
        w("can", {g:1, s:1}), w("my",  {g:1}), w("is",  {g:1}),
        w("cat", {s:1, e:"🐱"}), w("dog", {s:1, e:"🐶"}), w("sun", {s:1, e:"☀️"}),
        w("bed", {s:1, e:"🛏️"}), w("pig", {s:1, e:"🐷"}), w("hat", {s:1, e:"🎩"}),
        w("bug", {s:1, e:"🐞"}), w("box", {s:1, e:"📦"}), w("map", {s:1, e:"🗺️"}),
        w("red", {s:1, e:"🟥"}), w("run", {s:1, e:"🏃"}), w("six", {s:1, e:"6️⃣"})
      ],
      sentences: [
        { text: "I see a cat.",      answer: "🐱", choices: ["🐱","🐶","☀️"] },
        { text: "The dog can run.",  answer: "🐶", choices: ["🐷","🐶","🐱"] },
        { text: "The sun is up.",    answer: "☀️", choices: ["🌙","☀️","🐞"] },
        { text: "I can see a pig.",  answer: "🐷", choices: ["🐷","🐱","📦"] },
        { text: "The bug is red.",   answer: "🐞", choices: ["🐞","🐶","🎩"] },
        { text: "My hat is big.",    answer: "🎩", choices: ["🛏️","🎩","🗺️"] }
      ]
    },
    { // ---- TIER 1 ----
      name: "Word Builder",
      focus: "more sight words and sounding out all short-vowel words",
      words: [
        w("he",   {g:1, s:1}), w("she",  {g:1}), w("was",  {g:1}), w("are",  {g:1}),
        w("said", {g:1}), w("they", {g:1}), w("have", {g:1}), w("with", {g:1}),
        w("this", {g:1}), w("look", {g:1, e:"👀"}), w("come", {g:1}), w("here", {g:1}),
        w("what", {g:1}), w("play", {g:1, e:"⚽"}), w("like", {g:1, e:"👍"}),
        w("jump", {s:1, e:"🤸"}), w("fish", {s:1, e:"🐟"}), w("frog", {s:1, e:"🐸"}),
        w("crab", {s:1, e:"🦀"}), w("drum", {s:1, e:"🥁"}), w("hand", {s:1, e:"✋"}),
        w("nest", {s:1, e:"🪺"}), w("milk", {s:1, e:"🥛"}), w("tent", {s:1, e:"⛺"}),
        w("swim", {s:1, e:"🏊"}), w("wind", {s:1, e:"🌬️"}), w("sled", {s:1, e:"🛷"}),
        w("gift", {s:1, e:"🎁"}), w("belt", {s:1, e:"🥋"}), w("lamp", {s:1, e:"💡"})
      ],
      sentences: [
        { text: "The frog can jump.",     answer: "🐸", choices: ["🐸","🐟","🦀"] },
        { text: "She has a gift.",        answer: "🎁", choices: ["🥁","🎁","💡"] },
        { text: "Look at the fish.",      answer: "🐟", choices: ["🐟","🐸","🪺"] },
        { text: "He can play the drum.",  answer: "🥁", choices: ["⛺","🥛","🥁"] },
        { text: "They swim with me.",     answer: "🏊", choices: ["🏊","🤸","🛷"] },
        { text: "This is my tent.",       answer: "⛺", choices: ["🪺","⛺","📦"] }
      ]
    },
    { // ---- TIER 2 ----
      name: "Sound Master",
      focus: "blends and digraphs (sh, ch, th) plus trickier sight words",
      words: [
        w("because",{g:1}), w("would", {g:1}), w("could", {g:1}), w("their", {g:1}),
        w("there",  {g:1}), w("where", {g:1}), w("very",  {g:1}), w("every", {g:1}),
        w("again",  {g:1}), w("who",   {g:1}), w("does",  {g:1}), w("goes",  {g:1}),
        w("ship",  {s:1, e:"🚢"}), w("chest", {s:1, e:"🧰"}), w("shell", {s:1, e:"🐚"}),
        w("chick", {s:1, e:"🐤"}), w("sheep", {s:1, e:"🐑"}), w("brush", {s:1, e:"🪥"}),
        w("cloud", {s:1, e:"☁️"}), w("plant", {s:1, e:"🪴"}), w("truck", {s:1, e:"🚚"}),
        w("block", {s:1, e:"🧱"}), w("snack", {s:1, e:"🍿"}), w("think", {s:1, e:"🤔"}),
        w("splash",{s:1, e:"💦"}), w("string",{s:1, e:"🧵"}), w("branch",{s:1, e:"🌿"})
      ],
      sentences: [
        { text: "The chest is full of gems.",     answer: "🧰", choices: ["🧰","🚢","🐚"] },
        { text: "The sheep is in the cloud... no, the grass!", answer: "🐑", choices: ["🐤","🐑","🚚"] },
        { text: "Where is the little chick?",     answer: "🐤", choices: ["🐤","🐑","🪴"] },
        { text: "The truck has a snack.",         answer: "🚚", choices: ["🚢","🧱","🚚"] },
        { text: "I think the plant can grow.",    answer: "🪴", choices: ["🪴","☁️","🧵"] },
        { text: "The ship makes a big splash.",   answer: "💦", choices: ["🐚","💦","🍿"] }
      ]
    },
    { // ---- TIER 3 ----
      name: "Reading Legend",
      focus: "silent-e and vowel-team words like cake, rain, and light",
      words: [
        w("cake",  {s:1, e:"🎂"}), w("bike",  {s:1, e:"🚲"}), w("snake", {s:1, e:"🐍"}),
        w("stone", {s:1, e:"🪨"}), w("whale", {s:1, e:"🐋"}), w("plane", {s:1, e:"✈️"}),
        w("grape", {s:1, e:"🍇"}), w("flame", {s:1, e:"🔥"}), w("rain",  {s:1, e:"🌧️"}),
        w("train", {s:1, e:"🚂"}), w("boat",  {s:1, e:"⛵"}), w("sleep", {s:1, e:"😴"}),
        w("green", {s:1, e:"🟩"}), w("tree",  {s:1, e:"🌳"}), w("moon",  {s:1, e:"🌙"}),
        w("light", {e:"💡"}), w("night", {e:"🌃"}), w("mountain", {e:"⛰️"}),
        w("dragon", {e:"🐉"}), w("castle", {e:"🏰"}), w("diamond", {e:"💎"}),
        w("treasure", {e:"🪙"}), w("explore", {e:"🧭"}), w("builder", {e:"🏗️"})
      ],
      sentences: [
        { text: "The snake sleeps by the stone.",     answer: "🐍", choices: ["🐍","🐋","🚂"] },
        { text: "A whale can not ride a bike.",       answer: "🐋", choices: ["🍇","🐋","✈️"] },
        { text: "The train goes up the mountain.",    answer: "🚂", choices: ["⛵","🚂","🏰"] },
        { text: "The dragon keeps treasure in the castle.", answer: "🐉", choices: ["🐉","🌳","🌙"] },
        { text: "We explore the cave to find a diamond.",   answer: "💎", choices: ["🎂","💎","🌧️"] },
        { text: "The moon gives light at night.",     answer: "🌙", choices: ["☀️","🌙","🔥"] }
      ]
    }
  ];

  // Quest templates used by the sister NPCs. {name} is replaced with
  // the sister's name. Each quest is a short readable request plus a
  // comprehension check ("What do I need?") and a collect goal.
  var QUESTS = [
    { tier: 0, text: "Can you get me 3 wood?",            ask: "wood",    count: 3, icon: "🪵", decoys: ["🪨","🌸"] },
    { tier: 0, text: "I want 2 red flowers!",             ask: "flower",  count: 2, icon: "🌸", decoys: ["🪵","🐟"] },
    { tier: 0, text: "Please dig up 3 dirt for me.",      ask: "dirt",    count: 3, icon: "🟫", decoys: ["🌸","⬜"] },
    { tier: 1, text: "I need 4 stone to build a step.",   ask: "stone",   count: 4, icon: "🪨", decoys: ["🪵","🟫"] },
    { tier: 1, text: "Can you find 3 sand at the beach?", ask: "sand",    count: 3, icon: "🟨", decoys: ["🪨","🌸"] },
    { tier: 1, text: "Bring me 4 leaves from a tree.",    ask: "leaves",  count: 4, icon: "🍃", decoys: ["🟨","🪨"] },
    { tier: 2, text: "I would like 5 wood for my house.", ask: "wood",    count: 5, icon: "🪵", decoys: ["🧱","🍃"] },
    { tier: 2, text: "Please mine 2 coal so we can cook.",ask: "coal",    count: 2, icon: "⚫", decoys: ["💎","🪵"] },
    { tier: 2, text: "Find 5 stone deep under the grass.",ask: "stone",   count: 5, icon: "🪨", decoys: ["🟫","⚫"] },
    { tier: 1, text: "I am so hungry! Please get 2 meat.",  ask: "meat",   count: 2, icon: "🍖", decoys: ["🧶","🌸"] },
    { tier: 2, text: "I need 3 wool to make a soft blanket.", ask: "wool", count: 3, icon: "🧶", decoys: ["🍖","🍃"] },
    { tier: 3, text: "Could you mine 1 shiny diamond for me?", ask: "diamond", count: 1, icon: "💎", decoys: ["⚫","🪨"] },
    { tier: 3, text: "I am building a tower. I need 6 stone!", ask: "stone",  count: 6, icon: "🪨", decoys: ["🪵","🟨"] },
    { tier: 3, text: "Gather 3 iron so I can make a bell.",    ask: "iron",   count: 3, icon: "⛓️", decoys: ["💎","⚫"] }
  ];

  return { TIERS: TIERS, QUESTS: QUESTS };
})();
