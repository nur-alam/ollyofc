import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";
import { LiveGameCard } from "@/features/games/components/LiveGameCard";
import { UpcomingGameCard } from "@/features/games/components/UpcomingGameCard";
import { useGames } from "@/features/games/game.hooks";
import { cn } from "@/lib/utils";

export function UpcomingGamesList() {
  const { upcomingGames, liveGames, lastFinishedGame, loading, errorMessage } = useGames();

  return (
    <div className="flex flex-col gap-10">
      {liveGames.length > 0 ? (
        <section className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {liveGames.length === 1 ? "Live game" : "Live games"}
            </h1>
            <p className="text-muted-foreground">
              Score updates here as they happen. No sign-in needed.
            </p>
          </div>
          <div className="grid gap-4">
            {liveGames.map((game) => (
              <LiveGameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      ) : lastFinishedGame ? (
        <section className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Last result</h1>
            <p className="text-muted-foreground">
              Final score from the latest match.
            </p>
          </div>
          <LiveGameCard game={lastFinishedGame} />
        </section>
      ) : null}

      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Upcoming games</h1>
            <p className="text-muted-foreground">
              Join a game below. Staff can also add players from the Games page.
            </p>
          </div>
          <Link
            to="/games"
            className={cn(buttonVariants({ variant: "outline" }), "no-underline")}
          >
            All games
          </Link>
        </div>

        {errorMessage && <p className="error-text">{errorMessage}</p>}

        {loading ? (
          <div className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground shadow-sm">
            Loading games...
          </div>
        ) : upcomingGames.length ? (
          <div className="grid gap-4">
            {upcomingGames.map((game) => (
              <UpcomingGameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground shadow-sm">
            No upcoming game yet. Staff can create the next match from Games.
          </div>
        )}
      </section>
    </div>
  );
}
