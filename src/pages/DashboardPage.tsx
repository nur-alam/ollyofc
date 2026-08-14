import { Link } from "react-router-dom";

import { useAuthStore } from "@/features/auth/auth.store";
import { useGames } from "@/features/games/game.hooks";
import { usePlayers } from "@/features/players/player.hooks";
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
  const { stats } = usePlayers({
    search: "",
    category: "all",
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
          hint="View in Players"
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
              <Link to="/players" className="text-primary hover:underline">
                {isStaff ? "Manage players" : "View the squad"}
              </Link>
              {isStaff ? " and link user accounts." : "."}
            </li>
            <li>
              <Link to="/games" className="text-primary hover:underline">
                View games
              </Link>
              {isStaff ? " or create the next match." : "."}
            </li>
            <li>Phase 4 will generate two balanced teams.</li>
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
              ? "You can manage players and create games. Team generation arrives later."
              : "You can view the squad and games. Staff manage player records."}
          </p>
        </section>
      </div>
    </div>
  );
}
