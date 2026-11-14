import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";

/**
 * Минимальный ScrollArea (в оригинале — обёртки Base UI ScrollArea из
 * чанка ScrollAreaThumb: Viewport/Content/Scrollbar/Thumb).
 * Скрывает нативный скроллбар, рисует тонкий индикатор справа
 * (top 18 / right 5 / bottom 18, как в оригинале).
 */
export interface ScrollAreaProps {
  viewportRef?: React.Ref<HTMLDivElement>;
  className?: string;
  style?: React.CSSProperties;
  onWheelCapture?: React.WheelEventHandler;
  onTouchMoveCapture?: React.TouchEventHandler;
  onPointerDownCapture?: React.PointerEventHandler;
  children: React.ReactNode;
}

export function ScrollArea({
  viewportRef,
  className,
  style,
  onWheelCapture,
  onTouchMoveCapture,
  onPointerDownCapture,
  children,
}: ScrollAreaProps) {
  const fallbackRef = useRef<HTMLDivElement>(null);
  const ref = (viewportRef as React.MutableRefObject<HTMLDivElement> | null) ?? fallbackRef;
  const [metrics, setMetrics] = useState({ thumbHeight: 0, offset: 0, scrollable: false });

  function update() {
    const el = ref?.current;
    if (!el) return;
    const scrollable = el.scrollHeight > el.clientHeight + 1;
    const ratio = el.clientHeight / el.scrollHeight;
    const thumbHeight = scrollable ? Math.max(24, el.clientHeight * ratio) : 0;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const offset =
      maxScroll > 0 ? (el.scrollTop / maxScroll) * (el.clientHeight - thumbHeight) : 0;
    setMetrics({ thumbHeight, offset, scrollable });
  }

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn("relative", className)} onWheelCapture={onWheelCapture}>
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(
          "h-full overflow-y-auto overscroll-contain",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
        style={style}
        onScroll={update}
        onTouchMoveCapture={onTouchMoveCapture}
        onPointerDownCapture={onPointerDownCapture}
      >
        {children}
      </div>
      {metrics.scrollable && (
        <div
          aria-hidden="true"
          className="absolute flex w-1 justify-center rounded-full transition-opacity hover:opacity-100"
          style={{ top: 18, right: 5, bottom: 18 }}
          data-hovering=""
        >
          <div
            className="w-full rounded-full bg-muted/60 transition-[height] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              height: metrics.thumbHeight,
              marginTop: metrics.offset,
            }}
          />
        </div>
      )}
    </div>
  );
}
