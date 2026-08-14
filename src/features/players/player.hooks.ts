import { useEffect, useMemo, useState } from "react";

import { subscribeToPlayers } from "@/features/players/player.service";
import type { Player, PlayerFilterState } from "@/types/player";

export function filterPlayers(players: Player[], filters: PlayerFilterState) {
  const search = filters.search.trim().toLowerCase();

  return players.filter((player) => {
    if (filters.category !== "all" && player.category !== filters.category) {
      return false;
    }

    if (filters.position !== "all" && player.position !== filters.position) {
      return false;
    }

    if (filters.status === "active" && !player.isActive) {
      return false;
    }

    if (filters.status === "inactive" && player.isActive) {
      return false;
    }

    if (!search) {
      return true;
    }

    return (
      player.name.toLowerCase().includes(search) ||
      player.category.toLowerCase().includes(search) ||
      player.position.toLowerCase().includes(search)
    );
  });
}

export function usePlayers(filters: PlayerFilterState) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeToPlayers(
      (nextPlayers) => {
        setPlayers(nextPlayers);
        setLoading(false);
        setErrorMessage("");
      },
      (message) => {
        setPlayers([]);
        setLoading(false);
        setErrorMessage(message);
      },
    );

    return unsubscribe;
  }, []);

  const filteredPlayers = useMemo(
    () => filterPlayers(players, filters),
    [players, filters],
  );

  const stats = useMemo(
    () => ({
      total: players.length,
      active: players.filter((player) => player.isActive).length,
    }),
    [players],
  );

  return {
    players: filteredPlayers,
    allPlayers: players,
    loading,
    errorMessage,
    stats,
  };
}
