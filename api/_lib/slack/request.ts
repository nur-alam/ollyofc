import { env } from "../env";
import { json } from "../fcm-http";
import { checkSlackSignature, type SlackSignatureResult } from "./signature";

const REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

export type SlackEdgeContext = {
  waitUntil?: (promise: Promise<unknown>) => void;
};

export function slackMessage(text: string, responseType: "ephemeral" | "in_channel" = "ephemeral") {
  return json({ response_type: responseType, text });
}

/** Acknowledge a slash command without leaving a message in Slack. */
export function slackAck() {
  return new Response(null, { status: 200 });
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

function signingSecret() {
  let value = env.SLACK_SIGNING_SECRET ?? "";

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value;
}

function signatureProblem(result: SlackSignatureResult) {
  if (result === "bot-token") {
    return "SLACK_SIGNING_SECRET is the bot token. Open the Slack app, go to Basic Information, and copy Signing Secret into that Vercel variable.";
  }

  if (result === "missing") {
    return "SLACK_SIGNING_SECRET is not set on the server.";
  }

  if (result === "stale") {
    return "That Slack request was too old. Run the command again.";
  }

  if (result === "malformed") {
    return "Slack did not send a signature Ollyo FC could read. Run the command again.";
  }

  return "The signing secret on the server does not match this Slack app. Copy Signing Secret from Basic Information into SLACK_SIGNING_SECRET on Vercel.";
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

  const result = await checkSlackSignature(
    signingSecret(),
    request.headers.get("x-slack-request-timestamp") ?? "",
    rawBody,
    request.headers.get("x-slack-signature") ?? "",
  );

  if (result !== "ok") {
    return slackMessage(signatureProblem(result));
  }

  if (params.get("ssl_check") === "1") {
    return new Response(null, { status: 200 });
  }

  return params;
}
