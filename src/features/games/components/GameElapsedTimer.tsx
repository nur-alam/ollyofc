import { useNow } from "@/features/games/game.hooks";
import { formatElapsedMatchTime, type Game } from "@/types/game";

export function GameElapsedTimer({
  game,
}: {
  game: Pick<Game, "date" | "startTime" | "matchDurationMinutes">;
}) {
  const now = useNow(1000);

  return (
    <span className="font-medium tabular-nums text-muted-foreground">
      {formatElapsedMatchTime(game, now)}
    </span>
  );
}
