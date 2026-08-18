import { useEffect, useMemo, useState } from "react";
import { XIcon } from "lucide-react";

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
import type { UserUpdateInput } from "@/features/auth/auth.service";
import { ProfilePhotoUpload } from "@/features/players/components/ProfilePhotoUpload";
import type { UserProfile } from "@/types/user";
import type { PlayerPosition } from "@/types/player";
import { PLAYER_POSITIONS, POSITION_LABELS } from "@/types/player";

type PlayerFormDialogProps = {
  open: boolean;
  user?: UserProfile;
  saving: boolean;
  existingUsers: Pick<UserProfile, "id" | "displayName" | "email">[];
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (input: UserUpdateInput) => Promise<void>;
  onPhotoUploaded?: (photoURL: string) => void;
};

const emptyForm: UserUpdateInput = {
  displayName: "",
  email: "",
  position: "",
  isActive: true,
};

export function PlayerFormDialog({
  open,
  user,
  saving,
  existingUsers,
  errorMessage,
  onClose,
  onSubmit,
  onPhotoUploaded,
}: PlayerFormDialogProps) {
  const [form, setForm] = useState<UserUpdateInput>(emptyForm);
  const [roster, setRoster] = useState(existingUsers);

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    setForm({
      displayName: user.displayName,
      email: user.email,
      position: user.position,
      isActive: user.isActive,
    });
    setRoster(existingUsers);
  }, [open, user]);

  const nameValue = form.displayName.trim();
  const emailValue = form.email.trim().toLowerCase();
  const others = useMemo(
    () => roster.filter((item) => item.id !== user?.id),
    [roster, user?.id],
  );
  const nameTaken = useMemo(
    () =>
      !saving &&
      Boolean(nameValue) &&
      others.some(
        (item) => item.displayName.trim().toLowerCase() === nameValue.toLowerCase(),
      ),
    [nameValue, others, saving],
  );
  const emailTaken = useMemo(
    () =>
      !saving &&
      Boolean(emailValue) &&
      others.some((item) => item.email.trim().toLowerCase() === emailValue),
    [emailValue, others, saving],
  );

  if (!open || !user) {
    return null;
  }

  const canSubmit =
    nameValue.length > 0 &&
    emailValue.includes("@") &&
    !nameTaken &&
    !emailTaken;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    await onSubmit({
      displayName: form.displayName.trim(),
      email: form.email.trim(),
      position: form.position,
      isActive: form.isActive,
    });
  };

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
        className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Edit player</h2>
            <p className="text-sm text-muted-foreground">{user.displayName}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <ProfilePhotoUpload
            userId={user.id}
            displayName={user.displayName}
            photoURL={user.photoURL}
            disabled={saving}
            onUploaded={onPhotoUploaded}
          />
          <div className="grid gap-2">
            <Label htmlFor="edit-player-name">Name</Label>
            <Input
              id="edit-player-name"
              value={form.displayName}
              aria-invalid={nameTaken}
              aria-describedby={nameTaken ? "edit-player-name-error" : undefined}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              placeholder="Rahim Khan"
              autoComplete="name"
            />
            {nameTaken && (
              <p id="edit-player-name-error" className="error-text">
                A player with this name already exists.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-player-email">Email</Label>
            <Input
              id="edit-player-email"
              type="email"
              value={form.email}
              aria-invalid={emailTaken}
              aria-describedby={emailTaken ? "edit-player-email-error" : undefined}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="rahim@ollyofc.test"
              autoComplete="email"
            />
            {emailTaken && (
              <p id="edit-player-email-error" className="error-text">
                A player with this email already exists.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Position</Label>
            <Select
              value={form.position || "unset"}
              onValueChange={(value) => {
                setForm((current) => ({
                  ...current,
                  position:
                    !value || value === "unset"
                      ? ""
                      : (value as PlayerPosition),
                }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not set</SelectItem>
                {PLAYER_POSITIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {POSITION_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <div>
              <Label htmlFor="edit-player-active">Active</Label>
              <p className="text-xs text-muted-foreground">
                {form.isActive ? "This player is active." : "This player is inactive."}
              </p>
            </div>
            <Switch
              id="edit-player-active"
              checked={form.isActive}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, isActive: checked }))
              }
            />
          </div>

          {errorMessage && <p className="error-text">{errorMessage}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !canSubmit}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
