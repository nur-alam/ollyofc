import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import { useAuthStore } from "@/features/auth/auth.store";
import { isUsingDevFirebase } from "@/lib/firebase";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => initialize(), [initialize]);

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
