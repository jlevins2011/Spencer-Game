"use strict";
/* ============================================================
   VOXEL WORLD — block registry, terrain generation, chunk
   meshing, block edits. Finite 128x128 island per world;
   5 themed worlds unlock as Spencer levels up.
   ============================================================ */

/* ---------------- block registry ---------------- */
var B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, LOG: 5, LEAVES: 6, PLANKS: 7,
  WATER: 8, SNOW: 9, COAL: 10, IRON: 11, DIAMOND: 12, WORD_ORE: 13, CHEST: 14,
  BEDROCK: 15, CACTUS: 16, MUSH_STEM: 17, MUSH_CAP: 18, CRYSTAL: 19, GLOW: 20,
  ICE: 21, FLOWER_RED: 22, FLOWER_YELLOW: 23, MUSH_SMALL: 24, SANDSTONE: 25,
  CRYSTAL_GRASS: 26, LEAVES_PINK: 27, BRICK: 28,
  DEEPSLATE: 29, AMETHYST: 30, MYTHRIL: 31, VOIDROCK: 32, WOOL: 33
};

var BLOCKS = (function () {
  var T = Textures.T;
  var d = {};
  function def(id, name, opts) {
    d[id] = Object.assign({
      id: id, name: name, solid: true, cross: false, water: false,
      tiles: null,            // {top, bottom, side} tile ids
      drop: null,             // inventory item name (null = nothing)
      hard: 500,              // base mining ms
      needPick: 0,            // min pickaxe tier to mine
      special: null,          // "wordore" | "chest"
      icon: "⬜"
    }, opts);
  }
  def(B.GRASS,    "grass",    { tiles: { top: T.GRASS_TOP, bottom: T.DIRT, side: T.GRASS_SIDE }, drop: "dirt", hard: 350, icon: "🟩" });
  def(B.DIRT,     "dirt",     { tiles: { top: T.DIRT, bottom: T.DIRT, side: T.DIRT }, drop: "dirt", hard: 300, icon: "🟫" });
  def(B.STONE,    "stone",    { tiles: { top: T.STONE, bottom: T.STONE, side: T.STONE }, drop: "stone", hard: 700, icon: "🪨" });
  def(B.SAND,     "sand",     { tiles: { top: T.SAND, bottom: T.SAND, side: T.SAND }, drop: "sand", hard: 300, icon: "🟨" });
  def(B.LOG,      "wood",     { tiles: { top: T.LOG_TOP, bottom: T.LOG_TOP, side: T.LOG_SIDE }, drop: "wood", hard: 450, icon: "🪵" });
  def(B.LEAVES,   "leaves",   { tiles: { top: T.LEAVES, bottom: T.LEAVES, side: T.LEAVES }, drop: "leaves", hard: 150, icon: "🍃" });
  def(B.PLANKS,   "planks",   { tiles: { top: T.PLANKS, bottom: T.PLANKS, side: T.PLANKS }, drop: "planks", hard: 400, icon: "🟧" });
  def(B.WATER,    "water",    { tiles: { top: T.WATER, bottom: T.WATER, side: T.WATER }, solid: false, water: true, drop: null });
  def(B.SNOW,     "snow",     { tiles: { top: T.SNOW_TOP, bottom: T.DIRT, side: T.SNOW_SIDE }, drop: "dirt", hard: 300, icon: "⬜" });
  def(B.COAL,     "coal ore", { tiles: { top: T.COAL, bottom: T.COAL, side: T.COAL }, drop: "coal", hard: 800, icon: "⚫" });
  def(B.IRON,     "iron ore", { tiles: { top: T.IRON, bottom: T.IRON, side: T.IRON }, drop: "iron", hard: 900, needPick: 1, icon: "⛓️" });
  def(B.DIAMOND,  "diamond ore", { tiles: { top: T.DIAMOND, bottom: T.DIAMOND, side: T.DIAMOND }, drop: "diamond", hard: 1000, needPick: 2, icon: "💎" });
  def(B.WORD_ORE, "word ore", { tiles: { top: T.WORD_ORE, bottom: T.WORD_ORE, side: T.WORD_ORE }, special: "wordore", hard: 1, icon: "❓" });
  def(B.CHEST,    "chest",    { tiles: { top: T.CHEST_TOP, bottom: T.CHEST_TOP, side: T.CHEST_SIDE }, special: "chest", hard: 1, icon: "🧰" });
  // bedrock: only the Voidbreaker Drill (from Daddy's challenges) breaks it
  def(B.BEDROCK,  "bedrock",  { tiles: { top: T.BEDROCK, bottom: T.BEDROCK, side: T.BEDROCK }, hard: 1400, needTool: "drill" });
  def(B.DEEPSLATE, "deepslate", { tiles: { top: T.DEEPSLATE, bottom: T.DEEPSLATE, side: T.DEEPSLATE }, drop: "deepslate", hard: 900, needPick: 1, icon: "⬛" });
  def(B.AMETHYST, "amethyst ore", { tiles: { top: T.AMETHYST, bottom: T.AMETHYST, side: T.AMETHYST }, drop: "amethyst", hard: 1000, needPick: 2, icon: "🟣" });
  def(B.MYTHRIL,  "mythril ore",  { tiles: { top: T.MYTHRIL, bottom: T.MYTHRIL, side: T.MYTHRIL }, drop: "mythril", hard: 1400, needPick: 2, icon: "🌀" });
  def(B.VOIDROCK, "voidrock", { tiles: { top: T.VOIDROCK, bottom: T.VOIDROCK, side: T.VOIDROCK }, hard: -1 });
  def(B.WOOL,     "wool",     { tiles: { top: T.WOOL, bottom: T.WOOL, side: T.WOOL }, drop: "wool", hard: 250, icon: "🧶" });
  def(B.CACTUS,   "cactus",   { tiles: { top: T.CACTUS_TOP, bottom: T.CACTUS_TOP, side: T.CACTUS_SIDE }, drop: "cactus", hard: 250, icon: "🌵" });
  def(B.MUSH_STEM,"mushroom stem", { tiles: { top: T.MUSH_STEM, bottom: T.MUSH_STEM, side: T.MUSH_STEM }, drop: "mushroom", hard: 300, icon: "🍄" });
  def(B.MUSH_CAP, "mushroom cap",  { tiles: { top: T.MUSH_CAP, bottom: T.MUSH_STEM, side: T.MUSH_CAP }, drop: "mushroom", hard: 300, icon: "🍄" });
  def(B.CRYSTAL,  "crystal",  { tiles: { top: T.CRYSTAL, bottom: T.CRYSTAL, side: T.CRYSTAL }, drop: "crystal", hard: 800, needPick: 1, icon: "🔮" });
  def(B.GLOW,     "glowstone",{ tiles: { top: T.GLOW, bottom: T.GLOW, side: T.GLOW }, drop: "glowstone", hard: 400, icon: "✨" });
  def(B.ICE,      "ice",      { tiles: { top: T.ICE, bottom: T.ICE, side: T.ICE }, drop: "ice", hard: 350, icon: "🧊" });
  def(B.FLOWER_RED,    "flower", { tiles: { top: T.FLOWER_RED }, cross: true, solid: false, drop: "flower", hard: 60, icon: "🌸" });
  def(B.FLOWER_YELLOW, "flower", { tiles: { top: T.FLOWER_YELLOW }, cross: true, solid: false, drop: "flower", hard: 60, icon: "🌼" });
  def(B.MUSH_SMALL,    "mushroom", { tiles: { top: T.MUSH_SMALL }, cross: true, solid: false, drop: "mushroom", hard: 60, icon: "🍄" });
  def(B.SANDSTONE, "sandstone", { tiles: { top: T.SANDSTONE, bottom: T.SANDSTONE, side: T.SANDSTONE }, drop: "sandstone", hard: 600, icon: "🧱" });
  def(B.CRYSTAL_GRASS, "crystal grass", { tiles: { top: T.CRYSTAL_GRASS, bottom: T.DIRT, side: T.CRYSTAL_GRASS }, drop: "dirt", hard: 350, icon: "🟪" });
  def(B.LEAVES_PINK, "pink leaves", { tiles: { top: T.LEAVES_PINK, bottom: T.LEAVES_PINK, side: T.LEAVES_PINK }, drop: "pink leaves", hard: 150, icon: "🌸" });
  def(B.BRICK,    "brick",    { tiles: { top: T.BRICK, bottom: T.BRICK, side: T.BRICK }, drop: "brick", hard: 600, icon: "🧱" });
  return d;
})();

// item name -> block id placed (for building from inventory)
var ITEM_TO_BLOCK = {
  dirt: B.DIRT, stone: B.STONE, sand: B.SAND, wood: B.LOG, leaves: B.LEAVES,
  planks: B.PLANKS, coal: B.COAL, iron: B.IRON, diamond: B.DIAMOND,
  cactus: B.CACTUS, mushroom: B.MUSH_CAP, crystal: B.CRYSTAL, glowstone: B.GLOW,
  ice: B.ICE, flower: B.FLOWER_RED, sandstone: B.SANDSTONE,
  "pink leaves": B.LEAVES_PINK, brick: B.BRICK,
  deepslate: B.DEEPSLATE, amethyst: B.AMETHYST, mythril: B.MYTHRIL,
  wool: B.WOOL
};
var ITEM_ICON = {
  dirt: "🟫", stone: "🪨", sand: "🟨", wood: "🪵", leaves: "🍃", planks: "🟧",
  coal: "⚫", iron: "⛓️", diamond: "💎", cactus: "🌵", mushroom: "🍄",
  crystal: "🔮", glowstone: "✨", ice: "🧊", flower: "🌸", sandstone: "🧱",
  "pink leaves": "🌸", brick: "🧱",
  deepslate: "⬛", amethyst: "🟣", mythril: "🌀",
  wool: "🧶", meat: "🍖"
};

/* ---------------- world definitions ---------------- */
var WORLD_DEFS = [
  { id: "meadow",   name: "Sunny Meadow",     emoji: "🌳", level: 1, sky: 0x87ceeb, fog: 0xbfe3f2,
    surface: B.GRASS, under: B.DIRT, base: 14, amp: 7, water: 12, trees: 0.010, flowers: 0.03, cactus: 0, mush: 0, crystal: 0, leaves: B.LEAVES },
  { id: "desert",   name: "Golden Desert",    emoji: "🏜️", level: 3, sky: 0xf7d9a0, fog: 0xf2e3c0,
    surface: B.SAND, under: B.SANDSTONE, base: 13, amp: 5, water: -1, trees: 0, flowers: 0, cactus: 0.006, mush: 0, crystal: 0, leaves: B.LEAVES },
  { id: "snowy",    name: "Snowy Peaks",      emoji: "🏔️", level: 5, sky: 0xcfe8f7, fog: 0xe8f4fb,
    surface: B.SNOW, under: B.DIRT, base: 15, amp: 10, water: -1, trees: 0.006, flowers: 0, cactus: 0, mush: 0, crystal: 0, ice: 0.02, leaves: B.LEAVES },
  { id: "mushroom", name: "Mushroom Isle",    emoji: "🍄", level: 7, sky: 0xd9b8e8, fog: 0xe8d5f2,
    surface: B.GRASS, under: B.DIRT, base: 13, amp: 6, water: 11, trees: 0, flowers: 0.01, cactus: 0, mush: 0.008, crystal: 0, leaves: B.LEAVES },
  { id: "crystal",  name: "Crystal Caves",    emoji: "🔮", level: 9, sky: 0x2e2352, fog: 0x4a3a7a,
    surface: B.CRYSTAL_GRASS, under: B.STONE, base: 14, amp: 8, water: -1, trees: 0.006, flowers: 0.015, cactus: 0, mush: 0, crystal: 0.008, glow: 0.004, leaves: B.LEAVES_PINK }
];

/* ---------------- the world ---------------- */
var World = (function () {
  var SX = 128, SY = 42, SZ = 128;
  // The Deep Dark: layers below y=0, sealed by bedrock until the
  // Voidbreaker Drill is earned. MIN_Y is solid voidrock (unbreakable).
  var MIN_Y = -20;
  var OY = -MIN_Y;                 // index offset for negative y
  var CHUNK = 16;
  var CX = SX / CHUNK, CZ = SZ / CHUNK;

  var data = new Uint8Array(SX * (SY + OY) * SZ);
  var scene = null;
  var material = null, waterMaterial = null;
  var chunkMeshes = [];      // solid meshes (raycast targets)
  var waterMeshes = [];
  var chunkGroup = null;
  var currentDef = WORLD_DEFS[0];

  function idx(x, y, z) { return ((y + OY) * SZ + z) * SX + x; }
  function inBounds(x, y, z) { return x >= 0 && x < SX && y >= MIN_Y && y < SY && z >= 0 && z < SZ; }
  function getBlock(x, y, z) { return inBounds(x, y, z) ? data[idx(x, y, z)] : B.AIR; }

  /* ----- seeded noise ----- */
  var seedBase = 0;
  function hash2(x, z) {
    var h = (x * 374761393 + z * 668265263 + seedBase * 1442695041) | 0;
    h = (h ^ (h >>> 13)) | 0; h = Math.imul(h, 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function noise2(x, z) {
    var x0 = Math.floor(x), z0 = Math.floor(z);
    var fx = smooth(x - x0), fz = smooth(z - z0);
    var a = hash2(x0, z0), b = hash2(x0 + 1, z0), c = hash2(x0, z0 + 1), d2 = hash2(x0 + 1, z0 + 1);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d2) * fx * fz;
  }
  function fbm(x, z) {
    return noise2(x * 0.03, z * 0.03) * 0.6 + noise2(x * 0.08, z * 0.08) * 0.3 + noise2(x * 0.2, z * 0.2) * 0.1;
  }

  function heightAt(x, z, def) {
    // island falloff so the edges slope into the void/ocean
    var dx = (x - SX / 2) / (SX / 2), dz = (z - SZ / 2) / (SZ / 2);
    var dist = Math.sqrt(dx * dx + dz * dz);
    var falloff = Math.max(0, 1 - Math.pow(dist, 3) * 1.15);
    var h = Math.floor((def.base + fbm(x, z) * def.amp * 2 - def.amp * 0.5) * falloff);
    return Math.max(2, Math.min(SY - 8, h));
  }

  /* ----- generation ----- */
  function generate(def) {
    data.fill(B.AIR);
    seedBase = 0;
    for (var i = 0; i < def.id.length; i++) seedBase = (seedBase * 31 + def.id.charCodeAt(i)) | 0;

    var x, y, z;
    for (x = 0; x < SX; x++) for (z = 0; z < SZ; z++) {
      var h = heightAt(x, z, def);
      data[idx(x, 0, z)] = B.BEDROCK;

      // ---- the Deep Dark (below bedrock) ----
      data[idx(x, MIN_Y, z)] = B.VOIDROCK;
      for (y = MIN_Y + 1; y < 0; y++) {
        var db = B.DEEPSLATE;
        var dr = hash2(x * 17 + y * 91, z * 23 + y * 41);
        if (dr < 0.02 && y < -3) db = B.AMETHYST;
        else if (dr < 0.028 && y < -11) db = B.MYTHRIL;
        else if (dr < 0.043) db = B.DIAMOND;
        else if (dr < 0.055) db = B.GLOW;
        else if (dr < 0.068) db = B.WORD_ORE;
        data[idx(x, y, z)] = db;
      }

      for (y = 1; y <= h; y++) {
        var b;
        if (y >= h) b = def.surface;
        else if (y >= h - 3) b = def.under;
        else {
          b = B.STONE;
          var r = hash2(x * 7 + y * 131, z * 13 + y * 57);
          if (r < 0.015) b = B.COAL;
          else if (r < 0.024 && y < 12) b = B.IRON;
          else if (r < 0.030 && y < 8) b = B.DIAMOND;
          else if (r < 0.038 && y < 14) b = B.WORD_ORE;
          else if (def.glow && r < 0.05 && y < 14) b = B.GLOW;
        }
        data[idx(x, y, z)] = b;
      }
      // water + beaches
      if (def.water > 0) {
        if (h < def.water) {
          for (y = h + 1; y <= def.water; y++) data[idx(x, y, z)] = B.WATER;
          if (data[idx(x, h, z)] === def.surface) data[idx(x, h, z)] = B.SAND;
        } else if (h <= def.water + 1 && data[idx(x, h, z)] === def.surface) {
          data[idx(x, h, z)] = B.SAND;
        }
      }
    }

    // decorations (second pass)
    for (x = 2; x < SX - 2; x++) for (z = 2; z < SZ - 2; z++) {
      var h2 = heightAt(x, z, def);
      var top = data[idx(x, h2, z)];
      if (top !== def.surface && top !== B.SAND) continue;
      if (top === B.SAND && def.id !== "desert") continue;
      var r2 = hash2(x * 3 + 999, z * 5 + 777);
      var above = h2 + 1;
      if (data[idx(x, above, z)] !== B.AIR) continue;

      if (def.trees && r2 < def.trees && top === def.surface) {
        plantTree(x, above, z, def);
      } else if (def.cactus && r2 < def.trees + def.cactus) {
        var ch = 2 + Math.floor(hash2(x, z * 3) * 2);
        for (y = 0; y < ch; y++) data[idx(x, above + y, z)] = B.CACTUS;
      } else if (def.mush && r2 < def.mush) {
        plantMushroom(x, above, z);
      } else if (def.crystal && r2 < (def.trees || 0) + def.crystal) {
        var sh = 2 + Math.floor(hash2(x * 5, z) * 3);
        for (y = 0; y < sh; y++) data[idx(x, above + y, z)] = B.CRYSTAL;
      } else if (r2 < 0.9 && def.ice && hash2(x * 11, z * 17) < def.ice) {
        data[idx(x, h2, z)] = B.ICE;
      } else if (def.flowers && r2 > 0.5 && r2 < 0.5 + def.flowers) {
        data[idx(x, above, z)] = def.id === "mushroom" ? B.MUSH_SMALL :
          (hash2(x, z) < 0.5 ? B.FLOWER_RED : B.FLOWER_YELLOW);
      } else if (r2 > 0.9915) {
        data[idx(x, above, z)] = B.WORD_ORE;      // surface word ore
      } else if (r2 > 0.9855) {
        data[idx(x, above, z)] = B.CHEST;         // surface treasure chest
      }
    }
  }

  function plantTree(x, y, z, def) {
    var h = 3 + Math.floor(hash2(x, z) * 2);
    var leaves = def.leaves;
    for (var i = 0; i < h; i++) data[idx(x, y + i, z)] = B.LOG;
    for (var dx = -2; dx <= 2; dx++) for (var dz = -2; dz <= 2; dz++) for (var dy = 0; dy < 2; dy++) {
      if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
      var lx = x + dx, ly = y + h - 1 + dy, lz = z + dz;
      if (inBounds(lx, ly, lz) && data[idx(lx, ly, lz)] === B.AIR) data[idx(lx, ly, lz)] = leaves;
    }
    for (var dx2 = -1; dx2 <= 1; dx2++) for (var dz2 = -1; dz2 <= 1; dz2++) {
      var tx = x + dx2, ty = y + h + 1, tz = z + dz2;
      if (Math.abs(dx2) + Math.abs(dz2) < 2 && inBounds(tx, ty, tz) && data[idx(tx, ty, tz)] === B.AIR) {
        data[idx(tx, ty, tz)] = leaves;
      }
    }
  }

  function plantMushroom(x, y, z) {
    var h = 3 + Math.floor(hash2(x * 7, z) * 2);
    for (var i = 0; i < h; i++) data[idx(x, y + i, z)] = B.MUSH_STEM;
    for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
      var cx = x + dx, cy = y + h, cz = z + dz;
      if (inBounds(cx, cy, cz)) data[idx(cx, cy, cz)] = B.MUSH_CAP;
    }
  }

  /* ----- meshing ----- */
  // faces: [dx,dy,dz, corner verts (4x3), tileKey]
  var FACES = [
    { dir: [0, 1, 0],  corners: [[0,1,1],[1,1,1],[0,1,0],[1,1,0]], tile: "top",    shade: 1.0 },
    { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[0,0,1],[1,0,1]], tile: "bottom", shade: 0.5 },
    { dir: [1, 0, 0],  corners: [[1,0,1],[1,0,0],[1,1,1],[1,1,0]], tile: "side",   shade: 0.8 },
    { dir: [-1, 0, 0], corners: [[0,0,0],[0,0,1],[0,1,0],[0,1,1]], tile: "side",   shade: 0.8 },
    { dir: [0, 0, 1],  corners: [[0,0,1],[1,0,1],[0,1,1],[1,1,1]], tile: "side",   shade: 0.7 },
    { dir: [0, 0, -1], corners: [[1,0,0],[0,0,0],[1,1,0],[0,1,0]], tile: "side",   shade: 0.7 }
  ];

  function isOpaque(b) {
    if (b === B.AIR || b === B.WATER) return false;
    var def = BLOCKS[b];
    return def ? !def.cross : false;
  }

  function buildChunk(cx, cz) {
    var pos = [], nor = [], uvs = [], col = [], ind = [];
    var wpos = [], wnor = [], wuvs = [], wind = [];
    var x0 = cx * CHUNK, z0 = cz * CHUNK;

    for (var x = x0; x < x0 + CHUNK; x++) for (var z = z0; z < z0 + CHUNK; z++) for (var y = MIN_Y; y < SY; y++) {
      var b = data[idx(x, y, z)];
      if (b === B.AIR) continue;
      var def = BLOCKS[b];

      if (def.cross) {
        addCross(pos, nor, uvs, col, ind, x, y, z, def);
        continue;
      }

      var isWater = def.water;
      for (var f = 0; f < FACES.length; f++) {
        var face = FACES[f];
        var nb = getBlock(x + face.dir[0], y + face.dir[1], z + face.dir[2]);
        if (isWater) {
          if (nb !== B.AIR) continue;              // water: only faces touching air
        } else {
          if (isOpaque(nb)) continue;              // solid: cull against opaque
          if (nb === B.WATER && b === B.WATER) continue;
        }
        var P = isWater ? wpos : pos, N = isWater ? wnor : nor,
            U = isWater ? wuvs : uvs, I = isWater ? wind : ind;
        var vi = P.length / 3;
        var uv = Textures.uv(def.tiles[face.tile] !== undefined ? def.tiles[face.tile] : def.tiles.side);
        var uvC = [[uv.u0, uv.v0], [uv.u1, uv.v0], [uv.u0, uv.v1], [uv.u1, uv.v1]];
        for (var v = 0; v < 4; v++) {
          var c = face.corners[v];
          var yTop = (isWater && face.tile === "top") ? 0.88 : c[1];
          P.push(x + c[0], y + yTop, z + c[2]);
          N.push(face.dir[0], face.dir[1], face.dir[2]);
          U.push(uvC[v][0], uvC[v][1]);
          if (!isWater) col.push(face.shade, face.shade, face.shade);
        }
        I.push(vi, vi + 1, vi + 2, vi + 2, vi + 1, vi + 3);
      }
    }

    var out = { solid: null, water: null };
    if (ind.length) {
      var geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(ind);
      out.solid = new THREE.Mesh(geo, material);
    }
    if (wind.length) {
      var wgeo = new THREE.BufferGeometry();
      wgeo.setAttribute("position", new THREE.Float32BufferAttribute(wpos, 3));
      wgeo.setAttribute("normal", new THREE.Float32BufferAttribute(wnor, 3));
      wgeo.setAttribute("uv", new THREE.Float32BufferAttribute(wuvs, 2));
      wgeo.setIndex(wind);
      out.water = new THREE.Mesh(wgeo, waterMaterial);
    }
    return out;
  }

  function addCross(pos, nor, uvs, col, ind, x, y, z, def) {
    var uv = Textures.uv(def.tiles.top);
    var quads = [
      [[0.15, 0, 0.15], [0.85, 0, 0.85], [0.15, 1, 0.15], [0.85, 1, 0.85]],
      [[0.85, 0, 0.15], [0.15, 0, 0.85], [0.85, 1, 0.15], [0.15, 1, 0.85]]
    ];
    quads.forEach(function (q) {
      var vi = pos.length / 3;
      var uvC = [[uv.u0, uv.v0], [uv.u1, uv.v0], [uv.u0, uv.v1], [uv.u1, uv.v1]];
      for (var v = 0; v < 4; v++) {
        pos.push(x + q[v][0], y + q[v][1], z + q[v][2]);
        nor.push(0, 1, 0);
        uvs.push(uvC[v][0], uvC[v][1]);
        col.push(1, 1, 1);
      }
      ind.push(vi, vi + 1, vi + 2, vi + 2, vi + 1, vi + 3);
      ind.push(vi + 2, vi + 1, vi, vi + 3, vi + 1, vi + 2); // double-sided
    });
  }

  var chunkSlots = [];   // per chunk: {solid, water}
  function rebuildChunk(cx, cz) {
    var i = cz * CX + cx;
    var slot = chunkSlots[i];
    if (slot) {
      if (slot.solid) { chunkGroup.remove(slot.solid); slot.solid.geometry.dispose(); chunkMeshes.splice(chunkMeshes.indexOf(slot.solid), 1); }
      if (slot.water) { chunkGroup.remove(slot.water); slot.water.geometry.dispose(); waterMeshes.splice(waterMeshes.indexOf(slot.water), 1); }
    }
    var built = buildChunk(cx, cz);
    chunkSlots[i] = built;
    if (built.solid) { chunkGroup.add(built.solid); chunkMeshes.push(built.solid); }
    if (built.water) { chunkGroup.add(built.water); waterMeshes.push(built.water); }
  }

  function rebuildAll() {
    if (chunkGroup) scene.remove(chunkGroup);
    chunkMeshes.length = 0; waterMeshes.length = 0;
    chunkSlots = new Array(CX * CZ).fill(null);
    chunkGroup = new THREE.Group();
    scene.add(chunkGroup);
    for (var cz = 0; cz < CZ; cz++) for (var cx = 0; cx < CX; cx++) rebuildChunk(cx, cz);
  }

  /* ----- public API ----- */
  function init(sc) {
    scene = sc;
    var tex = Textures.build();
    material = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, alphaTest: 0.5 });
    waterMaterial = new THREE.MeshLambertMaterial({ map: tex, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
  }

  function loadWorld(worldId) {
    currentDef = WORLD_DEFS.find(function (w) { return w.id === worldId; }) || WORLD_DEFS[0];
    generate(currentDef);
    var edits = Save.worldEdits(currentDef.id);
    Object.keys(edits).forEach(function (key) {
      var p = key.split(",");
      var x = +p[0], y = +p[1], z = +p[2];
      if (inBounds(x, y, z)) data[idx(x, y, z)] = edits[key];
    });
    rebuildAll();
    return currentDef;
  }

  function setBlock(x, y, z, id) {
    if (!inBounds(x, y, z)) return;
    data[idx(x, y, z)] = id;
    Save.worldEdits(currentDef.id)[x + "," + y + "," + z] = id;
    Save.save();
    var cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    rebuildChunk(cx, cz);
    var lx = x % CHUNK, lz = z % CHUNK;
    if (lx === 0 && cx > 0) rebuildChunk(cx - 1, cz);
    if (lx === CHUNK - 1 && cx < CX - 1) rebuildChunk(cx + 1, cz);
    if (lz === 0 && cz > 0) rebuildChunk(cx, cz - 1);
    if (lz === CHUNK - 1 && cz < CZ - 1) rebuildChunk(cx, cz + 1);
  }

  function surfaceY(x, z) {
    for (var y = SY - 1; y > 0; y--) {
      var b = getBlock(x, y, z);
      if (b !== B.AIR && !BLOCKS[b].cross && b !== B.WATER) return y;
    }
    return 1;
  }

  function isSolid(x, y, z) {
    var b = getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return b !== B.AIR && BLOCKS[b] && BLOCKS[b].solid;
  }

  function isWaterAt(x, y, z) {
    return getBlock(Math.floor(x), Math.floor(y), Math.floor(z)) === B.WATER;
  }

  return {
    init: init, loadWorld: loadWorld, getBlock: getBlock, setBlock: setBlock,
    surfaceY: surfaceY, isSolid: isSolid, isWaterAt: isWaterAt,
    get meshes() { return chunkMeshes; },
    get def() { return currentDef; },
    SX: SX, SY: SY, SZ: SZ, MIN_Y: MIN_Y
  };
})();
