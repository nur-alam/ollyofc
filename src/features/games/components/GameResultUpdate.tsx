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
import {
  addGameGoal,
  finishGame,
  getErrorMessage,
  removeGameGoal,
  startGame,
} from "@/features/games/game.service";
import { useNow } from "@/features/games/game.hooks";
import {
  GAME_TEAM_IDS,
  getTeamName,
  isGameInPlay,
  type Game,
  type GameParticipant,
  type GameTeamId,
} from "@/types/game";

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
  const [teamId, setTeamId] = useState<GameTeamId>("a");
  const [scorerId, setScorerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const now = useNow(1000);

  const scorers = useMemo(() => {
    const onTeam = participants.filter((participant) => participant.teamId === teamId);
    return onTeam.length ? onTeam : participants;
  }, [participants, teamId]);

  const selectedScorer = scorers.find((participant) => participant.userId === scorerId);

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
      toast.success("Game finished");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not finish this game."));
    } finally {
      setSaving(false);
    }
  };

  const handleAddGoal = async () => {
    if (!selectedScorer) {
      return;
    }

    setSaving(true);

    try {
      await addGameGoal(game.id, {
        teamId,
        scorerId: selectedScorer.userId,
        scorerName: selectedScorer.displayName,
        createdBy: updatedBy,
      });
      setScorerId("");
      toast.success("Goal added");
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {game.status === "upcoming" && isGameInPlay(game, now) && (
          <Button type="button" size="sm" disabled={saving} onClick={() => void handleStart()}>
            {saving ? "Starting..." : "Start game"}
          </Button>
        )}
        {game.status === "active" && isGameInPlay(game, now) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => void handleFinish()}
          >
            {saving ? "Finishing..." : "Finish game"}
          </Button>
        )}
      </div>

      <GameResultBoard
        game={game}
        onRemoveGoal={handleRemoveGoal}
        removingId={removingId}
      />

      <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="grid gap-2">
          <Label>Team</Label>
          <Select
            value={teamId}
            onValueChange={(value) => {
              if (value === "a" || value === "b") {
                setTeamId(value);
                setScorerId("");
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GAME_TEAM_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {getTeamName(game, id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Scorer</Label>
          <Select
            value={scorerId || "unset"}
            onValueChange={(value) => {
              if (!value || value === "unset") {
                setScorerId("");
                return;
              }

              setScorerId(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select player" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Select player</SelectItem>
              {scorers.map((participant) => (
                <SelectItem key={participant.userId} value={participant.userId}>
                  {participant.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          disabled={saving || !selectedScorer}
          onClick={() => void handleAddGoal()}
        >
          {saving ? "Adding..." : "Add goal"}
        </Button>
      </div>
    </div>
  );
}
