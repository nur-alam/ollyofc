import { collectionGroup, onSnapshot, type Unsubscribe } from "firebase/firestore";

import { deviceKind } from "@/lib/device";
import { db } from "@/lib/firebase";

export type PushDevice = {
  id: string;
  userId: string;
  userAgent: string;
};

export { deviceKind };

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
