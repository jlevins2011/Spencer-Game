"use strict";
/* ============================================================
   UI — HUD, hotbar, challenge overlays (find-the-word,
   build-the-word, read-the-sentence), sister dialogue, menus,
   level-ups, and the hidden grown-ups dashboard.
   ============================================================ */
var UI = (function () {
  var $ = function (id) { return document.getElementById(id); };

  var RANKS = ["Wood Explorer", "Stone Miner", "Iron Adventurer", "Gold Builder",
    "Redstone Whiz", "Emerald Explorer", "Diamond Hero", "Obsidian Champion",
    "Netherite Legend", "Ender Master",
    // the ladder keeps going — earning these should take a while!
    "Dragon Rider", "Wither Slayer", "Beacon Builder", "Elytra Flyer",
    "Shulker Seeker", "Totem Keeper", "Trident Champion", "Ancient Explorer",
    "Sculk Sage", "Warden Whisperer", "Amethyst Architect", "Deepslate Legend",
    "Nether Star Noble", "Crystal Sorcerer", "Sky Fortress Builder",
    "Void Voyager", "Galaxy Miner", "Infinity Crafter", "Master of Worlds",
    "CRAFT LEGEND"];

  function rankFor(level) {
    if (level <= RANKS.length) return RANKS[level - 1];
    return "Craft Legend " + (level - RANKS.length + 1);   // endless prestige
  }

  // Each level costs more than the last (quadratic): early levels come
  // quickly for beginners, high levels are genuine long-term goals.
  function xpNeeded(level) {
    var n = level - 1;
    return 60 + n * 30 + n * n * 10;
  }

  /* ---------------- toast ---------------- */
  var toastTimer = null;
  function toast(msg, ms) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, ms || 2600);
  }

  /* ---------------- HUD ---------------- */
  function updateHud() {
    var p = Save.data.player;
    $("level-label").textContent = "Lv " + p.level;
    $("rank-label").textContent = rankFor(p.level);
    $("gems-label").textContent = "💎 " + p.gems;
    var need = xpNeeded(p.level);
    $("xp-fill").style.width = Math.min(100, (p.xp / need) * 100) + "%";
  }

  function updateQuestHud() {
    var q = Quests.active();
    var el = $("quest-hud");
    if (!q) { el.style.display = "none"; return; }
    el.style.display = "flex";
    var have = Math.min(Save.data.player.inventory[q.ask] || 0, q.count);
    $("quest-hud-text").textContent = q.icon + " " + have + "/" + q.count +
      (have >= q.count ? "  ✅ Go see " + q.sister + "!" : "");
  }

  /* ---------------- hotbar ---------------- */
  var selectedIndex = -1;
  function hotbarItems() {
    var inv = Save.data.player.inventory;
    return Object.keys(inv).filter(function (k) {
      return inv[k] > 0 && ITEM_TO_BLOCK[k] !== undefined;
    }).slice(0, 8);
  }

  function updateHotbar() {
    var bar = $("hotbar");
    bar.innerHTML = "";
    var items = hotbarItems();
    var inv = Save.data.player.inventory;
    items.forEach(function (item, i) {
      var slot = document.createElement("div");
      slot.className = "slot" + (i === selectedIndex ? " selected" : "");
      slot.innerHTML = "<span class='slot-icon'>" + (ITEM_ICON[item] || "⬜") +
        "</span><span class='slot-count'>" + inv[item] + "</span>";
      slot.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        selectHotbar(i);
      });
      bar.appendChild(slot);
    });
    if (selectedIndex >= items.length) selectedIndex = -1;
    updateCraftButton();
  }

  function selectHotbar(i) {
    var items = hotbarItems();
    if (i < 0 || i >= items.length) return;
    selectedIndex = i;
    Game.selectedItem = items[i];
    if (Game.mode !== "build") Game.setMode("build");
    updateHotbar();
  }

  function selectedItem() {
    var items = hotbarItems();
    return selectedIndex >= 0 && selectedIndex < items.length ? items[selectedIndex] : null;
  }

  function updateModeButton() {
    $("btn-mode").textContent = Game.mode === "mine" ? "⛏️" : "🧱";
    $("btn-mode").classList.toggle("build", Game.mode === "build");
  }

  /* ---------------- inventory screen ---------------- */
  function showInventory() {
    var p = Save.data.player;
    var inv = p.inventory;
    var items = Object.keys(inv).filter(function (k) { return inv[k] > 0; });

    var grid = items.length
      ? items.map(function (item) {
          var placeable = ITEM_TO_BLOCK[item] !== undefined;
          return "<button class='inv-slot" + (placeable ? "" : " inv-flat") + "' data-item='" + item + "'>" +
            "<span class='inv-icon'>" + (ITEM_ICON[item] || "⬜") + "</span>" +
            "<span class='inv-count'>" + inv[item] + "</span>" +
            "<span class='inv-name'>" + item + "</span></button>";
        }).join("")
      : "<div class='ch-sub'>Your bag is empty — go mine something!</div>";

    var pickNames = ["Wooden Pickaxe", "Stone Pickaxe", "Iron Pickaxe", "Diamond Pickaxe"];
    var toolsHtml = "<div class='inv-tools'>" +
      "<span class='inv-tool'>⛏️ " + pickNames[p.pickTier] + "</span>" +
      (p.tools.drill ? "<span class='inv-tool legendary'>🌀 Voidbreaker Drill</span>" : "") +
      (p.tools.thunder ? "<span class='inv-tool legendary'>⚡ Thunder Pick</span>" : "") +
      (p.tools.furnace ? "<button class='inv-tool legendary inv-station'>🔥 Magic Furnace</button>" : "") +
      (p.tools.lantern ? "<button class='inv-tool legendary inv-station'>🕯️ Lantern Kit</button>" : "") +
      "</div>";

    openOverlay(
      "<div class='ch-title'>🎒 " + CONFIG.PLAYER_NAME + "'s Stuff</div>" +
      "<div class='ch-sub'>💎 " + p.gems + " gems · Lv " + p.level + " " + rankFor(p.level) + "</div>" +
      toolsHtml +
      "<div class='inv-grid'>" + grid + "</div>" +
      "<div class='ch-sub'>Tap a block to build with it!</div>" +
      "<button class='big-btn' id='inv-close'>BACK TO THE GAME</button>"
    );
    $("inv-close").addEventListener("pointerdown", closeOverlay);
    document.querySelectorAll(".inv-station").forEach(function (b) {
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        closeOverlay();
        doSmelt();
      });
    });
    document.querySelectorAll(".inv-slot").forEach(function (slot) {
      slot.addEventListener("pointerdown", function () {
        var item = slot.getAttribute("data-item");
        if (ITEM_TO_BLOCK[item] === undefined) {
          GameAudio.sfx.pop();
          toast(item === "meat" ? "🍖 Yummy! Someone might want this for dinner..." :
            item === "cooked meat" ? "🍗 Cooked and ready — somebody's hungry!" :
            item === "iron ore" ? "⛓️ Raw iron ore — smelt it in Mommy's furnace!" :
            item === "iron" ? "⛓️ Iron ingot — craft an iron pickaxe with this!" :
            "You can't place " + item + " — but it might be useful!");
          return;
        }
        closeOverlay();
        Game.selectedItem = item;
        Game.setMode("build");
        // sync the hotbar selection if the item is on it
        var idx = hotbarItems().indexOf(item);
        if (idx >= 0) selectHotbar(idx);
        toast("🧱 Building with " + item + "!");
      });
    });
  }

  function toggleInventory() {
    if ($("overlay").classList.contains("open")) closeOverlay();
    else if (Game.running) showInventory();
  }

  /* ---------------- crafting ---------------- */
  var CRAFTS = [
    { tier: 1, name: "stone pickaxe", level: 2, needs: { stone: 5, wood: 2 }, icon: "⛏️" },
    { tier: 2, name: "iron pickaxe",  level: 4, needs: { iron: 4, wood: 2 },  icon: "⛏️" },
    { tier: 3, name: "diamond pickaxe", level: 6, needs: { diamond: 3, wood: 2 }, icon: "⛏️" }
  ];

  function availableCraft() {
    var p = Save.data.player;
    var next = CRAFTS[p.pickTier];
    if (!next || p.level < next.level) return null;
    var inv = p.inventory;
    var ok = Object.keys(next.needs).every(function (k) { return (inv[k] || 0) >= next.needs[k]; });
    return ok ? next : null;
  }

  function nextCraftInfo() { return CRAFTS[Save.data.player.pickTier] || null; }

  function updateCraftButton() {
    var b = $("btn-craft");
    b.style.display = availableCraft() ? "block" : "none";
    var s = $("btn-smelt");
    if (s) s.style.display = availableSmelts().length ? "block" : "none";
  }

  /* ---------------- Mommy's furnace / lantern recipes ---------------- */
  var SMELTS = [
    { need: "furnace", needs: { "iron ore": 1, coal: 1 }, gives: { iron: 1 }, name: "iron ingot", icon: "⛓️" },
    { need: "furnace", needs: { sand: 1, coal: 1 }, gives: { glass: 1 }, name: "glass", icon: "🪟" },
    { need: "furnace", needs: { meat: 1, coal: 1 }, gives: { "cooked meat": 1 }, name: "cooked meat", icon: "🍗" },
    { need: "lantern", needs: { wood: 1, coal: 1 }, gives: { torch: 4 }, name: "4 torches", icon: "🕯️" }
  ];

  function availableSmelts() {
    var p = Save.data.player;
    var inv = p.inventory;
    return SMELTS.filter(function (r) {
      if (!p.tools[r.need]) return false;
      return Object.keys(r.needs).every(function (k) { return (inv[k] || 0) >= r.needs[k]; });
    });
  }

  function doSmelt() {
    var recipes = availableSmelts();
    if (!recipes.length) { toast("Need coal plus ore (or wood) to use Mommy's station!"); return; }
    var html = "<div class='ch-title'>🔥 Mommy's Station</div>" +
      "<div class='ch-sub'>This is what you can make with ore right now!</div>" +
      "<div class='world-list'>" + recipes.map(function (r, i) {
        var cost = Object.keys(r.needs).map(function (k) { return r.needs[k] + " " + k; }).join(" + ");
        return "<button class='world-card smelt-card' data-i='" + i + "'>" +
          "<span class='world-emoji'>" + r.icon + "</span>" +
          "<span class='world-name'>Make " + r.name + "</span>" +
          "<span class='world-req'>" + cost + "</span></button>";
      }).join("") + "</div>" +
      "<button class='ghost-btn' id='smelt-back'>⬅️ BACK</button>";
    openOverlay(html);
    $("smelt-back").addEventListener("pointerdown", closeOverlay);
    document.querySelectorAll(".smelt-card").forEach(function (card) {
      card.addEventListener("pointerdown", function () {
        var r = recipes[+card.getAttribute("data-i")];
        var inv = Save.data.player.inventory;
        if (!Object.keys(r.needs).every(function (k) { return (inv[k] || 0) >= r.needs[k]; })) return;
        Object.keys(r.needs).forEach(function (k) { inv[k] -= r.needs[k]; });
        Object.keys(r.gives).forEach(function (k) { inv[k] = (inv[k] || 0) + r.gives[k]; });
        Save.save();
        GameAudio.sfx.smelt();
        toast(r.icon + " You made " + r.name + "!", 2600);
        closeOverlay();
        updateHotbar();
      });
    });
  }

  function doCraft() {
    var craft = availableCraft();
    if (!craft) return;
    var ch = Learning.getChallenge("spell");
    showSpell(ch, function (result) {
      Learning.reportResult(ch, result);
      if (result.correct) {
        var inv = Save.data.player.inventory;
        Object.keys(craft.needs).forEach(function (k) { inv[k] -= craft.needs[k]; });
        Save.data.player.pickTier = craft.tier;
        Save.save();
        GameAudio.sfx.levelup();
        GameAudio.say("You crafted a " + craft.name + "!");
        toast("⛏️ You crafted a " + craft.name.toUpperCase() + "! You can mine faster now!", 3500);
        updateHotbar();
      }
    }, "Spell the magic word to craft your " + craft.name + "!");
  }

  /* ---------------- generic overlay ---------------- */
  function openOverlay(html) {
    Controls.setEnabled(false);
    $("overlay-card").innerHTML = html;
    $("overlay").classList.add("open");
  }
  function closeOverlay() {
    $("overlay").classList.remove("open");
    if (Game.running) Controls.setEnabled(true);
  }

  function celebrate(el) {
    for (var i = 0; i < 14; i++) {
      var s = document.createElement("div");
      s.className = "spark";
      s.textContent = ["✨", "⭐", "💎", "🎉"][i % 4];
      s.style.left = (10 + Math.random() * 80) + "%";
      s.style.animationDelay = (Math.random() * 0.3) + "s";
      el.appendChild(s);
      (function (sp) { setTimeout(function () { sp.remove(); }, 1400); })(s);
    }
  }

  /* ---------------- challenge: hear & find ---------------- */
  function showPick(ch, onDone, intro) {
    var mistakes = 0, done = false;
    var spoken = ch.speak || ch.word;
    var correct = ch.answer || ch.word;
    var html =
      "<div class='ch-title'>" + (intro || "🔮 Word Ore!") + "</div>" +
      "<div class='ch-sub'>" + (ch.subtitle || "Tap the word you hear!") + "</div>" +
      "<button class='speak-btn' id='ch-speak'>🔊</button>" +
      "<div class='word-grid' id='ch-grid'></div>";
    openOverlay(html);
    var grid = $("ch-grid");
    ch.choices.forEach(function (word) {
      var b = document.createElement("button");
      b.className = "word-block";
      b.textContent = word;
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (done) return;
        if (word === correct) {
          done = true;
          GameAudio.sfx.correct();
          b.classList.add("right");
          celebrate($("overlay-card"));
          setTimeout(function () {
            closeOverlay();
            onDone({ correct: true, mistakes: mistakes });
          }, 900);
        } else {
          mistakes++;
          GameAudio.sfx.wrong();
          b.classList.add("wrong");
          setTimeout(function () { b.classList.remove("wrong"); }, 500);
          setTimeout(function () { GameAudio.say(spoken); }, 450);
        }
      });
      grid.appendChild(b);
    });
    $("ch-speak").addEventListener("pointerdown", function (e) {
      e.stopPropagation(); GameAudio.say(spoken);
    });
    setTimeout(function () { GameAudio.say(spoken); }, 400);
  }

  /* ---------------- challenge: build the word ---------------- */
  function showSpell(ch, onDone, introText) {
    var mistakes = 0, next = 0, missesHere = 0, done = false;
    var spoken = ch.speak || ch.word;
    var html =
      "<div class='ch-title'>" + (introText || "🧰 Locked Chest!") + "</div>" +
      "<div class='ch-sub'>" + (ch.subtitle || ("Build the word" + (ch.emoji ? " for " + ch.emoji : ""))) + "</div>" +
      "<button class='speak-btn' id='ch-speak'>🔊</button>" +
      "<div class='spell-slots' id='ch-slots'></div>" +
      "<div class='tile-grid' id='ch-tiles'></div>";
    openOverlay(html);

    var slots = $("ch-slots");
    ch.word.split("").forEach(function () {
      var s = document.createElement("div");
      s.className = "spell-slot";
      slots.appendChild(s);
    });

    var tiles = $("ch-tiles");
    ch.tiles.forEach(function (letter) {
      var b = document.createElement("button");
      b.className = "letter-tile";
      b.textContent = letter.toUpperCase();
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (done || b.classList.contains("used")) return;
        if (letter === ch.word[next]) {
          GameAudio.sfx.pop();
          GameAudio.sayLetter(letter);
          b.classList.add("used");
          slots.children[next].textContent = letter.toUpperCase();
          slots.children[next].classList.add("filled");
          next++;
          missesHere = 0;
          if (next >= ch.word.length) {
            done = true;
            GameAudio.sfx.correct();
            setTimeout(function () { GameAudio.say(spoken + "! Great job!"); }, 250);
            celebrate($("overlay-card"));
            setTimeout(function () {
              closeOverlay();
              onDone({ correct: true, mistakes: mistakes });
            }, 1200);
          }
        } else {
          mistakes++; missesHere++;
          GameAudio.sfx.wrong();
          b.classList.add("wrong");
          setTimeout(function () { b.classList.remove("wrong"); }, 450);
          if (missesHere >= 2) {
            // ghost hint of the needed letter
            slots.children[next].textContent = ch.word[next].toUpperCase();
            slots.children[next].classList.add("hint");
          }
        }
      });
      tiles.appendChild(b);
    });

    $("ch-speak").addEventListener("pointerdown", function (e) {
      e.stopPropagation(); GameAudio.say(spoken);
    });
    setTimeout(function () { GameAudio.say(spoken); }, 400);
  }

  /* ---------------- challenge: read the sentence ---------------- */
  function showSentence(ch, onDone, introText) {
    var mistakes = 0, done = false;
    var html =
      "<div class='ch-title'>" + (introText || "📜 Secret Message!") + "</div>" +
      "<div class='sentence-text'>" + ch.text + "</div>" +
      "<button class='speak-btn small' id='ch-speak'>🔊 Help me read it</button>" +
      "<div class='ch-sub'>" + (ch.subtitle || "Tap the picture that matches!") + "</div>" +
      "<div class='word-grid' id='ch-grid'></div>";
    openOverlay(html);
    var grid = $("ch-grid");
    ch.choices.forEach(function (emoji) {
      var b = document.createElement("button");
      b.className = "word-block" + (emoji.length <= 4 ? " emoji-block" : "");
      b.textContent = emoji;
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (done) return;
        if (emoji === ch.answer) {
          done = true;
          GameAudio.sfx.correct();
          b.classList.add("right");
          celebrate($("overlay-card"));
          setTimeout(function () {
            closeOverlay();
            onDone({ correct: true, mistakes: mistakes });
          }, 900);
        } else {
          mistakes++;
          GameAudio.sfx.wrong();
          b.classList.add("wrong");
          setTimeout(function () { b.classList.remove("wrong"); }, 500);
        }
      });
      grid.appendChild(b);
    });
    $("ch-speak").addEventListener("pointerdown", function (e) {
      e.stopPropagation(); GameAudio.say(ch.speak || ch.text, 0.8);
    });
  }

  function showChallenge(kind, onDone, intro) {
    var ch = Learning.getChallenge(kind);
    if (!ch) { onDone({ correct: true, mistakes: 0 }); return; }
    var wrapped = function (result) {
      Learning.reportResult(ch, result);
      onDone(result);
    };
    if (ch.kind === "spell") showSpell(ch, wrapped, intro);
    else if (ch.kind === "sentence") showSentence(ch, wrapped, intro);
    else showPick(ch, wrapped, intro);
  }

  /* ---------------- Daddy: super challenges & legendary tools ---------------- */
  var TOOLS = [
    { key: "drill", name: "VOIDBREAKER DRILL", icon: "🌀", wins: 3,
      desc: "It can smash BEDROCK! Dig below the world into the DEEP DARK, where amethyst and mythril hide!" },
    { key: "thunder", name: "THUNDER PICK", icon: "⚡", wins: 8,
      desc: "It mines everything TWICE as fast! CRACKA-BOOM!" }
  ];

  function nextTool() {
    var tools = Save.data.player.tools;
    for (var i = 0; i < TOOLS.length; i++) {
      if (!tools[TOOLS[i].key]) return TOOLS[i];
    }
    return null;
  }

  function showToolUnlock(tool) {
    var html =
      "<div class='levelup-burst'>" + tool.icon + "</div>" +
      "<div class='ch-title big'>LEGENDARY TOOL!</div>" +
      "<div class='rank-name'>" + tool.icon + " " + tool.name + "</div>" +
      "<div class='unlock-list'><div class='unlock-item'>" + tool.desc + "</div></div>" +
      "<button class='big-btn' id='tool-ok'>WHOA!</button>";
    openOverlay(html);
    GameAudio.sfx.levelup();
    GameAudio.say("You earned the " + tool.name + "! " + tool.desc);
    celebrate($("overlay-card"));
    $("tool-ok").addEventListener("pointerdown", function () {
      closeOverlay();
      updateHotbar();
    });
  }

  function showDaddy(npc) {
    var d = Save.data.daddy;
    var tool = nextTool();
    var greetings = [
      "My leg is stuck in this silly boot, but my brain still works!",
      "Ouch, my leg! Good thing challenges don't need two feet!",
      "I can't run with this boot on... but I CAN quiz you!"
    ];
    var progress = tool
      ? "Win " + (tool.wins - d.wins) + " more and I'll give you a MYSTERY TOOL! 🎁"
      : "You have all my tools! But I still have gems... 💎";
    var html =
      "<div class='npc-head daddy' style='--hair:" + CONFIG.DADDY.hair + "'></div>" +
      "<div class='ch-title'>Daddy</div>" +
      "<div class='sentence-text'>" + greetings[Math.floor(Math.random() * greetings.length)] +
      " Ready for a SUPER CHALLENGE, " + CONFIG.PLAYER_NAME + "?<br><br>" + progress + "</div>" +
      "<button class='big-btn' id='dad-go'>🔥 SUPER CHALLENGE!</button>" +
      "<button class='ghost-btn' id='dad-later'>Maybe later</button>";
    openOverlay(html);
    GameAudio.sfx.quest();
    $("dad-later").addEventListener("pointerdown", closeOverlay);
    $("dad-go").addEventListener("pointerdown", function () {
      var kind = Math.random() < 0.5 ? "spell" : "pick";
      var ch = Learning.getChallenge(kind, { boost: 1 });
      var run = ch.kind === "spell" ? showSpell : showPick;
      run(ch, function (result) {
        Learning.reportResult(ch, result);
        if (!result.correct) return;
        Game.grantGems(3);
        Game.grantXP(25);
        if (result.mistakes <= 1) {
          d.wins += 1;
          Save.save();
          var t = nextTool();
          if (t && d.wins >= t.wins) {
            Save.data.player.tools[t.key] = true;
            Save.save();
            setTimeout(function () { showToolUnlock(t); }, 400);
            return;
          }
          UI.toast(t
            ? "🔥 Super win! " + (t.wins - d.wins) + " more for Daddy's mystery tool!"
            : "🔥 Super win! +3 gems, +25 XP!", 3000);
        } else {
          UI.toast("💪 You got it! Perfect wins count toward Daddy's mystery tool!", 3000);
        }
      }, "🔥 DADDY'S SUPER CHALLENGE!");
    });
  }

  /* ---------------- Mommy: super challenges & Minecraft capabilities ---------------- */
  var MOMMY_TOOLS = [
    { key: "furnace", name: "MAGIC FURNACE", icon: "🔥", wins: 3,
      desc: "That's what you do with ORE in Minecraft! Smelt iron ore + coal into INGOTS, sand into GLASS, and meat into a hot dinner!" },
    { key: "lantern", name: "LANTERN KIT", icon: "🕯️", wins: 8,
      desc: "Turn wood and coal into TORCHES that GLOW! Light up caves and the Deep Dark so treasure isn't hiding in the dark." }
  ];

  function nextMommyTool() {
    var tools = Save.data.player.tools;
    for (var i = 0; i < MOMMY_TOOLS.length; i++) {
      if (!tools[MOMMY_TOOLS[i].key]) return MOMMY_TOOLS[i];
    }
    return null;
  }

  function showMommy(npc) {
    if (!Save.data.mommy) Save.data.mommy = { wins: 0 };
    var m = Save.data.mommy;
    var tool = nextMommyTool();
    var greetings = [
      "Sip sip... this tea is just right. Ready for a SUPER CHALLENGE?",
      "I brought my favorite teacup! Quizzes go better with a warm sip.",
      "The ore in these caves is waiting... but first, a little quiz with your tea!"
    ];
    var progress = tool
      ? "Win " + (tool.wins - m.wins) + " more and I'll teach you a SECRET Minecraft trick! 🎁"
      : "You know all my tricks! But I still have gems... 💎";
    var html =
      "<div class='npc-head mommy' style='--hair:" + CONFIG.MOMMY.hair + "'><span class='tea-cup'>☕</span></div>" +
      "<div class='ch-title'>Mommy ☕</div>" +
      "<div class='sentence-text'>" + greetings[Math.floor(Math.random() * greetings.length)] +
      " Ready, " + CONFIG.PLAYER_NAME + "?<br><br>" + progress + "</div>" +
      "<button class='big-btn' id='mom-go'>☕ SUPER CHALLENGE!</button>" +
      "<button class='ghost-btn' id='mom-later'>Maybe later</button>";
    openOverlay(html);
    GameAudio.sfx.quest();
    $("mom-later").addEventListener("pointerdown", closeOverlay);
    $("mom-go").addEventListener("pointerdown", function () {
      var kind = Math.random() < 0.5 ? "spell" : "pick";
      var ch = Learning.getChallenge(kind, { boost: 1 });
      var run = ch.kind === "spell" ? showSpell : showPick;
      run(ch, function (result) {
        Learning.reportResult(ch, result);
        if (!result.correct) return;
        Game.grantGems(3);
        Game.grantXP(25);
        if (result.mistakes <= 1) {
          m.wins += 1;
          Save.save();
          var t = nextMommyTool();
          if (t && m.wins >= t.wins) {
            Save.data.player.tools[t.key] = true;
            Save.save();
            updateHotbar();
            setTimeout(function () { showToolUnlock(t); }, 400);
            return;
          }
          UI.toast(t
            ? "☕ Super win! " + (t.wins - m.wins) + " more for Mommy's secret trick!"
            : "☕ Super win! +3 gems, +25 XP!", 3000);
        } else {
          UI.toast("💪 You got it! Perfect wins count toward Mommy's secret trick!", 3000);
        }
      }, "☕ MOMMY'S SUPER CHALLENGE!");
    });
  }

  /* ---------------- sister dialogue ---------------- */
  function showDialogue(npc) {
    if (npc.def.dog) {
      // petting Maggie: no overlay, just joy
      GameAudio.sfx.bark();
      var pets = [
        "🐶 Woof woof! Maggie wags her tail like crazy!",
        "🐶 Maggie licks your hand! Good girl!",
        "🐶 Maggie rolls over for belly rubs!",
        "🐶 Maggie zooms in a happy circle around you!"
      ];
      toast(pets[Math.floor(Math.random() * pets.length)], 2200);
      npc.group.rotation.y += 0.6;   // happy wiggle
      return;
    }
    if (npc.def.daddy) { showDaddy(npc); return; }
    if (npc.def.mommy) { showMommy(npc); return; }
    var name = npc.def.name;
    var q = Quests.active();

    if (q && q.sister === name && Quests.isComplete()) {
      // turn in!
      var doneHtml =
        "<div class='npc-head' style='--hair:" + npc.def.hair + ";--shirt:" + npc.def.shirt + "'></div>" +
        "<div class='ch-title'>" + name + "</div>" +
        "<div class='sentence-text'>You did it! Thank you, " + CONFIG.PLAYER_NAME + "! 🎉</div>" +
        "<button class='big-btn' id='dlg-done'>💎 GET REWARD</button>";
      openOverlay(doneHtml);
      GameAudio.sfx.quest();
      GameAudio.say("You did it! Thank you " + CONFIG.PLAYER_NAME + "!");
      $("dlg-done").addEventListener("pointerdown", function () {
        Quests.finish();
        celebrate($("overlay-card"));
        setTimeout(closeOverlay, 700);
      });
      return;
    }

    if (q) {
      // remind about the active quest
      var who = q.sister === name ? "I" : q.sister;
      var remindHtml =
        "<div class='npc-head' style='--hair:" + npc.def.hair + ";--shirt:" + npc.def.shirt + "'></div>" +
        "<div class='ch-title'>" + name + "</div>" +
        "<div class='sentence-text'>" + (q.sister === name ? q.text : "Go help " + q.sister + " first! " + q.icon) + "</div>" +
        "<button class='speak-btn small' id='dlg-speak'>🔊</button>" +
        "<button class='big-btn' id='dlg-ok'>OK!</button>";
      openOverlay(remindHtml);
      $("dlg-speak").addEventListener("pointerdown", function () {
        GameAudio.say(q.sister === name ? q.text : "Go help " + q.sister + " first!", 0.8);
      });
      $("dlg-ok").addEventListener("pointerdown", closeOverlay);
      return;
    }

    // offer a new quest — Spencer reads the request, then a quick
    // "what do I need?" comprehension check locks it in.
    var quest = Quests.pickQuest();
    var choices = [quest.icon].concat(quest.decoys).sort(function () { return Math.random() - 0.5; });
    var html =
      "<div class='npc-head' style='--hair:" + npc.def.hair + ";--shirt:" + npc.def.shirt + "'></div>" +
      "<div class='ch-title'>" + name + "</div>" +
      "<div class='sentence-text'>Hi " + CONFIG.PLAYER_NAME + "! " + quest.text + "</div>" +
      "<button class='speak-btn small' id='dlg-speak'>🔊 Help me read it</button>" +
      "<div class='ch-sub'>What does " + name + " need?</div>" +
      "<div class='word-grid' id='dlg-grid'></div>" +
      "<button class='ghost-btn' id='dlg-later'>Maybe later</button>";
    openOverlay(html);
    GameAudio.sfx.quest();
    var mistakes = 0, answered = false;
    var grid = $("dlg-grid");
    choices.forEach(function (icon) {
      var b = document.createElement("button");
      b.className = "word-block emoji-block";
      b.textContent = icon;
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (answered) return;
        if (icon === quest.icon) {
          answered = true;
          GameAudio.sfx.correct();
          Stats.recordChallenge({ moduleId: "reading", kind: "sentence", skill: "sentences", word: "" }, { correct: true, mistakes: mistakes });
          Game.notifyEdu();
          Quests.start(name, quest);
          GameAudio.say("Yes! " + quest.text);
          b.classList.add("right");
          setTimeout(function () {
            closeOverlay();
            toast(quest.icon + " New quest from " + name + "!");
          }, 800);
        } else {
          mistakes++;
          GameAudio.sfx.wrong();
          b.classList.add("wrong");
          setTimeout(function () { b.classList.remove("wrong"); }, 500);
        }
      });
      grid.appendChild(b);
    });
    $("dlg-speak").addEventListener("pointerdown", function () { GameAudio.say(quest.text, 0.8); });
    $("dlg-later").addEventListener("pointerdown", closeOverlay);
  }

  /* ---------------- level up ---------------- */
  function showLevelUp(newLevel) {
    var unlocks = [];
    WORLD_DEFS.forEach(function (w) {
      if (w.level === newLevel) unlocks.push(w.emoji + " NEW WORLD: " + w.name + "!");
    });
    CRAFTS.forEach(function (c) {
      if (c.level === newLevel) unlocks.push("⛏️ You can now craft a " + c.name + "!");
    });
    var html =
      "<div class='levelup-burst'>🎆</div>" +
      "<div class='ch-title big'>LEVEL " + newLevel + "!</div>" +
      "<div class='rank-name'>" + rankFor(newLevel) + "</div>" +
      (unlocks.length ? "<div class='unlock-list'>" + unlocks.map(function (u) {
        return "<div class='unlock-item'>" + u + "</div>";
      }).join("") + "</div>" : "") +
      "<button class='big-btn' id='lv-ok'>AWESOME!</button>";
    openOverlay(html);
    GameAudio.sfx.levelup();
    GameAudio.say("Level " + newLevel + "! You are now a " + rankFor(newLevel) + "!");
    celebrate($("overlay-card"));
    $("lv-ok").addEventListener("pointerdown", function () {
      closeOverlay();
      updateHud();
    });
  }

  /* ---------------- pause menu / worlds ---------------- */
  function showPause() {
    var html =
      "<div class='ch-title'>PAUSED</div>" +
      "<button class='big-btn' id='pm-resume'>▶️ KEEP PLAYING</button>" +
      "<button class='big-btn' id='pm-worlds'>🌍 TRAVEL TO A WORLD</button>" +
      "<button class='ghost-btn hold-btn' id='pm-parent'>👨‍👩‍👧 GROWN-UPS (hold)</button>";
    openOverlay(html);
    $("pm-resume").addEventListener("pointerdown", closeOverlay);
    $("pm-worlds").addEventListener("pointerdown", showWorlds);
    holdToOpen($("pm-parent"), showParent);
  }

  function holdToOpen(btn, fn) {
    var timer = null;
    btn.addEventListener("pointerdown", function () {
      btn.classList.add("holding");
      timer = setTimeout(function () { btn.classList.remove("holding"); fn(); }, 1500);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
      btn.addEventListener(ev, function () {
        btn.classList.remove("holding");
        clearTimeout(timer);
      });
    });
  }

  function showWorlds() {
    var level = Save.data.player.level;
    var html = "<div class='ch-title'>🌍 WORLDS</div><div class='world-list'>";
    WORLD_DEFS.forEach(function (w) {
      var locked = level < w.level;
      html += "<button class='world-card" + (locked ? " locked" : "") +
        (Save.data.player.world === w.id ? " current" : "") + "' data-world='" + w.id + "'>" +
        "<span class='world-emoji'>" + (locked ? "🔒" : w.emoji) + "</span>" +
        "<span class='world-name'>" + w.name + "</span>" +
        "<span class='world-req'>" + (locked ? "Level " + w.level : (Save.data.player.world === w.id ? "You are here!" : "Tap to travel")) + "</span>" +
        "</button>";
    });
    html += "</div><button class='ghost-btn' id='wl-back'>⬅️ BACK</button>";
    openOverlay(html);
    document.querySelectorAll(".world-card").forEach(function (card) {
      card.addEventListener("pointerdown", function () {
        var id = card.getAttribute("data-world");
        var def = WORLD_DEFS.find(function (w) { return w.id === id; });
        if (Save.data.player.level < def.level) {
          GameAudio.sfx.wrong();
          toast("🔒 Reach level " + def.level + " to unlock " + def.name + "!");
          return;
        }
        closeOverlay();
        Game.travelTo(id);
      });
    });
    $("wl-back").addEventListener("pointerdown", showPause);
  }

  /* ---------------- grown-ups dashboard ---------------- */
  function showParent() {
    openOverlay(Reports.dashboardHtml());
    $("pr-close").addEventListener("pointerdown", closeOverlay);

    var sendBtn = $("pr-send");
    if (sendBtn) sendBtn.addEventListener("pointerdown", function () {
      sendBtn.textContent = "SENDING…";
      Reports.send(function (anyOk, results) {
        sendBtn.textContent = anyOk ? "✅ SENT!" : "❌ COULD NOT SEND";
        var status = $("pr-send-status");
        if (status) status.innerHTML = results.map(function (r) {
          return (r.ok ? "✅ " : "❌ ") + r.label;
        }).join("<br>");
      });
    });

    var addBtn = $("pr-email-addbtn");
    if (addBtn) addBtn.addEventListener("pointerdown", function () {
      var input = $("pr-email-input");
      if (Reports.addEmail(input.value)) showParent();   // re-render
      else { input.style.borderColor = "#c0392b"; }
    });
    document.querySelectorAll(".pr-email-del").forEach(function (btn) {
      btn.addEventListener("pointerdown", function () {
        Reports.removeEmail(btn.getAttribute("data-email"));
        showParent();   // re-render
      });
    });
    var resetBtn = $("pr-reset");
    if (resetBtn) {
      var armed = false;
      resetBtn.addEventListener("pointerdown", function () {
        if (!armed) { armed = true; resetBtn.textContent = "TAP AGAIN TO ERASE EVERYTHING"; return; }
        Save.reset();
        location.reload();
      });
    }
  }

  /* ---------------- home screen ---------------- */
  function showHome() {
    $("home").style.display = "flex";
    $("hud").style.display = "none";
    Controls.setEnabled(false);
    renderPlayerButtons();
  }
  function hideHome() {
    $("home").style.display = "none";
    $("hud").style.display = "block";
  }

  function selectPlayer(profile) {
    CONFIG.ACTIVE = profile;
    CONFIG.PLAYER_NAME = profile.name;
    try { localStorage.setItem("craftworlds_last_player", profile.id); } catch (e) {}
    Save.load(profile);
    GameAudio.unlock();
    GameAudio.say("Let's go, " + profile.name + "!");
    Game.start();
  }

  function renderPlayerButtons() {
    var wrap = $("player-buttons");
    wrap.innerHTML = "";
    CONFIG.PLAYERS.forEach(function (p) {
      var lvl = Save.peekLevel(p);
      var b = document.createElement("button");
      b.className = "mc-btn player-btn";
      b.innerHTML = p.emoji + " " + p.name.toUpperCase() +
        "<span class='player-lvl'>" + (lvl ? "Lv " + lvl + " · " + rankFor(lvl) : "New game!") + "</span>";
      b.addEventListener("pointerdown", function () { selectPlayer(p); });
      wrap.appendChild(b);
    });
  }

  // ensure some profile is loaded (home-screen grown-ups button)
  function ensureProfile() {
    if (CONFIG.ACTIVE) return;
    var lastId = null;
    try { lastId = localStorage.getItem("craftworlds_last_player"); } catch (e) {}
    var profile = CONFIG.PLAYERS.find(function (p) { return p.id === lastId; }) || CONFIG.PLAYERS[0];
    CONFIG.ACTIVE = profile;
    CONFIG.PLAYER_NAME = profile.name;
    Save.load(profile);
  }

  function init() {
    document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    $("btn-pause").addEventListener("pointerdown", function (e) { e.stopPropagation(); showPause(); });
    $("btn-bag").addEventListener("pointerdown", function (e) { e.stopPropagation(); showInventory(); });
    $("btn-mode").addEventListener("pointerdown", function (e) { e.stopPropagation(); Game.toggleMode(); });
    $("btn-craft").addEventListener("pointerdown", function (e) { e.stopPropagation(); doCraft(); });
    $("btn-smelt").addEventListener("pointerdown", function (e) { e.stopPropagation(); doSmelt(); });
    var jb = $("btn-jump");
    jb.addEventListener("pointerdown", function (e) { e.stopPropagation(); Player.jump = true; });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
      jb.addEventListener(ev, function () { Player.jump = false; });
    });
    holdToOpen($("btn-home-parent"), function () { ensureProfile(); showParent(); });
  }

  return {
    init: init, toast: toast, updateHud: updateHud, updateHotbar: updateHotbar,
    updateQuestHud: updateQuestHud, updateModeButton: updateModeButton,
    selectHotbar: selectHotbar, selectedItem: selectedItem,
    showChallenge: showChallenge, showDialogue: showDialogue,
    showInventory: showInventory, toggleInventory: toggleInventory,
    showLevelUp: showLevelUp, showPause: showPause, showHome: showHome, hideHome: hideHome,
    rankFor: rankFor, xpNeeded: xpNeeded, nextCraftInfo: nextCraftInfo,
    closeOverlay: closeOverlay
  };
})();
