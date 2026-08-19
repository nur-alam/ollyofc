import path from "path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function localTimeApi(): Plugin {
  const middleware = (
    req: { url?: string },
    res: {
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      end: (body: string) => void;
    },
    next: () => void,
  ) => {
    if (req.url?.split("?")[0] !== "/api/time") {
      next();
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ now: Date.now() }));
  };

  return {
    name: "local-time-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localTimeApi()],
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [path.resolve(__dirname, "./src/scss")],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
