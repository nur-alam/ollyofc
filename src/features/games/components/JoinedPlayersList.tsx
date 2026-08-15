import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUserMap } from "@/features/players/player.hooks";
import { cn } from "@/lib/utils";
import type { GameParticipant } from "@/types/game";
import { formatPosition } from "@/types/player";

type JoinedPlayersListProps = {
  participants: GameParticipant[];
  canRemove?: boolean;
  savingId?: string;
  onRemove?: (userId: string) => void;
};

export function JoinedPlayersList({
  participants,
  canRemove = false,
  savingId = "",
  onRemove,
}: JoinedPlayersListProps) {
  const usersById = useUserMap();
  const [activeRemoveId, setActiveRemoveId] = useState("");

  useEffect(() => {
    if (!activeRemoveId) {
      return;
    }

    const hideRemoveIcon = () => setActiveRemoveId("");
    document.addEventListener("pointerdown", hideRemoveIcon);
    return () => document.removeEventListener("pointerdown", hideRemoveIcon);
  }, [activeRemoveId]);

  return (
    <ul className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border sm:grid-cols-4">
      {participants.map((participant) => {
        const isRemoveVisible =
          activeRemoveId === participant.userId ||
          savingId === participant.userId;

        return (
        <li
          key={participant.userId}
          className={cn(
            "group relative flex items-center gap-3 border-r border-b p-3",
            canRemove && "cursor-pointer",
          )}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (!canRemove) {
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
            <p className="truncate font-medium">{participant.displayName}</p>
            <p className="text-xs text-muted-foreground">
              {formatPosition(
                usersById.get(participant.userId)?.position ||
                  participant.position,
              )}
            </p>
          </div>
          {canRemove && onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              tabIndex={isRemoveVisible ? undefined : -1}
              className={cn(
                "absolute top-1.5 right-1.5 bg-muted pointer-events-none opacity-0 transition-opacity sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100",
                isRemoveVisible && "pointer-events-auto opacity-100",
              )}
              disabled={savingId === participant.userId}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setActiveRemoveId("");
                onRemove(participant.userId);
              }}
              aria-hidden={!isRemoveVisible}
              aria-label={`Remove ${participant.displayName}`}
            >
              <XIcon />
            </Button>
          )}
        </li>
        );
      })}
    </ul>
  );
}
