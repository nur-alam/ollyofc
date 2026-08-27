import { bearerToken, json, sendPushToAllTokens, verifyStaff } from "./_lib/fcm-http";

export const config = {
  runtime: "edge",
};

const MAX_MESSAGE_LENGTH = 240;
const ADMIN_ROLES = new Set(["admin"]);

export default async function handler(request: Request) {
  try {
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

    await verifyStaff(idToken, ADMIN_ROLES);
    const sent = await sendPushToAllTokens({
      title: "Ollyo FC",
      body: message,
      url: "/games",
    });

    return json({ ok: true, sent });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Notify failed";
    const status = errorMessage === "Unauthorized" ? 401 : errorMessage === "Forbidden" ? 403 : 500;
    return json({ error: errorMessage }, status);
  }
}
