import { GetInTouch } from "./components/get-in-touch/GetInTouch";
import { TintProvider } from "./components/persona-capture/tint";

/**
 * Страница контактной формы (роут /newmaterialai-contact-form).
 * Оригинал: layout content.layout-чанка, оборачивает всё в
 * TintProvider value="var(--color-accent)".
 * Форма влетает в панель, заголовок + email-чип — как на сайте.
 */
export default function ContactFormPage() {
  return (
    <TintProvider value="var(--color-accent)" textColor="var(--color-accent-fg)">
      <main className="min-h-dvh bg-bg text-fg">
        <GetInTouch />
      </main>
    </TintProvider>
  );
}
