import type { Timestamp } from "firebase/firestore";

import { getServerNow } from "@/lib/clock";
import {
  bangladeshDateTimeToUtc,
  formatBangladeshClock,
  formatBangladeshDate,
  formatYmd,
  getBangladeshParts,
} from "@/lib/timezone";

export type GameStatus =
  | "draft"
  | "upcoming"
  | "active"
  | "completed"
  | "cancelled";

export type GameTeamId = "a" | "b";

export type GameTeam = {
  name: string;
};

export type GameTeams = {
  a: GameTeam;
  b: GameTeam;
  generatedAt?: Timestamp;
  generatedBy?: string;
};

export type GameTeamBuild = {
  startedAt?: Timestamp;
  startedAtMs: number;
  startedBy: string;
  dealOrder: Array<{
    userId: string;
    teamId: GameTeamId;
  }>;
};

export type GameResultWinner = GameTeamId | "draw";

export type GameGoal = {
  id: string;
  teamId: GameTeamId;
  scorerId: string;
  scorerName: string;
  createdBy: string;
  createdAtMs: number;
};

export type GameResult = {
  a: number;
  b: number;
  winner: GameResultWinner;
  goals: GameGoal[];
  updatedAt?: Timestamp;
  updatedAtMs: number;
  updatedBy: string;
};

export type Game = {
  id: string;
  title?: string;
  date: Timestamp;
  startTime: string;
  location: string;
  status: GameStatus;
  maxPlayers?: number;
  matchDurationMinutes: number;
  notes?: string;
  teamCount: 2;
  teams?: GameTeams;
  teamBuild?: GameTeamBuild;
  result?: GameResult;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type GameParticipant = {
  userId: string;
  displayName: string;
  photoURL?: string;
  position: string;
  teamId?: GameTeamId;
  joinedBy: string;
  joinedAt?: Timestamp;
};

export type GameInput = {
  title?: string;
  date: string;
  startTime: string;
  location: string;
  maxPlayers?: number;
  matchDurationMinutes: number;
  notes?: string;
};

export const GAME_TEAM_IDS: GameTeamId[] = ["a", "b"];

export const DEFAULT_TEAM_NAMES: Record<GameTeamId, string> = {
  a: "TEAM-A",
  b: "TEAM-B",
};

export function hasGameTeams(game: Game) {
  return Boolean(game.teams?.a && game.teams?.b);
}

export function getTeamName(game: Game, teamId: GameTeamId) {
  const name = game.teams?.[teamId]?.name?.trim();
  return name || DEFAULT_TEAM_NAMES[teamId];
}

export const GAME_LOCATIONS = [
  "Metroplex Sporting Complex",
  "Kickoff Football Ground",
  "Bashundhara Kings Arena",
] as const;

export function isGameLocation(
  location: string,
): location is (typeof GAME_LOCATIONS)[number] {
  return (GAME_LOCATIONS as readonly string[]).includes(location);
}

export const GAME_STATUSES: GameStatus[] = [
  "draft",
  "upcoming",
  "active",
  "completed",
  "cancelled",
];

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  active: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

function parseTimeParts(startTime: string) {
  const [hours, minutes] = startTime.split(":").map(Number);
  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

export function getGameStartAt(game: Pick<Game, "date" | "startTime">) {
  const ymd = formatYmd(getBangladeshParts(game.date.toDate()));
  return bangladeshDateTimeToUtc(ymd, game.startTime);
}

export function hasKickoffPassed(game: Pick<Game, "date" | "startTime">, now = new Date()) {
  return getGameStartAt(game).getTime() <= now.getTime();
}

export function getGameEndAt(
  game: Pick<Game, "date" | "startTime" | "matchDurationMinutes">,
) {
  return new Date(
    getGameStartAt(game).getTime() + game.matchDurationMinutes * 60 * 1000,
  );
}

export function hasMatchEnded(game: Game, now = new Date()) {
  if (game.status === "completed") {
    return true;
  }

  if (game.status === "cancelled") {
    return false;
  }

  return now.getTime() >= getGameEndAt(game).getTime();
}

export function isGameInPlay(game: Game, now = new Date()) {
  if (game.status === "cancelled" || game.status === "completed") {
    return false;
  }

  const time = now.getTime();
  return time >= getGameStartAt(game).getTime() && time < getGameEndAt(game).getTime();
}

export function hasGameHappened(game: Game, now = new Date()) {
  if (game.status === "cancelled") {
    return false;
  }

  if (game.status === "completed" || game.status === "active") {
    return true;
  }

  return hasKickoffPassed(game, now);
}

export function isUpcomingGame(game: Game, now = new Date()) {
  return !hasGameHappened(game, now) && game.status !== "cancelled";
}

export function getLastFinishedGame(games: Game[], now = new Date()) {
  const finished = games.filter(
    (game) => hasMatchEnded(game, now) && game.status !== "cancelled",
  );

  if (!finished.length) {
    return null;
  }

  return finished.reduce((latest, game) =>
    getGameStartAt(game).getTime() > getGameStartAt(latest).getTime() ? game : latest,
  );
}

export function canShowGameResult(game: Game, now = new Date()) {
  return hasGameHappened(game, now);
}

export function canUpdateGameResult(game: Game, now = new Date()) {
  return canShowGameResult(game, now) && game.status !== "cancelled";
}

export function getGameScore(game: Pick<Game, "result">) {
  return {
    a: game.result?.a ?? 0,
    b: game.result?.b ?? 0,
  };
}

export function getResultWinner(
  scoreA: number,
  scoreB: number,
): GameResultWinner {
  if (scoreA === scoreB) {
    return "draw";
  }

  return scoreA > scoreB ? "a" : "b";
}

export function getWinnerLabel(game: Game) {
  const score = getGameScore(game);
  const winner = game.result?.winner ?? getResultWinner(score.a, score.b);

  if (winner === "draw") {
    return score.a === 0 && score.b === 0 ? "Level" : "Draw";
  }

  return getTeamName(game, winner);
}

export function getPlayerGoalCounts(goals: GameGoal[]) {
  const counts = new Map<string, { scorerId: string; scorerName: string; count: number }>();

  for (const goal of goals) {
    const current = counts.get(goal.scorerId);

    if (current) {
      current.count += 1;
      continue;
    }

    counts.set(goal.scorerId, {
      scorerId: goal.scorerId,
      scorerName: goal.scorerName,
      count: 1,
    });
  }

  return [...counts.values()].sort((left, right) => right.count - left.count);
}

const SELF_LEAVE_LOCKOUT_MS = 60 * 60 * 1000;

export function canPlayerLeaveGame(game: Game, now = new Date()) {
  if (!isUpcomingGame(game, now)) {
    return false;
  }

  return getGameStartAt(game).getTime() - now.getTime() > SELF_LEAVE_LOCKOUT_MS;
}

export function getGameListBadge(game: Game, now = new Date()): GameStatus {
  if (game.status === "cancelled") {
    return "cancelled";
  }

  if (game.status === "completed" || hasMatchEnded(game, now)) {
    return "completed";
  }

  if (isGameInPlay(game, now)) {
    return "active";
  }

  return "upcoming";
}

export function formatGameDate(game: Pick<Game, "date">) {
  return formatBangladeshDate(game.date.toDate());
}

export function formatGameTime(startTime: string) {
  const { hours, minutes } = parseTimeParts(startTime);
  return formatBangladeshClock(hours, minutes);
}

function formatClockParts(totalSeconds: number, includeDays = false) {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((includeDays ? totalSeconds % 86_400 : totalSeconds) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (includeDays) {
    return `${days}d-${hours}h-${minutes}m-${seconds}s`;
  }

  return `${hours}h-${minutes}m-${seconds}s`;
}

export function formatRemainingToKickoff(
  game: Pick<Game, "date" | "startTime">,
  now = getServerNow(),
) {
  const remainingMs = Math.max(0, getGameStartAt(game).getTime() - now.getTime());
  return formatClockParts(Math.floor(remainingMs / 1000), true);
}

export function formatElapsedMatchTime(
  game: Pick<Game, "date" | "startTime" | "matchDurationMinutes">,
  now = getServerNow(),
) {
  const startMs = getGameStartAt(game).getTime();
  const endMs = getGameEndAt(game).getTime();
  const elapsedMs = Math.max(0, Math.min(now.getTime(), endMs) - startMs);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}min-${seconds}s / ${game.matchDurationMinutes}min`;
}

export function getGameDisplayTitle(game: Game) {
  if (game.title?.trim()) {
    return game.title.trim();
  }

  return `${game.location} · ${formatGameDate(game)}`;
}

export function gameToInput(game: Game): GameInput {
  return {
    title: game.title ?? "",
    date: formatYmd(getBangladeshParts(game.date.toDate())),
    startTime: game.startTime,
    location: game.location,
    maxPlayers: game.maxPlayers,
    matchDurationMinutes: game.matchDurationMinutes,
    notes: game.notes ?? "",
  };
}

export function sortGames(games: Game[], now = new Date()) {
  return [...games].sort((left, right) => {
    const leftUpcoming = isUpcomingGame(left, now);
    const rightUpcoming = isUpcomingGame(right, now);

    if (leftUpcoming !== rightUpcoming) {
      return leftUpcoming ? -1 : 1;
    }

    const leftTime = getGameStartAt(left).getTime();
    const rightTime = getGameStartAt(right).getTime();

    return leftUpcoming ? leftTime - rightTime : rightTime - leftTime;
  });
}
