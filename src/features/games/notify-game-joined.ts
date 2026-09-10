import { auth } from "@/lib/firebase";

export async function notifyGameJoined(gameId: string, participantId: string): Promise<void> {
  if (import.meta.env.DEV) {
    return;
  }

  const idToken = await auth.currentUser?.getIdToken();

  if (!idToken) {
    return;
  }

  try {
    await fetch("/api/notify-game-joined", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ gameId, participantId }),
    });
  } catch {
    // Join already succeeded; staff push is best-effort.
  }
}
