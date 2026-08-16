import type { GameParticipant, GameTeamBuild, GameTeamId } from "@/types/game";
import { parsePosition, type PlayerPosition } from "@/types/player";

const FIELD_GROUPS: PlayerPosition[] = ["defender", "midfielder", "forward"];

export type TeamPositionBreakdown = Record<PlayerPosition, number>;

export function resolveParticipantPosition(participant: GameParticipant) {
  return parsePosition(participant.position);
}

export type TeamDealStep = {
  userId: string;
  teamId: GameTeamId;
};

export function buildTeamDealOrder(
  participants: GameParticipant[],
): TeamDealStep[] {
  const buckets: Record<PlayerPosition | "other", GameParticipant[]> = {
    goalkeeper: [],
    defender: [],
    midfielder: [],
    forward: [],
    other: [],
  };

  for (const participant of participants) {
    const position = resolveParticipantPosition(participant);
    buckets[position || "other"].push(participant);
  }

  for (const bucket of Object.values(buckets)) {
    bucket.sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  const order: TeamDealStep[] = [];
  const sizes = { a: 0, b: 0 };

  const assign = (participant: GameParticipant, teamId: GameTeamId) => {
    order.push({ userId: participant.userId, teamId });
    sizes[teamId] += 1;
  };

  const nextTeam = (): GameTeamId => (sizes.a <= sizes.b ? "a" : "b");

  const goalkeepers = buckets.goalkeeper;
  if (goalkeepers[0]) {
    assign(goalkeepers[0], "a");
  }
  if (goalkeepers[1]) {
    assign(goalkeepers[1], "b");
  }

  const remaining = [
    ...FIELD_GROUPS.flatMap((position) => buckets[position]),
    ...goalkeepers.slice(2),
    ...buckets.other,
  ];

  for (const participant of remaining) {
    assign(participant, nextTeam());
  }

  return order;
}

export const TEAM_BUILD_COUNTDOWN_MS = 10_000;
export const TEAM_BUILD_DEAL_INTERVAL_MS = 450;

export function getTeamBuildProgress(build: GameTeamBuild, nowMs: number) {
  const recordedStart = build.startedAtMs || build.startedAt?.toMillis() || nowMs;
  const startedAt = recordedStart > nowMs ? nowMs : recordedStart;
  const elapsed = Math.max(0, nowMs - startedAt);

  if (elapsed < TEAM_BUILD_COUNTDOWN_MS) {
    return {
      phase: "countdown" as const,
      countdown: Math.max(
        1,
        Math.ceil((TEAM_BUILD_COUNTDOWN_MS - elapsed) / 1000),
      ),
      placed: 0,
      lastDealtId: "",
      completeForMs: -1,
    };
  }

  const dealElapsed = elapsed - TEAM_BUILD_COUNTDOWN_MS;
  const placed = Math.min(
    build.dealOrder.length,
    Math.floor(dealElapsed / TEAM_BUILD_DEAL_INTERVAL_MS) + 1,
  );
  const lastDealtId = placed > 0 ? build.dealOrder[placed - 1]?.userId ?? "" : "";
  const completeAt =
    Math.max(0, build.dealOrder.length - 1) * TEAM_BUILD_DEAL_INTERVAL_MS + 400;

  return {
    phase:
      dealElapsed >= completeAt && placed >= build.dealOrder.length
        ? ("complete" as const)
        : ("dealing" as const),
    countdown: 1,
    placed,
    lastDealtId,
    completeForMs: dealElapsed - completeAt,
  };
}

export function buildTeams(
  participants: GameParticipant[],
): Record<string, GameTeamId> {
  return Object.fromEntries(
    buildTeamDealOrder(participants).map((step) => [step.userId, step.teamId]),
  );
}

export function getTeamPositionBreakdown(
  participants: GameParticipant[],
): TeamPositionBreakdown {
  return participants.reduce<TeamPositionBreakdown>(
    (breakdown, participant) => {
      const position = resolveParticipantPosition(participant);

      if (position) {
        breakdown[position] += 1;
      }

      return breakdown;
    },
    {
      goalkeeper: 0,
      defender: 0,
      midfielder: 0,
      forward: 0,
    },
  );
}

export function formatPositionBreakdown(breakdown: TeamPositionBreakdown) {
  return [
    `GK ${breakdown.goalkeeper}`,
    `DEF ${breakdown.defender}`,
    `MID ${breakdown.midfielder}`,
    `FWD ${breakdown.forward}`,
  ].join(" · ");
}

export function sortTeamPlayers(participants: GameParticipant[]) {
  const order: Record<string, number> = {
    goalkeeper: 0,
    defender: 1,
    midfielder: 2,
    forward: 3,
  };

  return [...participants].sort((left, right) => {
    const leftOrder = order[resolveParticipantPosition(left)] ?? 4;
    const rightOrder = order[resolveParticipantPosition(right)] ?? 4;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.displayName.localeCompare(right.displayName);
  });
}
