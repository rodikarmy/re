import { SpiralScene } from "../components/spiral";

/**
 * Демо интро-эффекта contentarchitecture.dev: спираль из символов
 * «THE CONTENT ARCHITECTURE.» на весь экран.
 *
 * Разметка повторяет мобильный экран оригинала — чёрная сцена
 * (`bg-black`) с канвасом спирали; лейбл «TAP & HOLD» рисует сам
 * SpiralScene (HoldLabel, закреплён в правом верхнем углу на тач-устройствах).
 */
export function SpiralDemoPage() {
  return (
    <main className="relative z-1 flex min-h-svh flex-1 flex-col bg-black">
      <SpiralScene className="min-h-svh flex-1" />
    </main>
  );
}
