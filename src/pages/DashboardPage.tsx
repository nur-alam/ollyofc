import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { Button, buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth.store";
import { useGames } from "@/features/games/game.hooks";
import { getErrorMessage, syncAllGameStats } from "@/features/games/game.service";
import { useSquad } from "@/features/players/player.hooks";
import { cn } from "@/lib/utils";
import { formatGameDate, hasGameHappened } from "@/types/game";
import { isStaffRole } from "@/types/user";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DashboardPage() {
  const profile = useAuthStore((state) => state.profile);
  const isStaff = profile ? isStaffRole(profile.role) : false;
  const isAdmin = profile?.role === "admin";
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const { stats } = useSquad({
    search: "",
    position: "all",
    status: "all",
  });
  const { nextUpcomingGame, games } = useGames();
  const playedCount = games.filter((game) => hasGameHappened(game)).length;

  const handleRecalculateStats = async () => {
    setSyncing(true);
    setSyncProgress("");

    try {
      const total = await syncAllGameStats((done, count) => {
        setSyncProgress(`${done} / ${count}`);
      });
      toast.success(`Player stats rebuilt from ${total} games`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not rebuild player stats."));
    } finally {
      setSyncing(false);
      setSyncProgress("");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{profile ? `, ${profile.displayName}` : ""}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Players"
          value={String(stats.total)}
          hint="Everyone who has signed in"
        />
        <StatCard label="Active Players" value={String(stats.active)} />
        <StatCard
          label="Upcoming Game"
          value={nextUpcomingGame ? formatGameDate(nextUpcomingGame) : "None"}
          hint={nextUpcomingGame?.location}
        />
        <StatCard label="Total Matches" value={String(playedCount)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Next Steps</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Set your position on{" "}
              <Link to="/profile" className="text-primary hover:underline">
                Profile
              </Link>
              .
            </li>
            <li>
              <Link to="/games" className="text-primary hover:underline">
                Join an upcoming game
              </Link>
              {isStaff ? " or add players for someone else." : "."}
            </li>
            <li>
              <Link to="/squad" className="text-primary hover:underline">
                View the squad
              </Link>
              .
            </li>
            {isAdmin ? (
              <li>
                <Link to="/visitors" className="text-primary hover:underline">
                  See who is visiting
                </Link>{" "}
                in real time or by day.
              </li>
            ) : null}
            {isAdmin ? (
              <li>
                <Link to="/notification" className="text-primary hover:underline">
                  Notify players
                </Link>{" "}
                with a push message.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Your Access</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Role:{" "}
            <span className="font-medium capitalize text-foreground">
              {profile?.role ?? "user"}
            </span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isStaff
              ? "You can update player positions and manually join users to games."
              : "You can update your position and join upcoming games."}
          </p>
        </section>
      </div>

      {isAdmin && (
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Visitors</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Live visitors, yesterday&apos;s list, and a calendar of who opened
            the site — device, location, and profile when they are signed in.
          </p>
          <Link
            to="/visitors"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-4 no-underline",
            )}
          >
            Open visitors
          </Link>
        </section>
      )}

      {isAdmin && (
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Send a push to everyone, share a leaderboard update, or message
            specific players.
          </p>
          <Link
            to="/notification"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-4 no-underline",
            )}
          >
            Notify users
          </Link>
        </section>
      )}

      {isAdmin && (
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Player stats</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Career stats update automatically when a game is finished or edited.
            Rebuild them from every game if totals ever look wrong, or after
            importing older matches.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncing}
              onClick={() => void handleRecalculateStats()}
            >
              {syncing ? "Rebuilding..." : "Rebuild player stats"}
            </Button>
            {syncProgress && (
              <span className="text-sm text-muted-foreground tabular-nums">
                {syncProgress}
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
