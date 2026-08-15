import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getGameDisplayTitle, type Game } from "@/types/game";

type GameRowMenuProps = {
  game: Game;
  canView: boolean;
  canDelete: boolean;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
};

export function GameRowMenu({
  game,
  canView,
  canDelete,
  onEdit,
  onDelete,
}: GameRowMenuProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${getGameDisplayTitle(game)}`}
          />
        }
      >
        <MoreHorizontalIcon />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 gap-1 p-1">
        {canView && (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              setOpen(false);
              navigate(`/games/${game.id}`);
            }}
          >
            <EyeIcon className="size-4" />
            View
          </button>
        )}
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
          onClick={() => {
            setOpen(false);
            onEdit(game);
          }}
        >
          <PencilIcon className="size-4" />
          Edit
        </button>
        {canDelete && (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
            onClick={() => {
              setOpen(false);
              onDelete(game);
            }}
          >
            <Trash2Icon className="size-4" />
            Delete
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
