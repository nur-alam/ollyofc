import { googleJson, googleProjectId, sendPushToAllTokens, stringField } from "./fcm-http";

const MINUTE_MS = 60 * 1000;

function formatKickoffTime(startTime: string) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const label = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(1970, 0, 1, hours || 0, minutes || 0)));

  return label
    .replace(/\u202f/g, " ")
    .replace(/\s?(am|pm)$/i, (meridiem) => ` ${meridiem.trim().toUpperCase()}`);
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

function joinStartTimes(times: string[]) {
  if (times.length <= 1) {
    return times[0] ?? "";
  }

  if (times.length === 2) {
    return `${times[0]} and ${times[1]}`;
  }

  return `${times.slice(0, -1).join(", ")}, and ${times.at(-1)}`;
}

type EligibleGame = {
  gameId: string;
  title: string;
  startTime: string;
  startMs: number;
  remainingMs: number;
};

function reminderBody(games: EligibleGame[]) {
  if (games.length === 1) {
    return `Exciting match ahead, get ready! Game starts in ${formatRemaining(games[0].remainingMs)}.`;
  }

  const times = joinStartTimes(games.map((game) => formatKickoffTime(game.startTime)));
  return `Exciting match ahead, get ready! ${games.length} games today. Games start at ${times}.`;
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

function eligibleGames(rows: GameRow[], now: number) {
  const today = bangladeshYmd(new Date(now));
  const games: EligibleGame[] = [];

  for (const row of rows) {
    const name = row.document?.name ?? "";
    const fields = row.document?.fields;
    const gameId = documentId(name);
    const dateValue = fields?.date?.timestampValue;
    const startTime = stringField(fields, "startTime");
    const startMs = gameStartMs(fields);

    if (
      !name ||
      !gameId ||
      stringField(fields, "status") !== "upcoming" ||
      !dateValue ||
      !startTime ||
      !startMs
    ) {
      continue;
    }

    if (bangladeshYmd(new Date(dateValue)) !== today || startMs <= now) {
      continue;
    }

    games.push({
      gameId,
      title: stringField(fields, "title"),
      startTime,
      startMs,
      remainingMs: startMs - now,
    });
  }

  games.sort((left, right) => left.startMs - right.startMs);
  return games;
}

export async function runKickoffReminders() {
  const projectId = await googleProjectId();
  const games = eligibleGames(await loadUpcomingGames(projectId), Date.now());

  if (!games.length) {
    return { notified: 0, sent: 0, games: 0 };
  }

  const onlyGame = games.length === 1 ? games[0] : undefined;
  const sent = await sendPushToAllTokens({
    title: onlyGame?.title || "Ollyo FC",
    body: reminderBody(games),
    url: onlyGame ? `/games/${onlyGame.gameId}` : "/games",
    extraData: onlyGame ? { gameId: onlyGame.gameId } : undefined,
  });

  return { notified: 1, sent, games: games.length };
}
