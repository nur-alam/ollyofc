import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSquad } from "@/features/players/player.hooks";
import type { GameParticipant } from "@/types/game";
import type { UserProfile } from "@/types/user";
import { formatPosition } from "@/types/player";

type JoinUsersDialogProps = {
  open: boolean;
  savingId: string;
  participants: GameParticipant[];
  onClose: () => void;
  onJoin: (user: UserProfile) => Promise<void>;
};

export function JoinUsersDialog({
  open,
  savingId,
  participants,
  onClose,
  onJoin,
}: JoinUsersDialogProps) {
  const [search, setSearch] = useState("");
  const { users, loading } = useSquad({
    search: "",
    position: "all",
    status: "active",
  });

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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border bg-background p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Add player to game</h2>
            <p className="text-sm text-muted-foreground">
              Manually join an active squad member.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

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
      </div>
    </div>
  );
}
