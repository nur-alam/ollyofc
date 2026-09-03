import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { PencilIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditGuestDialog } from "@/features/games/components/EditGuestDialog";
import type { GuestJoinInput } from "@/features/games/components/JoinUsersDialog";
import { getErrorMessage, updateGuestInGame } from "@/features/games/game.service";
import { useUserMap } from "@/features/players/player.hooks";
import { cn } from "@/lib/utils";
import {
  getGameTeamNames,
  canSwapGameTeams,
  isGuestParticipant,
  type Game,
  type GameParticipant,
} from "@/types/game";
import { formatPosition } from "@/types/player";

type JoinedPlayersListProps = {
  game: Game;
  participants: GameParticipant[];
  canRemove?: boolean;
  canEditGuest?: boolean;
  savingId?: string;
  onRemove?: (userId: string) => void;
};

export function JoinedPlayersList({
  game,
  participants,
  canRemove = false,
  canEditGuest = false,
  savingId = "",
  onRemove,
}: JoinedPlayersListProps) {
  const usersById = useUserMap();
  const [activeRemoveId, setActiveRemoveId] = useState("");
  const [editingGuest, setEditingGuest] = useState<GameParticipant | null>(null);
  const [savingGuest, setSavingGuest] = useState(false);

  useEffect(() => {
    if (!activeRemoveId) {
      return;
    }

    const hideRemoveIcon = () => setActiveRemoveId("");
    document.addEventListener("pointerdown", hideRemoveIcon);
    return () => document.removeEventListener("pointerdown", hideRemoveIcon);
  }, [activeRemoveId]);

  const handleSaveGuest = async (input: GuestJoinInput) => {
    if (!editingGuest) {
      return;
    }

    setSavingGuest(true);

    try {
      await updateGuestInGame(game.id, editingGuest.userId, input);
      setEditingGuest(null);
      toast.success("Guest updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update this guest."));
    } finally {
      setSavingGuest(false);
    }
  };

  return (
    <>
    <ul className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border sm:grid-cols-4">
      {participants.map((participant) => {
        const guest = isGuestParticipant(participant);
        const canAct = canRemove || (canEditGuest && guest);
        const isActionVisible =
          activeRemoveId === participant.userId ||
          savingId === participant.userId ||
          (editingGuest?.userId === participant.userId && savingGuest);

        return (
        <li
          key={participant.userId}
          className={cn(
            "group relative flex items-center gap-3 border-r border-b p-3",
            canAct && "cursor-pointer",
          )}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (!canAct) {
              return;
            }

            setActiveRemoveId((current) =>
              current === participant.userId ? "" : participant.userId,
            );
          }}
        >
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
            {participant.photoURL ? (
              <img
                src={participant.photoURL}
                alt={participant.displayName}
                className="size-full object-cover"
              />
            ) : (
              participant.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium">{participant.displayName}</span>
              {guest ? (
                <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[10px]">
                  Guest
                </Badge>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {guest && !participant.position
                ? "Guest"
                : formatPosition(
                    usersById.get(participant.userId)?.position ||
                      participant.position,
                  )}
            </p>
          </div>
          {canAct ? (
            <div
              className={cn(
                "absolute top-1.5 right-1.5 flex bg-muted pointer-events-none opacity-0 transition-opacity sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100",
                isActionVisible && "pointer-events-auto opacity-100",
              )}
            >
              {canEditGuest && guest ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={isActionVisible ? undefined : -1}
                  disabled={savingId === participant.userId || savingGuest}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveRemoveId("");
                    setEditingGuest(participant);
                  }}
                  aria-hidden={!isActionVisible}
                  aria-label={`Edit ${participant.displayName}`}
                >
                  <PencilIcon />
                </Button>
              ) : null}
              {canRemove && onRemove ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={isActionVisible ? undefined : -1}
                  disabled={savingId === participant.userId}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveRemoveId("");
                    onRemove(participant.userId);
                  }}
                  aria-hidden={!isActionVisible}
                  aria-label={`Remove ${participant.displayName}`}
                >
                  <XIcon />
                </Button>
              ) : null}
            </div>
          ) : null}
        </li>
        );
      })}
    </ul>
    <EditGuestDialog
      open={Boolean(editingGuest)}
      participant={editingGuest}
      teamNames={canSwapGameTeams(game) ? getGameTeamNames(game) : undefined}
      saving={savingGuest}
      onClose={() => {
        if (!savingGuest) {
          setEditingGuest(null);
        }
      }}
      onSave={handleSaveGuest}
    />
    </>
  );
}
