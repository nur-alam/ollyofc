import { cn } from "@/lib/utils";
import { useNow } from "@/features/games/game.hooks";
import { GameTossCoin } from "@/features/games/components/GameTossCoin";
import {
  getGameScore,
  getPlayerGoalCounts,
  getTeamName,
  getWinnerLabel,
  hasMatchEnded,
  isTossFlipping,
  isTossLanded,
  shouldShowLiveToss,
  type Game,
  type GameGoal,
  type GameTeamId,
} from "@/types/game";

function TeamScore({
  name,
  score,
  isWinning,
  isTossWinner,
}: {
  name: string;
  score: number;
  isWinning: boolean;
  isTossWinner?: boolean;
}) {
  return (
    <div className="min-w-0 text-center">
      <p
        className={cn(
          "truncate text-sm font-medium",
          isTossWinner && "text-primary",
        )}
      >
        {name}
      </p>
      <p
        className={cn(
          "mt-1 text-4xl font-bold tabular-nums",
          isWinning && "text-primary",
        )}
      >
        {score}
      </p>
    </div>
  );
}

export function GameResultBoard({
  game,
  goals,
  onRemoveGoal,
  removingId,
}: {
  game: Game;
  goals?: GameGoal[];
  onRemoveGoal?: (goalId: string) => void;
  removingId?: string;
}) {
  const showToss = shouldShowLiveToss(game);
  const now = useNow(showToss ? 32 : 1000);
  const nowMs = now.getTime();
  const score = getGameScore(game);
  const resultGoals = goals ?? game.result?.goals ?? [];
  const winner = getWinnerLabel(game);
  const finished = hasMatchEnded(game);
  const tallies = getPlayerGoalCounts(resultGoals);
  const flipping = isTossFlipping(game.toss, now);
  const tossLanded = isTossLanded(game.toss, now);
  const goalsByTeam = (teamId: GameTeamId) =>
    resultGoals.filter((goal) => goal.teamId === teamId);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamScore
          name={getTeamName(game, "a")}
          score={score.a}
          isWinning={score.a > score.b}
          isTossWinner={showToss && tossLanded && game.toss?.winner === "a"}
        />
        {showToss && game.toss ? (
          <GameTossCoin toss={game.toss} nowMs={nowMs} />
        ) : (
          <p className="text-xl font-semibold text-muted-foreground">–</p>
        )}
        <TeamScore
          name={getTeamName(game, "b")}
          score={score.b}
          isWinning={score.b > score.a}
          isTossWinner={showToss && tossLanded && game.toss?.winner === "b"}
        />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {showToss && flipping
          ? "Tossing..."
          : showToss && tossLanded && game.toss
            ? `${getTeamName(game, game.toss.winner)} wins the toss and will kick off.`
            : score.a === 0 && score.b === 0
              ? finished
                ? "No goals were scored."
                : "No goals yet."
              : score.a === score.b
                ? finished
                  ? "The match ended in a draw."
                  : "Currently a draw."
                : finished
                  ? `${winner} won.`
                  : `${winner} currently winning.`}
      </p>

      {tallies.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">Goals by player</h3>
          <ul className="mt-2 divide-y rounded-lg border">
            {tallies.map((tally) => (
              <li
                key={tally.scorerId}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="truncate">{tally.scorerName}</span>
                <span className="tabular-nums text-muted-foreground">
                  {tally.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {resultGoals.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["a", "b"] as const).map((teamId) => (
            <div key={teamId}>
              <h3 className="text-sm font-medium">{getTeamName(game, teamId)}</h3>
              <ul className="mt-2 divide-y rounded-lg border">
                {goalsByTeam(teamId).length ? (
                  goalsByTeam(teamId).map((goal) => (
                    <li
                      key={goal.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="truncate">{goal.scorerName}</span>
                      {onRemoveGoal && (
                        <button
                          type="button"
                          className="text-xs text-destructive hover:underline disabled:opacity-50"
                          disabled={removingId === goal.id}
                          onClick={() => onRemoveGoal(goal.id)}
                        >
                          {removingId === goal.id ? "Removing..." : "Remove"}
                        </button>
                      )}
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    No goals
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
