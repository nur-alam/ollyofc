import { json } from "./_lib/fcm-http";
import { runKickoffReminders } from "./_lib/kickoff-reminder";

export const config = {
  runtime: "edge",
};

function isCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization") ?? "";

  return header === `Bearer ${secret}`;
}

export default async function handler(request: Request) {
  try {
    if (request.method !== "GET" && request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (!process.env.CRON_SECRET?.trim()) {
      return json({ error: "CRON_SECRET is not set" }, 500);
    }

    if (!isCronRequest(request)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const result = await runKickoffReminders();

    return json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notify failed";
    return json({ error: message }, 500);
  }
}
