import type { Timestamp } from "firebase/firestore";

export type PlayerCategory = "A" | "B" | "C" | "GK";

export type PlayerPosition =
  | "goalkeeper"
  | "defender"
  | "midfielder"
  | "forward";

export type Player = {
  id: string;
  userId?: string;
  name: string;
  photoURL?: string;
  category: PlayerCategory;
  position: PlayerPosition;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type PlayerInput = {
  name: string;
  photoURL?: string;
  category: PlayerCategory;
  position: PlayerPosition;
  isActive: boolean;
  userId?: string;
};

export type PlayerFilterState = {
  search: string;
  position: PlayerPosition | "all";
  status: "all" | "active" | "inactive";
};

export const PLAYER_CATEGORIES: PlayerCategory[] = ["A", "B", "C", "GK"];

export const PLAYER_POSITIONS: PlayerPosition[] = [
  "goalkeeper",
  "defender",
  "midfielder",
  "forward",
];

export const CATEGORY_LABELS: Record<PlayerCategory, string> = {
  A: "Excellent",
  B: "Good",
  C: "Beginner",
  GK: "Goalkeeper",
};

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: "Goalkeeper",
  defender: "Defender",
  midfielder: "Midfielder",
  forward: "Forward",
};

export function parsePosition(value: unknown): PlayerPosition | "" {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  const normalized = value.trim().toLowerCase();

  if (normalized in POSITION_LABELS) {
    return normalized as PlayerPosition;
  }

  return (
    PLAYER_POSITIONS.find(
      (position) => POSITION_LABELS[position].toLowerCase() === normalized,
    ) ?? ""
  );
}

export function formatPosition(position: PlayerPosition | string | "" | undefined) {
  const parsed = parsePosition(position);

  if (!parsed) {
    return position?.trim() || "Not set";
  }

  return POSITION_LABELS[parsed];
}

export function formatCategory(category: PlayerCategory) {
  return CATEGORY_LABELS[category];
}
