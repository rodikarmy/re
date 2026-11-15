import { useEffect, useRef, useState } from "react";
import { Geometry, Mesh, Program, Renderer, Texture } from "ogl";
import { cn } from "../../lib/cn";
import {
  ATLAS_COLUMNS,
  ATLAS_ROWS,
  BACKGROUND,
  DEFAULT_CAMERA,
  HOLD_MESSAGES,
  MAX_RIPPLES,
  RIPPLE_DURATION_S,
  TIMING,
  type CameraSource,
  type HoldState,
} from "./constants";
import { buildCharacterAtlas } from "./character-atlas";
import {
  buildRingInstances,
  computeRingArrivalTimes,
  createRingLayouts,
  smoothstep,
  type RingLayout,
} from "./ring-layout";
import { atlasFont, hexToRgb, RENDERER_PARAMS, takeWarmCanvas } from "./gl";
import { bindScrollVelocity } from "./scroll-velocity";
import { bindHoldPointerEvents } from "./bind-hold-pointer-events";
import { HoldLabel } from "./HoldLabel";
import { useIsTouchDevice } from "./use-media-query";
import {
  DISC_FRAGMENT,
  DISC_VERTEX,
  GLYPH_FRAGMENT,
  SPIRAL_VERTEX,
} from "./shaders";

export interface SpiralSceneProps {
  className?: string;
  /** Optional scroll-driven camera; without it the spiral sits centered. */
  camera?: CameraSource;
  /** Render the canvas with alpha (lets the page background show through). */
  alpha?: boolean;
  /** Play the opening ripple on mount. */
  entrance?: boolean;
}

interface Ripple {
  /** Scene time at which the wave was released. */
  start: number;
  /** 0…1 extra strength on top of the base envelope. */
  strength: number;
}

/**
 * The spiral of characters from "THE CONTENT ARCHITECTURE.".
 *
 * Thirty instanced rings of glyphs spin around the center. Pressing and
 * holding charges the spiral (it gathers inwards, shivers and glitches),
 * and releasing fires a ripple wave that bursts ring by ring, dissolving
 * letters into dots as it passes. Hovering dissolves letters near the
 * cursor; page scroll adds a bit of extra spin.
 */
export function SpiralScene({ className, camera, alpha, entrance }: SpiralSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [holdState, setHoldState] = useState<HoldState>("idle");
  const isTouchDevice = useIsTouchDevice();

  // Page scroll velocity feeds the spin of every ring.
  const velocityRef = useRef(0);
  useEffect(() => bindScrollVelocity((velocity) => {
    velocityRef.current = velocity;
  }), []);

  const label =
    holdState === "idle" && isTouchDevice ? "Tap & hold" : HOLD_MESSAGES[holdState];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, TIMING.MAX_DPR);
    const renderer = new Renderer({
      ...RENDERER_PARAMS,
      canvas: takeWarmCanvas(Boolean(alpha)),
      webgl: 2,
      alpha: Boolean(alpha),
      dpr,
    });
    const gl = renderer.gl;

    // Clear color + alpha blending; premultiplied alpha is off.
    const [clearR, clearG, clearB] = hexToRgb(BACKGROUND);
    gl.clearColor(clearR, clearG, clearB, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // The renderer owns its canvas; drop any stale one and mount fresh.
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    for (const child of Array.from(container.children)) {
      if (child instanceof HTMLCanvasElement) {
        container.removeChild(child);
      }
    }
    container.appendChild(canvas);

    // Character atlas; re-rasterized once the mono font finishes loading.
    const atlasTexture = new Texture(gl, {
      image: buildCharacterAtlas(atlasFont),
      generateMipmaps: true,
      premultiplyAlpha: false,
      flipY: false,
    });
    let disposed = false;
    document.fonts.ready.then(() => {
      if (disposed) return;
      atlasTexture.image = buildCharacterAtlas(atlasFont);
      atlasTexture.needsUpdate = true;
      renderFrame();
    });

    // ── Ring layout ────────────────────────────────────────────────────
    const rings: RingLayout[] = createRingLayouts();
    const arrivals = computeRingArrivalTimes(rings);

    // ── Instanced attribute buffers ────────────────────────────────────
    const { aRadius, aTheta0, aSpeed, aSize, aCharIdx, aRingIdx } =
      buildRingInstances(rings);

    const quadGeometry = new Geometry(gl, {
      position: { size: 2, data: new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5]) },
      uv: { size: 2, data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]) },
      aRadius: { instanced: 1, size: 1, data: aRadius },
      aTheta0: { instanced: 1, size: 1, data: aTheta0 },
      aSpeed: { instanced: 1, size: 1, data: aSpeed },
      aSize: { instanced: 1, size: 1, data: aSize },
      aCharIdx: { instanced: 1, size: 1, data: aCharIdx },
      aRingIdx: { instanced: 1, size: 1, data: aRingIdx },
    });

    const glyphProgram = new Program(gl, {
      vertex: SPIRAL_VERTEX,
      fragment: GLYPH_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
      uniforms: {
        uTime: { value: 0 },
        uFitScale: { value: new Float32Array([1, 1]) },
        uCenter: { value: new Float32Array([0, 0]) },
        uAtlasGrid: { value: new Float32Array([ATLAS_COLUMNS, ATLAS_ROWS]) },
        uPxToDesign: { value: 2 / 1080 },
        uMouse: { value: new Float32Array([999, 999]) },
        uMouseInfluence: { value: 0 },
        uMouseRadius: { value: TIMING.MOUSE_RADIUS },
        uRingCharge: { value: Array(30).fill(0) },
        uRingGather: { value: Array(30).fill(0) },
        uRippleStarts: { value: Array(MAX_RIPPLES).fill(-1) },
        uRingOffsets: { value: Array(30).fill(0) },
        uRingArrivalTime: { value: arrivals },
        uLight: { value: 0 },
        tAtlas: { value: atlasTexture },
      },
    });
    glyphProgram.setBlendFunc(
      gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE, gl.ONE_MINUS_SRC_ALPHA,
    );
    const glyphMesh = new Mesh(gl, {
      geometry: quadGeometry,
      program: glyphProgram,
      frustumCulled: false,
    });

    // Secondary pass: the black "light" disc, only drawn when the camera
    // pushes a light radius (page scroll takeover).
    const discProgram = new Program(gl, {
      vertex: DISC_VERTEX,
      fragment: DISC_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
      uniforms: {
        uCenter: { value: new Float32Array([0, 0]) },
        uHalfSize: { value: new Float32Array([0, 0]) },
      },
    });
    discProgram.setBlendFunc(gl.ONE, gl.ONE, gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
    const discMesh = new Mesh(gl, {
      geometry: new Geometry(gl, {
        position: { size: 2, data: new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5]) },
        uv: { size: 2, data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]) },
      }),
      program: discProgram,
      frustumCulled: false,
    });

    const discCenter = discProgram.uniforms.uCenter;
    const discHalfSize = discProgram.uniforms.uHalfSize;
    let discDrawn = false;

    if (!glyphProgram.uniformLocations || !glyphProgram.attributeLocations) {
      const vsLog = gl.getShaderInfoLog(glyphProgram.vertexShader);
      console.error("[Spiral] shader failed to compile/link", {
        vsLog,
        fsLog: gl.getShaderInfoLog(glyphProgram.fragmentShader),
        linkLog: gl.getProgramInfoLog(glyphProgram.program),
      });
      try {
        container.removeChild(canvas);
      } catch {}
      return;
    }

    // Direct handles into the uniforms, updated every frame.
    const uTime = glyphProgram.uniforms.uTime;
    const uFitScale = glyphProgram.uniforms.uFitScale;
    const uCenter = glyphProgram.uniforms.uCenter;
    const uMouse = glyphProgram.uniforms.uMouse;
    const uMouseInfluence = glyphProgram.uniforms.uMouseInfluence;
    const uRingCharge = glyphProgram.uniforms.uRingCharge;
    const uRingGather = glyphProgram.uniforms.uRingGather;
    const uRippleStarts = glyphProgram.uniforms.uRippleStarts;
    const uRingOffsets = glyphProgram.uniforms.uRingOffsets;
    const uLight = glyphProgram.uniforms.uLight;

    // ── Sizing: design space is 1080px-referenced, cover-fit ───────────
    let cssWidth = 1;
    let cssHeight = 1;
    let fitX = 1;
    let fitY = 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      cssWidth = Math.max(1, rect.width);
      cssHeight = Math.max(1, rect.height);
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));

      const aspect = cssWidth / cssHeight;
      if (aspect >= 1) {
        fitX = 1;
        fitY = aspect;
      } else {
        fitX = 1 / aspect;
        fitY = 1;
      }
    };
    resize();

    // ── Animation state ────────────────────────────────────────────────
    const abort = new AbortController();
    const { signal } = abort;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let rafHandle = 0;
    let visible = true;
    let pageVisible = !document.hidden;
    let motionAllowed = !prefersReducedMotion.matches;
    let cameraHidden = camera?.get().hidden ?? false;

    let time = 0;
    let prevNow = performance.now();

    const ripples: Ripple[] = [];
    // Per-ring motion state, mirrored into uniforms each frame.
    const ringCharge = new Float32Array(30);      // fast tension while holding
    const ringGather = new Float32Array(30);      // slow zoom creep while holding
    const ringKickVelocity = new Float32Array(30); // raw ripple kick per ring
    const ringSmoothedVelocity = new Float32Array(30); // its smoothed copy
    let holdProgress = 0;                          // 0…1 over HOLD_CHARGE_S
    let holdIntensity = 0;                     // eased in, decays slowly
    let isHolding = false;
    let isCharged = false;
    let lastReleaseTime = -1;

    // Cursor: target (raw) and smoothed (rendered) positions, design space.
    const mouseTarget = new Float32Array([999, 999]);
    let mouseInfluenceTarget = 0;
    let spinBoost = 0; // smoothed |scroll velocity|, capped

    // Release-time ring spin accumulated from the charge (stays frozen).
    const ringSpin = new Float32Array(30);

    const shouldAnimate = () => visible && pageVisible && motionAllowed && !cameraHidden;

    const renderFrame = () => {
      const { x, y, zoom, light } = camera?.get() ?? DEFAULT_CAMERA;

      uFitScale.value[0] = fitX * zoom;
      uFitScale.value[1] = fitY * zoom;
      uCenter.value[0] = 0 + x;
      uCenter.value[1] = 0 + y;
      // Light radius arrives in css px; normalize into design units.
      uLight.value = light / (cssWidth * 0.5 * fitX * zoom);
      uTime.value = time;

      renderer.render({ scene: glyphMesh, update: false, sort: false, frustumCull: false });

      // When lit, the canvas turns transparent and the black disc covers
      // the center with radius `light` px.
      const lit = Boolean(alpha) && light > 0;
      if (lit !== discDrawn) {
        discDrawn = lit;
        container.style.backgroundColor = lit ? "transparent" : BACKGROUND;
      }
      if (lit) {
        discCenter.value[0] = 0 + x;
        discCenter.value[1] = 0 + y;
        discHalfSize.value[0] = light / (cssWidth * 0.5);
        discHalfSize.value[1] = light / (cssHeight * 0.5);
        renderer.render({ scene: discMesh, update: false, sort: false, frustumCull: false, clear: false });
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prevNow) * 0.001);
      prevNow = now;

      if (motionAllowed) {
        time += dt;
      }

      // Expire finished ripples, then mirror the queue into the uniform.
      while (ripples.length > 0) {
        const first = ripples[0];
        if (!first || time - first.start < RIPPLE_DURATION_S) {
          break;
        }
        ripples.shift();
      }
      const rippleStarts = uRippleStarts.value;
      for (let i = 0; i < MAX_RIPPLES; i++) {
        rippleStarts[i] = ripples[i] ? ripples[i].start : -1;
      }

      // Cursor easing: influence fast, position slower.
      const influenceK = 1 - Math.exp(dt * -6);
      uMouseInfluence.value += (mouseInfluenceTarget - uMouseInfluence.value) * influenceK;
      const mouseK = 1 - Math.exp(dt * -14);
      uMouse.value[0] += (mouseTarget[0] - uMouse.value[0]) * mouseK;
      uMouse.value[1] += (mouseTarget[1] - uMouse.value[1]) * mouseK;

      // Hold charge-up: progress runs over 0.9s, intensity eases in and
      // decays slowly (τ = 4s), so a quick tap still leaves some tension.
      if (isHolding) {
        holdProgress = Math.min(1, holdProgress + dt / TIMING.HOLD_CHARGE_S);
        holdIntensity = 1 - (1 - holdIntensity) * Math.exp(-dt / 4);
        if (!isCharged && holdProgress >= 1) {
          isCharged = true;
          setHoldState("charged");
        }
      } else {
        holdProgress *= Math.exp(dt * -10);
        holdIntensity *= Math.exp(dt * -10);
      }

      // Release wave: a ripple sweeps outwards; rings calm down (their
      // charge/gather decays) once the wavefront passes them.
      const chargeDecay = Math.exp(dt * -10);
      const waveAge = time - lastReleaseTime;
      const waveActive = lastReleaseTime >= 0 && waveAge < RIPPLE_DURATION_S;
      const waveFront = waveActive
        ? smoothstep(0, 1, waveAge / RIPPLE_DURATION_S) * 1.6 + 0.425
        : Infinity;

      const charge = uRingCharge.value;
      const gather = uRingGather.value;
      for (let i = 0; i < 30; i++) {
        const ring = rings[i];
        if (!ring) continue;

        let ringChargeValue = ringCharge[i] ?? 0;
        let ringGatherValue = ringGather[i] ?? 0;

        if (isHolding) {
          const k = 1 - Math.exp(dt * -14);
          ringChargeValue += (holdProgress - ringChargeValue) * k;
          ringGatherValue += (smoothstep(0, 1, holdProgress) * holdIntensity - ringGatherValue) * k;
        } else if (!waveActive || waveFront >= ring.radius) {
          ringChargeValue *= chargeDecay;
          ringGatherValue *= chargeDecay;
        }

        ringCharge[i] = ringChargeValue;
        ringGather[i] = ringGatherValue;
        gather[i] = ringGatherValue;

        const easedCharge = smoothstep(0, 1, ringChargeValue);
        charge[i] = easedCharge;
        // The charged spiral spins backwards, ring by ring.
        ringSpin[i] = (ringSpin[i] ?? 0) - easedCharge * ring.speed * dt;
      }

      // Scroll velocity adds a short-lived extra spin to every ring.
      velocityRef.current = velocityRef.current * Math.exp(dt * -5);
      const scrollBoost = Math.min(40, +Math.abs(velocityRef.current));
      spinBoost += (scrollBoost - spinBoost) * (1 - Math.exp(dt * -4));

      // Ring offsets: each ripple kicks the rings it passes (along their
      // own spin direction); the kick is smoothed and integrated.
      const velocityK = 1 - Math.exp(dt * -3);
      const offsets = uRingOffsets.value;
      const cameraTwist = camera?.get().twist ?? 0;
      for (let i = 0; i < 30; i++) {
        const ring = rings[i];
        if (!ring) continue;

        let kick = 0;
        for (const ripple of ripples) {
          const age = time - ripple.start;
          if (age < 0 || age >= RIPPLE_DURATION_S) continue;
          const progress = age / RIPPLE_DURATION_S;
          const front = smoothstep(0, 1, progress) * 1.6;
          const envelope =
            (1 - smoothstep(0, 0.425, Math.abs(ring.radius - front))) *
            (smoothstep(0, 0.22, progress) * (1 - smoothstep(0.78, 1, progress))) *
            ripple.strength;
          if (envelope > kick) {
            kick = envelope;
          }
        }

        const direction = Math.sign(ring.speed) || 1;
        // Raw kick accumulates while the wave passes; a smoothed copy
        // follows it and is what actually drives the offset.
        ringKickVelocity[i] = ringKickVelocity[i] + (kick * 0.55 * direction + ring.speed * spinBoost) * dt;
        const smoothed = ringKickVelocity[i] + (ringSmoothedVelocity[i] - ringKickVelocity[i]) * velocityK;
        ringSmoothedVelocity[i] = smoothed;
        offsets[i] = smoothed + (ringSpin[i] ?? 0) + cameraTwist;
      }

      renderFrame();
      rafHandle = shouldAnimate() ? requestAnimationFrame(tick) : 0;
    };

    const stopAnimation = () => {
      if (rafHandle !== 0) {
        cancelAnimationFrame(rafHandle);
        rafHandle = 0;
      }
    };

    const startAnimation = () => {
      if (shouldAnimate()) {
        if (rafHandle === 0) {
          prevNow = performance.now();
          rafHandle = requestAnimationFrame(tick);
        }
      } else {
        stopAnimation();
        if (!cameraHidden) {
          renderFrame();
        }
      }
    };

    const unsubCamera = camera?.on("change", (value) => {
      const wasHidden = cameraHidden;
      cameraHidden = value.hidden;
      if (rafHandle === 0) {
        startAnimation();
      }
      if (wasHidden && !value.hidden) {
        renderFrame();
      }
    });

    // ── Resize / visibility plumbing ───────────────────────────────────
    let resizePending = false;
    let resizeTimeout: number | null = null;
    let resizeQueued = false;

    const applyResize = () => {
      resize();
      if (rafHandle === 0) {
        renderFrame();
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!visible) {
        resizePending = true;
        return;
      }
      if (resizeTimeout === null) {
        applyResize();
      } else {
        window.clearTimeout(resizeTimeout);
        resizeQueued = true;
      }
      resizeTimeout = window.setTimeout(() => {
        resizeTimeout = null;
        if (resizeQueued) {
          resizeQueued = false;
          applyResize();
        }
      }, 150);
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        if ((visible = entry.isIntersecting) && resizePending) {
          resizePending = false;
          resize();
        }
        startAnimation();
      }
    }, { threshold: 0 });
    intersectionObserver.observe(container);

    document.addEventListener("visibilitychange", () => {
      pageVisible = !document.hidden;
      startAnimation();
    }, { signal });

    prefersReducedMotion.addEventListener("change", () => {
      motionAllowed = !prefersReducedMotion.matches;
      startAnimation();
    }, { signal });

    // ── Pointer interaction ────────────────────────────────────────────
    // Screen px → design units, undoing the cover fit and camera offset.
    const toDesign = (px: number, py: number): [number, number] => {
      const y = -(py / cssHeight * 2 - 1);
      return [
        (px / cssWidth * 2 - 1 - uCenter.value[0]) / uFitScale.value[0],
        (y - uCenter.value[1]) / uFitScale.value[1],
      ];
    };

    bindHoldPointerEvents(container, {
      signal,
      labelRef,
      setIsHovering,
      onPointerMove: (localX, localY) => {
        const [x, y] = toDesign(localX, localY);
        mouseTarget[0] = x;
        mouseTarget[1] = y;
      },
      onPointerEnter: (localX, localY) => {
        const [x, y] = toDesign(localX, localY);
        mouseTarget[0] = x;
        mouseTarget[1] = y;
        // Snap the smoothed cursor so it doesn't fly in from off-screen.
        uMouse.value[0] = mouseTarget[0];
        uMouse.value[1] = mouseTarget[1];
        mouseInfluenceTarget = 1;
      },
      onPointerLeave: () => {
        mouseInfluenceTarget = 0;
        isHolding = false;
        isCharged = false;
        setHoldState("idle");
      },
      onPointerDown: () => {
        isHolding = true;
        isCharged = false;
        setHoldState("holding");
      },
      onPointerUp: () => {
        if (isHolding) {
          isHolding = false;
          // Only a fully-charged hold fires the release ripple.
          if (isCharged) {
            lastReleaseTime = time;
            ripples.push({
              start: time,
              strength: 0.7 + holdIntensity * 0.6,
            });
            while (ripples.length > MAX_RIPPLES) {
              ripples.shift();
            }
          }
          isCharged = false;
          setHoldState("idle");
        }
      },
    });

    // ── Opening ripple ─────────────────────────────────────────────────
    if (motionAllowed && entrance !== false) {
      ripples.push({ start: 0, strength: 1 });
    } else {
      // Skip the entrance: jump past every ring's arrival + fade.
      time = 2.3;
    }

    renderFrame();
    startAnimation();

    return () => {
      stopAnimation();
      unsubCamera?.();
      abort.abort();
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      if (resizeTimeout !== null) {
        window.clearTimeout(resizeTimeout);
      }
      disposed = true;
      try {
        container.removeChild(canvas);
      } catch {}
    };
    // The scene is rebuilt only when the camera source or render mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, alpha, entrance]);

  const containerStyle = { backgroundColor: BACKGROUND } as const;

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={cn("relative size-full cursor-pointer select-none overflow-hidden", className)}
    >
      <HoldLabel labelRef={labelRef} isHovering={isHovering} text={label} />
    </div>
  );
}
