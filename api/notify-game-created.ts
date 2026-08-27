import { adminApp, bearerToken, json, sendPushToAllTokens } from "./lib/fcm";

export const config = {
  runtime: "nodejs",
};

const STAFF_ROLES = new Set(["admin", "moderator"]);

async function readGameId(request: Request) {
  try {
    const body = (await request.json()) as { gameId?: unknown };
    return typeof body.gameId === "string" ? body.gameId.trim() : "";
  } catch {
    return "";
  }
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

export default async function handler(request: Request) {
  try {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const idToken = bearerToken(request);

    if (!idToken) {
      return json({ error: "Unauthorized" }, 401);
    }

    const gameId = await readGameId(request);

    if (!gameId) {
      return json({ error: "Missing game id" }, 400);
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
      return json({ error: "Forbidden" }, 403);
    }

    const gameSnap = await db.doc(`games/${gameId}`).get();

    if (!gameSnap.exists) {
      return json({ error: "Game not found" }, 404);
    }

    const copy = formatNotifyCopy(gameSnap.data() ?? {});
    const url = `/games/${gameId}`;
    const sent = await sendPushToAllTokens({
      title: copy.title,
      body: copy.body,
      url,
      extraData: { gameId },
    });

    return json({ ok: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notify failed";
    return json({ error: message }, 500);
  }
}
