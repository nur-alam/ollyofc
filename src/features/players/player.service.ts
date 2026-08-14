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
  updateDoc,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { getErrorMessage } from "@/lib/errors";
import type { UserProfile } from "@/types/user";
import type { Player, PlayerCategory, PlayerInput, PlayerPosition } from "@/types/player";
import { mapUserProfile } from "@/features/auth/auth.service";

function parseCategory(value: unknown): PlayerCategory {
  if (value === "A" || value === "B" || value === "C" || value === "GK") {
    return value;
  }

  return "B";
}

function parsePosition(value: unknown): PlayerPosition {
  if (
    value === "goalkeeper" ||
    value === "defender" ||
    value === "midfielder" ||
    value === "forward"
  ) {
    return value;
  }

  return "midfielder";
}

export function mapPlayer(id: string, data: DocumentData): Player {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : undefined,
    name: typeof data.name === "string" ? data.name : "Unnamed player",
    photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
    category: parseCategory(data.category),
    position: parsePosition(data.position),
    isActive: typeof data.isActive === "boolean" ? data.isActive : true,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeToPlayers(
  onData: (players: Player[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const playersQuery = query(collection(db, "players"), orderBy("name"));

  return onSnapshot(
    playersQuery,
    (snapshot) => {
      const players = snapshot.docs.map((playerDoc) =>
        mapPlayer(playerDoc.id, playerDoc.data()),
      );
      onData(players);
    },
    (error) => {
      onData([]);
      onError?.(getErrorMessage(error, "Could not load players."));
    },
  );
}

export async function getPlayerById(playerId: string): Promise<Player | null> {
  const snapshot = await getDoc(doc(db, "players", playerId));

  if (!snapshot.exists()) {
    return null;
  }

  return mapPlayer(snapshot.id, snapshot.data());
}

async function syncPlayerUserLink(
  playerId: string,
  previousUserId: string | undefined,
  nextUserId: string | undefined,
) {
  const batch = writeBatch(db);
  const playerRef = doc(db, "players", playerId);

  batch.update(playerRef, {
    userId: nextUserId ?? deleteField(),
    updatedAt: serverTimestamp(),
  });

  if (previousUserId && previousUserId !== nextUserId) {
    batch.update(doc(db, "users", previousUserId), {
      playerId: deleteField(),
      updatedAt: serverTimestamp(),
    });
  }

  if (nextUserId) {
    batch.update(doc(db, "users", nextUserId), {
      playerId,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function createPlayer(input: PlayerInput): Promise<Player> {
  const docRef = await addDoc(collection(db, "players"), {
    name: input.name.trim(),
    photoURL: input.photoURL?.trim() || "",
    category: input.category,
    position: input.position,
    isActive: input.isActive,
    ...(input.userId ? { userId: input.userId } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (input.userId) {
    await syncPlayerUserLink(docRef.id, undefined, input.userId);
  }

  const created = await getDoc(docRef);
  return mapPlayer(created.id, created.data() ?? {});
}

export async function updatePlayer(
  playerId: string,
  input: PlayerInput,
  previousUserId?: string,
): Promise<Player> {
  const playerRef = doc(db, "players", playerId);

  await updateDoc(playerRef, {
    name: input.name.trim(),
    photoURL: input.photoURL?.trim() || "",
    category: input.category,
    position: input.position,
    isActive: input.isActive,
    updatedAt: serverTimestamp(),
  });

  const nextUserId = input.userId || undefined;

  if (previousUserId !== nextUserId) {
    await syncPlayerUserLink(playerId, previousUserId, nextUserId);
  }

  const updated = await getDoc(playerRef);
  return mapPlayer(updated.id, updated.data() ?? {});
}

export async function deletePlayer(playerId: string): Promise<void> {
  const player = await getPlayerById(playerId);

  if (!player) {
    return;
  }

  if (player.userId) {
    await syncPlayerUserLink(playerId, player.userId, undefined);
  }

  await deleteDoc(doc(db, "players", playerId));
}

export async function setPlayerActive(
  playerId: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, "players", playerId), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

export async function listLinkableUsers(
  currentUserId?: string,
): Promise<UserProfile[]> {
  const snapshot = await getDocs(collection(db, "users"));

  return snapshot.docs
    .map((userDoc) => mapUserProfile(userDoc.id, userDoc.data()))
    .filter((user) => !user.playerId || user.id === currentUserId)
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export { getErrorMessage };
