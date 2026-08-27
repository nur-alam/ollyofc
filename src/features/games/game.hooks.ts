import { useEffect, useMemo, useState } from "react";

import { subscribeToGame, subscribeToGames, subscribeToParticipants } from "@/features/games/game.service";
import { getServerNow, syncServerClock } from "@/lib/clock";
import type { Game, GameParticipant } from "@/types/game";
import {
  canPlayerLeaveGame,
  getLastFinishedGame,
  isGameInPlay,
  isUpcomingGame,
  sortGames,
} from "@/types/game";

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

  const now = useNow(1000);
  const sortedGames = useMemo(() => sortGames(games, now), [games, now]);

  const upcomingGames = useMemo(
    () => sortedGames.filter((game) => isUpcomingGame(game, now)),
    [now, sortedGames],
  );

  const liveGames = useMemo(
    () => sortedGames.filter((game) => isGameInPlay(game, now)),
    [now, sortedGames],
  );

  const lastFinishedGame = useMemo(
    () => getLastFinishedGame(sortedGames, now),
    [now, sortedGames],
  );

  const nextUpcomingGame = upcomingGames[0] ?? null;

  return { games: sortedGames, upcomingGames, liveGames, lastFinishedGame, nextUpcomingGame, loading, errorMessage };
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

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => getServerNow());

  useEffect(() => {
    let cancelled = false;

    void syncServerClock().then(() => {
      if (!cancelled) {
        setNow(getServerNow());
      }
    });

    const timer = window.setInterval(() => setNow(getServerNow()), intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}

export function useCanPlayerLeave(game: Game | null | undefined) {
  const now = useNow(10_000);

  return Boolean(game && canPlayerLeaveGame(game, now));
}
