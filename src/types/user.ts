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
  assists: number;
};

export type PlayerStatTotals = {
  games: number;
  goals: number;
  assists: number;
  wins: number;
  losses: number;
  draws: number;
};

export const EMPTY_STAT_TOTALS: PlayerStatTotals = {
  games: 0,
  goals: 0,
  assists: 0,
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
  const stat: PlayerGameStat = {
    goals: parseCount(data.goals),
    assists: parseCount(data.assists),
  };

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

export function parseStatTotals(value: unknown): PlayerStatTotals {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_STAT_TOTALS };
  }

  const data = value as Record<string, unknown>;

  return {
    games: parseCount(data.games),
    goals: parseCount(data.goals),
    assists: parseCount(data.assists),
    wins: parseCount(data.wins),
    losses: parseCount(data.losses),
    draws: parseCount(data.draws),
  };
}

export function totalsFromContribution(
  stat: PlayerGameStat | undefined,
): PlayerStatTotals {
  if (!stat) {
    return { ...EMPTY_STAT_TOTALS };
  }

  return {
    games: 1,
    goals: stat.goals,
    assists: stat.assists,
    wins: stat.result === "win" ? 1 : 0,
    losses: stat.result === "loss" ? 1 : 0,
    draws: stat.result === "draw" ? 1 : 0,
  };
}

export function addStatTotals(
  left: PlayerStatTotals,
  right: PlayerStatTotals,
): PlayerStatTotals {
  return {
    games: Math.max(0, left.games + right.games),
    goals: Math.max(0, left.goals + right.goals),
    assists: Math.max(0, left.assists + right.assists),
    wins: Math.max(0, left.wins + right.wins),
    losses: Math.max(0, left.losses + right.losses),
    draws: Math.max(0, left.draws + right.draws),
  };
}

export function applyStatDelta(
  current: PlayerStatTotals,
  previous: PlayerGameStat | undefined,
  next: PlayerGameStat | undefined,
): PlayerStatTotals {
  const previousTotals = totalsFromContribution(previous);

  return addStatTotals(
    addStatTotals(current, {
      games: -previousTotals.games,
      goals: -previousTotals.goals,
      assists: -previousTotals.assists,
      wins: -previousTotals.wins,
      losses: -previousTotals.losses,
      draws: -previousTotals.draws,
    }),
    totalsFromContribution(next),
  );
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
