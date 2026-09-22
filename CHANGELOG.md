# Changelog

All notable changes to the `tamagotchi-speedrun.html` booth game are logged here.

## 2026-09-22 — Authenticity pass

Rebuilt the mechanics to track the real 1997 Tamagotchi's actual systems, replacing
the simpler single-stat version below.

**Added**
- **Discipline** meter — built by responding to random "attention calls" with a
  scold (tap), never decays on its own.
- **Weight** — raised by feeding Snacks (never lowered in this version; see
  Known limitations).
- **Sickness** — a probabilistic roll influenced by uncleaned poop and being
  overweight; cured by dragging Medicine to the mouth; fatal if left
  unresolved for ~15s.
- **Poop** — spawns periodically, cleaned by dragging to a fixed toilet zone;
  left uncleaned it drains Happy and raises the sickness risk.
- **Bedtime** — a single scripted day/night event at the ~40s branch point;
  holding the pet during the window resolves it correctly, missing it costs
  Happy.
- **Branching evolution** — at ~40s, accumulated care quality (average
  Hunger/Happy, Discipline, Weight, whether sickness was ever left
  unresolved) locks the pet into one of three adult forms: Glimmerling
  (good care), Wobblet (mixed care), or Grumplet (neglected).
- **Pixel-art rendering** — pet, food, medicine, and poop are now drawn as
  fixed-resolution pixel grids on `<canvas>` (smoothing disabled), not SVG.
- **Device-shell framing** — the game now renders inside an illustrated
  egg-shaped toy shell with an inset LCD-style screen and decorative
  (non-functional) A/B/C buttons.
- **Press Start 2P** pixel font for all in-screen text, vendored locally
  (`fonts/PressStart2P-Regular.ttf`, OFL-licensed) so the game still runs
  with zero network calls.
- Meters switched from continuous bars to discrete heart pips (5 per meter),
  matching the real toy's display.

**Changed**
- Hunger/Happy decay rates eased down slightly (from ~1.1 combined to 1.0/0.9)
  since more systems now compete for the player's attention.
- Hatching screen now includes a ~2s icon legend flash (feed/play/clean/sleep)
  before play starts, as a compressed stand-in for the instruction manual.
- Leaderboard entries now store and display which adult form was reached
  (or none, for a run lost before the branch point).

**Removed**
- The standalone **Energy** stat — the real toy doesn't have one; its role is
  now covered by the scripted Sleep event instead of a continuously-drained
  resource.

**Known limitations (carried from the spec's own open items)**
- Weight is one-directional — only Snacks raise it, nothing lowers it.
- All numeric tuning (decay rates, event cadences, sickness-roll
  probabilities, evolution weights) are starting points pending a real
  playtesting pass.
- Palette, pixel art, and shell framing need a sanity check against an
  actual rendered build, especially the heart-pip meters' legibility at
  booth viewing distance.
- End-of-day leaderboard reset exists (long-press the leaderboard title,
  staff-only) but hasn't been tested on real hardware.
- No real-hardware pass yet (frame rate, touch responsiveness) — needs
  testing on the actual booth laptop before the event.

---

## 2026-09-22 — Initial build

First playable version of the booth game.

**Added**
- Three-stat model (Hunger, Happy, Energy) with continuous decay.
- Three care gestures: drag to feed, tap to play (with a 3-tap combo
  bonus), hold to sleep — with tap-vs-hold disambiguation via a 200ms
  threshold.
- Timed evolution through 3 visual stages (Baby → Growing → Thriving)
  based on survival time.
- Win at 2:00 survived, loss when any stat hits 0, each with cause-specific
  verdict text.
- `localStorage`-backed leaderboard with name entry (or anonymous skip).
- Generated Web Audio sound cues (no audio files) with a mute toggle.
- Vector/SVG "jelly bean" pet rendering, nostalgic pastel palette.
