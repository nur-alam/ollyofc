# Tournament feature plan

Status: planned, not built.

## Goal

Run an Ollyo FC tournament: 3–8 teams (usually 4) with fixed squads, a group
stage that produces a table, then semi-finals and a final between the top four.
Tournament matches are real matches — goals, assists, and win/loss/draw all feed
the existing career stats.

## Guiding decision: a fixture is a game

A tournament does **not** get its own match engine. A fixture is a document in
the existing `games` collection with a few extra fields pointing back at the
tournament.

Everything already built keeps working with no changes:

- live clock, kick-off, finish, reopen
- goals and assists, scorer and assist pickers
- the result board and the winning-team poster
- `syncGameStats`, so career stats update on Finish exactly as they do now
- `/games/:gameId` as the match page

The tournament layer only adds: who the two teams are, what stage the match
belongs to, and how results roll up into a table and a bracket.

The existing `GameTeamId` of `"a"` / `"b"` stays. A fixture maps
`a → homeTeamId` and `b → awayTeamId`. Because `game.teams.a.name` is written
from the tournament team at fixture creation, `getTeamName()` and everything
downstream of it works untouched.

---

## Database

### `tournaments/{tournamentId}`

```
name: string                  // "Ollyo FC Winter Cup"
season?: string               // "2026"
status: "draft" | "squads" | "group" | "knockout" | "completed" | "cancelled"
groupCount: number            // 1 or 2
teamCount: number             // 3..8
advancingCount: number        // 4 (into semis)
pointsWin: number             // 3
pointsDraw: number            // 1
matchDurationMinutes: number  // default for generated fixtures
location: string              // default for generated fixtures
startDate: Timestamp
endDate?: Timestamp
championTeamId?: string       // set when the final completes
notes?: string
createdBy: string
createdAt / updatedAt
```

`status` drives what the UI offers:


| status      | what admin can do                |
| ----------- | -------------------------------- |
| `draft`     | edit settings, add teams         |
| `squads`    | draft players into teams         |
| `group`     | generate and play group fixtures |
| `knockout`  | semis and final                  |
| `completed` | read-only, champion shown        |
| `cancelled` | read-only                        |


### `tournaments/{tournamentId}/teams/{teamId}`

```
name: string           // "Team Red"
shortName: string      // "RED", used on the table and poster
color: string          // hex, for badges
logoURL?: string
group: string          // "A" (always "A" when groupCount is 1)
seed?: number          // final group position, written when the group stage ends
createdAt / updatedAt
```

No standings fields here. See "Standings are computed" below.

### `tournaments/{tournamentId}/squad/{userId}`

One document per player, id is the user id — same shape as
`games/{id}/participants/{userId}`, for the same reasons: per-player security
rules, and a substitution is a single small write.

```
userId: string
teamId: string         // tournament team id
role: "player" | "captain"
addedBy: string
addedAt: Timestamp
```

Deliberately **no** copied `displayName` / `photoURL` / `position`. The squad is
already loaded app-wide through `useUserMap()`, so names and photos come from
the live user document and never go stale. This is the lesson from the
participants subcollection, where the copies drifted and the UI now prefers the
live user anyway.

### `games/{gameId}` — new optional fields

```
tournamentId?: string
tournamentStage?: "group" | "semi" | "final" | "third-place"
tournamentGroup?: string     // "A", group stage only
matchday?: number            // 1, 2, 3... group stage only
homeTeamId?: string          // tournament team -> game team "a"
awayTeamId?: string          // tournament team -> game team "b"
bracketSlot?: string         // "semi-1" | "semi-2" | "final" | "third-place"
```

A game with no `tournamentId` is a friendly and behaves exactly as today.

### Firestore indexes

- `games` where `tournamentId` == X, order by `date` — fixtures list
- `games` where `tournamentId` == X and `tournamentStage` == "group" — standings

---

## Standings are computed, not stored

Unlike player stats, the table needs **no sync engine and no stored counters**.

Everything the table needs — the score, the winner, and both team ids — is
already on the fixture document. No participant reads, no user reads. One query
for the tournament's fixtures gives you the whole table in a pure function:

```
buildStandings(teams, fixtures) -> StandingRow[]
```

A row is `played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference, points, form`. Only fixtures with `status === "completed"` count, so the table
updates the moment a match is finished and un-counts itself if a match is
reopened. That is the same "derive, never increment" rule that keeps player
totals honest.

Tiebreakers, in order: points → goal difference → goals for → head-to-head
result → fewest goals against → alphabetical. Head-to-head is resolvable from
the same fixture list.

If a leaderboard ever needs server-side ordering, standings can be denormalised
onto the team documents later using the same diff approach as `syncGameStats`.
Not needed for a club-sized tournament.

---

## Format and progression

### Group stage

With `groupCount: 1`, every team plays every other team once — a
double round-robin is a config flag if you want home and away. Fixtures are
generated in one batch by admin, using the circle method so each matchday has a
balanced set of games.

For 4 teams that is 3 matchdays of 2 games each, 6 fixtures total.

### Knockout

When every group fixture is completed, admin taps **Generate knockout**. Semis
are created from the final table:

- one group: `1st v 4th` (semi-1) and `2nd v 3rd` (semi-2)
- two groups: `A1 v B2` (semi-1) and `B1 v A2` (semi-2)

The final is created only once both semis are completed, so no placeholder
fixtures exist and no fixture ever has an unknown opponent. Optional third-place
match is created at the same time as the final.

Draws in a knockout fixture need a decider. Simplest option that fits the app:
admin records the shootout result as the final score. A dedicated penalties
field can come later.

When the final completes, `championTeamId` is written and the tournament moves
to `completed`.

### A note on 4 teams

With exactly 4 teams and top-4 advancing, every team reaches the semis, so the
group stage only decides seeding (who gets the easier semi). That is a normal
small-tournament format, but if you want the group stage to actually eliminate
someone, either run 5–8 teams or set `advancingCount: 2` and go straight to a
final.

---

## Squads and substitutions

Players are drafted once, into fixed squads. Staff can move a player between
teams between matches, which is the "both" model.

**Drafting.** During `squads` status, admin opens a draft screen listing the
squad from `useSquad()` and assigns each player to a team. Optionally reuse the
existing dealing animation from `buildTeams.ts` to auto-balance by position
across N teams — the current implementation only splits into two, so it needs a
generalised version that deals into `teamCount` buckets.

**Generating a fixture's participants.** When a fixture is created, its
`participants` subcollection is written from the two squads: every member of the
home team gets `teamId: "a"`, every member of the away team gets `teamId: "b"`.
That is why `syncGameStats` needs no changes — it reads participants and their
`teamId` exactly as it does for a friendly.

**Substituting.** Changing `squad/{userId}.teamId` affects fixtures generated
afterwards. For a fixture that already exists, the existing swap arrows in
`GameTeamsPanel` already move a player between `a` and `b`, and swaps are
allowed until the match is completed. So a late change is already possible with
no new UI.

**Player availability.** A squad member who cannot play a specific match is
removed from that fixture's participants with the existing remove control. They
keep their squad membership and return for the next fixture. Removal is blocked
once the match is completed, same as today.

---

## Player stats

No changes needed. A tournament fixture is a completed game with participants
carrying `teamId`, so on Finish `syncGameStats` writes games, goals, assists,
and win/loss/draw into `users/{id}.statGames[gameId]` like any friendly. Career
totals therefore include tournament matches automatically.

**Tournament-scoped stats** (golden boot, most assists, best record) are
computed from the fixtures alone. Every goal already carries `scorerId`,
`scorerName`, `assistId`, and `assistName`, so tallying the tournament's
fixtures gives top scorers and top assisters with zero extra reads. Do not build
a second stats store for this.

---

## Routes


| route                            | access | content                                                         |
| -------------------------------- | ------ | --------------------------------------------------------------- |
| `/tournaments`                   | public | list, with status badges                                        |
| `/tournaments/:id`               | public | overview: standings, fixtures by matchday, bracket, top scorers |
| `/tournaments/:id/teams/:teamId` | public | squad, record, fixtures                                         |
| `/games/:gameId`                 | public | unchanged, plus a banner linking back to the tournament         |


Public like `/squad` and `/player/:playerId`, since nothing here needs auth to
read.

---

## Changes to existing code

Small and mostly additive.

`**src/types/game.ts**` — add the optional tournament fields to `Game`. Add
`isTournamentFixture(game)`.

`**game.service.ts**` — `mapGame` parses the new fields. New
`createTournamentFixture()` that writes a game plus its participants in one
batch.

`**GameDetailPage**` — a tournament banner with the stage and a link back. Team
build must be suppressed: `canEditTeams` becomes
`isStaff && game.status === "upcoming" && !game.tournamentId`, because squads
are fixed and re-dealing would destroy them. The self-join button is hidden on
tournament fixtures; staff can still add a player, which puts them on a side.

`**GamesPage**` — badge tournament fixtures, and optionally filter them out of
the friendlies list so the two do not get confused.

**Toss** — keep it. It is harmless and fun, and picks the kick-off side.

**Poster** — `winningTeamPoster.ts` already draws the winning side from the
game's teams and participants, so it works for a fixture as-is. A champion
poster for the final is a nice later addition.

---

## Firestore rules

```
match /tournaments/{tournamentId} {
  allow read: if true;
  allow create, update: if isAdmin();
  allow delete: if isAdmin();

  match /teams/{teamId} {
    allow read: if true;
    allow write: if isAdmin();
  }

  match /squad/{userId} {
    allow read: if true;
    allow write: if isStaff();
  }
}
```

Admin owns the tournament shape; moderators can manage squads and run matches.
Games already allow staff writes, and the stats rules added for `stats` /
`statGames` cover the career updates a fixture triggers.

---

## Build order

1. **Tournaments and teams.** Collection, admin create/edit, team CRUD,
  `/tournaments` and `/tournaments/:id` shells. Nothing plays yet.
2. **Squads.** Draft screen, `squad` subcollection, team page with roster.
  Generalise the position-balanced dealer to N teams.
3. **Group fixtures.** Round-robin generator, fixture creation with
  participants, fixtures list grouped by matchday.
4. **Standings.** `buildStandings` plus the table UI. This is where it starts
  feeling like a tournament.
5. **Knockout.** Generate semis from the table, generate the final from the
  semis, bracket view, champion.
6. **Tournament stats.** Top scorers, top assisters, team records, champion
  poster.

Steps 1–4 are the useful milestone; a group-stage-only tournament is already
worth shipping.

---

## Open questions

- Draws in semis and the final: record the shootout as the score, or add a
dedicated `penalties: { a, b }` field on the result?
- Can one player appear in two tournaments at once? Assumed yes, since squad
membership is scoped to a tournament.
- Should a completed tournament lock its fixtures against reopening, so the
champion and the table cannot silently change afterwards?

