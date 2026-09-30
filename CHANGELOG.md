# Changelog

All notable changes to the `tamagotchi-speedrun.html` booth game are logged here.

## 2026-09-24 — Hand tracking (webcam gestures, additive)

The remaining item from `tamagotchi-speedrun-updates.md`, built after confirming scope:
additive input layer (touch stays default), full gesture set including the motion
gestures.

**Added**
- **Hand tracking toggle** — an opt-in "🖐 HAND TRACKING (BETA)" button on the Start
  screen. Tapping it requests the camera and loads `@mediapipe/tasks-vision`'s
  HandLandmarker from CDN (GPU delegate, falling back to CPU on unsupported
  hardware). Any failure — no camera, no internet, model load error — just leaves
  it off with an "unavailable" status message; the touch game is never blocked or
  degraded by it. Camera frames stay on-device (inference runs locally); only the
  library and model files are fetched over the network, once.
- **Gesture set**, all routed through the exact same functions touch input already
  uses, so there's one source of truth per action:
  - Pinch (thumb+index together) → feed, whatever's in the current food slot
  - Open palm held over the pet with a little stroking wiggle → pet/sleep, reusing
    the same press/hold timing touch has (so tap-vs-hold resolves identically
    regardless of input method)
  - A quick fist → a play tap
  - A pointing finger → scold, resolving an active attention call
  - A fast lateral wipe with an open-ish hand → clean, when poop is present
  - A quick upward hand flick → flap, during the bonus round
- **Camera preview** — a small mirrored thumbnail (top-left of the pet during Play)
  showing the live feed, landmark dots, and the currently recognized gesture label;
  tapping it stops tracking and reverts to touch-only for the rest of the session.

**Changed**
- Refactored the pet-press logic (`beginPetPress`) and the food-eating resolution
  (`resolveFoodEaten`) out of their touch event handlers into standalone functions,
  so gesture-triggered actions and touch-triggered actions share one implementation
  instead of two that could drift apart.

**Known limitations / simplifications**
- No spatial targeting — gestures are recognized by hand shape and motion alone,
  not by where in the camera frame the hand appears, since there's no on-screen
  crosshair for a booth player to aim with. "Pinch and move toward the pet" became
  just "pinch"; "wipe across the poop" became "wipe, if poop is present."
- Single-hand tracking only (`numHands: 1`); no two-hand clap gesture.
- All gesture thresholds (pinch distance, finger-extended ratio, wipe/flick
  velocity, per-gesture cooldowns) are a first pass pending playtesting with a
  real camera and real hands.
- Requires internet once per session to load the vision library and hand model
  from CDN — the feature is explicitly additive so this never affects the
  touch-only baseline the booth otherwise runs offline.

## 2026-09-23 — Bonus round, dirty pet, distinct baby/child shapes, idle reactions

The remaining items from `tamagotchi-speedrun-updates.md`, built from Claude's stated
proposals in that doc (voice mimicry stays out of scope, as already decided there).

**Added**
- **Bonus round** — landing a normal-play combo (3 taps within 1s) now gives a shot
  at a ~7s Flappy-style tap-to-flap interlude, as long as no other event (sickness,
  poop, bedtime, an attention call) is already active. Everything else pauses while
  it's active — no stat decay, no schedulers, no survival-time increment — since it's
  meant as a no-risk reward, not an extra hazard. Success pays +18 happy, a miss still
  pays a +2 consolation. A short cooldown (6s) keeps combos from chain-triggering it.
- **Pet gets visibly dirty** — once poop is uncleaned, 1-2 small dirt smudges layer
  onto the pet sprite immediately; at the same ~15s mark that already drains happy
  and raises sickness risk (`POOP_UNCLEANED_HAPPY_THRESHOLD_MS`), the smudges escalate
  to a heavier, darker tier and the pet's expression switches to a scrunched
  "grossed out" squint. Cleaning clears both instantly.
- **Distinct baby/child sprites** — Baby is now its own small, minimal, limbless
  pixel grid (previously it just showed the adult "glimmerling" shape scaled down).
  Child gains a stubby limb-nub row and a bigger frame. The three adult forms already
  had distinct shapes from the authenticity pass; this fills in the two younger stages.
- **Idle personality reactions** (the cheap "Talking Angela" pieces — voice mimicry
  is still explicitly out of scope): eyes now track the pointer with a small pupil
  shift, the pet blinks on its own every ~2.5-5.5s, and any tap on the pet triggers a
  quick squish/bounce animation on the sprite itself.

**Known limitations / open items carried forward**
- Bonus round numeric tuning (duration, gravity, pipe speed/gap, reward size, combo
  cooldown) is a first pass pending playtesting, same as the rest of the game's tuning.
- No mini-game difficulty ramp — every bonus round plays the same regardless of how
  far into the run it triggers.

## 2026-09-22 — Customization + legend timing

Two items from `tamagotchi-speedrun-updates.md`, built after confirming scope.

**Added**
- Character customization on the Start screen: a 5-color swatch picker plus an
  optional pet name (10 chars). The picked color carries through as the pet's
  base identity at Baby/Child, then gets tinted by the locked-in evolution
  form at the ~40s branch point (brighter/more saturated for Glimmerling,
  desaturated for Wobblet, desaturated-and-darker for Grumplet) — a two-axis
  "your pick + your care" result per run. The pet's name shows during play
  and on the result screen, separate from the leaderboard's player-name entry.

**Changed**
- The hatching icon legend no longer auto-advances on a fixed timer. It now
  advances on tap (repeat players can skip through immediately) with a 7s
  fallback (~8.5s total from hatch) for anyone who doesn't tap.

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
