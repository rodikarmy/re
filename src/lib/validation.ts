/**
 * Логика сбора/валидации данных, извлечённая из чанка формы.
 * Все имена функций — наши восстановленные, оригиналы обфусцированы.
 */

/** Email-валидация оригинала: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ (`De`). */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Достаёт домен из email (`tt`), null если не похоже на email. */
export function emailDomain(email: string): string | null {
  const v = email.trim();
  if (!isValidEmail(v)) return null;
  return v.split("@")[1].toLowerCase();
}

import { FREE_EMAIL_DOMAINS } from "./freeEmailDomains";

/**
 * Corporate-domain check (`nt`): возвращает домен, только если он НЕ
 * входит в список публичных провайдеров. Используется для favicon-бейджа.
 */
export function corporateEmailDomain(email: string): string | null {
  const domain = emailDomain(email);
  if (!domain || FREE_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

/** URL фавикона компании (`Ae`). */
export function faviconUrl(domain: string, size = 128): string {
  return `/api/favicon?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/** Разбор имени: "Last, First" или "First Last" → { firstName, lastName } (`ot`). */
export function splitName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const normalized = fullName.trim().replace(/\s+/gu, " ");
  const comma = normalized.indexOf(",");
  const rest = comma < 0 ? normalized : normalized.slice(comma + 1).trim();
  const [first = "", ...remainder] = rest.split(" ");
  return {
    firstName: first,
    lastName:
      comma < 0 ? remainder.join(" ") : normalized.slice(0, comma).trim(),
  };
}

/** payload, собираемый перед отправкой (форма вызывает onSubmit(payload, callbacks)) */
export interface PersonaSubmissionPayload {
  submissionId: string;
  name: string;
  email: string;
  /** поле role, но в API уходит как `company` */
  company: string;
  receiveUpdates: boolean;
  source?: string;
  pageUrl: string;
}

/** follow-up сообщение (`rt`): валидация ≤ 2000 символов */
export interface ContactMessagePayload {
  submissionId: string;
  messageId: string;
  message: string;
}

export const MAX_MESSAGE_LENGTH = 2000;

/**
 * Валидация follow-up сообщения (`rt`, строки 305-324 оригинала).
 * Бросает Error с сообщением для пользователя.
 */
export function validateContactMessage(
  payload: ContactMessagePayload,
): ContactMessagePayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid message");
  }
  const { submissionId, messageId, message } = payload;
  if (typeof submissionId !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(submissionId)) {
    throw new Error("Invalid submission");
  }
  if (typeof messageId !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(messageId)) {
    throw new Error("Invalid message ID");
  }
  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.trim().length > MAX_MESSAGE_LENGTH
  ) {
    throw new Error("Enter a message of up to 2,000 characters");
  }
  return {
    submissionId,
    messageId,
    message: message.trim(),
  };
}
