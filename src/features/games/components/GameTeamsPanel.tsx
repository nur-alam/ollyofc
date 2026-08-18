import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildTeamDealOrder,
  formatPositionBreakdown,
  getTeamBuildProgress,
  getTeamPositionBreakdown,
  sortTeamPlayers,
} from "@/features/games/buildTeams";
import {
  cancelTeamBuild,
  clearGameTeams,
  getErrorMessage,
  moveParticipantTeam,
  renameGameTeam,
  saveGeneratedTeams,
  startTeamBuild,
} from "@/features/games/game.service";
import { useUserMap } from "@/features/players/player.hooks";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TEAM_NAMES,
  GAME_TEAM_IDS,
  getTeamName,
  hasGameTeams,
  type Game,
  type GameParticipant,
  type GameTeamId,
} from "@/types/game";
import { formatPosition } from "@/types/player";

const MIN_PLAYERS_TO_BUILD = 2;

type GameTeamsPanelProps = {
  game: Game;
  participants: GameParticipant[];
  canEdit: boolean;
  generatedBy?: string;
};

function PlayerAvatar({
  name,
  photoURL,
}: {
  name: string;
  photoURL?: string;
}) {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
      {photoURL ? (
        <img src={photoURL} alt={name} className="size-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function PlayerLine({
  participant,
  className,
}: {
  participant: GameParticipant;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <PlayerAvatar name={participant.displayName} photoURL={participant.photoURL} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{participant.displayName}</p>
        <p className="text-xs text-muted-foreground">
          {formatPosition(participant.position)}
        </p>
      </div>
    </div>
  );
}

function TeamName({
  name,
  canEdit,
  onSave,
}: {
  name: string;
  canEdit: boolean;
  onSave: (name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(name);
  }, [name]);

  const save = async () => {
    const nextName = value.trim() || name;

    if (nextName === name) {
      setEditing(false);
      setValue(name);
      return;
    }

    setSaving(true);

    try {
      await onSave(nextName);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return <h3 className="truncate text-sm font-semibold">{name}</h3>;
  }

  if (editing) {
    return (
      <Input
        value={value}
        autoFocus
        disabled={saving}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          void save();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void save();
          }

          if (event.key === "Escape") {
            setValue(name);
            setEditing(false);
          }
        }}
        className="h-7 max-w-40 font-semibold"
      />
    );
  }

  return (
    <button
      type="button"
      className="flex min-w-0 items-center gap-1 text-left"
      onClick={() => setEditing(true)}
    >
      <h3 className="truncate text-sm font-semibold">{name}</h3>
      <PencilIcon className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function GameTeamsPanel({
  game,
  participants,
  canEdit,
  generatedBy,
}: GameTeamsPanelProps) {
  const usersById = useUserMap();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [movingId, setMovingId] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    "build" | "rebuild" | "cancel" | null
  >(null);
  const persistedBuildKey = useRef("");

  const resolvedParticipants = useMemo(
    () =>
      participants.map((participant) => ({
        ...participant,
        position:
          usersById.get(participant.userId)?.position || participant.position,
      })),
    [participants, usersById],
  );

  const teamsReady = hasGameTeams(game);
  const teamBuild = game.teamBuild;
  const progress = teamBuild ? getTeamBuildProgress(teamBuild, nowMs) : null;
  const isAnimating = Boolean(teamBuild);
  const unassigned = resolvedParticipants.filter((participant) => !participant.teamId);
  const visibleAssignments = useMemo(() => {
    if (!teamBuild || !progress) {
      return {} as Record<string, GameTeamId>;
    }

    return Object.fromEntries(
      teamBuild.dealOrder
        .slice(0, progress.placed)
        .map((step) => [step.userId, step.teamId]),
    );
  }, [progress, teamBuild]);

  useEffect(() => {
    if (!teamBuild) {
      return;
    }

    const timer = window.setInterval(() => setNowMs(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [teamBuild]);

  useEffect(() => {
    if (!teamBuild || !progress || progress.phase !== "complete") {
      return;
    }

    if (!canEdit || !generatedBy) {
      return;
    }

    const buildKey = `${teamBuild.startedBy}-${teamBuild.dealOrder.length}-${teamBuild.startedAt?.toMillis() ?? 0}`;

    if (persistedBuildKey.current === buildKey) {
      return;
    }

    const isStarter = generatedBy === teamBuild.startedBy;
    const starterLeft = progress.completeForMs > 2500;

    if (!isStarter && !starterLeft) {
      return;
    }

    persistedBuildKey.current = buildKey;
    setSaving(true);
    setActionError("");

    const assignments = Object.fromEntries(
      teamBuild.dealOrder.map((step) => [step.userId, step.teamId]),
    );

    void saveGeneratedTeams(
      game.id,
      assignments,
      generatedBy,
      game.teams
        ? { a: game.teams.a.name, b: game.teams.b.name }
        : undefined,
    )
      .catch((error) => {
        persistedBuildKey.current = "";
        setActionError(getErrorMessage(error, "Could not build teams."));
      })
      .finally(() => {
        setSaving(false);
      });
  }, [canEdit, game.id, game.teams, generatedBy, progress, teamBuild]);

  const startBuild = async () => {
    if (!generatedBy || resolvedParticipants.length < MIN_PLAYERS_TO_BUILD) {
      return;
    }

    setConfirmAction(null);
    setActionError("");
    persistedBuildKey.current = "";

    try {
      await startTeamBuild(
        game.id,
        buildTeamDealOrder(resolvedParticipants),
        generatedBy,
      );
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not start team building."));
    }
  };

  const stopCountdown = async () => {
    setActionError("");

    try {
      await cancelTeamBuild(game.id);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not stop team building."));
    }
  };

  const handleCancel = async () => {
    setConfirmAction(null);
    setCanceling(true);
    setActionError("");

    try {
      await clearGameTeams(game.id);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not cancel teams."));
    } finally {
      setCanceling(false);
    }
  };

  const confirmCopy = confirmAction
    ? {
        build: {
          title: "Build teams",
          description:
            "Deal the joined players into two teams? Everyone watching will see the countdown and assignments.",
          confirmLabel: "Build teams",
          variant: "default" as const,
          onConfirm: () => void startBuild(),
        },
        rebuild: {
          title: "Rebuild teams",
          description:
            "Shuffle again and replace the current assignments? Custom team names will be kept.",
          confirmLabel: "Rebuild teams",
          variant: "default" as const,
          onConfirm: () => void startBuild(),
        },
        cancel: {
          title: "Cancel teams",
          description:
            "Clear both teams and all player assignments? This cannot be undone.",
          confirmLabel: "Cancel teams",
          variant: "destructive" as const,
          onConfirm: () => void handleCancel(),
        },
      }[confirmAction]
    : null;

  const handleRename = async (teamId: GameTeamId, name: string) => {
    setActionError("");

    try {
      await renameGameTeam(game.id, teamId, name);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not rename this team."));
      throw error;
    }
  };

  const handleMove = async (userId: string, teamId: GameTeamId) => {
    setMovingId(userId);
    setActionError("");

    try {
      await moveParticipantTeam(game.id, userId, teamId);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not move this player."));
    } finally {
      setMovingId("");
    }
  };

  const waitingPlayers = resolvedParticipants.filter(
    (participant) => !visibleAssignments[participant.userId],
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Teams</h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {progress?.phase === "countdown" ? (
            <>
              <span
                key={progress.countdown}
                className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground animate-in zoom-in-50 duration-200"
              >
                {progress.countdown}
              </span>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void stopCountdown()}
                >
                  Stop
                </Button>
              )}
            </>
          ) : progress?.phase === "dealing" || progress?.phase === "complete" ? (
            <p className="text-sm font-medium text-muted-foreground">
              Placing players...
            </p>
          ) : (
            canEdit && (
              <>
                {teamsReady && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || canceling}
                    onClick={() => setConfirmAction("cancel")}
                  >
                    {canceling ? "Canceling..." : "Cancel teams"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    saving ||
                    canceling ||
                    resolvedParticipants.length < MIN_PLAYERS_TO_BUILD
                  }
                  onClick={() =>
                    setConfirmAction(teamsReady ? "rebuild" : "build")
                  }
                >
                  {teamsReady ? "Rebuild teams" : "Build teams"}
                </Button>
              </>
            )
          )}
        </div>
      </div>

      {actionError && <p className="error-text mt-2">{actionError}</p>}

      {isAnimating ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {GAME_TEAM_IDS.map((teamId) => {
              const players = sortTeamPlayers(
                resolvedParticipants.filter(
                  (participant) => visibleAssignments[participant.userId] === teamId,
                ),
              );

              return (
                <section
                  key={teamId}
                  className="rounded-lg border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold">
                      {getTeamName(game, teamId) || DEFAULT_TEAM_NAMES[teamId]}
                    </h3>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {players.length} players
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatPositionBreakdown(getTeamPositionBreakdown(players))}
                  </p>
                  <ul className="mt-3 min-h-16 divide-y">
                    {players.map((participant) => (
                      <li
                        key={participant.userId}
                        className={cn(
                          "py-2 first:pt-0 last:pb-0",
                          progress?.lastDealtId === participant.userId &&
                            (teamId === "a"
                              ? "animate-in fade-in slide-in-from-left-4 duration-300"
                              : "animate-in fade-in slide-in-from-right-4 duration-300"),
                        )}
                      >
                        <PlayerLine participant={participant} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {waitingPlayers.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">
                {progress?.phase === "countdown"
                  ? `Starting in ${progress.countdown}`
                  : `Waiting (${waitingPlayers.length})`}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {waitingPlayers.map((participant) => (
                  <li
                    key={participant.userId}
                    className="rounded-full border bg-muted/50 px-2 py-1"
                  >
                    <PlayerLine participant={participant} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : !teamsReady ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {resolvedParticipants.length < MIN_PLAYERS_TO_BUILD
            ? "Need at least two joined players to build teams."
            : canEdit
              ? "Build two sides from the joined players."
              : "Teams have not been built yet."}
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {GAME_TEAM_IDS.map((teamId) => {
              const players = sortTeamPlayers(
                resolvedParticipants.filter(
                  (participant) => participant.teamId === teamId,
                ),
              );
              const otherTeam: GameTeamId = teamId === "a" ? "b" : "a";

              return (
                <section
                  key={teamId}
                  className="rounded-lg border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <TeamName
                      name={getTeamName(game, teamId)}
                      canEdit={canEdit}
                      onSave={(name) => handleRename(teamId, name)}
                    />
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {players.length} players
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatPositionBreakdown(getTeamPositionBreakdown(players))}
                  </p>
                  <ul className="mt-3 divide-y">
                    {players.map((participant) => (
                      <li
                        key={participant.userId}
                        className="flex items-center gap-2 py-2 first:pt-0 last:pb-0"
                      >
                        {canEdit && teamId === "b" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={movingId === participant.userId}
                            onClick={() => handleMove(participant.userId, otherTeam)}
                            aria-label={`Move ${participant.displayName} to ${getTeamName(game, otherTeam)}`}
                          >
                            <ArrowLeftIcon />
                          </Button>
                        )}
                        <PlayerLine participant={participant} className="flex-1" />
                        {canEdit && teamId === "a" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={movingId === participant.userId}
                            onClick={() => handleMove(participant.userId, otherTeam)}
                            aria-label={`Move ${participant.displayName} to ${getTeamName(game, otherTeam)}`}
                          >
                            <ArrowRightIcon />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {unassigned.length > 0 && (
            <div className="mt-3 rounded-lg border p-3">
              <p className="text-sm font-medium">
                Unassigned ({unassigned.length})
              </p>
              <ul className="mt-2 space-y-2">
                {unassigned.map((participant) => (
                  <li
                    key={participant.userId}
                    className="flex items-center justify-between gap-2"
                  >
                    <PlayerLine participant={participant} />
                    {canEdit && (
                      <div className="flex gap-1">
                        {GAME_TEAM_IDS.map((teamId) => (
                          <Button
                            key={teamId}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={movingId === participant.userId}
                            onClick={() => handleMove(participant.userId, teamId)}
                          >
                            {getTeamName(game, teamId)}
                          </Button>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {confirmCopy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmAction(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">{confirmCopy.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmCopy.description}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmCopy.variant}
                onClick={confirmCopy.onConfirm}
              >
                {confirmCopy.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
