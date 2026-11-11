import { env } from "../env";
import { json } from "../fcm-http";
import { slackSignatureMatches } from "./signature";

export function slackMessage(text: string, responseType: "ephemeral" | "in_channel" = "ephemeral") {
  return json({ response_type: responseType, text });
}

/** Verifies a Slack slash-command POST. `null` means the caller should answer the command. */
export async function readSlackCommand(request: Request): Promise<URLSearchParams | Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);

  if (params.get("ssl_check") === "1" && !request.headers.get("x-slack-signature")) {
    return new Response(null, { status: 200 });
  }

  const secret = env.SLACK_SIGNING_SECRET;

  if (!secret) {
    return json({ error: "SLACK_SIGNING_SECRET is not set" }, 500);
  }

  const authorized = await slackSignatureMatches(
    secret,
    request.headers.get("x-slack-request-timestamp") ?? "",
    rawBody,
    request.headers.get("x-slack-signature") ?? "",
  );

  if (!authorized) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (params.get("ssl_check") === "1") {
    return new Response(null, { status: 200 });
  }

  return params;
}
