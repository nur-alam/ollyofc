import { bearerToken, json, readGame, sendPushToAllTokens, verifyStaff } from "./_lib/fcm-http";

export const config = {
  runtime: "edge",
};

const STAFF_ROLES = new Set(["admin", "moderator"]);

export default async function handler(request: Request) {
  try {
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

    const staff = await verifyStaff(idToken, STAFF_ROLES);
    const copy = await readGame(staff.projectId, gameId);

    if (!copy) {
      return json({ error: "Game not found" }, 404);
    }

    const sent = await sendPushToAllTokens({
      title: copy.title,
      body: copy.body,
      url: `/games/${gameId}`,
      extraData: { gameId },
    });

    return json({ ok: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notify failed";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return json({ error: message }, status);
  }
}
