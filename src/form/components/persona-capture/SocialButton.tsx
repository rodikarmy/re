import { cn } from "../../../lib/cn";

/**
 * SocialButton (`He`, экспорт `S` чанка формы) — реализация
 * из persona-form.pretty.js строки 266-303.
 */
export interface SocialButtonProps {
  platform: "linkedin" | "x";
  href?: string;
  name: string;
  className?: string;
  variant?: "solid" | string;
}

export function SocialButton({
  platform,
  href,
  name,
  className,
  variant = "solid",
}: SocialButtonProps) {
  const isLinkedin = platform === "linkedin";
  const label = isLinkedin ? "Connect" : "Follow";
  return (
    <a
      href={href || undefined}
      draggable={false}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "more-from-context-arrow-button avatar-x-button shrink-0",
        className,
      )}
      data-social-platform={platform}
      data-social-variant={variant}
      aria-label={`${label} ${name} on ${isLinkedin ? "LinkedIn" : "X"}`}
      aria-disabled={!href}
      tabIndex={href ? 0 : -1}
    >
      <span className="more-from-context-arrow-visual">
        <span
          aria-hidden={true}
          className="more-from-context-arrow-button-icon bg-current"
          style={{
            mask: `url(${isLinkedin ? "/linkedin.svg" : "/x-logo.svg"}) center / contain no-repeat`,
          }}
        />
        <span className="avatar-x-button-label">{label}</span>
      </span>
    </a>
  );
}
