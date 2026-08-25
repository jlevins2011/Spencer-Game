"use strict";
/* ============================================================
   TEXTURE ATLAS — every block texture is painted onto one
   canvas at load time (16px tiles, 8x8 grid). NearestFilter
   keeps the chunky pixel look. No image files needed.
   ============================================================ */
var Textures = (function () {
  var TILE = 16, GRID = 8;
  var canvas = document.createElement("canvas");
  canvas.width = canvas.height = TILE * GRID;
  var g = canvas.getContext("2d");

  var rngSeed = 12345;
  function rnd() { rngSeed = (rngSeed * 16807) % 2147483647; return (rngSeed - 1) / 2147483646; }

  function px(tx, ty, x, y, color) {
    g.fillStyle = color;
    g.fillRect(tx * TILE + x, ty * TILE + y, 1, 1);
  }

  function fill(tx, ty, base, speckles) {
    for (var y = 0; y < TILE; y++) for (var x = 0; x < TILE; x++) {
      var c = base;
      if (speckles && rnd() < 0.35) c = speckles[Math.floor(rnd() * speckles.length)];
      px(tx, ty, x, y, c);
    }
  }

  function spots(tx, ty, color, n, size, outline) {
    for (var i = 0; i < n; i++) {
      var cx = 2 + Math.floor(rnd() * (TILE - 5));
      var cy = 2 + Math.floor(rnd() * (TILE - 5));
      for (var dy = 0; dy < size; dy++) for (var dx = 0; dx < size; dx++) {
        px(tx, ty, cx + dx, cy + dy, color);
      }
      if (outline) { px(tx, ty, cx - 1, cy, outline); px(tx, ty, cx + size, cy, outline); }
    }
  }

  function clearTile(tx, ty) {
    g.clearRect(tx * TILE, ty * TILE, TILE, TILE);
  }

  // tile ids
  var T = {
    GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, SAND: 4, LOG_SIDE: 5, LOG_TOP: 6, LEAVES: 7,
    PLANKS: 8, WATER: 9, SNOW_TOP: 10, SNOW_SIDE: 11, COAL: 12, IRON: 13, DIAMOND: 14, WORD_ORE: 15,
    CHEST_FRONT: 16, CHEST_SIDE: 17, CHEST_TOP: 18, BEDROCK: 19, CACTUS_SIDE: 20, CACTUS_TOP: 21,
    MUSH_STEM: 22, MUSH_CAP: 23, CRYSTAL: 24, GLOW: 25, ICE: 26,
    FLOWER_RED: 27, FLOWER_YELLOW: 28, MUSH_SMALL: 29, SANDSTONE: 30, CRYSTAL_GRASS: 31,
    LEAVES_PINK: 32, BRICK: 33
  };

  function paintAll() {
    fill(0, 0, "#5fae3f", ["#54a437", "#6cbb4a", "#4c9a31"]);                       // grass top
    fill(1, 0, "#7a5433", ["#6e4a2c", "#86603c"]);                                  // grass side base
    for (var x = 0; x < TILE; x++) { for (var y = 0; y < 4; y++) { if (y < 3 || rnd() < 0.5) px(1, 0, x, y, rnd() < 0.3 ? "#54a437" : "#5fae3f"); } }
    fill(2, 0, "#7a5433", ["#6e4a2c", "#86603c", "#5f4026"]);                       // dirt
    fill(3, 0, "#8a8a8a", ["#7d7d7d", "#979797", "#858585"]);                       // stone
    fill(4, 0, "#e6d9a8", ["#dccf9d", "#efe3b4"]);                                  // sand
    fill(5, 0, "#6b4a2a", ["#5e3f22", "#775434"]);                                  // log side
    for (var yy = 0; yy < TILE; yy++) px(5, 0, 3, yy, "#563a1f"), px(5, 0, 11, yy, "#563a1f");
    fill(6, 0, "#9c7a4a", ["#8f6e40"]);                                             // log top
    spots(6, 0, "#6b4a2a", 3, 2);
    fill(7, 0, "#3e8a2e", ["#357a26", "#489b37", "#2e6f20"]);                       // leaves

    fill(0, 1, "#a07a4a", ["#96703f", "#ab8555"]);                                  // planks
    for (var xx = 0; xx < TILE; xx++) px(0, 1, xx, 5, "#7d5c33"), px(0, 1, xx, 11, "#7d5c33");
    fill(1, 1, "#3f76e4", ["#3a6fd8", "#4a82ef", "#3568c9"]);                       // water
    fill(2, 1, "#f2f6f9", ["#e8eef4", "#ffffff"]);                                  // snow top
    fill(3, 1, "#7a5433", ["#6e4a2c"]);                                             // snow side
    for (var x2 = 0; x2 < TILE; x2++) for (var y2 = 0; y2 < 4; y2++) px(3, 1, x2, y2, "#f2f6f9");
    fill(4, 1, "#8a8a8a", ["#7d7d7d", "#979797"]); spots(4, 1, "#2b2b2b", 6, 2);    // coal ore
    fill(5, 1, "#8a8a8a", ["#7d7d7d", "#979797"]); spots(5, 1, "#d8a066", 5, 2);    // iron ore
    fill(6, 1, "#8a8a8a", ["#7d7d7d", "#979797"]); spots(6, 1, "#4aedd9", 5, 2, "#8ff7ea"); // diamond ore
    fill(7, 1, "#7a5fb5", ["#6d54a6", "#8a6fc7"]);                                  // word ore base
    g.fillStyle = "#ffe66b"; g.font = "bold 12px monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("?", 7 * TILE + 8, 1 * TILE + 9);

    fill(0, 2, "#8a5a2b", ["#7d5126", "#966333"]);                                  // chest front
    g.strokeStyle = "#5e3d1c"; g.strokeRect(0 * TILE + 0.5, 2 * TILE + 0.5, 15, 15);
    for (var cx = 6; cx < 10; cx++) for (var cy = 6; cy < 10; cy++) px(0, 2, cx, cy, "#e8c84a");
    fill(1, 2, "#8a5a2b", ["#7d5126", "#966333"]);                                  // chest side
    g.strokeStyle = "#5e3d1c"; g.strokeRect(1 * TILE + 0.5, 2 * TILE + 0.5, 15, 15);
    fill(2, 2, "#96633" + "3", ["#8a5a2b"]);                                        // chest top
    g.strokeStyle = "#5e3d1c"; g.strokeRect(2 * TILE + 0.5, 2 * TILE + 0.5, 15, 15);
    fill(3, 2, "#3d3d3d", ["#2e2e2e", "#4a4a4a", "#222222"]);                       // bedrock
    fill(4, 2, "#3e7a2e", ["#356b26", "#489037"]);                                  // cactus side
    for (var cy2 = 0; cy2 < TILE; cy2 += 3) px(4, 2, 2, cy2, "#2a5a1e"), px(4, 2, 13, cy2, "#2a5a1e");
    fill(5, 2, "#4a8a38", ["#3e7a2e"]);                                             // cactus top
    fill(6, 2, "#e8e0d0", ["#ddd5c5", "#f2ebdd"]);                                  // mushroom stem
    fill(7, 2, "#c0392b", ["#b03427", "#d04435"]); spots(7, 2, "#f2e6d8", 4, 3);    // mushroom cap

    fill(0, 3, "#b57ae0", ["#a86fd2", "#c288ec", "#9a63c4"]);                       // crystal block
    spots(0, 3, "#e8ccff", 4, 2);
    fill(1, 3, "#ffd97a", ["#ffce5c", "#ffe49b"]); spots(1, 3, "#fff4cc", 5, 2);    // glowstone
    fill(2, 3, "#aee0f2", ["#9fd6ea", "#bfe9f7"]);                                  // ice
    clearTile(3, 3);                                                                // flower red (cross)
    for (var fy = 8; fy < 16; fy++) px(3, 3, 7, fy, "#3e8a2e");
    px(3, 3, 5, 10, "#3e8a2e"); px(3, 3, 6, 9, "#3e8a2e");
    [[6,4],[8,4],[7,5],[5,5],[9,5],[6,6],[8,6],[7,4]].forEach(function (p) { px(3, 3, p[0], p[1], "#e0392b"); });
    px(3, 3, 7, 5, "#ffd94a");
    clearTile(4, 3);                                                                // flower yellow
    for (var fy2 = 8; fy2 < 16; fy2++) px(4, 3, 8, fy2, "#3e8a2e");
    [[7,4],[9,4],[8,5],[6,5],[10,5],[7,6],[9,6],[8,3]].forEach(function (p) { px(4, 3, p[0], p[1], "#ffd430"); });
    px(4, 3, 8, 5, "#c47c1a");
    clearTile(5, 3);                                                                // small mushroom
    for (var fy3 = 9; fy3 < 16; fy3++) px(5, 3, 7, fy3, "#e8e0d0"), px(5, 3, 8, fy3, "#ddd5c5");
    for (var mx = 4; mx < 12; mx++) for (var my = 6; my < 9; my++) px(5, 3, mx, my, "#c0392b");
    for (var mx2 = 5; mx2 < 11; mx2++) px(5, 3, mx2, 5, "#c0392b");
    px(5, 3, 6, 7, "#f2e6d8"); px(5, 3, 9, 6, "#f2e6d8");
    fill(6, 3, "#d9c690", ["#cfbc85", "#e3d09b"]);                                  // sandstone
    for (var sx = 0; sx < TILE; sx++) px(6, 3, sx, 4, "#c4b078"), px(6, 3, sx, 10, "#c4b078");
    fill(7, 3, "#8a5fc7", ["#7d54b8", "#9a6fd6", "#6f4aad"]);                       // crystal grass

    fill(0, 4, "#e88ac2", ["#de7cb6", "#f29ace", "#d670ab"]);                       // pink leaves
    fill(1, 4, "#a84a3a", ["#9c4234", "#b55444"]);                                  // brick
    for (var bx = 0; bx < TILE; bx++) px(1, 4, bx, 5, "#7d3428"), px(1, 4, bx, 11, "#7d3428");
    for (var by = 0; by < 5; by++) px(1, 4, 8, by, "#7d3428");
    for (var by2 = 6; by2 < 11; by2++) px(1, 4, 3, by2, "#7d3428"), px(1, 4, 12, by2, "#7d3428");
  }

  // map tile constant -> [tx, ty]
  var TILE_POS = {};
  Object.keys(T).forEach(function (k) {
    TILE_POS[T[k]] = [T[k] % GRID, Math.floor(T[k] / GRID)];
  });

  function uv(tileId) {
    var p = TILE_POS[tileId];
    var s = 1 / GRID;
    // tiny inset to avoid atlas bleeding
    var e = 0.02 * s;
    var u0 = p[0] * s + e, v1 = 1 - p[1] * s - e;
    var u1 = (p[0] + 1) * s - e, v0 = 1 - (p[1] + 1) * s + e;
    return { u0: u0, v0: v0, u1: u1, v1: v1 };
  }

  var texture = null;
  function build() {
    paintAll();
    texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  return { T: T, uv: uv, build: build, canvas: canvas, get texture() { return texture; } };
})();
