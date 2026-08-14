import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuthStore } from "@/features/auth/auth.store";
import type { UserRole } from "@/types/user";

type RoleGuardProps = {
  allowedRoles: UserRole[];
  children: ReactNode;
  redirectTo?: string;
};

export function RoleGuard({
  allowedRoles,
  children,
  redirectTo = "/dashboard",
}: RoleGuardProps) {
  const { profile, loading } = useAuthStore();

  if (loading || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking permissions...</p>
      </div>
    );
  }

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
