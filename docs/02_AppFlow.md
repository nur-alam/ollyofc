# Ollyo FC — Application flow

Navigation uses React Router 7. The public header is on every page except the 404. Staff also get a left sidebar from the `md` breakpoint up. Phones use the header menu for Squad, Games, and Leaderboard, and the avatar menu for Profile, Dashboard, Visitors, and Notifications.

## Auth gates

| Gate | Behavior |
| --- | --- |
| Public | Render the page. |
| Signed in | `ProtectedRoute`. While auth is starting, show "Loading your session...". If there is no Firebase user, redirect to `/login` and remember `state.from`. |
| Staff | `RoleGuard` with `admin` and `moderator`. While the profile is loading, show "Checking permissions...". Anyone else goes to `/`. |
| Admin | `RoleGuard` with `admin` only. Same loading copy. Anyone else goes to `/`. |

`/login` sends an already signed-in user to `state.from`, or `/dashboard` if they opened login directly.

## Route map

| Route | Page | Who | Leaves |
| --- | --- | --- | --- |
| `/` | Home. Upcoming, else live, else last finished game. | Public | Game card links to `/games/:gameId`. Logo returns here. |
| `/login` | Google sign-in. | Public | Success goes to the saved path or `/dashboard`. "Back to home" goes to `/`. |
| `/squad` | Squad list. | Public | A row opens `/player/:playerId`. |
| `/leaderboard` | Points table. | Public | A row opens `/player/:playerId`. |
| `/player/:playerId` | One profile and career line. | Public | Back via header. |
| `/games` | All games, upcoming first. | Public | A non-cancelled row opens `/games/:gameId`. Cancelled rows do not navigate. |
| `/games/:gameId` | Match page: join, teams, toss, score, awards, payment. | Public read. Actions depend on role and status. | Header Games link uses `end` so this page is not the list highlight. |
| `/profile` | Own name, position, photo, push toggle. | Signed in | |
| `/dashboard` | Squad and match counts, rebuild stats. | Staff | Links to `/profile` and `/games`. |
| `/notification` | Broadcast, selected users, leaderboard note, optional game link. | Admin | |
| `/visitors` | Live visitors and a day history. | Admin | |
| `/home` | Redirect to `/`. | Public | |
| `*` | 404. "This page could not be found." Button "Back home" goes to `/`. | Public | |

The sidebar (staff, desktop) lists Dashboard, and for admins Visitors and Notifications, then Profile. The avatar menu repeats those entries plus Sign out.

## Screen states

### Home `/`

- Loading games: the list area waits on the games subscription.
- Has an upcoming game: show that card. Join and leave follow the game-detail rules.
- No upcoming game, a match is in the live window: show the live card. Copy: "Score updates here as they happen. No sign-in needed."
- Otherwise, if a finished game exists: show the last result.
- None of those: "No upcoming game yet. Staff can create the next match from Games."
- Joined list empty: "No one has joined yet."
- Signed out and the game is joinable: the join control reads "Sign in to join" and goes to `/login`.

### Login `/login`

- Firebase env missing: helper text tells the developer to copy `.env.example` to `.env`. The Google button stays disabled.
- Auth in progress: button label "Checking session..." and the button is disabled.
- Google error: the message from the auth store renders under the button in the error color.
- Success: navigate away. A brand-new profile is `role: "user"`.

### Squad `/squad`

- Filters: search, position (all or one of goalkeeper, defender, midfielder, forward), status (all, active, inactive).
- No rows after filters: "No players match your filters."
- Staff can add a player and edit name, email, position, active flag, and photo. Admin can assign a role and delete a user.
- Seed players, when shown, are marked `isSeed` and exist only as a staff tool.

### Leaderboard `/leaderboard`

- Loading: one table cell, "Loading leaderboard...".
- Ready: rows with `stats.games > 0` only. Sort is points, then award total, then win rate (`wins / games`). Ties share a rank (`1, 2, 2, 4`).
- Columns: rank, player, games, goals, assists, awards, win rate, points. Points render to one decimal.
- Info control explains the formula. It does not change data.
- Empty board: "Nobody has played a finished game yet."

### Player `/player/:playerId`

- Unknown id: heading "Player not found".
- Known id: photo, name, position, and career totals. Guests are not a route here. The id is a user id.

### Games `/games`

- Empty collection: "No games yet."
- Each row shows date, time, location, and a status badge derived from the clock (`upcoming`, `active`, `completed`) unless the stored status is `cancelled`.
- Staff: row menu can edit. Admin: row menu can delete. Delete asks for confirmation, then removes the game and strips career contributions first.
- Create opens `GameFormDialog`. Required pieces are date, start time, location (one of the four grounds), and duration. Map URL must be an http(s) Google Maps link or it is dropped. Payment instructions are optional. Blank payment instructions mean the game has no payment UI.

### Game `/games/:gameId`

Status stored on the document is `draft | upcoming | active | completed | cancelled`. The badge the list shows can say Live or Completed from the clock before staff tap the matching control.

Shared states:

- Missing id: "Game not found".
- Roster empty: "No one has joined yet."
- Signed out on an upcoming game: "Sign in to join this upcoming game." and a "Sign in to join" button to `/login`.
- Scoreboard with no goals: "No goals" on a side, and "Match draw. No goals scored." when the finished score is 0–0.

Actions by state:

| Action | upcoming | active | completed | cancelled |
| --- | --- | --- | --- | --- |
| Join (self) | Yes, until full | No | No | No |
| Leave (self) | Yes, until 60 minutes before kickoff | No | No | No |
| Staff add or remove a player | Yes | Yes | No | No |
| Staff edit guest name or position | Yes | Yes | Yes | No |
| Build, rebuild, clear teams, swap | Yes | Yes, swap until finish | No | No |
| Toss | Yes, 5 second animation | No | No | No |
| Kick off | Staff, sets `startedAtMs` | Already started | No | No |
| Record a goal | Only after the scheduled end if nobody kicked off | Yes | No | No |
| Finish | Staff, including when the clock has already ended | Staff | Already finished | No |
| Reopen to active | No | No | Admin | No |
| Edit match details | Staff | Staff | Staff | Staff |
| Delete | Admin | Admin | Admin | Admin |
| Awards | After a result exists. MVP stays auto until an admin locks it. | Same | Admin may edit awards without reopening. That re-syncs career awards. | No |
| Payment UI | Hidden until the match has ended | Hidden until the match has ended | Shown when `paymentInfo` is set | Hidden |
| Winning-team poster | After a winner exists | After a winner exists | Yes | No |

Goal kinds:

- Player goal: credits `scorerId` and optional `assistId`.
- Team goal: credits the team when the scorer is unknown. No career goal.
- Own goal: credits the opponent. `ownGoalById` is stored and never counted as that player's goal.

Payment buttons on a participant:

- Unpaid player: "Pay". Opens the transaction-id field. Length 5–120. Submit sets `paymentStatus: "pending"`.
- Pending: waiting copy. The player cannot set paid.
- Admin or that game’s `paymentVerifierId`: "Paid" or "Cancelled". They can mark paid even when the player never tapped Pay.
- Cancelled: the player may submit again.
- Guests do not get the pay control.

Map: a location name opens `GameMapDialog` with a Google Maps embed. A bad map URL is ignored at save time.

### Profile `/profile`

- Signed-out users never see it. They hit `/login`.
- Save name and position. Photo upload accepts jpeg, png, or webp under 2 MB.
- Push toggle: asks notification permission, stores an FCM token, or removes it. If the browser has no push, the control explains that instead of failing the rest of the form.

### Dashboard `/dashboard`

- Four counts: total players, active players, next game date or "None", played matches.
- Admin "Rebuild player stats" walks every game. Progress shows `done / count`. Success toast names the game count. Failure toast shows the error and does not claim the rebuild finished.
- Non-admin staff see the counts and the next-step links. They do not see rebuild.

### Notifications `/notification`

- Three sends: everyone opted in, a picked subset, and a leaderboard announcement.
- Optional game link must be a game path the field already validates.
- Empty audience: "No opted-in devices to notify."
- The page does not create the game. Game-created and game-joined pushes fire from those flows. If those calls fail, the game or the join stays saved and staff see an error toast.

### Visitors `/visitors`

- Live list empty: "Nobody is on the site right now." A visitor counts as live for 90 seconds after the last ping.
- Day list empty: "No visitors recorded for this day."
- Bots are not written. Reads are admin only.

### Not found

- Any unknown path: 404, "This page could not be found.", one button back to `/`.

## Global feedback

- Mutations use `react-hot-toast`. Success and failure are both toasts. A toast is not a substitute for keeping the saved document on screen.
- Firestore listeners keep games, squad, and visitors current. A listener error surfaces as the feature's error string, not a blank page.
- The match clock reads `/api/time` and corrects the local offset. It does not trust the device clock for kickoff or elapsed time.
