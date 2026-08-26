export const config = {
  runtime: "nodejs",
};

const STAFF_ROLES = new Set(["admin", "moderator"]);
const ORIGIN = "https://ollyofc.vercel.app";
const BATCH_SIZE = 500;

type NodeReq = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type NodeRes = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body: string) => void;
};

function json(res: NodeRes, body: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function headerValue(headers: NodeReq["headers"], name: string) {
  const value = headers[name] ?? headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function bearerToken(req: NodeReq) {
  const header = headerValue(req.headers, "authorization");
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token;
}

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

function parseServiceAccount(raw: string) {
  let text = raw.trim();

  if (
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith('"') && text.endsWith('"'))
  ) {
    text = text.slice(1, -1);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
  }

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
    }
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
  }

  const account = parsed as Record<string, string>;

  if (typeof account.private_key === "string") {
    account.private_key = account.private_key.replace(/\\n/g, "\n");
  }

  return account;
}

async function adminApp() {
  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const existing = getApps()[0];

  if (existing) {
    return existing;
  }

  const jsonAccount = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();

  if (jsonAccount) {
    return initializeApp({
      credential: cert(parseServiceAccount(jsonAccount)),
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

  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT");
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
    const [{ getAuth }, { getFirestore }, { getMessaging }] = await Promise.all([
      import("firebase-admin/auth"),
      import("firebase-admin/firestore"),
      import("firebase-admin/messaging"),
    ]);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const messaging = getMessaging(app);
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
    const tokenSnaps = await db.collectionGroup("fcmTokens").get();
    const entries = tokenSnaps.docs
      .map((tokenDoc) => ({
        ref: tokenDoc.ref,
        token: typeof tokenDoc.data().token === "string" ? tokenDoc.data().token : "",
      }))
      .filter((entry) => entry.token);

    if (!entries.length) {
      json(res, { ok: true, sent: 0 });
      return;
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

    json(res, { ok: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notify failed";
    json(res, { error: message }, 500);
  }
}
