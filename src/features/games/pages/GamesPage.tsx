import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRightIcon } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { GameFormDialog } from "@/features/games/components/GameFormDialog";
import { GameRowMenu } from "@/features/games/components/GameRowMenu";
import { GameStatusBadge } from "@/features/games/components/GameStatusBadge";
import { useGames } from "@/features/games/game.hooks";
import {
  createGame,
  deleteGame,
  getErrorMessage,
  updateGame,
} from "@/features/games/game.service";
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
  const isAdmin = profile?.role === "admin";
  const { games, loading, errorMessage } = useGames();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<Game | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
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
      toast.success("Game created");
    } catch (error) {
      const message = getErrorMessage(error, "Could not create game.");
      setActionError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (input: GameInput) => {
    if (!gameToEdit) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      await updateGame(gameToEdit.id, input);
      setGameToEdit(null);
      toast.success("Game updated");
    } catch (error) {
      const message = getErrorMessage(error, "Could not update this game.");
      setActionError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    setDialogOpen(false);
    setGameToEdit(null);
  };

  const handleDelete = async () => {
    if (!gameToDelete) {
      return;
    }

    setDeletingId(gameToDelete.id);
    setActionError("");

    try {
      await deleteGame(gameToDelete.id);
      setGameToDelete(null);
      toast.success("Game deleted");
    } catch (error) {
      const message = getErrorMessage(error, "Could not delete this game.");
      setActionError(message);
      toast.error(message);
    } finally {
      setDeletingId("");
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
                <li key={game.id} className="flex items-stretch">
                  {canOpen ? (
                    <Link
                      to={`/games/${game.id}`}
                      className={cn(
                        "min-w-0 flex-1 text-inherit no-underline transition-colors hover:bg-muted/60",
                      )}
                    >
                      <GameRowContent game={game} />
                    </Link>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <GameRowContent game={game} />
                    </div>
                  )}
                  {isStaff && (
                    <div className="flex items-center pr-3">
                      <GameRowMenu
                        game={game}
                        canView={canOpen}
                        canDelete={isAdmin}
                        onEdit={setGameToEdit}
                        onDelete={setGameToDelete}
                      />
                    </div>
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
        open={dialogOpen || Boolean(gameToEdit)}
        game={gameToEdit ?? undefined}
        saving={saving}
        errorMessage={actionError}
        onClose={closeForm}
        onSubmit={gameToEdit ? handleUpdate : handleCreate}
      />

      {gameToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!deletingId) {
              setGameToDelete(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Delete game</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Delete {getGameDisplayTitle(gameToDelete)}? Joined players will be
              removed too. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(deletingId)}
                onClick={() => setGameToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={Boolean(deletingId)}
                onClick={handleDelete}
              >
                {deletingId ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
