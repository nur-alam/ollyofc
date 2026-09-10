import {
  bearerToken,
  json,
  listStaffUserIds,
  readGame,
  readParticipant,
  sendPushToAllTokens,
  verifySignedIn,
} from "./_lib/fcm-http";

export const config = {
  runtime: "edge",
};

const JOIN_NOTIFY_MAX_AGE_MS = 5 * 60 * 1000;

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
    let participantId = "";

    try {
      const body = (await request.json()) as { gameId?: unknown; participantId?: unknown };
      gameId = typeof body.gameId === "string" ? body.gameId.trim() : "";
      participantId = typeof body.participantId === "string" ? body.participantId.trim() : "";
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (!gameId || !participantId) {
      return json({ error: "Missing game or player" }, 400);
    }

    const caller = await verifySignedIn(idToken);
    const participant = await readParticipant(caller.projectId, gameId, participantId);

    if (!participant) {
      return json({ error: "Player not found" }, 404);
    }

    const mayNotify =
      caller.uid === participant.userId || caller.uid === participant.joinedBy;

    if (!mayNotify) {
      return json({ error: "Forbidden" }, 403);
    }

    if (participant.joinedAtMs && Date.now() - participant.joinedAtMs > JOIN_NOTIFY_MAX_AGE_MS) {
      return json({ ok: true, sent: 0, skipped: true });
    }

    const copy = await readGame(caller.projectId, gameId);

    if (!copy) {
      return json({ error: "Game not found" }, 404);
    }

    const staffIds = (await listStaffUserIds(caller.projectId)).filter(
      (uid) => uid !== caller.uid && uid !== participant.userId,
    );

    if (!staffIds.length) {
      return json({ ok: true, sent: 0 });
    }

    const sent = await sendPushToAllTokens({
      title: `${participant.displayName} joined ${copy.displayTitle}`,
      body: copy.schedule || "Tap to open the game.",
      url: `/games/${gameId}`,
      extraData: { gameId, participantId },
      userIds: staffIds,
      tag: `join-${gameId}-${participantId}`,
    });

    return json({ ok: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notify failed";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return json({ error: message }, status);
  }
}
