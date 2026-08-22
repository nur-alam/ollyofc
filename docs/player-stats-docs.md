Stats are written only when a game is completed. Every trigger below re-syncs that one game and writes only what changed.

Finish game — the main one. Games, goals, and win/loss/draw land for everyone who played (finishGame → setGamePlayStatus).
Reopen a completed game back to active — contributions are removed until it's finished again.
Add a player to a finished game — pure add for that player.
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

To correct a finished match, reopen it, make the change, then finish it again. Each step re-syncs.
