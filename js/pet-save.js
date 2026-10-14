// Shared persistent-pet save system for Tamagotchi Plaza.
// Plain global (window.PetSave), no modules — this project runs from file://
// with no build step, so ES module <script type="module"> would fail on the
// CORS-restricted module fetch. Every page loads this before its own inline
// script and calls into window.PetSave.
(function () {
  "use strict";

  var LEADERBOARD_KEY = "tamagotchi-leaderboard";
  var LEADERBOARD_MAX = 10;
  var HISTORY_MAX = 20;
  var SCHEMA_VERSION = 1;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function normalize(str) {
    return String(str == null ? "" : str).trim().toUpperCase();
  }

  function keyFor(name, pin) {
    return "tamagotchi-pet:" + normalize(name) + ":" + normalize(pin);
  }

  function defaultRecord(name, pin, opts) {
    opts = opts || {};
    var now = Date.now();
    return {
      schemaVersion: SCHEMA_VERSION,
      identity: { name: normalize(name), pin: normalize(pin), createdAt: now, lastSeenAt: now },
      appearance: {
        petColor: opts.petColor || "#FF6FB5",
        frameId: opts.frameId || "red-flower",
        growthStage: "baby",
        form: null,
        cosmetics: { owned: [], equipped: { hat: null, accessory: null } },
      },
      stats: { hunger: 100, happy: 100, discipline: 0, weight: 50 },
      care: { totalScore: 0.5, sampleCount: 0, lastUpdatedAt: now },
      points: { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
      visits: { home: 0, sky: 0, racetrack: 0, clubhouse: 0, shop: 0, restaurant: 0 },
      history: [],
    };
  }

  function load(key) {
    if (!key) return null;
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var record = JSON.parse(raw);
      if (!record || typeof record !== "object") return null;
      return record;
    } catch (e) { return null; }
  }

  function save(record) {
    if (!record || !record.identity) return record;
    try {
      var key = keyFor(record.identity.name, record.identity.pin);
      localStorage.setItem(key, JSON.stringify(record));
    } catch (e) { /* storage unavailable */ }
    return record;
  }

  // fails (rather than overwriting) if the name+PIN is already taken — forces
  // a "wrong PIN? try resuming instead" UX rather than clobbering someone
  // else's pet on a shared booth device
  function createPet(name, pin, opts) {
    var key = keyFor(name, pin);
    if (load(key)) return { ok: false, reason: "exists", record: null };
    var record = defaultRecord(name, pin, opts);
    save(record);
    return { ok: true, record: record };
  }

  function evaluateForm(totalScore) {
    if (totalScore >= 0.70) return "glimmerling";
    if (totalScore >= 0.40) return "wobblet";
    return "grumplet";
  }

  // the one call every location makes at its natural "round over" point.
  // careDelta (0..1, optional) folds into a running EMA that replaces the
  // old one-shot computeCareScore()/evaluateForm() — evolution can now
  // update continuously instead of being frozen at a single Reveal moment.
  function awardPoints(key, amount, opts) {
    opts = opts || {};
    var record = load(key);
    if (!record) return null;
    var location = opts.location || "unknown";
    var careDelta = opts.careDelta != null ? opts.careDelta : null;
    var reason = opts.reason || "";

    record.points.balance = Math.max(0, record.points.balance + amount);
    if (amount > 0) record.points.lifetimeEarned += amount;
    record.visits[location] = (record.visits[location] || 0) + 1;
    record.identity.lastSeenAt = Date.now();

    if (careDelta != null) {
      record.care.totalScore = clamp(record.care.totalScore * 0.8 + careDelta * 0.2, 0, 1);
      record.care.sampleCount += 1;
      record.care.lastUpdatedAt = Date.now();
      record.appearance.form = evaluateForm(record.care.totalScore);
    }

    record.history.unshift({ ts: Date.now(), location: location, points: amount, note: reason });
    if (record.history.length > HISTORY_MAX) record.history.length = HISTORY_MAX;

    save(record);
    return record;
  }

  function spendPoints(key, amount, opts) {
    opts = opts || {};
    var record = load(key);
    if (!record) return { ok: false, record: null };
    if (record.points.balance < amount) return { ok: false, record: record };
    record.points.balance -= amount;
    record.points.lifetimeSpent += amount;
    record.history.unshift({ ts: Date.now(), location: "shop", points: -amount, note: opts.reason || "" });
    if (record.history.length > HISTORY_MAX) record.history.length = HISTORY_MAX;
    save(record);
    return { ok: true, record: record };
  }

  // the pre-existing global "hall of fame" — kept, unchanged shape, now
  // writable from any location's milestone moment, not just Speedrun's
  function loadLeaderboard() {
    try {
      var raw = localStorage.getItem(LEADERBOARD_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function saveLeaderboard(list) {
    try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
  }

  function recordLeaderboardEntry(key, opts) {
    opts = opts || {};
    var record = load(key);
    var name = record ? record.identity.name : "ANON";
    var form = record ? record.appearance.form : null;
    var list = loadLeaderboard();
    list.push({
      name: name,
      score: opts.score || 0,
      form: form,
      verdict: opts.verdict || "",
      timestamp: Date.now(),
    });
    list.sort(function (a, b) { return b.score - a.score; });
    var capped = list.slice(0, LEADERBOARD_MAX);
    saveLeaderboard(capped);
    return capped;
  }

  window.PetSave = {
    keyFor: keyFor,
    createPet: createPet,
    load: load,
    save: save,
    awardPoints: awardPoints,
    spendPoints: spendPoints,
    evaluateForm: evaluateForm,
    loadLeaderboard: loadLeaderboard,
    saveLeaderboard: saveLeaderboard,
    recordLeaderboardEntry: recordLeaderboardEntry,
  };
})();
