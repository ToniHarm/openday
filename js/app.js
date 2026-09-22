(() => {
  const CONFIDENCE_THRESHOLD = 0.75;
  const HOLD_TICKS_REQUIRED = 2; // consecutive ticks needed before we trust an expression
  const DETECTION_INTERVAL_MS = 300;
  const RETRIGGER_COOLDOWN_MS = 1600; // avoid spamming the same expression over and over
  const NEW_UNLOCK_POINTS = 100;
  const REPEAT_POINTS = 10;

  const screens = {
    start: document.getElementById("start-screen"),
    loading: document.getElementById("loading-screen"),
    error: document.getElementById("error-screen"),
    game: document.getElementById("game-screen"),
    win: document.getElementById("win-screen"),
  };

  const video = document.getElementById("video");
  const loadingText = document.getElementById("loading-text");
  const errorText = document.getElementById("error-text");
  const faceHint = document.getElementById("face-hint");
  const scoreEl = document.getElementById("score");
  const progressEl = document.getElementById("progress");
  const progressFillEl = document.getElementById("progress-fill");
  const memeIdleEl = document.getElementById("meme-idle");
  const memeCardEl = document.getElementById("meme-card");
  const memeEmojiEl = document.getElementById("meme-emoji");
  const memeCaptionEl = document.getElementById("meme-caption");
  const memeTagEl = document.getElementById("meme-tag");
  const collectionStrip = document.getElementById("collection-strip");
  const finalScoreEl = document.getElementById("final-score");

  let stream = null;
  let detectionTimer = null;
  let modelsLoaded = false;

  let score = 0;
  let unlocked = new Set();
  let lastTopExpression = null;
  let holdCount = 0;
  let cooldownUntil = 0;

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function buildCollectionStrip() {
    collectionStrip.innerHTML = "";
    EXPRESSION_ORDER.forEach((key) => {
      const meme = MEME_DECK[key];
      const slot = document.createElement("div");
      slot.className = "collection-slot locked";
      slot.id = `slot-${key}`;
      slot.innerHTML = `<span class="slot-emoji">${meme.emoji}</span><span class="slot-label">${meme.label}</span>`;
      collectionStrip.appendChild(slot);
    });
  }

  function resetGameState() {
    score = 0;
    unlocked = new Set();
    lastTopExpression = null;
    holdCount = 0;
    cooldownUntil = 0;
    scoreEl.textContent = "0";
    progressEl.textContent = `0 / ${EXPRESSION_ORDER.length}`;
    progressFillEl.style.width = "0%";
    memeCardEl.classList.add("hidden");
    memeIdleEl.classList.remove("hidden");
    buildCollectionStrip();
  }

  async function loadModels() {
    if (modelsLoaded) return;
    loadingText.textContent = "Loading the meme brain...";
    await faceapi.nets.tinyFaceDetector.loadFromUri("models");
    await faceapi.nets.faceExpressionNet.loadFromUri("models");
    modelsLoaded = true;
  }

  async function startCamera() {
    loadingText.textContent = "Asking for camera access...";
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });
  }

  function stopCamera() {
    if (detectionTimer) {
      clearInterval(detectionTimer);
      detectionTimer = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
  }

  function pickTopExpression(expressions) {
    let top = null;
    let topScore = 0;
    for (const key of EXPRESSION_ORDER) {
      const val = expressions[key] || 0;
      if (val > topScore) {
        topScore = val;
        top = key;
      }
    }
    return { top, topScore };
  }

  function showMemeCard(key) {
    const meme = MEME_DECK[key];
    const caption =
      meme.captions[Math.floor(Math.random() * meme.captions.length)];
    memeEmojiEl.textContent = meme.emoji;
    memeCaptionEl.textContent = caption;
    memeTagEl.textContent = meme.tag;
    memeIdleEl.classList.add("hidden");
    memeCardEl.classList.remove("hidden");
    memeCardEl.classList.remove("pop");
    // force reflow so the animation restarts every time
    void memeCardEl.offsetWidth;
    memeCardEl.classList.add("pop");
  }

  function unlockSlot(key) {
    const slot = document.getElementById(`slot-${key}`);
    slot.classList.remove("locked");
    slot.classList.add("unlocked", "just-unlocked");
    setTimeout(() => slot.classList.remove("just-unlocked"), 700);
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    progressEl.textContent = `${unlocked.size} / ${EXPRESSION_ORDER.length}`;
    progressFillEl.style.width = `${(unlocked.size / EXPRESSION_ORDER.length) * 100}%`;
  }

  function handleExpressionHit(key) {
    const now = Date.now();
    if (now < cooldownUntil) return;
    cooldownUntil = now + RETRIGGER_COOLDOWN_MS;

    showMemeCard(key);

    if (!unlocked.has(key)) {
      unlocked.add(key);
      score += NEW_UNLOCK_POINTS;
      unlockSlot(key);
    } else {
      score += REPEAT_POINTS;
    }
    updateHud();

    if (unlocked.size === EXPRESSION_ORDER.length) {
      setTimeout(() => {
        finalScoreEl.textContent = `Score: ${score}`;
        stopCamera();
        showScreen("win");
      }, 1200);
    }
  }

  async function detectionTick() {
    if (!video || video.readyState < 2) return;
    try {
      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (!result) {
        faceHint.classList.remove("hidden");
        lastTopExpression = null;
        holdCount = 0;
        return;
      }
      faceHint.classList.add("hidden");

      const { top, topScore } = pickTopExpression(result.expressions);
      if (!top || topScore < CONFIDENCE_THRESHOLD) {
        lastTopExpression = null;
        holdCount = 0;
        return;
      }

      if (top === lastTopExpression) {
        holdCount += 1;
      } else {
        lastTopExpression = top;
        holdCount = 1;
      }

      if (holdCount >= HOLD_TICKS_REQUIRED) {
        handleExpressionHit(top);
        holdCount = 0; // require a fresh hold before the same expression can fire again
      }
    } catch (err) {
      console.error("Detection error", err);
    }
  }

  async function beginGame() {
    showScreen("loading");
    try {
      await loadModels();
      await startCamera();
      resetGameState();
      showScreen("game");
      detectionTimer = setInterval(detectionTick, DETECTION_INTERVAL_MS);
    } catch (err) {
      console.error(err);
      stopCamera();
      if (err && err.name === "NotAllowedError") {
        errorText.textContent =
          "Camera access was blocked. Please allow camera permission and try again.";
      } else if (err && err.name === "NotFoundError") {
        errorText.textContent = "No camera was found on this device.";
      } else {
        errorText.textContent =
          "Couldn't start the meme mirror. Check the camera and try again.";
      }
      showScreen("error");
    }
  }

  document.getElementById("start-btn").addEventListener("click", beginGame);
  document.getElementById("retry-btn").addEventListener("click", beginGame);
  document.getElementById("play-again-btn").addEventListener("click", beginGame);
  document.getElementById("reset-btn").addEventListener("click", () => {
    resetGameState();
  });

  buildCollectionStrip();
})();
