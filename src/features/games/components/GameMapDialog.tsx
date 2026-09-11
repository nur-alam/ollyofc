import { ExternalLinkIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getGameMapEmbedUrl, type Game } from "@/types/game";

type GameMapDialogProps = {
  open: boolean;
  game: Pick<Game, "location" | "mapUrl">;
  onClose: () => void;
};

export function GameMapDialog({ open, game, onClose }: GameMapDialogProps) {
  const embedUrl = getGameMapEmbedUrl(game);

  if (!open || !game.mapUrl || !embedUrl) {
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
        aria-labelledby="game-map-dialog-title"
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-background shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b p-4">
          <div className="min-w-0">
            <h2 id="game-map-dialog-title" className="text-lg font-semibold">
              Map
            </h2>
            {game.location ? (
              <p className="truncate text-sm text-muted-foreground">{game.location}</p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close map">
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-muted">
          <iframe
            title={`Map of ${game.location || "game location"}`}
            src={embedUrl}
            className="aspect-[4/3] w-full border-0 sm:aspect-video"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <a
            href={game.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            <ExternalLinkIcon className="h-4 w-4" />
            Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
