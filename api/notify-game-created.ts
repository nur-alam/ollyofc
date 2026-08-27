import { adminApp, bearerToken, json, sendPushToAllTokens, type NodeReq, type NodeRes } from "./lib/fcm";

export const config = {
  runtime: "nodejs",
};

const STAFF_ROLES = new Set(["admin", "moderator"]);

function readGameId(body: unknown) {
  if (typeof body === "string") {
    try {
      return readGameId(JSON.parse(body) as unknown);
    } catch {
      return "";
    }
  }

  if (!body || typeof body !== "object") {
    return "";
  }

  const gameId = (body as { gameId?: unknown }).gameId;

  return typeof gameId === "string" ? gameId.trim() : "";
}

function formatNotifyCopy(data: {
  title?: unknown;
  location?: unknown;
  startTime?: unknown;
  date?: { toDate?: () => Date };
}) {
  const title =
    typeof data.title === "string" && data.title.trim()
      ? data.title.trim()
      : "New Ollyo FC game";
  const location = typeof data.location === "string" ? data.location.trim() : "";
  const startTime = typeof data.startTime === "string" ? data.startTime : "";
  const date = typeof data.date?.toDate === "function" ? data.date.toDate() : null;
  const dateLabel = date
    ? new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Asia/Dhaka",
      }).format(date)
    : "";
  const timeLabel = startTime
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      }).format(new Date(`1970-01-01T${startTime}:00Z`))
    : "";
  const body = [dateLabel, timeLabel, location].filter(Boolean).join(" · ");

  return { title, body: body || "A new game was created." };
}

export default async function handler(req: NodeReq, res: NodeRes) {
  try {
    if (req.method !== "POST") {
      json(res, { error: "Method not allowed" }, 405);
      return;
    }

    const idToken = bearerToken(req);

    if (!idToken) {
      json(res, { error: "Unauthorized" }, 401);
      return;
    }

    const gameId = readGameId(req.body);

    if (!gameId) {
      json(res, { error: "Missing game id" }, 400);
      return;
    }

    const app = await adminApp();
    const [{ getAuth }, { getFirestore }] = await Promise.all([
      import("firebase-admin/auth"),
      import("firebase-admin/firestore"),
    ]);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const decoded = await auth.verifyIdToken(idToken);
    const staffSnap = await db.doc(`users/${decoded.uid}`).get();
    const role = staffSnap.data()?.role;

    if (!STAFF_ROLES.has(typeof role === "string" ? role : "")) {
      json(res, { error: "Forbidden" }, 403);
      return;
    }

    const gameSnap = await db.doc(`games/${gameId}`).get();

    if (!gameSnap.exists) {
      json(res, { error: "Game not found" }, 404);
      return;
    }

    const copy = formatNotifyCopy(gameSnap.data() ?? {});
    const url = `/games/${gameId}`;
    const sent = await sendPushToAllTokens({
      title: copy.title,
      body: copy.body,
      url,
      extraData: { gameId },
    });

    json(res, { ok: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notify failed";
    json(res, { error: message }, 500);
  }
}
