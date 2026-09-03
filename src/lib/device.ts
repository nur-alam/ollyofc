export type DeviceKind =
  | "iPhone"
  | "iPad"
  | "Android"
  | "Mac"
  | "Windows"
  | "Linux"
  | "ChromeOS"
  | "Mobile"
  | "Browser";

export function parseDevice(userAgent: string) {
  const ua = userAgent || "";

  if (/iPhone/i.test(ua)) {
    return { kind: "iPhone" as const, isMobile: true, isTablet: false };
  }

  if (/iPad|iPod/i.test(ua) || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return { kind: "iPad" as const, isMobile: true, isTablet: true };
  }

  if (/Android/i.test(ua)) {
    return {
      kind: "Android" as const,
      isMobile: /Mobile/i.test(ua),
      isTablet: !/Mobile/i.test(ua),
    };
  }

  if (/CrOS/i.test(ua)) {
    return { kind: "ChromeOS" as const, isMobile: false, isTablet: false };
  }

  if (/Macintosh|Mac OS/i.test(ua)) {
    return { kind: "Mac" as const, isMobile: false, isTablet: false };
  }

  if (/Windows/i.test(ua)) {
    return { kind: "Windows" as const, isMobile: false, isTablet: false };
  }

  if (/Linux/i.test(ua)) {
    return { kind: "Linux" as const, isMobile: false, isTablet: false };
  }

  if (/Mobi|Mobile|webOS|BlackBerry|Opera Mini/i.test(ua)) {
    return { kind: "Mobile" as const, isMobile: true, isTablet: false };
  }

  return { kind: "Browser" as const, isMobile: false, isTablet: false };
}

export function deviceKind(userAgent: string): DeviceKind {
  return parseDevice(userAgent).kind;
}

export function isBotUserAgent(userAgent: string) {
  return /bot|crawl|spider|headless|preview|slurp|bingpreview|facebookexternalhit|whatsapp|telegram/i.test(
    userAgent,
  );
}
