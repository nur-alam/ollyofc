import type { ReactNode } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNow } from "@/features/games/game.hooks";
import { GameResultStatus } from "@/features/games/components/GameResultStatus";
import { GameTossCoin } from "@/features/games/components/GameTossCoin";
import { ScoreFireworks } from "@/features/games/components/ScoreFireworks";
import { useUserMap } from "@/features/players/player.hooks";
import {
  getGameScore,
  getOwnGoalTallies,
  getPlayerGoalCounts,
  getTeamGoalTallies,
  getTeamName,
  isTossLanded,
  shouldShowLiveToss,
  type Game,
  type GameGoal,
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
    <div className="flex justify-center">
      <div className="relative size-28">
        {isWinning ? (
          <div className="winner-ring absolute -inset-[3px] rounded-full" aria-hidden />
        ) : null}
        <div
          className={cn(
            "relative z-10 flex size-full flex-col items-center justify-center overflow-hidden rounded-full border bg-background px-2",
            isWinning && "border-transparent text-primary",
            !isWinning && isTossWinner && "border-primary text-primary",
          )}
        >
          {isWinning ? <ScoreFireworks /> : null}
          <p className="relative z-10 max-w-full truncate text-xs font-medium">{name}</p>
          <p className="relative z-10 text-4xl font-bold tabular-nums leading-none">{score}</p>
        </div>
      </div>
    </div>
  );
}

function ScorerLabel({
  name,
  photoURL,
  detail,
}: {
  name: string;
  photoURL?: string;
  detail?: ReactNode;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar size="sm">
        {photoURL ? <AvatarImage src={photoURL} alt={name} /> : null}
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{name}</span>
        {detail ? (
          <span className="truncate text-xs text-muted-foreground">{detail}</span>
        ) : null}
      </span>
    </span>
  );
}

function AssistLabel({ name, photoURL }: { name: string; photoURL?: string }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1 align-middle">
      <span className="shrink-0">Assist:</span>
      
      <Avatar size="default" className="size-4">
        {photoURL ? <AvatarImage src={photoURL} alt={name} /> : null}
        <AvatarFallback className="text-[0.5rem]">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </span>
  );
}

function RemoveGoalButton({
  goalId,
  removing,
  label,
  onRemoveGoal,
}: {
  goalId: string;
  removing: boolean;
  label: string;
  onRemoveGoal: (goalId: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      disabled={removing}
      onClick={() => onRemoveGoal(goalId)}
      aria-label={label}
      title={label}
    >
      {removing ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
    </Button>
  );
}

function GoalTallyRow({
  label,
  removeLabel,
  count,
  goalIds,
  removingId,
  onRemoveGoal,
}: {
  label: ReactNode;
  removeLabel: string;
  count: number;
  goalIds: string[];
  removingId?: string;
  onRemoveGoal?: (goalId: string) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      {label}
      <span className="flex shrink-0 items-center gap-2">
        <Badge variant="outline" className="tabular-nums">
          {count}
        </Badge>
        {onRemoveGoal && (
          <RemoveGoalButton
            // Removing takes the latest of the grouped goals, one tap per goal.
            goalId={goalIds[goalIds.length - 1]}
            removing={goalIds.some((id) => id === removingId)}
            label={removeLabel}
            onRemoveGoal={onRemoveGoal}
          />
        )}
      </span>
    </li>
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
  const usersById = useUserMap();
  const showToss = shouldShowLiveToss(game);
  const now = useNow(showToss ? 32 : 1000);
  const nowMs = now.getTime();
  const score = getGameScore(game);
  const resultGoals = goals ?? game.result?.goals ?? [];
  const tallies = getPlayerGoalCounts(resultGoals);
  // Index of the first cell on the final grid row (2 columns), so its row skips the divider.
  const lastTallyRowStart = Math.floor((tallies.length - 1) / 2) * 2;
  const tossLanded = isTossLanded(game.toss, now);
  const ownGoalTallies = getOwnGoalTallies(resultGoals);

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

      <GameResultStatus game={game} now={now} />

      {tallies.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">Goals by player</h3>
          <ul className="grid grid-cols-2 mt-2 rounded-lg border">
            {tallies.map((tally, index) => (
              <li
                key={tally.scorerId}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                  index < lastTallyRowStart && "border-b",
                )}
              >
                <ScorerLabel
                  name={tally.scorerName}
                  photoURL={usersById.get(tally.scorerId)?.photoURL}
                />
                <Badge variant="outline" className="tabular-nums">
                  {tally.count}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ownGoalTallies.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">Own goals</h3>
          <ul className="mt-2 divide-y rounded-lg border">
            {ownGoalTallies.map((tally) => {
              const detail = `${getTeamName(game, tally.concededBy)} · counts for ${getTeamName(game, tally.teamId)}`;

              return (
                <GoalTallyRow
                  key={tally.key}
                  label={
                    tally.playerId ? (
                      <ScorerLabel
                        name={tally.playerName || "Player"}
                        photoURL={usersById.get(tally.playerId)?.photoURL}
                        detail={detail}
                      />
                    ) : (
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">Unknown player</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {detail}
                        </span>
                      </span>
                    )
                  }
                  removeLabel={`Remove own goal by ${tally.playerName || "unknown player"}`}
                  count={tally.count}
                  goalIds={tally.goalIds}
                  removingId={removingId}
                  onRemoveGoal={onRemoveGoal}
                />
              );
            })}
          </ul>
        </div>
      )}

      {resultGoals.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["a", "b"] as const).map((teamId) => {
            const teamTallies = getTeamGoalTallies(resultGoals, teamId);

            return (
              <div key={teamId}>
                <h3 className="text-sm font-medium">{getTeamName(game, teamId)}</h3>
                <ul className="mt-2 divide-y rounded-lg border">
                  {teamTallies.length ? (
                    teamTallies.map((tally) => (
                      <GoalTallyRow
                        key={tally.key}
                        label={
                          tally.scorerId ? (
                            <ScorerLabel
                              name={tally.scorerName || "Player"}
                              photoURL={usersById.get(tally.scorerId)?.photoURL}
                              detail={
                                tally.assistName ? (
                                  <AssistLabel
                                    name={tally.assistName}
                                    photoURL={
                                      tally.assistId
                                        ? usersById.get(tally.assistId)?.photoURL
                                        : undefined
                                    }
                                  />
                                ) : undefined
                              }
                            />
                          ) : (
                            <span className="truncate text-muted-foreground">
                              Team goal
                            </span>
                          )
                        }
                        removeLabel={`Remove goal by ${tally.scorerName || getTeamName(game, teamId)}`}
                        count={tally.count}
                        goalIds={tally.goalIds}
                        removingId={removingId}
                        onRemoveGoal={onRemoveGoal}
                      />
                    ))
                  ) : (
                    <li className="px-3 py-2 text-sm text-muted-foreground">
                      No goals
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
