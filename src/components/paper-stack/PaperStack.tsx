/**
 * ЗАГЛУШКА PaperStack (оригинал: `In` в paper-stack-чанке, строки 999+).
 * Плавающая стопка "бумаг" с fan-layout и циклической навигацией.
 *
 * Ключевые extracted-факты:
 *  - карточки: kind "paper" | "persona"; persona-карточка поверх стопки
 *    (personaMode "gate" = блокирует навигацию, "browse" = вместе со стопкой);
 *  - драг: на handle-элементах (data-drag-handle), интерактивные элементы
 *    исключаются по селектору 'input, textarea, select, button, a, label,
 *    [contenteditable], [role="button"], [data-no-drag]';
 *  - fan-layout константы: базовые смещения 24/10/2px, сжатый режим
 *    24/6/3px, масштаб 1 - i*0.075 (или 0.055), цвет задника "#B1B6CC",
 *    брейкпоинт 740px, ширины 520/800;
 *  - пружины: {duration:1.2, bounce:0.3} для входа, {duration:0.5|0.3,
 *    bounce:0} для перестановок, keyframe-переход {duration:0.45,
 *    times:[0,0.4,1], ease:[0.4,0,0.05,1]}.
 *
 * TODO: реализация fan-layout и drag-механики (paper-stack.pretty.js
 * строки 857-1131+, константы pe…qt и хелперы Ge/he/xe/ge/be/Jt/Zt).
 */
export interface PaperStackCard {
  id: string;
  kind: "paper" | "persona";
  data?: Record<string, unknown>;
}

export interface PaperStackProps {
  cards: PaperStackCard[];
  generating?: boolean;
  stepLabel?: string;
  onInsert?: (data: Record<string, unknown>) => void;
  showPersonaCard?: boolean;
  onPersonaSubmitted?: () => void;
  onPersonaDismissed?: () => void;
  slug?: string;
  context?: string;
  projectName?: string;
  controlsVisible?: boolean;
  fanLayout?: unknown;
  showBackgroundCards?: boolean;
  visible?: boolean;
  /** "gate" — форма блокирует стопку; "browse" — стопка активна */
  personaMode?: "gate" | "browse";
  personaCard?: unknown;
  onDragActiveChange?: (active: boolean) => void;
}

export function PaperStack(_props: PaperStackProps) {
  return null; // TODO
}
