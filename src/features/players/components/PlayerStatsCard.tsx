import type { PlayerMatchStats } from "@/features/games/playerStats";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function PlayerStatsCard({
  stats,
  loading,
  description,
}: {
  stats: PlayerMatchStats;
  loading: boolean;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Match stats</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading stats...</p>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Games" value={String(stats.games)} />
          <StatTile label="Goals" value={String(stats.goals)} />
          <StatTile label="Wins" value={String(stats.wins)} />
          <StatTile label="Losses" value={String(stats.losses)} />
          <StatTile label="Draws" value={String(stats.draws)} />
          <StatTile label="Win rate" value={`${stats.winRate}%`} />
          <StatTile label="Loss rate" value={`${stats.lossRate}%`} />
          <StatTile label="Goals / game" value={String(stats.goalsPerGame)} />
        </dl>
      )}
    </div>
  );
}
