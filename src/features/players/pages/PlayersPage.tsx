import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlusIcon } from "lucide-react";
import toast from "react-hot-toast";

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
  createUserProfile,
  deleteUserProfile,
  updateUserProfile,
  updateUserRole,
  type UserCreateInput,
  type UserUpdateInput,
} from "@/features/auth/auth.service";
import { useAuthStore } from "@/features/auth/auth.store";
import { isStaffRole } from "@/types/user";
import type { UserProfile, UserRole } from "@/types/user";
import type { PlayerFilterState } from "@/types/player";
import {
  PLAYER_POSITIONS,
  POSITION_LABELS,
  formatPosition,
} from "@/types/player";
import { AddPlayerFormDialog } from "@/features/players/components/AddPlayerFormDialog";
import { AssignRoleDialog } from "@/features/players/components/AssignRoleDialog";
import { PlayerFormDialog } from "@/features/players/components/PlayerFormDialog";
import { PlayerRowMenu } from "@/features/players/components/PlayerRowMenu";
// import { SeedTestPlayers } from "@/features/players/components/SeedTestPlayers";

const defaultFilters: PlayerFilterState = {
  search: "",
  position: "all",
  status: "all",
};

export function PlayersPage() {
  const navigate = useNavigate();
  const { profile, setProfile } = useAuthStore();
  const isStaff = profile ? isStaffRole(profile.role) : false;
  const isAdmin = profile?.role === "admin";

  const [filters, setFilters] = useState<PlayerFilterState>(defaultFilters);
  const { users, allUsers, loading, stats, errorMessage } = useSquad(filters);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | undefined>();
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [roleUser, setRoleUser] = useState<UserProfile | undefined>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  const openAddDialog = () => {
    setActionError("");
    setAddOpen(true);
  };

  const openEditDialog = (user: UserProfile) => {
    setActionError("");
    setSelectedUser(user);
    setEditOpen(true);
  };

  const closeAddDialog = () => {
    setAddOpen(false);
  };

  const closeEditDialog = () => {
    setEditOpen(false);
    setSelectedUser(undefined);
  };

  const closeRoleDialog = () => {
    setRoleUser(undefined);
  };

  const handleAssignRole = async (role: UserRole) => {
    if (!roleUser) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      await updateUserRole(roleUser.id, role);
      closeRoleDialog();
      toast.success("Role updated");
    } catch (error) {
      const message = getErrorMessage(error, "Could not update this role.");
      setActionError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePlayer = async (input: UserCreateInput) => {
    setSaving(true);
    setActionError("");

    try {
      await createUserProfile(input);
      closeAddDialog();
      toast.success("Player created");
    } catch (error) {
      const message = getErrorMessage(error, "Could not add this player.");
      setActionError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlayer = async (input: UserUpdateInput) => {
    if (!selectedUser) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      await updateUserProfile(selectedUser.id, input);
      if (profile?.id === selectedUser.id) {
        setProfile({
          ...profile,
          displayName: input.displayName,
          email: input.email,
          position: input.position,
          isActive: input.isActive,
        });
      }
      closeEditDialog();
      toast.success("Player updated");
    } catch (error) {
      const message = getErrorMessage(error, "Could not update this player.");
      setActionError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!userToDelete) {
      return;
    }

    setDeleting(true);
    setActionError("");

    try {
      await deleteUserProfile(userToDelete.id);
      setUserToDelete(null);
      toast.success("Player deleted");
    } catch (error) {
      const message = getErrorMessage(error, "Could not delete this player.");
      setActionError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Ollyo Squad</h1>
          <p className="text-muted-foreground">
            Everyone who signs in is a player
          </p>
        </div>
        {/* <SeedTestPlayers /> */}
        {isStaff && (
          <Button size="sm" onClick={openAddDialog}>
            <UserPlusIcon />
            Add Player
          </Button>
        )}
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
                <TableRow
                  key={user.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`View ${user.displayName}`}
                  className="cursor-pointer"
                  onClick={() => navigate(`/player/${user.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/player/${user.id}`);
                    }
                  }}
                >
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
                    <TableCell
                      className="text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <PlayerRowMenu
                        user={user}
                        canDelete={isAdmin && user.id !== profile?.id}
                        canAssignRole={isAdmin && user.id !== profile?.id}
                        onEdit={openEditDialog}
                        onDelete={setUserToDelete}
                        onAssignRole={(nextUser) => {
                          setActionError("");
                          setRoleUser(nextUser);
                        }}
                      />
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

      <AddPlayerFormDialog
        open={addOpen}
        saving={saving}
        existingUsers={allUsers}
        errorMessage={actionError}
        onClose={closeAddDialog}
        onSubmit={handleCreatePlayer}
      />
      <PlayerFormDialog
        open={editOpen}
        user={selectedUser}
        saving={saving}
        existingUsers={allUsers}
        errorMessage={actionError}
        onClose={closeEditDialog}
        onSubmit={handleUpdatePlayer}
        onPhotoUploaded={(photoURL) => {
          if (!profile || profile.id !== selectedUser?.id) {
            return;
          }

          setProfile({ ...profile, photoURL });
        }}
      />

      <AssignRoleDialog
        open={Boolean(roleUser)}
        user={roleUser}
        saving={saving}
        errorMessage={actionError}
        onClose={closeRoleDialog}
        onSubmit={handleAssignRole}
      />

      {userToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!deleting) {
              setUserToDelete(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Delete player</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Delete {userToDelete.displayName}? This removes them from the squad
              and cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setUserToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={() => void handleDeletePlayer()}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
