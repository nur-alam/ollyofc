import { googleJson, googleProjectId, stringField } from "../fcm-http";

const PAGE_SIZE = 10;
const SQUAD_URL = "https://ollyofc.vercel.app/squad";

export type SlackSquadPlayer = {
  id: string;
  displayName: string;
  email: string;
  position: string;
  isSeed: boolean;
};

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: "Goalkeeper",
  defender: "Defender",
  midfielder: "Midfielder",
  forward: "Forward",
};

type FirestoreValue = {
  stringValue?: string;
  booleanValue?: boolean;
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

type UserDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
};

function cell(text: string) {
  return { type: "raw_text" as const, text };
}

function formatPosition(position: string) {
  const normalized = position.trim().toLowerCase();

  if (!normalized) {
    return "Not set";
  }

  return POSITION_LABELS[normalized] ?? position.trim();
}

export function sortSquad(players: SlackSquadPlayer[]) {
  return [...players].sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export function squadPageCount(count: number) {
  return Math.max(1, Math.ceil(count / PAGE_SIZE));
}

export function clampSquadPage(page: number, count: number) {
  const pageCount = squadPageCount(count);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.min(pageCount, Math.floor(page));
}

function playerLink(player: SlackSquadPlayer) {
  const name = player.displayName || "Player";
  const label = player.isSeed ? `${name} · Test` : name;

  return {
    type: "rich_text" as const,
    elements: [
      {
        type: "rich_text_section",
        elements: [
          {
            type: "link",
            text: label,
            url: `https://ollyofc.vercel.app/player/${player.id}`,
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

export function squadMessage(players: SlackSquadPlayer[], requestedPage: number) {
  const sorted = sortSquad(players);

  if (sorted.length === 0) {
    return {
      response_type: "in_channel" as const,
      text: "No players match your filters.",
    };
  }

  const page = clampSquadPage(requestedPage, sorted.length);
  const pageCount = squadPageCount(sorted.length);
  const slice = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rows = [
    ["Player", "Position", "Email"].map(cell),
    ...slice.map((player) => [
      playerLink(player),
      cell(formatPosition(player.position)),
      cell(player.email || "—"),
    ]),
  ];
  const buttons = [
    page > 1 ? pageButton("Previous", "squad-previous", page - 1) : null,
    page < pageCount ? pageButton("Next", "squad-next", page + 1) : null,
  ].filter((button) => button !== null);

  return {
    response_type: "in_channel" as const,
    text: `Squad, page ${page} of ${pageCount}. ${SQUAD_URL}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Squad" },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Active players · Page ${page} of ${pageCount} · <${SQUAD_URL}|Open squad>`,
          },
        ],
      },
      {
        type: "table",
        column_settings: [{ is_wrapped: true }, { align: "left" }, { is_wrapped: true }],
        rows,
      },
      ...(buttons.length
        ? [
            {
              type: "actions",
              block_id: "squad-pagination",
              elements: buttons,
            },
          ]
        : []),
    ],
  };
}

function isActive(fields: Record<string, FirestoreValue> | undefined) {
  const value = fields?.isActive;

  if (!value || !("booleanValue" in value)) {
    return true;
  }

  return value.booleanValue === true;
}

function playerFromDocument(document: UserDocument): SlackSquadPlayer | null {
  const id = document.name?.split("/").pop() ?? "";
  const fields = document.fields;

  if (!id || !isActive(fields)) {
    return null;
  }

  return {
    id,
    displayName: stringField(fields, "displayName") || "Player",
    email: stringField(fields, "email"),
    position: stringField(fields, "position"),
    isSeed: fields?.isSeed?.booleanValue === true,
  };
}

async function listSquad(projectId: string) {
  const players: SlackSquadPlayer[] = [];
  let pageToken = "";
  let pages = 0;

  do {
    pages += 1;
    const params = new URLSearchParams();
    params.set("pageSize", "300");

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const page = await googleJson<{ documents?: UserDocument[]; nextPageToken?: string }>(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?${params}`,
    );

    if (!page.ok) {
      throw new Error("Could not load squad");
    }

    for (const document of page.data.documents ?? []) {
      const player = playerFromDocument(document);

      if (player) {
        players.push(player);
      }
    }

    pageToken = page.data.nextPageToken ?? "";
  } while (pageToken && pages < 10);

  return players;
}

let cached:
  | {
      expiresAt: number;
      players: SlackSquadPlayer[];
    }
  | undefined;

export async function slackSquadMessage(page: number) {
  if (!cached || cached.expiresAt <= Date.now()) {
    cached = {
      expiresAt: Date.now() + 60_000,
      players: await listSquad(await googleProjectId()),
    };
  }

  return squadMessage(cached.players, page);
}

export function squadPageFromText(text: string | null) {
  const match = text?.trim().match(/^\d+$/);
  return match ? Number(match[0]) : 1;
}
