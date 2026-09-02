import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GuestJoinInput } from "@/features/games/components/JoinUsersDialog";
import {
  GAME_TEAM_IDS,
  type GameParticipant,
  type GameTeamId,
} from "@/types/game";
import {
  PLAYER_POSITIONS,
  POSITION_LABELS,
  parsePosition,
  type PlayerPosition,
} from "@/types/player";

function isPlayerPosition(value: string): value is PlayerPosition {
  return (PLAYER_POSITIONS as string[]).includes(value);
}

type EditGuestDialogProps = {
  open: boolean;
  participant: GameParticipant | null;
  teamNames?: Record<GameTeamId, string>;
  saving: boolean;
  onClose: () => void;
  onSave: (input: GuestJoinInput) => Promise<void>;
};

export function EditGuestDialog({
  open,
  participant,
  teamNames,
  saving,
  onClose,
  onSave,
}: EditGuestDialogProps) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [teamId, setTeamId] = useState<GameTeamId | "">("");

  useEffect(() => {
    if (!open || !participant) {
      return;
    }

    setName(participant.displayName);
    setPosition(parsePosition(participant.position) || "");
    setTeamId(participant.teamId ?? "");
  }, [open, participant]);

  if (!open || !participant) {
    return null;
  }

  const displayName = name.trim();
  const unchanged =
    displayName === participant.displayName.trim() &&
    position === (parsePosition(participant.position) || "") &&
    (teamId || "") === (participant.teamId || "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!saving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Edit guest</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update this walk-on's name or position.
        </p>
        <form
          className="mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();

            if (!displayName || unchanged) {
              return;
            }

            void onSave({
              displayName,
              position: position || undefined,
              ...(teamNames ? { teamId: teamId || null } : {}),
            });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="edit-guest-name">Name</Label>
            <Input
              id="edit-guest-name"
              autoComplete="off"
              placeholder="Guest player name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Position</Label>
            <Select
              value={position || "unset"}
              onValueChange={(value) => {
                setPosition(value && isPlayerPosition(value) ? value : "");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {position ? POSITION_LABELS[position as PlayerPosition] : "Not set"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not set</SelectItem>
                {PLAYER_POSITIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {POSITION_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {teamNames ? (
            <div className="grid gap-2">
              <Label>Team</Label>
              <Select
                value={teamId || "unset"}
                onValueChange={(value) => {
                  setTeamId(value === "a" || value === "b" ? value : "");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {teamId ? teamNames[teamId] : "Unassigned"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Unassigned</SelectItem>
                  {GAME_TEAM_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {teamNames[id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !displayName || unchanged}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
