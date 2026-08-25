"use strict";
/* ============================================================
   AUDIO — text-to-speech (the "teacher voice") and tiny
   oscillator sound effects. No audio files needed.
   ============================================================ */
var GameAudio = (function () {
  var ctx = null;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /* ---------- speech ---------- */
  var voice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    var vs = speechSynthesis.getVoices();
    var prefs = ["Samantha", "Google US English", "Karen", "Daniel"];
    for (var i = 0; i < prefs.length; i++) {
      for (var j = 0; j < vs.length; j++) {
        if (vs[j].name.indexOf(prefs[i]) >= 0) { voice = vs[j]; return; }
      }
    }
    for (var k = 0; k < vs.length; k++) {
      if (vs[k].lang && vs[k].lang.indexOf("en") === 0) { voice = vs[k]; return; }
    }
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function say(text, rate) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = rate || 0.85;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  }

  function sayLetter(ch) { say(ch === "a" ? "ay" : ch, 0.9); }

  /* ---------- sfx ---------- */
  function tone(freq, dur, type, vol, when) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (when || 0);
    var o = a.createOscillator();
    var g = a.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur);
  }

  var sfx = {
    mine:    function () { tone(180, 0.08, "square", 0.10); tone(120, 0.10, "square", 0.08, 0.05); },
    place:   function () { tone(260, 0.07, "square", 0.10); tone(330, 0.07, "square", 0.08, 0.05); },
    pop:     function () { tone(520, 0.06, "triangle", 0.12); },
    correct: function () { tone(523, 0.1, "triangle", 0.14); tone(659, 0.1, "triangle", 0.14, 0.09); tone(784, 0.16, "triangle", 0.14, 0.18); },
    wrong:   function () { tone(220, 0.18, "sawtooth", 0.06); },
    levelup: function () { [523,587,659,784,1047].forEach(function (f, i) { tone(f, 0.14, "triangle", 0.14, i * 0.1); }); },
    gem:     function () { tone(880, 0.08, "triangle", 0.12); tone(1320, 0.12, "triangle", 0.10, 0.06); },
    quest:   function () { tone(392, 0.12, "triangle", 0.12); tone(523, 0.18, "triangle", 0.12, 0.1); },
    step:    function () { tone(90 + Math.random() * 30, 0.04, "square", 0.03); }
  };

  return { say: say, sayLetter: sayLetter, sfx: sfx, unlock: ac };
})();
