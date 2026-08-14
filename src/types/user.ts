import type { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "moderator" | "user";

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  playerId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export const STAFF_ROLES: UserRole[] = ["admin", "moderator"];

export function isStaffRole(role: UserRole) {
  return STAFF_ROLES.includes(role);
}
