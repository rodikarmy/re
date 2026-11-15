import { useEffect, useRef } from "react";

/**
 * Subscribes a handler to the page scroll velocity, in px/s.
 *
 * The original scene reads this from the site's smooth-scroll (lenis)
 * instance; this stand-in derives the same velocity from native window
 * scrolling so the spiral keeps its scroll-linked spin either way.
 */
export function bindScrollVelocity(onVelocity: (velocity: number) => void): () => void {
  let lastY = window.scrollY;
  let lastTime = performance.now();
  let velocity = 0;
  let raf = 0;

  const tick = () => {
    const y = window.scrollY;
    const now = performance.now();
    const dt = Math.max(1, now - lastTime) / 1000;

    const instant = (y - lastY) / dt;
    velocity += (instant - velocity) * 0.1;
    onVelocity(velocity);

    lastY = y;
    lastTime = now;
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/** React hook wrapper: stores the latest velocity into a ref. */
export function useScrollVelocity(): React.RefObject<number> {
  const velocityRef = useRef(0);

  useEffect(() => bindScrollVelocity((velocity) => {
    velocityRef.current = velocity;
  }), []);

  return velocityRef;
}
