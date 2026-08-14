import { useState } from "react";
import { PencilIcon, Trash2Icon, UserXIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryBadge } from "@/features/players/components/CategoryBadge";
import { PlayerFormDialog } from "@/features/players/components/PlayerFormDialog";
import { usePlayers } from "@/features/players/player.hooks";
import {
  createPlayer,
  deletePlayer,
  getErrorMessage,
  setPlayerActive,
  updatePlayer,
} from "@/features/players/player.service";
import { useAuthStore } from "@/features/auth/auth.store";
import { isStaffRole } from "@/types/user";
import type { Player, PlayerFilterState, PlayerInput } from "@/types/player";
import {
  PLAYER_CATEGORIES,
  PLAYER_POSITIONS,
  CATEGORY_LABELS,
  POSITION_LABELS,
  formatPosition,
} from "@/types/player";

const defaultFilters: PlayerFilterState = {
  search: "",
  category: "all",
  position: "all",
  status: "all",
};

export function PlayersPage() {
  const profile = useAuthStore((state) => state.profile);
  const isStaff = profile ? isStaffRole(profile.role) : false;
  const isAdmin = profile?.role === "admin";

  const [filters, setFilters] = useState<PlayerFilterState>(defaultFilters);
  const { players, loading, stats, errorMessage } = usePlayers(filters);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | undefined>();
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const openCreateDialog = () => {
    setActionError("");
    setDialogMode("create");
    setSelectedPlayer(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (player: Player) => {
    setActionError("");
    setDialogMode("edit");
    setSelectedPlayer(player);
    setDialogOpen(true);
  };

  const handleSubmit = async (input: PlayerInput) => {
    setSaving(true);
    setActionError("");

    try {
      if (dialogMode === "create") {
        await createPlayer(input);
      } else if (selectedPlayer) {
        await updatePlayer(selectedPlayer.id, input, selectedPlayer.userId);
      }

      setDialogOpen(false);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not save player."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (player: Player) => {
    setActionError("");

    try {
      await setPlayerActive(player.id, !player.isActive);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not update player status."));
    }
  };

  const handleDelete = async (player: Player) => {
    if (
      !window.confirm(
        `Delete ${player.name}? This permanently removes the player record.`,
      )
    ) {
      return;
    }

    setActionError("");

    try {
      await deletePlayer(player.id);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not delete player."));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Players</h1>
          <p className="text-muted-foreground">
            {isStaff
              ? "Manage squad members, categories, positions, and linked accounts."
              : "Squad members, categories, positions, and current status."}
          </p>
        </div>

        {isStaff && <Button onClick={openCreateDialog}>Add player</Button>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-background p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total players</p>
          <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-background p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Active players</p>
          <p className="mt-1 text-2xl font-semibold">{stats.active}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border bg-background p-4 shadow-sm md:grid-cols-4">
        <Input
          placeholder="Search players..."
          value={filters.search}
          onChange={(event) =>
            setFilters((current) => ({ ...current, search: event.target.value }))
          }
        />

        <Select
          value={filters.category}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              category: value as PlayerFilterState["category"],
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {PLAYER_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category} · {CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.position}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              position: value as PlayerFilterState["position"],
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All positions</SelectItem>
            {PLAYER_POSITIONS.map((position) => (
              <SelectItem key={position} value={position}>
                {POSITION_LABELS[position]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              status: value as PlayerFilterState["status"],
            }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(actionError || errorMessage) && (
        <p className="error-text">{actionError || errorMessage}</p>
      )}

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Matches</TableHead>
              <TableHead>Goals</TableHead>
              <TableHead>Assists</TableHead>
              <TableHead>Wins</TableHead>
              <TableHead>Losses</TableHead>
              {isStaff && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isStaff ? 10 : 9} className="py-8 text-center text-muted-foreground">
                  Loading players...
                </TableCell>
              </TableRow>
            ) : players.length ? (
              players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold">
                        {player.photoURL ? (
                          <img
                            src={player.photoURL}
                            alt={player.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          player.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{player.name}</p>
                        {player.userId && (
                          <p className="text-xs text-muted-foreground">Account linked</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={player.category} />
                  </TableCell>
                  <TableCell>{formatPosition(player.position)}</TableCell>
                  <TableCell>
                    <Badge variant={player.isActive ? "secondary" : "outline"}>
                      {player.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">0</TableCell>
                  <TableCell className="text-muted-foreground">0</TableCell>
                  <TableCell className="text-muted-foreground">0</TableCell>
                  <TableCell className="text-muted-foreground">0</TableCell>
                  <TableCell className="text-muted-foreground">0</TableCell>
                  {isStaff && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditDialog(player)}
                          aria-label={`Edit ${player.name}`}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeactivate(player)}
                          aria-label={
                            player.isActive
                              ? `Deactivate ${player.name}`
                              : `Activate ${player.name}`
                          }
                        >
                          <UserXIcon />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(player)}
                            aria-label={`Delete ${player.name}`}
                          >
                            <Trash2Icon />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isStaff ? 10 : 9} className="py-8 text-center text-muted-foreground">
                  No players match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Match stats show 0 until Phase 6 derives them from confirmed goal events.
      </p>

      <PlayerFormDialog
        open={dialogOpen}
        mode={dialogMode}
        player={selectedPlayer}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
