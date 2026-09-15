import {
  AWARD_STAT_KEYS,
  getExtraAwards,
  getGameMvp,
  getGameScore,
  getResultWinner,
  isGuestParticipant,
  isGuestParticipantId,
  toAwardStatKey,
  type Game,
  type GameParticipant,
} from "@/types/game";
import {
  EMPTY_STAT_TOTALS,
  isSameAwardCounts,
  type PlayerAwardCounts,
  type PlayerGameStat,
  type PlayerStatTotals,
} from "@/types/user";

export type PlayerMatchStats = PlayerStatTotals & {
  winRate: number;
  lossRate: number;
  drawRate: number;
  goalsPerGame: number;
};

export const EMPTY_PLAYER_STATS: PlayerMatchStats = {
  ...EMPTY_STAT_TOTALS,
  awards: {},
  winRate: 0,
  lossRate: 0,
  drawRate: 0,
  goalsPerGame: 0,
};

export function toPlayerMatchStats(
  totals: PlayerStatTotals | undefined,
): PlayerMatchStats {
  if (!totals || totals.games <= 0) {
    return EMPTY_PLAYER_STATS;
  }

  return {
    ...totals,
    awards: { ...totals.awards },
    winRate: Math.round((totals.wins / totals.games) * 100),
    lossRate: Math.round((totals.losses / totals.games) * 100),
    drawRate: Math.round((totals.draws / totals.games) * 100),
    goalsPerGame: Number((totals.goals / totals.games).toFixed(2)),
  };
}

/**
 * What a single game should contribute to each player's career totals.
 * Only completed games count, so cancelling or reopening a match yields an
 * empty map and the previous contribution gets subtracted.
 */
export function buildGameStatContributions(
  game: Game,
  participants: GameParticipant[],
): Record<string, PlayerGameStat> {
  if (game.status !== "completed") {
    return {};
  }

  const score = getGameScore(game);
  const winner = game.result?.winner ?? getResultWinner(score.a, score.b);
  const goals = game.result?.goals ?? [];
  const contributions: Record<string, PlayerGameStat> = {};
  const awardsByUser = new Map<string, PlayerAwardCounts>();

  const bumpAward = (playerId: string, key: string) => {
    if (!playerId || isGuestParticipantId(playerId)) {
      return;
    }

    const current = awardsByUser.get(playerId) ?? {};
    current[key] = (current[key] ?? 0) + 1;
    awardsByUser.set(playerId, current);
  };

  for (const player of getGameMvp(game).players) {
    bumpAward(player.playerId, AWARD_STAT_KEYS.mvp);
  }

  for (const award of getExtraAwards(game.result?.awards)) {
    const key = toAwardStatKey(award.title, award.kind);

    for (const player of award.players) {
      bumpAward(player.playerId, key);
    }
  }

  for (const participant of participants) {
    if (isGuestParticipant(participant)) {
      continue;
    }

    const stat: PlayerGameStat = {
      goals: goals.filter((goal) => goal.scorerId === participant.userId).length,
      assists: goals.filter((goal) => goal.assistId === participant.userId).length,
    };

    if (participant.teamId) {
      stat.teamId = participant.teamId;
    }

    if (winner === "draw") {
      stat.result = "draw";
    } else if (participant.teamId) {
      stat.result = winner === participant.teamId ? "win" : "loss";
    }

    const awards = awardsByUser.get(participant.userId);

    if (awards && Object.keys(awards).length) {
      stat.awards = awards;
    }

    contributions[participant.userId] = stat;
  }

  return contributions;
}

export function isSamePlayerGameStat(
  left: PlayerGameStat | undefined,
  right: PlayerGameStat | undefined,
) {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.goals === right.goals &&
    left.assists === right.assists &&
    left.result === right.result &&
    left.teamId === right.teamId &&
    isSameAwardCounts(left.awards, right.awards)
  );
}
