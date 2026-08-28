import path from "path";
import { defineConfig, loadEnv, type Plugin } from "vite";
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

function localNotifyApi(): Plugin {
  const middleware = (
    req: { url?: string; method?: string },
    res: {
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      end: (body: string) => void;
    },
    next: () => void,
  ) => {
    if (
      req.url?.split("?")[0] !== "/api/notify-game-created" &&
      req.url?.split("?")[0] !== "/api/notify-broadcast" &&
      req.url?.split("?")[0] !== "/api/notify-kickoff-reminder"
    ) {
      next();
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ ok: true, skipped: true }));
  };

  return {
    name: "local-notify-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

function firebaseMessagingSw(env: Record<string, string>): Plugin {
  const script = () => {
    const config = {
      apiKey: env.VITE_FIREBASE_API_KEY ?? "",
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
      projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
      appId: env.VITE_FIREBASE_APP_ID ?? "",
    };

    return `/* firebase-messaging-sw.js */
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js");

const hostedAuthDomain = ${JSON.stringify(config.authDomain)};
const authDomain = self.location.hostname === "ollyofc.vercel.app" ? self.location.host : hostedAuthDomain;

firebase.initializeApp({
  apiKey: ${JSON.stringify(config.apiKey)},
  authDomain: authDomain,
  projectId: ${JSON.stringify(config.projectId)},
  storageBucket: ${JSON.stringify(config.storageBucket)},
  messagingSenderId: ${JSON.stringify(config.messagingSenderId)},
  appId: ${JSON.stringify(config.appId)},
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Chrome/Android already displays FCM `notification` payloads. Showing
  // another one here would duplicate on some browsers.
  if (payload.notification && payload.notification.title) {
    return;
  }

  const data = payload.data || {};
  const title = data.title || "Ollyo FC";
  const body = data.body || "A new game was created.";
  const url = data.url || (data.gameId ? "/games/" + data.gameId : "/games");

  return self.registration.showNotification(title, {
    body: body,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: { url: url, gameId: data.gameId || "" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data && event.notification.data.url ? event.notification.data.url : "/games";
  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

    for (const client of windowClients) {
      if (new URL(client.url).origin === self.location.origin && "focus" in client) {
        await client.focus();
        if ("navigate" in client) {
          await client.navigate(targetUrl);
        }
        return;
      }
    }

    await self.clients.openWindow(targetUrl);
  })());
});
`;
  };

  const serve = (
    req: { url?: string },
    res: {
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      end: (body: string) => void;
    },
    next: () => void,
  ) => {
    if (req.url?.split("?")[0] !== "/firebase-messaging-sw.js") {
      next();
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(script());
  };

  return {
    name: "firebase-messaging-sw",
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "firebase-messaging-sw.js",
        source: script(),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
  plugins: [
    react(),
    tailwindcss(),
    localTimeApi(),
    localImageApi(),
    localNotifyApi(),
    firebaseMessagingSw(env),
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
        globIgnores: ["**/firebase-messaging-sw.js"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/__/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/__/"),
            handler: "NetworkOnly",
          },
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
  };
});
