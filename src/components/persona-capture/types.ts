/**
 * Публичные интерфейсы формы. Точные пропсы извлечены из декомпилированного
 * чанка (см. ARCHITECTURE.md, evidence: persona-form.pretty.js строки 1117-1132).
 */

export type CapturePhase =
  | "name"
  | "email"
  | "role"
  | "countdown"
  | "submitting"
  | "error"
  | "success"
  | "follow-up"
  | "message-sending"
  | "message-sent"
  | "message-error";

export type CaptureFieldState = "hidden" | "focused" | "complete";

export interface CaptureFields {
  name: string;
  email: string;
  role: string;
  company: string;
  receiveUpdates: boolean;
}

export interface CaptureState {
  phase: CapturePhase;
  revealed: number; // 0..2
  fields: CaptureFields;
  error: string;
}

/** Колбэки, которые получает onSubmit (владелец решает, куда слать). */
export interface SubmissionCallbacks {
  onSuccess: (result?: { firstName?: string }) => void;
  onError: (message: string) => void;
}
