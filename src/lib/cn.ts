/** clsx-подобный cn (оригинал: utils-BS5inCOb.js). */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
