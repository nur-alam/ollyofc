import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export const config = {
  runtime: "nodejs",
};

const ORIGIN = "https://ollyofc.vercel.app";
const BATCH_SIZE = 500;
const MAX_MESSAGE_LENGTH = 240;

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

  let message = "";

  try {
    const body = (await request.json()) as { message?: unknown };
    message = typeof body.message === "string" ? body.message.trim() : "";
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!message) {
    return json({ error: "Write a notification message." }, 400);
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` }, 400);
  }

  try {
    const app = adminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const messaging = getMessaging(app);
    const decoded = await auth.verifyIdToken(idToken);
    const staffSnap = await db.doc(`users/${decoded.uid}`).get();
    const role = staffSnap.data()?.role;

    if (role !== "admin") {
      return json({ error: "Forbidden" }, 403);
    }

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

    const url = "/games";
    const absoluteUrl = `${ORIGIN}${url}`;
    let sent = 0;

    for (let offset = 0; offset < entries.length; offset += BATCH_SIZE) {
      const batch = entries.slice(offset, offset + BATCH_SIZE);
      const result = await messaging.sendEachForMulticast({
        tokens: batch.map((entry) => entry.token),
        data: {
          title: "Ollyo FC",
          body: message,
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
    const errorMessage = error instanceof Error ? error.message : "Notify failed";
    return json({ error: errorMessage }, 500);
  }
}
