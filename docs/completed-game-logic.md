status: "completed" in Firestore means the match was explicitly finished. It is not a Firestore lock. Admin and moderator are treated the same for scoring; they both count as staff.

What changes in the UI

Badge shows Completed.
Result heading becomes Final result (not Live result).
Elapsed timer and kick-off countdown stop.
Scoreboard stays visible, but as a final score.
It can appear as Last result on the home page.
Games list still opens the match and shows the score.
Blocked (admin and moderator)

Add a goal (addGameGoal only allows active).
Remove a goal (the remove controls are hidden).
Finish / toss / kick off.
Join or leave as a player.
Remove players from the roster.
Swap players between teams.
Rebuild teams (canEdit only while upcoming).
Live clock / “game is in play” actions.
Still allowed

View the match and the final board.
Admin only: Share result (if it is not a draw).
Staff: Edit date, time, location, notes from the games list.
Admin only: Delete the game.
Staff: still Add player on the game detail page (join is not blocked for completed).
Admin only: reopen the match back to active, which unblocks swaps, removals, and goal edits.