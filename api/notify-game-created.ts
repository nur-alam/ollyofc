import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export const config = {
  runtime: "nodejs",
};

const STAFF_ROLES = new Set(["admin", "moderator"]);
const ORIGIN = "https://ollyofc.vercel.app";
const BATCH_SIZE = 500;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function adminApp() {
  const existing = getApps()[0];

  if (existing) {
    return existing;
  }

  const jsonAccount = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();

  if (jsonAccount) {
    return initializeApp({
      credential: cert(JSON.parse(jsonAccount) as Record<string, string>),
    });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  throw new Error("Missing Firebase service account");
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token;
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

function isDeadTokenError(code: string | undefined) {
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token" ||
    code === "messaging/invalid-argument"
  );
}

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const idToken = bearerToken(request);

  if (!idToken) {
    return json({ error: "Unauthorized" }, 401);
  }

  let gameId = "";

  try {
    const body = (await request.json()) as { gameId?: unknown };
    gameId = typeof body.gameId === "string" ? body.gameId.trim() : "";
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!gameId) {
    return json({ error: "Missing game id" }, 400);
  }

  try {
    const app = adminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const messaging = getMessaging(app);
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
    const tokenSnaps = await db.collectionGroup("fcmTokens").get();
    const entries = tokenSnaps.docs
      .map((tokenDoc) => ({
        ref: tokenDoc.ref,
        token: typeof tokenDoc.data().token === "string" ? tokenDoc.data().token : "",
      }))
      .filter((entry) => entry.token);

    if (!entries.length) {
      return json({ ok: true, sent: 0 });
    }

    const url = `/games/${gameId}`;
    const absoluteUrl = `${ORIGIN}${url}`;
    let sent = 0;

    for (let offset = 0; offset < entries.length; offset += BATCH_SIZE) {
      const batch = entries.slice(offset, offset + BATCH_SIZE);
      const result = await messaging.sendEachForMulticast({
        tokens: batch.map((entry) => entry.token),
        data: {
          title: copy.title,
          body: copy.body,
          gameId,
          url,
        },
        webpush: {
          fcmOptions: {
            link: absoluteUrl,
          },
        },
      });

      sent += result.successCount;

      await Promise.all(
        result.responses.map((response, index) => {
          if (response.success || !isDeadTokenError(response.error?.code)) {
            return undefined;
          }

          return batch[index]?.ref.delete();
        }),
      );
    }

    return json({ ok: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notify failed";
    return json({ error: message }, 500);
  }
}
