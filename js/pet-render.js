// Shared pixel-art pet renderer — lifted from tamagotchi-speedrun.html's pure
// rendering pieces (sprite grids, palette, canvas drawing). These already took
// only ctx + explicit args, so nothing here changed except renderPet(), which
// now takes an explicit {stage, form, baseColor, expression, growProgress}
// argument object instead of reading a page-local `state`. Interaction-specific
// expression logic (idle blink timer, press-state squish, poop-squint) stays
// page-local wherever it's used — callers compute their own expression string
// and pass it in. Plain global (window.PetRender), no modules.
(function () {
  "use strict";

  var T = null; // transparent

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function buildPalette(bodyColor) {
    return { ".": T, O: "#4A2E55", P: bodyColor, W: "#FFFFFF", B: "#2E1A38" };
  }

  var BABY_BODY = [
    "....OOO....",
    "..OOPPPOO..",
    ".OPPPPPPPO.",
    "OPPPPPPPPPO",
    "OPPPPPPPPPO",
    "OPPPPPPPPPO",
    "OPPPPPPPPPO",
    ".OPPPPPPPO.",
    "..OPPPPPO..",
    "...OO.OO...",
  ];

  var CHILD_BODY = [
    ".OO.......OO.",
    "OPPO.....OPPO",
    "OPPPOOOOOPPPO",
    ".OPPPPPPPPPO.",
    "OPPPPPPPPPPPO",
    "OPPPPPPPPPPPO",
    "OOPPPPPPPPPOO",
    ".OPPPPPPPPPO.",
    "..OPPPPPPPO..",
    "...OO...OO...",
  ];

  var GLIMMERLING_BODY = [
    ".OO.......OO.",
    "OPPO.....OPPO",
    "OPPPOOOOOPPPO",
    ".OPPPPPPPPPO.",
    "OPPPPPPPPPPPO",
    "OOPPPPPPPPPOO",
    "OOPPPPPPPPPOO",
    ".OPPPPPPPPPO.",
    "..OPPPPPPPO..",
    "..OO.....OO..",
  ];

  var WOBBLET_BODY = [
    "..OO......OO.",
    ".OPPO....OPPO",
    ".OPPPOOOOPPPO",
    "OPPPPPPPPPPO.",
    "OPPPPPPPPPPPO",
    ".OPPPPPPPPPPO",
    "OOPPPPPPPPPO.",
    ".OPPPPPPPPPO.",
    "..OPPPPPPPO..",
    "...OO..OO....",
  ];

  var GRUMPLET_BODY = [
    ".OO.......OO.",
    "OPPO.....OPPO",
    "OPPPOOOOOPPPO",
    ".OPPPPPPPPPO.",
    "OPPPPPPPPPPPO",
    "OPPPPPPPPPPPO",
    "OOPPPPPPPPPOO",
    ".OPPOOOOOPPO.",
    "..OPPPPPPPO..",
    "...OO...OO...",
  ];

  function shapeFor(stage, form) {
    if (stage === "form") {
      if (form === "wobblet") return { rows: WOBBLET_BODY };
      if (form === "grumplet") return { rows: GRUMPLET_BODY };
      return { rows: GLIMMERLING_BODY };
    }
    if (stage === "child") return { rows: CHILD_BODY };
    return { rows: BABY_BODY };
  }

  function hexToHsl(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s;
    var l = (max + min) / 2;
    if (max === min) { h = 0; s = 0; }
    else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  }

  function hslToHex(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var hue2rgb = function (p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    var toHex = function (x) { return Math.round(clamp(x, 0, 1) * 255).toString(16).padStart(2, "0"); };
    return "#" + toHex(r) + toHex(g) + toHex(b);
  }

  // two-axis color: the player's pick is the identity, care quality (form)
  // adjusts its glossiness/saturation — baby/child show the pick as-is
  function colorFor(stage, form, baseHex) {
    var hsl = hexToHsl(baseHex);
    var h = hsl[0], s = hsl[1], l = hsl[2];
    if (stage === "form") {
      if (form === "glimmerling") return hslToHex(h, clamp(s + 15, 0, 100), clamp(l + 8, 0, 100));
      if (form === "wobblet") return hslToHex(h, clamp(s - 15, 0, 100), l);
      if (form === "grumplet") return hslToHex(h, clamp(s - 35, 0, 100), clamp(l - 12, 0, 100));
    }
    return baseHex;
  }

  function drawGrid(ctx, rows, palette, x, y, pixelSize) {
    ctx.imageSmoothingEnabled = false;
    rows.forEach(function (row, ry) {
      for (var rx = 0; rx < row.length; rx++) {
        var color = palette[row[rx]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x + rx * pixelSize, y + ry * pixelSize, pixelSize, pixelSize);
      }
    });
  }

  function clearCanvas(canvas) {
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return ctx;
  }

  function drawEyes(ctx, cx, cyRow, px, expression, pupilOffset) {
    var eyeY = cyRow * px;
    var leftX = cx - px * 3.4;
    var rightX = cx + px * 1.6;
    ctx.fillStyle = "#2E1A38";
    if (expression === "sleepy" || expression === "sickly" || expression === "blink") {
      ctx.fillRect(leftX, eyeY + px * 0.4, px * 1.8, px * 0.6);
      ctx.fillRect(rightX, eyeY + px * 0.4, px * 1.8, px * 0.6);
    } else if (expression === "grossed") {
      ctx.fillRect(leftX, eyeY + px * 0.55, px * 1.8, px * 0.5);
      ctx.fillRect(rightX, eyeY + px * 0.35, px * 1.8, px * 0.5);
    } else {
      var ex = pupilOffset ? pupilOffset.x : 0;
      var ey = pupilOffset ? pupilOffset.y : 0;
      var scale = expression === "pressed" ? 1.4 : 1;
      var r = px * 0.9 * scale;
      ctx.beginPath();
      ctx.arc(leftX + px * 0.9 + ex, eyeY + px * 0.9 + ey, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightX + px * 0.9 + ex, eyeY + px * 0.9 + ey, r, 0, Math.PI * 2);
      ctx.fill();
      if (expression !== "pressed") {
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(leftX + px * 0.55 + ex, eyeY + px * 0.55 + ey, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightX + px * 0.55 + ex, eyeY + px * 0.55 + ey, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawCuteFace(ctx, cx, cyRow, px, expression) {
    drawEyes(ctx, cx, cyRow, px, expression);

    var cheekY = (cyRow + 2.25) * px;
    ctx.fillStyle = "#FF9FCB";
    ctx.fillRect(cx - px * 4.2, cheekY, px * 1.15, px * 0.55);
    ctx.fillRect(cx + px * 3.05, cheekY, px * 1.15, px * 0.55);

    ctx.fillStyle = "#2E1A38";
    var mouthY = (cyRow + 2.15) * px;
    if (expression === "sickly") {
      ctx.fillRect(cx - px * 0.7, mouthY + px * 0.45, px * 1.4, px * 0.45);
    } else if (expression === "sleepy") {
      ctx.fillRect(cx - px * 0.5, mouthY, px, px * 0.35);
    } else {
      ctx.fillRect(cx - px * 0.25, mouthY, px * 0.5, px * 0.65);
      ctx.fillRect(cx - px * 0.8, mouthY + px * 0.35, px * 0.55, px * 0.35);
      ctx.fillRect(cx + px * 0.25, mouthY + px * 0.35, px * 0.55, px * 0.35);
    }
  }

  // ── Cosmetics (Shop items) — a thin optional overlay drawn after the body
  // grid, keyed by id. Two mutually-exclusive slots: "hat" and "accessory".
  var COSMETIC_CATALOG = [
    { id: "party-hat", slot: "hat", name: "PARTY HAT", cost: 40, emoji: "🎉" },
    { id: "crown", slot: "hat", name: "CROWN", cost: 100, emoji: "👑" },
    { id: "sunglasses", slot: "hat", name: "SUNGLASSES", cost: 50, emoji: "😎" },
    { id: "bow", slot: "accessory", name: "BOW", cost: 30, emoji: "🎀" },
    { id: "scarf", slot: "accessory", name: "SCARF", cost: 35, emoji: "🧣" },
    { id: "flower", slot: "accessory", name: "FLOWER", cost: 25, emoji: "🌸" },
  ];

  function drawCosmetic(ctx, id, geo) {
    var ox = geo.ox, oy = geo.oy, gridW = geo.gridW, gridH = geo.gridH, scale = geo.scale;
    var cx = ox + gridW / 2;
    var headTop = oy;
    if (id === "party-hat") {
      var hw = scale * 2.2, hh = scale * 3.2;
      var apexY = headTop - hh, baseY = headTop - scale * 0.3;
      ctx.fillStyle = "#B98AFF";
      ctx.beginPath();
      ctx.moveTo(cx, apexY);
      ctx.lineTo(cx - hw / 2, baseY);
      ctx.lineTo(cx + hw / 2, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#FFCB3D";
      ctx.beginPath();
      ctx.arc(cx, apexY, scale * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === "crown") {
      var cw = scale * 3, ch = scale * 1.4;
      var left = cx - cw / 2, top = headTop - ch - scale * 0.2;
      ctx.fillStyle = "#FFD873";
      ctx.fillRect(left, top + ch * 0.5, cw, ch * 0.5);
      ctx.beginPath();
      ctx.moveTo(left, top + ch * 0.5);
      ctx.lineTo(left + cw * 0.16, top);
      ctx.lineTo(left + cw * 0.33, top + ch * 0.5);
      ctx.lineTo(left + cw * 0.5, top);
      ctx.lineTo(left + cw * 0.66, top + ch * 0.5);
      ctx.lineTo(left + cw * 0.83, top);
      ctx.lineTo(left + cw, top + ch * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#FF6FB5";
      ctx.beginPath();
      ctx.arc(left + cw * 0.5, top, scale * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === "sunglasses") {
      var eyeRowY = headTop + gridH * 0.32;
      var lensR = scale * 0.95;
      ctx.fillStyle = "#2E1A38";
      ctx.beginPath(); ctx.arc(cx - scale * 1.7, eyeRowY, lensR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + scale * 1.7, eyeRowY, lensR, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx - scale * 0.9, eyeRowY - scale * 0.15, scale * 1.8, scale * 0.3);
    } else if (id === "bow") {
      var by = headTop - scale * 0.2, bx = cx + gridW * 0.28;
      ctx.fillStyle = "#FF6FB5";
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - scale * 1.1, by - scale * 0.7);
      ctx.lineTo(bx - scale * 1.1, by + scale * 0.7);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + scale * 1.1, by - scale * 0.7);
      ctx.lineTo(bx + scale * 1.1, by + scale * 0.7);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#E0559A";
      ctx.beginPath(); ctx.arc(bx, by, scale * 0.4, 0, Math.PI * 2); ctx.fill();
    } else if (id === "scarf") {
      var scarfY = headTop + gridH * 0.78;
      ctx.fillStyle = "#4DE0C4";
      ctx.fillRect(cx - gridW * 0.42, scarfY, gridW * 0.84, scale * 0.9);
      ctx.fillStyle = "#35B89E";
      ctx.fillRect(cx - scale * 0.5, scarfY + scale * 0.9, scale * 1, scale * 1.3);
    } else if (id === "flower") {
      var fx = ox + gridW + scale * 0.4, fy = headTop + gridH * 0.4;
      ctx.fillStyle = "#FF6FB5";
      [0, 1, 2, 3].forEach(function (i) {
        var ang = (Math.PI / 2) * i;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(ang) * scale * 0.5, fy + Math.sin(ang) * scale * 0.5, scale * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#FFCB3D";
      ctx.beginPath(); ctx.arc(fx, fy, scale * 0.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // stage: "baby"|"child"|"form"; form: "glimmerling"|"wobblet"|"grumplet"|null;
  // growProgress (0..1): caller-driven grow-in tween, defaults to fully grown.
  // cosmetics (optional): array of equipped COSMETIC_CATALOG ids to overlay.
  function renderPet(canvas, opts) {
    opts = opts || {};
    var stage = opts.stage || "baby";
    var form = opts.form || null;
    var baseColor = opts.baseColor || "#FF6FB5";
    var expression = opts.expression || "normal";
    var growProgress = opts.growProgress != null ? opts.growProgress : 1;

    var shape = shapeFor(stage, form);
    var ctx = clearCanvas(canvas);
    var gridCols = shape.rows[0].length;
    var gridRows = shape.rows.length;

    var scale = 8;
    if (stage === "child") scale = 9.5;
    if (stage === "form") scale = 10.5 + clamp(growProgress, 0, 1) * 2.5;

    var gridW = gridCols * scale;
    var gridH = gridRows * scale;
    var ox = (canvas.width - gridW) / 2;
    var oy = (canvas.height - gridH) / 2 + 6;

    var color = colorFor(stage, form, baseColor);
    var palette = buildPalette(color);
    drawGrid(ctx, shape.rows, palette, ox, oy, scale);
    drawCuteFace(ctx, canvas.width / 2, oy / scale + 3, scale, expression);

    if (stage === "form" && form === "glimmerling") {
      ctx.fillStyle = "#FFD873";
      var sx = ox + gridW - scale * 1.5;
      var sy = oy - scale * 0.5;
      ctx.fillRect(sx, sy, scale * 0.6, scale * 0.6);
      ctx.fillRect(sx - scale * 0.6, sy + scale * 0.6, scale * 0.4, scale * 0.4);
      ctx.fillRect(sx + scale * 0.6, sy + scale * 0.6, scale * 0.4, scale * 0.4);
    }

    (opts.cosmetics || []).forEach(function (id) {
      drawCosmetic(ctx, id, { ox: ox, oy: oy, gridW: gridW, gridH: gridH, scale: scale });
    });

    return ctx;
  }

  window.PetRender = {
    buildPalette: buildPalette,
    shapeFor: shapeFor,
    colorFor: colorFor,
    drawGrid: drawGrid,
    clearCanvas: clearCanvas,
    drawEyes: drawEyes,
    drawCuteFace: drawCuteFace,
    renderPet: renderPet,
    COSMETIC_CATALOG: COSMETIC_CATALOG,
    // single source of truth for the body silhouettes — js/pet-render-3d.js
    // voxelizes these same grids rather than keeping a duplicate copy
    BODIES: {
      BABY_BODY: BABY_BODY,
      CHILD_BODY: CHILD_BODY,
      GLIMMERLING_BODY: GLIMMERLING_BODY,
      WOBBLET_BODY: WOBBLET_BODY,
      GRUMPLET_BODY: GRUMPLET_BODY,
    },
  };
})();
