/**
 * Same order as `src/features/players/leaderboard.ts`: points, then award
 * total, then win rate, then name. Ties share a rank (1, 2, 2, 4).
 */

export type LeaderboardPlayer = {
  displayName: string;
  position?: string;
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

function cell(text: string) {
  return { type: "raw_text" as const, text };
}

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: "Goalkeeper",
  defender: "Defender",
  midfielder: "Midfielder",
  forward: "Forward",
};

function playerLabel(player: RankedPlayer) {
  const name = player.displayName.trim() || "Player";
  const position = POSITION_LABELS[player.position?.trim().toLowerCase() ?? ""] ?? "";
  return position ? `${name} · ${position}` : name;
}

const BOARD_URL = "https://ollyofc.vercel.app/leaderboard";

function leaderboardLines(players: RankedPlayer[]) {
  return players.map(
    (player) =>
      `${player.rank}. ${playerLabel(player)} — ${player.games} games, ${player.goals} goals, ${player.assists} assists, ${player.awards} awards, ${formatWinRate(player)} wins, ${formatPoints(player.points)} pts`,
  );
}

export function leaderboardMessage(players: LeaderboardPlayer[]) {
  const ranked = rankLeaderboard(players);

  if (ranked.length === 0) {
    return {
      response_type: "in_channel" as const,
      text: "Nobody has played a finished game yet.",
    };
  }

  const rows = [
    ["#", "Player", "Games", "Goals", "Assists", "Awards", "Win rate", "Points"].map(cell),
    ...ranked.slice(0, 99).map((player) => [
      cell(String(player.rank)),
      cell(playerLabel(player)),
      cell(String(player.games)),
      cell(String(player.goals)),
      cell(String(player.assists)),
      cell(String(player.awards)),
      cell(formatWinRate(player)),
      cell(formatPoints(player.points)),
    ]),
  ];

  const lines = leaderboardLines(ranked);

  return {
    response_type: "in_channel" as const,
    text: `Leaderboard\n${lines.join("\n")}\n${BOARD_URL}`.slice(0, 3000),
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Leaderboard" },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Ranked by points, then awards, then win rate · <${BOARD_URL}|Open the full leaderboard>`,
          },
        ],
      },
      {
        type: "table",
        column_settings: [
          { align: "center" },
          { is_wrapped: true },
          { align: "center" },
          { align: "center" },
          { align: "center" },
          { align: "center" },
          { align: "center" },
          { align: "right" },
        ],
        rows,
      },
    ],
  };
}
