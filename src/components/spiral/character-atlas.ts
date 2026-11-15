import { ATLAS_COLUMNS, ATLAS_ROWS, DOT_INDEX, QUOTE } from "./constants";

/**
 * Rasterizes the tagline into an atlas texture: one 64px cell per character,
 * 8 columns per row. A dedicated cell after the quote is drawn as a filled
 * dot instead of text. The canvas is handed straight to an ogl `Texture`.
 */
export function buildCharacterAtlas(atlasFont: (sizePx: number) => string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = ATLAS_ROWS * 64;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    return canvas;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = atlasFont(57.6);

  for (let i = 0; i <= QUOTE.length; i++) {
    const x = (i % ATLAS_COLUMNS + 0.5) * 64;
    const y = (Math.floor(i / ATLAS_COLUMNS) + 0.55) * 64;

    if (i === DOT_INDEX) {
      ctx.beginPath();
      ctx.arc(x, y, 5.76, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.fillText(QUOTE[i] ?? "", x, y);
  }

  return canvas;
}

export { DOT_INDEX };
