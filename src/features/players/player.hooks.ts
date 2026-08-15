import { useEffect, useMemo, useState } from "react";

import { subscribeToUsers } from "@/features/auth/auth.service";
import type { UserProfile } from "@/types/user";
import type { PlayerFilterState } from "@/types/player";

export function filterSquad(users: UserProfile[], filters: PlayerFilterState) {
  const search = filters.search.trim().toLowerCase();

  return users.filter((user) => {
    if (filters.position !== "all" && user.position !== filters.position) {
      return false;
    }

    if (filters.status === "active" && !user.isActive) {
      return false;
    }

    if (filters.status === "inactive" && user.isActive) {
      return false;
    }

    if (!search) {
      return true;
    }

    return (
      user.displayName.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.position.toLowerCase().includes(search)
    );
  });
}

export function useSquad(filters: PlayerFilterState) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setLoading(true);

    return subscribeToUsers(
      (nextUsers) => {
        setUsers(nextUsers);
        setLoading(false);
        setErrorMessage("");
      },
      (message) => {
        setUsers([]);
        setLoading(false);
        setErrorMessage(message);
      },
    );
  }, []);

  const filteredUsers = useMemo(
    () => filterSquad(users, filters),
    [users, filters],
  );

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.isActive).length,
    }),
    [users],
  );

  return {
    users: filteredUsers,
    allUsers: users,
    loading,
    errorMessage,
    stats,
  };
}

export function useUserMap() {
  const { allUsers } = useSquad({
    search: "",
    position: "all",
    status: "all",
  });

  return useMemo(
    () => new Map(allUsers.map((user) => [user.id, user])),
    [allUsers],
  );
}
