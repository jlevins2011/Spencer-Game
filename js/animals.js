"use strict";
/* ============================================================
   ANIMALS — pigs, cows, chickens, and sheep wander every world.
   Tap to bop them (they squeal and flee); a few bops and they
   poof into meat or wool. Foam darts from the Nerf gun only stun
   them — they never lose HP or drop loot that way. They repopulate over time. They never
   fight back (peaceful mode).
   ============================================================ */
var Animals = (function () {
  var scene = null;
  var animals = [];      // { type, group, hitbox, hp, home, target, moveT, faceYaw, speed, fleeUntil }
  var MAX_ANIMALS = 12;
  var respawnTimer = 0;

  var TYPES = {
    pig:     { hp: 2, drops: { meat: 2 },  emoji: "🐷" },
    cow:     { hp: 3, drops: { meat: 3 },  emoji: "🐮" },
    chicken: { hp: 1, drops: { meat: 1 },  emoji: "🐔" },
    sheep:   { hp: 2, drops: { wool: 2 },  emoji: "🐑" }
  };

  function mat(color) { return new THREE.MeshLambertMaterial({ color: color }); }

  function box(group, w, h, d, m, x, y, z) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }

  function buildAnimal(type) {
    var g = new THREE.Group();
    var extra = {};
    if (type === "pig") {
      var pink = mat(0xefa2b0), snout = mat(0xd9808f);
      box(g, 0.4, 0.35, 0.62, pink, 0, 0.38, 0);
      box(g, 0.3, 0.28, 0.24, pink, 0, 0.45, 0.4);
      box(g, 0.14, 0.1, 0.06, snout, 0, 0.42, 0.54);
      [[-0.13, 0.2], [0.13, 0.2], [-0.13, -0.2], [0.13, -0.2]].forEach(function (p) {
        box(g, 0.11, 0.22, 0.11, pink, p[0], 0.11, p[1]);
      });
    } else if (type === "cow") {
      var brown = mat(0x6b4a2a), white = mat(0xf2ede2), horn = mat(0xd9d0c0);
      box(g, 0.46, 0.42, 0.72, brown, 0, 0.5, 0);
      box(g, 0.3, 0.16, 0.3, white, 0, 0.32, 0.1);       // belly patch
      box(g, 0.3, 0.28, 0.26, brown, 0, 0.62, 0.46);
      box(g, 0.16, 0.1, 0.08, white, 0, 0.54, 0.6);      // muzzle
      box(g, 0.06, 0.08, 0.06, horn, -0.14, 0.8, 0.44);
      box(g, 0.06, 0.08, 0.06, horn,  0.14, 0.8, 0.44);
      [[-0.15, 0.24], [0.15, 0.24], [-0.15, -0.24], [0.15, -0.24]].forEach(function (p) {
        box(g, 0.12, 0.3, 0.12, brown, p[0], 0.15, p[1]);
      });
    } else if (type === "chicken") {
      var w2 = mat(0xf7f3e8), beak = mat(0xe8b23a), comb = mat(0xd94a3a);
      box(g, 0.24, 0.26, 0.32, w2, 0, 0.3, 0);
      box(g, 0.16, 0.18, 0.14, w2, 0, 0.5, 0.16);
      box(g, 0.06, 0.05, 0.08, beak, 0, 0.5, 0.27);
      box(g, 0.05, 0.06, 0.08, comb, 0, 0.62, 0.16);
      box(g, 0.05, 0.14, 0.05, beak, -0.06, 0.09, 0);
      box(g, 0.05, 0.14, 0.05, beak,  0.06, 0.09, 0);
    } else { // sheep
      var wool = mat(0xf2eee4), face = mat(0x8a8078);
      var body = box(g, 0.46, 0.4, 0.66, wool, 0, 0.48, 0);
      box(g, 0.2, 0.2, 0.18, face, 0, 0.58, 0.4);
      var cap = box(g, 0.24, 0.16, 0.12, wool, 0, 0.7, 0.36);      // wool cap
      [[-0.14, 0.2], [0.14, 0.2], [-0.14, -0.2], [0.14, -0.2]].forEach(function (p) {
        box(g, 0.1, 0.26, 0.1, face, p[0], 0.13, p[1]);
      });
      var skinny = box(g, 0.32, 0.28, 0.5, face, 0, 0.42, 0);
      skinny.visible = false;
      extra.wool = [body, cap];
      extra.shearedBody = skinny;
    }
    var hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.1, 1.1),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(0, 0.45, 0);
    g.add(hit);
    return { group: g, hitbox: hit, wool: extra.wool, shearedBody: extra.shearedBody };
  }

  function groundY(x, z) { return World.surfaceY(Math.floor(x), Math.floor(z)) + 1; }

  function isDryLand(x, z) {
    var y = World.surfaceY(Math.floor(x), Math.floor(z));
    return World.getBlock(Math.floor(x), y + 1, Math.floor(z)) !== B.WATER &&
           World.getBlock(Math.floor(x), y, Math.floor(z)) !== B.WATER;
  }

  var spawnCounter = 0;
  function spawnOne(nearX, nearZ) {
    var names = Object.keys(TYPES);
    var type = names[spawnCounter++ % names.length];   // even mix of species
    var x, z, tries = 0;
    do {
      x = 20 + Math.random() * 88;
      z = 20 + Math.random() * 88;
      tries++;
    } while (!isDryLand(x, z) && tries < 20);
    if (!isDryLand(x, z)) return;
    var model = buildAnimal(type);
    var a = {
      type: type, def: TYPES[type], group: model.group, hitbox: model.hitbox,
      wool: model.wool, shearedBody: model.shearedBody,
      hp: TYPES[type].hp, home: { x: x, z: z }, target: null, moveT: Math.random() * 3,
      faceYaw: Math.random() * Math.PI * 2, speed: 0.8, fleeUntil: 0
    };
    model.hitbox.userData.animal = a;
    a.group.position.set(x, groundY(x, z), z);
    scene.add(a.group);
    animals.push(a);
  }

  function init(sc) { scene = sc; }

  function populate() {
    animals.forEach(function (a) { scene.remove(a.group); });
    animals = [];
    for (var i = 0; i < MAX_ANIMALS; i++) spawnOne();
  }

  function update(dt, playerPos) {
    respawnTimer += dt;
    if (respawnTimer > 40 && animals.length < MAX_ANIMALS) {
      respawnTimer = 0;
      spawnOne();
    }
    var now = performance.now();
    animals.forEach(function (a) {
      var g = a.group;
      var stunned = a.stunUntil && now < a.stunUntil;
      var wantRoll = stunned ? 1.15 : 0;
      g.rotation.z += (wantRoll - g.rotation.z) * Math.min(1, dt * 6);
      if (stunned) return;
      var fleeing = now < a.fleeUntil;
      a.moveT -= dt;
      if (a.moveT <= 0 && !fleeing) {
        a.moveT = 3 + Math.random() * 5;
        a.target = {
          x: Math.max(3, Math.min(125, a.home.x + (Math.random() * 10 - 5))),
          z: Math.max(3, Math.min(125, a.home.z + (Math.random() * 10 - 5)))
        };
      }
      if (a.target) {
        var tx = a.target.x - g.position.x, tz = a.target.z - g.position.z;
        var dist = Math.hypot(tx, tz);
        if (dist > 0.4) {
          var speed = fleeing ? 3.6 : a.speed;
          var step = Math.min(dist, dt * speed);
          var nx = g.position.x + (tx / dist) * step;
          var nz = g.position.z + (tz / dist) * step;
          if (isDryLand(nx, nz)) {
            g.position.set(nx, groundY(nx, nz), nz);
          } else { a.target = null; }
          a.faceYaw = Math.atan2(tx, tz);
        }
      }
      g.rotation.y += (a.faceYaw - g.rotation.y) * Math.min(1, dt * 8);
    });
  }

  // Foam dart: freeze in a silly tipped-over pose. Never loses HP, never drops loot.
  function stun(a, ms) {
    if (!a) return;
    a.stunUntil = performance.now() + (ms || 7000);
    a.target = null;
    GameAudio.sfx.squeak();
    UI.toast(a.def.emoji + " Bonk! Stunned — they're okay!", 2200);
  }

  // returns true if the tap was handled (an animal got bopped)
  function hit(a, playerPos) {
    // shears: wool without hunting the sheep
    if (a.type === "sheep" && Save.data.player.tools.shears && !a.sheared) {
      a.sheared = true;
      if (a.wool) a.wool.forEach(function (m) { m.visible = false; });
      if (a.shearedBody) a.shearedBody.visible = true;
      GameAudio.sfx.pop();
      Game.grantItem("wool", 2);
      Game.grantXP(2);
      UI.toast("✂️ Snip snip! +2 wool — the sheep is fine!", 2600);
      a.fleeUntil = performance.now() + 1400;
      setTimeout(function () {
        a.sheared = false;
        if (a.wool) a.wool.forEach(function (m) { m.visible = true; });
        if (a.shearedBody) a.shearedBody.visible = false;
      }, 45000);
      return true;
    }

    a.hp -= 1;
    GameAudio.sfx.squeak();
    // flee directly away from the player
    var dx = a.group.position.x - playerPos.x, dz = a.group.position.z - playerPos.z;
    var len = Math.hypot(dx, dz) || 1;
    a.target = {
      x: Math.max(3, Math.min(125, a.group.position.x + (dx / len) * 9 + (Math.random() * 4 - 2))),
      z: Math.max(3, Math.min(125, a.group.position.z + (dz / len) * 9 + (Math.random() * 4 - 2)))
    };
    a.home = { x: a.target.x, z: a.target.z };
    a.fleeUntil = performance.now() + 2600;
    a.moveT = 5;

    if (a.hp <= 0) {
      scene.remove(a.group);
      animals.splice(animals.indexOf(a), 1);
      GameAudio.sfx.pop();
      var loot = [];
      Object.keys(a.def.drops).forEach(function (item) {
        Game.grantItem(item, a.def.drops[item]);
        loot.push("+" + a.def.drops[item] + " " + (ITEM_ICON[item] || "") + " " + item);
      });
      Game.grantXP(3);
      UI.toast(a.def.emoji + " Got it! " + loot.join("  "), 2600);
      Stats.recordMine();   // counts toward activity
    }
    return true;
  }

  function hitboxes() { return animals.map(function (a) { return a.hitbox; }); }

  return { init: init, populate: populate, update: update, hit: hit, stun: stun, hitboxes: hitboxes };
})();
