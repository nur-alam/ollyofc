# Ollyo FC — MVP Product Specification

Build a full-stack Office Football Team Management Web App for an office where employees regularly play football.

The main goal is to eliminate the time wasted every football session on manually selecting players, dividing teams, tracking goals, and maintaining player statistics.

---

## 1. MVP Scope vs Future Scope

### In MVP (implement now)

**Plan a Game** — a single football match between **two balanced teams**.

The MVP covers:

* Player management
* Plan a Game (single match setup)
* Player availability for a game
* Automatic generation of **2 balanced teams** based on category and position
* Manual team adjustment
* Live match management (goals, assists, timer, half-time)
* Player statistics and leaderboard
* Dashboard and game history

### Out of MVP (do NOT implement now)

**Create Tournament** — a future feature for:

* Multiple teams (more than 2)
* Group stages
* Knockout rounds
* Fixtures / round-robin scheduling
* Tournament standings

The Firestore data model **must be designed now** so tournaments can be added later without breaking existing single-game data.

---

## 2. Tech Stack

Use:

* Frontend: React + TypeScript
* Build tool: Vite
* Styling: Tailwind CSS
* UI components: shadcn/ui
* State management: Zustand
* Backend: Firebase
* Authentication: Firebase Authentication
* Database: Cloud Firestore
* Hosting: Firebase Hosting
* Firebase Storage only if profile/player images are needed
* Modern React patterns and clean TypeScript
* Reusable components
* Scalable, maintainable architecture

Do NOT create a traditional custom Node/Express backend unless absolutely necessary. Prefer Firebase services.

---

## 3. Core Concept

The application manages an office football community.

Each player has:

* Name
* Profile photo
* Player category
* Position
* Active/inactive status
* Statistics (derived from match events)

### Player categories

| Code | Meaning        |
|------|----------------|
| A    | Very Good      |
| B    | Average/Good   |
| C    | Beginner/Weak  |
| GK   | Goal Keeper    |

### Player positions

* Goalkeeper
* Defender
* Midfielder
* Forward

---

## 4. User Roles

Implement three roles: **Admin**, **Moderator**, and **User**.

Roles are stored in Firestore (`users/{userId}.role`). Users cannot change their own role.

### Admin

Admin can do everything, including **delete** operations.

* Manage players (add, edit, delete/deactivate)
* Change player category and position
* Plan a Game (create, edit, delete)
* Select participants and generate teams
* Manually adjust teams
* Start/end matches
* Confirm or deny pending goals
* View all statistics, dashboard, and history

### Moderator

Moderator can **create and update** almost everything, but **cannot delete**.

Moderator can:

* Add and edit players
* Activate/deactivate players (soft status change, not hard delete)
* Plan a Game (create and edit)
* Select participants and generate teams
* Manually adjust teams
* Start/end matches
* Insert individual goals, team goals, assists, and other match events
* Confirm or deny pending goals submitted by users
* View statistics, dashboard, and history

Moderator cannot:

* Hard-delete players
* Delete games, teams, match events, or users
* Change user roles
* Delete tournament-related records (future)

### User

Users can:

* Login
* View their profile
* View upcoming games
* Mark themselves available / unavailable / maybe for a game
* View generated teams
* View match results
* Submit goal events during a live match (pending admin/moderator confirmation)
* Start a match (any logged-in user can press Start Game)
* View player statistics and game history

Users cannot:

* Manage other players
* Create or delete games
* Confirm/deny goals (unless they are admin/moderator)
* Change roles

---

## 5. Authentication

Use Firebase Authentication.

Support:

* Google authentication (already in project)
* Email/password authentication (add when needed)

Structure the app so additional providers can be added later.

After login:

* Load the user's profile from Firestore
* Determine role: `admin` | `moderator` | `user`
* Protect routes based on role

Do NOT rely only on frontend role checks.

Implement Firestore Security Rules so users cannot perform admin/moderator-only operations directly from the browser.

---

## 6. Player Management

Create a Player Management page (admin and moderator).

Show players in a table/card layout.

Each player row shows:

* Name
* Category
* Position
* Status (active/inactive)
* Matches
* Goals
* Assists
* Wins
* Losses

### Permissions

| Action              | Admin | Moderator | User |
|---------------------|-------|-----------|------|
| Add player          | Yes   | Yes       | No   |
| Edit player         | Yes   | Yes       | No   |
| Delete player       | Yes   | No        | No   |
| Deactivate player   | Yes   | Yes       | No   |
| Search/filter       | Yes   | Yes       | No   |

Example:

```
Nur     A   Forward      12 matches   18 goals   3 assists   4 wins   2 losses
Karim   B   Midfielder   10 matches    7 goals   2 assists   3 wins   1 loss
Hasan   C   Defender      8 matches    2 goals   1 assist    2 wins   0 losses
Sakib   GK  Goalkeeper   11 matches    0 goals   0 assists  11 wins   0 losses
```

---

## 7. Plan a Game (Single Match)

A **Game** is the core MVP unit. It is NOT a tournament.

One game = one playing date + one match between **exactly 2 teams**.

### Example

```
Plan a Game
Date: August 15, 2026
Time: 6:00 PM
Location: Office Field
Players confirmed: 14
Status: Upcoming
```

### Game fields

* Date
* Start time
* Location
* Maximum players (optional cap)
* Match duration (default: 90 minutes)
* Notes
* Status: `draft` | `upcoming` | `active` | `completed` | `cancelled`

### Player availability

For each game, players mark:

* Available
* Not Available
* Maybe

Admin/moderator see the confirmed player pool. Only **available** (and optionally **maybe**, configurable) players are included in team generation.

Inactive players are never included automatically.

---

## 8. Team Generation (MVP: 2 Teams Only)

This is one of the most important MVP features.

For each game, the system generates **exactly 2 balanced teams** from the available player pool.

### Inputs

* Available players for the game
* Each player's category (A, B, C, GK)
* Each player's position

### Goals of the algorithm

1. Balance **category strength** across both teams
2. Balance **positions** (defenders, midfielders, forwards, goalkeepers) where possible
3. Keep team sizes as equal as possible (e.g. 7 vs 7, or 8 vs 7 if odd total)
4. Minimize total strength difference between the two teams

### Strength scoring

| Category | Score |
|----------|-------|
| A        | 3     |
| B        | 2     |
| C        | 1     |
| GK       | Based on GK skill/category |

Example target:

```
Team Red    strength: 15
Team Blue   strength: 16
```

This is preferable to:

```
Team Red    strength: 20
Team Blue   strength: 11
```

### Algorithm requirements

* Lives in a pure TypeScript module (not inside React components)
* Testable independently of Firebase
* Provides **Generate Teams** and **Shuffle** actions
* Supports manual drag-and-drop adjustment after generation
* Recalculates strength, category distribution, and position distribution after manual changes
* Supports **Lock Team** to prevent accidental edits

### Example output

```
Players: 14        Teams: 2

┌──────────────────┐     ┌──────────────────┐
│ Team Red         │     │ Team Blue        │
│ Strength: 15     │     │ Strength: 16     │
│ A:2 B:3 C:1 GK:1 │     │ A:2 B:3 C:2 GK:1 │
├──────────────────┤     ├──────────────────┤
│ Rahim       A    │     │ Karim       A    │
│ Rafi        B    │     │ Nayeem      B    │
│ Hasan       C    │     │ Sakib       B    │
│ Jamal       GK   │     │ Tuhin       C    │
│ ...              │     │ Rony        GK   │
└──────────────────┘     └──────────────────┘

[ Generate Teams ]  [ Shuffle ]  [ Lock Teams ]  [ Save Teams ]
```

---

## 9. Manual Team Adjustment

Automatic generation must not block manual changes.

Admin/moderator can move a player:

```
Team Red → Team Blue
```

After each move, recalculate:

* Team strength
* Category distribution
* Position distribution

Use drag-and-drop if practical.

---

## 10. Match Management

After teams are saved, the game can go live.

### Match flow

1. Any logged-in user can press **Start Game**
2. Match timer runs for the configured duration (default 90 minutes)
3. **Half-time** is shown at the midpoint (duration / 2)
4. Match ends automatically when time expires (or admin/moderator ends early)

### Score example

```
Team Red     3 - 2     Team Blue
```

### Goal recording

Any logged-in user can submit a goal event. Admin/moderator must **confirm** or **deny** it.

If denied, the goal is removed.

Moderator and admin can also insert goals directly (including team goals if needed).

Goal event fields:

* Team
* Scorer (player)
* Assist (optional)
* Minute (optional)
* Status: `pending` | `confirmed` | `denied`
* Recorded by (userId)

Example UI:

```
Goal #1
Team: Red
Scorer: Rahim
Assist: Karim
[ Submit Goal ]          (User)

[ Confirm ]  [ Deny ]    (Admin / Moderator)
```

After match:

```
Red 3 - 2 Blue

Goals:
Rahim - 2
Karim - 1
Hasan - 2 (Blue)
```

---

## 11. Player Statistics

Maintain lifetime statistics derived from confirmed match events.

Each player:

* Matches Played
* Goals
* Assists
* Wins
* Draws
* Losses
* Win Rate (calculated)
* Goals Per Match (calculated)

Do not store derived stats if they can be safely calculated from match event data.

**Match events are the source of truth.**

---

## 12. Leaderboard

Leaderboard page with tabs:

* Goals (primary)
* Assists
* Wins
* Win Rate
* Matches

Filters:

* All Time
* This Year
* This Month

Example:

```
Rank   Player    Goals
1      Rahim     25
2      Karim     19
3      Hasan     15
```

---

## 13. Dashboard

### Admin / Moderator dashboard

* Total Players
* Active Players
* Upcoming Game
* Players Available (for next game)
* Total Matches
* Total Goals
* Top 5 Scorers
* Recent Matches

### Public / User home

Show the **next upcoming game** publicly:

```
Saturday, 15 August — 6:00 PM
Office Field
14 players confirmed
Team Red vs Team Blue
```

---

## 14. Game History

History page for completed games.

Example:

```
August 10, 2026
14 Players
Team Red 4 - 2 Team Blue
View Details
```

Detail view shows:

* Participants and availability
* Both teams and strength breakdown
* Match result
* Goal scorers and assists
* Match duration and timeline

---

## 15. Firestore Database Design

Design for **single games now** and **tournaments later** without a breaking migration.

### Design principles

1. Use **`games/{gameId}`** as the top-level collection for Plan a Game (MVP)
2. Use a separate **`tournaments/{tournamentId}`** collection for future multi-team competition
3. Keep goal records as append-only source of truth for stats
4. Design tournament fixtures so they can reference a `gameId` later without migrating MVP data

### Collections

```
users/{userId}
players/{playerId}
games/{gameId}
games/{gameId}/participants/{playerId}
games/{gameId}/teams/{teamId}
games/{gameId}/matches/{matchId}        ← MVP: one match per game
games/{gameId}/matches/{matchId}/goals/{goalId}

tournaments/{tournamentId}                  ← FUTURE ONLY (placeholder schema)
tournaments/{tournamentId}/fixtures/{fixtureId}   ← FUTURE ONLY
tournaments/{tournamentId}/standings/{teamId}     ← FUTURE ONLY
```

For MVP, use the **`games`** collection only. Do not build tournament UI or flows yet. Tournament fixtures in the future may point to documents under `games/{gameId}` when a fixture is a single match.

### TypeScript interfaces

```typescript
type UserRole = 'admin' | 'moderator' | 'user';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  playerId?: string;          // linked player record, if any
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Player {
  id: string;
  userId?: string;
  name: string;
  photoURL?: string;
  category: 'A' | 'B' | 'C' | 'GK';
  position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type GameStatus =
  | 'draft'
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'cancelled';

interface Game {
  id: string;
  title?: string;
  date: Timestamp;
  startTime: string;
  location: string;
  status: GameStatus;
  maxPlayers?: number;
  matchDurationMinutes: number;           // default 90
  notes?: string;
  teamCount: 2;                           // MVP fixed at 2
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface GameParticipant {
  playerId: string;
  availability: 'available' | 'unavailable' | 'maybe';
  teamId?: string;                        // assigned after team generation
  updatedAt: Timestamp;
}

interface Team {
  id: string;
  name: string;                           // e.g. "Team Red"
  color?: string;
  playerIds: string[];
  strengthScore: number;
  isLocked: boolean;
  categoryBreakdown: { A: number; B: number; C: number; GK: number };
  positionBreakdown: {
    goalkeeper: number;
    defender: number;
    midfielder: number;
    forward: number;
  };
}

interface Match {
  id: string;
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: 'scheduled' | 'live' | 'completed';
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  homeScore: number;
  awayScore: number;
  durationMinutes: number;
}

type GoalStatus = 'pending' | 'confirmed' | 'denied';

interface GoalEvent {
  id: string;
  matchId: string;
  teamId: string;
  scorerPlayerId?: string;
  assistPlayerId?: string;
  isTeamGoal: boolean;
  minute?: number;
  status: GoalStatus;
  recordedBy: string;
  reviewedBy?: string;
  createdAt: Timestamp;
}

// FUTURE — do not implement in MVP
interface Tournament {
  id: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  format: 'round_robin' | 'knockout' | 'group_knockout';
  teamIds: string[];
  status: GameStatus;
  createdBy: string;
}
```

---

## 16. Firestore Security Rules

Security is critical. Enforce roles in Firestore rules, not only in the UI.

### Read access

* Authenticated users can read players, games, teams, matches, and confirmed goals
* Pending goals visible to admins/moderators and the user who submitted them

### Write access summary

| Resource                    | Admin | Moderator | User              |
|----------------------------|-------|-----------|-------------------|
| players create/update      | Yes   | Yes       | No                |
| players delete               | Yes   | No        | No                |
| games create/update        | Yes   | Yes       | No                |
| games delete               | Yes   | No        | No                |
| own availability           | Yes   | Yes       | Own record only   |
| teams create/update        | Yes   | Yes       | No                |
| teams delete               | Yes   | No        | No                |
| start match                | Yes   | Yes       | Yes               |
| submit goal (pending)      | Yes   | Yes       | Yes               |
| confirm/deny goal          | Yes   | Yes       | No                |
| insert goal directly       | Yes   | Yes       | No                |
| change any user role       | Yes   | No        | No                |
| change own role            | No    | No        | No                |

Use custom claims or Firestore `users.role` with rules helper functions such as `isAdmin()`, `isModerator()`, `isStaff()` (admin or moderator).

---

## 17. Edge Cases (MVP)

Handle clearly in UI and algorithm:

### Not enough players

```
Only 5 players available.
Cannot create 2 balanced teams.
```

Minimum recommended: enough players for 2 teams (e.g. at least 4–6 depending on rules).

### Odd player count

Example: 13 players → Team Red 7, Team Blue 6

### No goalkeeper

Warn before generating:

```
No goalkeeper is available.
Do you want to continue?
```

### Inactive or unavailable players

* Inactive players: excluded from all generation
* Unavailable players: excluded from that game's pool

### Pending goals at match end

Prompt admin/moderator to confirm or deny remaining pending goals before marking game completed.

---

## 18. Team Balance Algorithm

Location:

```
src/features/team-generation/
  teamGenerator.ts
  teamScoring.ts
  types.ts
  utils.ts
```

MVP constraints:

* Always exactly **2 teams**
* Input: available players with category + position
* Output: two teams with balanced strength and position spread

Unit tests for:

* Even and odd player counts
* Category balancing across 2 teams
* Goalkeeper assignment (max 1 GK per team when possible)
* Position balancing
* Strength score calculation
* Shuffle produces valid alternative distributions

---

## 19. Application Architecture

Feature-based structure:

```
src/
  app/
    router.tsx
    providers.tsx
  components/
    ui/
    layout/
  features/
    auth/
    players/
    games/              ← Plan a Game (MVP)
    teams/
    matches/
    statistics/
    leaderboard/
    dashboard/
  lib/
    firebase/
  stores/
  types/
  hooks/
  pages/
```

Keep Firebase logic in services/hooks, not scattered in UI components.

Example:

```
features/games/
  game.service.ts
  game.types.ts
  game.hooks.ts
  components/
  pages/
```

---

## 20. UI / UX

* Modern sports-management look
* Works on desktop, tablet, and mobile
* Mobile-first for live match screen (users on the field)
* shadcn/ui: Cards, Badges, Dialogs, Tabs, Tables, Toasts
* Clear empty, loading, and error states
* Confirmation dialogs for destructive actions (admin only)

Category badges:

| Code | Label      |
|------|------------|
| A    | Excellent  |
| B    | Good       |
| C    | Beginner   |
| GK   | Goalkeeper |

Avoid excessive animations.

---

## 21. Firebase Configuration

Environment variables (never hardcode):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## 22. Development Phases

Build incrementally. Do not implement everything at once.

### Phase 1 — Project Foundation ✅ (mostly done)

* React + TypeScript + Vite
* Tailwind + shadcn/ui
* Firebase configuration
* Authentication (Google)
* Application routing
* Basic layout and header
* User model in Firestore
* Role handling (`admin` | `moderator` | `user`)
* Dashboard placeholder

### Phase 2 — Players & Roles

* Player CRUD (respect admin vs moderator delete rules)
* Player list with search/filter
* Link user account to player profile
* Firestore security rules for players

### Phase 3 — Plan a Game

* Create/edit game (`games/{gameId}`)
* Player availability
* Upcoming game on dashboard and public home

### Phase 4 — Team Generation

* 2-team balance algorithm + tests
* Team generation UI
* Manual adjustment + lock + save

### Phase 5 — Live Match

* Start/end match timer
* Half-time display
* Goal submission, confirm/deny flow
* Moderator direct goal insertion

### Phase 6 — Stats & History

* Statistics derived from confirmed goals
* Leaderboard
* Game history and detail pages

### Phase 7 — Polish & Deploy

* Responsive/mobile polish
* Firestore rules hardening
* Hosting deployment
* Performance review

### Future — Create Tournament (NOT in MVP)

* Tournament creation UI
* Multi-team fixtures
* Standings and knockout brackets
* Reuse `games` / `tournaments` schema designed above

---

## 23. Development Rules

Before large implementation blocks:

1. Analyze requirements
2. Confirm schema against this spec
3. Explain architecture and algorithm
4. Implement step-by-step
5. Keep existing functionality working

For each feature:

* Use TypeScript strictly
* Add error, loading, and empty states
* Avoid unnecessary refactoring
* Write tests for pure logic (especially team generation)

---

## 24. Current Instruction

**Do NOT build the full app in one pass.**

When starting implementation, follow the phase order above.

After completing each phase, report:

1. Files created or changed
2. Architecture decisions
3. Firebase setup needed from the product owner
4. How to run and test
5. What the next phase will cover

Then **STOP** and wait for instruction before the next phase.

**Do not implement Create Tournament in MVP.**
