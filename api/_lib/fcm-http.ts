const ORIGIN = "https://ollyofc.vercel.app";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const IDENTITY_SCOPE = "https://www.googleapis.com/auth/identitytoolkit";
const SEND_CONCURRENCY = 20;

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type GoogleError = {
  error?: { message?: string; status?: string; details?: unknown };
};

type TokenEntry = {
  name: string;
  token: string;
};

let cachedAccess:
  | {
      token: string;
      expiresAt: number;
      projectId: string;
    }
  | undefined;

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token;
}

function serviceAccount(): ServiceAccount {
  const jsonAccount = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();

  if (jsonAccount) {
    const parsed = JSON.parse(jsonAccount) as ServiceAccount;
    return {
      project_id: parsed.project_id,
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  }

  const project_id = process.env.FIREBASE_PROJECT_ID?.trim() ?? "";
  const client_email = process.env.FIREBASE_CLIENT_EMAIL?.trim() ?? "";
  const private_key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() ?? "";

  if (!project_id || !client_email || !private_key) {
    throw new Error("Missing Firebase service account");
  }

  return { project_id, client_email, private_key };
}

function base64Url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function pemToPkcs8(pem: string) {
  const b64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replaceAll(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function signJwt(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: account.client_email,
      sub: account.client_email,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
      scope: `${FCM_SCOPE} ${FIRESTORE_SCOPE} ${IDENTITY_SCOPE}`,
    }),
  );
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data));

  return `${header}.${payload}.${base64Url(signature)}`;
}

async function accessToken() {
  if (cachedAccess && cachedAccess.expiresAt > Date.now() + 60_000) {
    return cachedAccess;
  }

  const account = serviceAccount();
  const assertion = await signJwt(account);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  const payload = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error || "Could not get Google access token");
  }

  cachedAccess = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    projectId: account.project_id,
  };

  return cachedAccess;
}

async function googleJson<T>(url: string, init: RequestInit = {}) {
  const auth = await accessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${auth.token}`,
      "content-type": "application/json",
      ...init.headers,
    },
    signal: init.signal ?? AbortSignal.timeout(8_000),
  });
  const text = await response.text();
  let data: T & GoogleError;

  try {
    data = (text ? JSON.parse(text) : {}) as T & GoogleError;
  } catch {
    throw new Error(text.slice(0, 180) || "Google request failed");
  }

  return { ok: response.ok, status: response.status, data, projectId: auth.projectId };
}

function googleMessage(data: GoogleError, fallback: string) {
  return data.error?.message || fallback;
}

function stringField(fields: Record<string, { stringValue?: string } | undefined> | undefined, key: string) {
  return fields?.[key]?.stringValue?.trim() ?? "";
}

export async function verifyStaff(idToken: string, allowedRoles: Set<string>) {
  const lookup = await googleJson<{ users?: { localId?: string }[] }>(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup",
    { method: "POST", body: JSON.stringify({ idToken }) },
  );

  if (!lookup.ok) {
    throw new Error("Unauthorized");
  }

  const uid = lookup.data.users?.[0]?.localId ?? "";

  if (!uid) {
    throw new Error("Unauthorized");
  }

  const user = await googleJson<{
    fields?: Record<string, { stringValue?: string }>;
  }>(
    `https://firestore.googleapis.com/v1/projects/${lookup.projectId}/databases/(default)/documents/users/${uid}`,
  );

  if (!user.ok) {
    throw new Error(googleMessage(user.data, "Forbidden"));
  }

  const role = stringField(user.data.fields, "role");

  if (!allowedRoles.has(role)) {
    throw new Error("Forbidden");
  }

  return { uid, projectId: lookup.projectId };
}

export async function readGame(projectId: string, gameId: string) {
  const game = await googleJson<{
    fields?: Record<string, { stringValue?: string; timestampValue?: string }>;
  }>(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/games/${gameId}`,
  );

  if (game.status === 404) {
    return null;
  }

  if (!game.ok) {
    throw new Error(googleMessage(game.data, "Game not found"));
  }

  const fields = game.data.fields;
  const title = stringField(fields, "title") || "New Ollyo FC game";
  const location = stringField(fields, "location");
  const startTime = stringField(fields, "startTime");
  const dateValue = fields?.date?.timestampValue;
  const date = dateValue ? new Date(dateValue) : null;
  const dateLabel = date
    ? new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Asia/Dhaka",
      }).format(date)
    : "";
  const timeLabel = startTime
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      }).format(new Date(`1970-01-01T${startTime}:00Z`))
    : "";
  const body = [dateLabel, timeLabel, location].filter(Boolean).join(" · ");

  return { title, body: body || "A new game was created." };
}

async function listFcmTokens(projectId: string) {
  const result = await googleJson<{ document?: { name?: string; fields?: Record<string, { stringValue?: string }> } }[]>(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "fcmTokens", allDescendants: true }],
          limit: 500,
        },
      }),
    },
  );

  if (!result.ok) {
    throw new Error(googleMessage(result.data as GoogleError, "Could not load notification tokens"));
  }

  const rows = Array.isArray(result.data) ? result.data : [];

  return rows
    .map((row) => ({
      name: row.document?.name ?? "",
      token: stringField(row.document?.fields, "token"),
    }))
    .filter((entry): entry is TokenEntry => Boolean(entry.name && entry.token));
}

function isDeadTokenStatus(status: string | undefined) {
  return status === "NOT_FOUND" || status === "UNREGISTERED" || status === "INVALID_ARGUMENT";
}

async function deleteTokenDoc(name: string) {
  await googleJson(`https://firestore.googleapis.com/v1/${name}`, { method: "DELETE" });
}

async function sendOne(
  projectId: string,
  entry: TokenEntry,
  payload: { title: string; body: string; url: string; extraData?: Record<string, string> },
) {
  const result = await googleJson<GoogleError>(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      body: JSON.stringify({
        message: {
          token: entry.token,
          data: {
            title: payload.title,
            body: payload.body,
            url: payload.url,
            ...payload.extraData,
          },
          webpush: {
            fcm_options: {
              link: `${ORIGIN}${payload.url}`,
            },
          },
        },
      }),
    },
  );

  if (result.ok) {
    return true;
  }

  if (isDeadTokenStatus(result.data.error?.status)) {
    await deleteTokenDoc(entry.name);
  }

  return false;
}

export async function sendPushToAllTokens(options: {
  title: string;
  body: string;
  url: string;
  extraData?: Record<string, string>;
}) {
  const auth = await accessToken();
  const entries = await listFcmTokens(auth.projectId);

  if (!entries.length) {
    return 0;
  }

  let sent = 0;

  for (let offset = 0; offset < entries.length; offset += SEND_CONCURRENCY) {
    const batch = entries.slice(offset, offset + SEND_CONCURRENCY);
    const results = await Promise.all(
      batch.map((entry) => sendOne(auth.projectId, entry, options)),
    );
    sent += results.filter(Boolean).length;
  }

  return sent;
}
