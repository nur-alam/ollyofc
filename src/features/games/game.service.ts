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
  GameResult,
  GameStatus,
  GameTeamBuild,
  GameTeamId,
  GameTeams,
} from "@/types/game";
import {
  canPlayerLeaveGame,
  DEFAULT_TEAM_NAMES,
  GAME_LOCATIONS,
  getResultWinner,
} from "@/types/game";
import type { TeamDealStep } from "@/features/games/buildTeams";
import type { UserProfile } from "@/types/user";

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
          : Date.now(),
    startedBy: typeof data.startedBy === "string" ? data.startedBy : "",
    dealOrder,
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

  return {
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
}

export async function startTeamBuild(
  gameId: string,
  dealOrder: TeamDealStep[],
  startedBy: string,
): Promise<void> {
  await updateDoc(doc(db, "games", gameId), {
    teamBuild: {
      startedAt: serverTimestamp(),
      startedAtMs: Date.now(),
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
}

export async function startGame(gameId: string, updatedBy: string): Promise<void> {
  const game = await getGameById(gameId);
  const result = game?.result ?? buildResult([], updatedBy);
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
}

export async function finishGame(gameId: string, updatedBy: string): Promise<void> {
  const game = await getGameById(gameId);
  const result = game?.result ?? buildResult([], updatedBy);

  await updateDoc(doc(db, "games", gameId), {
    status: "completed",
    result: {
      ...result,
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
      updatedBy,
    },
    updatedAt: serverTimestamp(),
  });
}

export async function addGameGoal(
  gameId: string,
  input: {
    teamId: GameTeamId;
    scorerId: string;
    scorerName: string;
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

  const goals = [
    ...(game.result?.goals ?? []),
    {
      id: createGoalId(),
      teamId: input.teamId,
      scorerId: input.scorerId,
      scorerName: input.scorerName,
      createdBy: input.createdBy,
      createdAtMs: Date.now(),
    },
  ];
  const result = buildResult(goals, input.createdBy);

  await updateDoc(doc(db, "games", gameId), {
    result: {
      ...result,
      updatedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
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
}

export async function deleteGame(gameId: string): Promise<void> {
  const participants = await getDocs(collection(db, "games", gameId, "participants"));
  const batch = writeBatch(db);

  participants.docs.forEach((participant) => {
    batch.delete(participant.ref);
  });
  batch.delete(doc(db, "games", gameId));

  await batch.commit();
}

export { getErrorMessage };
