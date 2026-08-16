import {
  Loader2Icon,
  LogInIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";

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
import { useAuthStore } from "@/features/auth/auth.store";
import { cn } from "@/lib/utils";

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
    "inline-flex h-8 items-center rounded-lg px-2 text-sm font-medium no-underline transition-colors sm:px-3",
    isActive
      ? "bg-white/20 text-white"
      : "text-white/80 hover:bg-white/15 hover:text-white",
  );

export function Header() {
  const navigate = useNavigate();
  const { firebaseUser, profile, loading, signInWithGoogle, logout } =
    useAuthStore();

  const displayName =
    profile?.displayName ||
    firebaseUser?.displayName ||
    firebaseUser?.email?.split("@")[0] ||
    "User";

  return (
    <header className="topbar">
      <Link to="/" className="brand text-white no-underline">
        Ollyo FC
      </Link>

      <div className="topbar-actions h-8">
        <nav className="flex items-center gap-1">
          <NavLink to="/squad" className={headerNavClassName}>
            Squad
          </NavLink>
          <NavLink to="/games" end className={headerNavClassName}>
            Games
          </NavLink>
        </nav>

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
                <DropdownMenuItem disabled>
                  <SettingsIcon />
                  Settings
                </DropdownMenuItem>
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
