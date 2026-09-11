import { useState, type ReactNode } from "react";
import { MapIcon } from "lucide-react";

import { GameMapDialog } from "@/features/games/components/GameMapDialog";
import { cn } from "@/lib/utils";
import { getGameMapEmbedUrl, type Game } from "@/types/game";

export function GameMapLink({
  game,
  className,
  children,
  onOpenMap,
}: {
  game: Pick<Game, "mapUrl">;
  className?: string;
  children: ReactNode;
  onOpenMap?: () => void;
}) {
  if (!game.mapUrl) {
    return children;
  }

  if (onOpenMap) {
    return (
      <button
        type="button"
        onClick={onOpenMap}
        className={cn(
          "mt-1 cursor-pointer text-left underline-offset-4 hover:underline",
          className,
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <a
      href={game.mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("mt-1 underline-offset-4 hover:underline", className)}
    >
      {children}
    </a>
  );
}

export function GameMapPreview({
  game,
  className,
}: {
  game: Pick<Game, "location" | "mapUrl">;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const embedUrl = getGameMapEmbedUrl(game);

  if (!game.mapUrl || !embedUrl) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative mt-2 block w-full overflow-hidden rounded-lg border bg-muted text-left shadow-sm transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        aria-label={`Open map for ${game.location || "this location"}`}
      >
        <iframe
          title={`Map preview of ${game.location || "game location"}`}
          src={embedUrl}
          className="pointer-events-none aspect-[16/9] w-full border-0"
          loading="lazy"
          tabIndex={-1}
          referrerPolicy="no-referrer-when-downgrade"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/55 to-transparent px-3 py-2 text-xs font-medium text-white">
          <MapIcon className="h-3.5 w-3.5" />
          Tap to enlarge
        </span>
      </button>
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
  const [open, setOpen] = useState(false);
  const canOpenMap = Boolean(game.mapUrl && getGameMapEmbedUrl(game));

  return (
    <>
      <GameMapLink
        game={game}
        className={className}
        onOpenMap={canOpenMap ? () => setOpen(true) : undefined}
      >
        {game.location}
      </GameMapLink>
      {canOpenMap ? (
        <GameMapDialog open={open} game={game} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
