import { env } from "../env";
import { json } from "../fcm-http";
import { slackSignatureMatches } from "./signature";

const REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

export type SlackEdgeContext = {
  waitUntil?: (promise: Promise<unknown>) => void;
};

export function slackMessage(text: string, responseType: "ephemeral" | "in_channel" = "ephemeral") {
  return json({ response_type: responseType, text });
}

export function slackHookUrl(value: string | null) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "hooks.slack.com" ? url.toString() : "";
  } catch {
    return "";
  }
}

function symbolWaitUntil() {
  const context = (
    globalThis as typeof globalThis & {
      [REQUEST_CONTEXT]?: { get?: () => SlackEdgeContext };
    }
  )[REQUEST_CONTEXT]?.get?.();

  return context?.waitUntil;
}

/** Keep work running after the HTTP response. Slack must see HTTP 200 within 3 seconds. */
export function defer(promise: Promise<unknown>, context?: SlackEdgeContext) {
  const waitUntil = context?.waitUntil ?? symbolWaitUntil();

  if (typeof waitUntil !== "function") {
    return false;
  }

  waitUntil(promise);
  return true;
}

export async function postSlackResponse(responseUrl: string, body: unknown) {
  const response = await fetch(responseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Slack did not accept the reply");
  }
}

/** Verifies a Slack slash-command POST. A `Response` is the reply to return immediately. */
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
