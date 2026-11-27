# Ollyo FC — Implementation plan

Work is ordered by dependency. Phases 1–3 are shipped and checked. Do not rebuild them. Phase 4 is open. Vitest is installed and most of its cases are not written yet.

When you finish a step, check its box in this file in the same change. New work is appended as an unchecked box under the phase it depends on. Do not renumber checked steps.

## Phase 1: DB & Auth

- [x] Firebase project with Google sign-in, Firestore `(default)`, and Storage.
- [x] Named database `ollyofcdev` for `pnpm dev`, selected in `src/lib/firebase/index.ts`.
- [x] `pnpm prod` runs the Vite server in mode `production` so Firestore is `(default)`. `pnpm dev` stays on `ollyofcdev`.
- [x] `users/{uid}` created on first sign-in with `role: "user"`.
- [x] Roles `admin`, `moderator`, `user`. Staff is admin or moderator.
- [x] `firestore.rules` for users, games, participants, payments, and visitors.
- [x] `storage.rules` for `profile-photos/{userId}/{fileName}`.
- [x] Vercel `/__/auth/*` proxy so PWA Google sign-in stays on the site host.
- [x] Zustand session, `ProtectedRoute`, and `RoleGuard`.
- [x] Optional `playedBoth` on a participant. Missing means one team. `teamId` stays their original side.
- [x] Optional `scoringVersion` on a game, optional `positionManual` on a participant, and `stats.defenderGoals` and `stats.defenderAssists` on a user. A game with no `scoringVersion` keeps the old points. `firestore.rules` did not change.

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
- [x] `POST /api/notify-user-registered` after the first Google sign-in creates `users/{uid}`. Opted-in admins and moderators are notified. The profile stays saved if push fails.
- [x] `POST /api/slack/leaderboard` answers `/ollyofc-leaderboard` from production `users` stats. Slack's signing secret is required. The route returns HTTP 200 before the Firestore read, then posts the same ranking as `/leaderboard` to Slack's `response_url`. Later Slack commands are sibling files under `api/slack/`.
- [x] `POST /api/slack/games` answers `/ollyofc-games` with the first 10 games, upcoming first. Previous (`games-previous`) and Next (`games-next`) post to `POST /api/slack/actions` and replace the message.
- [x] `POST /api/slack/squad` answers `/ollyofc-squad` with active players, sorted by name, 10 per page. Previous (`squad-previous`) and Next (`squad-next`) use the same actions route.
- [x] `POST /api/slack/me` answers `/ollyofc-me` with the caller's profile match stats. `users.info` matches the Slack email to `users.email`. The reply is ephemeral.
- [x] The leaderboard slash command keeps that read alive with the edge handler `waitUntil`. The private request-context symbol is not set on this runtime, so Slack was waiting on the users read and timing out.
- [x] `setParticipantPlayedBoth`. A full move, rebuild, or clear removes the mark. Finish gives that player a win unless the match is a draw.
- [x] Defender scoring. A goal as a defender is 4 points and an assist is 2: `(goals × 30 + assists × 17 + defenderGoals × 10 + defenderAssists × 3 + awardTotal × 20) / 10`. It reads the position saved on the match, and only on a game stamped `scoringVersion: 2`.
- [x] `startGame` and `setGamePlayStatus` stamp `scoringVersion: 2` and save each profile position onto the participant when a game leaves `upcoming`. `setParticipantMatchPosition` lets staff pick a position for one match until it is finished.
- [x] `/ollyofc-me` shows defender goals and defender assists when above zero. Both Slack fallbacks use the new formula.
- [x] Auto MVP ranks by match points only on a game created with `scoringVersion: 3`. A game with no version, and a game already stamped `2`, keeps goals, then assists. Leaving `upcoming` does not raise `2` to `3`. The MVP award is not part of the points.
- [x] Winning bonus. On a game created with `scoringVersion: 3`, a win with no goals, assists, or awards is 0.5 (`winBonus`). A goal, an assist, any award, or a result change removes it on the next sync. Games already stamped `2` or with no version add 0.

## Phase 3: UI Integration

- [x] Public routes: `/`, `/squad`, `/leaderboard`, `/player/:playerId`, `/games`, `/games/:gameId`.
- [x] Signed-in `/profile`. Staff `/dashboard`. Admin `/notification` and `/visitors`.
- [x] Home order: upcoming game, otherwise live game, otherwise last finished game.
- [x] Restore Last Game Result header and card on home when there is no live game.
- [x] Join, leave lockout at 60 minutes, guests, two-team build, toss, kickoff, goals, finish, reopen, awards, payment.
- [x] Leaderboard sort: points, award total, win rate. Empty copy: "Nobody has played a finished game yet."
- [x] Header, mobile menu, staff sidebar, toasts, PWA install, push opt-in.
- [x] Shell hex tokens and shadcn OKLCH tokens documented in `03_UI_Spec.md`.
- [x] A played-both player is listed on both team cards with a "Played both sides" badge, can be picked for a goal or assist on either team, and appears on both sides of the winning poster.
- [x] Played both sides sits in the player row menu after the swap arrow.
- [x] Game teams panel lives in `components/GameTeamsPanel`, with PlayedBothMenu, PlayerLine, and TeamName in their own files.
- [x] Admin can delete one day's visitor history, or history from before 7 days ago, from `/visitors`. The last 7 days and live sessions stay.
- [x] Visitors page shows an all-time count of `visitorSessions`. Each browser is counted once, and deleting day history does not change the count.
- [x] Games list pages 10 at a time with the shadcn pagination control. Upcoming games stay first. The page lives in `?page=`.
- [x] Page query, clamp, and controls live in `usePagination` and `ListPagination` so another list can reuse them.
- [x] The player row menu lists the four positions for that match, with a check on the current one. Team cards and the joined list show the match position.
- [x] The Scorer, Own goal by, and Assist lists show the match position after each name on a match that uses defender scoring.
- [x] The leaderboard info popover explains defender points. The profile stats card shows "Defender goals" and "Defender assists" when above zero.
- [x] The awards card says match points on a game created with `scoringVersion` 3, and goals, then assists on a game stamped `2` or with no version.
- [x] The leaderboard info popover explains the 0.5 win bonus. The profile stats card shows "Win bonus" when it is above zero.

## Phase 4: Edge-case tests

The runner is Vitest. `pnpm test` runs every `src/**/*.test.ts` in Node, from `vitest.config.ts`. A test file sits next to the code it checks. The tests so far cover pure functions and do not open Firestore. A case that needs Firestore, the rules, or a page stays unchecked until it has its own test.

- [x] Vitest runner, `pnpm test`, and the first tests: `src/features/games/playerStats.test.ts` and `src/types/game.test.ts`.
- [ ] Player cannot leave inside 60 minutes of kickoff.
- [ ] Player cannot set their own payment to `paid` or `cancelled`.
- [ ] A verifier for game A cannot mark game B paid.
- [ ] Guest join does not write `users.stats`.
- [x] Own goal does not increment the conceding player's `stats.goals`.
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
- [ ] Registration notify sends nothing when the user document is older than 5 minutes, and a failed push does not delete the new profile.
- [ ] `/api/slack/leaderboard` returns HTTP 200 with an ephemeral explanation when the Slack signature is bad or `SLACK_SIGNING_SECRET` is unset, and does not call `response_url`. A valid `/ollyofc-leaderboard` ranks like `/leaderboard`.
- [x] A game with no `scoringVersion` scores a defender's goal at 3 and assist at 1.7, including after reopen and finish.
- [x] A game with `scoringVersion: 2` scores a defender's goal at 4 and assist at 2, and a midfielder's at 3 and 1.7.
- [ ] A profile position change after finish does not change that match's points. The Dashboard rebuild keeps them too.
- [ ] The Dashboard rebuild leaves the points of every game without `scoringVersion` unchanged.
- [ ] A staff-picked match position is not overwritten by the profile at kickoff.
- [x] An unstamped finished game and a game stamped `scoringVersion: 2` give MVP to the goal leaders. A game stamped `3` gives it to the highest match points, with a defender goal at 4 and a defender assist at 2. Equal points share it.
- [x] A game stamped `3` gives 0.5 to a winner with no goals, assists, or awards, including a player who played both sides. A goal, an award, or a changed winner removes it. A game stamped `2` or with no version gives nothing.

## Phase 5: Tournaments

Design is `docs/notes/tournaments.md`. A tournament groups existing games. It does not add a second match, a second career write, or a second payment flag. `01`–`05` stay as the shipped product until a step below lands, and that step updates them in the same change.

- [x] Design note: formats (`series`, `league`, `knockout`), screens, schema, and what stays on the game.
- [ ] Types, `tournaments` rules, and optional `tournament*` fields on `games`.
- [ ] Tournament service: status, entries, squads, link and unlink fixture, knockout decider.
- [ ] Standings computed from completed fixtures. Series first.
- [ ] Public `/tournaments` and `/tournaments/:tournamentId`, header link, home line, game-page link.
- [ ] Game form can attach a fixture. League and knockout can name the two squads.
- [ ] Registration cap, guest and own-goal exclusion, and “delete tournament does not delete games” locked as Phase 4 cases when a runner exists.

## How to extend

Add the next unchecked box under the earliest phase that can accept it. A schema change is Phase 1 and must land before the API step that writes the new field. A new route is Phase 3 and must land after the service it calls. A regression check is Phase 4 and names the rule it locks.
