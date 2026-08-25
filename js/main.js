"use strict";
/* ============================================================
   GAME — three.js setup, the main loop, and interaction rules:
   what happens when Spencer taps a block, an ore, a chest, or
   one of his sisters.
   ============================================================ */
var Game = (function () {
  var scene, camera, renderer;
  var sun, ambient, hemi;
  var clouds = [];
  var running = false;
  var mode = "mine";            // "mine" | "build"
  var selectedItem = null;
  var highlightBox = null;
  var mining = null;            // { x,y,z, until, total }
  var npcRaycaster = new THREE.Raycaster();

  /* ---------------- setup ---------------- */
  function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 300);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("game-canvas"), antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    ambient = new THREE.AmbientLight(0xffffff, 0.45);
    hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a6a4a, 0.35);
    sun = new THREE.DirectionalLight(0xfff2cc, 0.85);
    sun.position.set(60, 100, 40);
    scene.add(ambient, hemi, sun);

    // block highlight outline
    var hlGeo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    var hlEdges = new THREE.EdgesGeometry(hlGeo);
    highlightBox = new THREE.LineSegments(hlEdges,
      new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 }));
    highlightBox.visible = false;
    scene.add(highlightBox);

    // clouds
    var cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (var i = 0; i < 10; i++) {
      var w = 6 + Math.random() * 10, d = 4 + Math.random() * 6;
      var cloud = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), cloudMat);
      cloud.position.set(Math.random() * 128, 46 + Math.random() * 4, Math.random() * 128);
      scene.add(cloud);
      clouds.push(cloud);
    }

    window.__dbg = { scene: scene, camera: camera, renderer: renderer };

    World.init(scene);
    NPCs.init(scene);
    Player.init(camera);
    Controls.init(renderer.domElement);

    window.addEventListener("resize", function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    requestAnimationFrame(loop);
  }

  /* ---------------- world travel / start ---------------- */
  function travelTo(worldId) {
    Save.data.player.world = worldId;
    Save.save();
    var def = World.loadWorld(worldId);
    scene.background = new THREE.Color(def.sky);
    scene.fog = new THREE.Fog(def.fog, 70, 260);
    var sx = Math.floor(World.SX / 2), sz = Math.floor(World.SZ / 2);
    Player.spawnAt(sx, sz);
    NPCs.placeAll(sx, sz);
    UI.toast(def.emoji + " Welcome to " + def.name + "!");
    GameAudio.say("Welcome to " + def.name + "!");
  }

  function start() {
    UI.hideHome();
    running = true;
    Game.running = true;
    travelTo(Save.data.player.world || "meadow");
    Controls.setEnabled(true);
    UI.updateHud();
    UI.updateHotbar();
    UI.updateQuestHud();
    UI.updateModeButton();
    Reports.maybeAutoSend();
  }

  /* ---------------- rewards / leveling ---------------- */
  function grantXP(amount) {
    var p = Save.data.player;
    p.xp += amount;
    var need = UI.xpNeeded(p.level);
    if (p.xp >= need) {
      p.xp -= need;
      p.level += 1;
      Save.save();
      UI.showLevelUp(p.level);
    }
    Save.save();
    UI.updateHud();
  }

  function grantGems(n) {
    Save.data.player.gems += n;
    Stats.recordGems(n);
    Save.save();
    GameAudio.sfx.gem();
    UI.updateHud();
  }

  function grantItem(item, count) {
    var inv = Save.data.player.inventory;
    inv[item] = (inv[item] || 0) + count;
    Save.save();
    UI.updateHotbar();
    UI.updateQuestHud();
  }

  /* ---------------- interaction ---------------- */
  var PICK_SPEED = [1, 1.5, 2.1, 3.0];   // wood, stone, iron, diamond

  function interact() {
    if (!running || mining) return;

    var hit = Player.raycastBlock(6);

    // sisters take priority unless a block is clearly in front of them
    npcRaycaster.setFromCamera({ x: 0, y: 0 }, camera);
    npcRaycaster.far = 5;
    var npcHits = npcRaycaster.intersectObjects(NPCs.hitboxes(), false);
    if (npcHits.length && (!hit || npcHits[0].distance < hit.distance + 0.4)) {
      UI.showDialogue(npcHits[0].object.userData.npc);
      return;
    }

    if (!hit) return;

    if (mode === "build") { tryPlace(hit); return; }

    var b = World.getBlock(hit.block.x, hit.block.y, hit.block.z);
    if (b === B.AIR) return;
    var def = BLOCKS[b];

    if (def.special === "wordore") {
      UI.showChallenge("pick", function (result) {
        if (result.correct) {
          World.setBlock(hit.block.x, hit.block.y, hit.block.z, B.AIR);
          grantGems(2);
          grantXP(12);
          GameAudio.sfx.mine();
          var bonus = ["stone", "wood", "dirt"][Math.floor(Math.random() * 3)];
          grantItem(bonus, 2);
          UI.toast("💎 +2 gems!  🎒 +2 " + bonus);
        }
      });
      return;
    }

    if (def.special === "chest") {
      UI.showChallenge("spell", function (result) {
        if (result.correct) {
          World.setBlock(hit.block.x, hit.block.y, hit.block.z, B.AIR);
          grantGems(3);
          grantXP(15);
          var loot = [["planks", 4], ["brick", 4], ["glowstone", 2], ["wood", 3]][Math.floor(Math.random() * 4)];
          grantItem(loot[0], loot[1]);
          UI.toast("🧰 Treasure! +3 gems and " + loot[1] + " " + loot[0] + "!");
        }
      });
      return;
    }

    // regular mining
    if (def.hard < 0) { UI.toast("That block is too strong to mine... maybe forever!"); return; }
    var p = Save.data.player;
    if (def.needTool && !p.tools[def.needTool]) {
      GameAudio.sfx.wrong();
      UI.toast("🌀 Only a legendary tool can break " + def.name + "! Daddy's SUPER CHALLENGES might earn you one...", 3500);
      return;
    }
    if (def.needPick > p.pickTier) {
      GameAudio.sfx.wrong();
      UI.toast("⛏️ You need a better pickaxe for " + def.name + "!");
      return;
    }
    var speed = PICK_SPEED[p.pickTier] * (p.tools.thunder ? 2 : 1);
    var ms = Math.max(120, def.hard / speed);
    mining = {
      x: hit.block.x, y: hit.block.y, z: hit.block.z,
      until: performance.now() + ms, total: ms, def: def
    };
    GameAudio.sfx.mine();
  }

  function finishMining() {
    var m = mining;
    mining = null;
    document.getElementById("mine-progress").style.display = "none";
    var current = World.getBlock(m.x, m.y, m.z);
    if (current === B.AIR) return;
    World.setBlock(m.x, m.y, m.z, B.AIR);
    GameAudio.sfx.mine();
    Stats.recordMine();
    if (m.def.drop) {
      grantItem(m.def.drop, 1);
      grantXP(1);
      if (m.def.drop === "amethyst") { grantGems(1); UI.toast("🟣 Amethyst! +1 gem"); }
      if (m.def.drop === "mythril") { grantGems(2); grantXP(5); UI.toast("🌀 MYTHRIL! Super rare! +2 gems"); }
    }
    if (m.def.id === B.BEDROCK) {
      UI.toast("🌀 You broke through the bedrock! The DEEP DARK awaits below...", 3500);
    }
    // occasionally the helpers cheer them on
    if (Math.random() < 0.02) {
      var helpers = CONFIG.ACTIVE.helpers;
      var h = helpers[Math.floor(Math.random() * helpers.length)];
      UI.toast((h.boy ? "👦 " : "👧 ") + h.name + ": Nice mining, " + CONFIG.PLAYER_NAME + "!");
    }
  }

  function tryPlace(hit) {
    var item = selectedItem || UI.selectedItem();
    if (!item) { UI.toast("Pick a block from your bag first!"); setMode("mine"); return; }
    var inv = Save.data.player.inventory;
    if (!inv[item] || inv[item] <= 0) { UI.toast("No more " + item + "! Mine some more."); UI.updateHotbar(); return; }
    var t = hit.place;
    if (t.y <= World.MIN_Y || t.y >= World.SY) return;
    if (World.getBlock(t.x, t.y, t.z) !== B.AIR) return;
    if (Player.wouldIntersectPlayer(t.x, t.y, t.z)) return;
    var blockId = ITEM_TO_BLOCK[item];
    if (blockId === undefined) return;
    World.setBlock(t.x, t.y, t.z, blockId);
    inv[item] -= 1;
    Save.save();
    Stats.recordPlace();
    GameAudio.sfx.place();
    UI.updateHotbar();
  }

  /* ---------------- Maggie's heists ---------------- */
  var lastSteal = 0;
  var STEAL_COOLDOWN = 120000;                 // at most one heist per 2 min
  var STEALABLE = ["dirt", "leaves", "sand", "flower", "mushroom", "stone", "planks", "wood"];

  function maggieSteal() {
    if (!running) return;
    var now = Date.now();
    if (now - lastSteal < STEAL_COOLDOWN) return;
    lastSteal = now;

    // wait for the challenge overlay to close, then the heist happens
    setTimeout(function () {
      var inv = Save.data.player.inventory;
      var item = null;
      for (var i = 0; i < STEALABLE.length; i++) {
        if (inv[STEALABLE[i]] > 0) { item = STEALABLE[i]; break; }
      }
      // Maggie darts in front of the player...
      var p = Player.position, yaw = Player.yaw;
      var n = NPCs.positionDogNear(p.x - Math.sin(yaw) * 2.5, p.z - Math.cos(yaw) * 2.5);
      if (n) {
        // ...then bolts with the loot
        n.target = {
          x: Math.max(3, Math.min(125, p.x + (Math.random() * 40 - 20))),
          z: Math.max(3, Math.min(125, p.z + (Math.random() * 40 - 20)))
        };
        n.moveT = 12;
        n.speed = 4.5;                         // zoomies!
        setTimeout(function () { n.speed = 1.8; }, 6000);
      }
      GameAudio.sfx.bark();
      if (item) {
        inv[item] -= 1;
        Save.save();
        UI.updateHotbar();
        UI.updateQuestHud();
        UI.toast("🐶 MAGGIE!! She snatched 1 " + item + " and zoomed away! Sneaky beagle!", 3800);
      } else {
        UI.toast("🐶 Maggie zoomed by barking! Good thing your pockets were empty!", 3200);
      }
    }, 1600);
  }

  function setMode(m) {
    mode = m;
    Game.mode = m;
    UI.updateModeButton();
    UI.toast(m === "build" ? "🧱 Build mode — tap to place blocks!" : "⛏️ Mine mode — tap blocks to dig!", 1500);
  }
  function toggleMode() { setMode(mode === "mine" ? "build" : "mine"); }

  /* ---------------- day/night ---------------- */
  var skyDay = new THREE.Color(), skyCur = new THREE.Color();
  function updateDayNight() {
    // 10-minute gentle cycle; never gets fully dark (no scary nights)
    var t = (Date.now() % 600000) / 600000;               // 0..1
    var daylight = 0.62 + 0.38 * Math.max(0.25, Math.sin(t * Math.PI * 2) * 0.5 + 0.5);
    sun.intensity = 0.9 * daylight;
    ambient.intensity = 0.35 + 0.25 * daylight;
    var ang = t * Math.PI * 2;
    sun.position.set(Math.cos(ang) * 80, Math.abs(Math.sin(ang)) * 90 + 25, 40);
    skyDay.setHex(World.def.sky);
    skyCur.copy(skyDay).multiplyScalar(0.45 + 0.55 * daylight);
    if (scene.background) scene.background.copy(skyCur);
  }

  /* ---------------- main loop ---------------- */
  var lastT = performance.now();
  var statTimer = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = (now - lastT) / 1000;
    lastT = now;
    if (!running) return;

    Player.update(dt);
    NPCs.update(dt, Player.position);
    updateDayNight();

    clouds.forEach(function (c) {
      c.position.x += dt * 0.6;
      if (c.position.x > 140) c.position.x = -12;
    });

    // block highlight + mining progress
    var hit = Player.raycastBlock(6);
    if (hit && !mining) {
      highlightBox.visible = true;
      highlightBox.position.set(hit.block.x + 0.5, hit.block.y + 0.5, hit.block.z + 0.5);
    } else if (!mining) {
      highlightBox.visible = false;
    }

    if (mining) {
      var left = mining.until - now;
      var bar = document.getElementById("mine-progress");
      bar.style.display = "block";
      document.getElementById("mine-progress-fill").style.width =
        (100 - (left / mining.total) * 100) + "%";
      highlightBox.visible = true;
      highlightBox.position.set(mining.x + 0.5, mining.y + 0.5, mining.z + 0.5);
      var s = 1 + Math.sin(now / 40) * 0.02;
      highlightBox.scale.set(s, s, s);
      if (left <= 0) { highlightBox.scale.set(1, 1, 1); finishMining(); }
    }

    statTimer += dt;
    if (statTimer > 5) { statTimer = 0; Stats.tickPlaytime(); Save.save(); }

    renderer.render(scene, camera);
  }

  return {
    init: init, start: start, interact: interact, travelTo: travelTo,
    grantXP: grantXP, grantGems: grantGems, grantItem: grantItem,
    toggleMode: toggleMode, setMode: setMode, maggieSteal: maggieSteal,
    get mode() { return mode; }, set mode(v) { mode = v; },
    get selectedItem() { return selectedItem; }, set selectedItem(v) { selectedItem = v; },
    running: false
  };
})();

/* ---------------- boot ---------------- */
window.addEventListener("load", function () {
  UI.init();
  Game.init();
  UI.showHome();
  window.addEventListener("visibilitychange", function () {
    if (document.hidden) { Stats.tickPlaytime(); Save.save(); }
  });
});
