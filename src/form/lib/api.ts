/**
 * API-слой — ЗАГЛУШКА. Реальный сайт шлёт POST /session-agent c
 * URLSearchParams { intent, ...payload }. Реальные API не копируем,
 * поэтому здесь только контракты и async-заглушки с задержкой.
 *
 * (evidence: paper-stack.pretty.js строки 726-787)
 */

export type SessionAgentIntent =
  | "submit-persona"
  | "submit-contact-message"
  | "subscribe-contact-updates";

export interface SubmitPersonaResponse {
  personName?: { firstName?: string };
}

/** submit-persona: возвращает firstName для success-состояния. */
export async function submitPersona(
  payload: Record<string, string>,
): Promise<SubmitPersonaResponse | undefined> {
  // TODO: заменить на реальный бэкенд или убрать
  await delay(600);
  return { personName: { firstName: payload.name?.split(" ")[0] } };
}

/** submit-contact-message (follow-up в режиме get-in-touch). */
export async function submitContactMessage(
  payload: Record<string, string>,
): Promise<void> {
  await delay(600);
}

/** subscribe-contact-updates { submissionId }. */
export async function subscribeContactUpdates(
  submissionId: string,
): Promise<void> {
  await delay(400);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
