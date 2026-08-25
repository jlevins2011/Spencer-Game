"use strict";
/* ============================================================
   PARENT REPORTS — the hidden grown-ups dashboard and the
   weekly email report (via a Formspree endpoint in CONFIG).
   ============================================================ */
var Reports = (function () {

  function fmtMinutes(ms) {
    var m = Math.round(ms / 60000);
    if (m < 60) return m + " min";
    return Math.floor(m / 60) + " hr " + (m % 60) + " min";
  }

  function accuracy(c) {
    if (!c || !c.tries) return null;
    return Math.round((c.clean / c.tries) * 100);
  }

  function struggleWords(limit) {
    var ws = Save.data.stats.wordStats;
    return Object.keys(ws)
      .filter(function (w) { return ws[w].miss > 0 && ws[w].miss >= ws[w].win; })
      .sort(function (a, b) { return ws[b].miss - ws[a].miss; })
      .slice(0, limit || 6);
  }

  function masteredWords(limit) {
    var ws = Save.data.stats.wordStats;
    return Object.keys(ws)
      .filter(function (w) { return ws[w].win >= 2 && ws[w].miss === 0; })
      .sort(function (a, b) { return ws[b].win - ws[a].win; })
      .slice(0, limit || 8);
  }

  var SKILL_LABELS = {
    sight: "Sight words (recognize on sight)",
    phonics: "Phonics (sounding out)",
    sentences: "Sentence reading",
    spot: "Spotting correct spellings",
    spelling: "Spelling words out"
  };

  function buildTextReport() {
    var s = Save.data.stats;
    var p = Save.data.player;
    var tier = Learning.currentFocus();
    var lines = [];
    lines.push("CRAFTWORLDS — WEEKLY PROGRESS REPORT for " + CONFIG.PLAYER_NAME);
    lines.push("Week of " + new Date(s.weekStart).toLocaleDateString());
    lines.push("");
    lines.push("PLAY THIS WEEK");
    lines.push("- Time played: " + fmtMinutes(s.playMs));
    lines.push("- Days played: " + s.daysPlayed.length);
    lines.push("- Game level: " + p.level + " (" + UI.rankFor(p.level) + "), " + p.gems + " gems");
    lines.push("");
    lines.push("PRACTICE THIS WEEK");
    Object.keys(s.challenges).forEach(function (k) {
      var c = s.challenges[k];
      var acc = accuracy(c);
      lines.push("- " + (SKILL_LABELS[k] || k) + ": " + c.tries + " tries, " +
        (acc === null ? "n/a" : acc + "% right on the first try"));
    });
    if (!Object.keys(s.challenges).length) lines.push("- (no challenges this week)");
    lines.push("");
    lines.push("CURRENT FOCUS: " + tier.name + " — " + tier.focus);
    lines.push("");
    var struggles = struggleWords();
    lines.push("TRICKY WORDS" + (struggles.length ? ":" : ": none this week 🎉"));
    struggles.forEach(function (w) { lines.push("- " + w); });
    if (struggles.length) {
      lines.push("");
      lines.push("TIP: Sneak these into car rides or bedtime — spot them on signs,");
      lines.push("spell them out loud, no pressure. They'll come back around in the game too.");
    }
    var mastered = masteredWords();
    if (mastered.length) {
      lines.push("");
      lines.push("WORDS NAILED: " + mastered.join(", "));
    }
    lines.push("");
    lines.push("Lifetime: " + s.lifetime.challenges + " reading challenges, " +
      s.lifetime.blocksMined + " blocks mined, " + s.lifetime.blocksPlaced +
      " blocks built, " + s.lifetime.quests + " sister quests done.");
    return lines.join("\n");
  }

  function send(callback) {
    if (!CONFIG.REPORT_ENDPOINT) { if (callback) callback(false); return; }
    fetch(CONFIG.REPORT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        subject: "CraftWorlds weekly report — " + CONFIG.PLAYER_NAME,
        message: buildTextReport()
      })
    }).then(function (r) {
      if (r.ok) {
        Save.data.stats.lastReportAt = Date.now();
        Stats.rollWeek();
      }
      if (callback) callback(r.ok);
    }).catch(function () { if (callback) callback(false); });
  }

  // called on startup: auto-send when a week has passed
  function maybeAutoSend() {
    if (!CONFIG.REPORT_ENDPOINT) return;
    var last = Save.data.stats.lastReportAt || Save.data.stats.weekStart;
    if (Date.now() - last > CONFIG.REPORT_EVERY_DAYS * 24 * 3600 * 1000) {
      send(function (ok) {
        if (ok) console.log("Weekly report sent.");
      });
    }
  }

  /* ---------- dashboard HTML (rendered by UI.showParent) ---------- */
  function dashboardHtml() {
    var s = Save.data.stats;
    var p = Save.data.player;
    var tier = Learning.currentFocus();
    var struggles = struggleWords();
    var mastered = masteredWords();

    var skillRows = Object.keys(s.challenges).map(function (k) {
      var c = s.challenges[k];
      var acc = accuracy(c);
      return "<tr><td>" + (SKILL_LABELS[k] || k) + "</td><td>" + c.tries +
        "</td><td>" + (acc === null ? "–" : acc + "%") + "</td></tr>";
    }).join("");

    var craft = UI.nextCraftInfo();

    return "" +
      "<div class='ch-title'>👨‍👩‍👧 Grown-Ups Report: " + CONFIG.PLAYER_NAME + "</div>" +
      "<div class='parent-scroll'>" +
      "<div class='pr-section'><b>This week</b><br>" +
      "⏱ " + fmtMinutes(s.playMs) + " over " + s.daysPlayed.length + " day(s) · " +
      "Level " + p.level + " (" + UI.rankFor(p.level) + ") · 💎 " + p.gems + "</div>" +

      "<div class='pr-section'><b>Practice</b>" +
      (skillRows ? "<table class='pr-table'><tr><th>Skill</th><th>Tries</th><th>First-try</th></tr>" + skillRows + "</table>"
                 : "<br>No challenges yet this week.") + "</div>" +

      "<div class='pr-section'><b>Working on now:</b> " + tier.name + "<br><i>" + tier.focus + "</i></div>" +

      "<div class='pr-section'><b>Tricky words:</b> " +
      (struggles.length ? struggles.join(", ") : "none right now 🎉") +
      (struggles.length ? "<br><i>The game is quietly repeating these. Bonus: point them out on signs or spell them in the car.</i>" : "") + "</div>" +

      (mastered.length ? "<div class='pr-section'><b>Recently mastered:</b> " + mastered.join(", ") + "</div>" : "") +

      "<div class='pr-section'><b>Lifetime:</b> " + s.lifetime.challenges + " challenges · " +
      s.lifetime.blocksMined + " mined · " + s.lifetime.blocksPlaced + " built · " +
      s.lifetime.quests + " quests</div>" +

      "<div class='pr-section'><b>Weekly email:</b> " +
      (CONFIG.REPORT_ENDPOINT
        ? "ON — sends every " + CONFIG.REPORT_EVERY_DAYS + " days.<br><button class='big-btn small-btn' id='pr-send'>📧 SEND REPORT NOW</button>"
        : "OFF — see README for the 2-minute Formspree setup.") + "</div>" +
      "</div>" +
      "<button class='big-btn' id='pr-close'>CLOSE</button>" +
      "<button class='ghost-btn danger' id='pr-reset'>🗑 Reset all progress</button>";
  }

  return { buildTextReport: buildTextReport, send: send, maybeAutoSend: maybeAutoSend, dashboardHtml: dashboardHtml };
})();
