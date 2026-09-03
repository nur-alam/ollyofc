import { formatDistanceToNow } from "date-fns";

import { BANGLADESH_TIME_ZONE } from "@/lib/timezone";

import type { VisitorRecord } from "./visitor.types";

export function visitorName(visitor: VisitorRecord) {
  return visitor.displayName || (visitor.userId ? "Signed-in user" : "Guest");
}

export function visitorInitials(visitor: VisitorRecord) {
  const name = visitorName(visitor);
  return name.charAt(0).toUpperCase();
}

export function countryName(code: string) {
  if (!code) {
    return "";
  }

  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function countryFlag(code: string) {
  const iso = code.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(iso)) {
    return "";
  }

  return String.fromCodePoint(...[...iso].map((letter) => 127397 + letter.charCodeAt(0)));
}

export function formatVisitorLocation(visitor: VisitorRecord) {
  const place = [visitor.city, countryName(visitor.country)].filter(Boolean).join(", ");
  const flag = countryFlag(visitor.country);

  if (place && flag) {
    return `${flag} ${place}`;
  }

  return place || flag;
}

export function formatVisitorTime(ms: number) {
  if (!ms) {
    return "Unknown";
  }

  const date = new Date(ms);
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGLADESH_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${clock} · ${formatDistanceToNow(date, { addSuffix: true })}`;
}

export function deviceCounts(visitors: VisitorRecord[]) {
  const counts = new Map<string, number>();

  for (const visitor of visitors) {
    counts.set(visitor.device, (counts.get(visitor.device) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}
