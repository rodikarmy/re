/**
 * WebGL glue shared by the scene: renderer defaults, a small canvas warm-up
 * pool (so the first render doesn't stall on context + extension setup),
 * color conversion and the mono font used by the character atlas.
 */

/** ogl Renderer defaults used by the site. */
export const RENDERER_PARAMS = {
  antialias: false,
  depth: false,
  stencil: false,
  powerPreference: "high-performance",
} as const;

const EXTENSIONS = [
  "EXT_color_buffer_float",
  "OES_texture_float_linear",
  "WEBGL_compressed_texture_astc",
  "EXT_texture_compression_bptc",
  "WEBGL_compressed_texture_s3tc",
  "WEBGL_compressed_texture_etc1",
  "WEBGL_compressed_texture_pvrtc",
  "WEBKIT_WEBGL_compressed_texture_pvrtc",
  "EXT_texture_filter_anisotropic",
] as const;

interface WarmCanvas {
  alpha: boolean;
  canvas: HTMLCanvasElement;
  timer: number;
}

const warmCanvases: WarmCanvas[] = [];

/** Pre-creates throwaway webgl2 contexts to warm extension resolution. */
function warmUpWebGL(alpha: boolean): void {
  if (warmCanvases.some((entry) => entry.alpha === alpha)) return;

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", {
    ...RENDERER_PARAMS,
    alpha,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return;

  for (const extension of EXTENSIONS) {
    gl.getExtension(extension);
  }

  const entry: WarmCanvas = {
    alpha,
    canvas,
    timer: window.setTimeout(() => {
      const index = warmCanvases.indexOf(entry);
      if (index >= 0) warmCanvases.splice(index, 1);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }, 4000),
  };
  warmCanvases.push(entry);
}

/**
 * Returns a pre-warmed canvas for the given alpha mode, creating one on
 * demand if the pool is empty (e.g. warm-up was skipped or already reaped).
 */
export function takeWarmCanvas(alpha: boolean): HTMLCanvasElement {
  const index = warmCanvases.findIndex((entry) => entry.alpha === alpha);
  if (index < 0) {
    warmUpWebGL(alpha);
    const warmed = warmCanvases.findIndex((entry) => entry.alpha === alpha);
    if (warmed >= 0) {
      const [entry] = warmCanvases.splice(warmed, 1);
      window.clearTimeout(entry.timer);
      return entry.canvas;
    }
    return document.createElement("canvas");
  }
  const [entry] = warmCanvases.splice(index, 1);
  window.clearTimeout(entry.timer);
  return entry.canvas;
}

/** Schedules work during browser idle time, with a plain timeout fallback. */
export function runWhenIdle(callback: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const handle = requestIdleCallback(callback, { timeout: 2000 });
    return () => cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(callback, 200);
  return () => window.clearTimeout(handle);
}

/** Converts "#rrggbb" into the 0…1 rgb triple WebGL clear colors expect. */
export function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

/** Font string for the atlas, resolved against the site's mono variable. */
export function atlasFont(sizePx: number, weight = 400): string {
  const family =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-mono")
      .trim() || "ui-monospace, monospace";
  return `${weight} ${Math.floor(sizePx)}px ${family}`;
}
