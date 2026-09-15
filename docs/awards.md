Match awards live on the game result as one list: `result.awards`. MVP is an award in that list (`kind: "mvp"`), then any extras staff added (most saves, best defender, custom titles).

They show on the game details page and on the last game result on the home page, in one **Match awards** card: MVP first, then the extras.

Anyone can see the card. Only staff (admin and moderator) can edit it, and only after the match has happened. Cancelled games cannot get awards.

## MVP

MVP starts automatic. It is ranked from the match’s player goals, then assists. Own goals and team goals do not count. The auto pick is written into `result.awards` as `{ kind: "mvp", source: "auto" }` whenever the result is saved.

How auto ranking works

1. Highest goal count wins.
2. If two or more players are tied on goals, highest assists among those players wins.
3. If they are still tied on assists as well, they all share the award. The card title becomes **MVPs**.

Examples: 2 goals beats 1 goal and 5 assists. Two players with 2 goals and 1 assist both get MVP. A 0–0 with no assists has no auto MVP.

The ranking updates as goals are added or removed, until staff lock it.

Staff can **Set MVP** or **Edit MVP** and pick one or more players from the joined list. Saving that selection sets `source: "manual"` on the MVP award. Later goals will not change it. The card shows a **Manual** badge.

**Use auto ranking** clears the lock. MVP goes back to goals, then assists.

A 0–0 (or any game with no scorer/assister) still lets staff pick an MVP by hand.

## Extra awards

These are always manual (`kind: "custom"`). They sit under MVP in the same card.

Staff **Add award**, pick a title, and pick one or more players. Presets are **Most saves** and **Best defender**. Any other title can be typed (best goalkeeper, and so on). More than one player can share an award, same as MVP.

Each extra award can be edited or removed later. Removing one does not touch MVP. Do not add a second MVP this way — use **Edit MVP**.

## Career stats

When a game is **completed**, each joined (non-guest) player’s user doc is updated under `stats.awards`:

```
stats.awards: {
  mvp: 2,
  mostSaves: 1,
  bestDefender: 1,
  bestGoalkeeper: 1
}
```

- `mvp` — times they were match MVP (shared MVP still counts 1 each)
- `mostSaves` / `bestDefender` — the two presets
- Custom titles become camelCase keys (`Best GK` → `bestGk`)

`stats.awards` totals are the sum of those keys (MVP included). Finish, reopen, rebuild stats, and editing awards on an already finished match all re-sync. Guests are not written.

## Where a match stores it

On the game document, under `result.awards` only:

- `{ id: "mvp", kind: "mvp", title: "MVP", source: "auto" | "manual", players: [...] }`
- `{ id, kind: "custom", title: "Best defender", source: "manual", players: [...] }`

Adding or removing a goal rewrites the scoreboard and refreshes auto MVP, and keeps extra awards. Renaming a guest also updates their name on any award they hold.
