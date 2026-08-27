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

export const TOSS_DURATION_MS = 5000;

export type GameToss = {
  winner: GameTeamId;
  spins: number;
  startedAtMs: number;
  startedBy: string;
};

export type GameResultWinner = GameTeamId | "draw";

/**
 * `player` credits a named scorer, `team` credits the team when the scorer is
 * unknown, and `own` credits the opponent of the team that put it in their net.
 */
export type GameGoalKind = "player" | "team" | "own";

export type GameGoal = {
  id: string;
  /** Team the goal counts for, including for own goals. */
  teamId: GameTeamId;
  /** Missing on goals recorded before goal kinds existed. */
  kind?: GameGoalKind;
  scorerId?: string;
  scorerName?: string;
  assistId?: string;
  assistName?: string;
  /**
   * Player who put an own goal into their own net. Kept apart from `scorerId`
   * so it never counts towards their goals in tallies or career stats.
   */
  ownGoalById?: string;
  ownGoalByName?: string;
  createdBy: string;
  createdAtMs: number;
};

export const GAME_GOAL_KINDS: GameGoalKind[] = ["player", "team", "own"];

export const GAME_GOAL_KIND_LABELS: Record<GameGoalKind, string> = {
  player: "Player goal",
  team: "Team goal",
  own: "Own goal",
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
  toss?: GameToss;
  result?: GameResult;
  startedAt?: Timestamp;
  startedAtMs?: number;
  kickoffReminderSentForMs?: number;
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

/** Teams stay rearrangeable until the match is finished. */
export function canSwapGameTeams(game: Pick<Game, "status">) {
  return game.status !== "completed" && game.status !== "cancelled";
}

export function getOpponentTeamId(teamId: GameTeamId): GameTeamId {
  return teamId === "a" ? "b" : "a";
}

export function getGoalKind(goal: GameGoal): GameGoalKind {
  return goal.kind ?? (goal.scorerId ? "player" : "team");
}

export function isOwnGoal(goal: GameGoal) {
  return getGoalKind(goal) === "own";
}

/** The team that scored into their own net, i.e. the opponent of the credited team. */
export function getOwnGoalConcededBy(goal: GameGoal) {
  return getOpponentTeamId(goal.teamId);
}

export function getTeamName(game: Game, teamId: GameTeamId) {
  const name = game.teams?.[teamId]?.name?.trim();
  return name || DEFAULT_TEAM_NAMES[teamId];
}

export function isTossFlipping(toss: GameToss | undefined, now = getServerNow()) {
  if (!toss) {
    return false;
  }

  return now.getTime() - toss.startedAtMs < TOSS_DURATION_MS;
}

export function isTossLanded(toss: GameToss | undefined, now = getServerNow()) {
  if (!toss) {
    return false;
  }

  return now.getTime() - toss.startedAtMs >= TOSS_DURATION_MS;
}

export function getTossRotationDeg(toss: GameToss, nowMs: number) {
  const elapsed = Math.max(0, nowMs - toss.startedAtMs);
  const progress = Math.min(1, elapsed / TOSS_DURATION_MS);
  const eased = 1 - (1 - progress) ** 3;
  const endDeg = toss.spins * 360 + (toss.winner === "b" ? 180 : 0);

  return endDeg * eased;
}

export function shouldShowLiveToss(game: Game) {
  return Boolean(game.toss) && game.status === "upcoming";
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

export function hasKickoffPassed(game: Pick<Game, "date" | "startTime">, now = getServerNow()) {
  return getGameStartAt(game).getTime() <= now.getTime();
}

export function getMatchClockStartMs(
  game: Pick<Game, "date" | "startTime" | "startedAtMs">,
) {
  if (typeof game.startedAtMs === "number" && game.startedAtMs > 0) {
    return game.startedAtMs;
  }

  return getGameStartAt(game).getTime();
}

export function getGameEndAt(
  game: Pick<Game, "date" | "startTime" | "matchDurationMinutes" | "startedAtMs">,
) {
  return new Date(
    getMatchClockStartMs(game) + game.matchDurationMinutes * 60 * 1000,
  );
}

export function hasMatchEnded(game: Game, now = getServerNow()) {
  if (game.status === "completed") {
    return true;
  }

  if (game.status === "cancelled") {
    return false;
  }

  return now.getTime() >= getGameEndAt(game).getTime();
}

export function isGameInPlay(game: Game, now = getServerNow()) {
  if (game.status === "cancelled" || game.status === "completed") {
    return false;
  }

  const time = now.getTime();
  const startMs = game.status === "active" ? getMatchClockStartMs(game) : getGameStartAt(game).getTime();
  const endMs =
    game.status === "active"
      ? getGameEndAt(game).getTime()
      : getGameStartAt(game).getTime() + game.matchDurationMinutes * 60 * 1000;

  return time >= startMs && time < endMs;
}

export function isMatchClockRunning(game: Game, now = getServerNow()) {
  return game.status === "active" && isGameInPlay(game, now);
}

export function canRecordGameGoals(game: Game) {
  return game.status === "active";
}

/**
 * Staff can pull a player off the roster until the match is finished. Keyed on
 * the Firestore status, not the clock, so the window between the clock running
 * out and Finish being tapped still allows corrections.
 */
export function canRemoveGamePlayers(game: Game) {
  return game.status !== "completed" && game.status !== "cancelled";
}

export function hasGameHappened(game: Game, now = getServerNow()) {
  if (game.status === "cancelled") {
    return false;
  }

  if (game.status === "completed" || game.status === "active") {
    return true;
  }

  return hasKickoffPassed(game, now);
}

export function isUpcomingGame(game: Game, now = getServerNow()) {
  return !hasGameHappened(game, now) && game.status !== "cancelled";
}

export function getLastFinishedGame(games: Game[], now = getServerNow()) {
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

export function canShowGameResult(game: Game, now = getServerNow()) {
  return hasGameHappened(game, now);
}

export function canUpdateGameResult(game: Game, now = getServerNow()) {
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

export type PlayerGoalTally = {
  scorerId: string;
  scorerName: string;
  /** Player goals only; own goals and team goals are excluded. */
  count: number;
  assists: number;
};

function bumpPlayerTally(
  counts: Map<string, PlayerGoalTally>,
  playerId: string,
  playerName: string,
  field: "count" | "assists",
) {
  const current = counts.get(playerId);

  if (current) {
    current[field] += 1;
    return;
  }

  counts.set(playerId, {
    scorerId: playerId,
    scorerName: playerName || "Player",
    count: field === "count" ? 1 : 0,
    assists: field === "assists" ? 1 : 0,
  });
}

export function getPlayerGoalCounts(goals: GameGoal[]) {
  const counts = new Map<string, PlayerGoalTally>();

  for (const goal of goals) {
    if (getGoalKind(goal) !== "player") {
      continue;
    }

    if (goal.scorerId) {
      bumpPlayerTally(counts, goal.scorerId, goal.scorerName || "Player", "count");
    }

    if (goal.assistId) {
      bumpPlayerTally(counts, goal.assistId, goal.assistName || "Player", "assists");
    }
  }

  return [...counts.values()].sort(
    (left, right) =>
      right.count - left.count ||
      right.assists - left.assists ||
      left.scorerName.localeCompare(right.scorerName),
  );
}

export type TeamGoalTally = {
  key: string;
  scorerId?: string;
  scorerName?: string;
  assistId?: string;
  assistName?: string;
  count: number;
  goalIds: string[];
};

/**
 * A team's goals grouped into one row per scorer and assist pairing. Own goals
 * are left out; they belong to their own list.
 */
export function getTeamGoalTallies(
  goals: GameGoal[],
  teamId: GameTeamId,
): TeamGoalTally[] {
  const tallies = new Map<string, TeamGoalTally>();

  for (const goal of goals) {
    if (goal.teamId !== teamId || isOwnGoal(goal)) {
      continue;
    }

    const key = `${goal.scorerId || "team"}:${goal.assistId || ""}`;
    const current = tallies.get(key);

    if (current) {
      current.count += 1;
      current.goalIds.push(goal.id);
      continue;
    }

    const tally: TeamGoalTally = {
      key,
      count: 1,
      goalIds: [goal.id],
    };

    if (goal.scorerId) {
      tally.scorerId = goal.scorerId;
      tally.scorerName = goal.scorerName || "Player";
    }

    if (goal.assistId) {
      tally.assistId = goal.assistId;
      tally.assistName = goal.assistName || "Player";
    }

    tallies.set(key, tally);
  }

  return [...tallies.values()].sort((left, right) => right.count - left.count);
}

export type OwnGoalTally = {
  key: string;
  /** Team the own goals count for. */
  teamId: GameTeamId;
  concededBy: GameTeamId;
  playerId?: string;
  playerName?: string;
  count: number;
  goalIds: string[];
};

/** Repeat own goals by the same player collapse into a single counted row. */
export function getOwnGoalTallies(goals: GameGoal[]): OwnGoalTally[] {
  const tallies = new Map<string, OwnGoalTally>();

  for (const goal of goals) {
    if (!isOwnGoal(goal)) {
      continue;
    }

    const key = `${goal.teamId}:${goal.ownGoalById || "unknown"}`;
    const current = tallies.get(key);

    if (current) {
      current.count += 1;
      current.goalIds.push(goal.id);
      continue;
    }

    const tally: OwnGoalTally = {
      key,
      teamId: goal.teamId,
      concededBy: getOwnGoalConcededBy(goal),
      count: 1,
      goalIds: [goal.id],
    };

    if (goal.ownGoalById) {
      tally.playerId = goal.ownGoalById;
      tally.playerName = goal.ownGoalByName || "Player";
    }

    tallies.set(key, tally);
  }

  return [...tallies.values()].sort((left, right) => right.count - left.count);
}

const SELF_LEAVE_LOCKOUT_MS = 60 * 60 * 1000;

export function canPlayerLeaveGame(game: Game, now = getServerNow()) {
  if (!isUpcomingGame(game, now)) {
    return false;
  }

  return getGameStartAt(game).getTime() - now.getTime() > SELF_LEAVE_LOCKOUT_MS;
}

export function getGameListBadge(game: Game, now = getServerNow()): GameStatus {
  if (game.status === "cancelled") {
    return "cancelled";
  }

  const time = now.getTime();
  const scheduledStart = getGameStartAt(game).getTime();
  const kickedOff = typeof game.startedAtMs === "number" && game.startedAtMs > 0;
  const startMs = kickedOff ? getMatchClockStartMs(game) : scheduledStart;
  const endMs = kickedOff
    ? getGameEndAt(game).getTime()
    : scheduledStart + game.matchDurationMinutes * 60 * 1000;

  if (time >= endMs) {
    return "completed";
  }

  if (time >= startMs) {
    return "active";
  }

  return "upcoming";
}

export const GAME_PLAY_STATUSES = ["active", "completed"] as const;

export type GamePlayStatus = (typeof GAME_PLAY_STATUSES)[number];

export const GAME_PLAY_STATUS_LABELS: Record<GamePlayStatus, string> = {
  active: "Active",
  completed: "Completed",
};

export function canChangeGamePlayStatus(game: Game) {
  return game.status === "active" || game.status === "completed";
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
  game: Pick<Game, "date" | "startTime" | "matchDurationMinutes" | "startedAtMs">,
  now = getServerNow(),
) {
  const startMs = getMatchClockStartMs(game);
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

export function sortGames(games: Game[], now = getServerNow()) {
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
