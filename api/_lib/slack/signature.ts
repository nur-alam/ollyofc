const MAX_AGE_SECONDS = 60 * 5;

function hexToBytes(hex: string) {
  if (hex.length === 0 || hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

export type SlackSignatureResult = "ok" | "missing" | "stale" | "malformed" | "mismatch" | "bot-token";

/** Slack signs `v0:{timestamp}:{raw body}` with HMAC SHA-256. */
export async function checkSlackSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
): Promise<SlackSignatureResult> {
  if (!secret) {
    return "missing";
  }

  if (secret.startsWith("xox")) {
    return "bot-token";
  }

  const sentAt = Number(timestamp);

  if (!Number.isFinite(sentAt) || Math.abs(Date.now() / 1000 - sentAt) > MAX_AGE_SECONDS) {
    return "stale";
  }

  if (!signature.startsWith("v0=")) {
    return "malformed";
  }

  const given = hexToBytes(signature.slice(3));

  if (!given) {
    return "malformed";
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const data = new TextEncoder().encode(`v0:${timestamp}:${rawBody}`);
  const matches = await crypto.subtle.verify("HMAC", key, given, data);

  return matches ? "ok" : "mismatch";
}
