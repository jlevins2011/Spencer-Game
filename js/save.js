"use strict";
/* ============================================================
   SAVE / LOAD  (localStorage) + STATS TRACKING
   World edits are stored as sparse diffs per world so terrain
   regenerates from the seed and edits replay on top.
   ============================================================ */
var Save = (function () {
  var activeKey = null;

  function freshData() {
    var startLevel = (CONFIG.ACTIVE && CONFIG.ACTIVE.startLevel) || 1;
    return {
      version: 2,
      player: {
        xp: 0, level: startLevel, gems: 0,
        pickTier: 0,                 // 0 wood, 1 stone, 2 iron, 3 diamond
        world: "meadow",
        inventory: {},               // blockName -> count
        tools: {}                    // special tools from Daddy: drill, thunder
      },
      daddy: { wins: 0 },            // super-challenge wins
      reading: { tier: 0, tierWins: 0 },
      spelling: { tier: 0, tierWins: 0 },
      worlds: {},                    // worldId -> { edits: {"x,y,z": blockId} }
      quests: { active: null, completed: 0 },
      stats: {
        weekStart: Date.now(),
        lastReportAt: 0,
        playMs: 0,
        daysPlayed: [],              // "YYYY-MM-DD" strings this week
        challenges: {},              // skill -> {tries, clean, mistakes}
        wordStats: {},               // word -> {win, miss}
        lifetime: { challenges: 0, clean: 0, gems: 0, blocksMined: 0, blocksPlaced: 0, quests: 0 }
      }
    };
  }

  var data = freshData();

  // profile: an entry from CONFIG.PLAYERS
  function load(profile) {
    activeKey = profile.saveKey;
    data = freshData();
    try {
      var raw = localStorage.getItem(activeKey);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === 2) {
          // merge over fresh so newly added fields get defaults
          data = Object.assign(freshData(), parsed);
          data.player = Object.assign(freshData().player, parsed.player);
          data.stats = Object.assign(freshData().stats, parsed.stats);
          if (!data.player.tools) data.player.tools = {};
        }
      }
    } catch (e) { /* corrupted save -> start fresh */ }
    Save.data = data;
  }

  var saveTimer = null;
  function save() {
    if (saveTimer || !activeKey) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      try { localStorage.setItem(activeKey, JSON.stringify(data)); } catch (e) {}
    }, 250);
  }

  function reset() {
    data = freshData();
    Save.data = data;
    if (activeKey) {
      try { localStorage.setItem(activeKey, JSON.stringify(data)); } catch (e) {}
    }
  }

  // read another profile's level without switching to it (title screen)
  function peekLevel(profile) {
    try {
      var raw = localStorage.getItem(profile.saveKey);
      if (raw) return JSON.parse(raw).player.level;
    } catch (e) {}
    return null;
  }

  function worldEdits(worldId) {
    if (!data.worlds[worldId]) data.worlds[worldId] = { edits: {} };
    return data.worlds[worldId].edits;
  }

  return { load: load, save: save, reset: reset, worldEdits: worldEdits, peekLevel: peekLevel, data: data };
})();


/* ================= STATS ================= */
var Stats = (function () {
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function touchDay() {
    var s = Save.data.stats;
    var k = todayKey();
    if (s.daysPlayed.indexOf(k) < 0) s.daysPlayed.push(k);
  }

  function recordChallenge(challenge, result) {
    var s = Save.data.stats;
    touchDay();
    var skill = challenge.skill || challenge.kind;
    if (!s.challenges[skill]) s.challenges[skill] = { tries: 0, clean: 0, mistakes: 0 };
    var c = s.challenges[skill];
    c.tries += 1;
    c.mistakes += result.mistakes;
    if (result.correct && result.mistakes === 0) c.clean += 1;

    var word = (challenge.word || "").toLowerCase();
    if (word) {
      if (!s.wordStats[word]) s.wordStats[word] = { win: 0, miss: 0 };
      if (result.mistakes > 0) s.wordStats[word].miss += 1;
      else s.wordStats[word].win += 1;
    }

    s.lifetime.challenges += 1;
    if (result.correct && result.mistakes === 0) s.lifetime.clean += 1;
    Save.save();
  }

  function recordMine()  { Save.data.stats.lifetime.blocksMined  += 1; touchDay(); }
  function recordPlace() { Save.data.stats.lifetime.blocksPlaced += 1; }
  function recordQuest() { Save.data.stats.lifetime.quests += 1; Save.save(); }
  function recordGems(n) { Save.data.stats.lifetime.gems += n; }

  var lastTick = Date.now();
  function tickPlaytime() {
    var now = Date.now();
    if (now - lastTick < 5 * 60 * 1000) Save.data.stats.playMs += (now - lastTick);
    lastTick = now;
  }

  // Reset the rolling weekly window (called after a report is sent/shown)
  function rollWeek() {
    var s = Save.data.stats;
    s.weekStart = Date.now();
    s.playMs = 0;
    s.daysPlayed = [];
    s.challenges = {};
    // keep wordStats: struggle words should persist until mastered,
    // but decay them so old misses fade
    Object.keys(s.wordStats).forEach(function (w) {
      var ws = s.wordStats[w];
      ws.miss = Math.floor(ws.miss / 2);
      ws.win  = Math.floor(ws.win  / 2);
      if (ws.miss === 0 && ws.win === 0) delete s.wordStats[w];
    });
    Save.save();
  }

  return {
    recordChallenge: recordChallenge, recordMine: recordMine, recordPlace: recordPlace,
    recordQuest: recordQuest, recordGems: recordGems, tickPlaytime: tickPlaytime,
    rollWeek: rollWeek
  };
})();
