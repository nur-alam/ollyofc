import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { Button, buttonVariants } from "@/components/ui/button";
import { GameElapsedTimer } from "@/features/games/components/GameElapsedTimer";
import { GameResultBoard } from "@/features/games/components/GameResultBoard";
import { GameResultUpdate } from "@/features/games/components/GameResultUpdate";
import { GameStatusBadge } from "@/features/games/components/GameStatusBadge";
import { GameTeamsPanel } from "@/features/games/components/GameTeamsPanel";
import { JoinedPlayersList } from "@/features/games/components/JoinedPlayersList";
import { JoinUsersDialog } from "@/features/games/components/JoinUsersDialog";
import { useParticipants, useNow } from "@/features/games/game.hooks";
import { getErrorMessage, joinGame, leaveGame } from "@/features/games/game.service";
import { useAuthStore } from "@/features/auth/auth.store";
import { cn } from "@/lib/utils";
import { isStaffRole } from "@/types/user";
import type { UserProfile } from "@/types/user";
import {
  formatGameDate,
  formatGameTime,
  getGameDisplayTitle,
  getGameListBadge,
  hasGameTeams,
  isMatchClockRunning,
  type Game,
} from "@/types/game";

export function LiveGameCard({
  game,
  allowUpdate = true,
}: {
  game: Game;
  allowUpdate?: boolean;
}) {
  const { profile } = useAuthStore();
  const isStaff = profile ? isStaffRole(profile.role) : false;
  const { participants, loading } = useParticipants(game.id);
  const now = useNow(1000);
  const clockRunning = isMatchClockRunning(game, now);
  const canManage =
    allowUpdate &&
    isStaff &&
    Boolean(profile) &&
    game.status !== "completed" &&
    game.status !== "cancelled";
  const teamsReady = hasGameTeams(game);
  const showTeams =
    game.status !== "cancelled" &&
    (teamsReady || game.teamBuild || game.status !== "completed");
  const showJoinedList = showTeams && !teamsReady && !game.teamBuild && game.status !== "completed";

  const [addOpen, setAddOpen] = useState(false);
  const [savingId, setSavingId] = useState("");

  const handleStaffJoin = async (user: UserProfile) => {
    if (!profile) {
      return;
    }

    setSavingId(user.id);

    try {
      await joinGame(game.id, user, profile.id);
      toast.success(`${user.displayName} added`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not add this player."));
    } finally {
      setSavingId("");
    }
  };

  const handleStaffRemove = async (userId: string) => {
    setSavingId(userId);

    try {
      await leaveGame(game.id, userId, { bypassLeaveLock: true });
      toast.success("Player removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not remove this player."));
    } finally {
      setSavingId("");
    }
  };

  return (
    <article className="rounded-xl border bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{getGameDisplayTitle(game)}</h2>
            <GameStatusBadge status={getGameListBadge(game, now)} />
            {clockRunning ? <GameElapsedTimer game={game} now={now} /> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatGameDate(game)} · {formatGameTime(game.startTime)} · {game.location}
          </p>
        </div>
        <Link
          to={`/games/${game.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "no-underline")}
        >
          View match
        </Link>
      </div>

      <div className="mt-5">
        {allowUpdate && isStaff && profile ? (
          <GameResultUpdate
            game={game}
            participants={participants}
            updatedBy={profile.id}
          />
        ) : (
          <GameResultBoard game={game} />
        )}
      </div>

      {showTeams ? (
        <div className="mt-5 border-t pt-4">
          <GameTeamsPanel
            game={game}
            participants={participants}
            canEdit={canManage && game.status === "upcoming"}
            generatedBy={profile?.id}
          />
        </div>
      ) : null}

      {showJoinedList ? (
        <div className="mt-5 border-t pt-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">
              Joined players ({participants.length})
            </h3>
            {canManage ? (
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                Add player
              </Button>
            ) : null}
          </div>
          {loading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading players...</p>
          ) : participants.length ? (
            <JoinedPlayersList
              participants={participants}
              canRemove={canManage}
              savingId={savingId}
              onRemove={handleStaffRemove}
            />
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No one has joined yet.</p>
          )}
        </div>
      ) : null}

      {canManage ? (
        <JoinUsersDialog
          open={addOpen}
          savingId={savingId}
          participants={participants}
          onClose={() => setAddOpen(false)}
          onJoin={handleStaffJoin}
        />
      ) : null}
    </article>
  );
}
