import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserProfile, UserRole } from "@/types/user";
import { ROLE_LABELS, USER_ROLES } from "@/types/user";

type AssignRoleDialogProps = {
  open: boolean;
  user?: UserProfile;
  saving: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (role: UserRole) => Promise<void>;
};

export function AssignRoleDialog({
  open,
  user,
  saving,
  errorMessage,
  onClose,
  onSubmit,
}: AssignRoleDialogProps) {
  const [role, setRole] = useState<UserRole>("user");

  useEffect(() => {
    if (open && user) {
      setRole(user.role);
    }
  }, [open, user]);

  if (!open || !user) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(role);
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
            <h2 className="text-lg font-semibold">Assign role</h2>
            <p className="text-sm text-muted-foreground">{user.displayName}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(value) => {
                if (
                  value === "admin" ||
                  value === "moderator" ||
                  value === "user"
                ) {
                  setRole(value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {ROLE_LABELS[item]}
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
            <Button type="submit" disabled={saving || role === user.role}>
              {saving ? "Saving..." : "Save role"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
