import { Link, useParams } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PlayerStatsCard } from "@/features/players/components/PlayerStatsCard";
import { usePlayerProfile } from "@/features/players/player.hooks";
import { cn } from "@/lib/utils";
import { formatPosition } from "@/types/player";

export function PlayerPage() {
  const { playerId } = useParams();
  const { player, stats, loading } = usePlayerProfile(playerId);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl p-8 text-center text-sm text-muted-foreground">
        Loading player...
      </div>
    );
  }

  if (!player) {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Player not found</h1>
        <p className="mt-2 text-muted-foreground">
          This player is not in the squad.
        </p>
        <Link
          to="/squad"
          className={cn(buttonVariants({ variant: "outline" }), "mt-6 inline-flex no-underline")}
        >
          Back to squad
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        to="/squad"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        Back to squad
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{player.displayName}</h1>
      <p className="text-muted-foreground">Player profile and match stats.</p>

      <div className="mt-6 rounded-xl border bg-background p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar className="size-20 after:hidden">
            <AvatarImage src={player.photoURL} alt={player.displayName} />
            <AvatarFallback className="text-lg">
              {player.displayName.charAt(0).toUpperCase() || "P"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-lg font-semibold">
              {player.displayName}
              {player.isSeed ? (
                <Badge variant="outline" className="font-normal">
                  Test
                </Badge>
              ) : null}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{player.isActive ? "Active" : "Inactive"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Position</dt>
            <dd className="font-medium">{formatPosition(player.position)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6">
        <PlayerStatsCard
          stats={stats}
          loading={false}
          description="From finished games this player joined."
        />
      </div>
    </div>
  );
}
