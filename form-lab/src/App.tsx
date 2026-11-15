/**
 * Урок 1: статический каркас.
 *
 * Здесь пока нет состояния и логики — только разметка. Задача урока:
 * увидеть, как React-компонент превращается в DOM, и зафиксировать
 * визуальные «кирпичи», из которых потом соберём форму.
 */
export function App() {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Шаг 1 из 3</p>

        <h1 className="title">Как вас зовут?</h1>

        <label className="field">
          <span className="field__label">Имя</span>
          <input
            className="field__input"
            type="text"
            placeholder="Ада Лавлейс"
            autoComplete="name"
          />
        </label>

        <button className="button" type="button">
          Далее
        </button>
      </section>
    </main>
  );
}
