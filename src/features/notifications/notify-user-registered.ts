import { auth } from "@/lib/firebase";

export async function notifyUserRegistered(): Promise<void> {
  if (import.meta.env.DEV) {
    return;
  }

  const idToken = await auth.currentUser?.getIdToken();

  if (!idToken) {
    return;
  }

  try {
    await fetch("/api/notify-user-registered", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
  } catch {
    // The profile is already saved. Staff push is best-effort.
  }
}
