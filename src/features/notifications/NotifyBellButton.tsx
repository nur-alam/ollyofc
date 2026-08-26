import { useEffect, useState } from "react";
import { BellIcon, BellRingIcon } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  emitPushEnabled,
  enablePushNotifications,
  getExistingPushToken,
  isPushConfigured,
  PUSH_ENABLED_EVENT,
} from "@/features/notifications/push.service";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const bellButtonClassName =
  "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/30 hover:text-white";

type NotifyBellButtonProps = {
  userId: string;
};

export function NotifyBellButton({ userId }: NotifyBellButtonProps) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getExistingPushToken().then((token) => {
      if (!cancelled) {
        setEnabled(Boolean(token));
        setReady(true);
      }
    });

    const onChange = (event: Event) => {
      setEnabled(Boolean((event as CustomEvent<boolean>).detail));
    };

    window.addEventListener(PUSH_ENABLED_EVENT, onChange);

    return () => {
      cancelled = true;
      window.removeEventListener(PUSH_ENABLED_EVENT, onChange);
    };
  }, [userId]);

  const ring = () => {
    setShaking(true);
    window.setTimeout(() => setShaking(false), 700);
  };

  if (!isPushConfigured() || !ready) {
    return null;
  }

  const Icon = enabled ? BellRingIcon : BellIcon;

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        bellButtonClassName,
        enabled && "bg-amber-400/90 text-slate-900 hover:bg-amber-300 hover:text-slate-900",
      )}
      aria-label={enabled ? "Game notifications are on" : "Turn on game notifications"}
      aria-pressed={enabled}
      disabled={saving}
      onClick={async () => {
        if (enabled) {
          return;
        }

        setSaving(true);

        try {
          await enablePushNotifications(userId);
          setEnabled(true);
          emitPushEnabled(true);
          ring();
          toast.success("Ollyo FC Notification turned on.");
        } catch (error) {
          toast.error(getErrorMessage(error, "Could not enable notifications."));
        } finally {
          setSaving(false);
        }
      }}
    >
      <Icon className={cn("size-3.5", shaking && "notify-bell-shake")} />
    </Button>
  );
}
