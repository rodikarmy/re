import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Минимальная конфигурация Vite.
 * Плагин react() включает Fast Refresh (HMR) и автоматический JSX-трансформ.
 */
export default defineConfig({
  plugins: [react()],
});
