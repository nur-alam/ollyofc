let clockOffsetMs = 0;
let syncPromise: Promise<number> | null = null;

export function getServerNowMs() {
  return Date.now() + clockOffsetMs;
}

export function getServerNow() {
  return new Date(getServerNowMs());
}

export function syncServerClock() {
  if (!syncPromise) {
    syncPromise = measureClockOffset()
      .then((offset) => {
        clockOffsetMs = offset;
        return offset;
      })
      .catch(() => {
        clockOffsetMs = 0;
        return 0;
      });
  }

  return syncPromise;
}

async function measureClockOffset() {
  const startedAt = Date.now();
  const response = await fetch(`${window.location.origin}/api/time?t=${startedAt}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  const endedAt = Date.now();

  if (!response.ok) {
    throw new Error("Time endpoint failed");
  }

  const data = (await response.json()) as { now?: number };
  const serverMs = Number(data.now);

  if (!Number.isFinite(serverMs)) {
    throw new Error("Invalid server time");
  }

  return serverMs - Math.round((startedAt + endedAt) / 2);
}
