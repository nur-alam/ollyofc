import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button, buttonVariants } from "@/components/ui/button";
import { GameCountDown } from "@/features/games/components/GameCountDown";
import { GameElapsedTimer } from "@/features/games/components/GameElapsedTimer";
import { GamePlayStatusControl } from "@/features/games/components/GamePlayStatusControl";
import { GameResultBoard } from "@/features/games/components/GameResultBoard";
import { GameResultUpdate } from "@/features/games/components/GameResultUpdate";
import { GameStatusBadge } from "@/features/games/components/GameStatusBadge";
import { GameTeamsPanel } from "@/features/games/components/GameTeamsPanel";
import { JoinedPlayersList } from "@/features/games/components/JoinedPlayersList";
import { JoinUsersDialog } from "@/features/games/components/JoinUsersDialog";
import {
  useGame,
  useParticipants,
  useCanPlayerLeave,
  useNow,
} from "@/features/games/game.hooks";
import {
  getErrorMessage,
  joinGame,
  leaveGame,
} from "@/features/games/game.service";
import { useAuthStore } from "@/features/auth/auth.store";
import { cn } from "@/lib/utils";
import { isStaffRole } from "@/types/user";
import type { UserProfile } from "@/types/user";
import {
  canChangeGamePlayStatus,
  canRemoveGamePlayers,
  canShowGameResult,
  canUpdateGameResult,
  formatGameDate,
  formatGameTime,
  getGameDisplayTitle,
  getGameListBadge,
  hasGameTeams,
  isGameInPlay,
  isMatchClockRunning,
  isUpcomingGame,
} from "@/types/game";

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

export function GameDetailPage() {
  const { gameId } = useParams();
  const { firebaseUser, profile } = useAuthStore();
  const isStaff = profile ? isStaffRole(profile.role) : false;
  const isAdmin = profile?.role === "admin";
  const { game, loading, errorMessage } = useGame(gameId);
  const { participants } = useParticipants(gameId);
  const now = useNow(1000);

  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [savingId, setSavingId] = useState("");

  const upcoming = game ? isUpcomingGame(game, now) : false;
  const inPlay = game ? isGameInPlay(game, now) : false;
  const showResult = game ? canShowGameResult(game, now) : false;
  const canEditResult = Boolean(isStaff && game && canUpdateGameResult(game, now));
  const canEditTeams = Boolean(isStaff && game && game.status === "upcoming");
  const alreadyJoined = Boolean(
    profile && participants.some((participant) => participant.userId === profile.id),
  );
  const atCapacity = Boolean(
    game?.maxPlayers && participants.length >= game.maxPlayers,
  );
  const canLeave = useCanPlayerLeave(game);

  const handleJoinSelf = async () => {
    if (!gameId || !profile) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      await joinGame(gameId, profile, profile.id);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not join this game."));
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveSelf = async () => {
    if (!gameId || !profile || !canLeave) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      await leaveGame(gameId, profile.id);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not leave this game."));
    } finally {
      setSaving(false);
    }
  };

  const handleStaffJoin = async (user: UserProfile) => {
    if (!gameId || !profile) {
      return;
    }

    setSavingId(user.id);
    setActionError("");

    try {
      await joinGame(gameId, user, profile.id);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not add this player."));
    } finally {
      setSavingId("");
    }
  };

  const handleStaffRemove = async (userId: string) => {
    if (!gameId) {
      return;
    }

    setSavingId(userId);
    setActionError("");

    try {
      await leaveGame(gameId, userId, { bypassLeaveLock: true });
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not remove this player."));
    } finally {
      setSavingId("");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl p-8 text-center text-sm text-muted-foreground">
        Loading game...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Game not found</h1>
        <p className="mt-2 text-muted-foreground">
          {errorMessage || "This game does not exist."}
        </p>
        <Link
          to="/games"
          className={cn(buttonVariants({ variant: "outline" }), "mt-6 inline-flex no-underline")}
        >
          Back to games
        </Link>
      </div>
    );
  }

  const badge = getGameListBadge(game, now);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <Link
          to="/games"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Back to games
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {getGameDisplayTitle(game)}
          </h1>
          <GameStatusBadge status={badge} />
          {isMatchClockRunning(game, now) ? <GameElapsedTimer game={game} now={now} /> : null}
        </div>
        <p className="mt-1 text-muted-foreground">
          {formatGameDate(game)} · {formatGameTime(game.startTime)}
        </p>
      </div>

      <dl className="grid gap-4 rounded-xl border bg-background p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="Location" value={game.location} />
        <DetailItem label="Kick-off" value={formatGameTime(game.startTime)} />
        <DetailItem
          label="Duration"
          value={`${game.matchDurationMinutes} minutes`}
        />
        {upcoming ? <GameCountDown game={game} /> : null}
        {isMatchClockRunning(game, now) ? (
          <div>
            <dt className="text-sm text-muted-foreground">Elapsed</dt>
            <dd className="mt-1">
              <GameElapsedTimer game={game} now={now} />
            </dd>
          </div>
        ) : null}
        <DetailItem
          label="Players joined"
          value={
            game.maxPlayers
              ? `${participants.length} / ${game.maxPlayers}`
              : String(participants.length)
          }
        />
        {game.notes && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Notes</dt>
            <dd className="mt-1 font-medium">{game.notes}</dd>
          </div>
        )}
        {isAdmin && profile && canChangeGamePlayStatus(game) ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <GamePlayStatusControl game={game} updatedBy={profile.id} />
          </div>
        ) : null}
      </dl>

      {actionError && <p className="error-text">{actionError}</p>}

      {/* Join section */}
      {upcoming && (
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Join this game</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {firebaseUser
                  ? "Confirm you can play, or staff can add someone from the squad."
                  : "Sign in to join this upcoming game."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!profile ? (
                <Link to="/login" className={cn(buttonVariants(), "no-underline")}>
                  Sign in to join
                </Link>
              ) : alreadyJoined ? (
                canLeave ? (
                  <Button variant="outline" disabled={saving} onClick={handleLeaveSelf}>
                    {saving ? "Leaving..." : "Leave game"}
                  </Button>
                ) : null
              ) : (
                <Button disabled={saving || atCapacity} onClick={handleJoinSelf}>
                  {saving ? "Joining..." : atCapacity ? "Game full" : "Join game"}
                </Button>
              )}
              {isStaff && (
                <Button variant="outline" onClick={() => setAddOpen(true)}>
                  Add player
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Result section */}
      {showResult && (
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">
            {isMatchClockRunning(game, now) ? "Live result" : "Final result"}
          </h2>
          <div className="mt-4">
            {canEditResult && profile ? (
              <GameResultUpdate
                game={game}
                participants={participants}
                updatedBy={profile.id}
              />
            ) : (
              <GameResultBoard game={game} />
            )}
          </div>
        </section>
      )}

      {(upcoming || inPlay || hasGameTeams(game) || game.teamBuild) && (
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <GameTeamsPanel
            game={game}
            participants={participants}
            canEdit={canEditTeams}
            generatedBy={profile?.id}
          />
        </section>
      )}

      <section className="rounded-xl border bg-background p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Joined players</h2>
          {isStaff && game.status !== "cancelled" ? (
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              Add player
            </Button>
          ) : null}
        </div>
        {participants.length ? (
          <JoinedPlayersList
            participants={participants}
            canRemove={isStaff && canRemoveGamePlayers(game)}
            savingId={savingId}
            onRemove={handleStaffRemove}
          />
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No one has joined yet.
          </p>
        )}
      </section>

      <JoinUsersDialog
        open={addOpen}
        savingId={savingId}
        participants={participants}
        onClose={() => setAddOpen(false)}
        onJoin={handleStaffJoin}
      />
    </div>
  );
}
