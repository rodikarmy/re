import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { cn } from "../../lib/cn";
import { spring, popSpring } from "../../lib/motion";
import { useTint } from "./tint";
import { IconButton } from "../ui/IconButton";
import { ArrowRightIcon, CheckIcon, XIcon } from "../ui/icons";

/**
 * SubmitControl (`_Component5`) — полная реализация
 * из persona-form.pretty.js строки 1770-2175.
 *
 * Состояния: idle (стрелка/галочка) → countdown (SVG-кольцо, rAF-прогресс,
 * hover-пауза с экспоненциальным damping) → submitting (заливка) →
 * submitted ("Thanks", pop-spring масштаб, --persona-success-progress).
 */
export interface SubmitControlProps {
  countdownDurationMs: number;
  countdownPaused: boolean;
  pauseCountdownOnHover: boolean;
  active: boolean;
  hasValue: boolean;
  ariaLabel: string;
  onPress: () => void;
  onCancel: () => void;
  onCommit: () => void;
  submitting: boolean;
  commitPending: boolean;
  submitted: boolean;
}

const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = Math.PI * 2 * RING_RADIUS;

export function SubmitControl({
  countdownDurationMs,
  countdownPaused,
  pauseCountdownOnHover,
  active,
  hasValue,
  ariaLabel,
  onPress,
  onCancel,
  onCommit,
  submitting,
  commitPending,
  submitted,
}: SubmitControlProps) {
  const reducedMotion = useReducedMotion();
  const { tintColor, textColor } = useTint();
  const isSubmit = ariaLabel === "Submit";

  const [hovering, setHovering] = useState(false);
  const hoverPause = commitPending && hovering;
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const speedRef = useRef(1);
  const committedRef = useRef(false);

  // Сброс/установка прогресса при смене фаз
  useEffect(() => {
    if (commitPending) {
      progressRef.current = 0;
      speedRef.current = 1;
      committedRef.current = false;
      setProgress(0);
      return;
    }
    setHovering(false);
    if (submitting) {
      progressRef.current = 1;
      setProgress(1);
    }
  }, [commitPending, submitting, progressRef]);

  // rAF-луп countdown (экспоненциальный hover-damping, τ=180/220ms)
  useEffect(() => {
    if (!submitting || !commitPending || countdownPaused) return;
    let raf = 0;
    let last = performance.now();

    function tick(now: number) {
      const dt = Math.min(now - last, 64);
      last = now;
      const paused = hovering && pauseCountdownOnHover;
      const tau = paused ? 180 : 220;
      const k = 1 - Math.exp(-dt / tau);
      let speed = speedRef.current + (Number(paused ? 0 : 1) - speedRef.current) * k;
      if (paused && speed < 0.01) speed = 0;
      speedRef.current = speed;

      let next =
        progressRef.current + (speed * dt) / Math.max(1, countdownDurationMs);
      if (paused) next = Math.min(next, 0.999);

      if (next >= 1) {
        progressRef.current = 1;
        setProgress(1);
        if (!committedRef.current) {
          committedRef.current = true;
          onCommit();
        }
        return;
      }
      progressRef.current = next;
      setProgress(next);
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    hovering,
    commitPending,
    onCommit,
    submitting,
    countdownPaused,
    countdownDurationMs,
    pauseCountdownOnHover,
    progressRef,
  ]);

  // Анимация успеха (rotate/scale/position, transform-функции оригинала)
  const successValue = useMotionValue(submitted ? 1 : 0);
  useEffect(() => {
    const controls = animate(
      successValue,
      submitted ? 1 : 0,
      reducedMotion
        ? { duration: 0 }
        : {
            type: "spring",
            stiffness: 120,
            damping: 16,
            mass: 1,
            restDelta: 0.001,
            restSpeed: 0.01,
          },
    );
    return () => controls.stop();
  }, [successValue, submitted, reducedMotion]);

  const rotate = useTransform(successValue, (v) => Math.max(0, v - 1) * -90);
  const scale = useTransform(
    successValue,
    (v) => 1 + v * 0.125 + Math.max(0, v - 1) * 0.8,
  );
  const right = useTransform(successValue, (v) => `${v * 50}%`);
  const bottom = useTransform(
    successValue,
    (v) => `calc(${v * 50}% - ${v * 112 * (1 - v)}px)`,
  );
  const centerXY = useTransform(successValue, (v) => `${-50 + v * 100}%`);

  return (
    <motion.div
      data-persona-submit-control=""
      className={cn(
        "absolute size-8 transition-opacity duration-300",
        submitted && "pointer-events-none",
      )}
      initial={false}
      style={{ right, bottom, x: centerXY, y: centerXY }}
    >
      {/* Idle/next-кнопка */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: submitting || submitted ? 0 : 1,
          scale: submitting || submitted ? 0.72 : 1,
        }}
        transition={spring}
        style={{ pointerEvents: submitting || submitted ? "none" : "auto" }}
      >
        <IconButton
          aria-label={ariaLabel}
          variant={active || isSubmit ? "default" : "muted"}
          className={cn(
            "*:absolute *:inset-0 *:size-full",
            "transition-[background-color,color,border-color,transform,bottom,scale] duration-300",
            "border border-transparent",
            "touch:scale-100 active:scale-95",
          )}
          onClick={onPress}
          style={{
            color: hasValue
              ? "var(--color-white)"
              : "var(--persona-capture-action-fg)",
            backgroundColor: hasValue ? tintColor : "transparent",
            boxShadow: hasValue
              ? undefined
              : "0 1px 2px var(--persona-capture-action-shadow)",
            outline: hasValue
              ? undefined
              : "1pt solid var(--persona-capture-action-outline)",
          }}
          data-no-drag={true}
        >
          <ArrowRightIcon
            className={cn(
              "transition-[opacity,transform] duration-300 size-full",
              isSubmit ? "scale-50" : "scale-100",
              isSubmit ? "opacity-0" : hasValue ? "opacity-100" : "opacity-40",
            )}
            style={{ color: hasValue ? "var(--color-white)" : "var(--muted)" }}
          />
          <CheckIcon
            className={cn(
              "transition-[opacity,transform] duration-300 size-full",
              isSubmit ? "scale-100" : "scale-50",
              isSubmit ? (hasValue ? "opacity-100" : "opacity-40") : "opacity-0",
            )}
          />
        </IconButton>
      </motion.div>

      <AnimatePresence initial={false}>
        {submitted ? (
          <motion.p
            className="absolute top-full left-1/2 mt-3 -translate-x-1/2 whitespace-nowrap text-footnote font-[400] text-fg leading-none"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 2 }}
            transition={reducedMotion ? { duration: 0 } : spring}
            role="status"
            key="success"
          >
            Thanks
          </motion.p>
        ) : null}
        {submitting || submitted ? (
          <motion.button
            type="button"
            className="absolute inset-0 rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={
              commitPending && !reducedMotion
                ? { scale: 0.92, transition: { duration: 0.1 } }
                : undefined
            }
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : spring}
            aria-label={
              submitted
                ? "Submitted"
                : commitPending
                  ? "Cancel submission and edit role"
                  : "Submitting"
            }
            disabled={!commitPending}
            onMouseEnter={() => {
              if (commitPending) setHovering(true);
            }}
            onMouseLeave={() => setHovering(false)}
            onFocus={() => {
              if (commitPending) setHovering(true);
            }}
            onBlur={() => setHovering(false)}
            onClick={() => {
              setHovering(false);
              onCancel();
            }}
            style={{
              color: textColor,
              pointerEvents: commitPending ? "auto" : "none",
            }}
            data-no-drag={true}
            key="submitting"
          >
            <motion.svg
              data-persona-countdown=""
              className="absolute inset-0 size-full -rotate-90"
              viewBox="0 0 32 32"
              fill="none"
              style={{ color: tintColor }}
              initial={false}
              animate={{ opacity: commitPending && !hoverPause ? 1 : 0 }}
              transition={reducedMotion ? { duration: 0 } : spring}
              aria-hidden="true"
            >
              <circle
                cx="16"
                cy="16"
                r={RING_RADIUS}
                stroke="currentColor"
                strokeOpacity="0.22"
                strokeWidth="2"
              />
              <circle
                cx="16"
                cy="16"
                r={RING_RADIUS}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                opacity={progress > 0 ? 1 : 0}
              />
            </motion.svg>
            <motion.span
              data-persona-submitting-fill=""
              data-persona-success={submitted ? "" : undefined}
              className="absolute inset-0 rounded-full"
              initial={{
                scale: 1,
                backgroundColor: "transparent",
                color: tintColor,
              }}
              animate={{
                scale: commitPending && !hoverPause ? 0.75 : 1,
                backgroundColor: hoverPause
                  ? "var(--persona-capture-cancel-bg)"
                  : "transparent",
                color: hoverPause
                  ? "var(--color-white)"
                  : commitPending
                    ? tintColor
                    : "var(--color-white)",
              }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : {
                      ...spring,
                      scale: submitted ? popSpring : spring,
                    }
              }
            >
              <motion.span
                className="absolute inset-0"
                data-persona-success-motion=""
                style={{ rotate, scale }}
              >
                <motion.span
                  data-persona-completion-background=""
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: tintColor }}
                  initial={{ opacity: 0, "--persona-success-progress": "0%" }}
                  animate={{
                    opacity: commitPending ? 0 : 1,
                    "--persona-success-progress": submitted ? "100%" : "0%",
                  }}
                  transition={reducedMotion ? { duration: 0 } : spring}
                />
                <motion.span
                  className="absolute inset-0"
                  initial={{ strokeWidth: 0 }}
                  animate={{
                    opacity: hoverPause ? 0 : 1,
                    scale: hoverPause ? 0.5 : 1,
                    filter: hoverPause ? "blur(4px)" : "blur(0px)",
                    strokeWidth: commitPending && !hoverPause ? 0.5 : 0,
                  }}
                  transition={reducedMotion ? { duration: 0 } : spring}
                >
                  <CheckIcon
                    className="size-full"
                    stroke="currentColor"
                    strokeLinejoin="round"
                  />
                </motion.span>
                <motion.span
                  className="absolute inset-0"
                  animate={{
                    opacity: hoverPause ? 1 : 0,
                    scale: hoverPause ? 1 : 0.5,
                    filter: hoverPause ? "blur(0px)" : "blur(4px)",
                  }}
                  transition={reducedMotion ? { duration: 0 } : spring}
                >
                  <XIcon className="size-full" />
                </motion.span>
              </motion.span>
            </motion.span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

