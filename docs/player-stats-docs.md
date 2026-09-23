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
Joining, leaving, swapping, or building teams on an upcoming or live game
Kick-off
Running the same sync twice with nothing changed

Not reachable on a completed game, so these can never move career totals directly:

Swap players between teams (canSwapGameTeams blocks completed)
Remove a player (canRemoveGamePlayers blocks completed)
Add or remove a goal (needs status active)
Build, rebuild, or clear teams (canEdit is upcoming only)

To correct a finished match’s score, reopen it, make the change, then finish it again. Each step re-syncs. Award titles and players can be edited on a completed game without reopening.

## Points

Career totals live on `users/{id}.stats`: `games`, `goals`, `assists`, `wins`, `losses`, `draws`, and `awards` (a count map, not one number). The award total is the sum of that map, MVP included (`getAwardTotal`). Win rate is not stored. It is `wins / games`, and `0` when `games` is `0`.

After each stats write, set `stats.points` from those updated totals:

`points = (goals × 3) + (assists × 1.7) + (awardTotal × 2)`

Compute it in tenths so `1.7` stays exact: `(goals × 30 + assists × 17 + awardTotal × 20) / 10`. Store that number (for example `25.8`). Format to one decimal only in the UI.

Example: 5 goals, 4 assists, 2 awards → `15 + 6.8 + 4 = 25.8`.

Points are not a separate match contribution. Recompute them from the player’s new career totals on every sync that already changes `stats`: finish, reopen, add a player to a finished game, edit awards, delete, and Dashboard rebuild. A second sync with nothing changed leaves points unchanged.

## Leaderboard

Sort in `compareLeaderboard`:

1. `stats.points` descending
2. Award total descending
3. Win rate descending (`wins / games`)

Players still level on all three share a rank (`1, 2, 2, 4`). Name order is only so the list stays stable. It is not a ranking key. Only players with `stats.games > 0` appear.

Columns: rank, player name, goals, assists, awards (the total), win rate, total points. The page subtitle says the board is ranked by points, then awards, then win rate.
