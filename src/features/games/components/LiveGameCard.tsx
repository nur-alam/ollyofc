import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import { GameElapsedTimer } from "@/features/games/components/GameElapsedTimer";
import { GameResultBoard } from "@/features/games/components/GameResultBoard";
import { GameResultUpdate } from "@/features/games/components/GameResultUpdate";
import { GameStatusBadge } from "@/features/games/components/GameStatusBadge";
import { useParticipants, useNow } from "@/features/games/game.hooks";
import { useAuthStore } from "@/features/auth/auth.store";
import { cn } from "@/lib/utils";
import { isStaffRole } from "@/types/user";
import {
  formatGameDate,
  formatGameTime,
  getGameDisplayTitle,
  getGameListBadge,
  isGameInPlay,
  type Game,
} from "@/types/game";

export function LiveGameCard({
  game,
  allowUpdate = true,
}: {
  game: Game;
  allowUpdate?: boolean;
}) {
  const { profile } = useAuthStore();
  const isStaff = profile ? isStaffRole(profile.role) : false;
  const { participants } = useParticipants(game.id);
  const now = useNow(1000);
  const inPlay = isGameInPlay(game, now);

  return (
    <article className="rounded-xl border bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{getGameDisplayTitle(game)}</h2>
            <GameStatusBadge status={getGameListBadge(game, now)} />
            {inPlay ? <GameElapsedTimer game={game} now={now} /> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatGameDate(game)} · {formatGameTime(game.startTime)} · {game.location}
          </p>
        </div>
        <Link
          to={`/games/${game.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "no-underline")}
        >
          View match
        </Link>
      </div>

      <div className="mt-5">
        {allowUpdate && isStaff && profile ? (
          <GameResultUpdate
            game={game}
            participants={participants}
            updatedBy={profile.id}
          />
        ) : (
          <GameResultBoard game={game} />
        )}
      </div>
    </article>
  );
}
