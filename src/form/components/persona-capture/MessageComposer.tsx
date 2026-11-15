import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { speechBubblePath } from "../../lib/speechBubblePath";
import {
  createFlightMotion,
  type FlightVariant,
} from "../../lib/flightMotion";
import {
  validateContactMessage,
  MAX_MESSAGE_LENGTH,
} from "../../lib/validation";
import type { CapturePhase, SubmissionCallbacks } from "./types";
import { ScrollArea } from "../../../components/ui/ScrollArea";
import { ArrowRightIcon } from "../../../components/ui/icons";
import { SocialButton } from "./SocialButton";

/**
 * MessageComposer (`_Component6`) — полная реализация
 * из persona-form.pretty.js строки 362-997.
 *
 * Follow-up-режим (source="get-in-touch"): после успешной отправки формы.
 * Фазы: follow-up → message-sending → message-sent | message-error.
 * Визуал: речевой пузырь (speech-bubble-path), авто-высота textarea (56→144),
 * при отправке пузырь "отрывается" и улетает (flightMotion), сверху
 * появляется "Thank you for your message, {firstName}.", затем соцкнопки.
 */
export interface MessageComposerProps {
  firstName?: string;
  name: string;
  submissionId: string;
  phase: "follow-up" | "message-sending" | "message-sent" | "message-error";
  onPhaseChange: (phase: CapturePhase) => void;
  onSubmit: (
    payload: Record<string, string>,
    callbacks: SubmissionCallbacks,
  ) => void;
  onError: (message: string) => void;
  flightVariant: FlightVariant;
}

export function MessageComposer({
  firstName,
  name,
  submissionId,
  phase,
  onPhaseChange,
  onSubmit,
  onError,
  flightVariant,
}: MessageComposerProps) {
  const reducedMotion = useReducedMotion();
  const displayName = firstName ?? splitNameSafe(name);
  const [message, setMessage] = useState("");
  const [bubbleHeight, setBubbleHeight] = useState(56);
  const [scrollable, setScrollable] = useState(false);
  const [detachedMargin, setDetachedMargin] = useState(-8);

  const measureSpanRef = useRef<HTMLSpanElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollFollowRef = useRef(false);
  const pendingNewlineRef = useRef<string | null>(null);
  const detachedMessageRef = useRef<HTMLDivElement>(null);
  const lastValidatedRef = useRef<Record<string, string> | null>(null);
  const sendingRef = useRef(false);

  const isSending = phase === "message-sending";
  const isSent = phase === "message-sent";
  const detached = isSent;
  const [flightSettled, setFlightSettled] = useState(false);
  const flightDone = detached && flightSettled;
  const [socialVisible, setSocialVisible] = useState(false);
  const socialShown = flightDone && socialVisible;

  // ── motion values полёта ────────────────────────────────────────────
  const flightX = useMotionValue(0);
  const flightY = useMotionValue(0);
  const flightRotate = useMotionValue(0);
  const flightOpacity = useMotionValue(1);
  const hintValue = useMotionValue(0.5); // blur/opacity строки "In the meantime"
  const hintBlur = useTransform(
    hintValue,
    [0.5, 0],
    ["blur(0px)", "blur(6px)"],
  );

  // ── текстовый блок: swap "We'll be in touch" → "Thank you…" ─────────
  const thankyouLineRef = useRef<HTMLSpanElement>(null);
  const thankyouHeightRef = useRef(0);
  const [thankyouHeight, setThankyouHeight] = useState(0);
  const lineProgress = useMotionValue(0); // 0..1
  const thankyouOpacity = useTransform(
    lineProgress,
    [0, 0.5, 1],
    [0, 0, 1],
  );
  const defaultOpacity = useTransform(lineProgress, [0, 1], [1, 0.5]);
  const lineShift = useTransform(
    lineProgress,
    [0, 1],
    [0, thankyouHeight + 4],
    { clamp: false },
  );
  const thankyouShift = useTransform(
    lineShift,
    (v) => v - thankyouHeight - 4,
  );

  useLayoutEffect(() => {
    const el = thankyouLineRef.current;
    if (!el) return;
    const measure = () => setThankyouHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSocialVisible(false);
    const controls = animate(
      lineProgress,
      flightDone ? 1 : 0,
      reducedMotion
        ? { duration: 0 }
        : {
            type: "spring",
            stiffness: 100,
            damping: 15,
            mass: 1,
            onComplete: () => {
              if (flightDone) setSocialVisible(true);
            },
          },
    );
    return () => controls.stop();
  }, [flightDone, lineProgress, reducedMotion]);

  useEffect(() => {
    if (flightVariant === "upward") return;
    const controls = animate(hintValue, detached ? 0 : 0.5, {
      duration: reducedMotion ? 0 : 0.4,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [detached, flightVariant, hintValue, reducedMotion]);

  // ── полёт пузыря (rAF-интегратор) ───────────────────────────────────
  const bubbleRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    setFlightSettled(false);
    flightX.set(0);
    flightY.set(0);
    flightRotate.set(0);
    flightOpacity.set(1);
    if (flightVariant === "upward") {
      hintValue.set(0.5);
    }
    if (!detached) return;

    if (reducedMotion) {
      flightOpacity.set(0);
      setFlightSettled(true);
      if (flightVariant === "upward") hintValue.set(0);
      return;
    }

    let raf = 0;
    const anchorTop =
      bubbleRef.current?.getBoundingClientRect().top ?? 0;
    const hintRect = thankyouLineRef.current?.getBoundingClientRect();
    const formStyle = formRef.current && getComputedStyle(formRef.current);
    const baseMarginBottom = Number.parseFloat(formStyle?.marginBottom ?? "0");
    const baseHeight = Number.parseFloat(formStyle?.height ?? "56");
    const flight = createFlightMotion(
      bubbleRef.current?.clientWidth ?? 254,
      bubbleRef.current?.clientHeight ?? 56,
      flightVariant,
    );

    let last = performance.now();
    const tick = (now: number) => {
      const state = flight.step(now - last);
      last = now;
      const form = formRef.current;
      if (form) {
        const style = getComputedStyle(form);
        const width = Number.parseFloat(style.width);
        const height = Number.parseFloat(style.height);
        const radians = (state.rotation * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        flightX.set((width / 2) * (cos - 1) - (height / 2) * sin);
        flightY.set(
          state.centerY +
            (width / 2) * sin +
            (height / 2) * (cos - 1) +
            Number.parseFloat(style.marginBottom) -
            baseMarginBottom +
            (height - baseHeight) / 2,
        );
      }
      flightRotate.set(state.rotation);
      if (flightVariant === "upward" && hintRect) {
        const visible = Math.max(
          0,
          Math.min(
            1,
            (hintRect.bottom - anchorTop - state.topOffset) /
              Math.max(24, hintRect.height),
          ),
        );
        hintValue.set((1 - visible * visible * (3 - visible * 2)) * 0.5);
      }
      if (state.finished) {
        flightOpacity.set(0);
        setFlightSettled(true);
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [detached, reducedMotion, flightVariant, flightX, flightY, flightRotate, flightOpacity, hintValue]);

  // ── path пузыря (ResizeObserver) ────────────────────────────────────
  const [bubblePath, setBubblePath] = useState("");
  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (!el) return;
    const measure = () =>
      setBubblePath(
        speechBubblePath({
          width: el.clientWidth,
          height: el.clientHeight,
          radii: {
            topLeft: 17,
            topRight: 17,
            bottomLeft: 17,
            bottomRight: 17,
          },
          tailRightInset: 21,
          tailShape: "union",
          tailScale: 1.5,
        }),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── авто-высота textarea / detached-сообщение ───────────────────────
  useEffect(() => {
    if (detached) {
      const el = detachedMessageRef.current;
      if (!el) return;
      const measure = () => {
        setBubbleHeight(Math.min(el.clientHeight, 144));
        setScrollable(el.clientHeight > 144);
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }
    const textarea = textareaRef.current;
    if (!textarea || isSending || isSent) {
      return;
    }
    const viewport = viewportRef.current;
    const followCaret = () => {
      if (
        viewport &&
        scrollFollowRef.current &&
        document.activeElement === textarea &&
        textarea.selectionStart === textarea.value.length &&
        textarea.selectionEnd === textarea.value.length
      ) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    };
    const resize = () => {
      textarea.style.height = "auto";
      textarea.style.height = message ? `${textarea.scrollHeight}px` : "56px";
      textarea.scrollTop = 0;
      setBubbleHeight(Math.min(textarea.clientHeight, 144));
      setScrollable(textarea.clientHeight > 144);
      followCaret();
    };
    resize();
    let lastWidth = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth !== lastWidth) {
        lastWidth = textarea.clientWidth;
        resize();
      }
      followCaret();
    });
    observer.observe(textarea);
    if (viewport) observer.observe(viewport);
    return () => observer.disconnect();
  }, [message, isSending, isSent, detached]);

  // ── отправка ────────────────────────────────────────────────────────
  function sendMessage() {
    if (sendingRef.current || isSending || isSent) return;
    if (!message.trim()) {
      onError("Enter a message before sending");
      textareaRef.current?.focus();
      return;
    }
    const text = message.trim();
    let validated;
    try {
      validated = validateContactMessage({
        submissionId,
        messageId:
          lastValidatedRef.current?.message === text
            ? lastValidatedRef.current.messageId
            : createUUID(),
        message: text,
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Invalid message");
      textareaRef.current?.focus();
      return;
    }
    setMessage(text);
    // центрируем "отрывающийся" пузырь
    const bubble = bubbleRef.current;
    const measure = measureSpanRef.current;
    if (bubble && measure) {
      const width = Math.min(
        bubble.clientWidth - 16,
        Math.max(
          56,
          Math.ceil(Number.parseFloat(getComputedStyle(measure).width)) + 32,
        ),
      );
      setDetachedMargin((bubble.clientWidth - width) / 2 - 16);
    }
    lastValidatedRef.current = validated as unknown as Record<string, string>;
    sendingRef.current = true;
    onPhaseChange("message-sending");
    onSubmit(validated as unknown as Record<string, string>, {
      onSuccess: () => {
        sendingRef.current = false;
        onPhaseChange("message-sent");
      },
      onError: (errorMessage) => {
        sendingRef.current = false;
        onPhaseChange("message-error");
        onError(errorMessage);
        requestAnimationFrame(() => textareaRef.current?.focus());
      },
    });
  }

  return (
    <motion.div
      data-persona-follow-up=""
      className="absolute inset-0 flex flex-col justify-between p-4 text-fg"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.4 }}
    >
      <p className="relative max-w-48 text-body font-[400] leading-tight">
        <motion.span
          ref={thankyouLineRef}
          className="absolute inset-x-0 top-0 block origin-top-left"
          aria-hidden={!flightDone}
          style={{
            opacity: thankyouOpacity,
            y: thankyouShift,
          }}
        >
          Thank you for your message{displayName ? `, ${displayName}` : ""}.
        </motion.span>
        <motion.span
          className="block"
          style={{ y: lineShift }}
        >
          <motion.span style={{ opacity: defaultOpacity }}>
            We'll be in touch.{" "}
          </motion.span>
          <motion.span
            aria-hidden={detached}
            style={{ opacity: hintValue, filter: hintBlur }}
          >
            In the meantime, tell us more about your project.
          </motion.span>
        </motion.span>
      </p>
      <span
        ref={measureSpanRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute w-max whitespace-pre text-caption leading-6"
      >
        {message.trim()}
      </span>
      <motion.form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
        className="mt-4"
        initial={false}
        style={{
          x: flightX,
          y: flightY,
          rotate: flightRotate,
          opacity: flightOpacity,
          transformOrigin: "100% 100%",
          pointerEvents: isSent ? "none" : undefined,
        }}
        animate={{
          marginLeft: detached ? detachedMargin : -16,
          marginRight: detached ? detachedMargin : -16,
          marginBottom: detached ? 1 : -16,
        }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : detached
              ? {
                  type: "spring",
                  stiffness: 260,
                  damping: 30,
                  mass: 0.9,
                }
              : {
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }
        }
      >
        <div
          className="persona-message relative rounded-b-[1.0625rem]"
          data-reporter-message-bubble=""
          data-detached={detached ? "" : undefined}
          ref={bubbleRef}
        >
          <div
            aria-hidden="true"
            className="persona-message-background pointer-events-none absolute inset-0 rounded-b-[1.0625rem]"
          />
          <svg
            aria-hidden="true"
            className="persona-message-submitted pointer-events-none absolute inset-x-0 top-0 w-full overflow-visible"
            style={{ height: "calc(100% + 14px)" }}
          >
            <path d={bubblePath} fill="var(--selection-bg)" />
          </svg>
          <>
            <ScrollArea
              viewportRef={viewportRef}
              onWheelCapture={() => {
                scrollFollowRef.current = false;
              }}
              onTouchMoveCapture={() => {
                scrollFollowRef.current = false;
              }}
              onPointerDownCapture={() => {
                scrollFollowRef.current = false;
              }}
              className="relative overflow-hidden rounded-b-[1.0625rem]"
              style={{
                height: bubbleHeight,
                transition: reducedMotion
                  ? "none"
                  : "height 280ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {detached && (
                <div
                  ref={detachedMessageRef}
                  className="min-h-14 whitespace-pre-wrap break-words p-4 text-caption leading-6"
                >
                  {message.trim() || "Message sent"}
                </div>
              )}
              <textarea
                ref={textareaRef}
                rows={1}
                aria-label="Leave a message"
                placeholder="Leave a message"
                value={message}
                disabled={isSending || detached}
                style={detached ? { display: "none" } : undefined}
                spellCheck={!isSending}
                autoCorrect={isSending ? "off" : "on"}
                onChange={(event) => {
                  const el = event.currentTarget;
                  scrollFollowRef.current =
                    el.selectionStart === el.value.length &&
                    el.selectionEnd === el.value.length;
                  setMessage(el.value);
                }}
                onBlur={() => {
                  pendingNewlineRef.current = null;
                  setMessage((prev) => prev.trimEnd());
                }}
                maxLength={MAX_MESSAGE_LENGTH}
                className="relative block min-h-14 w-full resize-none overflow-hidden bg-transparent py-4 pr-14 pl-4 text-caption leading-6 text-inherit outline-none placeholder:text-muted placeholder:opacity-50 disabled:opacity-100"
                onKeyDown={(event) => {
                  const pending = pendingNewlineRef.current;
                  pendingNewlineRef.current = null;
                  if (event.nativeEvent.isComposing || event.repeat) {
                    return;
                  }
                  const el = event.currentTarget;
                  if (
                    event.key === "Enter" &&
                    (event.shiftKey ||
                      event.metaKey ||
                      event.ctrlKey ||
                      (pending === el.value &&
                        el.selectionStart === el.value.length &&
                        el.selectionEnd === el.value.length))
                  ) {
                    event.preventDefault();
                    sendMessage();
                  } else if (
                    event.key === "Enter" &&
                    !event.altKey &&
                    el.selectionStart === el.value.length &&
                    el.selectionEnd === el.value.length
                  ) {
                    pendingNewlineRef.current = `${el.value}\n`;
                  }
                }}
              />
            </ScrollArea>
            <button
              type="submit"
              aria-label={isSending ? "Sending message" : "Send message"}
              disabled={isSending || detached}
              style={
                message.trim()
                  ? undefined
                  : {
                      backgroundColor: "transparent",
                      color: "var(--persona-capture-action-fg)",
                      boxShadow:
                        "0 1px 2px var(--persona-capture-action-shadow)",
                      outline:
                        "1pt solid var(--persona-capture-action-outline)",
                    }
              }
              className="persona-message-send absolute right-3 bottom-3 size-8 cursor-pointer rounded-full text-white active:scale-95 disabled:cursor-default disabled:opacity-30"
            >
              <ArrowRightIcon
                className="size-full -rotate-90"
                style={{
                  color: message.trim()
                    ? "var(--color-white)"
                    : "var(--muted)",
                }}
              />
            </button>
          </>
        </div>
      </motion.form>
      <motion.nav
        aria-label="New Material on social media"
        aria-hidden={!socialShown}
        inert={!socialShown}
        className="avatar-person-controls absolute bottom-4 left-4 flex items-center gap-1.5"
        initial={false}
        animate={{
          opacity: socialShown ? 1 : 0,
          y: socialShown ? 0 : 12,
        }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : {
                y: {
                  type: "spring",
                  stiffness: 150,
                  damping: 19,
                  mass: 0.8,
                },
                opacity: {
                  duration: 0.2,
                  ease: "easeOut",
                },
              }
        }
      >
        <SocialButton
          platform="x"
          variant="subtle"
          href="https://x.com/newmaterialai"
          name="New Material"
        />
        <SocialButton
          platform="linkedin"
          variant="subtle"
          href="https://linkedin.com/company/newmaterialco"
          name="New Material"
        />
      </motion.nav>
      <output className="sr-only">{isSent ? "Message sent" : ""}</output>
    </motion.div>
  );
}

function splitNameSafe(fullName: string): string {
  const normalized = fullName.trim().replace(/\s+/gu, " ");
  const comma = normalized.indexOf(",");
  const rest = comma < 0 ? normalized : normalized.slice(comma + 1).trim();
  return (rest.split(" ")[0] ?? "") || "";
}

function createUUID(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
