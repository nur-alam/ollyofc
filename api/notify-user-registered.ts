import {
  bearerToken,
  json,
  listStaffUserIds,
  readUserDocument,
  sendPushToAllTokens,
  verifySignedIn,
} from "./_lib/fcm-http";

export const config = {
  runtime: "edge",
};

const REGISTER_NOTIFY_MAX_AGE_MS = 5 * 60 * 1000;

export default async function handler(request: Request) {
  try {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const idToken = bearerToken(request);

    if (!idToken) {
      return json({ error: "Unauthorized" }, 401);
    }

    const caller = await verifySignedIn(idToken);
    const user = await readUserDocument(caller.projectId, caller.uid);

    if (!user) {
      return json({ error: "Player not found" }, 404);
    }

    if (!user.createTimeMs || Date.now() - user.createTimeMs > REGISTER_NOTIFY_MAX_AGE_MS) {
      return json({ ok: true, sent: 0, skipped: true });
    }

    const staffIds = (await listStaffUserIds(caller.projectId)).filter((uid) => uid !== caller.uid);

    if (!staffIds.length) {
      return json({ ok: true, sent: 0 });
    }

    const displayName = user.displayName.replace(/\s+/g, " ").trim().slice(0, 80) || "A new player";
    const sent = await sendPushToAllTokens({
      title: `${displayName} registered`,
      body: user.email || "New Ollyo FC player",
      url: `/player/${caller.uid}`,
      extraData: { userId: caller.uid },
      userIds: staffIds,
      tag: `register-${caller.uid}`,
    });

    return json({ ok: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notify failed";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return json({ error: message }, status);
  }
}
