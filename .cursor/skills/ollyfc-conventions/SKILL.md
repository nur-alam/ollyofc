---
name: ollyfc-conventions
description: >-
  Implements and changes Ollyo FC (ollyfc) the office football app: React,
  TypeScript, Firebase, shadcn/ui, pnpm. Use when adding features, editing
  src/features, Firestore, routes, push notifications, games, players, or
  roles.
---

# Ollyo FC conventions

Office football team app. Stack: React 19, TypeScript, Vite, Firebase, shadcn/ui (base-nova), Zustand, pnpm.

Package manager is **pnpm**. Dev server: `pnpm dev`. Typecheck: `pnpm typecheck`.

## Layout

```
src/
  app/           # router + providers
  components/    # shared UI + layout; shadcn under components/ui
  features/      # auth, games, players, notifications, visitors
  lib/           # firebase, errors, clock, timezone, pwa
  pages/         # top-level route pages
  types/         # shared types + parsers
```

Feature files follow `{feature}.service.ts`, `{feature}.hooks.ts`, `{feature}.types.ts`. Pages live in `features/{feature}/pages/`. Shared types live in `src/types/`.

Import with `@/` aliases. Do not invent new top-level folders.

## Roles and routes

Roles: `admin` | `moderator` | `user`. Staff = `admin` + `moderator` (`STAFF_ROLES` in `src/types/user.ts`).

- Public: `/`, `/login`, `/squad`, `/leaderboard`, `/player/:id`, `/games`, `/games/:id`
- Signed-in: wrap with `ProtectedRoute`
- Staff-only: `RoleGuard` with `STAFF_ROLES` (dashboard)
- Admin-only: `RoleGuard` with `["admin"]` (`/notification`, `/visitors`)

Admin-only hard-delete. Moderators may deactivate but not delete players.

UI guards are not enough for writes. Match `firestore.rules` (`isStaff()`, `isAdmin()`). If a new write path is added, update rules in the same change.

## Data layer

- Firestore access belongs in `*.service.ts`. Hooks subscribe; they do not call Firestore APIs directly.
- Live lists use `onSnapshot` and return an unsubscribe from `useEffect`.
- Parse unknown Firestore data at the service/type boundary (`parseStatus`, `parseStatTotals`, etc.). Do not trust raw document fields in UI.
- Map Firebase errors with `getErrorMessage` from `@/lib/errors`. Surface failures with `react-hot-toast`.
- Career stats live on `users/{uid}.stats` / `statGames`. Game finish/edit must keep those in sync via existing helpers in `src/types/user.ts` and `src/features/games/playerStats.ts`. Do not invent a second stats store.

## Time

Club time is **Asia/Dhaka**. Use `@/lib/timezone` (`bangladeshDateTimeToUtc`, `formatBangladeshClock`) and `@/lib/clock` (`getServerNow`) — not `new Date()` for kickoff, countdown, or “is this game live?”.

## UI

- Use existing shadcn primitives in `src/components/ui`. Add new ones with the shadcn CLI; do not hand-roll duplicates.
- Icons: `lucide-react`. Classes: `cn()` from `@/lib/utils`.
- Toasts: `react-hot-toast`. Loading copy already used: “Checking permissions...”, “Loading your session...”.
- Keep components presentational; put subscribe/mutate logic in hooks/services.

## Push and PWA

Push is Web Push / FCM, not an in-app Firestore listener. Tokens live at `users/{uid}/fcmTokens/{tokenId}`. Opt-in UI is `GamePushToggle`. iOS only works after Add to Home Screen.

Never put FCM server keys in the Vite client bundle. Staff create/update should still succeed if push send fails.

Details: `docs/push-noti.md`, `docs/pwa.md`.

## Verify

After UI or routing changes, exercise the flow in the browser (not only a screenshot). After Firestore shape changes, typecheck (`pnpm typecheck`) and say if rules still need `firebase deploy --only firestore:rules`.
