import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { getErrorMessage } from "@/lib/errors";
import type { Game, GameInput, GameParticipant, GameStatus } from "@/types/game";
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
    location: typeof data.location === "string" ? data.location : "Office Field",
    status: parseStatus(data.status),
    maxPlayers,
    matchDurationMinutes:
      typeof data.matchDurationMinutes === "number" ? data.matchDurationMinutes : 90,
    notes: typeof data.notes === "string" && data.notes.trim() ? data.notes : undefined,
    teamCount: 2,
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
  const date = new Date(`${input.date}T00:00:00`);
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

export function mapParticipant(id: string, data: DocumentData): GameParticipant {
  return {
    userId: typeof data.userId === "string" ? data.userId : id,
    displayName: typeof data.displayName === "string" ? data.displayName : "Player",
    photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
    position: typeof data.position === "string" ? data.position : "",
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
  await setDoc(doc(db, "games", gameId, "participants", user.id), {
    userId: user.id,
    displayName: user.displayName,
    photoURL: user.photoURL || "",
    position: user.position || "",
    joinedBy,
    joinedAt: serverTimestamp(),
  });
}

export async function leaveGame(gameId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, "games", gameId, "participants", userId));
}

export { getErrorMessage };
