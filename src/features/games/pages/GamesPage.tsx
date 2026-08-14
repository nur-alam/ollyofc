import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GameFormDialog } from "@/features/games/components/GameFormDialog";
import { GameStatusBadge } from "@/features/games/components/GameStatusBadge";
import { useGames } from "@/features/games/game.hooks";
import { createGame, getErrorMessage } from "@/features/games/game.service";
import { useAuthStore } from "@/features/auth/auth.store";
import { cn } from "@/lib/utils";
import { isStaffRole } from "@/types/user";
import type { Game, GameInput } from "@/types/game";
import {
  formatGameDate,
  formatGameTime,
  getGameDisplayTitle,
  getGameListBadge,
} from "@/types/game";

function GameRowContent({ game }: { game: Game }) {
  const canOpen = game.status !== "cancelled";

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{getGameDisplayTitle(game)}</p>
          <GameStatusBadge status={getGameListBadge(game)} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatGameDate(game)} · {formatGameTime(game.startTime)} · {game.location}
        </p>
      </div>
      {canOpen && (
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      )}
    </div>
  );
}

export function GamesPage() {
  const { firebaseUser, profile } = useAuthStore();
  const isStaff = profile ? isStaffRole(profile.role) : false;
  const { games, loading, errorMessage } = useGames();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const handleCreate = async (input: GameInput) => {
    if (!firebaseUser) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      await createGame(input, firebaseUser.uid);
      setDialogOpen(false);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not create game."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Games</h1>
          <p className="text-muted-foreground">
            Open a game to join. Played games show match details.
          </p>
        </div>
        {isStaff && (
          <Button onClick={() => setDialogOpen(true)}>Create game</Button>
        )}
      </div>

      {(actionError || errorMessage) && (
        <p className="error-text">{actionError || errorMessage}</p>
      )}

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Loading games...
          </p>
        ) : games.length ? (
          <ul className="divide-y">
            {games.map((game) => {
              const canOpen = game.status !== "cancelled";

              return (
                <li key={game.id}>
                  {canOpen ? (
                    <Link
                      to={`/games/${game.id}`}
                      className={cn(
                        "block text-inherit no-underline transition-colors hover:bg-muted/60",
                      )}
                    >
                      <GameRowContent game={game} />
                    </Link>
                  ) : (
                    <GameRowContent game={game} />
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No games yet.
          </p>
        )}
      </div>

      <GameFormDialog
        open={dialogOpen}
        saving={saving}
        errorMessage={actionError}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
