import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import {
  buildGameStatContributions,
  isSamePlayerGameStat,
} from "@/features/games/playerStats";
import type { Game, GameGoal, GameParticipant } from "@/types/game";
import {
  addStatTotals,
  applyStatDelta,
  careerPoints,
  EMPTY_STAT_TOTALS,
  parseStatGames,
  parseStatTotals,
  totalsFromContribution,
  type PlayerGameStat,
  type PlayerStatTotals,
} from "@/types/user";

function playerGoal(id: string, scorerId: string, assistId?: string): GameGoal {
  return {
    id,
    teamId: "a",
    kind: "player",
    scorerId,
    scorerName: scorerId,
    ...(assistId ? { assistId, assistName: assistId } : {}),
    createdBy: "staff",
    createdAtMs: 1,
  };
}

function ownGoal(id: string, ownGoalById: string): GameGoal {
  return {
    id,
    teamId: "b",
    kind: "own",
    ownGoalById,
    ownGoalByName: ownGoalById,
    createdBy: "staff",
    createdAtMs: 1,
  };
}

function participant(userId: string, position: string): GameParticipant {
  return {
    userId,
    kind: userId.startsWith("guest_") ? "guest" : "user",
    displayName: userId,
    position,
    teamId: "a",
    joinedBy: "staff",
  };
}

function finishedGame(goals: GameGoal[], scoringVersion?: number): Game {
  return {
    id: "game",
    date: Timestamp.fromMillis(0),
    startTime: "18:00",
    location: "POHS Sportsplex",
    status: "completed",
    matchDurationMinutes: 60,
    teamCount: 2,
    result: {
      a: goals.filter((goal) => goal.teamId === "a").length,
      b: goals.filter((goal) => goal.teamId === "b").length,
      winner: "a",
      goals,
      updatedAtMs: 1,
      updatedBy: "staff",
    },
    scoringVersion,
    createdBy: "staff",
  };
}

/** Goal and assist points only. The auto MVP adds 2 under either rule. */
function goalPoints(stat: PlayerGameStat) {
  return totalsFromContribution({ ...stat, awards: undefined }).points;
}

const roster = [
  participant("defender1", "defender"),
  participant("defender2", "defender"),
  participant("midfielder1", "midfielder"),
  participant("keeper1", "goalkeeper"),
  participant("guest_1", "defender"),
];

// defender1: 2 goals and 1 assist. defender2: 1 assist and 1 own goal.
// midfielder1: 1 goal and 1 assist. keeper1: 1 assist.
const goals = [
  playerGoal("1", "defender1", "defender2"),
  playerGoal("2", "defender1", "midfielder1"),
  playerGoal("3", "midfielder1", "defender1"),
  playerGoal("4", "guest_1", "keeper1"),
  ownGoal("5", "defender2"),
];

const oldGame = buildGameStatContributions(finishedGame(goals), roster);
const newGame = buildGameStatContributions(finishedGame(goals, 2), roster);

describe("a game with no scoringVersion", () => {
  it("scores a defender's goal at 3 and assist at 1.7", () => {
    expect(oldGame.defender1.goals).toBe(2);
    expect(oldGame.defender1.assists).toBe(1);
    expect(goalPoints(oldGame.defender1)).toBe(7.7);
    expect(goalPoints(oldGame.defender2)).toBe(1.7);
  });

  it("adds no defender counts", () => {
    expect(oldGame.defender1).not.toHaveProperty("defenderGoals");
    expect(oldGame.defender1).not.toHaveProperty("defenderAssists");
  });

  it("matches a contribution saved before the rule, so a re-sync writes nothing", () => {
    const saved = parseStatGames({
      defender1: { teamId: "a", result: "win", goals: 2, assists: 1, awards: { mvp: 1 } },
    });

    expect(isSamePlayerGameStat(saved.defender1, oldGame.defender1)).toBe(true);
  });

  it("keeps its points after reopen and finish", () => {
    const before = parseStatTotals({ games: 3, goals: 4, assists: 2, awards: { mvp: 1 } });
    const finished = applyStatDelta(before, undefined, oldGame.defender1);
    const reopened = applyStatDelta(finished, oldGame.defender1, undefined);
    const finishedAgain = applyStatDelta(reopened, undefined, oldGame.defender1);

    expect(reopened).toEqual(before);
    expect(finishedAgain).toEqual(finished);
    expect(finishedAgain.defenderGoals).toBe(0);
    expect(finishedAgain.defenderAssists).toBe(0);
  });
});

describe("a game with scoringVersion 2", () => {
  it("scores a defender's goal at 4 and assist at 2", () => {
    expect(newGame.defender1.defenderGoals).toBe(2);
    expect(newGame.defender1.defenderAssists).toBe(1);
    expect(goalPoints(newGame.defender1)).toBe(10);
    expect(goalPoints(newGame.defender2)).toBe(2);
  });

  it("keeps 3 and 1.7 for other positions", () => {
    expect(goalPoints(newGame.midfielder1)).toBe(4.7);
    expect(goalPoints(newGame.keeper1)).toBe(1.7);
    expect(newGame.midfielder1).not.toHaveProperty("defenderGoals");
  });

  it("does not change goal and assist counts", () => {
    expect(newGame.defender1.goals).toBe(oldGame.defender1.goals);
    expect(newGame.defender1.assists).toBe(oldGame.defender1.assists);
  });

  it("uses the match position, so the same player as a midfielder scores 3 and 1.7", () => {
    const asMidfielder = buildGameStatContributions(
      finishedGame(goals, 2),
      roster.map((player) =>
        player.userId === "defender1" ? { ...player, position: "midfielder" } : player,
      ),
    );

    expect(goalPoints(asMidfielder.defender1)).toBe(7.7);
    expect(asMidfielder.defender1).not.toHaveProperty("defenderGoals");
  });

  it("differs from a contribution saved under the old rule", () => {
    expect(isSamePlayerGameStat(oldGame.defender1, newGame.defender1)).toBe(false);
  });

  it("is removed exactly when the game is reopened", () => {
    const before = parseStatTotals({
      games: 4,
      goals: 5,
      assists: 4,
      wins: 2,
      losses: 1,
      draws: 1,
      awards: { mvp: 2 },
      points: 25.8,
    });
    const finished = applyStatDelta(before, undefined, newGame.defender1);

    // 25.8, plus 2 goals at 4, 1 assist at 2, and the MVP award at 2.
    expect(finished.points).toBe(37.8);
    expect(finished.goals).toBe(7);
    expect(finished.defenderGoals).toBe(2);
    expect(applyStatDelta(finished, newGame.defender1, undefined)).toEqual(before);
  });
});

describe("own goals and guests", () => {
  it("does not count an own goal as a goal or a defender goal", () => {
    expect(oldGame.defender2.goals).toBe(0);
    expect(newGame.defender2.goals).toBe(0);
    expect(newGame.defender2).not.toHaveProperty("defenderGoals");
  });

  it("gives a guest no contribution on a finished game", () => {
    expect(oldGame).not.toHaveProperty("guest_1");
    expect(newGame).not.toHaveProperty("guest_1");
  });
});

describe("career totals", () => {
  it("reads totals saved before the rule with the same points", () => {
    const saved = parseStatTotals({
      games: 4,
      goals: 5,
      assists: 4,
      awards: { mvp: 2 },
      points: 25.8,
    });

    expect(saved.points).toBe(25.8);
    expect(saved.defenderGoals).toBe(0);
    expect(saved.defenderAssists).toBe(0);
    expect(careerPoints(saved)).toBe(25.8);
  });

  it("rebuilds an old game at 3 and 1.7 and a new game at 4 and 2", () => {
    const rebuild = (stats: PlayerGameStat[]) =>
      stats.reduce<PlayerStatTotals>(
        (totals, stat) => addStatTotals(totals, totalsFromContribution(stat)),
        { ...EMPTY_STAT_TOTALS, awards: {} },
      );

    // Each game also gives defender1 the MVP award, worth 2.
    expect(rebuild([oldGame.defender1]).points).toBe(9.7);
    expect(rebuild([oldGame.defender1, oldGame.defender1]).points).toBe(19.4);

    const both = rebuild([oldGame.defender1, newGame.defender1]);

    expect(both.points).toBe(21.7);
    expect(both.goals).toBe(4);
    expect(both.assists).toBe(2);
    expect(both.defenderGoals).toBe(2);
    expect(both.defenderAssists).toBe(1);
  });

  it("gives MVP to the goal leaders on an old game and to the points leader on a new one", () => {
    // midfielder1 and keeper1 each score once, both assisted by defender1.
    const split = [
      playerGoal("s1", "midfielder1", "defender1"),
      playerGoal("s2", "keeper1", "defender1"),
    ];
    const oldSplit = buildGameStatContributions(finishedGame(split), roster);
    const stampedSplit = buildGameStatContributions(finishedGame(split, 2), roster);
    const newSplit = buildGameStatContributions(finishedGame(split, 3), roster);

    expect(oldSplit.midfielder1.awards).toEqual({ mvp: 1 });
    expect(oldSplit.keeper1.awards).toEqual({ mvp: 1 });
    expect(oldSplit.defender1.awards).toBeUndefined();
    expect(stampedSplit.midfielder1.awards).toEqual({ mvp: 1 });
    expect(stampedSplit.keeper1.awards).toEqual({ mvp: 1 });
    expect(stampedSplit.defender1.awards).toBeUndefined();
    expect(newSplit.defender1.awards).toEqual({ mvp: 1 });
    expect(newSplit.midfielder1.awards).toBeUndefined();
    expect(newSplit.keeper1.awards).toBeUndefined();
  });

  it("keeps tenths exact", () => {
    expect(careerPoints({ goals: 0, assists: 7, defenderAssists: 7 })).toBe(14);
    expect(
      careerPoints({ goals: 3, assists: 3, defenderGoals: 3, defenderAssists: 3 }),
    ).toBe(18);
    expect(careerPoints({ goals: 5, assists: 4, awards: { mvp: 2 } })).toBe(25.8);
  });
});
