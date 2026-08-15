import { useState } from "react";
import { PencilIcon, UserXIcon } from "lucide-react";

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
import { useSquad } from "@/features/players/player.hooks";
import { getErrorMessage } from "@/lib/errors";
import {
  setUserActive,
  updateUserPosition,
} from "@/features/auth/auth.service";
import { useAuthStore } from "@/features/auth/auth.store";
import { isStaffRole } from "@/types/user";
import type { UserProfile } from "@/types/user";
import type { PlayerFilterState, PlayerPosition } from "@/types/player";
import {
  PLAYER_POSITIONS,
  POSITION_LABELS,
  formatPosition,
} from "@/types/player";
import { PlayerFormDialog } from "@/features/players/components/PlayerFormDialog";
import { SeedTestPlayers } from "@/features/players/components/SeedTestPlayers";

const defaultFilters: PlayerFilterState = {
  search: "",
  position: "all",
  status: "all",
};

export function PlayersPage() {
  const { profile, setProfile } = useAuthStore();
  const isStaff = profile ? isStaffRole(profile.role) : false;

  const [filters, setFilters] = useState<PlayerFilterState>(defaultFilters);
  const { users, loading, stats, errorMessage } = useSquad(filters);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | undefined>();
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const openEditDialog = (user: UserProfile) => {
    setActionError("");
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleSavePosition = async (position: PlayerPosition | "") => {
    if (!selectedUser) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      await updateUserPosition(selectedUser.id, position);
      if (profile?.id === selectedUser.id) {
        setProfile({ ...profile, position });
      }
      setDialogOpen(false);
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not update position."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (user: UserProfile) => {
    setActionError("");

    try {
      await setUserActive(user.id, !user.isActive);
      if (profile?.id === user.id) {
        setProfile({ ...profile, isActive: !user.isActive });
      }
    } catch (error) {
      setActionError(getErrorMessage(error, "Could not update player status."));
    }
  };

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Squad</h1>
          <p className="text-muted-foreground">
            Everyone who signs in is a player
          </p>
        </div>
        <SeedTestPlayers />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-background p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total players</p>
          <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-background p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Active players</p>
          <p className="mt-1 text-2xl font-semibold">{stats.active}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border bg-background p-4 shadow-sm sm:grid-cols-3">
        <Input
          placeholder="Search players..."
          value={filters.search}
          onChange={(event) =>
            setFilters((current) => ({ ...current, search: event.target.value }))
          }
        />

        <Select
          value={filters.position}
          onValueChange={(value) => {
            if (!value) {
              return;
            }

            setFilters((current) => ({
              ...current,
              position: value as PlayerFilterState["position"],
            }));
          }}
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
          onValueChange={(value) => {
            if (!value) {
              return;
            }

            setFilters((current) => ({
              ...current,
              status: value as PlayerFilterState["status"],
            }));
          }}
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

      <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              {isStaff && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isStaff ? 4 : 3} className="py-8 text-center text-muted-foreground">
                  Loading squad...
                </TableCell>
              </TableRow>
            ) : users.length ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="size-full object-cover"
                          />
                        ) : (
                          user.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate font-medium">
                          {user.displayName}
                          {user.isSeed && (
                            <Badge variant="outline" className="font-normal">
                              Test
                            </Badge>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatPosition(user.position)}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "secondary" : "outline"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {isStaff && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditDialog(user)}
                          aria-label={`Edit ${user.displayName} position`}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeactivate(user)}
                          aria-label={
                            user.isActive
                              ? `Deactivate ${user.displayName}`
                              : `Activate ${user.displayName}`
                          }
                        >
                          <UserXIcon />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isStaff ? 4 : 3} className="py-8 text-center text-muted-foreground">
                  No players match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PlayerFormDialog
        open={dialogOpen}
        user={selectedUser}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSavePosition}
      />
    </div>
  );
}
