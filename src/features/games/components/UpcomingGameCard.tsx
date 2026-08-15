import { useState } from "react";
import { Link } from "react-router-dom";

import { Button, buttonVariants } from "@/components/ui/button";
import { GameStatusBadge } from "@/features/games/components/GameStatusBadge";
import { useParticipants } from "@/features/games/game.hooks";
import { getErrorMessage, joinGame, leaveGame } from "@/features/games/game.service";
import { useAuthStore } from "@/features/auth/auth.store";
import { cn } from "@/lib/utils";
import { formatPosition, type PlayerPosition } from "@/types/player";
import {
  formatGameDate,
  formatGameTime,
  getGameDisplayTitle,
  type Game,
} from "@/types/game";

export function UpcomingGameCard({ game }: { game: Game }) {
  const { profile } = useAuthStore();
  const { participants, loading } = useParticipants(game.id);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const alreadyJoined = Boolean(
    profile && participants.some((participant) => participant.userId === profile.id),
  );
  const atCapacity = Boolean(game.maxPlayers && participants.length >= game.maxPlayers);

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
    if (!profile) {
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

        {profile && alreadyJoined ? (
          <Button variant="outline" disabled={saving} onClick={handleLeave}>
            {saving ? "Leaving..." : "Leave"}
          </Button>
        ) : profile ? (
          <Button disabled={saving || atCapacity} onClick={handleJoin}>
            {saving ? "Joining..." : atCapacity ? "Game full" : "Join"}
          </Button>
        ) : (
          <Link
            to="/login"
            state={{ from: "/" }}
            className={cn(buttonVariants(), "no-underline")}
          >
            Sign in to join
          </Link>
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
        <h3 className="text-sm font-medium">
          Joined players ({participants.length})
        </h3>
        {loading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading players...</p>
        ) : participants.length ? (
          <ul className="flex flex-wrap gap-2 mt-3 divide-y rounded-lg border">
            {participants.map((participant) => (
              <li key={participant.userId} className="flex items-center gap-3 p-3">
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
                  {participant.photoURL ? (
                    <img
                      src={participant.photoURL}
                      alt={participant.displayName}
                      className="size-full object-cover"
                    />
                  ) : (
                    participant.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{participant.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPosition(participant.position as PlayerPosition | "")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No one has joined yet.</p>
        )}
      </div>
    </article>
  );
}
