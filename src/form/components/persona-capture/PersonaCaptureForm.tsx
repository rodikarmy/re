import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { cn } from "../../../lib/cn";
import {
  spring,
  COUNTDOWN_DURATION_MS,
} from "../../../lib/motion";
import {
  corporateEmailDomain,
  isValidEmail,
  splitName,
  type PersonaSubmissionPayload,
} from "../../lib/validation";
import { canonicalizeRole } from "../../lib/roleSuggestions";
import { randomPersona, type SamplePersona } from "../../lib/samplePersonas";
import type {
  CaptureFields,
  CapturePhase,
  CaptureState,
  SubmissionCallbacks,
} from "./types";
import { FieldPanel } from "./FieldPanel";
import { FieldInput } from "./FieldInput";
import { RoleAutocomplete } from "./RoleAutocomplete";
import { SubmitControl } from "./SubmitControl";
import { ReceiveUpdatesCheckbox } from "./ReceiveUpdatesCheckbox";
import { FaviconBadge } from "./FaviconBadge";
import { MessageComposer } from "./MessageComposer";

/**
 * PersonaCaptureForm (`Pt`) — полная реализация фазовой машины
 * из persona-form.pretty.js строки 1117-1766.
 *
 * Фазы (data-persona-capture-phase на корне):
 * name → email → role → countdown → submitting → success | error
 * (+ follow-up ветка для source="get-in-touch", TODO MessageComposer).
 */
export interface PersonaCaptureFormProps {
  onSubmitted?: () => void;
  glass?: boolean;
  showIntro?: boolean;
  source?: string;
  onSubmit?: (
    payload: Record<string, string>,
    callbacks: SubmissionCallbacks,
  ) => void;
  onSubmitMessage?: (
    payload: Record<string, string>,
    callbacks: SubmissionCallbacks,
  ) => void;
  onSubscribe?: (submissionId: string) => Promise<void>;
  initialState?: CaptureState;
  onStateChange?: (state: CaptureState) => void;
  countdownDurationMs?: number;
  countdownPaused?: boolean;
  pauseCountdownOnHover?: boolean;
  keyboardScope?: "document" | "form";
  messageFlightVariant?: "throw" | "upward";
}

const defaultFields: CaptureFields = {
  name: "",
  email: "",
  role: "",
  company: "",
  receiveUpdates: false,
};

/** debounce (оригинал: `c` из styles-чанка, 400ms на фавикон) */
function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let timer = 0;
  return (...args: A) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}

function stepFromPhase(
  phase?: CapturePhase,
): number {
  if (phase === "name") return 0;
  if (phase === "email") return 1;
  return 2;
}

export function PersonaCaptureForm({
  onSubmitted,
  glass = false,
  showIntro = true,
  source,
  onSubmit,
  onSubmitMessage,
  onSubscribe,
  initialState,
  onStateChange,
  countdownDurationMs = COUNTDOWN_DURATION_MS,
  countdownPaused = false,
  pauseCountdownOnHover = true,
  keyboardScope = "document",
  messageFlightVariant = "throw", // eslint-disable-line @typescript-eslint/no-unused-vars
}: PersonaCaptureFormProps) {
  const reducedMotion = useReducedMotion();

  // follow-up режим: форма допускает сообщение после успешной отправки
  const isFollowUpCapable = source === "get-in-touch" && !!onSubmitMessage;

  const rootRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const roleInputRef = useRef<HTMLInputElement>(null);

  // ── состояние (шаги и поля) ──────────────────────────────────────────
  const [step, setStep] = useState(() =>
    initialState ? stepFromPhase(initialState.phase) : 0,
  );
  const [fields, setFields] = useState<CaptureFields>(
    () => initialState?.fields ?? defaultFields,
  );
  const [error, setError] = useState(() =>
    initialState?.phase === "error"
      ? "Something went wrong. Please try again."
      : "",
  );
  const [errorCount, setErrorCount] = useState(
    () =>
      Number(
        initialState?.phase === "error" ||
          initialState?.phase === "message-error",
      ) || 0,
  );
  const shakeX = useMotionValue(0);

  // тряска при ошибке (keyframe-кейкрейт оригинала)
  useEffect(() => {
    if (!errorCount || reducedMotion) return;
    shakeX.set(0);
    const controls = animate(
      shakeX,
      [0, -6, 5, -3, 1.5, 0],
      { duration: 0.4, ease: "easeInOut" },
    );
    return () => {
      controls.stop();
      shakeX.set(0);
    };
  }, [errorCount, shakeX, reducedMotion]);

  const [placeholderPersona, setPlaceholderPersona] = useState<SamplePersona | null>(
    null,
  );
  useEffect(() => {
    setPlaceholderPersona(randomPersona());
  }, []);

  // corporate-domain → favicon (debounce 400ms)
  const corporateDomain = useMemo(
    () => corporateEmailDomain(fields.email),
    [fields.email],
  );
  const [faviconDomain, setFaviconDomain] = useState(corporateDomain);
  const debouncedSetDomain = useCallback(
    debounce((domain: string | null) => setFaviconDomain(domain), 400),
    [],
  );
  useEffect(() => debouncedSetDomain(corporateDomain), [
    debouncedSetDomain,
    corporateDomain,
  ]);

  // ── фазы отправки ───────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(
    () =>
      initialState?.phase === "countdown" || initialState?.phase === "submitting",
  );
  const [commitPending, setCommitPending] = useState(
    () => initialState?.phase === "countdown",
  );
  const [messagePhase, setMessagePhase] = useState<CapturePhase | null>(() =>
    isFollowUpCapable &&
    initialState &&
    ["follow-up", "message-sending", "message-sent", "message-error"].includes(
      initialState.phase,
    )
      ? initialState.phase
      : null,
  );
  const [success, setSuccess] = useState(
    () =>
      initialState?.phase === "success" ||
      (isFollowUpCapable &&
        !!initialState &&
        ["follow-up", "message-sending", "message-sent", "message-error"].includes(
          initialState.phase,
        )),
  );

  const pendingSubmissionRef = useRef<PersonaSubmissionPayload | null>(
    initialState &&
      (initialState.phase === "countdown" || initialState.phase === "submitting")
      ? {
          submissionId: "inspected-state",
          name: initialState.fields.name,
          email: initialState.fields.email,
          company: initialState.fields.role,
          receiveUpdates: initialState.fields.receiveUpdates,
          source,
          pageUrl: "",
        }
      : null,
  );
  const submissionIdRef = useRef<string | null>(
    initialState ? "inspected-state" : null,
  );
  const resubmitOnMountRef = useRef(
    initialState?.phase === "submitting",
  );

  // авто-переход к follow-up через 2.4s после успеха (только get-in-touch)
  useEffect(() => {
    if (!success || messagePhase || !isFollowUpCapable || countdownPaused) return;
    const timer = window.setTimeout(() => setMessagePhase("follow-up"), 2400);
    return () => window.clearTimeout(timer);
  }, [success, messagePhase, isFollowUpCapable, countdownPaused]);

  // ── вычисление фазы ─────────────────────────────────────────────────
  const phase: CapturePhase =
    messagePhase ??
    (success
      ? "success"
      : commitPending
        ? "countdown"
        : submitting
          ? "submitting"
          : error
            ? "error"
            : step === 0
              ? "name"
              : step === 1
                ? "email"
                : "role");

  useEffect(() => {
    onStateChange?.({
      phase,
      revealed: step,
      fields,
      error,
    });
  }, [phase, step, fields, error, onStateChange]);

  const updateField = useCallback((key: keyof CaptureFields, value: unknown) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setError("");
  }, []);

  const focusStep = useCallback((target: number) => {
    const ref =
      target === 0 ? nameInputRef : target === 1 ? emailInputRef : roleInputRef;
    ref.current?.focus({ preventScroll: true });
  }, []);

  // отмена countdown → возврат к шагу role
  const cancelCountdown = useCallback(() => {
    if (commitPending) {
      pendingSubmissionRef.current = null;
      setCommitPending(false);
      setSubmitting(false);
      setSuccess(false);
      setError("");
      setStep(2);
      requestAnimationFrame(() => focusStep(2));
    }
  }, [commitPending, focusStep]);

  // авто-фокус текущего шага
  const lastStepRef = useRef(step);
  useEffect(() => {
    if (lastStepRef.current === step) return;
    lastStepRef.current = step;
    const raf = requestAnimationFrame(() => focusStep(step));
    return () => cancelAnimationFrame(raf);
  }, [step, focusStep]);

  const userNavigatedRef = useRef(!!initialState);

  const goBack = useCallback(() => {
    userNavigatedRef.current = true;
    setError("");
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((target: number) => {
    userNavigatedRef.current = true;
    setError("");
    setStep(target);
  }, []);

  // ── глобальная клавиатура (назад / отмена) ──────────────────────────
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        !messagePhase &&
        (keyboardScope !== "form" ||
          (event.target instanceof Node &&
            !!rootRef.current?.contains(event.target)))
      ) {
        if (submitting || success) {
          if (commitPending && event.key === "Escape") {
            event.preventDefault();
            cancelCountdown();
            return;
          }
          if (
            event.key === "Escape" ||
            event.key === "Tab" ||
            (event.key === "z" &&
              (event.metaKey || event.ctrlKey) &&
              !event.shiftKey)
          ) {
            event.preventDefault();
          }
          return;
        }
        if (!(step <= 0)) {
          const targetValue = (event.target as HTMLInputElement | null)?.value;
          if (event.key === "Backspace" && targetValue?.length === 0) {
            event.preventDefault();
            goBack();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            goBack();
            return;
          }
          if (event.key === "Tab") {
            event.preventDefault();
            if (event.shiftKey) goBack();
            return;
          }
          if (
            event.key === "z" &&
            (event.metaKey || event.ctrlKey) &&
            !event.shiftKey
          ) {
            event.preventDefault();
            goBack();
          }
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    messagePhase,
    step,
    goBack,
    submitting,
    success,
    commitPending,
    cancelCountdown,
    keyboardScope,
  ]);

  // ── шаги вперёд / отправка ──────────────────────────────────────────
  function validateAndAdvance() {
    setError("");
    if (step === 0 && !fields.name.trim()) {
      showError("Name is required");
      focusStep(0);
      return;
    }
    if (step === 1 && !isValidEmail(fields.email)) {
      showError(
        fields.email.trim() ? "Enter a valid email" : "Email is required",
      );
      focusStep(1);
      return;
    }
    setStep((prev) => Math.min(prev + 1, 2));
  }

  function beginSubmission() {
    if (submitting) return;
    if (!fields.name.trim() || !isValidEmail(fields.email)) {
      const target = fields.name.trim() ? 1 : 0;
      setStep(target);
      showError(
        target === 0
          ? "Name is required"
          : fields.email.trim()
            ? "Enter a valid email"
            : "Email is required",
      );
      requestAnimationFrame(() => focusStep(target));
      return;
    }
    setError("");
    const canonicalRole = canonicalizeRole(fields.role);
    const submissionId = submissionIdRef.current ?? createUUID();
    submissionIdRef.current = submissionId;
    updateField("role", canonicalRole);
    pendingSubmissionRef.current = {
      submissionId,
      name: fields.name,
      email: fields.email,
      company: canonicalRole,
      receiveUpdates: fields.receiveUpdates,
      source,
      pageUrl: `${window.location.origin}${window.location.pathname}`,
    };
    setSubmitting(true);
    setCommitPending(true);
  }

  const showError = useCallback(
    (message: string) => {
      setError(message);
      setErrorCount((prev) => prev + 1);
    },
    [],
  );

  const performSubmit = useCallback(() => {
    const pending = pendingSubmissionRef.current;
    if (pending) {
      pendingSubmissionRef.current = null;
      setCommitPending(false);
      onSubmit?.(pending as unknown as Record<string, string>, {
        onSuccess: (result) => {
          setFirstName(result?.firstName);
          setSubmitting(false);
          setCommitPending(false);
          setSuccess(true);
          if (!isFollowUpCapable) {
            onSubmitted?.();
          }
        },
        onError: (message) => {
          setCommitPending(false);
          showError(message);
          setSubmitting(false);
        },
      });
    }
  }, [onSubmit, onSubmitted, isFollowUpCapable, showError]);

  const [firstName, setFirstName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (resubmitOnMountRef.current) {
      resubmitOnMountRef.current = false;
      performSubmit();
    }
  }, [performSubmit]);

  function tryAdvance() {
    if (!submitting && !success) {
      if (step < 2) {
        validateAndAdvance();
      } else {
        beginSubmission();
      }
    }
  }

  function handleFieldKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (submitting || success) {
      event.preventDefault();
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      (event.target as HTMLElement).closest("form")?.requestSubmit();
    }
  }

  // авто-скип для возвратившихся (name+email уже валидны) и очистка email
  useEffect(() => {
    if (!userNavigatedRef.current) {
      if (step === 0 && fields.name.trim() && isValidEmail(fields.email)) {
        setStep(2);
      }
    }
  }, [step, fields.name, fields.email]);

  useEffect(() => {
    if (!userNavigatedRef.current) {
      if (step === 0 && fields.email && !isValidEmail(fields.email)) {
        updateField("email", "");
      }
    }
  }, [step, fields.email, updateField]);

  // ── чекбокс/подписка ────────────────────────────────────────────────
  const currentStepField: keyof CaptureFields =
    step === 0 ? "name" : step === 1 ? "email" : "role";
  const [subscribing, setSubscribing] = useState(false);
  const subscribeAttemptedRef = useRef(false);
  const showSubscribeCheckbox =
    !!onSubscribe &&
    !fields.receiveUpdates &&
    (messagePhase === "follow-up" || messagePhase === "message-sent");
  const checkboxVisible = (step >= 1 && !submitting && !success) || showSubscribeCheckbox;

  async function handleSubscribe() {
    if (!!onSubscribe && !!submissionIdRef.current && !subscribeAttemptedRef.current) {
      subscribeAttemptedRef.current = true;
      setSubscribing(true);
      try {
        await onSubscribe(submissionIdRef.current);
        updateField("receiveUpdates", true);
      } catch {
        showError("Subscription failed. Please try again.");
      } finally {
        subscribeAttemptedRef.current = false;
        setSubscribing(false);
      }
    }
  }

  const hasCurrentValue = (fields[currentStepField] as string).trim().length > 0;
  const hasName = fields.name.trim().length > 0;

  // ── разметка (строки 1505-1765 оригинала) ───────────────────────────
  return (
    <motion.div
      ref={rootRef}
      data-persona-capture-phase={phase}
      style={{ x: shakeX }}
      className="w-70 h-80 rounded-[1.3125rem] relative shadow-mild"
    >
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[1.3125rem] border border-[var(--persona-capture-card-outline)] p-1 pt-5",
          glass && "backdrop-blur-[24px] [clip-path:inset(0_round_1.3125rem)]",
          glass
            ? "bg-[var(--persona-capture-shell-bg)]"
            : "bg-fg/12",
        )}
      >
        {/* drag handle */}
        <div
          data-drag-handle=""
          className="absolute inset-x-0 top-0 z-10 h-6 touch-none pointer-coarse:touch-pan-y cursor-grab active:cursor-grabbing"
        >
          <div className="absolute inset-x-30 top-1.5 h-2 rounded-full bg-fg/12" />
        </div>

        {/* чекбокс Receive updates (внизу карты) */}
        <motion.div
          className={cn(
            "absolute inset-x-0 bottom-0 contain-layout h-12 flex items-center",
            !checkboxVisible && "pointer-events-none",
          )}
          transition={spring}
          initial={{ opacity: 0 }}
          animate={{ opacity: checkboxVisible ? 1 : 0 }}
          inert={!checkboxVisible}
        >
          <ReceiveUpdatesCheckbox
            checked={fields.receiveUpdates || subscribing}
            disabled={subscribing}
            onChange={(checked) => {
              if (showSubscribeCheckbox) {
                if (checked) {
                  handleSubscribe();
                }
              } else {
                updateField("receiveUpdates", checked);
              }
            }}
            tabIndex={checkboxVisible ? undefined : -1}
          />
        </motion.div>

        {/* внутренняя карточка */}
        <motion.div
          data-persona-card=""
          className="relative flex flex-col gap-3 overflow-hidden rounded-[1.0625rem] bg-[var(--persona-capture-card-bg)] outline outline-[var(--persona-capture-inner-outline)]"
          transition={spring}
          initial={{ height: "calc(100% - 0rem)" }}
          animate={{ height: `calc(100% - ${checkboxVisible ? 3 : 0}rem)` }}
        >
          {/* шапка: аватар + intro */}
          <motion.div
            data-persona-content="header"
            aria-hidden={success}
            className="relative flex flex-col gap-3 p-4 pb-0"
            animate={{
              filter: success ? "blur(6px)" : "blur(0px)",
              opacity: success ? 0 : 1,
            }}
            transition={reducedMotion ? { duration: 0 } : spring}
          >
            <div className="flex items-start justify-between">
              <div className="relative size-14 shrink-0">
                <div className="relative isolate size-14 overflow-hidden rounded-full bg-fg/4">
                  <div className="absolute inset-4 rounded-full bg-fg/24" />
                  <div className="absolute inset-x-2 -bottom-7 size-10 rounded-full bg-fg/24" />
                </div>
                {faviconDomain && <FaviconBadge domain={faviconDomain} />}
              </div>
            </div>
            {showIntro ? (
              <motion.p
                className="pr-10 text-caption text-fg leading-tight"
                animate={{
                  opacity: hasName ? 0 : 1,
                  height: hasName ? 0 : "auto",
                }}
                transition={{ duration: 0.4, type: "spring", bounce: 0 }}
              >
                Before we continue, let’s make this personal.
              </motion.p>
            ) : null}
          </motion.div>

          {/* поля */}
          <motion.form
            noValidate={true}
            data-persona-content="fields"
            inert={success}
            aria-hidden={success}
            animate={{
              filter: success ? "blur(6px)" : "blur(0px)",
              opacity: success ? 0 : 1,
            }}
            transition={reducedMotion ? { duration: 0 } : spring}
            onSubmit={(event) => {
              event.preventDefault();
              tryAdvance();
            }}
            autoComplete="on"
            className="relative h-full overflow-clip"
          >
            <FieldPanel
              id="name"
              prompt="What’s your name?"
              fullOpacityPrompt={true}
              state={step === 0 ? "focused" : "complete"}
              offset={0}
              minimiseOnComplete={false}
            >
              <FieldInput
                inputRef={nameInputRef}
                name="name"
                type="name"
                autoComplete="name"
                placeholder={placeholderPersona?.name ?? ""}
                value={fields.name}
                onChange={(value) => updateField("name", value)}
                onKeyDown={handleFieldKeyDown}
                invalid={!!error && !fields.name.trim()}
                readOnly={step > 0 || submitting || success}
                tabIndex={submitting || success ? -1 : undefined}
                onMouseDown={(event) => {
                  if (submitting || success) {
                    event.preventDefault();
                    return;
                  }
                  if (step > 0) {
                    event.preventDefault();
                    goToStep(0);
                  }
                }}
              />
            </FieldPanel>
            <FieldPanel
              id="email"
              prompt="What’s your email?"
              state={step === 1 ? "focused" : step > 1 ? "complete" : "hidden"}
              offset={1}
            >
              <FieldInput
                inputRef={emailInputRef}
                name="email"
                type="email"
                autoComplete="email"
                placeholder={placeholderPersona?.email ?? ""}
                value={fields.email}
                onChange={(value) => updateField("email", value)}
                onKeyDown={handleFieldKeyDown}
                invalid={!!error && !isValidEmail(fields.email)}
                readOnly={step > 1 || submitting || success}
                tabIndex={step < 1 || submitting || success ? -1 : undefined}
                onMouseDown={(event) => {
                  if (submitting || success) {
                    event.preventDefault();
                    return;
                  }
                  if (step > 1) {
                    event.preventDefault();
                    goToStep(1);
                  }
                }}
              />
            </FieldPanel>
            <FieldPanel
              id="role"
              prompt="What’s your role?"
              state={
                submitting || success
                  ? "complete"
                  : step === 2
                    ? "focused"
                    : step > 2
                      ? "complete"
                      : "hidden"
              }
              offset={2}
            >
              <RoleAutocomplete
                inputRef={roleInputRef}
                value={fields.role}
                onChange={(value) => updateField("role", value)}
                onKeyDown={handleFieldKeyDown}
                readOnly={submitting || success}
                tabIndex={step < 2 || submitting || success ? -1 : undefined}
              />
            </FieldPanel>
          </motion.form>

          {/* submit control */}
          <AnimatePresence>
            {!messagePhase && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                key="submission-control"
              >
                <SubmitControl
                  countdownDurationMs={countdownDurationMs}
                  countdownPaused={countdownPaused}
                  pauseCountdownOnHover={pauseCountdownOnHover}
                  active={hasCurrentValue}
                  hasValue={hasCurrentValue}
                  ariaLabel={step < 2 ? "Next step" : "Submit"}
                  onPress={tryAdvance}
                  onCancel={cancelCountdown}
                  onCommit={performSubmit}
                  submitting={submitting}
                  commitPending={commitPending}
                  submitted={success}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* follow-up: MessageComposer (source="get-in-touch") */}
          {messagePhase && isFollowUpCapable && onSubmitMessage && (
            <MessageComposer
              firstName={firstName}
              name={fields.name}
              submissionId={submissionIdRef.current ?? ""}
              phase={messagePhase as "follow-up" | "message-sending" | "message-sent" | "message-error"}
              onPhaseChange={setMessagePhase}
              onSubmit={onSubmitMessage}
              onError={showError}
              flightVariant={messageFlightVariant}
            />
          )}
        </motion.div>
      </div>

      {/* sr-only анонс ошибок */}
      <div role="alert" className="sr-only" aria-atomic="true">
        <span key={errorCount}>{error}</span>
      </div>
    </motion.div>
  );
}

function createUUID(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
