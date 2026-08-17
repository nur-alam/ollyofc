import { useEffect, useMemo, useState } from "react";

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
import type { UserCreateInput } from "@/features/auth/auth.service";
import type { UserProfile } from "@/types/user";
import type { PlayerPosition } from "@/types/player";
import { PLAYER_POSITIONS, POSITION_LABELS } from "@/types/player";
import { XIcon } from "lucide-react";

type AddPlayerFormDialogProps = {
  open: boolean;
  saving: boolean;
  existingUsers: Pick<UserProfile, "displayName" | "email">[];
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (input: UserCreateInput) => Promise<void>;
};

const emptyForm: UserCreateInput = {
  displayName: "",
  email: "",
  position: "",
};

export function AddPlayerFormDialog({
  open,
  saving,
  existingUsers,
  errorMessage,
  onClose,
  onSubmit,
}: AddPlayerFormDialogProps) {
  const [form, setForm] = useState<UserCreateInput>(emptyForm);
  const [roster, setRoster] = useState(existingUsers);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(emptyForm);
    setRoster(existingUsers);
  }, [open]);

  const nameValue = form.displayName.trim();
  const emailValue = form.email.trim().toLowerCase();
  const nameTaken = useMemo(
    () =>
      !saving &&
      Boolean(nameValue) &&
      roster.some(
        (user) => user.displayName.trim().toLowerCase() === nameValue.toLowerCase(),
      ),
    [nameValue, roster, saving],
  );
  const emailTaken = useMemo(
    () =>
      !saving &&
      Boolean(emailValue) &&
      roster.some(
        (user) => user.email.trim().toLowerCase() === emailValue,
      ),
    [emailValue, roster, saving],
  );

  if (!open) {
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
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Add player</h2>
            <p className="text-sm text-muted-foreground">
              Create a squad member in Firestore.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="player-name">Name</Label>
            <Input
              id="player-name"
              value={form.displayName}
              aria-invalid={nameTaken}
              aria-describedby={nameTaken ? "player-name-error" : undefined}
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
              <p id="player-name-error" className="error-text">
                A player with this name already exists.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="player-email">Email</Label>
            <Input
              id="player-email"
              type="email"
              value={form.email}
              aria-invalid={emailTaken}
              aria-describedby={emailTaken ? "player-email-error" : undefined}
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
              <p id="player-email-error" className="error-text">
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

          {errorMessage && <p className="error-text">{errorMessage}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !canSubmit}>
              {saving ? "Adding..." : "Add player"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
