import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserProfile } from "@/types/user";
import type { PlayerPosition } from "@/types/player";
import { PLAYER_POSITIONS, POSITION_LABELS } from "@/types/player";

type PlayerFormDialogProps = {
  open: boolean;
  user?: UserProfile;
  saving: boolean;
  onClose: () => void;
  onSubmit: (position: PlayerPosition | "") => Promise<void>;
};

export function PlayerFormDialog({
  open,
  user,
  saving,
  onClose,
  onSubmit,
}: PlayerFormDialogProps) {
  const [position, setPosition] = useState<PlayerPosition | "">("");

  useEffect(() => {
    if (open) {
      setPosition(user?.position ?? "");
    }
  }, [open, user]);

  if (!open || !user) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(position);
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
            <h2 className="text-lg font-semibold">Update position</h2>
            <p className="text-sm text-muted-foreground">{user.displayName}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label>Position</Label>
            <Select
              value={position || "unset"}
              onValueChange={(value) => {
                if (!value || value === "unset") {
                  setPosition("");
                  return;
                }

                setPosition(value as PlayerPosition);
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
