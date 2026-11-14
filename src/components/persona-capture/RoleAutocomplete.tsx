import { useMemo, useRef } from "react";
import { matchRole } from "../../lib/roleSuggestions";

/**
 * RoleAutocomplete (`_Component4`) — ghost-text автодополнение.
 * Реализация из persona-form.pretty.js строки 2209-2276.
 *
 * Под input лежит невидимый дубликат введённого текста + серый хвост
 * suggestion (`text-muted/30`). Tab или клик принимают suggestion целиком.
 */
export interface RoleAutocompleteProps {
  inputRef?: React.Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  tabIndex?: number;
}

export function RoleAutocomplete({
  value,
  onChange,
  onKeyDown,
  readOnly,
  tabIndex,
  inputRef,
}: RoleAutocompleteProps) {
  const fallbackRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? fallbackRef;

  const suggestion = useMemo(() => {
    const q = value.trim().toLowerCase();
    return q ? matchRole(q) : null;
  }, [value]);

  const ghost =
    readOnly || !suggestion || !value.trim() ? "" : suggestion.slice(value.length);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (readOnly) {
      e.preventDefault();
      return;
    }
    if (e.key === "Tab" && ghost && suggestion) {
      e.preventDefault();
      onChange(suggestion);
      return;
    }
    onKeyDown(e);
  }

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center truncate whitespace-pre"
      >
        <span className="invisible">{value}</span>
        <span className="text-muted/30">{ghost}</span>
      </span>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => {
          if (readOnly) e.preventDefault();
        }}
        onClick={() => {
          if (!readOnly && suggestion) onChange(suggestion);
        }}
        placeholder={readOnly ? "" : "Your role"}
        autoComplete="off"
        readOnly={readOnly}
        tabIndex={tabIndex}
        className="relative w-full border-none bg-transparent px-0 text-fg outline-none read-only:cursor-default placeholder:text-muted/50"
      />
    </div>
  );
}
