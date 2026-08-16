import { useState } from "react";
import { Link } from "react-router-dom";

import { Button, buttonVariants } from "@/components/ui/button";
import { GameStatusBadge } from "@/features/games/components/GameStatusBadge";
import { GameTeamsPanel } from "@/features/games/components/GameTeamsPanel";
import { JoinedPlayersList } from "@/features/games/components/JoinedPlayersList";
import { JoinUsersDialog } from "@/features/games/components/JoinUsersDialog";
import { useParticipants, useCanPlayerLeave } from "@/features/games/game.hooks";
import { getErrorMessage, joinGame, leaveGame } from "@/features/games/game.service";
import { useAuthStore } from "@/features/auth/auth.store";
import { cn } from "@/lib/utils";
import { isStaffRole } from "@/types/user";
import type { UserProfile } from "@/types/user";
import {
  formatGameDate,
  formatGameTime,
  getGameDisplayTitle,
  type Game,
} from "@/types/game";

export function UpcomingGameCard({ game }: { game: Game }) {
  const { profile } = useAuthStore();
  const isStaff = profile ? isStaffRole(profile.role) : false;
  const { participants, loading } = useParticipants(game.id);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  const alreadyJoined = Boolean(
    profile && participants.some((participant) => participant.userId === profile.id),
  );
  const atCapacity = Boolean(game.maxPlayers && participants.length >= game.maxPlayers);
  const canLeave = useCanPlayerLeave(game);

  const handleJoin = async () => {
    if (!profile) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      await joinGame(game.id, profile, profile.id);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not join this game."));
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    if (!profile || !canLeave) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      await leaveGame(game.id, profile.id);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not leave this game."));
    } finally {
      setSaving(false);
    }
  };

  const handleStaffJoin = async (user: UserProfile) => {
    if (!profile) {
      return;
    }

    setSavingId(user.id);
    setActionError("");

    try {
      await joinGame(game.id, user, profile.id);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not add this player."));
    } finally {
      setSavingId("");
    }
  };

  const handleStaffRemove = async (userId: string) => {
    setSavingId(userId);
    setActionError("");

    try {
      await leaveGame(game.id, userId, { bypassLeaveLock: true });
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not remove this player."));
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
            <GameStatusBadge status="upcoming" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{formatGameDate(game)}</p>
        </div>

        {!profile ? (
          <Link
            to="/login"
            state={{ from: "/" }}
            className={cn(buttonVariants(), "no-underline")}
          >
            Sign in to join
          </Link>
        ) : alreadyJoined ? (
          canLeave ? (
            <Button variant="outline" disabled={saving} onClick={handleLeave}>
              {saving ? "Leaving..." : "Leave"}
            </Button>
          ) : null
        ) : (
          <Button disabled={saving || atCapacity} onClick={handleJoin}>
            {saving ? "Joining..." : atCapacity ? "Game full" : "Join"}
          </Button>
        )}
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted-foreground">Location</dt>
          <dd className="mt-1 font-medium">{game.location}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Kick-off</dt>
          <dd className="mt-1 font-medium">{formatGameTime(game.startTime)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Duration</dt>
          <dd className="mt-1 font-medium">{game.matchDurationMinutes} minutes</dd>
        </div>
      </dl>

      {actionError && <p className="error-text mt-3">{actionError}</p>}

      <div className="mt-4 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">
            Joined players ({participants.length})
          </h3>
          {isStaff && (
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              Add player
            </Button>
          )}
        </div>
        {loading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading players...</p>
        ) : participants.length ? (
          <JoinedPlayersList
            participants={participants}
            canRemove={isStaff}
            savingId={savingId}
            onRemove={handleStaffRemove}
          />
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No one has joined yet.</p>
        )}
      </div>

      <div className="mt-4 border-t pt-4">
        <GameTeamsPanel
          game={game}
          participants={participants}
          canEdit={isStaff}
          generatedBy={profile?.id}
        />
      </div>

      {isStaff && (
        <JoinUsersDialog
          open={addOpen}
          savingId={savingId}
          participants={participants}
          onClose={() => setAddOpen(false)}
          onJoin={handleStaffJoin}
        />
      )}
    </article>
  );
}
