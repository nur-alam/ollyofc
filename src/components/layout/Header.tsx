import {
  BellIcon,
  GoalIcon,
  LayoutDashboardIcon,
  Loader2Icon,
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InstallAppButton } from "@/components/layout/InstallAppButton";
import { NotifyBellButton } from "@/features/notifications/NotifyBellButton";
import { useAuthStore } from "@/features/auth/auth.store";
import { cn } from "@/lib/utils";
import { isStaffRole } from "@/types/user";

function getUserInitials(name: string) {
  return name.charAt(0).toUpperCase();
}

const topbarActionClassName =
  "inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-sm";

const topbarButtonClassName = cn(
  topbarActionClassName,
  "cursor-pointer rounded-lg bg-white/15 text-white hover:bg-white/30 hover:text-white",
);

const headerNavClassName = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium no-underline transition-colors sm:px-3 [&_svg]:size-4 [&_svg]:shrink-0",
    isActive
      ? "bg-white/20 text-white"
      : "text-white/80 hover:bg-white/15 hover:text-white",
  );

const navItems = [
  { to: "/squad", label: "Squad", icon: UsersIcon, end: false },
  { to: "/games", label: "Games", icon: GoalIcon, end: true },
  { to: "/leaderboard", label: "Leaderboard", icon: TrophyIcon, end: false },
];

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { firebaseUser, profile, loading, signInWithGoogle, logout } =
    useAuthStore();
  const isStaff = profile ? isStaffRole(profile.role) : false;
  const isAdmin = profile?.role === "admin";

  const displayName =
    profile?.displayName ||
    firebaseUser?.displayName ||
    firebaseUser?.email?.split("@")[0] ||
    "User";

  return (
    <header className="topbar">
      <div>
        {/* Phones have no room for the full nav beside the auth button. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 cursor-pointer bg-white/15 text-white hover:bg-white/30 hover:text-white sm:hidden"
                aria-label="Open menu"
              >
                <MenuIcon />
              </Button>
            }
          />
          <DropdownMenuContent
            align="start"
            className="min-w-44 [&_[data-slot=dropdown-menu-item]]:cursor-pointer"
          >
            {navItems.map((item) => (
              <DropdownMenuItem
                key={item.to}
                className={cn(
                  (pathname === item.to || pathname.startsWith(`${item.to}/`)) &&
                    "bg-muted",
                )}
                onClick={() => navigate(item.to)}
              >
                <item.icon />
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Link to="/" className="ml-1 brand shrink-0 whitespace-nowrap text-white no-underline">
          Ollyo FC
        </Link>
      </div>

      <div className="topbar-actions h-8">

        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={headerNavClassName}
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <InstallAppButton />
        {profile ? <NotifyBellButton userId={profile.id} /> : null}

        {firebaseUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className={topbarButtonClassName}>
                  <Avatar size="sm">
                    <AvatarImage
                      src={profile?.photoURL ?? firebaseUser.photoURL ?? undefined}
                      alt={displayName}
                    />
                    <AvatarFallback>{getUserInitials(displayName)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-32 truncate sm:inline">{displayName}</span>
                </Button>
              }
            />
            <DropdownMenuContent
              align="end"
              className="min-w-40 [&_[data-slot=dropdown-menu-item]]:cursor-pointer"
            >
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserIcon />
                  Profile
                </DropdownMenuItem>
                {isStaff && (
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <LayoutDashboardIcon />
                    Dashboard
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/notification")}>
                    <BellIcon />
                    Notifications
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <LogOutIcon />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            className={cn(
              topbarButtonClassName,
              loading && "cursor-not-allowed opacity-50",
            )}
            variant="ghost"
            onClick={() => signInWithGoogle()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <LogInIcon />
                Sign In
              </>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
