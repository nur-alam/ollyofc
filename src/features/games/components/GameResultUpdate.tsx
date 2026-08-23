import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GameResultBoard } from "@/features/games/components/GameResultBoard";
import { WinningTeamPosterDialog } from "@/features/games/components/WinningTeamPosterDialog";
import {
  addGameGoal,
  finishGame,
  getErrorMessage,
  removeGameGoal,
  startGame,
  startGameToss,
} from "@/features/games/game.service";
import { useNow } from "@/features/games/game.hooks";
import { useAuthStore } from "@/features/auth/auth.store";
import {
  GAME_GOAL_KIND_LABELS,
  GAME_GOAL_KINDS,
  GAME_TEAM_IDS,
  canRecordGameGoals,
  getGameScore,
  getOpponentTeamId,
  getResultWinner,
  getTeamName,
  hasMatchEnded,
  isGameInPlay,
  isTossFlipping,
  isTossLanded,
  type Game,
  type GameGoalKind,
  type GameParticipant,
  type GameTeamId,
} from "@/types/game";

function isGameGoalKind(value: unknown): value is GameGoalKind {
  return (GAME_GOAL_KINDS as string[]).includes(value as string);
}

type GameResultUpdateProps = {
  game: Game;
  participants: GameParticipant[];
  updatedBy: string;
};

export function GameResultUpdate({
  game,
  participants,
  updatedBy,
}: GameResultUpdateProps) {
  const [goalKind, setGoalKind] = useState<GameGoalKind>("player");
  const [teamId, setTeamId] = useState<GameTeamId>("a");
  const [scorerId, setScorerId] = useState("");
  const [assistId, setAssistId] = useState("");
  const [saving, setSaving] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const now = useNow(game.toss && game.status === "upcoming" ? 32 : 1000);
  const isAdmin = useAuthStore((state) => state.profile?.role === "admin");
  const canRecordGoals = canRecordGameGoals(game);
  const canStart = game.status === "upcoming" && isGameInPlay(game, now);
  const tossing = isTossFlipping(game.toss, now);
  const tossed = isTossLanded(game.toss, now);
  const score = getGameScore(game);
  const winner = game.result?.winner ?? getResultWinner(score.a, score.b);
  const canShareResult = isAdmin && hasMatchEnded(game, now) && winner !== "draw";

  const needsScorer = goalKind === "player";
  // Own goals name the player who conceded it, but leaving it unknown is fine.
  const allowsPlayer = goalKind === "player" || goalKind === "own";
  const playerPlaceholder = goalKind === "own" ? "Unknown player" : "Select player";
  // For an own goal the picked team is the one that conceded it, so the point goes the other way.
  const creditedTeamId = goalKind === "own" ? getOpponentTeamId(teamId) : teamId;

  const scorers = useMemo(() => {
    const onTeam = participants.filter((participant) => participant.teamId === teamId);
    return onTeam.length ? onTeam : participants;
  }, [participants, teamId]);

  const selectedScorer = scorers.find((participant) => participant.userId === scorerId);

  const assisters = useMemo(
    () => scorers.filter((participant) => participant.userId !== scorerId),
    [scorers, scorerId],
  );

  const selectedAssister = assisters.find(
    (participant) => participant.userId === assistId,
  );

  const handleToss = async () => {
    setSaving(true);

    try {
      await startGameToss(game.id, updatedBy);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not start the toss."));
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async () => {
    setSaving(true);

    try {
      await startGame(game.id, updatedBy);
      toast.success("Game is live");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not start this game."));
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);

    try {
      await finishGame(game.id, updatedBy);
      setFinishOpen(false);
      toast.success("Game finished");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not finish this game."));
    } finally {
      setSaving(false);
    }
  };

  const handleAddGoal = async () => {
    if (needsScorer && !selectedScorer) {
      return;
    }

    setSaving(true);

    try {
      await addGameGoal(game.id, {
        teamId: creditedTeamId,
        kind: goalKind,
        ...(goalKind === "player" && selectedScorer
          ? {
              scorerId: selectedScorer.userId,
              scorerName: selectedScorer.displayName,
              assistId: selectedAssister?.userId,
              assistName: selectedAssister?.displayName,
            }
          : {}),
        ...(goalKind === "own" && selectedScorer
          ? {
              ownGoalById: selectedScorer.userId,
              ownGoalByName: selectedScorer.displayName,
            }
          : {}),
        createdBy: updatedBy,
      });
      setScorerId("");
      setAssistId("");

      if (goalKind === "own") {
        toast.success(`Own goal added for ${getTeamName(game, creditedTeamId)}`);
      } else if (goalKind === "team") {
        toast.success("Team goal added");
      } else {
        toast.success(selectedAssister ? "Goal and assist added" : "Goal added");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not add this goal."));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveGoal = async (goalId: string) => {
    setRemovingId(goalId);

    try {
      await removeGameGoal(game.id, goalId, updatedBy);
      toast.success("Goal removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not remove this goal."));
    } finally {
      setRemovingId("");
    }
  };

  const showActions =
    canStart ||
    canShareResult ||
    (game.status === "active" && isGameInPlay(game, now));

  return (
    <div className="space-y-5">
      {showActions ? (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canStart && !tossed && (
          <Button
            type="button"
            size="sm"
            disabled={saving || tossing}
            onClick={() => void handleToss()}
          >
            {saving || tossing ? "Tossing..." : "Start game"}
          </Button>
        )}
        {canStart && tossed && (
          <Button type="button" size="sm" disabled={saving} onClick={() => void handleStart()}>
            {saving ? "Starting..." : "Kick off"}
          </Button>
        )}
        {game.status === "active" && isGameInPlay(game, now) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => setFinishOpen(true)}
          >
            Finish game
          </Button>
        )}
        {canShareResult && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPosterOpen(true)}
          >
            Share result
          </Button>
        )}
      </div>
      ) : null}

      <GameResultBoard
        game={game}
        onRemoveGoal={canRecordGoals ? handleRemoveGoal : undefined}
        removingId={removingId}
      />

      {canRecordGoals ? (
      <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
        <div className="grid gap-2">
          <Label>Goal type</Label>
          <Select
            value={goalKind}
            onValueChange={(value) => {
              if (isGameGoalKind(value)) {
                setGoalKind(value);
                setScorerId("");
                setAssistId("");
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{GAME_GOAL_KIND_LABELS[goalKind]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GAME_GOAL_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {GAME_GOAL_KIND_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>{goalKind === "own" ? "Conceded by" : "Team"}</Label>
          <Select
            value={teamId}
            onValueChange={(value) => {
              if (value === "a" || value === "b") {
                setTeamId(value);
                setScorerId("");
                setAssistId("");
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{getTeamName(game, teamId)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GAME_TEAM_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {getTeamName(game, id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {goalKind === "own" ? (
            <p className="text-xs text-muted-foreground">
              Counts for {getTeamName(game, creditedTeamId)}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label>{goalKind === "own" ? "Own goal by" : "Scorer"}</Label>
          <Select
            value={scorerId || "unset"}
            onValueChange={(value) => {
              if (!value || value === "unset") {
                setScorerId("");
                setAssistId("");
                return;
              }

              setScorerId(value);

              if (value === assistId) {
                setAssistId("");
              }
            }}
          >
            <SelectTrigger className="w-full" disabled={!allowsPlayer}>
              <SelectValue placeholder={allowsPlayer ? playerPlaceholder : "Not needed"}>
                {selectedScorer?.displayName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">{playerPlaceholder}</SelectItem>
              {scorers.map((participant) => (
                <SelectItem key={participant.userId} value={participant.userId}>
                  {participant.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Assist</Label>
          <Select
            value={assistId || "unset"}
            onValueChange={(value) => {
              setAssistId(!value || value === "unset" ? "" : value);
            }}
          >
            <SelectTrigger className="w-full" disabled={!needsScorer || !selectedScorer}>
              <SelectValue placeholder="No assist">
                {selectedAssister?.displayName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">No assist</SelectItem>
              {assisters.map((participant) => (
                <SelectItem key={participant.userId} value={participant.userId}>
                  {participant.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          disabled={saving || (needsScorer && !selectedScorer)}
          onClick={() => void handleAddGoal()}
        >
          {saving ? "Adding..." : "Add goal"}
        </Button>
      </div>
      ) : null}

      {posterOpen && canShareResult && (
        <WinningTeamPosterDialog
          open={posterOpen}
          game={game}
          participants={participants}
          onClose={() => setPosterOpen(false)}
        />
      )}

      {finishOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!saving) {
              setFinishOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Finish game</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              End this match at {getTeamName(game, "a")} {score.a}–{score.b}{" "}
              {getTeamName(game, "b")}? The result will be final.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setFinishOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleFinish()}>
                {saving ? "Finishing..." : "Finish game"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
