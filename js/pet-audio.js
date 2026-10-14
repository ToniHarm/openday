// Shared audio helper: real recorded sound effects (via the vendored
// Howler.js, js/vendor/howler.min.js) for the highest-value moments, with
// the original oscillator-tone synthesis kept as an automatic fallback for
// everything else and for any environment where a sample fails to load.
// Plain global (window.PetAudio), no modules.
(function () {
  "use strict";

  var audio = { ctx: null, masterGain: null, muted: false };

  // CC0 (Kenney "Interface Sounds") — see js/vendor-licenses/kenney-interface-sounds.LICENSE.txt
  var SAMPLE_FILES = {
    chomp: "sounds/chomp.wav",
    flap: "sounds/flap.wav",
    mash: "sounds/mash.wav",
    turbo: "sounds/turbo.wav",
    win: "sounds/win.wav",
    clean: "sounds/clean.wav",
    serveGood: "sounds/serve-good.wav",
    error: "sounds/error.wav",
    laugh: "sounds/laugh.wav",
    select: "sounds/select.wav",
    discipline: "sounds/discipline.wav",
    bedtime: "sounds/bedtime.wav",
  };
  var howlerOk = typeof Howl !== "undefined";
  var howls = {}; // sample id -> lazily-created Howl instance

  // plays a real sample if one exists for this id and Howler loaded
  // correctly; otherwise (or on that sample's own load failure) calls
  // fallbackFn, which every caller supplies as its existing tone()-based sfx
  function playSample(id, fallbackFn) {
    if (!howlerOk || !SAMPLE_FILES[id]) { if (fallbackFn) fallbackFn(); return; }
    var h = howls[id];
    if (!h) {
      // html5:true is required, not optional, here: Howler's default path
      // decodes audio via Web Audio + XHR, which file:// blocks with a CORS
      // error (the same file:// constraint this whole project is built
      // around) — html5:true instead plays through a plain <audio> element,
      // which loads local files the same way an <img src="local.png"> does
      h = new Howl({ src: [SAMPLE_FILES[id]], volume: 0.6, html5: true });
      h.once("loaderror", function () { if (fallbackFn) fallbackFn(); });
      howls[id] = h;
    }
    h.mute(audio.muted);
    h.play();
  }

  // must be called from a user-gesture handler (click/pointerdown) — browsers
  // block AudioContext creation otherwise
  function ensureContext() {
    if (audio.ctx) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new Ctx();
    audio.masterGain = audio.ctx.createGain();
    audio.masterGain.gain.value = audio.muted ? 0 : 0.2;
    audio.masterGain.connect(audio.ctx.destination);
  }

  function setMuted(muted) {
    audio.muted = muted;
    if (howlerOk) Howler.mute(muted);
    if (!audio.masterGain) return;
    audio.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.2, audio.ctx.currentTime + 0.08);
  }

  function isMuted() { return audio.muted; }

  function tone(freq, durationMs, opts) {
    if (!audio.ctx) return;
    opts = opts || {};
    var type = opts.type || "sine";
    var delayMs = opts.delayMs || 0;
    var peakGain = opts.peakGain != null ? opts.peakGain : 0.5;
    var endFreq = opts.endFreq;

    var t0 = audio.ctx.currentTime + delayMs / 1000;
    var dur = durationMs / 1000;

    var osc = audio.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.linearRampToValueAtTime(endFreq, t0 + dur);

    var g = audio.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peakGain, t0 + Math.min(0.015, dur / 3));
    g.gain.linearRampToValueAtTime(0, t0 + dur);

    osc.connect(g);
    g.connect(audio.masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  window.PetAudio = {
    ensureContext: ensureContext,
    setMuted: setMuted,
    isMuted: isMuted,
    tone: tone,
    playSample: playSample,
  };
})();
