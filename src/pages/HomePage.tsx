// import { Link, useNavigate } from "react-router-dom";

import { Header } from "@/components/layout/Header";
// import { Button, buttonVariants } from "@/components/ui/button";
// import { GameStatusBadge } from "@/features/games/components/GameStatusBadge";
// import { useGames } from "@/features/games/game.hooks";
// import { useAuthStore } from "@/features/auth/auth.store";
// import { cn } from "@/lib/utils";
// import { formatGameDate, formatGameTime } from "@/types/game";

export function HomePage() {
  // const navigate = useNavigate();
  // const { firebaseUser, loading } = useAuthStore();
  // const { nextUpcomingGame } = useGames();

  return (
    <div className="app-shell min-h-screen bg-muted/30">
      <Header />

      <main className="content grid min-h-[calc(100vh-4rem)] place-items-center p-4">
        <section className="auth-card w-full max-w-2xl text-center">
          <h1 className="mt-0">Ollyo FC</h1>
          <p className="text-muted-foreground">
            Office football team management — plan games, build balanced teams,
            and track match stats.
          </p>

          {/* <div className="mt-8 grid gap-4 rounded-xl border bg-muted/40 p-4 text-left">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Upcoming game</p>
              {nextUpcomingGame && <GameStatusBadge status="upcoming" />}
            </div>
            {nextUpcomingGame ? (
              <div>
                <p className="font-medium">
                  {formatGameDate(nextUpcomingGame)} ·{" "}
                  {formatGameTime(nextUpcomingGame.startTime)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextUpcomingGame.location}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming game yet. Staff can create the next match from Games.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/players" className={cn(buttonVariants({ variant: "outline" }), "no-underline")}>
              Players
            </Link>
            <Link to="/games" className={cn(buttonVariants({ variant: "outline" }), "no-underline")}>
              Games
            </Link>
            {firebaseUser ? (
              <Link to="/dashboard" className={cn(buttonVariants(), "no-underline")}>
                Go to Dashboard
              </Link>
            ) : (
              <Button disabled={loading} onClick={() => navigate("/login")}>
                Sign In
              </Button>
            )}
          </div> */}
        </section>
      </main>
    </div>
  );
}
