import { env } from "../env";
import { googleJson, googleProjectId, numberField, stringField } from "../fcm-http";

const PLAYER_URL = "https://ollyofc.vercel.app/player";

export type SlackProfile = {
  id: string;
  email: string;
  displayName: string;
  position: string;
  games: number;
  points: number;
  goals: number;
  assists: number;
  wins: number;
  losses: number;
  draws: number;
  awards: Record<string, number>;
};

const AWARD_LABELS: Record<string, string> = {
  mvp: "MVP",
  mostSaves: "Most saves",
  bestDefender: "Best defender",
};

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

type UserDocument = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
};

type SlackUserResponse = {
  ok?: boolean;
  error?: string;
  user?: { profile?: { email?: string } };
};

export type SlackMeResult =
  | { ok: true; message: ReturnType<typeof profileMessage> }
  | { ok: false; text: string };

function botToken() {
  let value = env.SLACK_BOT_TOKEN ?? "";

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value;
}

function statNumber(fields: Record<string, FirestoreValue> | undefined, key: string) {
  const value = fields?.[key];
  return numberField(value ? { value } : undefined, "value");
}

function awardCounts(value: FirestoreValue | undefined) {
  const fields = value?.mapValue?.fields ?? {};
  const awards: Record<string, number> = {};

  for (const [key, entry] of Object.entries(fields)) {
    awards[key] = Math.max(0, statNumber({ entry }, "entry"));
  }

  return awards;
}

function awardTotal(awards: Record<string, number>) {
  return Object.values(awards).reduce((sum, count) => sum + Math.max(0, count), 0);
}

function careerPoints(goals: number, assists: number, awards: number) {
  return (goals * 30 + assists * 17 + awards * 20) / 10;
}

function awardLabel(key: string) {
  if (AWARD_LABELS[key]) {
    return AWARD_LABELS[key];
  }

  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function rate(part: number, games: number) {
  if (games <= 0) {
    return "0%";
  }

  return `${Math.round((part / games) * 100)}%`;
}

function goalsPerGame(goals: number, games: number) {
  if (games <= 0) {
    return "0";
  }

  return String(Number((goals / games).toFixed(2)));
}

function profileFromDocument(document: UserDocument): SlackProfile | null {
  const id = document.name?.split("/").pop() ?? "";

  if (!id) {
    return null;
  }

  const fields = document.fields;
  const stats = fields?.stats?.mapValue?.fields;
  const awards = awardCounts(stats?.awards);
  const goals = statNumber(stats, "goals");
  const assists = statNumber(stats, "assists");
  const points =
    stats && "points" in stats
      ? statNumber(stats, "points")
      : careerPoints(goals, assists, awardTotal(awards));

  return {
    id,
    email: stringField(fields, "email"),
    displayName: stringField(fields, "displayName") || "Player",
    position: stringField(fields, "position"),
    games: statNumber(stats, "games"),
    points,
    goals,
    assists,
    wins: statNumber(stats, "wins"),
    losses: statNumber(stats, "losses"),
    draws: statNumber(stats, "draws"),
    awards,
  };
}

function statTile(label: string, value: string) {
  return {
    type: "rich_text" as const,
    elements: [
      {
        type: "rich_text_section",
        elements: [
          { type: "text", text: label },
          { type: "text", text: `\n${value}`, style: { bold: true } },
        ],
      },
    ],
  };
}

function matchStatsTitle(name: string) {
  const suffix = " match stats";
  const trimmed = name.trim() || "Player";
  return `${trimmed.slice(0, 150 - suffix.length)}${suffix}`;
}

export function profileMessage(profile: SlackProfile) {
  const points = (Number.isFinite(profile.points) ? profile.points : 0).toFixed(1);
  const extraAwards = Object.entries(profile.awards)
    .filter(([key, count]) => key !== "mvp" && count > 0)
    .sort(([left], [right]) => awardLabel(left).localeCompare(awardLabel(right)));
  const tiles = [
    statTile("Games", String(profile.games)),
    statTile("Points", points),
    statTile("Goals", String(profile.goals)),
    statTile("Assists", String(profile.assists)),
    statTile("Wins", String(profile.wins)),
    statTile("Losses", String(profile.losses)),
    statTile("Draws", String(profile.draws)),
    statTile("Awards", String(awardTotal(profile.awards))),
    statTile("MVP", String(profile.awards.mvp ?? 0)),
    ...extraAwards.map(([key, count]) => statTile(awardLabel(key), String(count))),
    statTile("Win rate", rate(profile.wins, profile.games)),
    statTile("Loss rate", rate(profile.losses, profile.games)),
    statTile("Goals / game", goalsPerGame(profile.goals, profile.games)),
  ];
  const rows = [];

  for (let index = 0; index < tiles.length; index += 3) {
    const row = tiles.slice(index, index + 3);

    while (row.length < 3) {
      row.push({ type: "raw_text" as const, text: " " });
    }

    rows.push(row);
  }

  return {
    response_type: "ephemeral" as const,
    text: `${matchStatsTitle(profile.displayName)}: ${points} points from ${profile.games} games.`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: matchStatsTitle(profile.displayName) },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `From finished games you joined. · <${PLAYER_URL}/${profile.id}|Open profile>`,
          },
        ],
      },
      {
        type: "table",
        column_settings: [{ is_wrapped: true }, { is_wrapped: true }, { is_wrapped: true }],
        rows,
      },
    ],
  };
}

async function listProfiles(projectId: string) {
  const profiles: SlackProfile[] = [];
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
      throw new Error("Could not load profiles");
    }

    for (const document of page.data.documents ?? []) {
      const profile = profileFromDocument(document);

      if (profile) {
        profiles.push(profile);
      }
    }

    pageToken = page.data.nextPageToken ?? "";
  } while (pageToken && pages < 10);

  return profiles;
}

let cached:
  | {
      expiresAt: number;
      profiles: SlackProfile[];
    }
  | undefined;

async function profiles() {
  if (!cached || cached.expiresAt <= Date.now()) {
    cached = {
      expiresAt: Date.now() + 60_000,
      profiles: await listProfiles(await googleProjectId()),
    };
  }

  return cached.profiles;
}

export function profileByEmail(players: SlackProfile[], email: string) {
  const wanted = email.trim().toLowerCase();

  if (!wanted) {
    return undefined;
  }

  return players.find((player) => player.email.trim().toLowerCase() === wanted);
}

async function slackEmail(userId: string) {
  const token = botToken();

  if (!token) {
    return { email: "", problem: "SLACK_BOT_TOKEN is not set on the server." };
  }

  const url = new URL("https://slack.com/api/users.info");
  url.searchParams.set("user", userId);
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  const data = (await response.json()) as SlackUserResponse;

  if (!data.ok) {
    if (data.error === "missing_scope") {
      return {
        email: "",
        problem:
          "The Slack bot needs the users:read and users:read.email scopes. Add them, reinstall the app, and run /ollyofc-me again.",
      };
    }

    if (data.error === "invalid_auth" || data.error === "not_authed" || data.error === "token_revoked") {
      return {
        email: "",
        problem: "SLACK_BOT_TOKEN was rejected by Slack. Copy the Bot User OAuth Token into that Vercel variable.",
      };
    }

    return { email: "", problem: "Slack could not find the person who ran this command." };
  }

  const email = data.user?.profile?.email?.trim() ?? "";

  if (!email) {
    return {
      email: "",
      problem:
        "Slack did not share an email for your account. Add the users:read and users:read.email bot scopes, reinstall the app, and run /ollyofc-me again.",
    };
  }

  return { email, problem: "" };
}

export async function slackMeMessage(userId: string): Promise<SlackMeResult> {
  const trimmed = userId.trim();

  if (!trimmed) {
    return { ok: false, text: "Slack did not say who ran this command." };
  }

  const lookup = await slackEmail(trimmed);

  if (!lookup.email) {
    return { ok: false, text: lookup.problem };
  }

  const profile = profileByEmail(await profiles(), lookup.email);

  if (!profile) {
    return {
      ok: false,
      text: `No Ollyo FC profile uses ${lookup.email}. Sign in at https://ollyofc.vercel.app with that Google account.`,
    };
  }

  return { ok: true, message: profileMessage(profile) };
}
