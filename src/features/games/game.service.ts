import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { getErrorMessage } from "@/lib/errors";
import { getServerNowMs, syncServerClock } from "@/lib/clock";
import { bangladeshDateTimeToUtc } from "@/lib/timezone";
import { parsePosition } from "@/types/player";
import type {
  Game,
  GameGoal,
  GameInput,
  GameParticipant,
  GamePlayStatus,
  GameResult,
  GameStatus,
  GameTeamBuild,
  GameTeamId,
  GameTeams,
  GameToss,
} from "@/types/game";
import {
  canPlayerLeaveGame,
  DEFAULT_TEAM_NAMES,
  GAME_LOCATIONS,
  getResultWinner,
  isTossLanded,
} from "@/types/game";
import {
  buildGameStatContributions,
  isSamePlayerGameStat,
} from "@/features/games/playerStats";
import type { TeamDealStep } from "@/features/games/buildTeams";
import {
  addStatTotals,
  applyStatDelta,
  EMPTY_STAT_TOTALS,
  parseStatGames,
  parseStatTotals,
  totalsFromContribution,
} from "@/types/user";
import type { PlayerGameStat, PlayerStatTotals, UserProfile } from "@/types/user";

function parseStatus(value: unknown): GameStatus {
  if (
    value === "draft" ||
    value === "upcoming" ||
    value === "active" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "upcoming";
}

function parseDate(value: unknown) {
  if (value instanceof Timestamp) {
    return value;
  }

  return Timestamp.fromDate(new Date());
}

function mapTeamName(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function mapTeams(value: unknown): GameTeams | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const data = value as DocumentData;
  const teamA = data.a;
  const teamB = data.b;

  if (!teamA || !teamB || typeof teamA !== "object" || typeof teamB !== "object") {
    return undefined;
  }

  return {
    a: { name: mapTeamName((teamA as DocumentData).name, DEFAULT_TEAM_NAMES.a) },
    b: { name: mapTeamName((teamB as DocumentData).name, DEFAULT_TEAM_NAMES.b) },
    generatedAt: data.generatedAt,
    generatedBy: typeof data.generatedBy === "string" ? data.generatedBy : undefined,
  };
}

function mapTeamId(value: unknown): GameTeamId | undefined {
  return value === "a" || value === "b" ? value : undefined;
}

function mapTeamBuild(value: unknown): GameTeamBuild | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const data = value as DocumentData;
  const dealOrder = Array.isArray(data.dealOrder)
    ? data.dealOrder.flatMap((item) => {
        if (!item || typeof item !== "object") {
          return [];
        }

        const step = item as DocumentData;
        const teamId = mapTeamId(step.teamId);

        if (typeof step.userId !== "string" || !teamId) {
          return [];
        }

        return [{ userId: step.userId, teamId }];
      })
    : [];

  if (!dealOrder.length) {
    return undefined;
  }

  return {
    startedAt: data.startedAt instanceof Timestamp ? data.startedAt : undefined,
    startedAtMs:
      typeof data.startedAtMs === "number" && Number.isFinite(data.startedAtMs)
        ? data.startedAtMs
        : data.startedAt instanceof Timestamp
          ? data.startedAt.toMillis()
          : 0,
    startedBy: typeof data.startedBy === "string" ? data.startedBy : "",
    dealOrder,
  };
}

function mapToss(value: unknown): GameToss | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const data = value as DocumentData;
  const winner = mapTeamId(data.winner);

  if (!winner) {
    return undefined;
  }

  return {
    winner,
    spins:
      typeof data.spins === "number" && Number.isFinite(data.spins) && data.spins > 0
        ? data.spins
        : 6,
    startedAtMs:
      typeof data.startedAtMs === "number" && Number.isFinite(data.startedAtMs)
        ? data.startedAtMs
        : 0,
    startedBy: typeof data.startedBy === "string" ? data.startedBy : "",
  };
}

function mapGoal(value: unknown): GameGoal | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as DocumentData;
  const teamId = mapTeamId(data.teamId);

  if (
    typeof data.id !== "string" ||
    !teamId ||
    typeof data.scorerId !== "string" ||
    typeof data.scorerName !== "string"
  ) {
    return null;
  }

  const goal: GameGoal = {
    id: data.id,
    teamId,
    scorerId: data.scorerId,
    scorerName: data.scorerName,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    createdAtMs:
      typeof data.createdAtMs === "number" && Number.isFinite(data.createdAtMs)
        ? data.createdAtMs
        : 0,
  };

  if (typeof data.assistId === "string" && data.assistId) {
    goal.assistId = data.assistId;
    goal.assistName =
      typeof data.assistName === "string" && data.assistName
        ? data.assistName
        : "Player";
  }

  return goal;
}

function mapResult(value: unknown): GameResult | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const data = value as DocumentData;
  const goals = Array.isArray(data.goals)
    ? data.goals.flatMap((item) => {
        const goal = mapGoal(item);
        return goal ? [goal] : [];
      })
    : [];
  const scoreA =
    typeof data.a === "number" && Number.isFinite(data.a)
      ? data.a
      : goals.filter((goal) => goal.teamId === "a").length;
  const scoreB =
    typeof data.b === "number" && Number.isFinite(data.b)
      ? data.b
      : goals.filter((goal) => goal.teamId === "b").length;
  const winner =
    data.winner === "a" || data.winner === "b" || data.winner === "draw"
      ? data.winner
      : getResultWinner(scoreA, scoreB);

  return {
    a: scoreA,
    b: scoreB,
    winner,
    goals,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
    updatedAtMs:
      typeof data.updatedAtMs === "number" && Number.isFinite(data.updatedAtMs)
        ? data.updatedAtMs
        : data.updatedAt instanceof Timestamp
          ? data.updatedAt.toMillis()
          : 0,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : "",
  };
}

function createGoalId() {
  return globalThis.crypto?.randomUUID?.() ?? `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildResult(goals: GameGoal[], updatedBy: string): Omit<GameResult, "updatedAt"> {
  const a = goals.filter((goal) => goal.teamId === "a").length;
  const b = goals.filter((goal) => goal.teamId === "b").length;

  return {
    a,
    b,
    winner: getResultWinner(a, b),
    goals,
    updatedAtMs: Date.now(),
    updatedBy,
  };
}

export function mapGame(id: string, data: DocumentData): Game {
  const maxPlayers =
    typeof data.maxPlayers === "number" && data.maxPlayers > 0
      ? data.maxPlayers
      : undefined;

  return {
    id,
    title: typeof data.title === "string" && data.title.trim() ? data.title : undefined,
    date: parseDate(data.date),
    startTime: typeof data.startTime === "string" ? data.startTime : "18:00",
    location: typeof data.location === "string" ? data.location : GAME_LOCATIONS[0],
    status: parseStatus(data.status),
    maxPlayers,
    matchDurationMinutes:
      typeof data.matchDurationMinutes === "number" ? data.matchDurationMinutes : 90,
    notes: typeof data.notes === "string" && data.notes.trim() ? data.notes : undefined,
    teamCount: 2,
    teams: mapTeams(data.teams),
    teamBuild: mapTeamBuild(data.teamBuild),
    toss: mapToss(data.toss),
    result: mapResult(data.result),
    startedAt: data.startedAt,
    startedAtMs: typeof data.startedAtMs === "number" ? data.startedAtMs : undefined,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeToGames(
  onData: (games: Game[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const gamesQuery = query(collection(db, "games"), orderBy("date", "desc"));

  return onSnapshot(
    gamesQuery,
    (snapshot) => {
      onData(snapshot.docs.map((gameDoc) => mapGame(gameDoc.id, gameDoc.data())));
    },
    (error) => {
      onData([]);
      onError?.(getErrorMessage(error, "Could not load games."));
    },
  );
}

export function subscribeToGame(
  gameId: string,
  onData: (game: Game | null) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "games", gameId),
    (snapshot) => {
      onData(snapshot.exists() ? mapGame(snapshot.id, snapshot.data()) : null);
    },
    (error) => {
      onData(null);
      onError?.(getErrorMessage(error, "Could not load this game."));
    },
  );
}

export async function getGameById(gameId: string): Promise<Game | null> {
  const snapshot = await getDoc(doc(db, "games", gameId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapGame(snapshot.id, snapshot.data());
}

export async function createGame(
  input: GameInput,
  createdBy: string,
): Promise<Game> {
  const date = bangladeshDateTimeToUtc(input.date, "00:00");
  const docRef = await addDoc(collection(db, "games"), {
    title: input.title?.trim() || "",
    date: Timestamp.fromDate(date),
    startTime: input.startTime,
    location: input.location.trim(),
    status: "upcoming",
    maxPlayers: input.maxPlayers ? Math.round(input.maxPlayers) : 0,
    matchDurationMinutes: Math.round(input.matchDurationMinutes),
    notes: input.notes?.trim() || "",
    teamCount: 2,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const created = await getDoc(docRef);
  return mapGame(created.id, created.data() ?? {});
}

export async function updateGame(gameId: string, input: GameInput): Promise<void> {
  const date = bangladeshDateTimeToUtc(input.date, "00:00");

  await updateDoc(doc(db, "games", gameId), {
    title: input.title?.trim() || "",
    date: Timestamp.fromDate(date),
    startTime: input.startTime,
    location: input.location.trim(),
    maxPlayers: input.maxPlayers ? Math.round(input.maxPlayers) : 0,
    matchDurationMinutes: Math.round(input.matchDurationMinutes),
    notes: input.notes?.trim() || "",
    updatedAt: serverTimestamp(),
  });
}

export function mapParticipant(id: string, data: DocumentData): GameParticipant {
  return {
    userId: typeof data.userId === "string" ? data.userId : id,
    displayName: typeof data.displayName === "string" ? data.displayName : "Player",
    photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
    position: typeof data.position === "string" ? data.position : "",
    teamId: mapTeamId(data.teamId),
    joinedBy: typeof data.joinedBy === "string" ? data.joinedBy : "",
    joinedAt: data.joinedAt,
  };
}

/**
 * Recomputes what this game contributes to every player's career stats and
 * writes only the difference against what was applied last time.
 *
 * Safe to call repeatedly: running it twice in a row is a no-op, so a double
 * tap on Finish cannot double-count, and it doubles as a repair tool when a
 * post-finish swap, added player, or edited goal changes the outcome.
 *
 * Pass `forceEmpty` to strip the game's contribution entirely (used before
 * deleting a game, while its participants are still readable).
 */
export async function syncGameStats(
  gameId: string,
  options?: { forceEmpty?: boolean },
): Promise<void> {
  const gameRef = doc(db, "games", gameId);
  const gameSnapshot = await getDoc(gameRef);

  if (!gameSnapshot.exists()) {
    return;
  }

  const data = gameSnapshot.data();
  const applied = parseStatGames(
    (data.statsApplied as DocumentData | undefined)?.players,
  );
  const game = mapGame(gameSnapshot.id, data);

  let next: Record<string, PlayerGameStat> = {};

  if (!options?.forceEmpty && game.status === "completed") {
    const participants = await getDocs(
      collection(db, "games", gameId, "participants"),
    );

    next = buildGameStatContributions(
      game,
      participants.docs.map((item) => mapParticipant(item.id, item.data())),
    );
  }

  const affected = [
    ...new Set([...Object.keys(applied), ...Object.keys(next)]),
  ].filter((userId) => !isSamePlayerGameStat(applied[userId], next[userId]));

  if (!affected.length) {
    return;
  }

  const userSnapshots = await Promise.all(
    affected.map((userId) => getDoc(doc(db, "users", userId))),
  );
  const batch = writeBatch(db);

  userSnapshots.forEach((snapshot, index) => {
    if (!snapshot.exists()) {
      return;
    }

    const userId = affected[index];

    batch.update(snapshot.ref, {
      stats: applyStatDelta(
        parseStatTotals(snapshot.data().stats),
        applied[userId],
        next[userId],
      ),
      statGames: deleteField(),
      updatedAt: serverTimestamp(),
    });
  });

  batch.update(gameRef, {
    statsApplied: { players: next, at: serverTimestamp() },
  });

  await batch.commit();
}

const STAT_WRITE_CHUNK = 400;

/** Rebuilds every player's totals from completed games. Returns games processed. */
export async function syncAllGameStats(
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const [games, users] = await Promise.all([
    getDocs(collection(db, "games")),
    getDocs(collection(db, "users")),
  ]);

  const totalsByUser = new Map<string, PlayerStatTotals>();
  const appliedByGame = new Map<string, Record<string, PlayerGameStat>>();

  let done = 0;

  for (const gameDoc of games.docs) {
    const game = mapGame(gameDoc.id, gameDoc.data());
    let next: Record<string, PlayerGameStat> = {};

    if (game.status === "completed") {
      const participants = await getDocs(
        collection(db, "games", game.id, "participants"),
      );

      next = buildGameStatContributions(
        game,
        participants.docs.map((item) => mapParticipant(item.id, item.data())),
      );

      for (const [userId, stat] of Object.entries(next)) {
        totalsByUser.set(
          userId,
          addStatTotals(
            totalsByUser.get(userId) ?? { ...EMPTY_STAT_TOTALS },
            totalsFromContribution(stat),
          ),
        );
      }
    }

    appliedByGame.set(game.id, next);
    done += 1;
    onProgress?.(done, games.size);
  }

  const writes: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  users.docs.forEach((userDoc) => {
    writes.push((batch) => {
      batch.update(userDoc.ref, {
        stats: totalsByUser.get(userDoc.id) ?? { ...EMPTY_STAT_TOTALS },
        statGames: deleteField(),
        updatedAt: serverTimestamp(),
      });
    });
  });

  games.docs.forEach((gameDoc) => {
    writes.push((batch) => {
      batch.update(gameDoc.ref, {
        statsApplied: {
          players: appliedByGame.get(gameDoc.id) ?? {},
          at: serverTimestamp(),
        },
      });
    });
  });

  for (let index = 0; index < writes.length; index += STAT_WRITE_CHUNK) {
    const batch = writeBatch(db);
    writes.slice(index, index + STAT_WRITE_CHUNK).forEach((write) => write(batch));
    await batch.commit();
  }

  return games.size;
}

export function subscribeToParticipants(
  gameId: string,
  onData: (participants: GameParticipant[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "games", gameId, "participants"),
    (snapshot) => {
      const participants = snapshot.docs
        .map((item) => mapParticipant(item.id, item.data()))
        .sort((left, right) => left.displayName.localeCompare(right.displayName));
      onData(participants);
    },
    (error) => {
      onData([]);
      onError?.(getErrorMessage(error, "Could not load players for this game."));
    },
  );
}

export async function joinGame(
  gameId: string,
  user: UserProfile,
  joinedBy: string,
): Promise<void> {
  const latest = await getDoc(doc(db, "users", user.id));
  const latestData = latest.exists() ? latest.data() : undefined;
  const position =
    parsePosition(latestData?.position ?? latestData?.Position) ||
    user.position ||
    "";

  await setDoc(doc(db, "games", gameId, "participants", user.id), {
    userId: user.id,
    displayName:
      (typeof latestData?.displayName === "string" && latestData.displayName) ||
      user.displayName,
    photoURL:
      (typeof latestData?.photoURL === "string" && latestData.photoURL) ||
      user.photoURL ||
      "",
    position,
    joinedBy,
    joinedAt: serverTimestamp(),
  });

  await syncGameStats(gameId);
}

export async function leaveGame(
  gameId: string,
  userId: string,
  options?: { bypassLeaveLock?: boolean },
): Promise<void> {
  if (!options?.bypassLeaveLock) {
    const game = await getGameById(gameId);

    if (game && !canPlayerLeaveGame(game)) {
      throw new Error("Could not leave this game.");
    }
  }

  await deleteDoc(doc(db, "games", gameId, "participants", userId));
  await syncGameStats(gameId);
}

export async function saveGeneratedTeams(
  gameId: string,
  assignments: Record<string, GameTeamId>,
  generatedBy: string,
  names?: { a: string; b: string },
): Promise<void> {
  const participants = await getDocs(collection(db, "games", gameId, "participants"));
  const batch = writeBatch(db);

  batch.update(doc(db, "games", gameId), {
    teams: {
      a: { name: names?.a?.trim() || DEFAULT_TEAM_NAMES.a },
      b: { name: names?.b?.trim() || DEFAULT_TEAM_NAMES.b },
      generatedAt: serverTimestamp(),
      generatedBy,
    },
    teamBuild: deleteField(),
    updatedAt: serverTimestamp(),
  });

  participants.docs.forEach((participant) => {
    const teamId = assignments[participant.id];

    if (teamId) {
      batch.update(participant.ref, { teamId });
    }
  });

  await batch.commit();
  await syncGameStats(gameId);
}

export async function renameGameTeam(
  gameId: string,
  teamId: GameTeamId,
  name: string,
): Promise<void> {
  await updateDoc(doc(db, "games", gameId), {
    [`teams.${teamId}.name`]: name.trim() || DEFAULT_TEAM_NAMES[teamId],
    updatedAt: serverTimestamp(),
  });
}

export async function moveParticipantTeam(
  gameId: string,
  userId: string,
  teamId: GameTeamId,
): Promise<void> {
  await updateDoc(doc(db, "games", gameId, "participants", userId), { teamId });
  await syncGameStats(gameId);
}

export async function startTeamBuild(
  gameId: string,
  dealOrder: TeamDealStep[],
  startedBy: string,
): Promise<void> {
  await syncServerClock();
  const startedAtMs = getServerNowMs();

  await updateDoc(doc(db, "games", gameId), {
    teamBuild: {
      startedAt: serverTimestamp(),
      startedAtMs,
      startedBy,
      dealOrder,
    },
    updatedAt: serverTimestamp(),
  });
}

export async function cancelTeamBuild(gameId: string): Promise<void> {
  await updateDoc(doc(db, "games", gameId), {
    teamBuild: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function clearGameTeams(gameId: string): Promise<void> {
  const participants = await getDocs(collection(db, "games", gameId, "participants"));
  const batch = writeBatch(db);

  batch.update(doc(db, "games", gameId), {
    teams: deleteField(),
    teamBuild: deleteField(),
    updatedAt: serverTimestamp(),
  });

  participants.docs.forEach((participant) => {
    batch.update(participant.ref, { teamId: deleteField() });
  });

  await batch.commit();
  await syncGameStats(gameId);
}

export async function startGameToss(gameId: string, startedBy: string): Promise<void> {
  const game = await getGameById(gameId);

  if (!game) {
    throw new Error("Game not found.");
  }

  if (game.status !== "upcoming") {
    throw new Error("This game cannot be tossed.");
  }

  if (game.toss) {
    return;
  }

  await syncServerClock();

  await updateDoc(doc(db, "games", gameId), {
    toss: {
      winner: Math.random() < 0.5 ? "a" : "b",
      spins: 12 + Math.floor(Math.random() * 4),
      startedAtMs: getServerNowMs(),
      startedBy,
    },
    updatedAt: serverTimestamp(),
  });
}

export async function startGame(gameId: string, updatedBy: string): Promise<void> {
  const game = await getGameById(gameId);

  if (!game) {
    throw new Error("Game not found.");
  }

  if (!isTossLanded(game.toss)) {
    throw new Error("Finish the coin toss before kick-off.");
  }

  const result = game.result ?? buildResult([], updatedBy);
  await syncServerClock();
  const startedAtMs = getServerNowMs();

  await updateDoc(doc(db, "games", gameId), {
    status: "active",
    startedAt: serverTimestamp(),
    startedAtMs,
    result: {
      ...result,
      updatedAt: serverTimestamp(),
      updatedAtMs: startedAtMs,
      updatedBy,
    },
    updatedAt: serverTimestamp(),
  });

  await syncGameStats(gameId);
}

export async function setGamePlayStatus(
  gameId: string,
  status: GamePlayStatus,
  updatedBy: string,
): Promise<void> {
  const game = await getGameById(gameId);

  if (!game) {
    throw new Error("Game not found.");
  }

  if (game.status !== "active" && game.status !== "completed") {
    throw new Error("Only active or completed games can change status.");
  }

  if (game.status === status) {
    return;
  }

  const result = game.result ?? buildResult([], updatedBy);

  await updateDoc(doc(db, "games", gameId), {
    status,
    result: {
      ...result,
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
      updatedBy,
    },
    updatedAt: serverTimestamp(),
  });

  await syncGameStats(gameId);
}

export async function finishGame(gameId: string, updatedBy: string): Promise<void> {
  await setGamePlayStatus(gameId, "completed", updatedBy);
}

export async function addGameGoal(
  gameId: string,
  input: {
    teamId: GameTeamId;
    scorerId: string;
    scorerName: string;
    assistId?: string;
    assistName?: string;
    createdBy: string;
  },
): Promise<void> {
  const game = await getGameById(gameId);

  if (!game) {
    throw new Error("This game could not be found.");
  }

  if (game.status !== "active") {
    throw new Error("Start the game before adding goals.");
  }

  if (input.assistId && input.assistId === input.scorerId) {
    throw new Error("A player cannot assist their own goal.");
  }

  const goal: GameGoal = {
    id: createGoalId(),
    teamId: input.teamId,
    scorerId: input.scorerId,
    scorerName: input.scorerName,
    createdBy: input.createdBy,
    createdAtMs: Date.now(),
  };

  if (input.assistId) {
    goal.assistId = input.assistId;
    goal.assistName = input.assistName?.trim() || "Player";
  }

  const goals = [...(game.result?.goals ?? []), goal];
  const result = buildResult(goals, input.createdBy);

  await updateDoc(doc(db, "games", gameId), {
    result: {
      ...result,
      updatedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  await syncGameStats(gameId);
}

export async function removeGameGoal(
  gameId: string,
  goalId: string,
  updatedBy: string,
): Promise<void> {
  const game = await getGameById(gameId);

  if (!game) {
    throw new Error("This game could not be found.");
  }

  const result = buildResult(
    (game.result?.goals ?? []).filter((goal) => goal.id !== goalId),
    updatedBy,
  );

  await updateDoc(doc(db, "games", gameId), {
    result: {
      ...result,
      updatedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  await syncGameStats(gameId);
}

export async function deleteGame(gameId: string): Promise<void> {
  await syncGameStats(gameId, { forceEmpty: true });

  const participants = await getDocs(collection(db, "games", gameId, "participants"));
  const batch = writeBatch(db);

  participants.docs.forEach((participant) => {
    batch.delete(participant.ref);
  });
  batch.delete(doc(db, "games", gameId));

  await batch.commit();
}

export { getErrorMessage };
