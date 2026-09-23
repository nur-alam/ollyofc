import { getAwardTotal } from "@/types/game";
import type { PlayerStatTotals, UserProfile } from "@/types/user";

export type LeaderboardRow = {
  /** Shared by players level on every ranked stat, so ties read 1, 2, 2, 4. */
  rank: number;
  player: UserProfile;
};

function pointsTenths(points: number) {
  return Math.round(points * 10);
}

/** Higher win rate first. Zero games counts as a 0 rate. Exact wins/games, not the rounded percent. */
function compareWinRate(left: PlayerStatTotals, right: PlayerStatTotals) {
  const leftGames = left.games > 0 ? left.games : 0;
  const rightGames = right.games > 0 ? right.games : 0;
  const leftWins = leftGames > 0 ? left.wins : 0;
  const rightWins = rightGames > 0 ? right.wins : 0;

  if (leftGames === 0 && rightGames === 0) {
    return 0;
  }

  if (leftGames === 0) {
    return rightWins > 0 ? 1 : 0;
  }

  if (rightGames === 0) {
    return leftWins > 0 ? -1 : 0;
  }

  return rightWins * leftGames - leftWins * rightGames;
}

/**
 * Most points first, then most awards, then highest win rate.
 * Players still level on all three are listed alphabetically.
 */
export function compareLeaderboard(left: UserProfile, right: UserProfile) {
  return (
    pointsTenths(right.stats.points) - pointsTenths(left.stats.points) ||
    getAwardTotal(right.stats.awards) - getAwardTotal(left.stats.awards) ||
    compareWinRate(left.stats, right.stats) ||
    left.displayName.localeCompare(right.displayName)
  );
}

function isLevelOnRankedStats(left: UserProfile, right: UserProfile) {
  return (
    pointsTenths(left.stats.points) === pointsTenths(right.stats.points) &&
    getAwardTotal(left.stats.awards) === getAwardTotal(right.stats.awards) &&
    compareWinRate(left.stats, right.stats) === 0
  );
}

/** Only players with a finished game behind them make the board. */
export function buildLeaderboard(users: UserProfile[]): LeaderboardRow[] {
  const ranked = users
    .filter((user) => user.stats.games > 0)
    .sort(compareLeaderboard);
  let lastRank = 0;

  return ranked.map((player, index) => {
    const previous = ranked[index - 1];
    const rank =
      previous && isLevelOnRankedStats(previous, player) ? lastRank : index + 1;

    lastRank = rank;

    return { rank, player };
  });
}
