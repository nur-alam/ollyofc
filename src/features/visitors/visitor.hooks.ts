import { useEffect, useMemo, useState } from "react";

import { getErrorMessage } from "@/lib/errors";
import { addCalendarDays, bangladeshTodayYmd } from "@/lib/timezone";

import {
  countAllTimeVisitors,
  isVisitorLive,
  subscribeToDaySummary,
  subscribeToDayVisitors,
  subscribeToLiveVisitors,
  subscribeToVisitorDays,
} from "./visitor.service";
import type { VisitorDaySummary, VisitorRecord } from "./visitor.types";

export function useLiveVisitors() {
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);

    return subscribeToLiveVisitors(
      (next) => {
        setVisitors(next);
        setLoading(false);
        setErrorMessage("");
      },
      (message) => {
        setVisitors([]);
        setLoading(false);
        setErrorMessage(message);
      },
    );
  }, []);

  const liveVisitors = useMemo(
    () => visitors.filter((visitor) => isVisitorLive(visitor, now)),
    [now, visitors],
  );

  return { visitors: liveVisitors, loading, errorMessage };
}

export function useDayVisitors(ymd: string) {
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setLoading(true);

    return subscribeToDayVisitors(
      ymd,
      (next) => {
        setVisitors(next);
        setLoading(false);
        setErrorMessage("");
      },
      (message) => {
        setVisitors([]);
        setLoading(false);
        setErrorMessage(message);
      },
    );
  }, [ymd]);

  return { visitors, loading, errorMessage };
}

export function useDaySummary(ymd: string) {
  const [summary, setSummary] = useState<VisitorDaySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    return subscribeToDaySummary(ymd, (next) => {
      setSummary(next);
      setLoading(false);
    });
  }, [ymd]);

  return { summary, loading };
}

export function useVisitorCalendar() {
  const [days, setDays] = useState<VisitorDaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    return subscribeToVisitorDays(
      (next) => {
        setDays(next);
        setLoading(false);
        setErrorMessage("");
      },
      (message) => {
        setDays([]);
        setLoading(false);
        setErrorMessage(message);
      },
    );
  }, []);

  const datesWithVisits = useMemo(
    () => days.filter((day) => day.uniqueVisitors > 0).map((day) => day.date),
    [days],
  );

  return { days, datesWithVisits, loading, errorMessage };
}

export function useAllTimeVisitorCount() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const next = await countAllTimeVisitors();

        if (cancelled) {
          return;
        }

        setCount(next);
        setErrorMessage("");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(getErrorMessage(error, "Could not load the all-time visitor count."));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return { count, loading, errorMessage };
}

export function useVisitorDates() {
  const today = bangladeshTodayYmd();

  return {
    today,
    yesterday: addCalendarDays(today, -1),
  };
}
