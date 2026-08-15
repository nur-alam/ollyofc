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
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type GameParticipant = {
  userId: string;
  displayName: string;
  photoURL?: string;
  position: string;
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
