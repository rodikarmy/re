import { motion } from "motion/react";
import { cn } from "../../lib/cn";
import {
  spring,
  FIELD_STACK_STEP_PX,
  FIELD_PANEL_HEIGHT,
  FIELD_PANEL_HEIGHT_WITH_FOOTER,
} from "../../lib/motion";
import type { CaptureFieldState } from "./types";

/**
 * FieldPanel (`Se`) — стопка "карточек" полей.
 * Реализация из persona-form.pretty.js строки 2277-2373.
 *
 * Геометрия: панель 94px (124 c footer); следующий шаг лежит на 24px ниже
 * (offset * 24). В состоянии "complete" панель съезжает вверх и сжимается
 * до 40px, prompt схлопывается (26→0), paddingRight 64→16.
 */
export interface FieldPanelProps {
  id?: string;
  children?: React.ReactNode;
  prompt?: string;
  state: CaptureFieldState;
  offset?: number;
  minimiseOnComplete?: boolean;
  fullOpacityPrompt?: boolean;
  footer?: React.ReactNode;
}

export function FieldPanel({
  id,
  children,
  minimiseOnComplete = true,
  footer,
  fullOpacityPrompt = false,
  prompt,
  state,
  offset = 0,
}: FieldPanelProps) {
  const panelHeight = footer ? FIELD_PANEL_HEIGHT_WITH_FOOTER : FIELD_PANEL_HEIGHT;
  const top =
    state === "complete"
      ? `calc(0% + ${offset * FIELD_STACK_STEP_PX}px)`
      : `calc(100% + ${-panelHeight}px)`;

  return (
    <motion.div
      id={id}
      transition={spring}
      className={cn(
        "absolute left-0 p-4 flex flex-col justify-end items-start",
        state === "hidden" && "pointer-events-none",
      )}
      inert={state === "hidden"}
      style={{ paddingRight: 64 }}
      initial={{
        top,
        height: panelHeight,
        opacity: offset === 0 ? 1 : 0,
        y: offset === 0 ? 0 : panelHeight,
      }}
      animate={{
        top,
        height: state === "complete" ? 40 : panelHeight,
        opacity: state === "hidden" ? 0 : 1,
        y: state === "hidden" ? panelHeight : 0,
        paddingRight: state === "complete" ? 16 : 64,
      }}
      whileHover={state === "complete" ? { opacity: 0.5 } : undefined}
    >
      <motion.p
        className={cn(
          "text-footnote font-[400] text-balance leading-[1.4] flex items-start",
          fullOpacityPrompt ? "text-fg" : "text-fg/70",
        )}
        transition={spring}
        initial={{ opacity: 1, height: 26 }}
        animate={{
          opacity: state === "complete" ? 0 : 1,
          height: state === "complete" ? 0 : 26,
          pointerEvents: state === "complete" ? "none" : "auto",
        }}
      >
        {prompt}
      </motion.p>
      <motion.div
        className="h-8 origin-bottom-left flex items-center justify-center"
        initial={{ fontSize: 21 }}
        animate={{
          fontSize: minimiseOnComplete && state === "complete" ? 16 : 21,
          opacity: minimiseOnComplete && state === "complete" ? 0.5 : 1,
        }}
      >
        {children}
      </motion.div>
      {footer && (
        <motion.div
          className={cn(
            "overflow-visible w-full flex items-end",
            state !== "focused" && "pointer-events-none",
          )}
          transition={spring}
          initial={{ opacity: 1, height: 24 }}
          animate={{
            opacity: state === "complete" ? 0 : 1,
            height: state === "complete" ? 0 : 24,
          }}
          inert={state !== "focused"}
        >
          {footer}
        </motion.div>
      )}
    </motion.div>
  );
}
