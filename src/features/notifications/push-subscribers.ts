import { collectionGroup, onSnapshot, type Unsubscribe } from "firebase/firestore";

import { db } from "@/lib/firebase";

export type PushDevice = {
  id: string;
  userId: string;
  userAgent: string;
};

export function deviceKind(userAgent: string) {
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return "iPhone";
  }

  if (/Android/i.test(userAgent)) {
    return "Android";
  }

  if (/Macintosh|Mac OS/i.test(userAgent)) {
    return "Mac";
  }

  if (/Windows/i.test(userAgent)) {
    return "Windows";
  }

  if (/Linux/i.test(userAgent)) {
    return "Linux";
  }

  return "Browser";
}

export function subscribeToPushDevices(
  onData: (devices: PushDevice[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    collectionGroup(db, "fcmTokens"),
    (snapshot) => {
      onData(
        snapshot.docs
          .map((tokenDoc) => {
            const data = tokenDoc.data();

            return {
              id: tokenDoc.id,
              userId: tokenDoc.ref.parent.parent?.id ?? "",
              userAgent: typeof data.userAgent === "string" ? data.userAgent : "",
            };
          })
          .filter((device) => device.userId),
      );
    },
    (error) => {
      onData([]);
      onError?.(error);
    },
  );
}
