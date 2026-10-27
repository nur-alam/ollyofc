# Ollyo FC — Product requirements

Office football for Ollyo. Players see the next match, join it, and follow scores. Staff plan the game, build two teams, record the match, and keep career stats honest. Production is https://ollyofc.vercel.app. Times are Bangladesh local time.

This document describes the product that is already shipped. It is the requirement set a change must still satisfy.

## Problem

Match details, who is playing, the score, and season totals lived in chat. People missed kickoff, argued about who scored, and could not see a fair ranking. Payment is still manual, so a player needs one place to read how to pay and staff need one place to mark it paid.

## Personas

| Persona | Who | Needs |
| --- | --- | --- |
| Player | Signed-in Google user with `role: "user"` | See upcoming and live games, join or leave, submit a transaction id, open their own profile and the leaderboard. |
| Staff | `admin` or `moderator` | Create and edit games, add guests, build teams, toss, kick off, score, finish, assign a payment verifier, mark payments. |
| Admin | `role: "admin"` | Everything staff can do, plus delete or reopen a game, change roles, rebuild career stats, send push broadcasts, and read visitor analytics. |
| Guest viewer | Signed out | Read the home match, squad, games, leaderboard, and a player page. Cannot join or open staff tools. |
| Match guest | A person without an account, added by staff onto one game | Appear on that game only. Never receive career stats. |

A new Google sign-in always starts as `user`. An admin promotes someone by editing `users/{uid}.role`.

## MVP user stories

1. As a visitor, I can open the home page and see the next upcoming game, otherwise the live game, otherwise the last finished game, without signing in.
2. As a visitor, I can browse the squad, the games list, a game, the leaderboard, and a player profile.
3. As a player, I can sign in with Google and land on my profile. My account is created with role `user`.
4. As a player, I can set my display name, position, and profile photo.
5. As a player, I can join an upcoming game and leave it until one hour before kickoff.
6. As a player, after the match clock has ended, I can submit a bKash or bank transaction id. It stays pending until an admin or that game’s verifier marks it paid or cancelled.
7. As staff, I can create an upcoming game with date, time, location, duration, optional map link, notes, payment instructions, and a squad-size cap.
8. As staff, I can add or remove players, add a named guest, edit that guest until the game is cancelled, and build or rebuild two teams until the match is finished.
9. As staff, I can run the toss, kick off, record player goals, team goals, own goals, and assists while the match is active, and finish the match.
10. As staff, I can still edit match details after the game is completed. Scoring, toss, kickoff, join, leave, swaps, and rebuilds stop. An admin can delete the game or reopen it.
11. As an admin, finishing a game writes career stats. Reopen, adding a player to a finished game, award edits, delete, and the dashboard rebuild re-sync those totals. Live goals do not move career totals.
12. As a visitor, I can read the leaderboard ranked by points, then award total, then win rate. Only players with at least one finished game appear.
13. As an admin, I can lock MVP and add extra awards. MVP ranks by goals, then assists, until it is locked.
14. As an admin, I can notify all opted-in devices, a chosen set of users, or people about the leaderboard, and I can attach a game link. Creating a game still succeeds if the push fails.
15. As a signed-in player, I can opt in to push and get a kickoff reminder about one hour before today’s games that have not started.
16. As an admin, I can see who is on the site and daily visitor counts.

## Success metrics

- A signed-out visitor can tell what the next, live, or last match is from `/` without asking in chat.
- A joined player can submit one transaction id, and only an admin or that game’s verifier can mark it paid or cancelled.
- Career points on the leaderboard match `(goals × 3) + (assists × 1.7) + (award total × 2)` after every finish, reopen, award edit, delete, and rebuild.
- Own goals never increase the conceding player’s goal count. Guests never appear in career totals.
- A failed push request does not roll back game creation.
- Staff tools are unreachable for role `user` and for signed-out visitors. `/notification` and `/visitors` are admin only.

## Out of scope (non-goals)

- Online card or bKash checkout. Payment is instructions plus a transaction id.
- More than two teams in a match. `teamCount` is locked to `2`.
- Tournaments, brackets, seasons as a separate entity, or transfer fees.
- Career stats for guests, and career stats that move while the match is still live.
- Email/password, phone, or anonymous auth. Google is the only sign-in.
- A user promoting their own role, or a moderator promoting anyone to admin.
- In-app dark-mode switching. Dark tokens exist in CSS and are not wired to a control.
- Firebase Cloud Functions. Push and the clock run as Vercel edge routes. The kickoff cron runs on a Cloudflare Worker.
- Hosting the React app on Firebase Hosting. That host only redirects to Vercel.
- Caching `/api/time`. The match clock must read a fresh server time.
- Putting `CRON_SECRET` or the Firebase service account in any `VITE_` variable.
