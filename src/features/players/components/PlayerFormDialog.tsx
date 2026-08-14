import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { listLinkableUsers } from "@/features/players/player.service";
import type { UserProfile } from "@/types/user";
import type { Player, PlayerInput } from "@/types/player";
import {
  PLAYER_CATEGORIES,
  PLAYER_POSITIONS,
  CATEGORY_LABELS,
  POSITION_LABELS,
} from "@/types/player";

type PlayerFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  player?: Player;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: PlayerInput) => Promise<void>;
};

const emptyForm: PlayerInput = {
  name: "",
  photoURL: "",
  category: "B",
  position: "midfielder",
  isActive: true,
  userId: undefined,
};

export function PlayerFormDialog({
  open,
  mode,
  player,
  saving,
  onClose,
  onSubmit,
}: PlayerFormDialogProps) {
  const [form, setForm] = useState<PlayerInput>(emptyForm);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(
      player
        ? {
            name: player.name,
            photoURL: player.photoURL ?? "",
            category: player.category,
            position: player.position,
            isActive: player.isActive,
            userId: player.userId,
          }
        : emptyForm,
    );

    listLinkableUsers(player?.userId)
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [open, player]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    await onSubmit({
      ...form,
      name: form.name.trim(),
      photoURL: form.photoURL?.trim() || undefined,
      userId: form.userId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {mode === "create" ? "Add player" : "Edit player"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Link an account to connect login with this player profile.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="player-name">Name</Label>
            <Input
              id="player-name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Player name"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="player-photo">Photo URL</Label>
            <Input
              id="player-photo"
              value={form.photoURL ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  photoURL: event.target.value,
                }))
              }
              placeholder="https://..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    category: value as PlayerInput["category"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYER_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category} · {CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Position</Label>
              <Select
                value={form.position}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    position: value as PlayerInput["position"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYER_POSITIONS.map((position) => (
                    <SelectItem key={position} value={position}>
                      {POSITION_LABELS[position]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Linked user account</Label>
            <Select
              value={form.userId ?? "none"}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  userId:
                    value && value !== "none" ? String(value) : undefined,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No linked account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked account</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.displayName} · {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <Label htmlFor="player-active">Active player</Label>
              <p className="text-xs text-muted-foreground">
                Inactive players are excluded from future game planning.
              </p>
            </div>
            <Switch
              id="player-active"
              checked={form.isActive}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, isActive: checked }))
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? "Saving..." : mode === "create" ? "Add player" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
