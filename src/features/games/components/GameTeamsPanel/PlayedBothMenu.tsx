import { useState } from "react";
import { MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { GameParticipant } from "@/types/game";

type PlayedBothMenuProps = {
  participant: GameParticipant;
  disabled: boolean;
  onSelect: () => void;
};

export function PlayedBothMenu({
  participant,
  disabled,
  onSelect,
}: PlayedBothMenuProps) {
  const [open, setOpen] = useState(false);
  const playedBoth = participant.playedBoth === true;

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
      <PopoverContent align="end" className="w-40 gap-1 p-1">
        <button
          type="button"
          className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
          disabled={disabled}
          onClick={() => {
            setOpen(false);
            onSelect();
          }}
        >
          {playedBoth ? "One side" : "Both sides"}
        </button>
      </PopoverContent>
    </Popover>
  );
}
