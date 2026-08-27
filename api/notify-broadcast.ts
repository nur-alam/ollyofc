import { adminApp, bearerToken, json, sendPushToAllTokens } from "./lib/fcm";

export const config = {
  runtime: "nodejs",
};

const MAX_MESSAGE_LENGTH = 240;

async function readMessage(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown };
    return typeof body.message === "string" ? body.message.trim() : "";
  } catch {
    return "";
  }
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

    const message = await readMessage(request);

    if (!message) {
      return json({ error: "Write a notification message." }, 400);
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` }, 400);
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

    if (role !== "admin") {
      return json({ error: "Forbidden" }, 403);
    }

    const sent = await sendPushToAllTokens({
      title: "Ollyo FC",
      body: message,
      url: "/games",
    });

    return json({ ok: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notify failed";
    return json({ error: message }, 500);
  }
}
