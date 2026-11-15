/**
 * Pointer wiring for the hold interaction.
 *
 * Keeps the floating label glued to the cursor and forwards normalized
 * (local, px) coordinates plus the press/release events to the scene.
 */

export interface HoldPointerHandlers {
  onPointerMove?(localX: number, localY: number): void;
  onPointerEnter?(localX: number, localY: number): void;
  onPointerLeave?(): void;
  onPointerDown?(localX: number, localY: number): void;
  onPointerUp?(localX: number, localY: number): void;
  onClick?(localX: number, localY: number): void;
}

export function bindHoldPointerEvents(
  container: HTMLElement,
  {
    signal,
    labelRef,
    setIsHovering,
    onPointerMove,
    onPointerEnter,
    onPointerLeave,
    onPointerDown,
    onPointerUp,
    onClick,
  }: HoldPointerHandlers & {
    signal: AbortSignal;
    labelRef: React.RefObject<HTMLDivElement | null>;
    setIsHovering: (isHovering: boolean) => void;
  },
): void {
  const toLocal = (event: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    return {
      localX: event.clientX - rect.left,
      localY: event.clientY - rect.top,
    };
  };

  const placeLabel = (localX: number, localY: number) => {
    const label = labelRef.current;
    if (label) {
      label.style.left = `${localX}px`;
      label.style.top = `${localY}px`;
    }
  };

  const leave = () => {
    onPointerLeave?.();
    setIsHovering(false);
  };

  container.addEventListener("pointermove", (event) => {
    const { localX, localY } = toLocal(event);
    placeLabel(localX, localY);
    onPointerMove?.(localX, localY);
  }, { passive: true, signal });

  container.addEventListener("pointerenter", (event) => {
    const { localX, localY } = toLocal(event);
    placeLabel(localX, localY);
    onPointerEnter?.(localX, localY);
    setIsHovering(true);
  }, { signal });

  container.addEventListener("pointerleave", leave, { signal });
  container.addEventListener("pointercancel", leave, { signal });

  container.addEventListener("pointerdown", (event) => {
    const { localX, localY } = toLocal(event);
    onPointerDown?.(localX, localY);
  }, { signal });

  container.addEventListener("pointerup", (event) => {
    const { localX, localY } = toLocal(event);
    onPointerUp?.(localX, localY);
  }, { signal });

  container.addEventListener("click", (event) => {
    const { localX, localY } = toLocal(event);
    onClick?.(localX, localY);
  }, { signal });
}
