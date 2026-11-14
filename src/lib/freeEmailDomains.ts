/**
 * Публичные email-домены (`et` в чанке): корпоративный бейдж-фавикон
 * показывается только для доменов НЕ из этого списка.
 */
export const FREE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.co.in",
  "yahoo.fr", "ymail.com", "rocketmail.com", "outlook.com", "hotmail.com",
  "hotmail.co.uk", "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.de",
  "mail.com", "yandex.com", "yandex.ru", "zoho.com", "fastmail.com",
  "fastmail.fm", "tutanota.com", "tuta.io", "hey.com", "duck.com", "qq.com",
  "163.com", "126.com", "sina.com",
]);
