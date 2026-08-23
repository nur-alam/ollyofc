import { useState } from "react";
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
import { getErrorMessage, setGamePlayStatus } from "@/features/games/game.service";
import {
  GAME_PLAY_STATUSES,
  GAME_PLAY_STATUS_LABELS,
  getGameScore,
  getTeamName,
  type Game,
  type GamePlayStatus,
} from "@/types/game";

type GamePlayStatusControlProps = {
  game: Game;
  updatedBy: string;
};

export function GamePlayStatusControl({
  game,
  updatedBy,
}: GamePlayStatusControlProps) {
  const [pending, setPending] = useState<GamePlayStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const score = getGameScore(game);

  const handleConfirm = async () => {
    if (!pending) {
      return;
    }

    setSaving(true);

    try {
      await setGamePlayStatus(game.id, pending, updatedBy);
      setPending(null);
      toast.success(
        pending === "active"
          ? "Game reopened. Score can be edited."
          : "Game marked completed",
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update game status."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div>
        <Label className="text-sm text-muted-foreground">Match status</Label>
        <div className="mt-1">
          <Select
            value={game.status}
            disabled={saving}
            onValueChange={(value) => {
              if (value === "active" || value === "completed") {
                if (value !== game.status) {
                  setPending(value);
                }
              }
            }}
          >
            <SelectTrigger className="w-full min-w-40">
              <SelectValue>
                {GAME_PLAY_STATUS_LABELS[game.status as GamePlayStatus]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GAME_PLAY_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {GAME_PLAY_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Set to Active to edit the score, then mark Completed again.
        </p>
      </div>

      {pending ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!saving) {
              setPending(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">
              {pending === "active" ? "Reopen game" : "Mark completed"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {pending === "active"
                ? "Set this match back to active so goals can be added or removed. Player stats will update again when you mark it completed."
                : `End this match at ${getTeamName(game, "a")} ${score.a}–${score.b} ${getTeamName(game, "b")}? The result will be final until an admin reopens it.`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setPending(null)}
              >
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleConfirm()}>
                {saving
                  ? "Saving..."
                  : pending === "active"
                    ? "Reopen game"
                    : "Mark completed"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
