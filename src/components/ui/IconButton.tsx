import { forwardRef } from "react";
import { cn } from "../../lib/cn";

/**
 * Icon-button из icons-DSyQTBjT.js (функция M, экспорт `$e` в чанке формы).
 * Div-кнопка с вариантами; используется SubmitControl'ом.
 */
const buttonVariants = {
  default: "bg-bg text-fg",
  muted: "bg-fg/6 text-fg",
  outline: "border border-fg/12 bg-transparent text-fg",
} as const;

export interface IconButtonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof buttonVariants;
  disabled?: boolean;
}

export const IconButton = forwardRef<HTMLDivElement, IconButtonProps>(
  function IconButton(
    { variant = "default", className, children, disabled = false, onClick, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        {...rest}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full transition-transform cursor-pointer",
          "p-0",
          buttonVariants[variant],
          disabled ? "opacity-40 pointer-events-none" : "touch:scale-95 active:scale-90",
          "*:size-full text-fg",
          className,
        )}
        inert={disabled}
        onClick={onClick}
      >
        {children}
      </div>
    );
  },
);
