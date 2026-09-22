# Meme Mirror 🪩

A quick, fun, interactive booth demo for uni open day. Point a webcam at
yourself, pull faces, and unlock nostalgic meme cards for each expression
you hit — collect all 7 to "pass the vibe check."

- **Facial expression detection** via [face-api.js](https://github.com/justadudewhohacks/face-api.js)
  (TinyFaceDetector + expression model), running entirely client-side.
- **Gamified**: score, streak of unlocks, and a sticker-book style collection
  strip that fills up as visitors make different faces.
- **Fully offline-capable**: the library and model weights are vendored in
  this repo (`js/face-api.min.js`, `models/`), so it works even on venue
  wifi that's flaky or locked down. No images or video ever leave the
  device — nothing is recorded, saved, or uploaded.

## Running it

Browsers only grant camera access on `https://` or `http://localhost`, so
you need a tiny local server — you can't just double-click `index.html`.

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000 in a browser
```

Any other static server works too (`npx serve`, VS Code's Live Server, etc).

## Booth tips

- Use a laptop with a decent front-facing webcam, in a reasonably lit spot.
- Tap **"new player"** in the HUD to reset the score/collection between
  visitors without reloading the page.
- The `assets`/no-external-image approach means every "meme" is drawn from
  emoji + original captions (`js/memes.js`) — nothing copyrighted, so it's
  safe to display publicly.
- To add/change meme captions, edit `js/memes.js` — each of the 7
  expressions (`happy`, `sad`, `angry`, `surprised`, `disgusted`, `fearful`,
  `neutral`) has an emoji, a short tag, and a pool of captions it picks
  from at random.

## How it works

1. `js/face-api.min.js` + the weight files in `models/` load a tiny face
   detector and an expression-classifier neural net, both running in the
   browser via TensorFlow.js — no server, no API calls.
2. Every 300ms the app grabs a frame from the webcam, detects the dominant
   facial expression, and — if it's confident and held for a couple of
   ticks — triggers a meme card unlock.
3. State (score, collected memes) lives in memory for the current player
   and resets on "new player" / replay.

## Third-party code

`js/face-api.min.js` and the model weights in `models/` are from
[face-api.js](https://github.com/justadudewhohacks/face-api.js) (MIT
License — see `js/vendor-licenses/face-api.js.LICENSE`).
