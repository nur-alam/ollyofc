import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { useAuthStore } from "@/features/auth/auth.store";

import { pingVisitor } from "./visitor.service";

export function VisitorTracker() {
  const { pathname } = useLocation();
  const loading = useAuthStore((state) => state.loading);
  const profile = useAuthStore((state) => state.profile);
  const stateRef = useRef({ pathname, profile });

  stateRef.current = { pathname, profile };

  useEffect(() => {
    if (loading) {
      return;
    }

    void pingVisitor({
      path: pathname,
      userId: profile?.id,
      displayName: profile?.displayName,
      photoURL: profile?.photoURL,
      online: document.visibilityState === "visible",
    }).catch(() => undefined);
  }, [loading, pathname, profile?.displayName, profile?.id, profile?.photoURL]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const beat = (online: boolean) => {
      const { pathname: path, profile: user } = stateRef.current;

      void pingVisitor({
        path,
        userId: user?.id,
        displayName: user?.displayName,
        photoURL: user?.photoURL,
        online,
      }).catch(() => undefined);
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        beat(true);
      }
    }, 30_000);

    const onVisibility = () => {
      beat(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      beat(false);
    };
  }, [loading]);

  return null;
}
