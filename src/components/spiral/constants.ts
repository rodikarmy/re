/**
 * Shared constants of the spiral scene.
 *
 * The scene renders a spiral of characters taken from the tagline; every ring
 * of the spiral is a circle of instanced quads, and each quad samples one
 * glyph (or a dot) from a character atlas texture.
 */

/** Number of binary digits laid out on the spiral. */
const QUOTE_LENGTH = 8;

/** The tagline laid out on the spiral: a fresh random binary stream per load. */
export const QUOTE = Array.from(
  { length: QUOTE_LENGTH },
  () => (Math.random() < 0.5 ? "0" : "1"),
).join("");

/** Atlas index of the dot glyph; it occupies a cell after the quote. */
export const DOT_INDEX = QUOTE.length;

/** Indices of every real character (the whole quote). */
export const LETTER_INDEXES = Array.from(QUOTE).map((_, index) => index);

/** Atlas cells per row: the atlas is a fixed 8-column grid of 64px cells. */
export const ATLAS_COLUMNS = 8;

/** Number of rows the atlas needs to hold the quote plus the dot cell. */
export const ATLAS_ROWS = Math.ceil((QUOTE.length + 1) / ATLAS_COLUMNS);

/** Angular half-span (radians) around which letters prefer to cluster. */
export const LETTER_BAND_SPAN = Math.PI * 0.65;

/** Number of rings that make up the spiral. */
export const RING_COUNT = 30;

/** Maximum ripples alive at the same time (matches the shader array size). */
export const MAX_RIPPLES = 16;

/** Seconds a ripple wave stays alive. */
export const RIPPLE_DURATION_S = 1.8;

/** Shader-side palette: scene background. */
export const BACKGROUND = "#232323";

/** Label copy for the hold interaction, per state. */
export const HOLD_MESSAGES: Record<HoldState, string> = {
  idle: "Click & hold",
  holding: "Keep holding",
  charged: "Release",
};

export type HoldState = "idle" | "holding" | "charged";

/** Camera transform pushed into the scene by the page (scroll-driven). */
export interface SpiralCamera {
  x: number;
  y: number;
  zoom: number;
  twist: number;
  light: number;
  hidden: boolean;
}

export const DEFAULT_CAMERA: SpiralCamera = {
  x: 0,
  y: 0,
  zoom: 1,
  twist: 0,
  light: 0,
  hidden: false,
};

/**
 * Minimal read interface for the camera. A `MotionValue<SpiralCamera>`
 * satisfies it, but plain objects work too — the scene never writes to it.
 */
export interface CameraSource {
  get(): SpiralCamera;
  on(event: "change", listener: (value: SpiralCamera) => void): () => void;
}

/** Timing constants, in seconds, mirrored by the GLSL shader. */
export const TIMING = {
  /** Dot glyph size, in pixels. */
  DOT_SIZE_PX: 5,
  /** Entrance fade-in per ring, driven by the opening ripple. */
  ENTRANCE_FADE_S: 0.5,
  /** Hold charge-up time: from press to "charged". */
  HOLD_CHARGE_S: 0.9,
  /** How strongly the charged spiral gathers towards the center. */
  HOLD_GATHER_SCALE: 0.12,
  /** Fraction of characters that shiver while holding. */
  HOLD_SHAKE_FRACTION: 0.18,
  HOLD_SHAKE_AMPLITUDE: 0.002,
  /** Blink rate of the hold glitch (ticks per second). */
  HOLD_GLITCH_RATE: 9,
  HOLD_GLITCH_FRACTION: 0.15,
  /** Light disc crumble/fade widths (camera "light" radius). */
  LIGHT_CRUMBLE_S: 0.45,
  LIGHT_FADE_S: 0.1,
  /** Ripple wave shape. */
  RIPPLE_MAX_RADIUS: 1.6,
  RIPPLE_WIDTH_S: 0.85,
  RIPPLE_RADIAL_PUSH: 0.045,
  RIPPLE_SCALE_BOOST: 0.5,
  /** Cursor radius in design units; hover dissolves letters into dots. */
  MOUSE_RADIUS: 0.35,
  /** Cap for the device pixel ratio. */
  MAX_DPR: 2,
} as const;
