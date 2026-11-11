import { googleJson, googleProjectId, numberField } from "../fcm-http";
import { leaderboardMessage, type LeaderboardPlayer } from "./leaderboard-rank";

const PAGE_SIZE = 300;

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

type UserDocument = {
  fields?: Record<string, FirestoreValue>;
};

function statNumber(
  fields: Record<string, FirestoreValue> | undefined,
  key: string,
) {
  const value = fields?.[key];

  return numberField(value ? { value } : undefined, "value");
}

function awardTotal(value: FirestoreValue | undefined) {
  const fields = value?.mapValue?.fields;

  if (!fields) {
    return 0;
  }

  return Object.values(fields).reduce((sum, entry) => sum + Math.max(0, statNumber({ entry }, "entry")), 0);
}

function careerPoints(goals: number, assists: number, awards: number) {
  return (goals * 30 + assists * 17 + awards * 20) / 10;
}

function playerFromDocument(document: UserDocument): LeaderboardPlayer {
  const stats = document.fields?.stats?.mapValue?.fields;
  const goals = statNumber(stats, "goals");
  const assists = statNumber(stats, "assists");
  const awards = awardTotal(stats?.awards);
  const points =
    stats && "points" in stats
      ? statNumber(stats, "points")
      : careerPoints(goals, assists, awards);

  return {
    displayName: document.fields?.displayName?.stringValue?.trim() || "Player",
    position: document.fields?.position?.stringValue?.trim() || "",
    games: statNumber(stats, "games"),
    goals,
    assists,
    wins: statNumber(stats, "wins"),
    awards,
    points,
  };
}

async function listPlayers(projectId: string) {
  const players: LeaderboardPlayer[] = [];
  let pageToken = "";
  let pages = 0;

  do {
    pages += 1;
    const params = new URLSearchParams();
    params.set("pageSize", String(PAGE_SIZE));

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const page = await googleJson<{ documents?: UserDocument[]; nextPageToken?: string }>(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?${params}`,
    );

    if (!page.ok) {
      throw new Error("Could not load the leaderboard");
    }

    for (const document of page.data.documents ?? []) {
      players.push(playerFromDocument(document));
    }

    pageToken = page.data.nextPageToken ?? "";
  } while (pageToken && pages < 10);

  return players;
}

let cached:
  | {
      expiresAt: number;
      body: ReturnType<typeof leaderboardMessage>;
    }
  | undefined;

export async function slackLeaderboardMessage() {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.body;
  }

  const players = await listPlayers(await googleProjectId());
  const body = leaderboardMessage(players);
  cached = { expiresAt: Date.now() + 60_000, body };

  return body;
}
