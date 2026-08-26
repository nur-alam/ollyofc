import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  canRequestPushPermission,
  disablePushNotifications,
  emitPushEnabled,
  enablePushNotifications,
  getExistingPushToken,
  iosNeedsInstalledPwa,
  isPushConfigured,
  PUSH_ENABLED_EVENT,
} from "@/features/notifications/push.service";
import { getErrorMessage } from "@/lib/errors";

type GamePushToggleProps = {
  userId: string;
  disabled?: boolean;
};

export function GamePushToggle({ userId, disabled }: GamePushToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

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

  if (!isPushConfigured()) {
    return null;
  }

  const lockedToInstall = iosNeedsInstalledPwa();
  const unavailable = !canRequestPushPermission();

  const handleToggle = async (next: boolean) => {
    setSaving(true);

    try {
      if (next) {
        await enablePushNotifications(userId);
        setEnabled(true);
        emitPushEnabled(true);
        toast.success("Ollyo FC Notification turned on.");
      } else {
        await disablePushNotifications(userId);
        setEnabled(false);
        emitPushEnabled(false);
        toast.success("Ollyo FC Notification turned off.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update notifications."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor="game-push">New game notifications</Label>
        <p className="text-xs text-muted-foreground">
          {lockedToInstall
            ? "On iPhone, install Ollyo FC to the Home Screen first, then turn this on."
            : "Get a push when staff create a match. Tap the notification to open the game."}
        </p>
      </div>
      <Switch
        id="game-push"
        checked={enabled}
        disabled={disabled || saving || !ready || unavailable}
        onCheckedChange={(checked) => {
          void handleToggle(checked);
        }}
      />
    </div>
  );
}
