import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  LEADERBOARD_MESSAGE,
  LEADERBOARD_PATH,
} from "@/features/notifications/notification.constants";
import {
  notifyBroadcast,
  notifySendSuccessMessage,
} from "@/features/notifications/notify-broadcast";
import { getErrorMessage } from "@/lib/errors";

type NotifyLeaderboardPanelProps = {
  peopleCount: number;
  loading: boolean;
};

export function NotifyLeaderboardPanel({
  peopleCount,
  loading,
}: NotifyLeaderboardPanelProps) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);

    try {
      const result = await notifyBroadcast({
        message: LEADERBOARD_MESSAGE,
        url: LEADERBOARD_PATH,
      });
      toast.success(notifySendSuccessMessage(result));
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not notify players."));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-xl border bg-background p-5 shadow-sm">
      <h2 className="text-sm font-medium">Leaderboard update</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Send this message to everyone who turned on notifications. Tapping it
        opens the leaderboard.
      </p>

      <blockquote className="mt-4 rounded-lg border bg-muted/40 px-3 py-3 text-sm">
        {LEADERBOARD_MESSAGE}
      </blockquote>
      <p className="mt-2 text-xs text-muted-foreground">
        Opens {LEADERBOARD_PATH}
        {loading ? "" : ` · ${peopleCount} ${peopleCount === 1 ? "person" : "people"}`}
      </p>

      <Button
        type="button"
        className="mt-4"
        disabled={sending}
        onClick={() => void handleSend()}
      >
        {sending ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Sending...
          </>
        ) : (
          "Notify leaderboard"
        )}
      </Button>
    </section>
  );
}
