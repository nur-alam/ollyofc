import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isGuestParticipant, type GameParticipant } from "@/types/game";
import { formatPosition } from "@/types/player";

function PlayerAvatar({
  name,
  photoURL,
}: {
  name: string;
  photoURL?: string;
}) {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
      {photoURL ? (
        <img src={photoURL} alt={name} className="size-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

export function PlayerLine({
  participant,
  className,
}: {
  participant: GameParticipant;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <PlayerAvatar name={participant.displayName} photoURL={participant.photoURL} />
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium">{participant.displayName}</span>
          {isGuestParticipant(participant) ? (
            <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[10px]">
              Guest
            </Badge>
          ) : null}
          {participant.playedBoth ? (
            <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[10px]">
              Played both sides
            </Badge>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {isGuestParticipant(participant) && !participant.position
            ? "Guest"
            : formatPosition(participant.position)}
        </p>
      </div>
    </div>
  );
}
