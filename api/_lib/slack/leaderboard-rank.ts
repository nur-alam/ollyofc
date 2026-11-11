/**
 * Same order as `src/features/players/leaderboard.ts`: points, then award
 * total, then win rate, then name. Ties share a rank (1, 2, 2, 4).
 */

export type LeaderboardPlayer = {
  displayName: string;
  games: number;
  goals: number;
  assists: number;
  wins: number;
  awards: number;
  points: number;
};

export type RankedPlayer = LeaderboardPlayer & {
  rank: number;
};

function pointsTenths(points: number) {
  return Math.round(points * 10);
}

function compareWinRate(left: LeaderboardPlayer, right: LeaderboardPlayer) {
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

function compareLeaderboard(left: LeaderboardPlayer, right: LeaderboardPlayer) {
  return (
    pointsTenths(right.points) - pointsTenths(left.points) ||
    right.awards - left.awards ||
    compareWinRate(left, right) ||
    left.displayName.localeCompare(right.displayName)
  );
}

function isLevel(left: LeaderboardPlayer, right: LeaderboardPlayer) {
  return (
    pointsTenths(left.points) === pointsTenths(right.points) &&
    left.awards === right.awards &&
    compareWinRate(left, right) === 0
  );
}

export function rankLeaderboard(players: LeaderboardPlayer[]): RankedPlayer[] {
  const ranked = players.filter((player) => player.games > 0).sort(compareLeaderboard);
  let lastRank = 0;

  return ranked.map((player, index) => {
    const previous = ranked[index - 1];
    const rank = previous && isLevel(previous, player) ? lastRank : index + 1;
    lastRank = rank;
    return { ...player, rank };
  });
}

export function formatWinRate(player: LeaderboardPlayer) {
  if (player.games <= 0) {
    return "0%";
  }

  return `${Math.round((player.wins / player.games) * 100)}%`;
}

export function formatPoints(points: number) {
  return (Number.isFinite(points) ? points : 0).toFixed(1);
}

function slackPlain(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function awardLabel(count: number) {
  return count === 1 ? "1 award" : `${count} awards`;
}

export function leaderboardLines(players: RankedPlayer[]) {
  return players.map((player) => {
    const name = slackPlain(player.displayName.trim() || "Player");
    return `${player.rank}. ${name} — ${player.games} games, ${player.goals} goals, ${player.assists} assists, ${awardLabel(player.awards)}, ${formatWinRate(player)} wins, ${formatPoints(player.points)} pts`;
  });
}

const BOARD_URL = "https://ollyofc.vercel.app/leaderboard";
const SECTION_LIMIT = 2900;

function section(text: string) {
  return {
    type: "section",
    text: { type: "mrkdwn", text },
  };
}

export function leaderboardMessage(players: LeaderboardPlayer[]) {
  const ranked = rankLeaderboard(players);

  if (ranked.length === 0) {
    return {
      response_type: "in_channel" as const,
      text: "Nobody has played a finished game yet.",
    };
  }

  const lines = leaderboardLines(ranked);
  const blocks = [];
  let chunk = "*Ollyo FC leaderboard*";

  for (const line of lines) {
    const next = `${chunk}\n${line}`;

    if (next.length > SECTION_LIMIT) {
      blocks.push(section(chunk));
      chunk = line;
    } else {
      chunk = next;
    }
  }

  const link = `<${BOARD_URL}|Open the full leaderboard>`;
  const withLink = `${chunk}\n${link}`;

  if (withLink.length > SECTION_LIMIT) {
    blocks.push(section(chunk));
    blocks.push(section(link));
  } else {
    blocks.push(section(withLink));
  }

  return {
    response_type: "in_channel" as const,
    text: `Ollyo FC leaderboard\n${lines.join("\n")}\n${BOARD_URL}`.slice(0, 3000),
    blocks,
  };
}
