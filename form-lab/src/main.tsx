import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

/**
 * Точка входа. Единственное место, где мы общаемся с DOM напрямую:
 * находим #root и отдаём его React.
 */
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Не найден #root в index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
