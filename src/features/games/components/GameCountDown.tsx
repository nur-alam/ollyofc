import { formatRemainingToKickoff, type Game } from "@/types/game";
import { useNow } from "@/features/games/game.hooks";

export function GameCountDown({ game }: { game: Pick<Game, "date" | "startTime"> }) {
  const now = useNow(1000);

  return (
    <div>
      <dt className="text-sm text-muted-foreground">Remaining</dt>
      <dd className="mt-1 font-medium tabular-nums">
        {formatRemainingToKickoff(game, now)}
      </dd>
    </div>
  );
}
