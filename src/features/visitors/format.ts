import { formatDistanceToNow } from "date-fns";

import { BANGLADESH_TIME_ZONE, parseYmd } from "@/lib/timezone";

export function countryFlag(code: string) {
  const iso = code.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(iso)) {
    return "";
  }

  return String.fromCodePoint(...[...iso].map((letter) => 127397 + letter.charCodeAt(0)));
}

export function countryName(code: string) {
  const iso = code.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(iso)) {
    return "";
  }

  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(iso) ?? iso;
  } catch {
    return iso;
  }
}

export function formatVisitorLocation(visitor: {
  city: string;
  region: string;
  country: string;
}) {
  const country = countryName(visitor.country);
  const parts = [visitor.city, visitor.region, country].filter(Boolean);

  if (!parts.length) {
    return "";
  }

  return [countryFlag(visitor.country), [...new Set(parts)].join(", ")]
    .filter(Boolean)
    .join(" ");
}

export function formatVisitorTime(ms: number) {
  if (!ms) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGLADESH_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ms));
}

export function formatVisitorRelative(ms: number) {
  if (!ms) {
    return "";
  }

  return formatDistanceToNow(new Date(ms), { addSuffix: true });
}

export function formatDayHeading(ymd: string) {
  const { year, month, day } = parseYmd(ymd);

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
