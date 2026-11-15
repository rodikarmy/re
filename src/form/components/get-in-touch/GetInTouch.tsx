import { useState } from "react";
import { typograph } from "../../lib/typograph";
import { ContactCard } from "./ContactCard";
import { EmailChip } from "./EmailChip";

/**
 * Секция Get in touch (оригинал: content.layout-чанк, строки 2518-2674:
 * `Js`, `Qs`, `hn`; копирайт — portfolio-taxonomy-чанк `i`).
 *
 * Контейнер-«панель»: заголовок, форма в карточке и email-чип.
 * Стеклянная подложка + inset-рамка видны с sm; до прилёта карточки
 * панель обрезает свёрху (sm:overflow-hidden), после входа —
 * overflow visible, чтобы карточку можно было вытащить драгом.
 */

const CONTACT_PANEL_BACKGROUND =
  "pointer-events-none absolute inset-0 rounded-post-artifact bg-transparent sm:bg-[var(--contact-panel-bg)] sm:backdrop-blur-[12px]";

export interface GetInTouchCopy {
  contactLeadMuted: string;
  contactLeadStrong: string;
}

/** Копирайт по умолчанию (оригинал: `Ho` из portfolio-taxonomy-чанка). */
const defaultCopy: GetInTouchCopy = {
  contactLeadMuted: "Let's transform your industry with AI.",
  contactLeadStrong: "Get in touch.",
};

export interface GetInTouchProps {
  copy?: GetInTouchCopy;
}

export function GetInTouch({ copy = defaultCopy }: GetInTouchProps) {
  const [entered, setEntered] = useState(false);
  return (
    <section
      id="get-in-touch"
      aria-label="Get in touch"
      className="scroll-mt-24 overflow-visible text-fg"
    >
      <div className="pt-20 pb-16 sm:px-gutter sm:pt-24 sm:pb-20">
        <div
          className={`relative mx-auto w-full min-w-0 max-w-post-artifact rounded-post-artifact sm:shadow-contact-panel ${entered ? "overflow-visible" : "overflow-visible sm:overflow-hidden"}`}
        >
          <div className={CONTACT_PANEL_BACKGROUND} aria-hidden="true" />
          <div
            className="pointer-events-none absolute inset-0 z-10 hidden rounded-post-artifact sm:block"
            style={{
              boxShadow: "inset 0 0 0 1px var(--contact-panel-border)",
            }}
            aria-hidden="true"
          />
          <div className="relative z-20 grid h-full grid-cols-1 gap-6 px-gutter py-6 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:grid-rows-[auto_1fr_auto] md:gap-x-12 md:gap-y-0">
            <div className="order-1 flex w-full select-text flex-col text-center md:col-start-1 md:row-start-1 md:max-w-[calc(var(--post-artifact-width)/2)] md:pt-2 md:pl-2 md:text-left gap-4">
              <p className="text-title-body font-[350] leading-[1.3]! text-fg text-balance mx-auto max-w-[28ch] sm:mx-0 sm:max-w-none">
                <span className="text-fg/50">{typograph(copy.contactLeadMuted)}</span>{" "}
                <span className="text-nowrap sm:whitespace-normal">
                  {typograph(copy.contactLeadStrong)}
                </span>
              </p>
            </div>
            <div className="relative z-30 order-3 flex items-center justify-center overflow-visible md:order-none md:col-start-2 md:row-span-3 md:row-start-1 md:justify-start">
              <ContactCard onEntered={() => setEntered(true)} />
            </div>
            <div className="order-2 flex flex-col items-center md:order-none md:col-start-1 md:row-start-3 md:items-start md:pb-2 md:pl-2">
              <div className="translate-y-[2pt] flex flex-wrap items-center gap-2 md:-ml-[6pt]">
                <EmailChip />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
