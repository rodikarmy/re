/**
 * Ring layout: where each ring sits, how fast it spins and which angular band
 * its letters occupy. Instances (individual characters) are derived from it.
 */

import {
  DOT_INDEX,
  LETTER_BAND_SPAN,
  LETTER_INDEXES,
  RING_COUNT,
  TIMING,
} from "./constants";

export interface RingLayout {
  /** Ring radius, in design units (roughly 0.06 … 1.45). */
  radius: number;
  /** Number of character slots placed on the ring. */
  charsCount: number;
  /** Spin speed, radians per second; neighbours alternate direction. */
  speed: number;
  /** Letter height in screen pixels. */
  letterSizePx: number;
  /** Center of the angular band that prefers letters, radians. */
  bandCenter: number;
  /** Half width of that band, radians. */
  bandHalfWidth: number;
  /** Softness of the band edges, radians. */
  bandSoftness: number;
}

/** Signed shortest angular distance, normalized to (-π … π]. */
export function angularDistance(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** Hermite smoothstep, clamped. */
export function smoothstep(from: number, to: number, value: number): number {
  if (from === to) {
    return value < from ? 0 : 1;
  }
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/**
 * Inverse of `smoothstep(0, 1, x)`: solved numerically with Newton
 * iterations. Used to find the moment a (smoothstepped) ripple wavefront
 * passes a given radius.
 */
export function inverseSmoothstep(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  let x = value;
  for (let i = 0; i < 6; i++) {
    const squared = x * x;
    const residual = 3 * squared - 2 * squared * x - value;
    const derivative = 6 * x - 6 * squared;
    if (derivative === 0) break;
    x -= residual / derivative;
  }
  return Math.max(0, Math.min(1, x));
}

/**
 * Builds the 30 ring descriptors. Inner rings are small, dense and slow,
 * outer rings are large and fast; a minority of rings get random bands so
 * the spiral never looks perfectly regular.
 */
export function createRingLayouts(): RingLayout[] {
  const layouts = Array<RingLayout | undefined>(RING_COUNT);

  for (let i = 0; i < RING_COUNT; i++) {
    const progress = i / (RING_COUNT - 1);

    const radius = 0.06 + progress * 1.39;
    const speed = (i % 2 === 0 ? 1 : -1) * (0.006 + (1 - progress) * 0.029);
    const letterSizePx = 14 + progress * 16;

    // Enough slots to cover the circumference with ~60% wide glyphs.
    const charsCount = Math.max(
      8,
      Math.floor((Math.PI * 2 * radius) / (letterSizePx * 0.6 * (2 / 1080))),
    );

    // 15% of rings point anywhere; the rest cluster around the letter band.
    const bandCenter =
      Math.random() < 0.15
        ? Math.random() * Math.PI * 2
        : 0.25 + (Math.random() - 0.5) * LETTER_BAND_SPAN;

    // 10% of rings are narrow; the rest widen towards the outside.
    const bandHalfWidthRaw =
      Math.random() < 0.1
        ? 0.05 + Math.random() * 0.15
        : 0.25 + progress * 0.35 + Math.random() * 0.3;

    layouts[i] = {
      radius,
      charsCount,
      speed,
      letterSizePx,
      bandCenter,
      bandHalfWidth: Math.min(0.98, bandHalfWidthRaw) * Math.PI,
      bandSoftness: Math.PI * (0.07 + Math.random() * 0.13),
    };
  }

  return layouts as RingLayout[];
}

/**
 * Per-ring fade-in times. The opening ripple eases its wavefront outwards;
 * each ring becomes visible exactly when the front reaches its radius.
 */
export function computeRingArrivalTimes(layouts: RingLayout[]): number[] {
  const arrivals = Array<number>(RING_COUNT).fill(0);

  for (let i = 0; i < RING_COUNT; i++) {
    const layout = layouts[i];
    if (!layout) continue;

    const distance = Math.max(0, layout.radius - 0.425);
    arrivals[i] = inverseSmoothstep(Math.min(1, distance / 1.6)) * 1.8;
  }

  return arrivals;
}

export interface RingInstances {
  aRadius: Float32Array;
  aTheta0: Float32Array;
  aSpeed: Float32Array;
  aSize: Float32Array;
  aCharIdx: Float32Array;
  aRingIdx: Float32Array;
  total: number;
}

/**
 * Walks each ring's slots, assigning letters inside the band and dots
 * outside it. Letters keep the tagline order with occasional 1–3 character
 * gaps, which is what makes some arcs dissolve into pure dot chains.
 */
export function buildRingInstances(layouts: RingLayout[]): RingInstances {
  let total = 0;
  for (const layout of layouts) {
    total += layout.charsCount;
  }

  const aRadius = new Float32Array(total);
  const aTheta0 = new Float32Array(total);
  const aSpeed = new Float32Array(total);
  const aSize = new Float32Array(total);
  const aCharIdx = new Float32Array(total);
  const aRingIdx = new Float32Array(total);

  let cursor = 0;

  for (let ringIdx = 0; ringIdx < layouts.length; ringIdx++) {
    const layout = layouts[ringIdx];
    if (!layout) continue;

    const { isLetter, letterIdx } = scatterLetters(layout.charsCount);

    const thetaOffset = Math.random() * Math.PI * 2;
    const thetaStep = (Math.PI * 2) / layout.charsCount;
    const bandOuter = layout.bandHalfWidth + layout.bandSoftness;
    const bandInner = Math.max(0, layout.bandHalfWidth - layout.bandSoftness);

    for (let slot = 0; slot < layout.charsCount; slot++) {
      const theta = thetaOffset + slot * thetaStep;
      const bandDistance = Math.abs(angularDistance(theta - layout.bandCenter));
      // 0 inside the band core, 1 past the soft edge — biased sample.
      const falloff = smoothstep(bandOuter, bandInner, bandDistance);
      const keepLetter = isLetter[slot] === 1 && (falloff > 0.7 || (!(falloff < 0.3) && Math.random() < falloff));

      aRadius[cursor] = layout.radius;
      aTheta0[cursor] = theta;
      aSpeed[cursor] = layout.speed;
      aRingIdx[cursor] = ringIdx;

      if (keepLetter) {
        aCharIdx[cursor] = letterIdx[slot] ?? 0;
        // Letters slightly deeper in the band render a touch larger.
        aSize[cursor] = layout.letterSizePx * (0.85 + falloff * 0.15);
      } else {
        aCharIdx[cursor] = DOT_INDEX;
        aSize[cursor] = TIMING.DOT_SIZE_PX;
      }

      cursor++;
    }
  }

  return { aRadius, aTheta0, aSpeed, aSize, aCharIdx, aRingIdx, total };
}

/**
 * Picks which slots carry letters: the tagline order repeats with random
 * 1–3 slot gaps. Returns a per-slot flag plus the atlas index per slot.
 */
function scatterLetters(charsCount: number): { isLetter: Uint8Array; letterIdx: Uint16Array } {
  const isLetter = new Uint8Array(charsCount);
  const letterIdx = new Uint16Array(charsCount);

  let slot = 0;
  while (slot < charsCount) {
    for (let i = 0; i < LETTER_INDEXES.length && slot < charsCount; i++) {
      isLetter[slot] = 1;
      letterIdx[slot] = LETTER_INDEXES[i] ?? 0;
      slot++;
    }
    const gap = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < gap && slot < charsCount; i++) {
      slot++;
    }
  }

  return { isLetter, letterIdx };
}
