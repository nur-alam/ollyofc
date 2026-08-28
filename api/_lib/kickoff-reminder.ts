import { googleJson, googleProjectId, numberField, sendPushToAllTokens, stringField } from "./fcm-http";

const HOUR_MS = 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

function formatKickoffTime(startTime: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(`1970-01-01T${startTime}:00Z`));
}

function reminderBody(startTime: string) {
  const timeLabel = startTime ? formatKickoffTime(startTime) : "";

  if (!timeLabel) {
    return "Exciting match ahead, get ready, game starts in 1 hour";
  }

  return `Exciting match ahead, get ready, game starts in 1 hour at ${timeLabel}`;
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
  const earliest = now + HOUR_MS - WINDOW_MS;
  const latest = now + HOUR_MS + WINDOW_MS;
  let notified = 0;
  let sent = 0;

  for (const row of rows) {
    const name = row.document?.name ?? "";
    const fields = row.document?.fields;
    const gameId = documentId(name);
    const status = stringField(fields, "status");
    const startMs = gameStartMs(fields);

    if (!name || !gameId || status !== "upcoming" || !startMs) {
      continue;
    }

    if (startMs < earliest || startMs > latest) {
      continue;
    }

    if (numberField(fields, "kickoffReminderSentForMs") === startMs) {
      continue;
    }

    const count = await sendPushToAllTokens({
      title: stringField(fields, "title") || "Ollyo FC",
      body: reminderBody(stringField(fields, "startTime")),
      url: `/games/${gameId}`,
      extraData: { gameId },
    });

    await markReminderSent(name, startMs);
    notified += 1;
    sent += count;
  }

  return { notified, sent };
}
