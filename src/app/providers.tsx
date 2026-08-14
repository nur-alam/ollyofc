import { useEffect } from "react";

import { useAuthStore } from "@/features/auth/auth.store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => initialize(), [initialize]);

  return children;
}
