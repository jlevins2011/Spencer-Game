"use strict";
/* ============================================================
   NERF GUN — foam darts from a 25-round drum mag.
   Nothing dies. Animals get a silly stun; people say "Ouch!"
   ============================================================ */
var Nerf = (function () {
  var DRUM = 25;
  var SPEED = 32;
  var RANGE_TIME = 1.15;
  var COOL_MS = 220;
  var RELOAD_MS = 1600;
  var STUN_MS = 7000;

  var scene = null, camera = null;
  var gun = null, drum = null;
  var darts = [];
  var ammo = DRUM;
  var lastShot = 0;
  var reloading = false;
  var armed = false;
  var recoil = 0;
  var raycaster = new THREE.Raycaster();
  var tmpFrom = new THREE.Vector3();
  var tmpTo = new THREE.Vector3();
  var tmpDir = new THREE.Vector3();

  function mat(color) { return new THREE.MeshLambertMaterial({ color: color }); }

  function box(parent, w, h, d, m, x, y, z) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function buildGun() {
    var g = new THREE.Group();
    var orange = mat(0xf27c21);
    var dark = mat(0x2c2c2c);
    var grey = mat(0x6a6a6a);
    var cream = mat(0xf4e6c8);

    // body + barrel (classic Nerf orange)
    box(g, 0.10, 0.12, 0.42, orange, 0, 0, 0);
    box(g, 0.07, 0.07, 0.28, grey, 0, 0.02, -0.28);
    box(g, 0.09, 0.09, 0.04, dark, 0, 0.02, -0.44);          // muzzle
    // grip
    box(g, 0.07, 0.18, 0.09, orange, 0, -0.14, 0.10);
    box(g, 0.08, 0.04, 0.10, dark, 0, -0.24, 0.10);
    // sight
    box(g, 0.03, 0.05, 0.08, dark, 0, 0.10, -0.12);

    // drum magazine on the left — big, round, obviously a drum mag
    var drumGrp = new THREE.Group();
    var cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.12, 16), orange);
    cyl.rotation.z = Math.PI / 2;
    drumGrp.add(cyl);
    var rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 16), dark);
    rim.rotation.z = Math.PI / 2;
    drumGrp.add(rim);
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10), dark);
    hub.rotation.z = Math.PI / 2;
    drumGrp.add(hub);
    for (var i = 0; i < 10; i++) {
      var ang = (i / 10) * Math.PI * 2;
      var dartTip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.06), cream);
      dartTip.position.set(0, Math.cos(ang) * 0.14, Math.sin(ang) * 0.14);
      drumGrp.add(dartTip);
    }
    drumGrp.position.set(0.02, 0.22, 0.06);
    g.add(drumGrp);

    g.position.set(0.32, -0.26, -0.52);
    g.scale.set(2.8, 2.8, 2.8);
    g.rotation.set(0.1, 0.32, 0.16);
    g.visible = false;
    return { group: g, drum: drumGrp };
  }

  function buildDart() {
    var g = new THREE.Group();
    var foam = mat(0xf27c21);
    var head = mat(0xe8e0d0);
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 6), foam);
    shaft.rotation.x = Math.PI / 2;
    g.add(shaft);
    var tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), head);
    tip.position.z = 0.14;
    g.add(tip);
    return g;
  }

  function hudEl() { return document.getElementById("nerf-ammo"); }

  function syncHud() {
    var el = hudEl();
    if (!el) return;
    if (!armed) {
      el.classList.remove("show");
      return;
    }
    el.classList.add("show");
    el.textContent = reloading ? "🎯 Reloading drum…" : ("🎯 " + ammo + " / " + DRUM);
  }

  function init(sc, cam) {
    scene = sc;
    camera = cam;
    var model = buildGun();
    gun = model.group;
    drum = model.drum;
    camera.add(gun);
    if (!camera.parent) scene.add(camera);
    ammo = DRUM;
    syncHud();
  }

  function owned() { return !!(Save.data.player && Save.data.player.tools && Save.data.player.tools.nerf); }

  function isArmed() { return armed && owned(); }

  function equip() {
    if (!owned()) return;
    armed = true;
    if (gun) gun.visible = true;
    syncHud();
  }

  function unequip() {
    armed = false;
    if (gun) gun.visible = false;
    syncHud();
  }

  function startReload() {
    if (reloading) return;
    reloading = true;
    syncHud();
    GameAudio.sfx.reload();
    UI.toast("🎯 Reloading the drum mag…", 1400);
    setTimeout(function () {
      ammo = DRUM;
      reloading = false;
      syncHud();
      GameAudio.sfx.pop();
      if (armed) UI.toast("🎯 Drum's full!", 1200);
    }, RELOAD_MS);
  }

  function fire() {
    if (!isArmed() || !camera || !scene) return;
    var now = performance.now();
    if (reloading) {
      GameAudio.sfx.wrong();
      return;
    }
    if (ammo <= 0) {
      startReload();
      return;
    }
    if (now - lastShot < COOL_MS) return;
    lastShot = now;
    ammo -= 1;
    recoil = 0.07;
    if (drum) drum.rotation.x += 0.45;
    GameAudio.sfx.thwip();
    syncHud();
    UI.updateHotbar();

    var mesh = buildDart();
    camera.getWorldPosition(tmpFrom);
    camera.getWorldDirection(tmpDir);
    tmpFrom.addScaledVector(tmpDir, 0.55);
    var right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    tmpFrom.addScaledVector(right, 0.16);
    tmpFrom.y -= 0.1;
    mesh.position.copy(tmpFrom);
    mesh.quaternion.copy(camera.quaternion);
    scene.add(mesh);
    darts.push({
      mesh: mesh,
      vel: tmpDir.clone().multiplyScalar(SPEED),
      born: now,
      last: tmpFrom.clone()
    });
    if (ammo <= 0) startReload();
  }

  function hitNpc(n) {
    if (n && NPCs.ouch) NPCs.ouch(n);
  }

  function hitAnimal(a) {
    if (a && Animals.stun) Animals.stun(a, STUN_MS);
  }

  function finishDart(d) {
    scene.remove(d.mesh);
    darts.splice(darts.indexOf(d), 1);
  }

  function update(dt) {
    if (gun && armed) {
      recoil *= Math.max(0, 1 - dt * 12);
      gun.position.z = -0.52 + recoil;
    }

    var now = performance.now();
    for (var i = darts.length - 1; i >= 0; i--) {
      var d = darts[i];
      if (now - d.born > RANGE_TIME * 1000) { finishDart(d); continue; }
      d.last.copy(d.mesh.position);
      d.vel.y -= 9 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      tmpFrom.copy(d.last);
      tmpTo.copy(d.mesh.position);
      tmpDir.copy(tmpTo).sub(tmpFrom);
      var dist = tmpDir.length();
      if (dist < 0.001) continue;
      tmpDir.multiplyScalar(1 / dist);
      raycaster.set(tmpFrom, tmpDir);
      raycaster.far = dist + 0.08;

      var npcHits = raycaster.intersectObjects(NPCs.hitboxes(), false);
      if (npcHits.length) {
        hitNpc(npcHits[0].object.userData.npc);
        GameAudio.sfx.pop();
        finishDart(d);
        continue;
      }
      var animalHits = raycaster.intersectObjects(Animals.hitboxes(), false);
      if (animalHits.length) {
        hitAnimal(animalHits[0].object.userData.animal);
        GameAudio.sfx.pop();
        finishDart(d);
        continue;
      }

      var bx = Math.floor(d.mesh.position.x);
      var by = Math.floor(d.mesh.position.y);
      var bz = Math.floor(d.mesh.position.z);
      if (World.isSolid(bx, by, bz)) {
        GameAudio.sfx.step();
        finishDart(d);
      }
    }
  }

  function clearDarts() {
    darts.forEach(function (d) { scene.remove(d.mesh); });
    darts = [];
  }

  return {
    init: init, update: update, fire: fire, equip: equip, unequip: unequip,
    isArmed: isArmed, owned: owned, ammo: function () { return ammo; },
    drumSize: function () { return DRUM; }, syncHud: syncHud, clearDarts: clearDarts
  };
})();
