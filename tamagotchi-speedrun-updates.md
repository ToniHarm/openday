# Tamagotchi Speedrun — Brainstorm / Updates Log

Raw ideas as they come, unfiltered — this is a scratchpad, not the build spec. Once something here is actually decided, it should get folded into `tamagotchi-speedrun-application-spec.md` (or the relevant doc, if it's about `face-the-internet` or the booth setup more broadly instead).

---

## Updates

### Character customization — done
- **Built:** a 5-swatch color picker + optional 10-character pet name on the Start screen, before hatching.
- The chosen color is the pet's base identity through Baby/Child; at the ~40s branch point, the locked-in form (Glimmerling/Wobblet/Grumplet) tints that same base color — brighter/more saturated for Glimmerling, desaturated for Wobblet, desaturated-and-darker for Grumplet — so the result is genuinely "your pick + your care," not just a fixed color per form.
- The pet's name shows during play and on the result screen ("SPARKLES the GLIMMERLING"); it's separate from the leaderboard name entry (player identity vs. pet identity).
- Selection persists across "go again" (defaults to your last pick) rather than resetting each run.

### More interactive care (again)
- Wants the caretaking part even more interactive than the current drag/tap/hold gesture set — see Talking Angela note below, likely the main lever for this.

### Mini-games for Play — decided: occasional bonus round
- **Decided:** mini-game is a bonus round, not a replacement for the core tap/combo Play mechanic
- Claude's proposal for the details (not yet confirmed):
  - Trigger: landing a combo in normal Play gives a shot at the bonus round (rather than a random chance or its own fixed schedule — avoids adding a 5th independent timer alongside poop/discipline/sickness/bedtime)
  - Format: Flappy-style, ~5-8s, tap-to-flap through a couple obstacles
  - Reward: bigger than a normal tap — e.g. +15-20 happy on success, small +2 consolation on a miss
  - **Decided:** everything else pauses during the bonus round — no-risk reward, hunger/poop/discipline/sickness decay all hold while it's active

### Instructions displayed longer — done
- **Decided (2026-09-22):** tap-to-continue, not a fixed duration.
- **Built:** the icon legend now advances the moment the player taps anywhere on it, with a 7s auto-advance fallback (~8.5s total from hatch) for anyone who doesn't tap. Serves first-timers (who get the longer fallback if they need it) and repeat players (who can skip through instantly) without picking one fixed number for everyone.

### Pet visibly gets dirty (poop feedback)
- Wants the pet itself to visibly get dirty so it's obvious cleaning is needed, not just the poop icon sitting next to it
- Claude's proposal: layer 1-2 small dirt/smudge pixels directly onto the pet sprite as soon as poop spawns, using a muddy-brown addition to the pixel palette. At the same ~15s-uncleaned mark that already triggers the happy-drain and sickness-risk bump (§5.5), escalate to a second, more visibly dirty tier (more/bigger smudges, maybe a grossed-out expression) — ties the visual escalation to the mechanical one instead of being a separate system. Cleaning clears it back to the sprite's normal state instantly, same moment as the existing tidy-bonus.
- Fits cleanly into the existing pixel-sprite rendering (§7) as one more overlay layer, driven by state already being tracked (`poopPresent`, `poopSpawnedAt`) — no new state needed.

### Distinct shapes per growth stage, not just bigger
- Wants each growth stage to look meaningfully different, not just a scaled-up version of the same sprite
- Claude's proposal: give Egg/Baby/Child/each final form its own hand-designed pixel grid (silhouette, not just size):
  - Egg: rounded oval, patterned (could pick up the customization color if that lands)
  - Baby: small simple round blob, minimal features, no limbs
  - Child: slightly bigger, gains stubby limb-nubs, rounder cheeks, bigger eyes — reads as "developing," not just "baby but scaled up"
  - Glimmerling (good care): tall, smooth, symmetrical, sparkle/star accessory, bright saturated color
  - Wobblet (mixed care): asymmetric silhouette, lopsided lump, tilted posture, two-tone patchy color
  - Grumplet (neglected): smaller/hunched, spiky messy tufts, furrowed brow baked into the sprite, duller color
- That's ~6 distinct grids total instead of one grid scaled through stages — real but small scope increase, each grid is just a short character array like the example already in §7
- Optional extra (not required): give each stage its own idle motion too (baby gentle bob, Wobblet literal side-to-side wobble, Grumplet arms-crossed foot-tap) — reinforces the distinct identity further, ties into the Talking Angela idle-personality idea below

### "Talking Angela" style interactivity
- Wants the care experience to feel more like Talking Angela/Talking Tom
- Cheap-to-add pieces (not yet decided): reactive touch animations even outside formal gestures (giggle/wiggle/blush on any tap), eyes tracking the pointer or a dragged food item, idle personality animations (blink/stretch/little dance) instead of sitting static
- Bigger-lift piece: voice mimicry (mic access + recording + pitch-shifted playback) — **decided: not in scope**, no mic/voice interaction in this game.
