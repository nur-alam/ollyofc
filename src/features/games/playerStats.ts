import {
  AWARD_STAT_KEYS,
  getExtraAwards,
  getGameMvp,
  getAwardTotal,
  getGameScore,
  getResultWinner,
  isGuestParticipant,
  isGuestParticipantId,
  toAwardStatKey,
  usesPositionScoring,
  usesWinBonus,
  type Game,
  type GameParticipant,
} from "@/types/game";
import { parsePosition } from "@/types/player";
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
  // Games played before position scoring never get defender counts, so their points stay as they were.
  const positionScoring = usesPositionScoring(game);

  const bumpAward = (playerId: string, key: string) => {
    if (!playerId || isGuestParticipantId(playerId)) {
      return;
    }

    const current = awardsByUser.get(playerId) ?? {};
    current[key] = (current[key] ?? 0) + 1;
    awardsByUser.set(playerId, current);
  };

  for (const player of getGameMvp(game, participants).players) {
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

    // The match position decides this, not the profile. Keys are left off at zero
    // so a contribution saved before this rule still compares equal.
    if (positionScoring && parsePosition(participant.position) === "defender") {
      if (stat.goals > 0) {
        stat.defenderGoals = stat.goals;
      }

      if (stat.assists > 0) {
        stat.defenderAssists = stat.assists;
      }
    }

    if (participant.teamId) {
      stat.teamId = participant.teamId;
    }

    if (winner === "draw") {
      stat.result = "draw";
    } else if (participant.playedBoth && participant.teamId) {
      // They played both sides, so a decided match is a win and never a loss.
      stat.result = "win";
    } else if (participant.teamId) {
      stat.result = winner === participant.teamId ? "win" : "loss";
    }

    const awards = awardsByUser.get(participant.userId);

    if (awards && Object.keys(awards).length) {
      stat.awards = awards;
    }

    // One bonus per win, and only while every other source is still zero.
    // The next sync drops it when a goal, an assist, or an award appears.
    if (
      usesWinBonus(game) &&
      stat.result === "win" &&
      stat.goals === 0 &&
      stat.assists === 0 &&
      getAwardTotal(awards) === 0
    ) {
      stat.winBonus = 1;
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
    (left.defenderGoals ?? 0) === (right.defenderGoals ?? 0) &&
    (left.defenderAssists ?? 0) === (right.defenderAssists ?? 0) &&
    (left.winBonus ?? 0) === (right.winBonus ?? 0) &&
    left.result === right.result &&
    left.teamId === right.teamId &&
    isSameAwardCounts(left.awards, right.awards)
  );
}
