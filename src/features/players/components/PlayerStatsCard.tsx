import type { PlayerMatchStats } from "@/features/games/playerStats";
import { AWARD_STAT_KEYS, getAwardStatLabel, getAwardTotal } from "@/types/game";
import { formatCareerPoints } from "@/types/user";

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
  const extraAwards = Object.entries(stats.awards)
    .filter(([key, count]) => key !== AWARD_STAT_KEYS.mvp && count > 0)
    .sort(([left], [right]) =>
      getAwardStatLabel(left).localeCompare(getAwardStatLabel(right)),
    );

  return (
    <div className="rounded-xl border bg-background p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Match stats</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading stats...</p>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Games" value={String(stats.games)} />
          <StatTile label="Points" value={formatCareerPoints(stats.points)} />
          <StatTile label="Goals" value={String(stats.goals)} />
          <StatTile label="Assists" value={String(stats.assists)} />
          <StatTile label="Wins" value={String(stats.wins)} />
          <StatTile label="Losses" value={String(stats.losses)} />
          <StatTile label="Draws" value={String(stats.draws)} />
          <StatTile label="Awards" value={String(getAwardTotal(stats.awards))} />
          <StatTile
            label="MVP"
            value={String(stats.awards[AWARD_STAT_KEYS.mvp] ?? 0)}
          />
          {extraAwards.map(([key, count]) => (
            <StatTile key={key} label={getAwardStatLabel(key)} value={String(count)} />
          ))}
          <StatTile label="Win rate" value={`${stats.winRate}%`} />
          <StatTile label="Loss rate" value={`${stats.lossRate}%`} />
          <StatTile label="Goals / game" value={String(stats.goalsPerGame)} />
        </dl>
      )}
    </div>
  );
}
