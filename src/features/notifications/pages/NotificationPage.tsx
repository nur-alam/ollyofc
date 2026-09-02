import { useState, type FormEvent } from "react";
import { Loader2Icon } from "lucide-react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePushSubscribers } from "@/features/notifications/notification.hooks";
import { notifyBroadcast } from "@/features/notifications/notify-broadcast";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const MAX_MESSAGE_LENGTH = 240;

function getUserInitials(name: string) {
  return name.charAt(0).toUpperCase() || "?";
}

export function NotificationPage() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const trimmed = message.trim();
  const { subscribers, peopleCount, deviceCount, loading, errorMessage } =
    usePushSubscribers();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!trimmed) {
      toast.error("Write a notification message.");
      return;
    }

    setSending(true);

    try {
      const result = await notifyBroadcast(trimmed);

      if (result.skipped) {
        toast.success("Push is skipped in local preview.");
      } else {
        toast.success(
          result.sent
            ? `Notification sent to ${result.sent} device${result.sent === 1 ? "" : "s"}.`
            : "No opted-in devices to notify.",
        );
      }

      setMessage("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not notify players."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Send a push to everyone who turned on game notifications.
        </p>
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="rounded-xl border bg-background p-5 shadow-sm"
      >
        <div className="grid gap-2">
          <Label htmlFor="broadcast-message">Message</Label>
          <textarea
            id="broadcast-message"
            value={message}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={5}
            disabled={sending}
            placeholder="e.g. Training is cancelled tonight. Next game Friday."
            className={cn(
              "min-h-28 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors",
              "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            )}
            onChange={(event) => setMessage(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {trimmed.length}/{MAX_MESSAGE_LENGTH}
          </p>
        </div>

        <Button type="submit" className="mt-4" disabled={sending || !trimmed}>
          {sending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Notify users"
          )}
        </Button>
      </form>

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
              <li key={subscriber.user.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
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
                  <p className="truncate font-medium">{subscriber.user.displayName}</p>
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
    </div>
  );
}
