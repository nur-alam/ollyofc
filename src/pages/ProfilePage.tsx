import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuthStore } from "@/features/auth/auth.store";
import { getPlayerById } from "@/features/players/player.service";
import type { Player } from "@/types/player";
import { formatCategory, formatPosition } from "@/types/player";
import { isStaffRole } from "@/types/user";

export function ProfilePage() {
  const { firebaseUser, profile } = useAuthStore();
  const [linkedPlayer, setLinkedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!profile?.playerId) {
      setLinkedPlayer(null);
      return;
    }

    getPlayerById(profile.playerId)
      .then(setLinkedPlayer)
      .catch(() => setLinkedPlayer(null));
  }, [profile?.playerId]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="text-muted-foreground">Your account details from Firestore.</p>

      <div className="mt-6 rounded-xl border bg-background p-5 shadow-sm">
        <dl className="grid gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Display name</dt>
            <dd className="font-medium">{profile?.displayName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">
              {profile?.email ?? firebaseUser?.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Role</dt>
            <dd className="font-medium capitalize">{profile?.role ?? "user"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Linked player</dt>
            <dd className="font-medium">
              {linkedPlayer ? (
                <span>
                  {linkedPlayer.name} · {formatCategory(linkedPlayer.category)} ·{" "}
                  {formatPosition(linkedPlayer.position)}
                </span>
              ) : profile?.playerId ? (
                "Loading player profile..."
              ) : (
                "Not linked yet"
              )}
            </dd>
          </div>
        </dl>
      </div>

      {profile && (
        <p className="mt-4 text-sm text-muted-foreground">
          {isStaffRole(profile.role) ? (
            <>
              Staff can link accounts from the{" "}
              <Link to="/players" className="text-primary underline-offset-4 hover:underline">
                Players
              </Link>{" "}
              page when creating or editing a player.
            </>
          ) : (
            <>
              View the squad on the{" "}
              <Link to="/players" className="text-primary underline-offset-4 hover:underline">
                Players
              </Link>{" "}
              page.
            </>
          )}
        </p>
      )}
    </div>
  );
}
