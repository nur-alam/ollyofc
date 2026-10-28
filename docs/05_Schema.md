# Ollyo FC — Data schema

The database is Cloud Firestore, not a SQL engine. The tables below are the logical model: the document path is the primary key, a field that stores another document id is the foreign key, and `firestore.rules` is the row-level security policy. There is no `firestore.indexes.json`. Every query in the app is a single-field filter or a full collection listener, which Firestore indexes automatically.

Two databases share this shape and these rules: `ollyofcdev` for `pnpm dev`, and `(default)` for production.

Timestamps are Firestore `Timestamp` unless the name ends in `Ms`, which is a number of milliseconds. Career points are a number computed in tenths.

## Auth flow

1. The client signs in with Google through Firebase Auth.
2. On the production host `ollyofc.vercel.app`, `authDomain` is the site host. Vercel proxies `/__/auth/*` to Firebase Hosting so the installed PWA can complete the redirect.
3. `ensureUserProfile` writes `users/{auth.uid}` if it is missing: `role: "user"`, `isActive: true`, empty `position`.
4. The client listens to that document. `role` decides staff and admin UI.
5. Rules read the same document on every privileged write. A forged client role does nothing.
6. Sign-out clears the Zustand session. It does not delete the user document.
7. An admin changes `role` in Firestore (the squad role dialog writes that field). A user cannot change their own role. An admin cannot change their own role.

FCM tokens are a subcollection of the user, written only by that user after they opt in.

## users

Path: `users/{userId}`. Primary key `userId` is the Firebase Auth uid.

| Column | Type | Notes |
| --- | --- | --- |
| email | string | From Google. Required on create. |
| displayName | string | Required on create. |
| photoURL | string | Optional. Public Storage URL. |
| role | `admin` \| `moderator` \| `user` | Default `user`. |
| isActive | bool | Default true. |
| position | string | `goalkeeper`, `defender`, `midfielder`, `forward`, or empty. |
| isSeed | bool | Optional. Staff seed rows. |
| stats.games | number | Finished matches only. |
| stats.goals | number | Player goals. Own goals excluded. |
| stats.assists | number | |
| stats.wins | number | |
| stats.losses | number | |
| stats.draws | number | |
| stats.awards | map of string to number | Keys such as `mvp`, `mostSaves`, `bestDefender`, or a camelCase custom title. |
| stats.points | number | `(goals × 30 + assists × 17 + awardTotal × 20) / 10`. |
| statGames | map of gameId to contribution | Legacy. Older docs may still have it. A stats write may delete it. |
| createdAt | timestamp | |
| updatedAt | timestamp | |

RLS:

- Get and list: public.
- Create: the signed-in user may create only their own id with `role: "user"`. Staff may create another user with `role: "user"`. Admin may create.
- Update: admin may update anyone except their own role. Staff may update `displayName`, `email`, `position`, `isActive`, `photoURL`, `updatedAt`. Staff may update `stats`, `statGames`, and `updatedAt` when a game is finished or rebuilt. The owner may update their profile fields and cannot change `role`.
- Delete: admin only.

### users/{userId}/fcmTokens/{tokenId}

Primary key `tokenId` is the SHA-256 hex of the FCM token.

| Column | Type | Notes |
| --- | --- | --- |
| token | string | Raw FCM token. Do not log it. |
| userAgent | string | |
| updatedAt | timestamp | |

Foreign key: parent `userId`.

RLS: the owner may write. The owner or an admin may read. A collection-group rule lets an admin read every `fcmTokens` doc. Deployed push uses the service account, which bypasses these rules.

## games

Path: `games/{gameId}`. Primary key is the Firestore auto id.

| Column | Type | Notes |
| --- | --- | --- |
| title | string | Optional. |
| date | timestamp | Kickoff calendar day. Interpreted in Asia/Dhaka. |
| startTime | string | `HH:mm` Bangladesh local. |
| location | string | One of the four grounds. |
| mapUrl | string | Optional https Google Maps URL. |
| status | `draft` \| `upcoming` \| `active` \| `completed` \| `cancelled` | |
| maxPlayers | number | Optional cap. |
| matchDurationMinutes | number | |
| notes | string | Optional. |
| paymentInfo | string | Optional. Blank hides payment UI. |
| paymentVerifierId | string | Optional. Foreign key to `users.userId`. One verifier per game. |
| teamCount | number | Always `2`. |
| teams.a.name | string | |
| teams.b.name | string | |
| teams.generatedAt | timestamp | Optional. |
| teams.generatedBy | string | Foreign key to `users`. |
| teamBuild.startedAt | timestamp | Optional. |
| teamBuild.startedAtMs | number | |
| teamBuild.startedBy | string | Foreign key to `users`. |
| teamBuild.dealOrder | array of `{ userId, teamId }` | `teamId` is `a` or `b`. |
| toss.winner | `a` \| `b` | |
| toss.spins | number | |
| toss.startedAtMs | number | |
| toss.startedBy | string | Foreign key to `users`. |
| result.a | number | Goals for team A. |
| result.b | number | Goals for team B. |
| result.winner | `a` \| `b` \| `draw` | |
| result.goals | array of goal | See goal row below. |
| result.awards | array of award | See award row below. |
| result.updatedAt | timestamp | Optional. |
| result.updatedAtMs | number | |
| result.updatedBy | string | Foreign key to `users`. |
| startedAt | timestamp | Optional. Set at kickoff. |
| startedAtMs | number | Optional. Clock start. |
| kickoffReminderSentForMs | number | Optional. Dedupes the one-hour reminder. |
| createdBy | string | Foreign key to `users`. |
| createdAt | timestamp | |
| updatedAt | timestamp | |

Goal element (embedded, not its own collection):

| Column | Type | Notes |
| --- | --- | --- |
| id | string | Unique inside the game. |
| teamId | `a` \| `b` | Team the goal counts for. |
| kind | `player` \| `team` \| `own` | Missing on old rows. Infer `player` when `scorerId` is set, otherwise `team`. |
| scorerId | string | Optional. Foreign key to `users` or a guest id. |
| scorerName | string | Optional. |
| assistId | string | Optional. |
| assistName | string | Optional. |
| ownGoalById | string | Optional. Never a career goal. |
| ownGoalByName | string | Optional. |
| createdBy | string | Foreign key to `users`. |
| createdAtMs | number | |

Award element:

| Column | Type | Notes |
| --- | --- | --- |
| id | string | MVP uses a stable id. |
| kind | `mvp` \| `custom` | |
| title | string | `MVP`, `Most saves`, `Best defender`, or free text. |
| players | array of `{ playerId, playerName }` | |
| source | `auto` \| `manual` | Manual MVP is locked. |
| createdBy | string | |
| createdAtMs | number | |

RLS:

- Read: public.
- Create: staff.
- Update: any signed-in user, except `paymentVerifierId` may be set only by staff and only to an existing user id.
- Delete: admin. The client strips career stats before the delete.

### games/{gameId}/participants/{participantId}

Primary key `participantId` is the user uid, or `guest_` plus a generated id.

| Column | Type | Notes |
| --- | --- | --- |
| userId | string | Same as the document id. |
| kind | `user` \| `guest` | |
| displayName | string | |
| photoURL | string | Optional. |
| position | string | |
| teamId | `a` \| `b` | Optional until teams are dealt. |
| joinedBy | string | Foreign key to `users`. |
| joinedAt | timestamp | |
| transactionId | string | Optional. Length 5–120 when set by the player. |
| paymentStatus | `pending` \| `paid` \| `cancelled` | Optional. |
| paymentSubmittedAt | timestamp | Optional. |
| paid | bool | Legacy. `true` with no status still means paid. |
| paidAt | timestamp | Optional. |
| paidBy | string | Optional. Foreign key to the admin or verifier. |

Foreign keys: parent `gameId`, and `userId` when `kind` is `user`.

RLS:

- Read: public.
- Create: staff, or the signed-in user creating their own non-guest row.
- Update: the player may submit their own pending transaction id from unpaid or cancelled. Admin or `games.paymentVerifierId` may set `paid` or `cancelled` and must set `paidBy` to themselves and `paidAt`. Staff may update every other field, and cannot touch payment fields on that path.
- Delete: staff, or the participant themselves.

## visitorSessions

Path: `visitorSessions/{visitorId}`. Primary key is a UUID stored in the browser.

| Column | Type |
| --- | --- |
| visitorId | string |
| userId | string |
| displayName | string |
| photoURL | string |
| userAgent | string |
| device | string |
| isMobile | bool |
| isPwa | bool |
| ip | string |
| city | string |
| region | string |
| country | string |
| path | string |
| pageLabel | string |
| lastSeenDate | string `YYYY-MM-DD` |
| pageViews | number |
| online | bool |
| firstSeenAt | timestamp |
| lastSeenAt | timestamp |

RLS: anyone may create or update a doc whose id is a UUID and whose `visitorId` matches that id. Read and delete are admin only.

The live query is `where("online", "==", true)`.

## visitorDays

Path: `visitorDays/{day}`. Primary key `day` is `YYYY-MM-DD` in Bangladesh.

| Column | Type |
| --- | --- |
| date | string |
| uniqueVisitors | number |
| pageViews | number |
| signedIn | number |
| guests | number |
| updatedAt | timestamp |

RLS: anyone may create or update a day key of that shape. Read and delete are admin only.

### visitorDays/{day}/visitors/{visitorId}

Same columns as `visitorSessions`, plus `paths` (array of strings). Primary key is the same UUID. RLS matches the session: public create and update when the id is a UUID, admin read and delete.

## storage.objects (profile photos)

Path: `profile-photos/{userId}/{fileName}`.

| Constraint | Value |
| --- | --- |
| Read | Public |
| Write | Signed-in owner or staff |
| Size | Under 2 MB |
| Content type | `image/jpeg`, `image/png`, or `image/webp` |

This rule reads the user role from the `(default)` Firestore database.

## Indexes

No composite index is declared. Do not add a query that needs one unless `firestore.indexes.json` is committed in the same change.

## Invariants the schema must keep

- Guests have no `users` row and no `stats`.
- `stats` changes only when a game is completed, reopened, repaired by adding a player to a finished game, when awards change, when a game is deleted, or when an admin rebuilds.
- `stats.points` is recomputed from the new totals in the same write.
- An own goal never increments `stats.goals` for `ownGoalById`.
- `paymentVerifierId` on game A is not consulted for game B.
