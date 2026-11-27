import { describe, expect, it } from "vitest";

import {
  canSetMatchPosition,
  getComputedMvpTallies,
  getGameMvp,
  getMatchPosition,
  usesPointsMvp,
  usesPositionScoring,
  type GameGoal,
  type GameParticipant,
  type GameStatus,
} from "@/types/game";

function participant(
  position: string,
  extra: Partial<GameParticipant> = {},
): GameParticipant {
  return {
    userId: "player",
    kind: "user",
    displayName: "Player",
    position,
    joinedBy: "staff",
    ...extra,
  };
}

describe("usesPositionScoring", () => {
  it("is off for a game with no scoringVersion", () => {
    expect(usesPositionScoring({})).toBe(false);
    expect(usesPositionScoring({ scoringVersion: 1 })).toBe(false);
  });

  it("is on from version 2", () => {
    expect(usesPositionScoring({ scoringVersion: 2 })).toBe(true);
  });
});

describe("getMatchPosition", () => {
  it("follows the profile while the game is upcoming", () => {
    expect(
      getMatchPosition({ status: "upcoming" }, participant("defender"), "forward"),
    ).toBe("forward");
  });

  it("keeps the joined position when the profile has none", () => {
    expect(getMatchPosition({ status: "upcoming" }, participant("defender"), "")).toBe(
      "defender",
    );
  });

  it("keeps a position staff picked for the match", () => {
    expect(
      getMatchPosition(
        { status: "upcoming" },
        participant("defender", { positionManual: true }),
        "forward",
      ),
    ).toBe("defender");
  });

  it("ignores a profile change once a stamped game has kicked off", () => {
    const saved = participant("defender");

    expect(
      getMatchPosition({ status: "active", scoringVersion: 2 }, saved, "forward"),
    ).toBe("defender");
    expect(
      getMatchPosition({ status: "completed", scoringVersion: 2 }, saved, "forward"),
    ).toBe("defender");
  });

  it("shows the profile position on a game from before the rule", () => {
    expect(
      getMatchPosition({ status: "completed" }, participant("defender"), "forward"),
    ).toBe("forward");
  });

  it("uses the position saved on a guest", () => {
    expect(
      getMatchPosition(
        { status: "upcoming" },
        participant("defender", { userId: "guest_1", kind: "guest" }),
        undefined,
      ),
    ).toBe("defender");
  });
});

describe("canSetMatchPosition", () => {
  it("allows an upcoming game and a stamped live game", () => {
    expect(canSetMatchPosition({ status: "upcoming" })).toBe(true);
    expect(canSetMatchPosition({ status: "active", scoringVersion: 2 })).toBe(true);
  });

  it("refuses a live game from before the rule", () => {
    expect(canSetMatchPosition({ status: "active" })).toBe(false);
  });

  it("refuses a finished or cancelled game", () => {
    expect(canSetMatchPosition({ status: "completed", scoringVersion: 2 })).toBe(false);
    expect(canSetMatchPosition({ status: "cancelled" })).toBe(false);
  });
});

function goal(id: string, scorerId: string, assistId?: string): GameGoal {
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

// a: 1 goal (3). b: 2 assists (3.4). c and d: 1 goal each (3).
const goals = [goal("1", "a"), goal("2", "c", "b"), goal("3", "d", "b")];

function mvpIds(
  status: GameStatus,
  scoringVersion?: number,
  defenders: string[] = [],
) {
  return getGameMvp(
    {
      status,
      scoringVersion,
      result: {
        a: 3,
        b: 0,
        winner: "a",
        goals,
        updatedAtMs: 1,
        updatedBy: "staff",
      },
    },
    defenders.map((userId) => ({
      userId,
      kind: "user" as const,
      position: "defender",
      positionManual: true,
    })),
  ).players.map((player) => player.playerId);
}

describe("usesPointsMvp", () => {
  it("is on only from version 3", () => {
    expect(usesPointsMvp({ scoringVersion: 3 })).toBe(true);
  });

  it("stays off for a game with no version and for a game stamped 2", () => {
    expect(usesPointsMvp({})).toBe(false);
    expect(usesPointsMvp({ scoringVersion: 2 })).toBe(false);
  });
});

describe("auto MVP", () => {
  it("keeps goals, then assists on a match already stamped 2", () => {
    expect(mvpIds("completed").sort()).toEqual(["a", "c", "d"]);
    expect(mvpIds("completed", 2).sort()).toEqual(["a", "c", "d"]);
    expect(mvpIds("upcoming").sort()).toEqual(["a", "c", "d"]);
    expect(getComputedMvpTallies(goals).map((tally) => tally.scorerId).sort()).toEqual([
      "a",
      "c",
      "d",
    ]);
  });

  it("picks the higher match points on a game created with version 3", () => {
    expect(mvpIds("upcoming", 3)).toEqual(["b"]);
    expect(mvpIds("active", 3)).toEqual(["b"]);
    expect(mvpIds("completed", 3)).toEqual(["b"]);
  });

  it("counts a defender goal at 4 and a defender assist at 2", () => {
    expect(mvpIds("active", 3, ["a"])).toEqual(["a"]);
  });

  it("shares the award when match points are equal", () => {
    const tied = [
      goal("1", "forward"),
      goal("2", "forward", "defender"),
      goal("3", "defender"),
    ];

    expect(
      getGameMvp(
        {
          status: "active",
          scoringVersion: 3,
          result: {
            a: 3,
            b: 0,
            winner: "a",
            goals: tied,
            updatedAtMs: 1,
            updatedBy: "staff",
          },
        },
        [
          {
            userId: "defender",
            kind: "user",
            position: "defender",
            positionManual: true,
          },
        ],
      )
        .players.map((player) => player.playerId)
        .sort(),
    ).toEqual(["defender", "forward"]);
  });

  it("keeps a manual MVP when points would pick someone else", () => {
    const mvp = getGameMvp({
      status: "active",
      scoringVersion: 3,
      result: {
        a: 3,
        b: 0,
        winner: "a",
        goals,
        updatedAtMs: 1,
        updatedBy: "staff",
        awards: [
          {
            id: "mvp",
            kind: "mvp",
            title: "MVP",
            source: "manual",
            players: [{ playerId: "a", playerName: "a" }],
            createdBy: "admin",
            createdAtMs: 1,
          },
        ],
      },
    });

    expect(mvp.source).toBe("manual");
    expect(mvp.players.map((player) => player.playerId)).toEqual(["a"]);
  });
});
