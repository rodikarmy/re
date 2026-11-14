import { useRef } from "react";

/**
 * FieldInput (`Te`) — реализация из persona-form.pretty.js строки 2176-2208.
 */
export interface FieldInputProps {
  inputRef?: React.Ref<HTMLInputElement>;
  name?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLInputElement>) => void;
  invalid?: boolean;
  readOnly?: boolean;
  tabIndex?: number;
}

export function FieldInput({
  invalid,
  onChange,
  inputRef,
  readOnly,
  onMouseDown,
  tabIndex,
  type = "text",
  ...rest
}: FieldInputProps) {
  const fallbackRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? fallbackRef;
  return (
    <input
      ref={ref}
      type={type}
      name={rest.name}
      required={rest.name === "name" || rest.name === "email"}
      aria-invalid={invalid || undefined}
      value={rest.value}
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={rest.onKeyDown}
      onMouseDown={onMouseDown}
      placeholder={rest.placeholder}
      autoComplete={rest.autoComplete}
      readOnly={readOnly}
      tabIndex={tabIndex}
      className="w-full cursor-text border-none bg-transparent px-0 text-fg outline-none read-only:cursor-pointer placeholder:text-muted/50"
    />
  );
}
