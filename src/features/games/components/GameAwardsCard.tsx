import { useMemo, useState, type ReactNode } from "react";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon, TrophyIcon } from "lucide-react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useUserMap } from "@/features/players/player.hooks";
import { useAuthStore } from "@/features/auth/auth.store";
import {
  addGameAward,
  clearGameMvp,
  getErrorMessage,
  removeGameAward,
  setGameMvp,
  updateGameAward,
} from "@/features/games/game.service";
import {
  GAME_AWARD_TITLE_PRESETS,
  canUpdateGameResult,
  formatParticipantName,
  getExtraAwards,
  getGameMvp,
  type Game,
  type GameAward,
  type GameAwardPlayer,
  type GameParticipant,
  type PlayerGoalTally,
} from "@/types/game";

function AwardPlayerLabel({
  name,
  photoURL,
  tally,
}: {
  name: string;
  photoURL?: string;
  tally?: PlayerGoalTally;
}) {
  return (
    <span className="flex min-w-0 items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2">
        <Avatar size="sm">
          {photoURL ? <AvatarImage src={photoURL} alt={name} /> : null}
          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="truncate winner-text">{name}</span>
      </span>
      {tally && (tally.count > 0 || tally.assists > 0) ? (
        <span className="flex shrink-0 items-center gap-1">
          {tally.count > 0 ? (
            <Badge variant="outline" className="tabular-nums" title="Goals">
              G-{tally.count}
            </Badge>
          ) : null}
          {tally.assists > 0 ? (
            <Badge variant="secondary" className="tabular-nums" title="Assists">
              A-{tally.assists}
            </Badge>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

function OverlayDialog({
  title,
  description,
  children,
  footer,
  onClose,
  saving,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!saving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border bg-background p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        ) : null}
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

function PlayerPicker({
  players,
  selectedIds,
  usersById,
  onToggle,
}: {
  players: GameAwardPlayer[];
  selectedIds: Set<string>;
  usersById: Map<string, { photoURL?: string }>;
  onToggle: (player: GameAwardPlayer) => void;
}) {
  if (!players.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Add players to this game before picking an award.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {players.map((player) => {
        const selected = selectedIds.has(player.playerId);

        return (
          <li key={player.playerId}>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60",
                selected && "bg-muted",
              )}
              onClick={() => onToggle(player)}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input",
                )}
                aria-hidden
              >
                {selected ? "✓" : null}
              </span>
              <Avatar size="sm">
                {usersById.get(player.playerId)?.photoURL ? (
                  <AvatarImage
                    src={usersById.get(player.playerId)?.photoURL}
                    alt={player.playerName}
                  />
                ) : null}
                <AvatarFallback>
                  {player.playerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{player.playerName}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function pickerPlayers(
  participants: GameParticipant[],
  extra: GameAwardPlayer[] = [],
) {
  const byId = new Map<string, GameAwardPlayer>();

  for (const participant of participants) {
    byId.set(participant.userId, {
      playerId: participant.userId,
      playerName: formatParticipantName(participant),
    });
  }

  for (const player of extra) {
    if (!byId.has(player.playerId)) {
      byId.set(player.playerId, player);
    }
  }

  return [...byId.values()].sort((left, right) =>
    left.playerName.localeCompare(right.playerName),
  );
}

function selectedPlayers(
  players: GameAwardPlayer[],
  selectedIds: Set<string>,
) {
  return players.filter((player) => selectedIds.has(player.playerId));
}

export function GameAwardsCard({
  game,
  participants = [],
  canEdit = false,
  updatedBy,
}: {
  game: Game;
  participants?: GameParticipant[];
  canEdit?: boolean;
  updatedBy?: string;
}) {
  const usersById = useUserMap();
  const isAdmin = useAuthStore((state) => state.profile?.role === "admin");
  const mvp = getGameMvp(game);
  const awards = getExtraAwards(game.result?.awards);
  const tallyById = useMemo(
    () => new Map(mvp.tallies.map((tally) => [tally.scorerId, tally])),
    [mvp.tallies],
  );
  const canEditAwards = Boolean(
    canEdit && updatedBy && canUpdateGameResult(game),
  );
  const canEditMvp = canEditAwards && isAdmin;
  const hasContent = mvp.players.length > 0 || awards.length > 0;

  const [mvpOpen, setMvpOpen] = useState(false);
  const [awardOpen, setAwardOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<GameAward | null>(null);
  const [awardTitle, setAwardTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState("");

  const mvpPicker = pickerPlayers(participants, mvp.players);
  const awardPicker = pickerPlayers(participants, editingAward?.players ?? []);

  if (!hasContent && !canEditAwards) {
    return null;
  }

  const openMvpEditor = () => {
    if (!canEditMvp) {
      return;
    }

    setSelectedIds(new Set(mvp.players.map((player) => player.playerId)));
    setMvpOpen(true);
  };

  const openAwardEditor = (award?: GameAward) => {
    setEditingAward(award ?? null);
    setAwardTitle(award?.title ?? "");
    setSelectedIds(new Set(award?.players.map((player) => player.playerId) ?? []));
    setAwardOpen(true);
  };

  const togglePlayer = (player: GameAwardPlayer) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(player.playerId)) {
        next.delete(player.playerId);
      } else {
        next.add(player.playerId);
      }

      return next;
    });
  };

  const handleSaveMvp = async () => {
    if (!updatedBy || !canEditMvp) {
      return;
    }

    const players = selectedPlayers(mvpPicker, selectedIds);

    if (!players.length) {
      toast.error("Pick at least one player.");
      return;
    }

    setSaving(true);

    try {
      await setGameMvp(game.id, players, updatedBy);
      setMvpOpen(false);
      toast.success(players.length > 1 ? "MVPs saved" : "MVP saved");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save the MVP."));
    } finally {
      setSaving(false);
    }
  };

  const handleUseAutoMvp = async () => {
    if (!updatedBy || !canEditMvp) {
      return;
    }

    setSaving(true);

    try {
      await clearGameMvp(game.id, updatedBy);
      setMvpOpen(false);
      toast.success("MVP is ranked from goals, then assists");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not reset the MVP."));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAward = async () => {
    if (!updatedBy) {
      return;
    }

    const title = awardTitle.trim();
    const players = selectedPlayers(awardPicker, selectedIds);

    if (!title) {
      toast.error("Enter an award title.");
      return;
    }

    if (!players.length) {
      toast.error("Pick at least one player.");
      return;
    }

    setSaving(true);

    try {
      if (editingAward) {
        await updateGameAward(game.id, editingAward.id, {
          title,
          players,
          updatedBy,
        });
        toast.success("Award updated");
      } else {
        await addGameAward(game.id, {
          title,
          players,
          createdBy: updatedBy,
        });
        toast.success("Award added");
      }

      setAwardOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save this award."));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAward = async (award: GameAward) => {
    if (!updatedBy) {
      return;
    }

    setRemovingId(award.id);

    try {
      await removeGameAward(game.id, award.id, updatedBy);
      toast.success("Award removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not remove this award."));
    } finally {
      setRemovingId("");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Match awards</h3>
        {canEditAwards ? (
          <div className="flex flex-wrap gap-2">
            {canEditMvp ? (
              <Button type="button" variant="outline" size="sm" onClick={openMvpEditor}>
                {mvp.players.length || mvp.source === "manual" ? "Edit MVP" : "Set MVP"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openAwardEditor()}
            >
              <PlusIcon />
              Add award
            </Button>
          </div>
        ) : null}
      </div>

      {hasContent ? (
        <div className="mt-2 space-y-2">
          {mvp.players.length ? (
            <div className="winner-frame">
              <div className="rounded-[calc(var(--radius-lg)-2px)] bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <TrophyIcon className="size-4 text-primary" />
                      {mvp.players.length > 1 ? "MVPs" : "MVP"}
                    </p>
                  </div>
                  {canEditMvp ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={openMvpEditor}
                      aria-label="Edit MVP"
                      title="Edit MVP"
                    >
                      <PencilIcon />
                    </Button>
                  ) : null}
                </div>
                <ul className="mt-2 space-y-2 text-sm">
                  {mvp.players.map((player) => (
                    <li key={player.playerId}>
                      <AwardPlayerLabel
                        name={player.playerName}
                        photoURL={usersById.get(player.playerId)?.photoURL}
                        tally={tallyById.get(player.playerId)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {awards.length ? (
            <div className="divide-y rounded-lg border">
              {awards.map((award) => (
                <div key={award.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{award.title}</p>
                    {canEditAwards ? (
                      <span className="flex shrink-0 items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openAwardEditor(award)}
                          aria-label={`Edit ${award.title}`}
                          title={`Edit ${award.title}`}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={removingId === award.id}
                          onClick={() => void handleRemoveAward(award)}
                          aria-label={`Remove ${award.title}`}
                          title={`Remove ${award.title}`}
                        >
                          {removingId === award.id ? (
                            <Loader2Icon className="animate-spin" />
                          ) : (
                            <Trash2Icon />
                          )}
                        </Button>
                      </span>
                    ) : null}
                  </div>
                  <ul className="mt-2 space-y-2 text-sm">
                    {award.players.map((player) => (
                      <li key={player.playerId}>
                        <AwardPlayerLabel
                          name={player.playerName}
                          photoURL={usersById.get(player.playerId)?.photoURL}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          MVP is ranked by goals, then assists. Add a manual award such as most
          saves or best defender.
        </p>
      )}

      {mvpOpen && canEditMvp ? (
        <OverlayDialog
          title="Match MVP"
          description="Pick one or more players. Leave it on auto to rank by goals first, then assists. Tied players share the award."
          saving={saving}
          onClose={() => setMvpOpen(false)}
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setMvpOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving || mvp.source === "auto"}
                onClick={() => void handleUseAutoMvp()}
              >
                {saving ? "Saving..." : "Use auto ranking"}
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleSaveMvp()}>
                {saving ? "Saving..." : "Save MVP"}
              </Button>
            </>
          }
        >
          <PlayerPicker
            players={mvpPicker}
            selectedIds={selectedIds}
            usersById={usersById}
            onToggle={togglePlayer}
          />
          {mvp.source === "auto" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Saving here locks the MVP so later goals will not change it. Use
              auto ranking to unlock.
            </p>
          ) : null}
        </OverlayDialog>
      ) : null}

      {awardOpen && canEditAwards ? (
        <OverlayDialog
          title={editingAward ? "Edit award" : "Add award"}
          description="For this match only — most saves, best defender, or any title you type."
          saving={saving}
          onClose={() => setAwardOpen(false)}
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setAwardOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveAward()}
              >
                {saving ? "Saving..." : editingAward ? "Save award" : "Add award"}
              </Button>
            </>
          }
        >
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="award-title">Title</Label>
              <div className="flex flex-wrap gap-2">
                {GAME_AWARD_TITLE_PRESETS.map((title) => (
                  <Button
                    key={title}
                    type="button"
                    size="sm"
                    variant={awardTitle === title ? "default" : "outline"}
                    onClick={() => setAwardTitle(title)}
                  >
                    {title}
                  </Button>
                ))}
              </div>
              <Input
                id="award-title"
                value={awardTitle}
                placeholder="Or type a custom title"
                onChange={(event) => setAwardTitle(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Players</Label>
              <PlayerPicker
                players={awardPicker}
                selectedIds={selectedIds}
                usersById={usersById}
                onToggle={togglePlayer}
              />
            </div>
          </div>
        </OverlayDialog>
      ) : null}
    </div>
  );
}
