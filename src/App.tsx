import { PersonaCard } from "./components/PersonaCard";

/**
 * Демо: persona-карточка с формой в визуале оригинала.
 * Фазовая машина и анимации реализованы; MessageComposer (follow-up)
 * пока заглушка. Смена темы: класс light/dark на <html> (см. index.css).
 */
export default function App() {
  return (
    <main className="min-h-svh grid place-items-center bg-bg">
      <PersonaCard source="get-in-touch" />
    </main>
  );
}
