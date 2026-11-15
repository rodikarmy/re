/**
 * Email для секции Get in touch (оригинал: content.layout-чанк, `mn`).
 * Адрес хранится как массив кодов, XOR-нутых ключом 90 — чтобы адрес
 * не попадал в разметку для скрейперов; расшифровка только на клиенте.
 */

const EMAIL_XOR_KEY = 90;

/** "hello@newmaterial.ai" в кодировке `mn("hello")`. */
const HELLO_EMAIL_BYTES = [
  50, 63, 54, 54, 53, 26, 52, 63, 45, 55, 59, 46, 63, 40, 51, 59, 54, 116, 59,
  51,
];

/** "pr@newmaterial.ai" в кодировке `mn("pr")`. */
const PR_EMAIL_BYTES = [
  42, 40, 26, 52, 63, 45, 55, 59, 46, 63, 40, 51, 59, 54, 116, 59, 51,
];

export type ContactEmailKind = "hello" | "pr";

export function decodeContactEmail(kind: ContactEmailKind = "hello"): string {
  const bytes = kind === "pr" ? PR_EMAIL_BYTES : HELLO_EMAIL_BYTES;
  return String.fromCharCode(...bytes.map((byte) => byte ^ EMAIL_XOR_KEY));
}
