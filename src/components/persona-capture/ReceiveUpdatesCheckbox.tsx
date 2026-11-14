import { cn } from "../../lib/cn";
import { useTint } from "./tint";
import { CheckIcon } from "../ui/icons";

/**
 * ReceiveUpdatesCheckbox (`_Component2`) — реализация
 * из persona-form.pretty.js строки 2374-2420.
 */
export interface ReceiveUpdatesCheckboxProps {
  disabled?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tabIndex?: number;
}

export function ReceiveUpdatesCheckbox({
  disabled = false,
  checked,
  onChange,
  tabIndex,
}: ReceiveUpdatesCheckboxProps) {
  const { tintColor, textColor } = useTint();
  return (
    <label className="flex items-center gap-2 text-sm text-fg/50 cursor-pointer select-none h-full w-full pb-1.5 px-4.5">
      <div className="relative size-4 items-center justify-center">
        <input
          type="checkbox"
          disabled={disabled}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          tabIndex={tabIndex}
          className={cn(
            "peer size-4 appearance-none rounded-sm bg-fg/20 cursor-pointer transition-colors duration-150",
          )}
          style={{ backgroundColor: checked ? tintColor : undefined }}
        />
        <CheckIcon
          className={cn(
            "pointer-events-none absolute inset-0 size-full transition-opacity duration-150",
            checked ? "opacity-100" : "opacity-0",
            "stroke-3!",
          )}
          style={{ color: textColor }}
        />
      </div>
      <span className="h-4 flex items-center truncate mt-px text-sm">
        Receive updates
      </span>
      {/* в оригинале <Link to="/privacy"> — React Router; у нас пока <a> */}
      <a
        href="/privacy"
        target="_blank"
        className="text-sm underline hover:text-fg ml-auto transition-colors duration-200"
      >
        Privacy
      </a>
    </label>
  );
}
