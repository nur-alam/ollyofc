import type { Timestamp } from "firebase/firestore";

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

export function hasGameHappened(game: Game, now = new Date()) {
  if (game.status === "cancelled") {
    return false;
  }

  if (game.status === "completed" || game.status === "active") {
    return true;
  }

  return getGameStartAt(game).getTime() <= now.getTime();
}

export function isUpcomingGame(game: Game, now = new Date()) {
  return !hasGameHappened(game, now) && game.status !== "cancelled";
}

const SELF_LEAVE_LOCKOUT_MS = 60 * 60 * 1000;

export function canPlayerLeaveGame(game: Game, now = new Date()) {
  if (!isUpcomingGame(game, now)) {
    return false;
  }

  return getGameStartAt(game).getTime() - now.getTime() > SELF_LEAVE_LOCKOUT_MS;
}

export function getGameListBadge(game: Game): GameStatus {
  if (game.status === "cancelled") {
    return "cancelled";
  }

  if (game.status === "active") {
    return "active";
  }

  if (hasGameHappened(game)) {
    return "completed";
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

export function sortGames(games: Game[]) {
  return [...games].sort((left, right) => {
    const leftUpcoming = isUpcomingGame(left);
    const rightUpcoming = isUpcomingGame(right);

    if (leftUpcoming !== rightUpcoming) {
      return leftUpcoming ? -1 : 1;
    }

    const leftTime = getGameStartAt(left).getTime();
    const rightTime = getGameStartAt(right).getTime();

    return leftUpcoming ? leftTime - rightTime : rightTime - leftTime;
  });
}
