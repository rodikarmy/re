import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Заглушка favicon-эндпоинта оригинала (GET /api/favicon?domain=…&sz=128).
 * Локальная версия проксирует на DuckDuckGo favicon-сервис.
 */
const faviconStub = {
  name: "favicon-stub",
  configureServer(server: any) {
    server.middlewares.use("/api/favicon", (req: any, res: any) => {
      const url = new URL(req.url!, "http://localhost");
      const domain = url.searchParams.get("domain");
      if (!domain) {
        res.statusCode = 400;
        return res.end();
      }
      res.statusCode = 302;
      res.setHeader(
        "Location",
        `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
      );
      res.end();
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), faviconStub],
});

