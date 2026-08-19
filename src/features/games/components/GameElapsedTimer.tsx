import { useNow } from "@/features/games/game.hooks";
import { formatElapsedMatchTime, type Game } from "@/types/game";

export function GameElapsedTimer({
  game,
  now: nowProp,
}: {
  game: Pick<Game, "date" | "startTime" | "matchDurationMinutes">;
  now?: Date;
}) {
  const tickingNow = useNow(1000);
  const now = nowProp ?? tickingNow;

  return (
    <span className="font-medium tabular-nums text-muted-foreground">
      {formatElapsedMatchTime(game, now)}
    </span>
  );
}
