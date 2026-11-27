import { useState } from "react";
import { CheckIcon, MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { GameParticipant } from "@/types/game";
import {
  PLAYER_POSITIONS,
  POSITION_LABELS,
  parsePosition,
  type PlayerPosition,
} from "@/types/player";

type PlayedBothMenuProps = {
  participant: GameParticipant;
  disabled: boolean;
  onSelect: () => void;
  /** Left out when this match's positions cannot be changed. */
  onSelectPosition?: (position: PlayerPosition) => void;
};

const itemClass =
  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50";

export function PlayedBothMenu({
  participant,
  disabled,
  onSelect,
  onSelectPosition,
}: PlayedBothMenuProps) {
  const [open, setOpen] = useState(false);
  const playedBoth = participant.playedBoth === true;
  const current = parsePosition(participant.position);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={`More actions for ${participant.displayName}`}
          />
        }
      >
        <MoreHorizontalIcon />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 gap-1 p-1">
        <button
          type="button"
          className={itemClass}
          disabled={disabled}
          onClick={() => {
            setOpen(false);
            onSelect();
          }}
        >
          {playedBoth ? "One side" : "Both sides"}
        </button>
        {onSelectPosition ? (
          <div
            role="group"
            aria-label="Match position"
            className="mt-1 flex flex-col gap-1 border-t pt-1"
          >
            <p className="px-2 pt-1 text-xs text-muted-foreground">
              Position this match
            </p>
            {PLAYER_POSITIONS.map((position) => (
              <button
                key={position}
                type="button"
                className={itemClass}
                disabled={disabled}
                aria-pressed={position === current}
                onClick={() => {
                  setOpen(false);

                  if (position !== current) {
                    onSelectPosition(position);
                  }
                }}
              >
                {POSITION_LABELS[position]}
                {position === current ? <CheckIcon className="size-4" /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
