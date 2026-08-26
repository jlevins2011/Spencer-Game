"use strict";
/* ============================================================
   PARENT REPORTS — the hidden grown-ups dashboard and the
   weekly email reports. Sends to every linked parent email
   (free, via formsubmit.co). Emails are managed on-device in
   the dashboard; CONFIG can hold defaults too.
   ============================================================ */
var Reports = (function () {
  var EMAILS_KEY = "craftworlds_report_emails";

  /* ---------- linked emails (stored on this device) ---------- */
  function deviceEmails() {
    try {
      var raw = localStorage.getItem(EMAILS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function getEmails() {
    var list = deviceEmails();
    if (list === null) list = (CONFIG.REPORT_EMAILS || []).slice();
    return list;
  }

  function saveEmails(list) {
    try { localStorage.setItem(EMAILS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function addEmail(email) {
    email = (email || "").trim();
    if (!email || email.indexOf("@") < 1 || /\s/.test(email)) return false;
    var list = getEmails();
    if (list.indexOf(email) >= 0) return true;
    list.push(email);
    saveEmails(list);
    return true;
  }

  function removeEmail(email) {
    saveEmails(getEmails().filter(function (e) { return e !== email; }));
  }

  // every place a report should be POSTed
  function targets() {
    var t = getEmails().map(function (e) {
      return { label: e, url: "https://formsubmit.co/ajax/" + e };
    });
    (CONFIG.REPORT_ENDPOINTS || []).forEach(function (u) {
      t.push({ label: u.replace(/^https?:\/\//, "").slice(0, 30) + "…", url: u });
    });
    return t;
  }

  function enabled() { return targets().length > 0; }

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
      .filter(function (w) {
        var s = ws[w];
        if (s.bySkill && Object.keys(s.bySkill).length) {
          return Object.keys(s.bySkill).some(function (k) {
            var b = s.bySkill[k];
            return b.miss > 0 && b.miss >= b.win;
          });
        }
        return s.miss > 0 && s.miss >= s.win;
      })
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
    hear: "Hearing a word and tapping it (auditory recognition)",
    read: "Reading a word independently (no audio)",
    sentences: "Sentence reading",
    picture: "Matching a picture to the written word (meaning)",
    speak: "Saying a written word out loud (experimental)",
    spot: "Spotting correct spellings",
    spelling: "Spelling words out",
    "latin-vocab": "Latin vocabulary (Kraken Latin 1)",
    "latin-spell": "Spelling Latin words",
    "latin-read": "Latin sentence meaning"
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
    lines.push("Lifetime: " + s.lifetime.challenges + " challenges, " +
      s.lifetime.blocksMined + " blocks mined, " + s.lifetime.blocksPlaced +
      " blocks built, " + s.lifetime.quests + " sibling quests, " +
      (Save.data.daddy && Save.data.daddy.wins || 0) + " of Daddy's super challenges won, " +
      (Save.data.mommy && Save.data.mommy.wins || 0) + " of Mommy's.");
    return lines.join("\n");
  }

  // send the active kid's report to every linked email.
  // callback(anyOk, results[]) where results = [{label, ok}]
  function send(callback) {
    var list = targets();
    if (!list.length) { if (callback) callback(false, []); return; }
    var subject = "CraftWorlds weekly report — " + CONFIG.PLAYER_NAME;
    var report = buildTextReport();
    var results = [], pending = list.length;

    function finish() {
      var anyOk = results.some(function (r) { return r.ok; });
      if (anyOk) {
        Save.data.stats.lastReportAt = Date.now();
        Stats.rollWeek();
      }
      if (callback) callback(anyOk, results);
    }

    list.forEach(function (t) {
      fetch(t.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          _subject: subject,          // formsubmit.co subject line
          subject: subject,           // formspree-style fallback
          name: "CraftWorlds Reports",
          message: report
        })
      }).then(function (r) { return r.ok; })
        .catch(function () { return false; })
        .then(function (ok) {
          results.push({ label: t.label, ok: ok });
          pending -= 1;
          if (pending === 0) finish();
        });
    });
  }

  // called on startup: auto-send when a week has passed
  function maybeAutoSend() {
    if (!enabled()) return;
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
      s.lifetime.quests + " quests · 🔥 " + (Save.data.daddy && Save.data.daddy.wins || 0) +
      " Daddy · ☕ " + (Save.data.mommy && Save.data.mommy.wins || 0) +
      " Mommy super-challenge wins</div>" +

      "<div class='pr-section'><b>📧 Weekly email reports</b> (every " + CONFIG.REPORT_EVERY_DAYS + " days, per kid)<br>" +
      (getEmails().length
        ? "<div class='pr-emails'>" + getEmails().map(function (e) {
            return "<div class='pr-email-row'><span>" + e + "</span>" +
              "<button class='pr-email-del' data-email='" + e + "'>✕</button></div>";
          }).join("") + "</div>"
        : "<i>No emails linked yet — add one below.</i>") +
      "<div class='pr-email-add'>" +
      "<input type='email' id='pr-email-input' class='pr-input' placeholder='parent@email.com'>" +
      "<button class='big-btn small-btn' id='pr-email-addbtn'>ADD</button></div>" +
      (getEmails().length
        ? "<button class='big-btn small-btn' id='pr-send'>📧 SEND " + CONFIG.PLAYER_NAME.toUpperCase() + "'S REPORT NOW</button>" +
          "<div id='pr-send-status'></div>" +
          "<i>First time? Each address gets a one-time \"activate\" email from formsubmit.co — click the link in it once, then reports flow automatically.</i>"
        : "") +
      "</div>" +
      "</div>" +
      "<button class='big-btn' id='pr-close'>CLOSE</button>" +
      "<button class='ghost-btn danger' id='pr-reset'>🗑 Reset all progress</button>";
  }

  return {
    buildTextReport: buildTextReport, send: send, maybeAutoSend: maybeAutoSend,
    dashboardHtml: dashboardHtml, getEmails: getEmails, addEmail: addEmail,
    removeEmail: removeEmail, enabled: enabled
  };
})();
