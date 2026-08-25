import path from "path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

import { isAllowedPhotoUrl, PHOTO_PROXY_MAX_BYTES } from "./api/photo-proxy";

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

function localImageApi(): Plugin {
  const middleware = (
    req: { url?: string },
    res: {
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      end: (body?: string | Buffer) => void;
    },
    next: () => void,
  ) => {
    const requestUrl = req.url ?? "";

    if (requestUrl.split("?")[0] !== "/api/image") {
      next();
      return;
    }

    const photoUrl = new URL(requestUrl, "http://localhost").searchParams.get("url")?.trim() ?? "";

    if (!isAllowedPhotoUrl(photoUrl)) {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }

    void fetch(photoUrl, { cache: "no-store" })
      .then(async (upstream) => {
        const type = upstream.headers.get("content-type") ?? "";
        const bytes = Buffer.from(await upstream.arrayBuffer());

        if (!upstream.ok || !type.startsWith("image/") || bytes.byteLength > PHOTO_PROXY_MAX_BYTES) {
          res.statusCode = upstream.ok ? 400 : 404;
          res.end("Not found");
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", type);
        res.setHeader("Cache-Control", "private, max-age=300");
        res.end(bytes);
      })
      .catch(() => {
        res.statusCode = 502;
        res.end("Bad gateway");
      });
  };

  return {
    name: "local-image-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localTimeApi(),
    localImageApi(),
    VitePWA({
      registerType: "autoUpdate",
      includeManifestIcons: false,
      manifest: {
        id: "https://ollyofc.vercel.app/",
        name: "Ollyo FC",
        short_name: "Ollyo FC",
        description:
          "Ollyo FC — plan office football games, build balanced teams, and track match results, scores, and player stats.",
        start_url: "/?source=pwa",
        scope: "/",
        display: "standalone",
        background_color: "#f3f4f6",
        theme_color: "#101d56",
        lang: "en",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === "/api/time",
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ url }) => url.pathname === "/api/image",
            handler: "NetworkFirst",
            options: {
              cacheName: "ollyfc-image-proxy",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 32, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
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
