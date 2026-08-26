import { useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";

import { useAuthStore } from "@/features/auth/auth.store";
import { subscribeToForegroundPush } from "@/features/notifications/push.service";
import { isUsingDevFirebase } from "@/lib/firebase";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);

  useEffect(() => initialize(), [initialize]);

  useEffect(() => {
    if (!firebaseUser) {
      return;
    }

    return subscribeToForegroundPush((title, body, url) => {
      toast((t) => (
        <button
          type="button"
          className="cursor-pointer text-left"
          onClick={() => {
            toast.dismiss(t.id);
            window.location.assign(url);
          }}
        >
          <span className="block font-medium">{title}</span>
          <span className="block text-sm opacity-80">{body}</span>
        </button>
      ));
    });
  }, [firebaseUser]);

  return (
    <>
      {isUsingDevFirebase && (
        <div className="bg-sky-600 px-3 py-1.5 text-center text-xs font-medium text-white">
          Firestore database ollyofcdev — not production
        </div>
      )}
      {children}
      <Toaster position="top-right" />
    </>
  );
}
