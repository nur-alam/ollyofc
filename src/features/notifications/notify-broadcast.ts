import { auth } from "@/lib/firebase";

export type NotifyBroadcastResult = {
  ok: boolean;
  skipped?: boolean;
  sent?: number;
};

export type NotifyBroadcastInput = {
  message: string;
  url?: string;
  userIds?: string[];
};

export async function notifyBroadcast(
  input: NotifyBroadcastInput,
): Promise<NotifyBroadcastResult> {
  if (import.meta.env.DEV) {
    return { ok: true, skipped: true };
  }

  const idToken = await auth.currentUser?.getIdToken();

  if (!idToken) {
    throw new Error("You need to be signed in to notify players.");
  }

  const response = await fetch("/api/notify-broadcast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => ({}))) as NotifyBroadcastResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || "Could not notify players.");
  }

  return payload;
}

export function notifySendSuccessMessage(result: NotifyBroadcastResult) {
  if (result.skipped) {
    return "Push is skipped in local preview.";
  }

  if (!result.sent) {
    return "No opted-in devices to notify.";
  }

  return `Notification sent to ${result.sent} device${result.sent === 1 ? "" : "s"}.`;
}
