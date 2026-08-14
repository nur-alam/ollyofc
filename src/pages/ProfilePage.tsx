import { useState } from "react";
import { Link } from "react-router-dom";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/features/auth/auth.store";
import { updateUserPosition } from "@/features/auth/auth.service";
import { getErrorMessage } from "@/lib/errors";
import type { PlayerPosition } from "@/types/player";
import { PLAYER_POSITIONS, POSITION_LABELS, formatPosition } from "@/types/player";

export function ProfilePage() {
  const { firebaseUser, profile, setProfile } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePositionChange = async (value: string | null) => {
    if (!profile || !value) {
      return;
    }

    const position = value === "unset" ? "" : (value as PlayerPosition);
    setSaving(true);
    setErrorMessage("");

    try {
      await updateUserPosition(profile.id, position);
      setProfile({ ...profile, position });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not update your position."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="text-muted-foreground">
        Your account is your player record. Set your position so staff can pick
        teams later.
      </p>

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
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">
              {profile?.isActive === false ? "Inactive" : "Active"}
            </dd>
          </div>
          <div className="grid gap-2">
            <Label>Position</Label>
            <Select
              value={profile?.position || "unset"}
              onValueChange={handlePositionChange}
              disabled={!profile || saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={formatPosition(profile?.position)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not set</SelectItem>
                {PLAYER_POSITIONS.map((position) => (
                  <SelectItem key={position} value={position}>
                    {POSITION_LABELS[position]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {saving && (
              <p className="text-xs text-muted-foreground">Saving...</p>
            )}
          </div>
        </dl>
      </div>

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <p className="mt-4 text-sm text-muted-foreground">
        View the squad on the{" "}
        <Link to="/squad" className="text-primary underline-offset-4 hover:underline">
          Squad
        </Link>{" "}
        page. Join upcoming games from{" "}
        <Link to="/games" className="text-primary underline-offset-4 hover:underline">
          Games
        </Link>
        .
      </p>
    </div>
  );
}
