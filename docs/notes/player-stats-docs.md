Stats are written only when a game is completed. Every trigger below re-syncs that one game and writes only what changed.

Finish game — the main one. Games, goals, assists, win/loss/draw, and match awards (MVP, most saves, and so on) land for everyone who played (`finishGame` → `setGamePlayStatus`). Awards are stored on the user as `stats.awards: { mvp, mostSaves, bestDefender, ... }`.
Reopen a completed game back to active — contributions are removed until it's finished again.
Add a player to a finished game — pure add for that player.
Edit MVP or extra awards on a finished game — award counts are re-synced.
Delete a game — contributions stripped first, then the game is deleted.
Admin "Rebuild player stats" on Dashboard — re-syncs every game; used for backfill or repair.

Does not write anything:

Adding or removing goals during a live match (career totals wait for Finish; the match page still updates instantly)
Clock hitting 90:00 without Finish being tapped
Joining, leaving, swapping, marking played both sides, picking a match position, or building teams on an upcoming or live game
Kick-off
Running the same sync twice with nothing changed

Not reachable on a completed game, so these can never move career totals directly:

Swap players between teams (canSwapGameTeams blocks completed)
Mark played both sides (canSwapGameTeams blocks completed)
Pick a match position (canSetMatchPosition blocks completed)
Remove a player (canRemoveGamePlayers blocks completed)
Add or remove a goal (needs status active)
Build, rebuild, or clear teams (canEdit is upcoming only)

To correct a finished match’s score, reopen it, make the change, then finish it again. Each step re-syncs. Award titles and players can be edited on a completed game without reopening.

## Played both sides

A player marked `playedBoth` still counts as one game. Goals and assists follow that player, and an own goal still does not. Guests can be marked and still get no career stats.

When the match has a winner, that player gets a win. When the match is a draw, they get a draw. They do not get a loss for that match. Everyone who stayed on one team still gets a win, loss, or draw from that team.

## Match position

A player can be a midfielder in one match and a defender in the next, so scoring reads the position saved on the match (`games/{id}/participants/{uid}.position`). It never reads `users/{uid}.position`.

- While the game is `upcoming`, the match position follows the profile. `getMatchPosition` holds that rule for the UI.
- Staff can pick a position for that match from the player row menu (`setParticipantMatchPosition`). That sets `positionManual: true`, and the pick stops following the profile.
- When the game leaves `upcoming` (Start game, or an admin setting Active or Completed on a match nobody kicked off), `freezeMatchPositions` copies each profile position onto the participant in the same write as the status. Guests and manual picks are left alone. A profile with no position keeps what was saved at join.
- From then until finish, only staff change it. After finish it is locked. An admin reopens the match to correct it, and the next finish re-syncs.
- A player added to a finished match gets their profile position at that moment.

## Defender scoring

A goal scored as a defender is worth 4 points and an assist is worth 2. Every other position keeps 3 and 1.7.

The rule applies to a game stamped `scoringVersion` 2 or higher. `2` is written when a game with no version leaves `upcoming`. `3` is written when a game is created. A match that was already live or finished when this shipped has no stamp and can never get one, because reopening it goes to `active`, not `upcoming`. Reopen, finish again, award edits, and the Dashboard rebuild all recompute it with the old formula, so its points do not change. Do not backfill the stamp.

On a stamped game, `buildGameStatContributions` adds `defenderGoals` and `defenderAssists` to the contribution of a participant whose match position is `defender`. They equal that player's goals and assists in that match. The keys are left off when they are 0. They add into `stats.defenderGoals` and `stats.defenderAssists`. `stats.goals` and `stats.assists` still count every goal and assist, so goals per game do not change. Auto MVP stays goals, then assists on a game stamped `2`. A game created with `scoringVersion: 3` ranks MVP by these points.

A match that was scheduled before this shipped and is still `upcoming` gets the stamp when it kicks off or is finished.

## Points

Career totals live on `users/{id}.stats`: `games`, `goals`, `assists`, `defenderGoals`, `defenderAssists`, `wins`, `losses`, `draws`, and `awards` (a count map, not one number). The award total is the sum of that map, MVP included (`getAwardTotal`). Win rate is not stored. It is `wins / games`, and `0` when `games` is `0`.

After each stats write, set `stats.points` from those updated totals:

`points = (goals × 3) + (assists × 1.7) + (defenderGoals × 1) + (defenderAssists × 0.3) + (awardTotal × 2)`

`defenderGoals` is already inside `goals`, so the extra 1 makes that goal 4. `defenderAssists` is already inside `assists`, so the extra 0.3 makes that assist 2.

Compute it in tenths so `1.7` stays exact: `(goals × 30 + assists × 17 + defenderGoals × 10 + defenderAssists × 3 + awardTotal × 20) / 10`. Store that number (for example `25.8`). Format to one decimal only in the UI.

Example: 5 goals, 4 assists, 2 awards → `15 + 6.8 + 4 = 25.8`. If 2 of those goals and 1 of those assists were made as a defender → `25.8 + 2 + 0.3 = 28.1`.

Points are not a separate match contribution. Recompute them from the player’s new career totals on every sync that already changes `stats`: finish, reopen, add a player to a finished game, edit awards, delete, and Dashboard rebuild. A second sync with nothing changed leaves points unchanged.

## Leaderboard

Sort in `compareLeaderboard`:

1. `stats.points` descending
2. Award total descending
3. Win rate descending (`wins / games`)

Players still level on all three share a rank (`1, 2, 2, 4`). Name order is only so the list stays stable. It is not a ranking key. Only players with `stats.games > 0` appear.

Columns: rank, player name, goals, assists, awards (the total), win rate, total points. The page subtitle says the board is ranked by points, then awards, then win rate.
