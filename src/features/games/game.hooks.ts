import { useEffect, useMemo, useState } from "react";

import { subscribeToGame, subscribeToGames, subscribeToParticipants } from "@/features/games/game.service";
import type { Game, GameParticipant } from "@/types/game";
import { isUpcomingGame, sortGames } from "@/types/game";

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setLoading(true);

    return subscribeToGames(
      (nextGames) => {
        setGames(nextGames);
        setLoading(false);
        setErrorMessage("");
      },
      (message) => {
        setGames([]);
        setLoading(false);
        setErrorMessage(message);
      },
    );
  }, []);

  const sortedGames = useMemo(() => sortGames(games), [games]);

  const upcomingGames = useMemo(
    () => sortedGames.filter((game) => isUpcomingGame(game)),
    [sortedGames],
  );

  const nextUpcomingGame = upcomingGames[0] ?? null;

  return {
    games: sortedGames,
    upcomingGames,
    nextUpcomingGame,
    loading,
    errorMessage,
  };
}

export function useGame(gameId: string | undefined) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!gameId) {
      setGame(null);
      setLoading(false);
      setErrorMessage("Missing game id.");
      return;
    }

    setLoading(true);

    return subscribeToGame(
      gameId,
      (nextGame) => {
        setGame(nextGame);
        setLoading(false);
        setErrorMessage(nextGame ? "" : "This game could not be found.");
      },
      (message) => {
        setGame(null);
        setLoading(false);
        setErrorMessage(message);
      },
    );
  }, [gameId]);

  return { game, loading, errorMessage };
}

export function useParticipants(gameId: string | undefined) {
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!gameId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    return subscribeToParticipants(
      gameId,
      (nextParticipants) => {
        setParticipants(nextParticipants);
        setLoading(false);
        setErrorMessage("");
      },
      (message) => {
        setParticipants([]);
        setLoading(false);
        setErrorMessage(message);
      },
    );
  }, [gameId]);

  return { participants, loading, errorMessage };
}
