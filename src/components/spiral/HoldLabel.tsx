import { cn } from "../../lib/cn";
import { useIsTouchDevice } from "./use-media-query";

interface HoldLabelProps {
  labelRef: React.RefObject<HTMLDivElement | null>;
  isHovering: boolean;
  text?: string;
}

/**
 * The floating hold hint. On touch devices it sits pinned to the top-right
 * corner ("Tap & hold"); on desktop it trails the cursor with a small offset
 * and fades in only while hovering.
 */
export function HoldLabel({ labelRef, isHovering, text = "Click" }: HoldLabelProps) {
  const isTouchDevice = useIsTouchDevice();

  if (isTouchDevice) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-16 right-16 z-2 select-none whitespace-nowrap bg-white p-2 font-mono text-black text-caption-10 uppercase"
      >
        {text}
      </div>
    );
  }

  return (
    <div
      ref={labelRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-2 translate-x-20 translate-y-20 select-none whitespace-nowrap bg-white p-2 font-mono text-black text-caption-10 uppercase transition-opacity duration-150",
        isHovering ? "opacity-100" : "opacity-0",
      )}
    >
      {text}
    </div>
  );
}
