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
    var tools = [];
    if (Save.data.player.tools && Save.data.player.tools.nerf) tools.push("nerf");
    var hand = ["bucket", "water bucket"].filter(function (k) { return (inv[k] || 0) > 0; });
    var placeable = Object.keys(inv).filter(function (k) {
      return inv[k] > 0 && ITEM_TO_BLOCK[k] !== undefined && hand.indexOf(k) < 0;
    });
    return tools.concat(hand).concat(placeable).slice(0, 8);
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
        "</span><span class='slot-count'>" +
        (item === "nerf" ? (Nerf.ammo() + "/" + Nerf.drumSize()) : inv[item]) +
        "</span>";
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
    if (i === selectedIndex && items[i] === "nerf") {
      holsterNerf();
      toast("🎯 Nerf gun holstered. Tap ⛏️ to mine!");
      return;
    }
    selectedIndex = i;
    Game.selectedItem = items[i];
    if (items[i] === "nerf") {
      Nerf.equip();
      toast("🎯 Nerf gun out! Tap to shoot foam darts. Nobody gets hurt.", 2800);
    } else {
      Nerf.unequip();
      if (Game.mode !== "build") Game.setMode("build");
    }
    updateHotbar();
    updateModeButton();
  }

  function selectedItem() {
    var items = hotbarItems();
    return selectedIndex >= 0 && selectedIndex < items.length ? items[selectedIndex] : null;
  }

  function holsterNerf() {
    selectedIndex = -1;
    Game.selectedItem = null;
    Nerf.unequip();
    updateHotbar();
    updateModeButton();
  }

  function updateModeButton() {
    if (Nerf.isArmed()) {
      $("btn-mode").textContent = "🎯";
      $("btn-mode").classList.toggle("build", false);
      return;
    }
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
      (p.tools.wings ? "<span class='inv-tool legendary'>✈️ Pilot Wings</span>" : "") +
      (p.tools.thunder ? "<span class='inv-tool legendary'>⚡ Thunder Pick</span>" : "") +
      (p.tools.shovel ? "<span class='inv-tool'>🥄 Shovel</span>" : "") +
      (p.tools.axe ? "<span class='inv-tool'>🪓 Axe</span>" : "") +
      (p.tools.shears ? "<span class='inv-tool'>✂️ Shears</span>" : "") +
      (p.tools.nerf ? "<button class='inv-tool inv-equip' data-equip='nerf'>🎯 Nerf gun</button>" : "") +
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
    document.querySelectorAll(".inv-equip").forEach(function (b) {
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        closeOverlay();
        var items = hotbarItems();
        var idx = items.indexOf("nerf");
        if (idx >= 0) selectHotbar(idx);
      });
    });
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
          if (item === "bucket" || item === "water bucket") {
            closeOverlay();
            Game.selectedItem = item;
            var idxB = hotbarItems().indexOf(item);
            if (idxB >= 0) selectHotbar(idxB);
            toast(item === "bucket" ? "🪣 Tap a water block to fill it!" : "💧 Tap to pour a pool!");
            return;
          }
          if (item === "nerf") {
            closeOverlay();
            var idxN = hotbarItems().indexOf("nerf");
            if (idxN >= 0) selectHotbar(idxN);
            return;
          }
          GameAudio.sfx.pop();
          toast(item === "meat" ? "🍖 Yummy! Someone might want this for dinner..." :
            item === "cooked meat" ? "🍗 Cooked and ready — somebody's hungry!" :
            item === "iron ore" ? "⛓️ Raw iron ore — smelt it in Mommy's furnace!" :
            item === "iron" ? "⛓️ Iron ingot — craft shears, a bucket, or an iron pickaxe!" :
            item === "sticks" ? "🥢 Sticks — craft ladders, fences, a shovel, or an axe!" :
            item === "bucket" ? "🪣 Tap a water block to fill it!" :
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

  var WORKSHOP = [
    { id: "planks", kind: "build", name: "4 planks", icon: "🟧", needs: { wood: 1 }, gives: { planks: 4 } },
    { id: "sticks", kind: "build", name: "4 sticks", icon: "🥢", needs: { planks: 2 }, gives: { sticks: 4 } },
    { id: "door", kind: "build", name: "door", icon: "🚪", needs: { planks: 6 }, gives: { door: 1 } },
    { id: "ladder", kind: "build", name: "3 ladders", icon: "🪜", needs: { sticks: 7 }, gives: { ladder: 3 } },
    { id: "fence", kind: "build", name: "3 fences", icon: "🚧", needs: { planks: 2, sticks: 4 }, gives: { fence: 3 } },
    { id: "bed", kind: "build", name: "bed", icon: "🛏️", needs: { wool: 3, planks: 3 }, gives: { bed: 1 } },
    { id: "table", kind: "build", name: "crafting table", icon: "🪚", needs: { planks: 4 }, gives: { "crafting table": 1 } },
    { id: "redwool", kind: "build", name: "red wool", icon: "🟥", needs: { wool: 1, flower: 1 }, gives: { "red wool": 1 } },
    { id: "shovel", kind: "tool", tool: "shovel", name: "shovel", icon: "🥄",
      needs: { stone: 3, sticks: 2 }, blurb: "Mines dirt, sand, and snow extra fast!" },
    { id: "axe", kind: "tool", tool: "axe", name: "axe", icon: "🪓",
      needs: { stone: 3, sticks: 2 }, blurb: "Chops wood and leaves extra fast!" },
    { id: "shears", kind: "tool", tool: "shears", name: "shears", icon: "✂️",
      needs: { iron: 2 }, blurb: "Tap sheep for wool — they keep hopping around!" },
    { id: "nerf", kind: "tool", tool: "nerf", name: "Nerf gun", icon: "🎯",
      needs: { planks: 6, sticks: 4, wool: 2 },
      blurb: "25-dart drum mag. Foam darts stun animals — people just say Ouch!" },
    { id: "bucket", kind: "tool", name: "bucket", icon: "🪣",
      needs: { iron: 3 }, gives: { bucket: 1 }, blurb: "Scoop water, then pour a pool anywhere!" }
  ];

  function canAfford(needs) {
    var inv = Save.data.player.inventory;
    return Object.keys(needs).every(function (k) { return (inv[k] || 0) >= needs[k]; });
  }

  function takeNeeds(needs) {
    var inv = Save.data.player.inventory;
    Object.keys(needs).forEach(function (k) { inv[k] -= needs[k]; });
  }

  function giveItems(gives) {
    var inv = Save.data.player.inventory;
    Object.keys(gives).forEach(function (k) { inv[k] = (inv[k] || 0) + gives[k]; });
  }

  function availableCraft() {
    var p = Save.data.player;
    var next = CRAFTS[p.pickTier];
    if (!next || p.level < next.level) return null;
    return canAfford(next.needs) ? next : null;
  }

  function nextCraftInfo() { return CRAFTS[Save.data.player.pickTier] || null; }

  function availableWorkshop() {
    var p = Save.data.player;
    return WORKSHOP.filter(function (r) {
      if (r.tool && p.tools[r.tool]) return false;
      return canAfford(r.needs);
    });
  }

  function visibleWorkshop() {
    var p = Save.data.player;
    return WORKSHOP.filter(function (r) {
      return !(r.tool && p.tools[r.tool]);
    });
  }

  function costStr(needs) {
    return Object.keys(needs).map(function (k) { return needs[k] + " " + k; }).join(" + ");
  }

  function updateCraftButton() {
    var b = $("btn-craft");
    b.style.display = (availableCraft() || availableWorkshop().length) ? "block" : "none";
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

  function craftIntro(ch, kindName) {
    if (ch && ch.kind === "picture") return "Tap the word that matches to craft your " + kindName + "!";
    if (ch && ch.kind === "read") return "Read the word and tap the picture to craft your " + kindName + "!";
    if (ch && ch.kind !== "spell") return "Tap the word you hear to craft your " + kindName + "!";
    return "Spell the magic word to craft your " + kindName + "!";
  }

  function startToolChallenge(kindName, onSuccess) {
    var ch = Learning.getChallenge("spell");
    presentChallenge(ch, function (result) {
      if (!result.skipped) Learning.reportResult(ch, result);
      if (result.correct && !result.skipped) onSuccess();
    }, craftIntro(ch, kindName));
  }

  function doCraft() {
    var craft = availableCraft();
    if (!craft) return;
    startToolChallenge(craft.name, function () {
      takeNeeds(craft.needs);
      Save.data.player.pickTier = craft.tier;
      Save.save();
      GameAudio.sfx.levelup();
      GameAudio.say("You crafted a " + craft.name + "!");
      toast("⛏️ You crafted a " + craft.name.toUpperCase() + "! You can mine faster now!", 3500);
      updateHotbar();
    });
  }

  function recipeCardHtml(icon, name, req, extraClass, dataAttrs) {
    return "<button class='world-card smelt-card" + (extraClass || "") + "' " + (dataAttrs || "") + ">" +
      "<span class='world-emoji'>" + icon + "</span>" +
      "<span class='world-name'>Make " + name + "</span>" +
      "<span class='world-req'>" + req + "</span></button>";
  }

  function showWorkshop() {
    var recipes = visibleWorkshop();
    var ready = recipes.filter(function (r) { return canAfford(r.needs); });
    var locked = recipes.filter(function (r) { return !canAfford(r.needs); });
    var pick = availableCraft();
    var nextPick = CRAFTS[Save.data.player.pickTier] || null;
    var pickReady = !!pick;
    var pickLocked = nextPick && !pick && Save.data.player.level >= nextPick.level;

    if (!ready.length && !pickReady && !locked.length && !pickLocked) {
      closeOverlay();
      toast("Need more stuff to craft.");
      return;
    }

    var html = "<div class='ch-title'>🔨 Workshop</div>" +
      "<div class='ch-sub'>Build doors, beds, and tools — like a real crafting table!</div>";

    if (ready.length || pickReady) {
      html += "<div class='world-list'>";
      ready.forEach(function (r, i) {
        var extra = r.tool ? " · word challenge" : (r.blurb ? " · " + r.blurb : "");
        html += recipeCardHtml(r.icon, r.name, costStr(r.needs) + extra, "", "data-kind='ws' data-i='" + i + "'");
      });
      if (pickReady) {
        html += recipeCardHtml(pick.icon, pick.name, costStr(pick.needs) + " · word challenge", "", "data-kind='pick'");
      }
      html += "</div>";
    } else {
      html += "<div class='ch-sub'>Gather a little more, then these recipes light up!</div>";
    }

    if (locked.length || pickLocked) {
      html += "<div class='ch-sub'>Need more stuff for:</div><div class='world-list'>";
      locked.forEach(function (r) {
        html += recipeCardHtml(r.icon, r.name, "Need " + costStr(r.needs), " locked", "");
      });
      if (pickLocked) {
        html += recipeCardHtml(nextPick.icon, nextPick.name, "Need " + costStr(nextPick.needs), " locked", "");
      }
      html += "</div>";
    }

    html += "<button class='ghost-btn' id='ws-back'>⬅️ BACK</button>";
    openOverlay(html);
    $("ws-back").addEventListener("pointerdown", closeOverlay);
    document.querySelectorAll(".smelt-card[data-kind]").forEach(function (card) {
      card.addEventListener("pointerdown", function () {
        var kind = card.getAttribute("data-kind");
        if (kind === "pick") {
          closeOverlay();
          doCraft();
          return;
        }
        var r = ready[+card.getAttribute("data-i")];
        if (r) doWorkshop(r);
      });
    });
  }

  function doWorkshop(r) {
    if (!canAfford(r.needs)) return;
    if (r.tool) {
      closeOverlay();
      startToolChallenge(r.name, function () {
        takeNeeds(r.needs);
        if (r.gives) giveItems(r.gives);
        Save.data.player.tools[r.tool] = true;
        Save.save();
        GameAudio.sfx.levelup();
        GameAudio.say("You crafted a " + r.name + "!");
        toast(r.icon + " You crafted a " + r.name + "! " + (r.blurb || ""), 3200);
        updateHotbar();
        if (r.tool === "nerf") {
          var idxNerf = hotbarItems().indexOf("nerf");
          if (idxNerf >= 0) selectHotbar(idxNerf);
        }
      });
      return;
    }
    takeNeeds(r.needs);
    if (r.gives) giveItems(r.gives);
    Save.save();
    GameAudio.sfx.smelt();
    toast(r.icon + " Crafted " + r.name + "!", 2200);
    updateHotbar();
    showWorkshop();
  }

  /* ---------------- generic overlay ---------------- */
  function openOverlay(html) {
    Controls.setEnabled(false);
    $("overlay-card").innerHTML = html;
    $("overlay").classList.add("open");
  }
  function closeOverlay() {
    GameAudio.stopListen();
    $("overlay").classList.remove("open");
    if (Game.running) Controls.setEnabled(true);
  }

  // Every 🔊 button must go through here so TTS is warmed in the same
  // tap that requests speech (iPad Safari is picky about that).
  function bindSpeak(id, getText, rate) {
    var el = $(id);
    if (!el) return;
    el.addEventListener("pointerdown", function (e) {
      e.stopPropagation();
      // Do not preventDefault — iPad Safari needs this tap to count
      // as the user gesture that unlocks speechSynthesis.
      GameAudio.warm();
      var text = typeof getText === "function" ? getText() : getText;
      GameAudio.say(text, rate);
    });
  }

  // Younger kids and early readers shouldn't have to decode a whole
  // NPC speech bubble before they can play. Older kids still get 🔊.
  function needsReadAloud() {
    var p = CONFIG.ACTIVE;
    if (!p) return false;
    if (p.readAloud === true) return true;
    if (p.readAloud === false) return false;
    if ((p.age || 99) <= (CONFIG.READ_ALOUD_MAX_AGE || 8)) return true;
    if (p.module === "reading") {
      var tier = Learning.currentTier ? Learning.currentTier() : 0;
      if (tier <= (CONFIG.READ_ALOUD_MAX_READING_TIER != null ? CONFIG.READ_ALOUD_MAX_READING_TIER : 1)) {
        return true;
      }
      var bag = Save.data.stats && Save.data.stats.challenges;
      var read = bag && bag.read;
      if (read && read.tries >= 4 && (read.clean / read.tries) < 0.6) return true;
    }
    return false;
  }

  function stripForSpeech(s) {
    return String(s || "")
      .replace(/<br\s*\/?>/gi, ". ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "and")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Call from the same tap that opened the conversation (iPad TTS).
  function speakDialogue(text, rate) {
    if (!needsReadAloud()) return;
    var spoken = stripForSpeech(text);
    if (!spoken) return;
    GameAudio.warm();
    GameAudio.say(spoken, rate || 0.8);
  }

  function speakBtnLabel() {
    return needsReadAloud() ? "🔊 Hear it again" : "🔊 Help me read it";
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

  function fillWordChoices(ch, onDone, getCorrect, onRight) {
    var mistakes = 0, done = false;
    var correct = getCorrect();
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
          if (onRight) onRight(correct);
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
          GameAudio.warm();
          GameAudio.say(ch.speak || ch.word);
        }
      });
      grid.appendChild(b);
    });
  }

  /* ---------------- challenge: hear & find ---------------- */
  function showPick(ch, onDone, intro) {
    var spoken = ch.speak || ch.word;
    var html =
      "<div class='ch-title'>" + (intro || "🔮 Word Ore!") + "</div>" +
      "<div class='ch-sub'>" + (ch.subtitle || "Tap the word you hear!") + "</div>" +
      "<button type='button' class='speak-btn' id='ch-speak'>🔊</button>" +
      "<div class='word-grid' id='ch-grid'></div>";
    openOverlay(html);
    fillWordChoices(ch, onDone, function () { return ch.answer || ch.word; });
    bindSpeak("ch-speak", spoken);
    // Speak in this same call stack so iPad still treats it as the tap
    // that opened the overlay (a delayed speak is often silent).
    GameAudio.say(spoken);
  }

  /* ---------------- challenge: big picture → tap the word ---------------- */
  function showPicture(ch, onDone, introText) {
    var spoken = ch.speak || ch.word;
    var html =
      "<div class='ch-title'>" + (introText || "What word is this?") + "</div>" +
      "<button type='button' class='picture-hero' id='ch-picture' aria-label='Hear the word'>" +
        (ch.emoji || "❓") + "</button>" +
      "<div class='ch-sub'>" + (ch.subtitle || "Tap the picture or 🔊 to hear it, then tap the word!") + "</div>" +
      "<button type='button' class='speak-btn' id='ch-speak'>🔊</button>" +
      "<div class='word-grid' id='ch-grid'></div>";
    openOverlay(html);
    function hear(e) {
      if (e) e.stopPropagation();
      GameAudio.warm();
      GameAudio.say(spoken);
    }
    $("ch-picture").addEventListener("pointerdown", hear);
    bindSpeak("ch-speak", spoken);
    fillWordChoices(ch, onDone, function () { return ch.answer || ch.word; }, function (word) {
      GameAudio.say(word);
    });
  }

  /* ---------------- challenge: build the word ---------------- */
  function showSpell(ch, onDone, introText) {
    var mistakes = 0, next = 0, missesHere = 0, done = false;
    var spoken = ch.speak || ch.word;
    var html =
      "<div class='ch-title'>" + (introText || "🧰 Locked Chest!") + "</div>" +
      "<div class='ch-sub'>" + (ch.subtitle || ("Build the word" + (ch.emoji ? " for " + ch.emoji : ""))) + "</div>" +
      "<button type='button' class='speak-btn' id='ch-speak'>🔊</button>" +
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

    bindSpeak("ch-speak", spoken);
    GameAudio.say(spoken);
  }

  /* ---------------- challenge: read the sentence ---------------- */
  function showSentence(ch, onDone, introText) {
    var mistakes = 0, done = false;
    var html =
      "<div class='ch-title'>" + (introText || "📜 Secret Message!") + "</div>" +
      "<div class='sentence-text'>" + ch.text + "</div>" +
      "<button type='button' class='speak-btn small' id='ch-speak'>🔊 Help me read it</button>" +
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
    bindSpeak("ch-speak", function () { return ch.speak || ch.text; }, 0.8);
  }

  /* ---------------- challenge: read the word, tap the picture ---------------- */
  function showRead(ch, onDone, introText) {
    var mistakes = 0, done = false;
    var html =
      "<div class='ch-title'>" + (introText || "Read this word") + "</div>" +
      "<div class='read-word' id='ch-read-word'>" + escapeHtml(ch.word.toUpperCase()) + "</div>" +
      "<div class='ch-sub'>" + (ch.subtitle || "Read it yourself, then tap the picture!") + "</div>" +
      "<button type='button' class='speak-btn small' id='ch-speak'>🔊 What do I do?</button>" +
      "<div class='word-grid' id='ch-grid'></div>";
    openOverlay(html);
    var grid = $("ch-grid");
    (ch.pictures || []).forEach(function (pic) {
      var b = document.createElement("button");
      b.className = "word-block emoji-block";
      b.textContent = pic.emoji;
      b.setAttribute("aria-label", "picture choice");
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (done) return;
        if (pic.emoji === ch.answer) {
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
    // Instruction only — never speaks the target word.
    bindSpeak("ch-speak", "Read this word, then tap the picture that matches.");
  }

  /* ---------------- experimental: say the written word aloud ---------------- */
  function showSpeak(ch, onDone, introText) {
    var mistakes = 0, done = false, listening = false;
    var html =
      "<div class='ch-title'>" + (introText || "Say this word") + "</div>" +
      "<div class='read-word'>" + escapeHtml(ch.word.toUpperCase()) + "</div>" +
      "<div class='ch-sub'>" + (ch.subtitle || "Tap the mic and say the word.") + "</div>" +
      "<button type='button' class='speak-btn small' id='ch-mic'>🎤 Tap and say it</button>" +
      "<div class='ch-sub' id='ch-listen-status'></div>" +
      "<button type='button' class='ghost-btn' id='ch-skip-mic'>Skip — mic not working</button>";
    openOverlay(html);
    var status = $("ch-listen-status");
    function finish(result) {
      if (done) return;
      done = true;
      GameAudio.stopListen();
      setTimeout(function () {
        closeOverlay();
        onDone(result);
      }, result.skipped ? 400 : 900);
    }
    function skip(reason) {
      status.textContent = reason || "No worries — we'll try this another time.";
      GameAudio.sfx.pop();
      finish({ correct: true, mistakes: 0, skipped: true });
    }
    $("ch-skip-mic").addEventListener("pointerdown", function (e) {
      e.stopPropagation();
      skip("Skipped. You can keep playing!");
    });
    if (!GameAudio.canListen()) {
      skip("This iPad couldn't start the microphone. Skipping.");
      return;
    }
    $("ch-mic").addEventListener("pointerdown", function (e) {
      e.stopPropagation();
      if (done || listening) return;
      listening = true;
      GameAudio.warm();
      status.textContent = "Listening… say " + "the word!";
      $("ch-mic").textContent = "🎤 Listening…";
      GameAudio.listenFor(ch.word, function (res) {
        listening = false;
        if (done) return;
        if (res.matched) {
          GameAudio.sfx.correct();
          status.textContent = "Got it!";
          celebrate($("overlay-card"));
          finish({ correct: true, mistakes: mistakes });
          return;
        }
        if (res.error === "unavailable" || res.error === "start-failed" ||
            res.error === "not-allowed" || res.error === "service-not-allowed") {
          skip("Couldn't use the mic here. Skipping — not a miss.");
          return;
        }
        if (res.error === "ended" && !res.heard) {
          $("ch-mic").textContent = "🎤 Tap and say it";
          status.textContent = "Didn't catch that. Tap the mic and try again.";
          return;
        }
        mistakes++;
        GameAudio.sfx.wrong();
        $("ch-mic").textContent = "🎤 Try again";
        status.textContent = res.heard
          ? "Heard something else. Tap the mic and say it again!"
          : "Didn't catch that. Tap the mic and try once more.";
        if (mistakes >= 2) {
          status.textContent = "Nice try! Let's keep playing.";
          finish({ correct: false, mistakes: mistakes });
        }
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function showChallenge(kind, onDone, intro) {
    var ch = Learning.getChallenge(kind);
    if (!ch) { onDone({ correct: true, mistakes: 0 }); return; }
    var wrapped = function (result) {
      if (!result.skipped) Learning.reportResult(ch, result);
      onDone(result);
    };
    presentChallenge(ch, wrapped, intro);
  }

  function presentChallenge(ch, onDone, intro) {
    if (!ch) { onDone({ correct: true, mistakes: 0 }); return; }
    if (ch.kind === "spell") showSpell(ch, onDone, intro);
    else if (ch.kind === "sentence") showSentence(ch, onDone, intro);
    else if (ch.kind === "picture") showPicture(ch, onDone, intro);
    else if (ch.kind === "read") showRead(ch, onDone, intro);
    else if (ch.kind === "speak") showSpeak(ch, onDone, intro);
    else showPick(ch, onDone, intro);
  }

  /* ---------------- Daddy: super challenges & legendary tools ---------------- */
  var TOOLS = [
    { key: "drill", name: "VOIDBREAKER DRILL", icon: "🌀", wins: 3,
      desc: "It can smash BEDROCK! Dig below the world into the DEEP DARK, where amethyst and mythril hide!" },
    { key: "wings", name: "PILOT WINGS", icon: "✈️", wins: 5, world: "airport",
      desc: "Cleared to fly! Daddy unlocked SKY HARBOR — a real airport with a runway, control tower, hangar, and airplanes. Pause and tap TRAVEL to go anytime, or talk to Daddy for a ride!" },
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
      "<div class='ch-title big'>" + (tool.world ? "YOU'RE CLEARED TO FLY!" : "LEGENDARY TOOL!") + "</div>" +
      "<div class='rank-name'>" + tool.icon + " " + tool.name + "</div>" +
      "<div class='unlock-list'><div class='unlock-item'>" + tool.desc + "</div></div>" +
      "<button class='big-btn' id='tool-ok'>" + (tool.world ? "✈️ LET'S FLY!" : "WHOA!") + "</button>";
    openOverlay(html);
    GameAudio.sfx.levelup();
    GameAudio.say("You earned the " + tool.name + "! " + tool.desc);
    celebrate($("overlay-card"));
    $("tool-ok").addEventListener("pointerdown", function () {
      closeOverlay();
      updateHotbar();
      if (tool.world) Game.travelTo(tool.world);
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
    if (tool && tool.key === "wings") {
      greetings = [
        "I used to fly airplanes! A few more quizzes and I'll take you to my airport!",
        "Runway's waiting. Beat this challenge and you're one step closer to Sky Harbor!",
        "Pilots earn their wings. Super challenges first, then we FLY!"
      ];
    } else if (Save.data.player.tools.wings) {
      greetings = [
        "Sky Harbor is yours! Pause and tap TRAVEL — or hop a ride with me!",
        "Want to go flying? I've got a plane parked at the airport!",
        "My leg's still in this boot, but I can still taxi you to Sky Harbor!"
      ];
    }
    var progress = tool
      ? (tool.key === "wings"
        ? "Win " + (tool.wins - d.wins) + " more and I'll give you PILOT WINGS! ✈️"
        : "Win " + (tool.wins - d.wins) + " more and I'll give you a MYSTERY TOOL! 🎁")
      : "You have all my tools! But I still have gems... 💎";
    var greeting = greetings[Math.floor(Math.random() * greetings.length)];
    var spoken = greeting + " Ready for a SUPER CHALLENGE, " + CONFIG.PLAYER_NAME + "? " + progress;
    var canFly = Save.data.player.tools.wings && Save.data.player.world !== "airport";
    var html =
      "<div class='npc-head daddy' style='--hair:" + CONFIG.DADDY.hair + "'></div>" +
      "<div class='ch-title'>Daddy</div>" +
      "<div class='sentence-text'>" + greeting +
      " Ready for a SUPER CHALLENGE, " + CONFIG.PLAYER_NAME + "?<br><br>" + progress + "</div>" +
      "<button type='button' class='speak-btn small' id='dlg-speak'>" + speakBtnLabel() + "</button>" +
      "<button class='big-btn' id='dad-go'>🔥 SUPER CHALLENGE!</button>" +
      (canFly ? "<button class='big-btn' id='dad-fly'>✈️ FLY TO SKY HARBOR</button>" : "") +
      "<button class='ghost-btn' id='dad-later'>Maybe later</button>";
    openOverlay(html);
    GameAudio.sfx.quest();
    bindSpeak("dlg-speak", spoken, 0.8);
    speakDialogue(spoken);
    $("dad-later").addEventListener("pointerdown", closeOverlay);
    $("dad-go").addEventListener("pointerdown", function () {
      var kind = Math.random() < 0.5 ? "spell" : "pick";
      var ch = Learning.getChallenge(kind, { boost: 1 });
      presentChallenge(ch, function (result) {
        if (!result.skipped) Learning.reportResult(ch, result);
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
            ? (t.key === "wings"
              ? "🔥 Super win! " + (t.wins - d.wins) + " more for Pilot Wings!"
              : "🔥 Super win! " + (t.wins - d.wins) + " more for Daddy's mystery tool!")
            : "🔥 Super win! +3 gems, +25 XP!", 3000);
        } else {
          UI.toast("💪 You got it! Perfect wins count toward Daddy's mystery tool!", 3000);
        }
      }, "🔥 DADDY'S SUPER CHALLENGE!");
    });
    var flyBtn = $("dad-fly");
    if (flyBtn) flyBtn.addEventListener("pointerdown", function () {
      closeOverlay();
      Game.travelTo("airport");
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
    var greeting = greetings[Math.floor(Math.random() * greetings.length)];
    var spoken = greeting + " Ready, " + CONFIG.PLAYER_NAME + "? " + progress;
    var html =
      "<div class='npc-head mommy' style='--hair:" + CONFIG.MOMMY.hair + "'><span class='tea-cup'>☕</span></div>" +
      "<div class='ch-title'>Mommy ☕</div>" +
      "<div class='sentence-text'>" + greeting +
      " Ready, " + CONFIG.PLAYER_NAME + "?<br><br>" + progress + "</div>" +
      "<button type='button' class='speak-btn small' id='dlg-speak'>" + speakBtnLabel() + "</button>" +
      "<button class='big-btn' id='mom-go'>☕ SUPER CHALLENGE!</button>" +
      "<button class='ghost-btn' id='mom-later'>Maybe later</button>";
    openOverlay(html);
    GameAudio.sfx.quest();
    bindSpeak("dlg-speak", spoken, 0.8);
    speakDialogue(spoken);
    $("mom-later").addEventListener("pointerdown", closeOverlay);
    $("mom-go").addEventListener("pointerdown", function () {
      var kind = Math.random() < 0.5 ? "spell" : "pick";
      var ch = Learning.getChallenge(kind, { boost: 1 });
      presentChallenge(ch, function (result) {
        if (!result.skipped) Learning.reportResult(ch, result);
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
      var doneLine = "You did it! Thank you, " + CONFIG.PLAYER_NAME + "!";
      var doneHtml =
        "<div class='npc-head' style='--hair:" + npc.def.hair + ";--shirt:" + npc.def.shirt + "'></div>" +
        "<div class='ch-title'>" + name + "</div>" +
        "<div class='sentence-text'>" + doneLine + " 🎉</div>" +
        "<button type='button' class='speak-btn small' id='dlg-speak'>" + speakBtnLabel() + "</button>" +
        "<button class='big-btn' id='dlg-done'>💎 GET REWARD</button>";
      openOverlay(doneHtml);
      GameAudio.sfx.quest();
      bindSpeak("dlg-speak", doneLine, 0.8);
      GameAudio.say(doneLine);
      $("dlg-done").addEventListener("pointerdown", function () {
        Quests.finish();
        celebrate($("overlay-card"));
        setTimeout(closeOverlay, 700);
      });
      return;
    }

    if (q) {
      // remind about the active quest
      var remindLine = q.sister === name ? q.text : "Go help " + q.sister + " first!";
      var remindHtml =
        "<div class='npc-head' style='--hair:" + npc.def.hair + ";--shirt:" + npc.def.shirt + "'></div>" +
        "<div class='ch-title'>" + name + "</div>" +
        "<div class='sentence-text'>" + remindLine + (q.sister === name ? "" : " " + q.icon) + "</div>" +
        "<button type='button' class='speak-btn small' id='dlg-speak'>" + speakBtnLabel() + "</button>" +
        "<button class='big-btn' id='dlg-ok'>OK!</button>";
      openOverlay(remindHtml);
      bindSpeak("dlg-speak", remindLine, 0.8);
      speakDialogue(remindLine);
      $("dlg-ok").addEventListener("pointerdown", closeOverlay);
      return;
    }

    // offer a new quest — younger kids hear it read aloud; they still
    // tap the picture so we're checking that they understood.
    var quest = Quests.pickQuest();
    var choices = [quest.icon].concat(quest.decoys).sort(function () { return Math.random() - 0.5; });
    var spoken = "Hi " + CONFIG.PLAYER_NAME + "! " + quest.text;
    var html =
      "<div class='npc-head' style='--hair:" + npc.def.hair + ";--shirt:" + npc.def.shirt + "'></div>" +
      "<div class='ch-title'>" + name + "</div>" +
      "<div class='sentence-text'>" + spoken + "</div>" +
      "<button type='button' class='speak-btn small' id='dlg-speak'>" + speakBtnLabel() + "</button>" +
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
    bindSpeak("dlg-speak", spoken, 0.8);
    speakDialogue(spoken);
    $("dlg-later").addEventListener("pointerdown", closeOverlay);
  }

  /* ---------------- level up ---------------- */
  function showLevelUp(newLevel) {
    var unlocks = [];
    WORLD_DEFS.forEach(function (w) {
      if (!w.needTool && w.level === newLevel) unlocks.push(w.emoji + " NEW WORLD: " + w.name + "!");
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

  function worldLocked(w) {
    if (w.needTool) return !Save.data.player.tools[w.needTool];
    return Save.data.player.level < w.level;
  }
  function worldLockHint(w) {
    if (w.needTool === "wings") return "Earn Pilot Wings from Daddy";
    if (w.needTool) return "A special unlock";
    return "Level " + w.level;
  }

  function showWorlds() {
    var html = "<div class='ch-title'>🌍 WORLDS</div><div class='world-list'>";
    WORLD_DEFS.forEach(function (w) {
      var locked = worldLocked(w);
      html += "<button class='world-card" + (locked ? " locked" : "") +
        (Save.data.player.world === w.id ? " current" : "") + "' data-world='" + w.id + "'>" +
        "<span class='world-emoji'>" + (locked ? "🔒" : w.emoji) + "</span>" +
        "<span class='world-name'>" + w.name + "</span>" +
        "<span class='world-req'>" + (locked ? worldLockHint(w) : (Save.data.player.world === w.id ? "You are here!" : "Tap to travel")) + "</span>" +
        "</button>";
    });
    html += "</div><button class='ghost-btn' id='wl-back'>⬅️ BACK</button>";
    openOverlay(html);
    document.querySelectorAll(".world-card").forEach(function (card) {
      card.addEventListener("pointerdown", function () {
        var id = card.getAttribute("data-world");
        var def = WORLD_DEFS.find(function (w) { return w.id === id; });
        if (worldLocked(def)) {
          GameAudio.sfx.wrong();
          toast("🔒 " + worldLockHint(def) + " to unlock " + def.name + "!");
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
    document.addEventListener("pointerdown", function () { GameAudio.warm(); }, true);
    $("btn-pause").addEventListener("pointerdown", function (e) { e.stopPropagation(); showPause(); });
    $("btn-bag").addEventListener("pointerdown", function (e) { e.stopPropagation(); showInventory(); });
    $("btn-mode").addEventListener("pointerdown", function (e) { e.stopPropagation(); Game.toggleMode(); });
    $("btn-craft").addEventListener("pointerdown", function (e) { e.stopPropagation(); showWorkshop(); });
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
    selectHotbar: selectHotbar, selectedItem: selectedItem, holsterNerf: holsterNerf,
    showChallenge: showChallenge, presentChallenge: presentChallenge, showDialogue: showDialogue,
    showInventory: showInventory, toggleInventory: toggleInventory,
    showLevelUp: showLevelUp, showPause: showPause, showHome: showHome, hideHome: hideHome,
    rankFor: rankFor, xpNeeded: xpNeeded, nextCraftInfo: nextCraftInfo, showWorkshop: showWorkshop,
    closeOverlay: closeOverlay, needsReadAloud: needsReadAloud
  };
})();
