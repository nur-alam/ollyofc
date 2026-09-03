import {
  getGameScore,
  getResultWinner,
  isGuestParticipant,
  type Game,
  type GameParticipant,
} from "@/types/game";
import {
  EMPTY_STAT_TOTALS,
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
    left.teamId === right.teamId
  );
}
