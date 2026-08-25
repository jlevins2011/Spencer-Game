"use strict";
/* ============================================================
   NPCs — Olivia and Penelope, blocky Minecraft-style helper
   characters who hang out near spawn in every world and give
   little reading quests.
   ============================================================ */
var NPCs = (function () {
  var npcs = [];       // { def, group, hitbox, home:{x,z}, target:{x,z}, ... }
  var scene = null;

  function makeFaceTexture(hair) {
    var c = document.createElement("canvas");
    c.width = c.height = 16;
    var g = c.getContext("2d");
    g.fillStyle = "#f2c9a0"; g.fillRect(0, 0, 16, 16);          // skin
    g.fillStyle = hair; g.fillRect(0, 0, 16, 4);                // bangs
    g.fillRect(0, 4, 2, 4); g.fillRect(14, 4, 2, 4);
    g.fillStyle = "#ffffff"; g.fillRect(3, 7, 4, 3); g.fillRect(9, 7, 4, 3);
    g.fillStyle = "#3a66c9"; g.fillRect(4, 8, 2, 2); g.fillRect(10, 8, 2, 2);
    g.fillStyle = "#d98a7a"; g.fillRect(6, 12, 4, 2);           // smile
    var t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    return t;
  }

  function makeNameSprite(name) {
    var c = document.createElement("canvas");
    c.width = 256; c.height = 64;
    var g = c.getContext("2d");
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = "#ffffff";
    g.font = "bold 34px monospace";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(name, 128, 34);
    var t = new THREE.CanvasTexture(c);
    var mat = new THREE.SpriteMaterial({ map: t, depthTest: false });
    var s = new THREE.Sprite(mat);
    s.scale.set(1.6, 0.4, 1);
    return s;
  }

  function buildModel(def) {
    var group = new THREE.Group();
    var skin = new THREE.MeshLambertMaterial({ color: 0xf2c9a0 });
    var shirt = new THREE.MeshLambertMaterial({ color: def.shirt });
    var pants = new THREE.MeshLambertMaterial({ color: 0x3a4a6b });
    var hair = new THREE.MeshLambertMaterial({ color: def.hair });
    var face = new THREE.MeshLambertMaterial({ map: makeFaceTexture(def.hair) });

    function box(w, h, d, mats, x, y, z) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
      m.position.set(x, y, z);
      group.add(m);
      return m;
    }
    // legs, body, arms
    box(0.22, 0.55, 0.22, pants, -0.14, 0.275, 0);
    box(0.22, 0.55, 0.22, pants,  0.14, 0.275, 0);
    box(0.5, 0.6, 0.28, shirt, 0, 0.85, 0);
    box(0.16, 0.55, 0.16, skin, -0.34, 0.85, 0);
    box(0.16, 0.55, 0.16, skin,  0.34, 0.85, 0);
    // head: face on +Z
    var headMats = [hair, hair, hair, hair, face, hair];
    box(0.45, 0.45, 0.45, headMats, 0, 1.4, 0);
    // hair on top
    box(0.49, 0.12, 0.49, hair, 0, 1.66, 0);
    // long hair in back (girls only)
    if (!def.boy) box(0.45, 0.5, 0.1, hair, 0, 1.3, -0.24);

    var label = makeNameSprite(def.name);
    label.position.set(0, 2.05, 0);
    group.add(label);

    // invisible tap hitbox
    var hit = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 2.1, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(0, 1.0, 0);
    group.add(hit);

    return { group: group, hitbox: hit };
  }

  function init(sc) { scene = sc; }

  function placeAll(spawnX, spawnZ) {
    npcs.forEach(function (n) { scene.remove(n.group); });
    npcs = [];
    CONFIG.ACTIVE.helpers.forEach(function (def, i) {
      var model = buildModel(def);
      var hx = spawnX + (i === 0 ? 4 : -4);
      var hz = spawnZ + (i === 0 ? 3 : 4);
      var n = {
        def: def, group: model.group, hitbox: model.hitbox,
        home: { x: hx, z: hz }, target: null, moveT: 0, faceYaw: 0
      };
      model.hitbox.userData.npc = n;
      positionOnGround(n, hx, hz);
      scene.add(model.group);
      npcs.push(n);
    });
  }

  function positionOnGround(n, x, z) {
    var y = World.surfaceY(Math.floor(x), Math.floor(z)) + 1;
    n.group.position.set(x, y, z);
  }

  function update(dt, playerPos) {
    var t = performance.now() / 1000;
    npcs.forEach(function (n, i) {
      var g = n.group;
      var d = playerPos.distanceTo(g.position);
      if (d < 6) {
        // face the player
        var dx = playerPos.x - g.position.x, dz = playerPos.z - g.position.z;
        n.faceYaw = Math.atan2(dx, dz);
      } else {
        // occasional slow wander near home
        n.moveT -= dt;
        if (n.moveT <= 0) {
          n.moveT = 4 + Math.random() * 5;
          n.target = {
            x: n.home.x + (Math.random() * 6 - 3),
            z: n.home.z + (Math.random() * 6 - 3)
          };
        }
        if (n.target) {
          var tx = n.target.x - g.position.x, tz = n.target.z - g.position.z;
          var dist = Math.hypot(tx, tz);
          if (dist > 0.3) {
            var step = Math.min(dist, dt * 1.1);
            var nx = g.position.x + (tx / dist) * step;
            var nz = g.position.z + (tz / dist) * step;
            positionOnGround(n, nx, nz);
            n.faceYaw = Math.atan2(tx, tz);
          }
        }
      }
      g.rotation.y += (n.faceYaw - g.rotation.y) * Math.min(1, dt * 6);
      g.position.y += Math.sin(t * 2 + i * 2) * 0.0015;  // breathe
    });
  }

  function hitboxes() { return npcs.map(function (n) { return n.hitbox; }); }

  return { init: init, placeAll: placeAll, update: update, hitboxes: hitboxes };
})();


/* ============================================================
   QUESTS — reading quests handed out by the sisters.
   Flow: talk -> read the request (comprehension check) ->
   collect the items -> return for the reward.
   ============================================================ */
var Quests = (function () {
  function active() { return Save.data.quests.active; }

  function pickQuest() {
    var tier = Learning.currentTier();
    var pool = CURRICULUM.QUESTS.filter(function (q) { return q.tier <= tier; });
    var current = pool.filter(function (q) { return q.tier === tier; });
    var from = (current.length && Math.random() < 0.7) ? current : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  function start(sisterName, quest) {
    Save.data.quests.active = {
      sister: sisterName, text: quest.text, ask: quest.ask,
      count: quest.count, icon: quest.icon, tier: quest.tier
    };
    Save.save();
    UI.updateQuestHud();
  }

  function isComplete() {
    var q = active();
    if (!q) return false;
    return (Save.data.player.inventory[q.ask] || 0) >= q.count;
  }

  function finish() {
    var q = active();
    if (!q) return;
    Save.data.player.inventory[q.ask] -= q.count;
    Save.data.quests.active = null;
    Save.data.quests.completed += 1;
    Stats.recordQuest();
    Game.grantGems(3);
    Game.grantXP(25);
    Save.save();
    UI.updateQuestHud();
    UI.updateHotbar();
  }

  return { active: active, pickQuest: pickQuest, start: start, isComplete: isComplete, finish: finish };
})();
