import { auth } from "@/lib/firebase";

export type NotifyGameCreatedResult = {
  ok: boolean;
  skipped?: boolean;
  sent?: number;
};

export async function notifyGameCreated(gameId: string): Promise<NotifyGameCreatedResult> {
  if (import.meta.env.DEV) {
    return { ok: true, skipped: true };
  }

  const idToken = await auth.currentUser?.getIdToken();

  if (!idToken) {
    throw new Error("You need to be signed in to notify players.");
  }

  const response = await fetch("/api/notify-game-created", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ gameId }),
  });

  const payload = (await response.json().catch(() => ({}))) as NotifyGameCreatedResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || "Could not notify players.");
  }

  return payload;
}
