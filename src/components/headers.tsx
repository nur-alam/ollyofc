import {
  Loader2Icon,
  LogInIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import type { User } from "firebase/auth";

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
import { cn } from "@/lib/utils";

type HeaderProps = {
  user: User | null;
  loading: boolean;
  onGoogleLogin: () => void | Promise<void>;
  onLogout: () => void | Promise<void>;
};

function getUserInitials(user: User) {
  const name = user.displayName || user.email?.split("@")[0] || "U";
  return name.charAt(0).toUpperCase();
}

function getUserDisplayName(user: User) {
  return user.displayName || user.email?.split("@")[0] || "User";
}

const topbarActionClassName =
  "inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-sm";

const topbarButtonClassName = cn(
  topbarActionClassName,
  "cursor-pointer rounded-lg bg-white/15 text-white hover:bg-white/30 hover:text-white",
);

function Header({ user, loading, onGoogleLogin, onLogout }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">Ollyo FC</div>

      <div className="topbar-actions h-8">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className={topbarButtonClassName}>
                  <Avatar size="sm">
                    <AvatarImage
                      src={user.photoURL ?? undefined}
                      alt={getUserDisplayName(user)}
                    />
                    <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                  </Avatar>
                  <span>{getUserDisplayName(user)}</span>
                </Button>
              }
            />
            <DropdownMenuContent
              align="end"
              className="min-w-40 [&_[data-slot=dropdown-menu-item]]:cursor-pointer"
            >
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <UserIcon />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SettingsIcon />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
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
            onClick={onGoogleLogin}
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

export default Header;
