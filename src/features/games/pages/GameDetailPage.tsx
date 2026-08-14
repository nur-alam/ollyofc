import { Link, useParams } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import { GameStatusBadge } from "@/features/games/components/GameStatusBadge";
import { useGame } from "@/features/games/game.hooks";
import { cn } from "@/lib/utils";
import {
  formatGameDate,
  formatGameTime,
  getGameDisplayTitle,
  getGameListBadge,
  hasGameHappened,
} from "@/types/game";

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

export function GameDetailPage() {
  const { gameId } = useParams();
  const { game, loading, errorMessage } = useGame(gameId);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl p-8 text-center text-sm text-muted-foreground">
        Loading game...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Game not found</h1>
        <p className="mt-2 text-muted-foreground">
          {errorMessage || "This game does not exist."}
        </p>
        <Link
          to="/games"
          className={cn(buttonVariants({ variant: "outline" }), "mt-6 inline-flex no-underline")}
        >
          Back to games
        </Link>
      </div>
    );
  }

  const happened = hasGameHappened(game);
  const badge = getGameListBadge(game);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link
          to="/games"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Back to games
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {getGameDisplayTitle(game)}
          </h1>
          <GameStatusBadge status={badge} />
        </div>
        <p className="mt-1 text-muted-foreground">
          {formatGameDate(game)} · {formatGameTime(game.startTime)}
        </p>
      </div>

      <dl className="grid gap-4 rounded-xl border bg-background p-5 shadow-sm sm:grid-cols-2">
        <DetailItem label="Location" value={game.location} />
        <DetailItem label="Kick-off" value={formatGameTime(game.startTime)} />
        <DetailItem
          label="Duration"
          value={`${game.matchDurationMinutes} minutes`}
        />
        <DetailItem
          label="Max players"
          value={game.maxPlayers ? String(game.maxPlayers) : "No cap"}
        />
        {game.notes && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Notes</dt>
            <dd className="mt-1 font-medium">{game.notes}</dd>
          </div>
        )}
      </dl>

      {happened ? (
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Match details</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Teams, score, and goal events will appear here once live match
            tracking ships.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Team Red</p>
              <p className="mt-1 text-2xl font-semibold">—</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Team Blue</p>
              <p className="mt-1 text-2xl font-semibold">—</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Not played yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Match details open after this game has been played.
          </p>
        </section>
      )}
    </div>
  );
}
