import {
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { PlayerPosition } from "@/types/player";

type SeedUser = {
  id: string;
  displayName: string;
  email: string;
  position: PlayerPosition;
};

const SEED_PORTRAITS = [
  11, 12, 15, 22, 33, 41, 45, 51, 60, 68, 70, 75, 77, 81, 85, 88, 91, 94,
];

function seedPhotoURL(index: number) {
  return `https://randomuser.me/api/portraits/men/${SEED_PORTRAITS[index]}.jpg`;
}

export const SEED_USERS: SeedUser[] = [
  { id: "seed-forward-1", displayName: "Rahim Khan", email: "seed.forward.1@ollyofc.test", position: "forward" },
  { id: "seed-forward-2", displayName: "Karim Hossain", email: "seed.forward.2@ollyofc.test", position: "forward" },
  { id: "seed-forward-3", displayName: "Shakib Ahmed", email: "seed.forward.3@ollyofc.test", position: "forward" },
  { id: "seed-forward-4", displayName: "Nayeem Islam", email: "seed.forward.4@ollyofc.test", position: "forward" },
  { id: "seed-forward-5", displayName: "Farhan Chowdhury", email: "seed.forward.5@ollyofc.test", position: "forward" },
  { id: "seed-midfielder-1", displayName: "Tanvir Hasan", email: "seed.midfielder.1@ollyofc.test", position: "midfielder" },
  { id: "seed-midfielder-2", displayName: "Arif Rahman", email: "seed.midfielder.2@ollyofc.test", position: "midfielder" },
  { id: "seed-midfielder-3", displayName: "Imran Kabir", email: "seed.midfielder.3@ollyofc.test", position: "midfielder" },
  { id: "seed-midfielder-4", displayName: "Samiul Haque", email: "seed.midfielder.4@ollyofc.test", position: "midfielder" },
  { id: "seed-midfielder-5", displayName: "Rafi Uddin", email: "seed.midfielder.5@ollyofc.test", position: "midfielder" },
  { id: "seed-defender-1", displayName: "Mahmudul Alam", email: "seed.defender.1@ollyofc.test", position: "defender" },
  { id: "seed-defender-2", displayName: "Javed Hossain", email: "seed.defender.2@ollyofc.test", position: "defender" },
  { id: "seed-defender-3", displayName: "Rubel Mia", email: "seed.defender.3@ollyofc.test", position: "defender" },
  { id: "seed-defender-4", displayName: "Adnan Sheikh", email: "seed.defender.4@ollyofc.test", position: "defender" },
  { id: "seed-defender-5", displayName: "Tareq Mahmud", email: "seed.defender.5@ollyofc.test", position: "defender" },
  { id: "seed-goalkeeper-1", displayName: "Sohel Rana", email: "seed.goalkeeper.1@ollyofc.test", position: "goalkeeper" },
  { id: "seed-goalkeeper-2", displayName: "Anik Das", email: "seed.goalkeeper.2@ollyofc.test", position: "goalkeeper" },
  { id: "seed-goalkeeper-3", displayName: "Liton Roy", email: "seed.goalkeeper.3@ollyofc.test", position: "goalkeeper" },
];

export async function seedTestUsers() {
  const batch = writeBatch(db);

  SEED_USERS.forEach((user, index) => {
    batch.set(doc(db, "users", user.id), {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: seedPhotoURL(index),
      role: "user",
      isActive: true,
      position: user.position,
      isSeed: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

export async function removeSeedUsers() {
  await Promise.all(
    SEED_USERS.map((user) => deleteDoc(doc(db, "users", user.id))),
  );
}
