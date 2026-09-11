import { useState } from "react";
import { MapIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GameMapDialog } from "@/features/games/components/GameMapDialog";
import { cn } from "@/lib/utils";
import { getGameMapEmbedUrl, type Game } from "@/types/game";

export function GameMapButton({
  game,
  className,
}: {
  game: Pick<Game, "location" | "mapUrl">;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const canOpenMap = Boolean(game.mapUrl && getGameMapEmbedUrl(game));

  if (!canOpenMap) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "mt-2 bg-black text-white hover:bg-black/80 focus-visible:border-black focus-visible:ring-black/30",
          className,
        )}
      >
        Map
        <MapIcon data-icon="inline-end" className="h-3.5 w-3.5" />
      </Button>
      <GameMapDialog open={open} game={game} onClose={() => setOpen(false)} />
    </>
  );
}

export function GameLocationText({
  game,
  className,
}: {
  game: Pick<Game, "location" | "mapUrl">;
  className?: string;
}) {
  return <span className={className}>{game.location}</span>;
}
