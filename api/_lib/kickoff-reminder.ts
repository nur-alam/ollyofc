import { googleJson, googleProjectId, numberField, sendPushToAllTokens, stringField } from "./fcm-http";

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function formatKickoffTime(startTime: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(`1970-01-01T${startTime}:00Z`));
}

function formatRemaining(remainingMs: number) {
  const totalMinutes = Math.max(1, Math.round(remainingMs / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return totalMinutes === 1 ? "1 minute" : `${totalMinutes} minutes`;
  }

  const hourPart = hours === 1 ? "1 hour" : `${hours} hours`;

  if (minutes === 0) {
    return hourPart;
  }

  const minutePart = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  return `${hourPart} ${minutePart}`;
}

function reminderBody(startTime: string, remainingMs: number) {
  const remainingLabel = formatRemaining(remainingMs);
  const timeLabel = startTime ? formatKickoffTime(startTime) : "";

  if (!timeLabel) {
    return `Exciting match ahead, get ready, game starts in ${remainingLabel}`;
  }

  return `Exciting match ahead, get ready, game starts in ${remainingLabel} at ${timeLabel}`;
}

type GameFields = Record<
  string,
  { stringValue?: string; timestampValue?: string; integerValue?: string; doubleValue?: number }
>;

type GameRow = {
  document?: {
    name?: string;
    fields?: GameFields;
  };
};

function bangladeshYmd(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const values = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function bangladeshDateTimeToUtc(ymd: string, time: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  return Date.UTC(year, month - 1, day, (hours || 0) - 6, minutes || 0, 0, 0);
}

function gameStartMs(fields: GameFields | undefined) {
  const dateValue = fields?.date?.timestampValue;
  const startTime = stringField(fields, "startTime");

  if (!dateValue || !startTime) {
    return 0;
  }

  return bangladeshDateTimeToUtc(bangladeshYmd(new Date(dateValue)), startTime);
}

function documentId(name: string) {
  return name.split("/").pop() ?? "";
}

async function markReminderSent(documentName: string, startMs: number) {
  const result = await googleJson(
    `https://firestore.googleapis.com/v1/${documentName}?updateMask.fieldPaths=kickoffReminderSentForMs`,
    {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          kickoffReminderSentForMs: { integerValue: String(startMs) },
        },
      }),
    },
  );

  if (!result.ok) {
    throw new Error("Could not mark kickoff reminder as sent");
  }
}

async function loadUpcomingGames(projectId: string) {
  const filtered = await googleJson<GameRow[]>(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "games" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "status" },
              op: "EQUAL",
              value: { stringValue: "upcoming" },
            },
          },
          limit: 50,
        },
      }),
    },
  );

  if (filtered.ok && Array.isArray(filtered.data)) {
    return filtered.data;
  }

  const fallback = await googleJson<GameRow[]>(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "games" }],
          limit: 50,
        },
      }),
    },
  );

  if (!fallback.ok || !Array.isArray(fallback.data)) {
    throw new Error("Could not load upcoming games");
  }

  return fallback.data;
}

export async function runKickoffReminders() {
  const projectId = await googleProjectId();
  const rows = await loadUpcomingGames(projectId);
  const now = Date.now();
  let notified = 0;
  let sent = 0;

  for (const row of rows) {
    const name = row.document?.name ?? "";
    const fields = row.document?.fields;
    const gameId = documentId(name);
    const status = stringField(fields, "status");
    const startMs = gameStartMs(fields);
    const remainingMs = startMs - now;

    if (!name || !gameId || status !== "upcoming" || !startMs) {
      continue;
    }

    // First cron tick at or under 1 hour, or a later catch-up tick before kickoff.
    if (remainingMs < MINUTE_MS || remainingMs > HOUR_MS) {
      continue;
    }

    if (numberField(fields, "kickoffReminderSentForMs") === startMs) {
      continue;
    }

    const count = await sendPushToAllTokens({
      title: stringField(fields, "title") || "Ollyo FC",
      body: reminderBody(stringField(fields, "startTime"), remainingMs),
      url: `/games/${gameId}`,
      extraData: { gameId },
    });

    await markReminderSent(name, startMs);
    notified += 1;
    sent += count;
  }

  return { notified, sent };
}
