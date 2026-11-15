/**
 * Типографика строк (оригинал: typograph-CsL4lFT6.js, экспорт `t`).
 * Заменяет "..." на "…", "---"/"--" на тире и прямые кавычки на типографские.
 * URL (http/https/mailto) не типографируются — они временно вырезаются.
 */

const URL_PATTERN = /https?:\/\/[^\s<>]+|mailto:[^\s<>]+/gi;

function dotsToEllipsis(text: string): string {
  return text.replace(/\.{3,}/g, "…").replace(/\. \. \./g, "…");
}

function dashesToDashes(text: string): string {
  return text.replace(/---/g, "—").replace(/--/g, "–");
}

function straightToCurlyQuotes(text: string): string {
  return text
    .replace(/'(?=\d\ds?\b)/g, "’")
    .replace(/(^|[-–—/([{"\s])"/g, "$1“")
    .replace(/"/g, "”")
    .replace(/(^|[-–—/([{"“\s])'/g, "$1‘")
    .replace(/'/g, "’");
}

export function typograph(text: string | null | undefined): string {
  if (!text) return text ?? "";
  const urls: string[] = [];
  const withoutUrls = text.replace(URL_PATTERN, (url) => {
    // Конечные знаки препинания (напр. точки в конце предложения) остаются в тексте
    const trailing = url.match(/(?:\.{3,}|[),.;:!?]+)$/);
    const urlBody = trailing ? url.slice(0, -trailing[0].length) : url;
    urls.push(urlBody);
    return `\uE000${urls.length - 1}\uE000${trailing ? trailing[0] : ""}`;
  });
  const typographed = straightToCurlyQuotes(
    dashesToDashes(dotsToEllipsis(withoutUrls)),
  );
  if (urls.length === 0) return typographed;
  return typographed.replace(/\uE000(\d+)\uE000/g, (_match, index: string) => {
    return urls[Number(index)] ?? "";
  });
}
