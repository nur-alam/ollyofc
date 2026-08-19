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
  const t0 = Date.now();
  const response = await fetch(`${window.location.origin}/favicon.svg?t=${t0}`, {
    cache: "no-store",
  });
  const t1 = Date.now();
  const dateHeader = response.headers.get("date");

  if (!dateHeader) {
    return 0;
  }

  const serverMs = Date.parse(dateHeader);

  if (!Number.isFinite(serverMs)) {
    return 0;
  }

  return serverMs - Math.round((t0 + t1) / 2);
}
