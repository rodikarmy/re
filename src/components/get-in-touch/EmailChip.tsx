import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/cn";
import { decodeContactEmail, type ContactEmailKind } from "../../lib/contactEmail";
import { useTint } from "../persona-capture/tint";

/**
 * Email-чип секции Get in touch (оригинал: content.layout-чанк,
 * строки 2212-2512: `_Component4`, `Vs`, `Xs`, `Zr`, `Ys`).
 *
 * Локальная часть адреса видна сразу; домен скрыт под скрим-маской
 * (max-width + linear-gradient по --email-scrim-*) и раскрывается
 * на hover (pointer: fine) или по первому тапу (pointer: coarse).
 * Кнопка Copy перекрывает правый край (`-ml-[3.5rem]`) и отъезжает
 * (`ml-3`) при раскрытии; текст "Copy"/"Copied" меняется через
 * AnimatePresence, ширина-размерка 4ch → 6ch пружиной.
 */

/** Spring подмены текста кнопки (`pn`). */
const copySpring = { damping: 38, stiffness: 440, type: "spring" } as const;

/** Задержка сброса "Copied" (`Ds`). */
const COPIED_RESET_MS = 1500;

const EMAIL_LOCAL_PART_MIN_WIDTH = "3.5rem";
const EMAIL_DOMAIN_MIN_WIDTH = "4ch";
const EMAIL_HIDDEN_FALLBACK_WIDTH = `calc(${EMAIL_LOCAL_PART_MIN_WIDTH} + ${EMAIL_DOMAIN_MIN_WIDTH})`;
const emailTransition = "duration-500 ease-damped-spring";
const emailScrimMask =
  "linear-gradient(to right, black 0, rgb(0 0 0 / var(--email-scrim-tail)) var(--email-scrim-end))";

const copyButtonShape =
  "rounded-full bg-bg outline-[1pt] outline-fg/6 shadow-[0_1px_2px_color-mix(in_srgb,var(--fg)_6%,transparent)]";
const copyButtonBase = cn(
  "inline-flex h-7 cursor-pointer items-center justify-center overflow-visible py-1 px-2.5",
  "font-sans text-footnote font-[400] tracking-[-0.02em] text-fg",
  copyButtonShape,
);

/**
 * Резервное копирование (secure-context fallback):
 * временная textarea + document.execCommand("copy").
 */
function copyViaExecCommand(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  textarea.remove();
  return ok;
}

/** Разбор адреса: `hello@newmaterial.ai` → localPart "hello", suffix "@", domain "newmaterial.ai" (`Ys`). */
function splitEmailAddress(email: string): {
  localPart: string;
  suffix: string;
  domain: string;
} {
  const at = email.indexOf("@");
  if (at === -1) {
    return { domain: "", localPart: email, suffix: "" };
  }
  return {
    domain: email.slice(at + 1),
    localPart: email.slice(0, at),
    suffix: email.slice(at),
  };
}

/** Метка кнопки: смена Copy/Copied с width-размеркой (`Xs`). */
function CopyButtonLabel({ copied }: { copied: boolean }) {
  return (
    <span className="relative inline-grid overflow-visible font-sans text-footnote">
      <motion.span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 inline-block overflow-hidden whitespace-nowrap"
        initial={false}
        animate={{ width: copied ? "6ch" : "4ch" }}
        transition={copySpring}
      >
        Copied
      </motion.span>
      <span className="pointer-events-none col-start-1 row-start-1 overflow-visible">
        <AnimatePresence initial={false}>
          <motion.span
            className="absolute inset-0 flex items-center justify-center overflow-visible whitespace-nowrap"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={copySpring}
            key={copied ? "copied" : "copy"}
          >
            {copied ? "Copied" : "Copy"}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

/** Кнопка Copy (`Vs` + обёртка `Zr` с whileTap-пружиной). */
function CopyButton({
  copied,
  onCopy,
}: {
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <motion.div
      className="isolate flex shrink-0 items-center overflow-visible rounded-full bg-bg"
      whileTap={{ scale: 0.92 }}
      transition={copySpring}
    >
      <button
        type="button"
        className={copyButtonBase}
        aria-label={copied ? "Email copied" : "Copy email address"}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          window.getSelection()?.removeAllRanges();
          onCopy();
        }}
      >
        <CopyButtonLabel copied={copied} />
      </button>
    </motion.div>
  );
}

export interface EmailChipProps {
  className?: string;
  kind?: ContactEmailKind;
}

export function EmailChip({ className, kind = "hello" }: EmailChipProps) {
  const chipRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const domainMeasureRef = useRef<HTMLSpanElement>(null);
  const { tintColor } = useTint();

  const [email, setEmail] = useState("");
  const [domainWidth, setDomainWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | undefined>(undefined);
  const touchStartedRef = useRef(false);

  const { domain, localPart, suffix } = splitEmailAddress(email);

  const openMailto = () => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  // Адрес декодируется на клиенте (анти-скрейпинг)
  useEffect(() => {
    setEmail(decodeContactEmail(kind));
  }, [kind]);

  // Тач: тап вне чипа сворачивает раскрытие
  useEffect(() => {
    if (!expanded) return;
    function onPointerDown(event: PointerEvent) {
      if (
        event.pointerType === "touch" &&
        event.target instanceof Node &&
        !chipRef.current?.contains(event.target)
      ) {
        setExpanded(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [expanded]);

  // Выделение адреса не должно сбрасываться тапом вне выделения
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const address = addressRef.current;
      const selection = window.getSelection();
      if (!address || !selection || selection.isCollapsed) return;
      const target = event.target;
      if (!(target instanceof Node) || !address.contains(target)) {
        if (address.contains(selection.anchorNode) || address.contains(selection.focusNode)) {
          selection.removeAllRanges();
        }
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  // В оригинале только navigator.clipboard (сайт на https, secure context).
  // Для локального просмотра без https добавлен fallback через execCommand —
  // помечено: в оригинальном чанке этого нет.
  async function copyEmail() {
    if (!email) return;
    let ok = false;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(email);
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (!ok) ok = copyViaExecCommand(email);
    if (!ok) return;
    window.clearTimeout(copiedTimerRef.current);
    setCopied(true);
    copiedTimerRef.current = window.setTimeout(() => {
      setCopied(false);
    }, COPIED_RESET_MS);
  }

  // Ширина скрытого домена для плавного раскрытия (ResizeObserver)
  useLayoutEffect(() => {
    const measure = domainMeasureRef.current;
    if (!measure || measure.textContent !== domain) return;
    const update = () => {
      const width = Math.ceil(measure.offsetWidth);
      setDomainWidth((prev) => (prev === width ? prev : width));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [domain]);

  return (
    <div
      ref={chipRef}
      style={{ "--email-link-tint": tintColor } as React.CSSProperties}
      className={cn(
        "flex w-fit items-stretch overflow-hidden rounded-full pl-3 text-fg",
        "group/chip bg-fg/4",
        className,
      )}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") {
          setExpanded(false);
        }
      }}
      data-expanded={expanded ? "" : undefined}
    >
      <div
        ref={addressRef}
        role="link"
        tabIndex={0}
        className="email-address relative flex min-w-0 cursor-pointer items-center py-1 font-lining text-caption font-[350] tracking-[-0.02em] select-text"
        onPointerDown={(event) => {
          touchStartedRef.current = event.pointerType === "touch";
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            setExpanded(true);
          }
        }}
        onClick={() => {
          const touchStarted = touchStartedRef.current;
          touchStartedRef.current = false;
          if (window.getSelection()?.isCollapsed !== false) {
            if (touchStarted && !expanded) {
              setExpanded(true);
              return;
            }
            openMailto();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            openMailto();
          }
        }}
      >
        <span className="flex h-full shrink-0 items-center">{localPart}</span>
        {suffix ? <span className="shrink-0 whitespace-nowrap">@</span> : null}
        {domain ? (
          <span
            className={cn(
              "min-w-0 overflow-hidden whitespace-nowrap",
              emailTransition,
              "[--email-scrim-end:4ch] [--email-scrim-tail:0]",
              "group-data-[expanded]/chip:[--email-scrim-end:100%] group-data-[expanded]/chip:[--email-scrim-tail:1]",
              "max-w-[calc(3.5rem+4ch)] group-data-[expanded]/chip:[max-width:var(--email-hidden-width)]",
            )}
            style={{
              "--email-hidden-width":
                domainWidth > 0 ? `${domainWidth}px` : EMAIL_HIDDEN_FALLBACK_WIDTH,
              maskImage: emailScrimMask,
              WebkitMaskImage: emailScrimMask,
              transitionProperty:
                "max-width, --email-scrim-end, --email-scrim-tail",
            } as React.CSSProperties}
          >
            <span ref={domainMeasureRef} className="inline-block w-max">
              {domain}
            </span>
          </span>
        ) : null}
      </div>
      <motion.div
        data-copy-button=""
        className={cn(
          "relative z-10 flex shrink-0 items-center -ml-[3.5rem] overflow-visible py-1 pr-1 transition-[margin]",
          emailTransition,
          "group-data-[expanded]/chip:ml-3",
        )}
      >
        <CopyButton copied={copied} onCopy={() => copyEmail()} />
      </motion.div>
    </div>
  );
}
