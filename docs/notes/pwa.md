# Making Ollyo FC a PWA

Phase 1 (installable shell) and Phase 2 (standalone Google sign-in) are implemented via `vite-plugin-pwa`. This doc remains the product analysis and the checklist for later polish.

A Progressive Web App (PWA) is a website that can be installed on a phone or desktop, launch in its own window, and (optionally) keep working when the network is weak or gone. For Ollyo FC the useful part is **install + app-like chrome**. Full offline play-by-play is the wrong target for this product.

---

## What this app is today

Ollyo FC is a Vite 7 + React 19 SPA. Client routing is `BrowserRouter`. Production is `https://ollyofc.vercel.app` (`vercel.json` rewrites non-`/api` paths to `index.html`). Firebase Hosting only 301s to that Vercel origin, so the PWA lives on Vercel, not on `web.app`.

Data is live Firebase:

- Google sign-in via `signInWithPopup`
- Firestore `onSnapshot` for games, participants, and profiles
- Storage for photos
- Two Vercel Edge routes: `/api/time` (match clock offset, `Cache-Control: no-store`) and `/api/image` (poster photo proxy)

Public surfaces: home, squad, games, leaderboard, game detail. Signed-in: profile. Staff: dashboard.

Shipped in Phase 1–2:

| In production config | Still optional (Phase 3) |
| --- | --- |
| HTTPS on Vercel | Custom in-app Install button |
| `vite-plugin-pwa` + `manifest.webmanifest` + `sw.js` | Safe-area insets on `.topbar` |
| 192 / 512 / maskable PNG icons | Firestore persistent local cache |
| `theme-color` and Apple meta tags | Web Push |
| App-shell precache; NetworkOnly `/api/time` | |
| Standalone Google `signInWithRedirect` | |

---

## What “PWA” should mean here

Ollyo FC is a live office-football board: upcoming games, join/leave, toss, kick-off, scores, elapsed time. Stale cached scores would be worse than an offline error.

**In scope for v1**

- Install to home screen / desktop
- Open as `standalone` (no browser address bar)
- Own icon, name, splash/theme color
- Precache the **app shell** (HTML/JS/CSS) so a cold open is fast and a brief blip still shows the UI
- Network-only for Firebase and `/api/*`

**Out of scope for v1**

- Full offline: joining, scoring, or browsing last week’s matches with no network
- Push notifications (“kick-off in 10 minutes”)
- App Store / Play Store packaging
- Caching Firestore responses in the service worker

**Later, only if needed**

- Firestore persistent local cache so the last snapshot can render for a few seconds offline
- Custom in-app “Install app” button
- Web Push after iOS home-screen install (iOS 16.4+)

---

## Browser install rules (what we actually have to ship)

Served over HTTPS: already true in production.

**Manifest (required for a proper install)**

Chromium (Chrome, Edge, Samsung Internet) expects:

- `name` or `short_name`
- `start_url` inside `scope`
- `display`: `standalone` (or `fullscreen` / `minimal-ui`)
- PNG icons at **192×192** and **512×512**
- Prefer a **maskable** icon as well (Android adaptive shapes crop the edges)

Chrome may still require a service worker with a `fetch` handler before it fires `beforeinstallprompt`. Menu install is looser than the automatic prompt. Ship a real service worker anyway so Android install, Lighthouse, and offline shell all work.

**Safari / iOS**

- iOS 16.4+ reads the web app manifest for Add to Home Screen
- There is **no** `beforeinstallprompt`. Users use Share → Add to Home Screen
- `apple-touch-icon.png` is already in `public/`; keep it
- Standalone iOS often **breaks Google popup sign-in**. This app uses `signInWithPopup` in `auth.store.ts`. Treat redirect sign-in as part of PWA work, not a follow-up surprise

**Firefox**

No first-class “install this PWA” flow. Ignore for planning.

---

## Recommended stack: `vite-plugin-pwa`

Hand-writing a service worker is easy to get wrong (SPA fallbacks, cache versioning, update loops). For Vite, use [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) (Workbox under the hood).

Why it fits this repo:

- Drops into `vite.config.ts` next to the existing React / Tailwind plugins
- Generates `manifest.webmanifest` and `sw.js` at `pnpm build`
- Precaches hashed `dist/assets/*` automatically
- Stays **off** during `pnpm dev` by default (do not enable a SW in HMR)

Suggested plugin shape (not applied yet):

```ts
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.svg", "favicon-32x32.png", "apple-touch-icon.png"],
  manifest: { /* see next section */ },
  workbox: {
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
      {
        urlPattern: /\/api\/time/i,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /\/api\/image/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "ollyfc-image-proxy",
          expiration: { maxEntries: 32, maxAgeSeconds: 300 },
        },
      },
    ],
  },
})
```

Workbox must **not** intercept `firestore.googleapis.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, or Google Storage. Those are cross-origin; default generateSW leaves them alone if we do not add runtime rules for them. Do not add those rules.

`registerType: "autoUpdate"` + `skipWaiting` is the right default for a small club app: players should not sit on an old bundle that still thinks a match is live.

---

## Manifest values for this product

| Field | Proposed value | Why |
| --- | --- | --- |
| `id` | `https://ollyofc.vercel.app/` | Stable identity if `start_url` ever changes |
| `name` | `Ollyo FC` | Matches `og:site_name` |
| `short_name` | `Ollyo FC` | Home-screen label (12 characters; fine) |
| `description` | Same as `index.html` meta description | Consistency |
| `start_url` | `/?source=pwa` | Opens public upcoming-games home; query is for analytics only |
| `scope` | `/` | Whole SPA |
| `display` | `standalone` | App window, no browser chrome |
| `theme_color` | `#101d56` | Brand navy from `favicon.svg` (`#101d56`). Status bar / title bar. |
| `background_color` | `#f3f4f6` | Splash before CSS; matches `$color-page` |
| `orientation` | omit | Phones, tablets, and desktop all use this app |
| `lang` | `en` | Matches `<html lang="en">` |
| `icons` | 192, 512, and maskable 512 | Chromium + Android |

Do not set `prefer_related_applications`.

Also add to `index.html`:

```html
<meta name="theme-color" content="#101d56" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Ollyo FC" />
```

`apple-mobile-web-app-capable` is the older iOS hint; keep it next to the manifest.

Optional later: `viewport-fit=cover` plus `env(safe-area-inset-*)` on `.topbar` so the navy header fills the iPhone notch. Not required for the first installable build.

---

## Icons

Today:

- `public/favicon.svg` — 32-viewBox navy `#101d56` + white ring
- `public/favicon-32x32.png` — tab icon
- `public/apple-touch-icon.png` — iOS home-screen style “O” on navy (already rounded)
- `public/og.jpg` — social share only; do **not** use as a PWA icon (1200×630)

Need to add (PNG, not SVG — Chromium install checks PNG sizes):

| File | Size | `purpose` |
| --- | --- | --- |
| `pwa-192x192.png` | 192×192 | `any` |
| `pwa-512x512.png` | 512×512 | `any` |
| `pwa-512x512-maskable.png` | 512×512 | `maskable` |

Maskable: keep the “O” / ring inside an ~80% safe zone. Android will crop to a circle or squircle.

Generate from the existing SVG or apple-touch art; do not invent a second logo.

---

## Caching strategy (the important part)

Three classes of request:

### 1. App shell — precache

Vite hashed files under `dist/assets/` plus `index.html`. Workbox precache. This is what makes “installed app” feel instant and lets the UI boot if the CDN blips.

HTML must not be cached forever by Vercel or the SW will pin an old `index.html` that points at deleted JS. `vite-plugin-pwa` rewrites the HTML to register the new SW; Vercel already serves hashed assets. Still set a no-cache header on the service worker file (below).

### 2. Own APIs — never treat as static

| Route | Strategy | Reason |
| --- | --- | --- |
| `/api/time` | NetworkOnly | `clock.ts` measures offset for kick-off / elapsed time. A cached timestamp would lie. |
| `/api/image` | NetworkFirst, short TTL, or leave uncached | Only used when generating a winning-team poster. Stale photos are annoying, not dangerous. |

`navigateFallback: "/index.html"` must exclude `/api/` (`navigateFallbackDenylist`). Otherwise a missing API path would return the React app HTML.

### 3. Firebase / Google — do not cache in the SW

Auth tokens, Firestore listeners, and Storage URLs must hit the network. The Firebase JS SDK already has its own IndexedDB. Duplicating that in Workbox causes auth glitches and ghost scores.

If we ever want “last known games when offline”, do it with Firestore `persistentLocalCache` in `src/lib/firebase/index.ts`, not with a service-worker cache of REST responses. That is a separate, explicit product decision.

---

## Auth in standalone mode

Google sign-in must be **same-origin**. Installed PWAs and Safari block cookies on `*.firebaseapp.com`, and the service worker must not swallow `/__/auth/*`.

What we ship:

1. On `ollyofc.vercel.app`, `authDomain` is the site host (not `*.firebaseapp.com`).
2. Vercel proxies `/__/auth/:path*` to `https://ollyofc-f97a1.firebaseapp.com/__/auth/:path*`.
3. Workbox `navigateFallbackDenylist` includes `/__/` and those URLs are `NetworkOnly`.
4. Popup is the default. Redirect is only a fallback when the installed app blocks the popup (typical on iOS).

Google Cloud Console still needs this redirect URI on the OAuth web client:

`https://ollyofc.vercel.app/__/auth/handler`

Firebase Authentication → Settings → Authorized domains must include `ollyofc.vercel.app`.

Protected routes (`/profile`, `/dashboard`) already bounce to `/login`. `start_url` of `/` is public, so a signed-out install still lands on upcoming games. That is the right default for a club app.

---

## Vercel and Firebase Hosting

`vercel.json` proxies Firebase auth before the SPA fallback:

```json
{
  "rewrites": [
    {
      "source": "/__/auth/:path*",
      "destination": "https://ollyofc-f97a1.firebaseapp.com/__/auth/:path*"
    },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

Vercel serves a real file from `dist/` if it exists, then applies rewrites. After build, `sw.js` / `manifest.webmanifest` should be real files and must not be rewritten to `index.html`. Confirm in a preview deploy: `GET /manifest.webmanifest` → JSON, `GET /sw.js` → JavaScript.

Add headers so browsers always revalidate the worker (stale SW is how users get stuck on old deploys):

```json
{
  "source": "/sw.js",
  "headers": [
    { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
  ]
}
```

(Exact filename depends on plugin config; `vite-plugin-pwa` default is `/sw.js`. If using `injectManifest` with another name, match it.)

Firebase `hosting.redirects` send every path to Vercel. Do not also host a second service worker on `web.app` — two origins means two PWAs.

`pnpm preview` is the local way to test the production SW (`pnpm dev` will not register it).

---

## App UX after install

v1 can ship with **no custom install button**. Chrome/Edge show an install icon in the address bar; Android may show a banner; iOS users use Share.

If we add a button later:

- Listen for `beforeinstallprompt`, `preventDefault`, store the event
- Show a small “Install Ollyo FC” control in the header or home page
- Call `prompt()` on click
- Hide it after `appinstalled`, and never show it in `display-mode: standalone`

Do not nag on every visit.

Safe-area padding on the topbar is the main layout follow-up once people open the app on notched iPhones.

---

## What not to do

- Precache or stale-while-revalidate Firestore.
- Cache `/api/time`.
- Enable the service worker in `pnpm dev`.
- Use `og.jpg` as the home-screen icon.
- Promise “works fully offline” in UI copy.
- Lock `orientation` to portrait.
- `clientsClaim` without an update story (plugin `autoUpdate` is the story).
- Empty `fetch` handler just to pass Lighthouse — precache the shell instead.

---

## Implementation order

Do these in order. Each step is shippable on its own.

### Phase 1 — Installable shell (done)

1. Export 192 / 512 / maskable PNGs into `public/`.
2. Add `vite-plugin-pwa` with the manifest table above.
3. Add `theme-color` and Apple meta tags in `index.html`.
4. Precache shell; NetworkOnly `/api/time`; deny navigate fallback for `/api/`.
5. SW `Cache-Control` header in `vercel.json`.
6. `pnpm build && pnpm preview`, then Chrome Application panel + Lighthouse PWA.

### Phase 2 — Standalone auth (done in code; confirm on a physical iPhone)

7. Redirect Google sign-in when `display-mode: standalone` (especially iOS).
8. Manual test: iPhone Add to Home Screen → Sign in → land back in the installed app with a session.

### Phase 3 — Polish (optional)

9. Custom install button from `beforeinstallprompt`.
10. Safe-area insets on `.topbar`.
11. Firestore `persistentLocalCache` only if we explicitly want last-known games offline.
12. Push notifications for match start — separate product decision (needs VAPID keys, server, and iOS home-screen install).

---

## How to verify

Local:

1. `pnpm build && pnpm preview --host`
2. Chrome DevTools → Application → Manifest (icons, `standalone`, start URL)
3. Application → Service Workers (activated, `fetch` handler)
4. Application → Cache Storage (hashed assets only, not Firebase)
5. Network offline → reload → shell loads; games list should show an error or empty, **not** a fake old score
6. Lighthouse → Progressive Web App

Production:

7. Android Chrome: install from menu, open from home screen, join a game while online
8. Desktop Chrome/Edge: install, confirm it opens a standalone window on `/`
9. iOS Safari: Add to Home Screen, icon + name, Google sign-in (after Phase 2)
10. After a new deploy: old installed app updates within a visit (autoUpdate)

---

## Success criteria

v1 is done when:

- Chrome/Edge offer install (or menu install works) on `https://ollyofc.vercel.app`
- Installed app opens standalone on the home/upcoming-games screen
- Icon and splash/theme use the navy brand, not a generic globe
- Live scores and `/api/time` still come from the network
- A new production deploy replaces the old service worker without a manual unregister
- iOS home-screen users can sign in (Phase 2)

That is an installable club app with a cached shell. It is not an offline native clone of Firestore, and it should not try to be.
