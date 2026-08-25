"use strict";
/* ============================================================
   PLAYER — first-person camera, walking physics, voxel
   collision, swimming, and the mining/placing raycast.
   ============================================================ */
var Player = (function () {
  var camera = null;
  var pos = new THREE.Vector3(64, 30, 64);   // feet position
  var vel = new THREE.Vector3();
  var yaw = 0, pitch = 0;
  var onGround = false;
  var WIDTH = 0.55, HEIGHT = 1.65, EYE = 1.5;
  var SPEED = 4.2, JUMP = 7.6, GRAVITY = 21;

  // input state (set by Controls)
  var move = { x: 0, z: 0 };   // -1..1 strafe / forward
  var wantJump = false;

  function init(cam) { camera = cam; }

  function spawnAt(x, z) {
    var y = World.surfaceY(x, z) + 1;
    pos.set(x + 0.5, y + 0.05, z + 0.5);
    vel.set(0, 0, 0);
    yaw = Math.PI * 0.25; pitch = -0.1;
  }

  function look(dx, dy) {
    yaw -= dx;
    pitch -= dy;
    var lim = Math.PI / 2 - 0.05;
    pitch = Math.max(-lim, Math.min(lim, pitch));
  }

  function collide(axis, amount) {
    pos[axis] += amount;
    var minX = pos.x - WIDTH / 2, maxX = pos.x + WIDTH / 2;
    var minY = pos.y,             maxY = pos.y + HEIGHT;
    var minZ = pos.z - WIDTH / 2, maxZ = pos.z + WIDTH / 2;
    for (var bx = Math.floor(minX); bx <= Math.floor(maxX); bx++)
      for (var by = Math.floor(minY); by <= Math.floor(maxY); by++)
        for (var bz = Math.floor(minZ); bz <= Math.floor(maxZ); bz++) {
          if (!World.isSolid(bx, by, bz)) continue;
          if (axis === "y") {
            if (amount < 0) { pos.y = by + 1; vel.y = 0; onGround = true; }
            else { pos.y = by - HEIGHT - 0.001; vel.y = 0; }
          } else if (axis === "x") {
            pos.x = amount > 0 ? bx - WIDTH / 2 - 0.001 : bx + 1 + WIDTH / 2 + 0.001;
          } else {
            pos.z = amount > 0 ? bz - WIDTH / 2 - 0.001 : bz + 1 + WIDTH / 2 + 0.001;
          }
          return;
        }
  }

  var stepAccum = 0;
  function update(dt) {
    dt = Math.min(dt, 0.05);
    var inWater = World.isWaterAt(pos.x, pos.y + 0.5, pos.z);

    // horizontal movement relative to yaw
    var sin = Math.sin(yaw), cos = Math.cos(yaw);
    var speed = inWater ? SPEED * 0.55 : SPEED;
    var vx = (move.x * cos - move.z * sin) * speed;
    var vz = (-move.x * sin - move.z * cos) * speed;

    // gravity / swim
    if (inWater) {
      vel.y -= GRAVITY * 0.25 * dt;
      vel.y = Math.max(vel.y, -2.5);
      if (wantJump) vel.y = 3.2;
    } else {
      vel.y -= GRAVITY * dt;
      if (wantJump && onGround) { vel.y = JUMP; onGround = false; GameAudio.sfx.pop(); }
    }

    onGround = false;
    collide("y", vel.y * dt);
    collide("x", vx * dt);
    collide("z", vz * dt);

    // invisible walls at the edge of the island
    pos.x = Math.max(1, Math.min(World.SX - 1, pos.x));
    pos.z = Math.max(1, Math.min(World.SZ - 1, pos.z));
    // safety net: below even the Deep Dark? pop back to spawn
    if (pos.y < World.MIN_Y - 10) spawnAt(World.SX / 2, World.SZ / 2);

    // footsteps
    var moving = (Math.abs(vx) + Math.abs(vz)) > 0.5;
    if (moving && onGround) {
      stepAccum += dt;
      if (stepAccum > 0.38) { stepAccum = 0; GameAudio.sfx.step(); }
    }

    // camera with a light head-bob while walking
    var bob = moving && onGround ? Math.sin(performance.now() / 130) * 0.04 : 0;
    camera.position.set(pos.x, pos.y + EYE + bob, pos.z);
    camera.rotation.set(0, 0, 0);
    camera.rotateY(yaw);
    camera.rotateX(pitch);
  }

  /* raycast from screen center into the voxel world */
  var raycaster = new THREE.Raycaster();
  function raycastBlock(maxDist) {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.far = maxDist || 6;
    var hits = raycaster.intersectObjects(World.meshes, false);
    if (!hits.length) return null;
    var hit = hits[0];
    var p = hit.point;
    // step a hair along the ray: just past the surface = the block hit,
    // just before it = where a new block goes. (Unlike face normals,
    // this also works for flowers' diagonal cross-planes.)
    var d = raycaster.ray.direction;
    var e = 0.005;
    return {
      block: {
        x: Math.floor(p.x + d.x * e),
        y: Math.floor(p.y + d.y * e),
        z: Math.floor(p.z + d.z * e)
      },
      place: {
        x: Math.floor(p.x - d.x * e),
        y: Math.floor(p.y - d.y * e),
        z: Math.floor(p.z - d.z * e)
      },
      distance: hit.distance,
      point: p
    };
  }

  function wouldIntersectPlayer(bx, by, bz) {
    return bx + 1 > pos.x - WIDTH / 2 && bx < pos.x + WIDTH / 2 &&
           by + 1 > pos.y            && by < pos.y + HEIGHT &&
           bz + 1 > pos.z - WIDTH / 2 && bz < pos.z + WIDTH / 2;
  }

  return {
    init: init, spawnAt: spawnAt, look: look, update: update,
    raycastBlock: raycastBlock, wouldIntersectPlayer: wouldIntersectPlayer,
    move: move,
    set jump(v) { wantJump = v; },
    get position() { return pos; },
    get yaw() { return yaw; }
  };
})();
