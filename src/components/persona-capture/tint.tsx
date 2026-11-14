import { createContext, useContext } from "react";

/**
 * Tint-контекст (оригинал: tint-DSUULco-.js, useTint).
 * Сайт задаёт брендовый цвет через провайдера; форма использует tint для
 * countdown-кольца, заливки кнопки и чекбокса. Точное дефолтное значение
 * оригинала не восстановлено из статики — здесь нейтральный fallback:
 * акцентный цвет (не подтверждено оригиналом, помечено как design choice).
 */
interface TintContextValue {
  tintColor: string;
  textColor: string;
}

const TintContext = createContext<TintContextValue>({
  tintColor: "var(--accent)",
  textColor: "var(--color-white)",
});

export function TintProvider({
  value,
  children,
}: {
  value?: Partial<TintContextValue>;
  children: React.ReactNode;
}) {
  const merged = { ...useContext(TintContext), ...value };
  // .persona-message-background / .persona-message-send / submitted-bubble
  // рисуются через var(--selection-bg) (root.pretty.css 13216, 13249);
  // в оригинале эти переменные задаёт tint-провайдер сайта.
  return (
    <TintContext.Provider value={merged}>
      <div
        style={
          {
            display: "contents",
            "--selection-bg": merged.tintColor,
            "--selection-fg": merged.textColor,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </TintContext.Provider>
  );
}

export function useTint(): TintContextValue {
  return useContext(TintContext);
}
