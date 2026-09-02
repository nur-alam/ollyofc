import { useEffect, useMemo, useState } from "react";

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
import { useSquad } from "@/features/players/player.hooks";
import type { GameParticipant, GameTeamId } from "@/types/game";
import { GAME_TEAM_IDS } from "@/types/game";
import type { UserProfile } from "@/types/user";
import {
  formatPosition,
  PLAYER_POSITIONS,
  POSITION_LABELS,
  type PlayerPosition,
} from "@/types/player";

export const GUEST_JOIN_SAVING_ID = "guest";

export type GuestJoinInput = {
  displayName: string;
  position?: string;
  teamId?: GameTeamId | null;
};

type JoinMode = "squad" | "guest";

type JoinUsersDialogProps = {
  open: boolean;
  savingId: string;
  participants: GameParticipant[];
  teamNames?: Record<GameTeamId, string>;
  onClose: () => void;
  onJoin: (user: UserProfile) => Promise<void>;
  onAddGuest: (input: GuestJoinInput) => Promise<void>;
};

function isPlayerPosition(value: string): value is PlayerPosition {
  return (PLAYER_POSITIONS as string[]).includes(value);
}

export function JoinUsersDialog({
  open,
  savingId,
  participants,
  teamNames,
  onClose,
  onJoin,
  onAddGuest,
}: JoinUsersDialogProps) {
  const [mode, setMode] = useState<JoinMode>("squad");
  const [search, setSearch] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPosition, setGuestPosition] = useState("");
  const [guestTeamId, setGuestTeamId] = useState<GameTeamId | "">("");
  const { users, loading } = useSquad({
    search: "",
    position: "all",
    status: "active",
  });
  const requiresTeam = Boolean(teamNames);
  const savingGuest = savingId === GUEST_JOIN_SAVING_ID;

  const joinedIds = useMemo(
    () => new Set(participants.map((participant) => participant.userId)),
    [participants],
  );

  const availableUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      if (joinedIds.has(user.id) || !user.isActive) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        user.displayName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    });
  }, [joinedIds, search, users]);

  useEffect(() => {
    if (open) {
      return;
    }

    setMode("squad");
    setSearch("");
    setGuestName("");
    setGuestPosition("");
    setGuestTeamId("");
  }, [open]);

  const handleAddGuest = async () => {
    const displayName = guestName.trim();

    if (!displayName || (requiresTeam && !guestTeamId)) {
      return;
    }

    await onAddGuest({
      displayName,
      position: guestPosition || undefined,
      teamId: guestTeamId || undefined,
    });
    setGuestName("");
    setGuestPosition("");
    setGuestTeamId("");
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border bg-background p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Add player to game</h2>
            <p className="text-sm text-muted-foreground">
              {mode === "guest"
                ? "Add a walk-on without creating an account."
                : "Manually join an active squad member."}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "squad" ? "default" : "outline"}
            onClick={() => setMode("squad")}
          >
            Squad
          </Button>
          <Button
            type="button"
            variant={mode === "guest" ? "default" : "outline"}
            onClick={() => setMode("guest")}
          >
            Guest
          </Button>
        </div>

        {mode === "squad" ? (
          <>
            <Input
              placeholder="Search squad..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Loading squad...
                </p>
              ) : availableUsers.length ? (
                <ul className="divide-y rounded-lg border">
                  {availableUsers.map((user) => (
                    <li key={user.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatPosition(user.position)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={savingId === user.id}
                        onClick={() => onJoin(user)}
                      >
                        {savingId === user.id ? "Adding..." : "Add"}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No available players to add.
                </p>
              )}
            </div>
          </>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAddGuest();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="guest-name">Name</Label>
              <Input
                id="guest-name"
                autoComplete="off"
                placeholder="Guest player name"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Position</Label>
              <Select
                value={guestPosition || "unset"}
                onValueChange={(value) => {
                  setGuestPosition(value && isPlayerPosition(value) ? value : "");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {guestPosition ? POSITION_LABELS[guestPosition as PlayerPosition] : "Not set"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Not set</SelectItem>
                  {PLAYER_POSITIONS.map((position) => (
                    <SelectItem key={position} value={position}>
                      {POSITION_LABELS[position]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {requiresTeam && teamNames ? (
              <div className="grid gap-2">
                <Label>Team</Label>
                <Select
                  value={guestTeamId || "unset"}
                  onValueChange={(value) => {
                    setGuestTeamId(value === "a" || value === "b" ? value : "");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {guestTeamId ? teamNames[guestTeamId] : "Select team"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Select team</SelectItem>
                    {GAME_TEAM_IDS.map((teamId) => (
                      <SelectItem key={teamId} value={teamId}>
                        {teamNames[teamId]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <Button
              type="submit"
              disabled={
                savingGuest ||
                !guestName.trim() ||
                (requiresTeam && !guestTeamId)
              }
            >
              {savingGuest ? "Adding..." : "Add guest"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
