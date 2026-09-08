import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";

export function GameMapLink({
  game,
  className,
  children,
}: {
  game: Pick<Game, "mapUrl">;
  className?: string;
  children: ReactNode;
}) {
  if (!game.mapUrl) {
    return children;
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

export function GameLocationText({
  game,
  className,
}: {
  game: Pick<Game, "location" | "mapUrl">;
  className?: string;
}) {
  return (
    <GameMapLink game={game} className={className}>
      {game.location}
    </GameMapLink>
  );
}
