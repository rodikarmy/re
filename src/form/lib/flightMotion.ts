/**
 * Численный интегратор "полёта" карточки сообщения (`at` в чанке формы,
 * строки 325-351). Два варианта: "throw" (вращение + падение вниз с
 * квадратичным ускорением) и "upward" (взлёт вверх с экспоненциальным
 * затуханием).
 */
export type FlightVariant = "throw" | "upward";

export interface FlightState {
  x: number;
  y: number;
  rotation: number;
  centerY: number;
  topOffset: number;
  finished: boolean;
}

export function createFlightMotion(
  width: number,
  height: number,
  variant: FlightVariant = "throw",
) {
  let t = 0;
  return {
    step(dt: number): FlightState {
      t += Math.min(Math.max(dt, 0), 50) / 1000;
      const translateY =
        variant === "upward"
          ? (1 - Math.exp(t * -1.8)) * -720
          : t * -500 + t * 480 * t;
      const rotation =
        variant === "upward" ? 0 : (12 / 0.45) * (1 - Math.exp(t * -0.45));
      const radians = (rotation * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const x = (width / 2) * (cos - 1) - (height / 2) * sin;
      const y =
        translateY + (width / 2) * sin + (height / 2) * (cos - 1);
      const extents = (width * Math.abs(sin) + height * Math.abs(cos)) / 2;
      return {
        x,
        y,
        rotation,
        centerY: translateY,
        topOffset: translateY + height / 2 - extents,
        finished:
          variant === "upward" ? translateY + extents < -500 : translateY - extents > 500,
      };
    },
  };
}
