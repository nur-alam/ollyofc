export const ORIGIN = "https://ollyofc.vercel.app";
export const BATCH_SIZE = 500;

export type NodeReq = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

export type NodeRes = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body: string) => void;
};

export function json(res: NodeRes, body: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export function headerValue(headers: NodeReq["headers"], name: string) {
  const value = headers[name] ?? headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function bearerToken(req: NodeReq) {
  const header = headerValue(req.headers, "authorization");
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token;
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

export async function adminApp() {
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

function isDeadTokenError(code: string | undefined) {
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token" ||
    code === "messaging/invalid-argument"
  );
}

export async function sendPushToAllTokens(options: {
  title: string;
  body: string;
  url: string;
  extraData?: Record<string, string>;
}) {
  const app = await adminApp();
  const [{ getFirestore }, { getMessaging }] = await Promise.all([
    import("firebase-admin/firestore"),
    import("firebase-admin/messaging"),
  ]);
  const db = getFirestore(app);
  const messaging = getMessaging(app);
  const tokenSnaps = await db.collectionGroup("fcmTokens").get();
  const entries = tokenSnaps.docs
    .map((tokenDoc) => ({
      ref: tokenDoc.ref,
      token: typeof tokenDoc.data().token === "string" ? tokenDoc.data().token : "",
    }))
    .filter((entry) => entry.token);

  if (!entries.length) {
    return 0;
  }

  const absoluteUrl = `${ORIGIN}${options.url}`;
  let sent = 0;

  for (let offset = 0; offset < entries.length; offset += BATCH_SIZE) {
    const batch = entries.slice(offset, offset + BATCH_SIZE);
    const result = await messaging.sendEachForMulticast({
      tokens: batch.map((entry) => entry.token),
      data: {
        title: options.title,
        body: options.body,
        url: options.url,
        ...options.extraData,
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

  return sent;
}
