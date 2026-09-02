import { bearerToken, json, sendPushToAllTokens, verifyStaff } from "./_lib/fcm-http";

export const config = {
  runtime: "edge",
};

const MAX_MESSAGE_LENGTH = 240;
const MAX_LINK_LENGTH = 200;
const MAX_USER_IDS = 100;
const ADMIN_ROLES = new Set(["admin"]);
const DEFAULT_URL = "/games";
const APP_PATH_PATTERN = /^\/[A-Za-z0-9/_-]*$/;

function sanitizeUrl(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const url = value.trim();

  if (!APP_PATH_PATTERN.test(url) || url.includes("//") || url.length > MAX_LINK_LENGTH) {
    throw new Error("Link must be an app path like /leaderboard or /games.");
  }

  return url;
}

function sanitizeUserIds(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error("Select the users to notify.");
  }

  const userIds = [
    ...new Set(
      value.filter((id): id is string => typeof id === "string" && Boolean(id.trim())).map((id) => id.trim()),
    ),
  ];

  if (!userIds.length) {
    throw new Error("Select at least one user.");
  }

  if (userIds.length > MAX_USER_IDS) {
    throw new Error(`You can notify at most ${MAX_USER_IDS} users at a time.`);
  }

  return userIds;
}

export default async function handler(request: Request) {
  try {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const idToken = bearerToken(request);

    if (!idToken) {
      return json({ error: "Unauthorized" }, 401);
    }

    let body: { message?: unknown; url?: unknown; userIds?: unknown };

    try {
      body = (await request.json()) as { message?: unknown; url?: unknown; userIds?: unknown };
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (!body || typeof body !== "object") {
      return json({ error: "Invalid JSON" }, 400);
    }

    let message = "";
    let url = DEFAULT_URL;
    let userIds: string[] | undefined;

    try {
      message = typeof body.message === "string" ? body.message.trim() : "";
      url = sanitizeUrl(body.url, DEFAULT_URL);
      userIds = sanitizeUserIds(body.userIds);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid request";
      return json({ error: errorMessage }, 400);
    }

    if (!message) {
      return json({ error: "Write a notification message." }, 400);
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` }, 400);
    }

    await verifyStaff(idToken, ADMIN_ROLES);
    const sent = await sendPushToAllTokens({
      title: "Ollyo FC",
      body: message,
      url,
      userIds,
    });

    return json({ ok: true, sent });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Notify failed";
    const status = errorMessage === "Unauthorized" ? 401 : errorMessage === "Forbidden" ? 403 : 500;
    return json({ error: errorMessage }, status);
  }
}
