import type { Timestamp } from "firebase/firestore";

import type { GameTeamId } from "@/types/game";
import type { PlayerPosition } from "@/types/player";

export type UserRole = "admin" | "moderator" | "user";

export type PlayerGameResult = "win" | "loss" | "draw";

/** One finished match's contribution to a player's career totals. */
export type PlayerGameStat = {
  teamId?: GameTeamId;
  result?: PlayerGameResult;
  goals: number;
};

export type PlayerStatTotals = {
  games: number;
  goals: number;
  wins: number;
  losses: number;
  draws: number;
};

export const EMPTY_STAT_TOTALS: PlayerStatTotals = {
  games: 0,
  goals: 0,
  wins: 0,
  losses: 0,
  draws: 0,
};

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  isActive: boolean;
  position: PlayerPosition | "";
  isSeed?: boolean;
  stats: PlayerStatTotals;
  statGames: Record<string, PlayerGameStat>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

function parseCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : 0;
}

export function parsePlayerGameStat(value: unknown): PlayerGameStat | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;
  const stat: PlayerGameStat = { goals: parseCount(data.goals) };

  if (data.teamId === "a" || data.teamId === "b") {
    stat.teamId = data.teamId;
  }

  if (data.result === "win" || data.result === "loss" || data.result === "draw") {
    stat.result = data.result;
  }

  return stat;
}

export function parseStatGames(value: unknown): Record<string, PlayerGameStat> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).flatMap(
    ([gameId, item]) => {
      const stat = parsePlayerGameStat(item);
      return stat ? [[gameId, stat] as const] : [];
    },
  );

  return Object.fromEntries(entries);
}

export function sumStatGames(
  statGames: Record<string, PlayerGameStat>,
): PlayerStatTotals {
  const totals = { ...EMPTY_STAT_TOTALS };

  for (const stat of Object.values(statGames)) {
    totals.games += 1;
    totals.goals += stat.goals;

    if (stat.result === "win") {
      totals.wins += 1;
    } else if (stat.result === "loss") {
      totals.losses += 1;
    } else if (stat.result === "draw") {
      totals.draws += 1;
    }
  }

  return totals;
}

export const STAFF_ROLES: UserRole[] = ["admin", "moderator"];

export const USER_ROLES: UserRole[] = ["admin", "moderator", "user"];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  moderator: "Moderator",
  user: "User",
};

export function isStaffRole(role: UserRole) {
  return STAFF_ROLES.includes(role);
}
