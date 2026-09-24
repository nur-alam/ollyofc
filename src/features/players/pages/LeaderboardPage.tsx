import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { getAwardTotal } from "@/types/game";
import { formatPosition } from "@/types/player";
import { formatCareerPoints, type PlayerStatTotals } from "@/types/user";
import { InfoIcon } from "lucide-react";

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

function formatWinRate(stats: PlayerStatTotals) {
  if (stats.games <= 0) {
    return "0%";
  }

  return `${Math.round((stats.wins / stats.games) * 100)}%`;
}

function PointsInfo() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="How points work"
            className="text-muted-foreground"
          />
        }
      >
        <InfoIcon />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-3 p-4">
        <PopoverHeader>
          <PopoverTitle>How points work</PopoverTitle>
          <PopoverDescription>
            Points come from finished games. Awards include MVP.
          </PopoverDescription>
        </PopoverHeader>
        <ul className="space-y-1 text-sm">
          <li>1 goal = 3 points</li>
          <li>1 assist = 1.7 points</li>
          <li>1 award = 2 points</li>
        </ul>
        <p className="text-sm">
          Total points = (Goals × 3) + (Assists × 1.7) + (Awards × 2)
        </p>
        <p className="text-sm text-muted-foreground">
          5 goals, 4 assists, and 2 awards = 15 + 6.8 + 4 = 25.8 points.
        </p>
        <div className="space-y-1 text-sm">
          <p className="font-medium">Ranking</p>
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>Highest points</li>
            <li>If tied, more awards</li>
            <li>If still tied, higher win rate</li>
          </ol>
          <p className="text-muted-foreground">
            Players level on all three share a rank.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
        <div className="flex gap-2">
          <p className="text-muted-foreground">
            Ranked by points, then awards, then win rate
          </p>
          <PointsInfo />
        </div>
      </div>

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <div className="overflow-x-auto px-2 rounded-xl border bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-center">Games</TableHead>
              <TableHead className="text-center">Goals</TableHead>
              <TableHead className="text-center">Assists</TableHead>
              <TableHead className="text-center">Awards</TableHead>
              <TableHead className="text-center">Win rate</TableHead>
              <TableHead className="text-center">Points</TableHead>
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
                  <TableCell className="text-center tabular-nums">
                    {player.stats.games}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {player.stats.goals}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {player.stats.assists}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {getAwardTotal(player.stats.awards)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {formatWinRate(player.stats)}
                  </TableCell>
                  <TableCell className="text-center font-semibold tabular-nums">
                    {formatCareerPoints(player.stats.points)}
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
