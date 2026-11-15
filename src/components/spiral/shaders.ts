/**
 * GLSL sources of the spiral scene, kept verbatim (including comments).
 *
 * `DOT_INDEX` is interpolated into the vertex shader so a dissolved letter
 * can fall back to the dot cell of the atlas.
 */

import { DOT_INDEX } from "./constants";

/** Vertex shader: per-instance spiral placement, ripple/hold/hover shaping. */
export const SPIRAL_VERTEX = `#version 300 es
precision highp float;

in vec2 position;
in vec2 uv;
in float aRadius;
in float aTheta0;
in float aSpeed;
in float aSize;
in float aCharIdx;
in float aRingIdx;

uniform float uTime;
uniform vec2 uFitScale;
uniform vec2 uCenter;
uniform vec2 uAtlasGrid;
uniform float uPxToDesign;
uniform vec2 uMouse;
uniform float uMouseInfluence;
uniform float uMouseRadius;
uniform float uRingCharge[30];
uniform float uRingGather[30];
uniform float uRippleStarts[16];
uniform float uRingOffsets[30];
uniform float uRingArrivalTime[30];
uniform float uLight;

const float LIGHT_CRUMBLE_S = 0.4500;
const float LIGHT_FADE_S = 0.1000;
const float RIPPLE_DURATION_S = 1.8000;
const float RIPPLE_MAX_RADIUS_S = 1.6000;
const float RIPPLE_WIDTH_S = 0.8500;
const float RIPPLE_RADIAL_PUSH_S = 0.0450;
const float RIPPLE_SCALE_BOOST_S = 0.5000;
const float DOT_SIZE_PX_S = 5.0000;
const float ENTRANCE_FADE_S = 0.5000;
const float HOLD_GATHER_SCALE_S = 0.1200;
const float HOLD_SHAKE_AMPLITUDE_S = 0.0020;
const float HOLD_SHAKE_FRACTION_S = 0.1800;
const float HOLD_GLITCH_RATE_S = 9.0000;
const float HOLD_GLITCH_FRACTION_S = 0.1500;

out vec2 vUv;
out float vRingT;
out float vAlpha;

void main() {
  // Reveal strength from any active wavefront (-1 = empty slot), smoothed three ways (eased radius, bell, life fade) to swell.
  float rippleInfluence = 0.0;
  for (int r = 0; r < 16; r++) {
    float start = uRippleStarts[r];
    if (start < 0.0) continue;
    float elapsed = uTime - start;
    if (elapsed < 0.0 || elapsed >= RIPPLE_DURATION_S) continue;
    float t = elapsed / RIPPLE_DURATION_S;
    float waveRadius = smoothstep(0.0, 1.0, t) * RIPPLE_MAX_RADIUS_S;
    float bell = 1.0 - smoothstep(0.0, RIPPLE_WIDTH_S * 0.5, abs(aRadius - waveRadius));
    float lifeFade = smoothstep(0.0, 0.22, t) * (1.0 - smoothstep(0.78, 1.0, t));
    rippleInfluence = max(rippleInfluence, bell * lifeFade);
  }

  // Push and size use the influence directly: the envelope is already shaped, and extra sharpening brings back the hard edge.
  // Hold: uRingCharge is fast tension, uRingGather slow zoom creep; each ring's pair decays as the release wave arrives.
  float holdCharge = uRingCharge[int(aRingIdx)];
  float gatherAmt = uRingGather[int(aRingIdx)];
  float effectiveRadius = aRadius * (1.0 - gatherAmt * HOLD_GATHER_SCALE_S) + rippleInfluence * RIPPLE_RADIAL_PUSH_S;

  float theta = aTheta0 + uTime * aSpeed + uRingOffsets[int(aRingIdx)];
  float c = cos(theta);
  float s = sin(theta);
  vec2 ringCenter = vec2(c, s) * effectiveRadius;

  // Pure bell falloff from the cursor, so dissolution is a continuous gradient rather than a hard disc snapping with movement.
  float mouseDist = length(ringCenter - uMouse);
  float hoverInfluence = (1.0 - smoothstep(0.0, uMouseRadius, mouseDist)) * uMouseInfluence;

  // The epsilon keeps the edges apart at uLight 0, where smoothstep is otherwise undefined and must read "no light".
  float lightReach = 1.0 - smoothstep(uLight, uLight * (1.0 + LIGHT_CRUMBLE_S) + 1e-5, effectiveRadius);

  // All three dissolve chars to dots; hover is 2.5x stronger, so it converts more than a passing ripple.
  float strength = max(max(hoverInfluence * 2.5, rippleInfluence), lightReach);
  float seed = aTheta0 * 7.13 + aRadius * 13.97;
  float threshold = fract(sin(seed * 12.9898) * 43758.5453);
  float isDot = step(threshold, strength);

  // Hold glitch: sparse slots blink letter to dot, re-rolled each tick, so the frozen spiral stays tense instead of dead.
  float glitchTick = floor(uTime * HOLD_GLITCH_RATE_S);
  float glitchNoise = fract(sin(seed * 91.7 + glitchTick * 7.31) * 43758.5453);
  isDot = max(isDot, step(glitchNoise, holdCharge * HOLD_GLITCH_FRACTION_S));
  float charIdxNow = mix(aCharIdx, ${DOT_INDEX}.0, isDot);
  // A dissolved letter shrinks to dot size, and the same envelope inflates glyphs as the wave passes.
  float sizePx = mix(aSize, DOT_SIZE_PX_S, isDot) * (1.0 + rippleInfluence * RIPPLE_SCALE_BOOST_S);

  // Tangent rotation (theta + π/2) reuses (c, s): cos becomes -sin and sin becomes cos, saving two trig calls.
  float designSize = sizePx * uPxToDesign;
  vec2 rotated = vec2(
    -position.x * s - position.y * c,
    position.x * c - position.y * s
  ) * designSize;

  // Hold shiver: a hashed subset trembles at detuned phases, scaled by charge until the release wave calms it ring by ring.
  float shakeSeed = fract(sin(aTheta0 * 91.17 + aRadius * 47.91) * 24634.6345);
  float shakes = step(shakeSeed, HOLD_SHAKE_FRACTION_S);
  vec2 tremor = vec2(
    sin(uTime * (38.0 + shakeSeed * 14.0) + shakeSeed * 271.0),
    cos(uTime * (34.0 + shakeSeed * 17.0) + shakeSeed * 113.0)
  ) * (holdCharge * shakes * HOLD_SHAKE_AMPLITUDE_S);

  vec2 worldPos = (ringCenter + rotated + tremor) * uFitScale + uCenter;

  float col = mod(charIdxNow, uAtlasGrid.x);
  float row = floor(charIdxNow / uAtlasGrid.x);
  vUv = vec2((col + uv.x) / uAtlasGrid.x, (row + (1.0 - uv.y)) / uAtlasGrid.y);

  vRingT = clamp(aRadius, 0.0, 1.2);

  // Each ring fades in as the entrance ripple's edge reaches it, then vAlpha stays at 1.
  float arrival = uRingArrivalTime[int(aRingIdx)];
  vAlpha = clamp((uTime - arrival) / ENTRANCE_FADE_S, 0.0, 1.0);
  vAlpha *= smoothstep(uLight, uLight * (1.0 + LIGHT_FADE_S) + 1e-5, effectiveRadius);

  gl_Position = vec4(worldPos, 0.0, 1.0);
}
`;

/** Vertex shader of the light disc: a full-screen quad scaled by uHalfSize. */
export const DISC_VERTEX = `#version 300 es
precision highp float;

in vec2 position;
in vec2 uv;

uniform vec2 uCenter;
uniform vec2 uHalfSize;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(uCenter + position * 2.0 * uHalfSize, 0.0, 1.0);
}
`;

/** Fragment shader of the light disc: an antialiased black circle. */
export const DISC_FRAGMENT = `#version 300 es
precision mediump float;

in vec2 vUv;

out vec4 fragColor;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  float edge = fwidth(d);
  fragColor = vec4(0.0, 0.0, 0.0, 1.0 - smoothstep(1.0 - edge, 1.0, d));
}
`;

/** Fragment shader of the glyphs: white, slightly dimmed near the center. */
export const GLYPH_FRAGMENT = `#version 300 es
precision mediump float;

uniform sampler2D tAtlas;

in vec2 vUv;
in float vRingT;
in float vAlpha;

out vec4 fragColor;

void main() {
  vec4 sampled = texture(tAtlas, vUv);
  float dim = mix(0.85, 1.0, smoothstep(0.0, 0.85, vRingT));
  fragColor = vec4(vec3(dim), sampled.a * vAlpha);
}
`;
