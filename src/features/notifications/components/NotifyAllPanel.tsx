import { useState, type FormEvent } from "react";
import { Loader2Icon } from "lucide-react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NotifyMessageField } from "@/features/notifications/components/NotifyMessageField";
import { DEFAULT_NOTIFY_PATH } from "@/features/notifications/notification.constants";
import type { PushSubscriber } from "@/features/notifications/notification.hooks";
import {
  notifyBroadcast,
  notifySendSuccessMessage,
} from "@/features/notifications/notify-broadcast";
import { getErrorMessage } from "@/lib/errors";

function getUserInitials(name: string) {
  return name.charAt(0).toUpperCase() || "?";
}

type NotifyAllPanelProps = {
  subscribers: PushSubscriber[];
  peopleCount: number;
  deviceCount: number;
  loading: boolean;
  errorMessage: string;
};

function SubscriberOverview({
  subscribers,
  peopleCount,
  deviceCount,
  loading,
  errorMessage,
}: NotifyAllPanelProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-background p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">People</p>
          <p className="mt-2 text-2xl font-semibold">
            {loading ? "—" : peopleCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Users with the bell turned on
          </p>
        </div>
        <div className="rounded-xl border bg-background p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Devices</p>
          <p className="mt-2 text-2xl font-semibold">
            {loading ? "—" : deviceCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Phones and browsers that will get the push
          </p>
        </div>
      </div>

      <section className="rounded-xl border bg-background p-5 shadow-sm">
        <h2 className="text-sm font-medium">Who is opted in</h2>
        {loading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Loading subscribers...
          </p>
        ) : errorMessage ? (
          <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
        ) : subscribers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nobody has turned on push notifications yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {subscribers.map((subscriber) => (
              <li
                key={subscriber.user.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export function NotifyAllPanel({
  peopleCount,
  deviceCount,
  loading,
  errorMessage,
  subscribers,
}: NotifyAllPanelProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const trimmed = message.trim();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!trimmed) {
      toast.error("Write a notification message.");
      return;
    }

    setSending(true);

    try {
      const result = await notifyBroadcast({
        message: trimmed,
        url: DEFAULT_NOTIFY_PATH,
      });
      toast.success(notifySendSuccessMessage(result));
      setMessage("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not notify players."));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="rounded-xl border bg-background p-5 shadow-sm"
      >
        <NotifyMessageField
          id="broadcast-message"
          value={message}
          disabled={sending}
          placeholder="e.g. Training is cancelled tonight. Next game Friday."
          onChange={setMessage}
        />
        <Button type="submit" className="mt-4" disabled={sending || !trimmed}>
          {sending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Notify all"
          )}
        </Button>
      </form>

      <SubscriberOverview
        subscribers={subscribers}
        peopleCount={peopleCount}
        deviceCount={deviceCount}
        loading={loading}
        errorMessage={errorMessage}
      />
    </>
  );
}
