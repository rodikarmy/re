import { createContext, useContext } from "react";

/**
 * Tint-контекст (оригинал: tint-DSUULco-.js).
 * Провайдер рендерит div.contents с --article-tint/--selection-bg/--selection-fg;
 * без провайдера useTint возвращает { tintColor: "#000000", textColor: "#ffffff" }.
 * Приложение оборачивает layout в провайдер с брендовым цветом
 * (в оригинале: value="var(--color-accent)", textColor="var(--color-accent-fg)").
 */
interface TintContextValue {
  tintColor: string;
  textColor: string;
}

const defaultTint: TintContextValue = {
  tintColor: "#000000",
  textColor: "#ffffff",
};

const TintContext = createContext<TintContextValue | undefined>(undefined);

/** "#ffffff" без preserveWhite заменяется на #000000 (`x` в tint-чанке). */
function normalizeTint(tint: string | undefined, preserveWhite = false): string {
  return tint === "#ffffff" && !preserveWhite
    ? "#000000"
    : (tint ?? "#000000");
}

/** Светлота hex-цвета по YIQ (utils-BS5inCOb.js, `Mo`): светлый фон → тёмный текст. */
function isLightColor(hex: string): boolean {
  const rgb = hex.replace("#", "");
  const r = Number.parseInt(rgb.substring(0, 2), 16);
  const g = Number.parseInt(rgb.substring(2, 4), 16);
  const b = Number.parseInt(rgb.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function resolveTextColor(
  tint: string,
  textColor?: string,
  preserveWhite = false,
): string {
  if (textColor) return textColor;
  if (tint === "#ffffff" && !preserveWhite) return "#ffffff";
  return isLightColor(tint) ? "#000000" : "#ffffff";
}

export function TintProvider({
  value,
  textColor,
  preserveWhite = false,
  children,
}: {
  value: string;
  textColor?: string;
  preserveWhite?: boolean;
  children: React.ReactNode;
}) {
  const tintColor = normalizeTint(value, preserveWhite);
  const effectiveTextColor = resolveTextColor(
    tintColor,
    textColor,
    preserveWhite,
  );
  return (
    <TintContext.Provider
      value={{ tintColor, textColor: effectiveTextColor }}
    >
      <div
        style={
          {
            display: "contents",
            "--article-tint": tintColor,
            // .persona-message-background / .persona-message-send /
            // submitted-bubble рисуются через var(--selection-bg)
            "--selection-bg": tintColor,
            "--selection-fg": effectiveTextColor,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </TintContext.Provider>
  );
}

export function useTint(): TintContextValue {
  return useContext(TintContext) ?? defaultTint;
}
