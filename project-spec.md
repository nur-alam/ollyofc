Build a full-stack Office Football Team Management Web App for an office where employees regularly play football.

The main goal is to eliminate the time wasted every football session on manually selecting players, dividing teams, tracking goals, and maintaining player statistics.

1. Tech Stack

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
* Use Firebase Storage only if profile/player images are needed
* Use modern React patterns and clean TypeScript
* Use reusable components
* Keep the architecture scalable and maintainable

Do NOT create a traditional custom Node/Express backend unless absolutely necessary. Prefer Firebase services.

⸻

2. Core Concept

The application manages an office football community.

Each player has:

* Name
* Profile photo
* Player category
* Position
* Active/inactive status
* Statistics

Player categories:

* A — Very Good
* B — Average/Good
* C — Beginner/Weak
* GK — Goal Keeper

A player can have a preferred position such as:

* Goalkeeper
* Defender
* Midfielder
* Forward

The system should allow admins to manage players and football sessions.

⸻

3. User Roles

Implement three roles:

Admin

Admin can:

* Add players
* Edit players
* Delete/deactivate players
* Change player category
* Change player position
* Create football sessions
* Select players for a session
* Automatically generate balanced teams
* Manually adjust teams
* Record match results
* Record goals
* Record assists if desired
* View player statistics
* View session history
* View team history

Moderator

Moderator can:


Player/User

Players can:

* Login
* View their profile
* View upcoming football sessions
* Mark themselves as available/unavailable for a session
* View teams
* View match results
* View player statistics
* View previous sessions

⸻

4. Authentication

Use Firebase Authentication.

Initially support:

* Email/password authentication

Structure the application so Google authentication can be added later.

After login:

* Load the user’s profile from Firestore
* Determine whether the user is admin or normal player
* Protect admin routes

Do NOT rely only on frontend role checks.

Implement proper Firestore Security Rules so users cannot perform admin operations directly from the browser.

⸻

5. Player Management

Create an admin Player Management page.

Show players in a table/card layout.

Each player should have:

Name
Category
Position
Status
Matches
Goals
Assists
Wins
Losses

Admin should be able to:

* Add player
* Edit player
* Change category
* Change position
* Activate/deactivate player
* Search player
* Filter by category
* Filter by position

Example:

Nur         A    Forward       12 matches   18 goals  3 assists   4 wins   2 losses
Karim       B    Midfielder     10 matches   7 goals  2 assists   3 wins   1 losses
Hasan       C    Defender        8 matches   2 goals  1 assist    2 wins   0 losses
Sakib       GK   Goalkeeper     11 matches   0 goals  0 assists   11 wins  0 losses

⸻

6. Football Session

A football session represents one playing day.

Example:

Football Session
Date: August 15, 2026
Time: 6:00 PM
Location: Office Field
Players:
24

Admin can create a session.

Fields:

* Date
* Start time
* Location
* Number of teams
* Maximum players
* Notes

Players should be able to mark:

Available
Not Available
Maybe

The admin can see the confirmed players.

⸻

7. Automatic Team Generation

This is one of the most important features.

The system should automatically divide players into balanced teams based on player category.

Example:

24 players:

A:
Rahim
Karim
Hasan
Siam
B:
Rafi
Nayeem
Sakib
Tuhin
...
C:
...
GK:
Jamal
Rony

If there are 4 teams, the algorithm should try to distribute players fairly.

For example:

Team Red
A: 1
B: 3
C: 2
GK: 1
Team Blue
A: 1
B: 3
C: 2
GK: 1
Team Green
A: 1
B: 3
C: 2
GK: 1
Team Yellow
A: 1
B: 3
C: 2
GK: 1

The algorithm should consider:

1. Player category
2. Goalkeeper availability
3. Number of players per team
4. Player positions
5. Overall team strength
6. Avoid putting too many strong players in one team

Assign a numerical strength score:

A  = 3
B  = 2
C  = 1
GK = based on GK strength/category

Then calculate total team strength and minimize the difference between teams.

For example:

Team A strength: 15
Team B strength: 16
Team C strength: 15
Team D strength: 16

This is preferable to:

Team A: 20
Team B: 12
Team C: 21
Team D: 9

The algorithm should be deterministic enough to produce balanced results but also provide a “Shuffle Teams” button to generate another valid distribution.
Admin should be able to add, move players between teams.
Admin should be able to lock teams to prevent manual changes.

Team can be build manually as well.
Two team can be selected that coming date these two team will play a match. That will be shown in the upcoming match list. Upcoming closest match latest one match will be shown also in the main page publicly.

Example:

⸻

8. Team Generation UI

Create a beautiful team generation interface.

Before generating:

Players: 24
Teams: 4
[ Generate Teams ]

After generation:

┌──────────────────┐
│ Team Red         │
│ Strength: 15     │
├──────────────────┤
│ Rahim       A    │
│ Karim       B    │
│ Hasan       C    │
│ Jamal       GK   │
└──────────────────┘
┌──────────────────┐
│ Team Blue        │
│ Strength: 16     │
├──────────────────┤
│ ...
└──────────────────┘

Show:

* Team strength
* Number of players
* A/B/C/GK distribution
* Position distribution

Buttons:

Generate Teams
Shuffle
Regenerate
Lock Team
Save Teams

⸻

9. Manual Team Adjustment

Automatic generation should not prevent manual changes.

Admin should be able to move a player:

Team Red → Team Blue

After moving a player, recalculate:

* Team strength
* Category distribution
* Position distribution

Use drag-and-drop if practical.

⸻

10. Match Management

After teams are created, admin can start a match.

Example:

Team Red     3 - 2     Team Blue

Admin can record:

* Goals
* Goal scorer
* Assist
* Match winner
* Draw
* Match duration

Goal recording UI:

Goal #1
Team: Red
Scorer: Rahim
Assist: Karim
[ Add Goal ]

After the match:

Red 3 - 2 Blue
Goals:
Rahim - 2
Karim - 1
Hasan - 2

⸻

Half Time should be shown in the middle of match. just divided total time in half. match time duration can be configurable. by default, it should be 90 minutes.
Only logged in user can record goals. then admin/moderator can confirm the goals. if denied, the goal should be removed.
anyone logged in user can click start game button to start the match. match ended after the time duration.

⸻

11. Player Statistics

Maintain lifetime statistics.

Each player should have:

Matches Played
Goals
Assists
Wins
Draws
Losses
Win Rate
Goals Per Match

Also keep session-level statistics.

Example:

Rahim
Matches: 20
Goals: 25
Assists: 12
Wins: 13
Draws: 3
Losses: 4
Goals / Match: 1.25
Win Rate: 65%

Do not store derived statistics unnecessarily if they can safely be calculated from match/session data.

Prefer keeping the actual match events as the source of truth.

⸻

12. Leaderboard

Create a leaderboard page. First priority is goals. then assists. then wins.

Tabs:

Goals
Assists
Wins
Win Rate
Matches

Example:

Rank   Player       Goals
1      Rahim        25
2      Karim        19
3      Hasan        15
4      Rafi         12

Add filters:

All Time
This Year
This Month

⸻

13. Dashboard

Create an admin dashboard.

Show:

Total Players
Active Players
Upcoming Session
Players Available
Total Matches
Total Goals

Also show:

Upcoming Session

Saturday, 15 August
24 players confirmed
[ Generate Teams ]

Top Scorers

Show top 5 players.

Recent Matches

Show the latest matches and results.

⸻

14. Session History

Create a history page.

Example:

August 10, 2026
24 Players
4 Teams
Red 4 - 2 Blue
Green 3 - 3 Yellow
View Details

Clicking a session should show:

* Players
* Teams
* Team strength
* Match results
* Goal scorers
* Assists

⸻

15. Firestore Database Design

Use a clean Firestore structure.

Suggested structure:

users/{userId}
players/{playerId}
sessions/{sessionId}
sessions/{sessionId}/participants/{playerId}
sessions/{sessionId}/teams/{teamId}
sessions/{sessionId}/matches/{matchId}
matches/{matchId}
players/{playerId}/statistics/{...}

However, before implementing, think carefully about Firestore read/write efficiency.

Prefer keeping the session as the main aggregate where appropriate.

A possible session document:

interface FootballSession {
  id: string;
  date: Timestamp;
  startTime: string;
  location: string;
  status: 'upcoming' | 'active' | 'completed';
  numberOfTeams: number;
  createdBy: string;
  createdAt: Timestamp;
}

Player:

interface Player {
  id: string;
  userId?: string;
  name: string;
  photoURL?: string;
  category: 'A' | 'B' | 'C' | 'GK';
  position:
    | 'goalkeeper'
    | 'defender'
    | 'midfielder'
    | 'forward';
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

⸻

16. Firestore Security Rules

Security is important.

Implement rules so:

* Authenticated users can read appropriate player/session data
* Normal players cannot create/update/delete players
* Only admins can manage players
* Only admins can create/update sessions
* Players can update only their own availability
* Only admins can record match results
* Users cannot modify another user’s profile
* Users cannot change their own role

Use a secure admin-role strategy.

⸻

17. Responsive Design

The application must work well on:

* Desktop
* Tablet
* Mobile

The football field/session experience should be especially good on mobile because users may use phones while standing on the field.

Use:

* Cards
* Badges
* Dialogs
* Tabs
* Tables where appropriate
* Bottom navigation on mobile if useful

⸻

18. UI Design

Design should feel like a modern sports-management application.

Use:

* Clean dashboard
* Football/sports-inspired visual language
* Clear category badges
* Strong visual hierarchy
* Good empty states
* Loading states
* Error states
* Toast notifications
* Confirmation dialogs for destructive actions

Category badges:

A  → Excellent
B  → Good
C  → Beginner
GK → Goalkeeper

Avoid excessive animations.

⸻

19. Important Edge Cases

Handle:

Not enough players

Example:

Only 7 players available.
Cannot create 4 balanced teams.

Show a useful message.

No goalkeeper

Warn:

No goalkeeper is available.
Do you want to continue?

Uneven number of players

For example:

23 players / 4 teams

Distribute:

6
6
6
5

Too many goalkeepers

Try to distribute them intelligently.

Inactive players

Do not include inactive players in automatic team generation.

Player unavailable

Do not include unavailable players in that session.

⸻

20. Team Balance Algorithm

Create the team-generation algorithm as a separate pure TypeScript module.

For example:

src/features/team-generation/
    teamGenerator.ts
    teamScoring.ts
    types.ts
    utils.ts

The algorithm should be testable independently of React and Firebase.

Implement unit tests for:

* Equal number of teams
* Uneven player counts
* Category balancing
* Goalkeeper distribution
* Team strength calculation
* Position balancing
* Shuffle behavior

Do not put the algorithm directly inside React components.

⸻

21. Application Architecture

Use feature-based architecture.

Example:

src/
  app/
    router.tsx
    providers.tsx
  components/
    ui/
  features/
    auth/
    players/
    sessions/
    teams/
    matches/
    statistics/
    leaderboard/
    dashboard/
  lib/
    firebase/
    utils/
  stores/
  types/
  hooks/
  pages/

Keep Firebase logic separated from UI.

For example:

features/players/
    player.service.ts
    player.types.ts
    player.hooks.ts
    components/
    pages/

Do not put Firestore queries directly everywhere in components.

⸻

22. Firebase Configuration

Create a clean Firebase initialization layer.

Use environment variables:

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

Never hardcode Firebase configuration values in source code.

⸻

23. Development Approach

Build this incrementally.

First:

1. Initialize React + TypeScript + Vite
2. Configure Tailwind
3. Configure shadcn/ui
4. Configure Firebase
5. Implement authentication
6. Implement user roles
7. Implement player management
8. Implement football sessions
9. Implement player availability
10. Implement team-generation algorithm
11. Implement team-generation UI
12. Implement manual team adjustment
13. Implement match management
14. Implement statistics
15. Implement leaderboard
16. Implement dashboard
17. Implement session history
18. Implement responsive/mobile UI
19. Implement Firestore security rules
20. Add tests
21. Optimize Firestore reads/writes
22. Prepare Firebase Hosting deployment

Do not attempt to implement everything in one giant component.

⸻

24. Important Development Rule

Before writing a large amount of code:

1. Analyze the requirements.
2. Propose the database schema.
3. Propose the application architecture.
4. Explain the team-generation algorithm.
5. Create a development plan.
6. Then implement step-by-step.

For each major feature:

* Explain what you are implementing
* Create the necessary files
* Keep existing functionality working
* Avoid unnecessary refactoring
* Use TypeScript strictly
* Avoid any
* Add proper error handling
* Add loading states
* Add empty states

⸻

25. First Task

Do NOT immediately build the entire application.

Start with Phase 1 only:

Phase 1 — Project Foundation

Implement:

* React + TypeScript + Vite setup
* Tailwind
* shadcn/ui
* Firebase configuration
* Firebase Authentication
* Application routing
* Login page
* Basic protected route
* User model
* Admin/player role handling
* Basic application layout
* Sidebar/navigation
* Dashboard placeholder

After completing Phase 1, explain:

1. What files were created
2. Architecture decisions
3. Firebase setup required from my side
4. How to run the project
5. What will be implemented in Phase 2

Then STOP and wait for my instruction before implementing Phase 2.

Do not skip ahead.