// Real 3D voxel pet renderer, built on the vendored Three.js (js/vendor/three.min.js).
// Voxelizes the exact same pixel-grid body data PetRender (js/pet-render.js)
// already draws in 2D — one non-transparent cell becomes one InstancedMesh
// cube, extruded a few layers deep for real volume. Plain global
// (window.PetRender3D), no modules, matching this project's convention.
//
// Callers: renderToCanvas(canvas, opts) is memoized per canvas element (a
// WeakMap keyed by the canvas) — the renderer/scene/camera are created once
// and reused; only the pet's geometry is rebuilt when its shape/color/
// expression/cosmetics actually change. This matters because repeatedly
// creating WebGLRenderers (e.g. on every Shop equip tap) would leak GPU
// contexts and eventually hit the browser's live-context cap.
(function () {
  "use strict";

  if (typeof THREE === "undefined") {
    window.PetRender3D = { isAvailable: function () { return false; }, renderToCanvas: function () { return false; } };
    return;
  }

  var INK = "#4A2E55";
  var DARK = "#2E1A38";
  var WHITE = "#FFFFFF";
  var DEPTH = 5; // voxel layers front-to-back

  var registry = new (typeof WeakMap !== "undefined" ? WeakMap : Map)();
  var webglOk = null; // cached isAvailable() result

  function isAvailable() {
    if (webglOk != null) return webglOk;
    try {
      var probe = document.createElement("canvas");
      var renderer = new THREE.WebGLRenderer({ canvas: probe });
      renderer.dispose();
      webglOk = true;
    } catch (e) {
      webglOk = false;
    }
    return webglOk;
  }

  function disposeObject(obj) {
    obj.traverse(function (node) {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) node.material.forEach(function (m) { m.dispose(); });
        else node.material.dispose();
      }
    });
  }

  // ---- voxel body -----------------------------------------------------

  function buildBodyGroup(stage, form, baseColor, expression) {
    var group = new THREE.Group();
    var shape = PetRender.shapeFor(stage, form);
    var rows = shape.rows;
    var cols = rows[0].length;
    var rowCount = rows.length;
    var bodyColor = PetRender.colorFor(stage, form, baseColor);

    var palette = { O: INK, P: bodyColor, W: WHITE, B: DARK };
    var cellGeo = new THREE.BoxGeometry(1, 1, 1);
    var cellCount = 0;
    for (var r = 0; r < rowCount; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        if (rows[r][c] !== "." && palette[rows[r][c]]) cellCount++;
      }
    }
    var instanced = new THREE.InstancedMesh(
      cellGeo,
      new THREE.MeshLambertMaterial({ vertexColors: false }),
      Math.max(1, cellCount * DEPTH)
    );
    instanced.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(instanced.count * 3), 3);

    var m = new THREE.Matrix4();
    var color = new THREE.Color();
    var i = 0;
    var halfW = cols / 2, halfH = rowCount / 2, halfD = DEPTH / 2;
    for (var row = 0; row < rowCount; row++) {
      for (var col = 0; col < rows[row].length; col++) {
        var ch = rows[row][col];
        var hex = palette[ch];
        if (!hex) continue;
        var x = col - halfW + 0.5;
        var y = halfH - row - 0.5;
        color.set(hex);
        for (var z = 0; z < DEPTH; z++) {
          var zPos = z - halfD + 0.5;
          m.makeTranslation(x, y, zPos);
          instanced.setMatrixAt(i, m);
          instanced.setColorAt(i, color);
          i++;
        }
      }
    }
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    group.add(instanced);

    addFace(group, expression, halfW, halfH, halfD);

    if (stage === "form" && form === "glimmerling") {
      var sparkleGeo = new THREE.OctahedronGeometry(0.25, 0);
      var sparkleMat = new THREE.MeshLambertMaterial({ color: "#FFD873" });
      var sparkle = new THREE.Mesh(sparkleGeo, sparkleMat);
      sparkle.position.set(halfW - 0.8, halfH + 0.2, halfD + 0.3);
      group.add(sparkle);
    }

    return group;
  }

  // simplified expression-aware face: two eyes + cheeks on the front-most layer
  function addFace(group, expression, halfW, halfH, halfD) {
    var frontZ = halfD + 0.35;
    var eyeY = halfH * 0.28;
    var eyeMat = new THREE.MeshLambertMaterial({ color: DARK });
    var cheekMat = new THREE.MeshLambertMaterial({ color: "#FF9FCB" });

    var eyeGeo, eyeYOffsetL = 0, eyeYOffsetR = 0;
    if (expression === "sleepy" || expression === "sickly" || expression === "blink") {
      eyeGeo = new THREE.BoxGeometry(0.5, 0.12, 0.1);
    } else if (expression === "grossed") {
      eyeGeo = new THREE.BoxGeometry(0.4, 0.16, 0.1);
      eyeYOffsetL = -0.1; eyeYOffsetR = 0.08;
    } else if (expression === "pressed") {
      eyeGeo = new THREE.SphereGeometry(0.28, 8, 8);
    } else {
      eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
    }

    var leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-halfW * 0.34, eyeY + eyeYOffsetL, frontZ);
    group.add(leftEye);
    var rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(halfW * 0.34, eyeY + eyeYOffsetR, frontZ);
    group.add(rightEye);

    var cheekGeo = new THREE.BoxGeometry(0.3, 0.18, 0.08);
    var leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
    leftCheek.position.set(-halfW * 0.62, eyeY - 0.35, frontZ - 0.05);
    group.add(leftCheek);
    var rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
    rightCheek.position.set(halfW * 0.62, eyeY - 0.35, frontZ - 0.05);
    group.add(rightCheek);

    var mouthGeo = new THREE.BoxGeometry(0.3, 0.12, 0.08);
    var mouth = new THREE.Mesh(mouthGeo, eyeMat);
    mouth.position.set(0, eyeY - 0.55, frontZ - 0.05);
    group.add(mouth);
  }

  // ---- cosmetics (3D versions of pet-render.js's drawCosmetic) --------

  function addCosmetic(group, id, halfW, halfH, halfD) {
    var headTopY = halfH;
    if (id === "party-hat") {
      var coneMat = new THREE.MeshLambertMaterial({ color: "#B98AFF" });
      var cone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 16), coneMat);
      cone.position.set(0, headTopY + 0.7, 0);
      group.add(cone);
      var pomMat = new THREE.MeshLambertMaterial({ color: "#FFCB3D" });
      var pom = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), pomMat);
      pom.position.set(0, headTopY + 1.4, 0);
      group.add(pom);
    } else if (id === "crown") {
      var bandMat = new THREE.MeshLambertMaterial({ color: "#FFD873" });
      var band = new THREE.Mesh(new THREE.CylinderGeometry(halfW * 0.5, halfW * 0.5, 0.35, 12), bandMat);
      band.position.set(0, headTopY + 0.25, 0);
      group.add(band);
      var spikeMat = new THREE.MeshLambertMaterial({ color: "#FFCB3D" });
      [-0.35, 0, 0.35].forEach(function (dx) {
        var spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 6), spikeMat);
        spike.position.set(dx * halfW, headTopY + 0.6, 0);
        group.add(spike);
      });
      var jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), new THREE.MeshLambertMaterial({ color: "#FF6FB5" }));
      jewel.position.set(0, headTopY + 0.55, halfD * 0.6);
      group.add(jewel);
    } else if (id === "sunglasses") {
      var lensMat = new THREE.MeshLambertMaterial({ color: DARK });
      var frontZ = halfD + 0.4;
      var eyeY = halfH * 0.28;
      var lensL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.12), lensMat);
      lensL.position.set(-halfW * 0.34, eyeY, frontZ);
      group.add(lensL);
      var lensR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.12), lensMat);
      lensR.position.set(halfW * 0.34, eyeY, frontZ);
      group.add(lensR);
      var bridge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), lensMat);
      bridge.position.set(0, eyeY, frontZ);
      group.add(bridge);
    } else if (id === "bow") {
      var bowMat = new THREE.MeshLambertMaterial({ color: "#FF6FB5" });
      var wingL = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 4), bowMat);
      wingL.rotation.z = Math.PI / 2;
      wingL.position.set(halfW * 0.35, headTopY + 0.15, 0.2);
      group.add(wingL);
      var wingR = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 4), bowMat);
      wingR.rotation.z = -Math.PI / 2;
      wingR.position.set(halfW * 0.65, headTopY + 0.15, 0.2);
      group.add(wingR);
      var knot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshLambertMaterial({ color: "#E0559A" }));
      knot.position.set(halfW * 0.5, headTopY + 0.15, 0.2);
      group.add(knot);
    } else if (id === "scarf") {
      var scarfMat = new THREE.MeshLambertMaterial({ color: "#4DE0C4" });
      var band2 = new THREE.Mesh(new THREE.CylinderGeometry(halfW * 0.68, halfW * 0.68, 0.4, 12), scarfMat);
      band2.position.set(0, -halfH * 0.55, 0);
      group.add(band2);
      var tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.15), new THREE.MeshLambertMaterial({ color: "#35B89E" }));
      tail.position.set(0, -halfH * 0.55 - 0.5, halfD * 0.6);
      group.add(tail);
    } else if (id === "flower") {
      var petalMat = new THREE.MeshLambertMaterial({ color: "#FF6FB5" });
      var fx = halfW + 0.3, fy = 0;
      for (var p = 0; p < 4; p++) {
        var ang = (Math.PI / 2) * p;
        var petal = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), petalMat);
        petal.position.set(fx + Math.cos(ang) * 0.22, fy + Math.sin(ang) * 0.22, 0);
        group.add(petal);
      }
      var center = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshLambertMaterial({ color: "#FFCB3D" }));
      center.position.set(fx, fy, 0);
      group.add(center);
    }
  }

  // world-space fit: the body is built at 1 unit per voxel (so an 11-col grid
  // is ~11 units wide) — that number has no relation to the 2D renderer's
  // "pixels per cell" value, which only ever meant something inside a canvas.
  // Normalize by the grid's own largest dimension so every stage's differently
  // -shaped grid ends up a consistent, camera-appropriate size, then apply a
  // small growth multiplier so form-stage pets still read as a touch bigger.
  var TARGET_SIZE = 3.4;

  function buildPetGroup(opts) {
    var stage = opts.stage || "baby";
    var form = opts.form || null;
    var baseColor = opts.baseColor || "#FF6FB5";
    var expression = opts.expression || "normal";
    var growProgress = opts.growProgress != null ? opts.growProgress : 1;
    var cosmetics = opts.cosmetics || [];

    var group = buildBodyGroup(stage, form, baseColor, expression);
    var shape = PetRender.shapeFor(stage, form);
    var cols = shape.rows[0].length, rowCount = shape.rows.length;
    var halfW = cols / 2, halfH = rowCount / 2, halfD = DEPTH / 2;
    cosmetics.forEach(function (id) { addCosmetic(group, id, halfW, halfH, halfD); });

    var growthMultiplier = stage === "baby" ? 0.85 : stage === "child" ? 0.95
      : 1.0 + Math.max(0, Math.min(1, growProgress)) * 0.15;
    var fitScale = TARGET_SIZE / Math.max(cols, rowCount, DEPTH);
    group.scale.setScalar(fitScale * growthMultiplier);

    return group;
  }

  // ---- per-canvas scene lifecycle --------------------------------------

  function getOrCreateEntry(canvas, forDrawImageReadback) {
    var entry = registry.get(canvas);
    if (entry) return entry;

    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: !!forDrawImageReadback,
    });
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 1.1, 9);
    camera.lookAt(0, 0.2, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    var key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(3, 4, 5);
    scene.add(key);

    entry = { renderer: renderer, scene: scene, camera: camera, petGroup: null, lastKey: null };
    registry.set(canvas, entry);
    return entry;
  }

  function optsKey(opts) {
    return [opts.stage, opts.form, opts.baseColor, opts.expression, (opts.cosmetics || []).join(",")].join("|");
  }

  // returns true on success, false if WebGL/Three unavailable for this canvas
  function renderToCanvas(canvas, opts) {
    opts = opts || {};
    try {
      var entry = getOrCreateEntry(canvas, opts.forDrawImageReadback);

      var w = canvas.width, h = canvas.height;
      entry.renderer.setSize(w, h, false);
      entry.camera.aspect = w / h;
      entry.camera.updateProjectionMatrix();

      var key = optsKey(opts);
      if (key !== entry.lastKey) {
        if (entry.petGroup) {
          entry.scene.remove(entry.petGroup);
          disposeObject(entry.petGroup);
        }
        entry.petGroup = buildPetGroup(opts);
        entry.scene.add(entry.petGroup);
        entry.lastKey = key;
      }
      if (opts.rotationY != null) entry.petGroup.rotation.y = opts.rotationY;

      entry.renderer.render(entry.scene, entry.camera);
      return true;
    } catch (e) {
      console.warn("PetRender3D.renderToCanvas failed, caller should fall back to 2D:", e);
      return false;
    }
  }

  function disposeCanvas(canvas) {
    var entry = registry.get(canvas);
    if (!entry) return;
    if (entry.petGroup) disposeObject(entry.petGroup);
    entry.renderer.dispose();
    registry.delete(canvas);
  }

  window.PetRender3D = {
    isAvailable: isAvailable,
    renderToCanvas: renderToCanvas,
    disposeCanvas: disposeCanvas,
    // lower-level API for scenes that want the pet as one mesh among others
    // (the Plaza) rather than rendered into its own offscreen canvas —
    // returns a plain THREE.Group the caller adds/positions/scales itself.
    buildPetObject: buildPetGroup,
    disposeObject: disposeObject,
  };
})();
