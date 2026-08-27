import { useState, type FormEvent } from "react";
import { Loader2Icon } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { notifyBroadcast } from "@/features/notifications/notify-broadcast";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const MAX_MESSAGE_LENGTH = 240;

export function NotificationPage() {
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
    </div>
  );
}
