import { useMemo, useState, type FormEvent } from "react";
import { Loader2Icon } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotifyMessageField } from "@/features/notifications/components/NotifyMessageField";
import { NotifyUserPicker } from "@/features/notifications/components/NotifyUserPicker";
import {
  isAppNotificationPath,
  normalizeAppPath,
  NOTIFY_LINK_PRESETS,
} from "@/features/notifications/notification.constants";
import type { PushSubscriber } from "@/features/notifications/notification.hooks";
import {
  notifyBroadcast,
  notifySendSuccessMessage,
} from "@/features/notifications/notify-broadcast";
import { getErrorMessage } from "@/lib/errors";

type NotifyUsersPanelProps = {
  subscribers: PushSubscriber[];
  loading: boolean;
  errorMessage: string;
};

export function NotifyUsersPanel({
  subscribers,
  loading,
  errorMessage,
}: NotifyUsersPanelProps) {
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const trimmed = message.trim();
  const path = normalizeAppPath(link);

  const selectedDeviceCount = useMemo(
    () =>
      subscribers
        .filter((subscriber) => selectedIds.has(subscriber.user.id))
        .reduce((total, subscriber) => total + subscriber.devices.length, 0),
    [selectedIds, subscribers],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedIds.size) {
      toast.error("Select at least one user.");
      return;
    }

    if (!trimmed) {
      toast.error("Write a notification message.");
      return;
    }

    if (!path) {
      toast.error("Add a link for the notification.");
      return;
    }

    if (!isAppNotificationPath(path)) {
      toast.error("Link must be an app path like /leaderboard or /games.");
      return;
    }

    setSending(true);

    try {
      const result = await notifyBroadcast({
        message: trimmed,
        url: path,
        userIds: [...selectedIds],
      });
      toast.success(notifySendSuccessMessage(result));
      setMessage("");
      setLink("");
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not notify players."));
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-xl border bg-background p-5 shadow-sm"
    >
      <NotifyUserPicker
        subscribers={subscribers}
        selectedIds={selectedIds}
        loading={loading}
        errorMessage={errorMessage}
        disabled={sending}
        onToggle={(userId) => {
          setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(userId)) {
              next.delete(userId);
            } else {
              next.add(userId);
            }
            return next;
          });
        }}
        onSelectAll={(userIds) => {
          setSelectedIds((current) => {
            const next = new Set(current);
            for (const userId of userIds) {
              next.add(userId);
            }
            return next;
          });
        }}
        onDeselect={(userIds) => {
          setSelectedIds((current) => {
            const next = new Set(current);
            for (const userId of userIds) {
              next.delete(userId);
            }
            return next;
          });
        }}
      />

      <div className="mt-5">
        <NotifyMessageField
          id="user-message"
          value={message}
          disabled={sending}
          placeholder="e.g. You are in tonight’s squad. Kick-off at 8."
          onChange={setMessage}
        />
      </div>

      <div className="mt-4 grid gap-2">
        <Label htmlFor="user-link">Link</Label>
        <Input
          id="user-link"
          value={link}
          disabled={sending}
          placeholder="/games"
          onChange={(event) => setLink(event.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {NOTIFY_LINK_PRESETS.map((preset) => (
            <Button
              key={preset.path}
              type="button"
              variant={path === preset.path ? "default" : "outline"}
              size="xs"
              disabled={sending}
              onClick={() => setLink(preset.path)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Players open this page when they tap the notification.
        </p>
      </div>

      <Button
        type="submit"
        className="mt-4"
        disabled={sending || !trimmed || !selectedIds.size || !path}
      >
        {sending ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Sending...
          </>
        ) : (
          `Notify ${selectedIds.size} ${selectedIds.size === 1 ? "user" : "users"}`
        )}
      </Button>
      {selectedIds.size > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {selectedDeviceCount}{" "}
          {selectedDeviceCount === 1 ? "device" : "devices"} will receive this
          push.
        </p>
      ) : null}
    </form>
  );
}
