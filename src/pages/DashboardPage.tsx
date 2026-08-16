import { Link } from "react-router-dom";

import { useAuthStore } from "@/features/auth/auth.store";
import { useGames } from "@/features/games/game.hooks";
import { useSquad } from "@/features/players/player.hooks";
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
  const { stats } = useSquad({
    search: "",
    position: "all",
    status: "all",
  });
  const { nextUpcomingGame, games } = useGames();
  const playedCount = games.filter((game) => hasGameHappened(game)).length;

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
    </div>
  );
}
