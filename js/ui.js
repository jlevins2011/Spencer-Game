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
    "Netherite Legend", "Ender Master"];

  function rankFor(level) { return RANKS[Math.min(level - 1, RANKS.length - 1)]; }
  function xpNeeded(level) { return 60 + (level - 1) * 20; }

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
    var mistakes = 0;
    var html =
      "<div class='ch-title'>" + (intro || "🔮 Word Ore!") + "</div>" +
      "<div class='ch-sub'>Tap the word you hear!</div>" +
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
        if (word === ch.word) {
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
          setTimeout(function () { GameAudio.say(ch.word); }, 450);
        }
      });
      grid.appendChild(b);
    });
    $("ch-speak").addEventListener("pointerdown", function (e) {
      e.stopPropagation(); GameAudio.say(ch.word);
    });
    setTimeout(function () { GameAudio.say(ch.word); }, 400);
  }

  /* ---------------- challenge: build the word ---------------- */
  function showSpell(ch, onDone, introText) {
    var mistakes = 0, next = 0, missesHere = 0;
    var html =
      "<div class='ch-title'>" + (introText || "🧰 Locked Chest!") + "</div>" +
      "<div class='ch-sub'>Build the word" + (ch.emoji ? " for " + ch.emoji : "") + "</div>" +
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
        if (b.classList.contains("used")) return;
        if (letter === ch.word[next]) {
          GameAudio.sfx.pop();
          GameAudio.sayLetter(letter);
          b.classList.add("used");
          slots.children[next].textContent = letter.toUpperCase();
          slots.children[next].classList.add("filled");
          next++;
          missesHere = 0;
          if (next >= ch.word.length) {
            GameAudio.sfx.correct();
            setTimeout(function () { GameAudio.say(ch.word + "! Great job!"); }, 250);
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
      e.stopPropagation(); GameAudio.say(ch.word);
    });
    setTimeout(function () { GameAudio.say(ch.word); }, 400);
  }

  /* ---------------- challenge: read the sentence ---------------- */
  function showSentence(ch, onDone, introText) {
    var mistakes = 0;
    var html =
      "<div class='ch-title'>" + (introText || "📜 Secret Message!") + "</div>" +
      "<div class='sentence-text'>" + ch.text + "</div>" +
      "<button class='speak-btn small' id='ch-speak'>🔊 Help me read it</button>" +
      "<div class='ch-sub'>Tap the picture that matches!</div>" +
      "<div class='word-grid' id='ch-grid'></div>";
    openOverlay(html);
    var grid = $("ch-grid");
    ch.choices.forEach(function (emoji) {
      var b = document.createElement("button");
      b.className = "word-block emoji-block";
      b.textContent = emoji;
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (emoji === ch.answer) {
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
      e.stopPropagation(); GameAudio.say(ch.text, 0.8);
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

  /* ---------------- sister dialogue ---------------- */
  function showDialogue(npc) {
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
    var mistakes = 0;
    var grid = $("dlg-grid");
    choices.forEach(function (icon) {
      var b = document.createElement("button");
      b.className = "word-block emoji-block";
      b.textContent = icon;
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (icon === quest.icon) {
          GameAudio.sfx.correct();
          Stats.recordChallenge({ moduleId: "reading", kind: "sentence", skill: "sentences", word: "" }, { correct: true, mistakes: mistakes });
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
      Reports.send(function (ok) {
        sendBtn.textContent = ok ? "✅ SENT!" : "❌ FAILED — check endpoint";
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
  }
  function hideHome() {
    $("home").style.display = "none";
    $("hud").style.display = "block";
  }

  function init() {
    document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    $("btn-play").addEventListener("pointerdown", function () {
      GameAudio.unlock();
      GameAudio.say("Welcome to Spencer craft!");
      Game.start();
    });
    $("btn-pause").addEventListener("pointerdown", function (e) { e.stopPropagation(); showPause(); });
    $("btn-mode").addEventListener("pointerdown", function (e) { e.stopPropagation(); Game.toggleMode(); });
    $("btn-craft").addEventListener("pointerdown", function (e) { e.stopPropagation(); doCraft(); });
    var jb = $("btn-jump");
    jb.addEventListener("pointerdown", function (e) { e.stopPropagation(); Player.jump = true; });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
      jb.addEventListener(ev, function () { Player.jump = false; });
    });
    holdToOpen($("btn-home-parent"), showParent);
  }

  return {
    init: init, toast: toast, updateHud: updateHud, updateHotbar: updateHotbar,
    updateQuestHud: updateQuestHud, updateModeButton: updateModeButton,
    selectHotbar: selectHotbar, selectedItem: selectedItem,
    showChallenge: showChallenge, showDialogue: showDialogue,
    showLevelUp: showLevelUp, showPause: showPause, showHome: showHome, hideHome: hideHome,
    rankFor: rankFor, xpNeeded: xpNeeded, nextCraftInfo: nextCraftInfo,
    closeOverlay: closeOverlay
  };
})();
