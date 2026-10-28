# Ollyo FC — Implementation plan

Work is ordered by dependency. Phases 1–3 are shipped and checked. Do not rebuild them. Phase 4 is open because the repo has no automated test suite.

When you finish a step, check its box in this file in the same change. New work is appended as an unchecked box under the phase it depends on. Do not renumber checked steps.

## Phase 1: DB & Auth

- [x] Firebase project with Google sign-in, Firestore `(default)`, and Storage.
- [x] Named database `ollyofcdev` for `pnpm dev`, selected in `src/lib/firebase/index.ts`.
- [x] `users/{uid}` created on first sign-in with `role: "user"`.
- [x] Roles `admin`, `moderator`, `user`. Staff is admin or moderator.
- [x] `firestore.rules` for users, games, participants, payments, and visitors.
- [x] `storage.rules` for `profile-photos/{userId}/{fileName}`.
- [x] Vercel `/__/auth/*` proxy so PWA Google sign-in stays on the site host.
- [x] Zustand session, `ProtectedRoute`, and `RoleGuard`.

## Phase 2: Core API

- [x] Game, participant, goal, award, and payment writes in `src/features/games/game.service.ts`.
- [x] Career stats written only on finish, reopen, add-player-to-finished-game, award edits, delete, and dashboard rebuild.
- [x] Points formula in tenths: `(goals × 30 + assists × 17 + awardTotal × 20) / 10`.
- [x] `GET /api/time` with `Cache-Control: no-store`.
- [x] `GET /api/image` poster proxy.
- [x] `GET /api/track-visitor` from Vercel IP headers.
- [x] `POST /api/notify-game-created`, `/api/notify-game-joined`, and `/api/notify-broadcast` with a staff or admin ID token.
- [x] `GET` and `POST /api/notify-kickoff-reminder` gated by `env.CRON_SECRET`.
- [x] Typed server env in `api/_lib/env.ts`.
- [x] Cloudflare cron worker calling the reminder route with `Authorization: Bearer`.
- [x] Game creation stays committed when push fails.

## Phase 3: UI Integration

- [x] Public routes: `/`, `/squad`, `/leaderboard`, `/player/:playerId`, `/games`, `/games/:gameId`.
- [x] Signed-in `/profile`. Staff `/dashboard`. Admin `/notification` and `/visitors`.
- [x] Home order: upcoming game, otherwise live game, otherwise last finished game.
- [x] Join, leave lockout at 60 minutes, guests, two-team build, toss, kickoff, goals, finish, reopen, awards, payment.
- [x] Leaderboard sort: points, award total, win rate. Empty copy: "Nobody has played a finished game yet."
- [x] Header, mobile menu, staff sidebar, toasts, PWA install, push opt-in.
- [x] Shell hex tokens and shadcn OKLCH tokens documented in `03_UI_Spec.md`.

## Phase 4: Edge-case tests

No test runner is installed. Add one only when the first test in this phase is started, then keep these cases in that runner.

- [ ] Player cannot leave inside 60 minutes of kickoff.
- [ ] Player cannot set their own payment to `paid` or `cancelled`.
- [ ] A verifier for game A cannot mark game B paid.
- [ ] Guest join does not write `users.stats`.
- [ ] Own goal does not increment the conceding player's `stats.goals`.
- [ ] Live goal write does not change `stats.points`. Finish does.
- [ ] Reopen removes that game's contribution. Finish again writes it back.
- [ ] Second stats sync with no diff does not change `stats`.
- [ ] Reminder route returns 401 without `Bearer <CRON_SECRET>` and 500 when the secret is unset.
- [ ] `/api/time` response is `no-store`.
- [ ] Role `user` is redirected away from `/dashboard`, `/notification`, and `/visitors`.
- [ ] Signed-out visit to `/profile` lands on `/login` and returns to `/profile` after Google sign-in.
- [ ] Map field rejects a non-Google URL and stores nothing.
- [ ] Transaction id shorter than 5 or longer than 120 is rejected.
- [ ] Delete game subtracts career stats before the game document is gone.

## How to extend

Add the next unchecked box under the earliest phase that can accept it. A schema change is Phase 1 and must land before the API step that writes the new field. A new route is Phase 3 and must land after the service it calls. A regression check is Phase 4 and names the rule it locks.
