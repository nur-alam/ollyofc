export const MAX_MESSAGE_LENGTH = 240;
export const MAX_LINK_LENGTH = 200;

export const LEADERBOARD_MESSAGE =
  "Leaderboard updated, check out the latest standings!";
export const LEADERBOARD_PATH = "/leaderboard";
export const DEFAULT_NOTIFY_PATH = "/games";

export const NOTIFY_LINK_PRESETS = [
  { label: "Games", path: "/games" },
  { label: "Leaderboard", path: "/leaderboard" },
  { label: "Squad", path: "/squad" },
] as const;

const APP_PATH_PATTERN = /^\/[A-Za-z0-9/_-]*$/;

export function normalizeAppPath(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function isAppNotificationPath(value: string) {
  return (
    APP_PATH_PATTERN.test(value) &&
    !value.includes("//") &&
    value.length <= MAX_LINK_LENGTH
  );
}
