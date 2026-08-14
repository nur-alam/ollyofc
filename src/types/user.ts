import type { Timestamp } from "firebase/firestore";

import type { PlayerPosition } from "@/types/player";

export type UserRole = "admin" | "moderator" | "user";

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  isActive: boolean;
  position: PlayerPosition | "";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export const STAFF_ROLES: UserRole[] = ["admin", "moderator"];

export function isStaffRole(role: UserRole) {
  return STAFF_ROLES.includes(role);
}
