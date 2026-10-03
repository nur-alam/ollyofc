# Ollyo FC

Office football team management. Plan games, build teams, score matches, and track player stats.

React 19 + TypeScript + Vite 7, Tailwind CSS 4, shadcn/ui, Firebase (Auth, Firestore, Storage), Zustand, React Router 7. Package manager is pnpm. Node is 22. Production site is `https://ollyofc.vercel.app`. Firebase Hosting only redirects there.

## Commands

```bash
pnpm install
pnpm dev          # Vite. Uses the ollyofcdev Firestore database.
pnpm typecheck    # tsc --noEmit
pnpm build        # typecheck, then production build (default Firestore database)
pnpm preview
```

Copy `.env.example` to `.env` and fill in `VITE_FIREBASE_*`. Do not commit `.env`.

## Firebase

`src/lib/firebase/index.ts` picks the database from the Vite mode:

- `pnpm dev` uses the named database `ollyofcdev`. A blue banner says so. Local work must stay on that database.
- `pnpm build` / production uses `(default)`.

The same `firestore.rules` and `storage.rules` apply to both databases. After rule changes: `firebase deploy --only firestore:rules`.

Collections: `users/{uid}` (role, profile, `stats`), `users/{uid}/fcmTokens`, `games/{id}`, `games/{id}/participants`, `visitorSessions`, `visitorDays`.

Roles on `users/{uid}.role`: `admin`, `moderator`, `user`. Staff means `admin` or `moderator` (`STAFF_ROLES` in `src/types/user.ts`). A new Google sign-in creates `role: "user"`. Promote someone by editing that field in Firestore.

## Layout

```
src/app/          router and providers
src/components/   shared layout and shadcn/ui primitives
src/features/     auth, games, players, notifications, visitors
src/lib/          firebase, clock, timezone, utils
src/pages/        thin route pages
src/types/        shared types (game, player, user)
api/              Vercel functions: clock, image proxy, push, visitors
cloudflare/       kickoff reminder worker
docs/             domain notes (stats, awards, completed games, PWA, push)
```

Import with the `@/` alias (`@/features/...`). Feature modules follow `*.service.ts` (Firestore reads and writes), `*.hooks.ts` (subscriptions and derived state), `components/`, and `pages/`.

## Routes

Public: `/`, `/squad`, `/leaderboard`, `/player/:playerId`, `/games`, `/games/:gameId`.

Signed in: `/profile`. Staff: `/dashboard`. Admin only: `/notification`, `/visitors`.

Home (`UpcomingGamesList`) shows upcoming games, otherwise a live game, otherwise the last finished game.

## Domain

Game status is `draft | upcoming | active | completed | cancelled`. `completed` means staff finished the match. It is not a lock on every field. Scoring, toss, kick-off, join/leave, swaps, and rebuilds stop. Staff can still edit match details; admin can delete or reopen. See `docs/completed-game-logic.md`.

Career stats are written only when a game is completed, then re-synced on reopen, add-player-to-finished-game, award edits, delete, and the dashboard rebuild. Live goals do not move career totals. Guests do not get career stats. Own goals never count as that player's goals. See `docs/player-stats-docs.md`.

Points live on `users/{id}.stats.points`: `(goals × 3) + (assists × 1.7) + (award total × 2)`. Compute in tenths so 1.7 stays exact: `(goals × 30 + assists × 17 + awardTotal × 20) / 10`. Format to one decimal only in the UI. `careerPoints` in `src/types/user.ts` is the source of that formula.

Match awards are `result.awards`. MVP (`kind: "mvp"`) ranks by goals, then assists, until an admin locks it. Extra awards are `kind: "custom"`. See `docs/awards.md`.

Times are Bangladesh local time (`src/lib/timezone.ts`). The match clock uses server time from `/api/time` (`src/lib/clock.ts`).

Push notifications go out from `api/notify-*.ts`. Creating a game must still succeed if push fails. See `docs/push-noti.md` and `docs/pwa.md`.

## How to change the code

- Match the surrounding file. Keep changes limited to the task.
- Reuse `src/components/ui` and existing feature components before adding new ones.
- Put Firestore access in the feature `*.service.ts`, and UI state in hooks or the component.
- Toasts use `react-hot-toast`.
- After a TypeScript change, run `pnpm typecheck`.
- After a UI change, run `pnpm dev` and check the affected page in the browser, including empty and signed-out states when those paths exist.
- Do not commit, push, or open a pull request unless asked. When asked, follow `.claude/skills/git-commits-prs/SKILL.md` (same skill under `.cursor/skills/`). Commits are authored as nur-alam without changing git config.
