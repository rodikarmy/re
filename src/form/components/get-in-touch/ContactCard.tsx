import { useRef, useState } from "react";
import {
  animate,
  motion,
  useDragControls,
  useInView,
  useMotionValue,
  useTransform,
} from "motion/react";
import { PersonaCard } from "../PersonaCard";
import {
  contactCardHidden,
  paperSpring,
} from "../../../lib/motion";

/**
 * ContactCard (`Ks` в content.layout-чанке, строки 2521-2629).
 *
 * Карточка формы влетает в панель при появлении в вьюпорте (once):
 * из {opacity: 0, rotate: -12, x: 30, y: -420} в нейтральное положение.
 * rotate — пружиной с bounce 0.45, x/y — с bounce 0.3 (`paperSpring`).
 * До завершения входа карточка pointer-events-none; после —
 * можно драгать за data-drag-handle (упругость 0.14, возврат
 * пружиной, зависящей от расстояния отлёта).
 */

/** Пружина возврата после драга (`Zs`): чем дальше утащили, тем жёстче. */
function releaseSpring(distance: number) {
  const progress = Math.min(distance / 36, 1);
  return {
    damping: 30 - progress * 8,
    mass: 0.9,
    stiffness: 170 + progress * 90,
    type: "spring",
  } as const;
}

export interface ContactCardProps {
  onEntered?: () => void;
}

export function ContactCard({ onEntered }: ContactCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true });
  const dragControls = useDragControls();

  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const dragRotate = useTransform(dragX, [-140, 0, 140], [-4, 0, 4]);

  const [dragging, setDragging] = useState(false);
  const [interactive, setInteractive] = useState(false);

  return (
    <div ref={containerRef} className="shrink-0 overflow-visible">
      <div ref={cardRef} data-contact-keyboard-card="">
        <motion.div
          className={interactive ? "origin-top" : "pointer-events-none origin-top"}
          initial={contactCardHidden}
          animate={
            inView
              ? {
                  opacity: 1,
                  rotate: 0,
                  x: 0,
                  y: 0,
                }
              : contactCardHidden
          }
          transition={{
            opacity: { duration: 0.1 },
            rotate: { ...paperSpring, bounce: 0.45 },
            x: paperSpring,
            y: paperSpring,
          }}
          onAnimationComplete={() => {
            if (inView && !interactive) {
              setInteractive(true);
              onEntered?.();
            }
          }}
        >
          <motion.div
            className={dragging ? "origin-bottom select-none" : "origin-bottom"}
            style={{
              rotate: dragRotate,
              x: dragX,
              y: dragY,
            }}
            drag={true}
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragConstraints={{
              bottom: 0,
              left: 0,
              right: 0,
              top: 0,
            }}
            dragElastic={0.14}
            onPointerDown={(event) => {
              if (
                event.target instanceof Element &&
                event.target.closest("[data-drag-handle]")
              ) {
                event.preventDefault();
                setDragging(true);
                dragControls.start(event);
              }
            }}
            onPointerCancel={() => setDragging(false)}
            onPointerUp={() => setDragging(false)}
            onDragStart={() => {
              setDragging(true);
              document.getSelection()?.removeAllRanges();
            }}
            onDragEnd={() => {
              setDragging(false);
              const spring = releaseSpring(
                Math.hypot(dragX.get(), dragY.get()),
              );
              animate(dragX, 0, spring);
              animate(dragY, 0, spring);
            }}
          >
            <PersonaCard glass={true} showIntro={false} source="get-in-touch" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
