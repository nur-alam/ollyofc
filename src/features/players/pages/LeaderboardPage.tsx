import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildLeaderboard } from "@/features/players/leaderboard";
import { useSquad } from "@/features/players/player.hooks";
import { cn } from "@/lib/utils";
import { formatPosition } from "@/types/player";

const allPlayers = {
  search: "",
  position: "all",
  status: "all",
} as const;

const medalStyles: Record<number, string> = {
  1: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  2: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  3: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
};

function RankBadge({ rank }: { rank: number }) {
  const medal = medalStyles[rank];

  if (!medal) {
    return <span className="pl-2 tabular-nums text-muted-foreground">{rank}</span>;
  }

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-semibold tabular-nums", medal)}
    >
      {rank}
    </Badge>
  );
}

export function LeaderboardPage() {
  const navigate = useNavigate();
  const { allUsers, loading, errorMessage } = useSquad(allPlayers);
  const rows = useMemo(() => buildLeaderboard(allUsers), [allUsers]);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          Ranked by goals, then assists, wins and fewest losses
        </p>
      </div>

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Games</TableHead>
              <TableHead className="text-right">Goals</TableHead>
              <TableHead className="text-right">Assists</TableHead>
              <TableHead className="text-right">W</TableHead>
              <TableHead className="text-right">L</TableHead>
              <TableHead className="text-right">D</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Loading leaderboard...
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              rows.map(({ rank, player }) => (
                <TableRow
                  key={player.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`View ${player.displayName}`}
                  className="cursor-pointer"
                  onClick={() => navigate(`/player/${player.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/player/${player.id}`);
                    }
                  }}
                >
                  <TableCell>
                    <RankBadge rank={rank} />
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar>
                        {player.photoURL ? (
                          <AvatarImage src={player.photoURL} alt={player.displayName} />
                        ) : null}
                        <AvatarFallback>
                          {player.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{player.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatPosition(player.position)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {player.stats.games}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {player.stats.goals}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {player.stats.assists}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {player.stats.wins}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {player.stats.losses}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {player.stats.draws}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nobody has played a finished game yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
