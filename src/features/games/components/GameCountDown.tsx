import { useEffect, useState } from "react";

import { formatRemainingToKickoff, type Game } from "@/types/game";

export function GameCountDown({ game }: { game: Pick<Game, "date" | "startTime"> }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div>
      <dt className="text-sm text-muted-foreground">Remaining</dt>
      <dd className="mt-1 font-medium tabular-nums">
        {formatRemainingToKickoff(game, now)}
      </dd>
    </div>
  );
}
