import { GetInTouch } from "./components/get-in-touch/GetInTouch";
import { TintProvider } from "./components/persona-capture/tint";

/**
 * Демо страницы Get in touch (оригинал: layout content.layout-чанка
 * оборачивает всё в TintProvider value="var(--color-accent)").
 * Форма влетает в панель, заголовок + email-чип — как на сайте.
 * Смена темы: класс light/dark на <html> (см. index.css).
 */
export default function App() {
  return (
    <TintProvider value="var(--color-accent)" textColor="var(--color-accent-fg)">
      <main className="min-h-dvh bg-bg text-fg">
        <GetInTouch />
      </main>
    </TintProvider>
  );
}
