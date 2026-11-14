import { forwardRef } from "react";

/**
 * ЗАГЛУШКА Button (Base UI, оригинал: чанк button-D2XkC4S1.js → экспорт `$e`).
 * Используется SubmitControl'ом: aria-label, variant "default"|"muted",
 * data-no-drag, классы с переходами. Позже заменим на настоящий
 * @base-ui-components/react Button (useButton + useRenderElement).
 *
 * TODO: реализация через Base UI.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "muted";
  "data-no-drag"?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(_props, _ref) {
    return null; // TODO
  },
);
