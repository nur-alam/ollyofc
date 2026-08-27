import { adminApp, bearerToken, json, sendPushToAllTokens, type NodeReq, type NodeRes } from "./lib/fcm";

export const config = {
  runtime: "nodejs",
};

const MAX_MESSAGE_LENGTH = 240;

function readMessage(body: unknown) {
  if (typeof body === "string") {
    try {
      return readMessage(JSON.parse(body) as unknown);
    } catch {
      return "";
    }
  }

  if (!body || typeof body !== "object") {
    return "";
  }

  const message = (body as { message?: unknown }).message;

  return typeof message === "string" ? message.trim() : "";
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

    const message = readMessage(req.body);

    if (!message) {
      json(res, { error: "Write a notification message." }, 400);
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      json(res, { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` }, 400);
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

    if (role !== "admin") {
      json(res, { error: "Forbidden" }, 403);
      return;
    }

    const sent = await sendPushToAllTokens({
      title: "Ollyo FC",
      body: message,
      url: "/games",
    });

    json(res, { ok: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notify failed";
    json(res, { error: message }, 500);
  }
}
