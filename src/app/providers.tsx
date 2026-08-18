import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import { useAuthStore } from "@/features/auth/auth.store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => initialize(), [initialize]);

  return (
    <>
      {children}
      <Toaster position="top-right" />
    </>
  );
}
