import type { UserProfile } from "@/types/user";

export type LeaderboardRow = {
  /** Shared by players level on every ranked stat, so ties read 1, 2, 2, 4. */
  rank: number;
  player: UserProfile;
};

/**
 * Most goals first, then most assists, then most wins, then fewest losses.
 * Players still level on all four are listed alphabetically.
 */
export function compareLeaderboard(left: UserProfile, right: UserProfile) {
  return (
    right.stats.goals - left.stats.goals ||
    right.stats.assists - left.stats.assists ||
    right.stats.wins - left.stats.wins ||
    left.stats.losses - right.stats.losses ||
    left.displayName.localeCompare(right.displayName)
  );
}

function isLevelOnRankedStats(left: UserProfile, right: UserProfile) {
  return (
    left.stats.goals === right.stats.goals &&
    left.stats.assists === right.stats.assists &&
    left.stats.wins === right.stats.wins &&
    left.stats.losses === right.stats.losses
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
