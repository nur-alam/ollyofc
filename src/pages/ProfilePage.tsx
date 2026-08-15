import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/features/auth/auth.store";
import { updateUserDisplayName } from "@/features/auth/auth.service";
import { getErrorMessage } from "@/lib/errors";
import { formatPosition } from "@/types/player";

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

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="text-muted-foreground">
        Your account is your player record. You can update your display name
        here.
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
          <div>
            <dt className="text-muted-foreground">Position</dt>
            <dd className="font-medium">{formatPosition(profile?.position)}</dd>
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
