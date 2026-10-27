# Ollyo FC — Technical requirements

Locked to the versions installed in `pnpm-lock.yaml` on this repo. Ranges in `package.json` are not a license to jump a major version. Node is 22 (`engines.node`: `22.x`). The package manager is pnpm `10.33.2`.

## Stack

| Piece | Version | Role |
| --- | --- | --- |
| React | 19.2.8 | UI |
| React DOM | 19.2.8 | UI |
| TypeScript | 7.0.2 | `pnpm typecheck` is `tsc --noEmit` |
| Vite | 7.3.6 | Dev server and production build |
| `@vitejs/plugin-react` | 5.0.0 | React plugin |
| React Router DOM | 7.18.2 | Routes |
| Tailwind CSS | 4.3.3 | Utility CSS, via `@tailwindcss/vite` 4.3.3 |
| shadcn | 4.17.0 | UI kit. Primitives live in `src/components/ui` |
| `@base-ui/react` | 1.7.0 | Underlying headless controls |
| `@radix-ui/react-avatar` | 1.2.6 | Avatar |
| `class-variance-authority` | 0.7.1 | Variants |
| `clsx` | 2.1.1 | Class names |
| `tailwind-merge` | 3.6.0 | Class names |
| `tw-animate-css` | 1.4.0 | Animation utilities |
| Zustand | 5.0.15 | Auth session store |
| Firebase JS | 12.17.1 | Auth, Firestore, Storage, Messaging |
| `firebase-admin` | 14.3.0 | Declared for tooling. Edge routes do not import it. They call Google HTTP APIs. |
| `date-fns` | 4.4.0 | Dates |
| `react-day-picker` | 10.0.1 | Date field |
| `lucide-react` | 1.31.0 | Icons |
| `react-hot-toast` | 2.6.0 | Toasts |
| `@fontsource-variable/geist` | 5.3.0 | Font |
| `vite-plugin-pwa` | 1.3.0 | Service worker |
| `workbox-window` | 7.4.1 | PWA registration |
| Sass | 1.102.0 | Shell SCSS |

`jwks-rsa` is pinned so its `jose` dependency stays `5.10.0`.

## Runtime split

| Surface | Where it runs | Database |
| --- | --- | --- |
| `pnpm dev` | Vite | Named Firestore database `ollyofcdev`. A banner says so. |
| `pnpm build` / Vercel production | Static app + `api/*.ts` edge routes | Firestore `(default)` |
| Kickoff cron | Cloudflare Worker in `cloudflare/kickoff-reminder` | None. It POSTs to the Vercel reminder route. |

`src/lib/firebase/index.ts` chooses the database from `import.meta.env.DEV`. The same `firestore.rules` and `storage.rules` apply to both databases. Rule changes ship with `firebase deploy --only firestore:rules`.

Firebase Hosting does not serve the app. Vercel rewrites non-API paths to `index.html`, and proxies `/__/auth/*` to `ollyofc-f97a1.firebaseapp.com` so installed PWAs can complete Google sign-in.

## Folder structure

```
src/app/            router and providers
src/components/     layout and shadcn/ui primitives
src/features/       auth, games, players, notifications, visitors
src/lib/            firebase, clock, timezone, utils
src/pages/          thin route pages
src/types/          game, player, user
src/scss/           shell tokens and layout
api/                Vercel edge routes
api/_lib/           shared server code, not a public route
cloudflare/         kickoff reminder worker
docs/               numbered specs (01–06)
docs/logic/         domain notes these specs summarize
```

Feature code is `*.service.ts` for Firestore, `*.hooks.ts` for subscriptions, then `components/` and `pages/`. Import features with `@/`.

## Environment

Browser variables are typed on `ImportMetaEnv` in `src/vite-env.d.ts`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY` (optional)

Server variables are typed on `ServerEnv` in `api/_lib/env.ts` and read as `env.CRON_SECRET` and the `env.FIREBASE_*` fields. A blank value is `undefined`.

- `CRON_SECRET`
- `FIREBASE_SERVICE_ACCOUNT` or the trio `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

Never prefix a secret with `VITE_`. Never commit `.env`.

## HTTP surface

| Route | Caller | Auth |
| --- | --- | --- |
| `GET /api/time` | Match clock | Public. `Cache-Control: no-store`. The service worker must not cache it. |
| `GET /api/image` | Winning-team poster | Public proxy for an allowed photo URL, size-capped. |
| `GET /api/track-visitor` | Visitor geo from Vercel IP headers | No user secret. The handler reads `x-forwarded-for` and `x-vercel-ip-*`. It does not call a separate geo vendor. |
| `POST /api/notify-game-created` | After a game document is created | Firebase ID token of a staff user. |
| `POST /api/notify-game-joined` | After a player joins | Firebase ID token. |
| `POST /api/notify-broadcast` | Admin notification page | Firebase ID token of an admin. |
| `GET` or `POST /api/notify-kickoff-reminder` | Cloudflare cron | `Authorization: Bearer <CRON_SECRET>`. Missing secret is 500. Wrong secret is 401. |

Push failures are logged and toasted. They must not roll back the Firestore write that triggered them.

## Third-party APIs

| API | Use |
| --- | --- |
| Google Identity / Firebase Auth | Google sign-in only |
| Cloud Firestore | All app data. Two databases, one ruleset. |
| Cloud Storage | `profile-photos/{userId}/{fileName}` |
| FCM HTTP v1 | Push from the edge route, with a Google OAuth token minted from the service account |
| Google Maps | Embed and share links for the four grounds. No Maps API key in the client. |
| Vercel request headers on `/api/track-visitor` | IP, city, region, and country for the visitor page. A failed or empty response stores empty geo. |

## Security constraints

- Authorization is the Firebase ID token plus `users/{uid}.role`. The client store is only a hint. `firestore.rules` is the enforcement.
- Roles are `admin`, `moderator`, and `user`. Staff means admin or moderator. A user cannot change their own role. An admin cannot change their own role in the same write that updates other fields of their document.
- `users` and `games` (including participants) are world-readable. Do not put secrets, tokens, or raw payment credentials on those documents. A transaction id is the only payment secret, and it is still readable because the participant document is public. Treat that as known.
- Participant payment writes are split. The player may set only their own row to `pending` with a transaction id of 5–120 characters, and only from unpaid or cancelled. Admin or that game’s `paymentVerifierId` may set `paid` or `cancelled`, and must stamp `paidBy` with their uid. Staff cannot touch payment fields through the general update.
- Guests use ids prefixed `guest_`. They cannot be given a payment submit, and they are excluded from career stats.
- FCM tokens live at `users/{uid}/fcmTokens/{sha256}`. The owner writes them. The owner or an admin reads them. The token document stores the raw token. Do not log it.
- Profile photos are public read, owner or staff write, under 2 MB, content type jpeg, png, or webp.
- Visitor session writes are unauthenticated and limited to a UUID id. Visitor reads and deletes are admin only. Do not widen visitor reads.
- `CRON_SECRET` is compared as the full `Bearer` value. Do not accept it in a query string.
- Service-account JSON and the private key exist only in server env. The edge route exchanges them for a short-lived Google access token.
- Own goals must not increment the conceding player's `stats.goals`. Career totals change only on finish, reopen, add-player-to-finished-game, award edits, delete, and the dashboard rebuild.
- Local development must stay on `ollyofcdev`.

## Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm preview
```

After a rules change: `firebase deploy --only firestore:rules`.
