import { googleJson, googleProjectId, numberField, stringField } from "../fcm-http";

const PAGE_SIZE = 10;
const GAMES_URL = "https://ollyofc.vercel.app/games";

export type SlackGame = {
  id: string;
  title: string;
  location: string;
  startTime: string;
  /** Kickoff instant in milliseconds. */
  startMs: number;
  /** Calendar day instant, used for the date label. */
  dateMs: number;
  status: string;
  durationMinutes: number;
  startedAtMs: number;
  scoreA: number | null;
  scoreB: number | null;
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Upcoming",
  active: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

type GameDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
};

function cell(text: string) {
  return { type: "raw_text" as const, text };
}

function dhakaParts(date: Date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function startMsFrom(dateMs: number, startTime: string) {
  const { year, month, day } = dhakaParts(new Date(dateMs));
  const [hours, minutes] = startTime.split(":").map(Number);

  return Date.UTC(year, month - 1, day, (hours || 0) - 6, minutes || 0, 0, 0);
}

function formatWhen(game: SlackGame) {
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(game.dateMs));
  const [hours, minutes] = game.startTime.split(":").map(Number);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, hours || 0, minutes || 0)));

  return `${date} · ${time}`;
}

function hasHappened(game: SlackGame, now: number) {
  if (game.status === "cancelled") {
    return false;
  }

  if (game.status === "completed" || game.status === "active") {
    return true;
  }

  return game.startMs <= now;
}

function isUpcoming(game: SlackGame, now: number) {
  return !hasHappened(game, now) && game.status !== "cancelled";
}

function listStatus(game: SlackGame, now: number) {
  if (game.status === "cancelled" || game.status === "completed") {
    return game.status;
  }

  const scheduledEnd = game.startMs + game.durationMinutes * 60 * 1000;
  const start = game.startedAtMs > 0 ? game.startedAtMs : game.startMs;
  const end = game.startedAtMs > 0 ? start + game.durationMinutes * 60 * 1000 : scheduledEnd;

  if (now >= end) {
    return "completed";
  }

  if (now >= start) {
    return "active";
  }

  return "upcoming";
}

export function sortSlackGames(games: SlackGame[], now = Date.now()) {
  return [...games].sort((left, right) => {
    const leftUpcoming = isUpcoming(left, now);
    const rightUpcoming = isUpcoming(right, now);

    if (leftUpcoming !== rightUpcoming) {
      return leftUpcoming ? -1 : 1;
    }

    return leftUpcoming ? left.startMs - right.startMs : right.startMs - left.startMs;
  });
}

export function gamesPageCount(count: number) {
  return Math.max(1, Math.ceil(count / PAGE_SIZE));
}

export function clampGamesPage(page: number, count: number) {
  const pageCount = gamesPageCount(count);
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.min(pageCount, Math.floor(page));
}

function gameTitle(game: SlackGame) {
  if (game.title) {
    return game.title;
  }

  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
  }).format(new Date(game.dateMs));

  return [game.location, date].filter(Boolean).join(" · ") || "Game";
}

function gameLink(game: SlackGame, now: number) {
  const title = gameTitle(game);
  const score =
    hasHappened(game, now) && game.scoreA !== null && game.scoreB !== null
      ? ` ${game.scoreA}–${game.scoreB}`
      : "";

  return {
    type: "rich_text" as const,
    elements: [
      {
        type: "rich_text_section",
        elements: [
          {
            type: "link",
            text: `${title}${score}`,
            url: `${GAMES_URL}/${game.id}`,
          },
        ],
      },
    ],
  };
}

function pageButton(text: string, actionId: string, page: number) {
  return {
    type: "button" as const,
    text: { type: "plain_text" as const, text },
    action_id: actionId,
    value: String(page),
  };
}

export function gamesMessage(games: SlackGame[], requestedPage: number, now = Date.now()) {
  const sorted = sortSlackGames(games, now);

  if (sorted.length === 0) {
    return {
      response_type: "in_channel" as const,
      text: "No games yet.",
    };
  }

  const page = clampGamesPage(requestedPage, sorted.length);
  const pageCount = gamesPageCount(sorted.length);
  const slice = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rows = [
    ["Game", "When", "Ground", "Status"].map(cell),
    ...slice.map((game) => [
      gameLink(game, now),
      cell(formatWhen(game)),
      cell(game.location || "—"),
      cell(STATUS_LABELS[listStatus(game, now)] ?? "Upcoming"),
    ]),
  ];
  const buttons = [
    page > 1 ? pageButton("Previous", "games-previous", page - 1) : null,
    page < pageCount ? pageButton("Next", "games-next", page + 1) : null,
  ].filter((button) => button !== null);

  return {
    response_type: "in_channel" as const,
    text: `Games, page ${page} of ${pageCount}. ${GAMES_URL}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Games" },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Page ${page} of ${pageCount} · <${GAMES_URL}|Open games>`,
          },
        ],
      },
      {
        type: "table",
        column_settings: [{ is_wrapped: true }, { is_wrapped: true }, { is_wrapped: true }, { align: "center" }],
        rows,
      },
      ...(buttons.length
        ? [
            {
              type: "actions",
              block_id: "games-pagination",
              elements: buttons,
            },
          ]
        : []),
    ],
  };
}

function nestedNumber(value: FirestoreValue | undefined, ...path: string[]) {
  let current = value;

  for (const key of path) {
    current = current?.mapValue?.fields?.[key];
  }

  if (!current) {
    return null;
  }

  const parsed = Number(current.integerValue ?? current.doubleValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function gameFromDocument(document: GameDocument): SlackGame | null {
  const id = document.name?.split("/").pop() ?? "";

  if (!id) {
    return null;
  }

  const fields = document.fields;
  const dateMs = Date.parse(fields?.date?.timestampValue ?? "");
  const startTime = stringField(fields, "startTime");
  const result = fields?.result;

  return {
    id,
    title: stringField(fields, "title"),
    location: stringField(fields, "location"),
    startTime,
    dateMs: Number.isFinite(dateMs) ? dateMs : 0,
    startMs: Number.isFinite(dateMs) ? startMsFrom(dateMs, startTime) : 0,
    status: stringField(fields, "status") || "upcoming",
    durationMinutes: numberField(fields, "matchDurationMinutes"),
    startedAtMs: numberField(fields, "startedAtMs"),
    scoreA: nestedNumber(result, "a"),
    scoreB: nestedNumber(result, "b"),
  };
}

async function listGames(projectId: string) {
  const games: SlackGame[] = [];
  let pageToken = "";
  let pages = 0;

  do {
    pages += 1;
    const params = new URLSearchParams();
    params.set("pageSize", "300");

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const page = await googleJson<{ documents?: GameDocument[]; nextPageToken?: string }>(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/games?${params}`,
    );

    if (!page.ok) {
      throw new Error("Could not load games");
    }

    for (const document of page.data.documents ?? []) {
      const game = gameFromDocument(document);

      if (game) {
        games.push(game);
      }
    }

    pageToken = page.data.nextPageToken ?? "";
  } while (pageToken && pages < 10);

  return games;
}

let cached:
  | {
      expiresAt: number;
      games: SlackGame[];
    }
  | undefined;

export async function slackGamesMessage(page: number) {
  if (!cached || cached.expiresAt <= Date.now()) {
    cached = {
      expiresAt: Date.now() + 60_000,
      games: await listGames(await googleProjectId()),
    };
  }

  return gamesMessage(cached.games, page);
}

export function gamesPageFromText(text: string | null) {
  const match = text?.trim().match(/^\d+$/);
  return match ? Number(match[0]) : 1;
}
