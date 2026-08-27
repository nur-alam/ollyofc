import {
  BellIcon,
  LayoutDashboardIcon,
  UserCircleIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuthStore } from "@/features/auth/auth.store";
import { cn } from "@/lib/utils";
import { isStaffRole } from "@/types/user";

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

export function Sidebar() {
  const profile = useAuthStore((state) => state.profile);
  const isStaff = profile ? isStaffRole(profile.role) : false;
  const isAdmin = profile?.role === "admin";

  if (!isStaff) {
    return null;
  }

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background p-4 md:block">
      <nav className="flex flex-col gap-1">
        <NavLink to="/dashboard" className={navLinkClassName}>
          <LayoutDashboardIcon className="size-4" />
          Dashboard
        </NavLink>
        {isAdmin ? (
          <NavLink to="/notification" className={navLinkClassName}>
            <BellIcon className="size-4" />
            Notifications
          </NavLink>
        ) : null}
        <NavLink to="/profile" className={navLinkClassName}>
          <UserCircleIcon className="size-4" />
          Profile
        </NavLink>
      </nav>
    </aside>
  );
}
