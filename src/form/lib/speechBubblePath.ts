/**
 * Генератор SVG-path речевого пузыря (speech-bubble-path-nGU9T00G.js,
 * экспорт `b`, функция I). Полный порт с сохранением констант.
 */
const defaultRadii = {
  topLeft: 12,
  topRight: 12,
  bottomRight: 12,
  bottomLeft: 12,
};
const STROKE_INSET = 1;
const TAIL_WIDTH = 18;
const TAIL_RISE = 8;
const DEFAULT_TAIL_INSET = 16;

function round(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

/** Ограничение радиусов под размеры (функция N). */
function clampRadii(width: number, height: number, radii: typeof defaultRadii) {
  const fit = (a: number, b: number, max: number): [number, number] => {
    const left = Math.max(0, a);
    const right = Math.max(0, b);
    const sum = left + right;
    if (sum <= max || sum === 0) return [left, right];
    const ratio = max / sum;
    return [left * ratio, right * ratio];
  };
  let { topLeft, topRight, bottomRight, bottomLeft } = radii;
  [topLeft, topRight] = fit(topLeft, topRight, width);
  [bottomLeft, bottomRight] = fit(bottomLeft, bottomRight, width);
  [topLeft, bottomLeft] = fit(topLeft, bottomLeft, height);
  [topRight, bottomRight] = fit(topRight, bottomRight, height);
  return { topLeft, topRight, bottomRight, bottomLeft };
}

function arc(radius: number, point: { x: number; y: number }) {
  return radius <= 0
    ? `L ${round(point.x)} ${round(point.y)}`
    : `A ${round(radius)} ${round(radius)} 0 0 1 ${round(point.x)} ${round(point.y)}`;
}

function cubic(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
) {
  return `C ${round(a.x)} ${round(a.y)} ${round(b.x)} ${round(b.y)} ${round(c.x)} ${round(c.y)}`;
}

function bezierPoint(
  origin: number,
  span: number,
  height: number,
  t: number,
  p: number,
) {
  return { x: origin + t * span, y: height + p * TAIL_RISE };
}

/** Зубчатый "union"-хвост (функция S) — серreff-based кривые. */
function unionTail(
  from: number,
  to: number,
  height: number,
): string {
  const span = to - from;
  const at = (u: number, v: number) => bezierPoint(from, span, height, u, v);
  return [
    cubic(at(0.933, 0), at(0.911, 0.02), at(0.881, 0.17)),
    cubic(at(0.85, 0.32), at(0.825, 0.86), at(0.786, 0.97)),
    cubic(at(0.753, 1), at(0.675, 1), at(0.619, 0.94)),
    cubic(at(0.467, 0.68), at(0.2, 0.21), at(0, 0)),
  ].join(" ");
}

/** Пузырьковый хвост (функция P) — путь из координат референс-иконки. */
function defaultTail(from: number, to: number, height: number): string {
  const scale = (to - from) / 23.370600000000003;
  const at = (x: number, y: number) => ({
    x: from + (x - 16.619) * scale,
    y: height + (y - 21.9365) * scale,
  });
  return [
    cubic(at(39.0472, 21.9365), at(38.5761, 21.9365), at(38.1845, 22.0155)),
    cubic(at(36.6064, 22.3339), at(35.373, 23.5673), at(35.0546, 25.1454)),
    cubic(at(34.9756, 25.537), at(34.9756, 26.0082), at(34.9756, 26.9505)),
    cubic(at(34.9756, 27.9671), at(34.9756, 28.4754), at(34.8871, 28.763)),
    cubic(at(34.5179, 29.9619), at(33.1489, 30.529), at(32.0401, 29.9422)),
    cubic(at(31.7741, 29.8015), at(31.4147, 29.4421), at(30.6959, 28.7232)),
    `L ${round(at(29.0641, 27.0914).x)} ${round(at(29.0641, 27.0914).y)}`,
    cubic(at(27.1616, 25.189), at(26.2104, 24.2377), at(25.1003, 23.5575)),
    cubic(at(24.1161, 22.9544), at(23.0431, 22.5099), at(21.9207, 22.2405)),
    cubic(at(20.6548, 21.9365), at(19.3095, 21.9365), at(16.619, 21.9365)),
  ].join(" ");
}

export interface SpeechBubbleOptions {
  width: number;
  height: number;
  radii?: typeof defaultRadii;
  strokeInset?: number;
  tailRightInset?: number;
  tailShape?: "default" | "union";
  tailScale?: number;
}

export function speechBubblePath({
  width,
  height,
  radii = defaultRadii,
  strokeInset = STROKE_INSET,
  tailRightInset = DEFAULT_TAIL_INSET,
  tailShape = "default",
  tailScale = 1,
}: SpeechBubbleOptions): string {
  if (width <= 0 || height <= 0) return "";
  const left = strokeInset;
  const top = strokeInset;
  const right = Math.max(left, width - strokeInset);
  const bottom = Math.max(top, height - strokeInset);
  const innerWidth = right - left;
  const innerHeight = bottom - top;
  const clamped = clampRadii(innerWidth, innerHeight, radii);
  const tailMinX = left + clamped.bottomLeft;
  const maxX = right - clamped.bottomRight;

  let tailStart = right - (tailRightInset - strokeInset);
  let tailEnd = tailStart - TAIL_WIDTH * tailScale;
  if (tailStart > maxX) {
    const shift = tailStart - maxX;
    tailStart -= shift;
    tailEnd -= shift;
  }
  if (tailEnd < tailMinX) tailEnd = tailMinX;
  const tailFits = tailStart - tailEnd >= 8;

  return [
    `M ${round(left + clamped.topLeft)} ${round(top)}`,
    `H ${round(right - clamped.topRight)}`,
    arc(clamped.topRight, { x: right, y: top + clamped.topRight }),
    `V ${round(bottom - clamped.bottomRight)}`,
    arc(clamped.bottomRight, { x: right - clamped.bottomRight, y: bottom }),
    tailFits ? `H ${round(tailStart)}` : `H ${round(left + clamped.bottomLeft)}`,
    tailFits
      ? (tailShape === "union" ? unionTail : defaultTail)(tailEnd, tailStart, bottom)
      : "",
    tailFits ? `H ${round(left + clamped.bottomLeft)}` : "",
    arc(clamped.bottomLeft, { x: left, y: bottom - clamped.bottomLeft }),
    `V ${round(top + clamped.topLeft)}`,
    arc(clamped.topLeft, { x: left + clamped.topLeft, y: top }),
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
}
