import { useState } from "react";
import {
  MoreHorizontalIcon,
  PencilIcon,
  ShieldUserIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UserProfile } from "@/types/user";

type PlayerRowMenuProps = {
  user: UserProfile;
  canDelete: boolean;
  canAssignRole: boolean;
  onEdit: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
  onAssignRole: (user: UserProfile) => void;
};

export function PlayerRowMenu({
  user,
  canDelete,
  canAssignRole,
  onEdit,
  onDelete,
  onAssignRole,
}: PlayerRowMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${user.displayName}`}
          />
        }
      >
        <MoreHorizontalIcon />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 gap-1 p-1">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
          onClick={() => {
            setOpen(false);
            onEdit(user);
          }}
        >
          <PencilIcon className="size-4" />
          Edit
        </button>
        {canAssignRole && (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              setOpen(false);
              onAssignRole(user);
            }}
          >
            <ShieldUserIcon className="size-4" />
            Assign role
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
            onClick={() => {
              setOpen(false);
              onDelete(user);
            }}
          >
            <Trash2Icon className="size-4" />
            Delete
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
