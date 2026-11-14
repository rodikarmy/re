/**
 * Анимационные константы, извлечённые из persona-capture-form-COZg-zPr.js.
 * (evidence: /tmp/opencode/persona-form.pretty.js строки 1103-1116)
 */

/** Базовый spring, используется почти везде (`S` в чанке). */
export const spring = {
  duration: 0.5,
  type: "spring",
  bounce: 0,
} as const;

/** "Pop" spring для успешного состояния (`ut`). */
export const popSpring = {
  type: "spring",
  stiffness: 110,
  damping: 22,
  mass: 1,
} as const;

/** Длительность countdown-кольца перед отправкой (`mt`). */
export const COUNTDOWN_DURATION_MS = 1800;

/** Таймаут загрузки favicon (`ft`). */
export const FAVICON_TIMEOUT_MS = 3000;

/** Шаг стопки полей в px (`dt`). */
export const FIELD_STACK_STEP_PX = 24;

/** Высота панели поля: 94, или 124 если есть footer. */
export const FIELD_PANEL_HEIGHT = 94;
export const FIELD_PANEL_HEIGHT_WITH_FOOTER = 124;
