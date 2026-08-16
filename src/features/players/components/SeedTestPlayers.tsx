import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth.store";
import { removeSeedUsers, seedTestUsers } from "@/features/players/seed-users";
import { getErrorMessage } from "@/lib/errors";

export function SeedTestPlayers() {
  const profile = useAuthStore((state) => state.profile);
  const [seeding, setSeeding] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (profile?.role !== "admin") {
    return null;
  }

  const handleSeedUsers = async () => {
    setSeeding(true);
    setErrorMessage("");

    try {
      await seedTestUsers();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not seed test players."));
    } finally {
      setSeeding(false);
    }
  };

  const handleRemoveSeedUsers = async () => {
    setSeeding(true);
    setErrorMessage("");

    try {
      await removeSeedUsers();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not remove test players."));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={seeding} onClick={handleSeedUsers}>
          {seeding ? "Working..." : "Seed test players"}
        </Button>
        <Button variant="ghost" disabled={seeding} onClick={handleRemoveSeedUsers}>
          Remove test players
        </Button>
      </div>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
    </div>
  );
}
