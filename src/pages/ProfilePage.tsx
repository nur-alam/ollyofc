import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/features/auth/auth.store";
import {
  updateUserDisplayName,
  updateUserPosition,
} from "@/features/auth/auth.service";
import { ProfilePhotoUpload } from "@/features/players/components/ProfilePhotoUpload";
import { getErrorMessage } from "@/lib/errors";
import {
  PLAYER_POSITIONS,
  POSITION_LABELS,
  type PlayerPosition,
} from "@/types/player";

export function ProfilePage() {
  const { firebaseUser, profile, setProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setDisplayName(profile?.displayName ?? "");
  }, [profile?.displayName]);

  const handleDisplayNameSave = async () => {
    const nextName = displayName.trim();

    if (!profile || !nextName || nextName === profile.displayName) {
      setDisplayName(profile?.displayName ?? "");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      await updateUserDisplayName(profile.id, nextName);
      setProfile({ ...profile, displayName: nextName });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not update your name."));
      setDisplayName(profile.displayName);
    } finally {
      setSaving(false);
    }
  };

  const handlePositionSave = async (value: string) => {
    if (!PLAYER_POSITIONS.includes(value as PlayerPosition)) {
      return;
    }

    const nextPosition = value as PlayerPosition;

    if (!profile || nextPosition === profile.position) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      await updateUserPosition(profile.id, nextPosition);
      setProfile({ ...profile, position: nextPosition });
      toast.success(`Position updated to ${POSITION_LABELS[nextPosition]}`);
    } catch (error) {
      const message = getErrorMessage(error, "Could not update your position.");
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="text-muted-foreground">
        Your account is your player record. You can update your display name
        and position here.
      </p>

      <div className="mt-6 rounded-xl border bg-background p-5 shadow-sm">
        <dl className="grid gap-4 text-sm">
          <div className="grid gap-2">
            <Label htmlFor="profile-display-name">Display name</Label>
            <Input
              id="profile-display-name"
              value={displayName}
              disabled={!profile || saving}
              onChange={(event) => setDisplayName(event.target.value)}
              onBlur={handleDisplayNameSave}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
            {saving && (
              <p className="text-xs text-muted-foreground">Saving...</p>
            )}
          </div>
          {profile && (
            <ProfilePhotoUpload
              userId={profile.id}
              displayName={profile.displayName}
              photoURL={profile.photoURL}
              disabled={saving}
              onUploaded={(photoURL) => setProfile({ ...profile, photoURL })}
            />
          )}
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
              value={profile?.position || null}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                void handlePositionSave(value);
              }}
            >
              <SelectTrigger className="w-full" disabled={!profile || saving}>
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                {PLAYER_POSITIONS.map((position) => (
                  <SelectItem key={position} value={position}>
                    {POSITION_LABELS[position]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
