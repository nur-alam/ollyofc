import { useMemo, useState } from "react";
import { CheckIcon, Loader2Icon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PushSubscriber } from "@/features/notifications/notification.hooks";
import { cn } from "@/lib/utils";

function getUserInitials(name: string) {
  return name.charAt(0).toUpperCase() || "?";
}

type NotifyUserPickerProps = {
  subscribers: PushSubscriber[];
  selectedIds: Set<string>;
  loading: boolean;
  errorMessage: string;
  disabled?: boolean;
  onToggle: (userId: string) => void;
  onSelectAll: (userIds: string[]) => void;
  onDeselect: (userIds: string[]) => void;
};

export function NotifyUserPicker({
  subscribers,
  selectedIds,
  loading,
  errorMessage,
  disabled = false,
  onToggle,
  onSelectAll,
  onDeselect,
}: NotifyUserPickerProps) {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return subscribers;
    }

    return subscribers.filter((subscriber) =>
      subscriber.user.displayName.toLowerCase().includes(query),
    );
  }, [search, subscribers]);

  const visibleIds = visible.map((subscriber) => subscriber.user.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          disabled={disabled || loading}
          placeholder="Search opted-in users"
          className="min-w-40 flex-1"
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || loading || visibleIds.length === 0}
          onClick={() =>
            allVisibleSelected ? onDeselect(visibleIds) : onSelectAll(visibleIds)
          }
        >
          {allVisibleSelected ? "Clear" : "Select all"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {selectedIds.size} selected
      </p>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading subscribers...
        </p>
      ) : errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : subscribers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nobody has turned on push notifications yet.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching users.</p>
      ) : (
        <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
          {visible.map((subscriber) => {
            const selected = selectedIds.has(subscriber.user.id);

            return (
              <li key={subscriber.user.id}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    "hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-50",
                    selected && "bg-muted",
                  )}
                  onClick={() => onToggle(subscriber.user.id)}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background",
                    )}
                  >
                    {selected ? <CheckIcon className="size-3.5" /> : null}
                  </span>
                  <Avatar size="sm">
                    <AvatarImage
                      src={subscriber.user.photoURL}
                      alt={subscriber.user.displayName}
                    />
                    <AvatarFallback>
                      {getUserInitials(subscriber.user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {subscriber.user.displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {subscriber.devices.length}{" "}
                      {subscriber.devices.length === 1 ? "device" : "devices"}
                      {subscriber.deviceLabels.length
                        ? ` · ${subscriber.deviceLabels.join(", ")}`
                        : ""}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
