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
  const sources = [offsetFromWorldTime, offsetFromTimeApi, offsetFromDateHeader];

  for (const source of sources) {
    try {
      const offset = await source();

      if (Number.isFinite(offset)) {
        return offset;
      }
    } catch {
      // Try the next source.
    }
  }

  return 0;
}

function offsetFromSample(serverMs: number, startedAt: number, endedAt: number) {
  if (!Number.isFinite(serverMs)) {
    throw new Error("Invalid server time");
  }

  return serverMs - Math.round((startedAt + endedAt) / 2);
}

async function offsetFromWorldTime() {
  const startedAt = Date.now();
  const response = await fetch("https://worldtimeapi.org/api/timezone/Asia/Dhaka", {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  const endedAt = Date.now();
  const data = (await response.json()) as { unixtime?: number };
  return offsetFromSample(Number(data.unixtime) * 1000, startedAt, endedAt);
}

async function offsetFromTimeApi() {
  const startedAt = Date.now();
  const response = await fetch(
    "https://timeapi.io/api/Time/current/zone?timeZone=UTC",
    {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    },
  );
  const endedAt = Date.now();
  const data = (await response.json()) as { dateTime?: string };
  return offsetFromSample(Date.parse(data.dateTime ?? ""), startedAt, endedAt);
}

async function offsetFromDateHeader() {
  const startedAt = Date.now();
  const response = await fetch(`${window.location.origin}/favicon.svg?t=${startedAt}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  const endedAt = Date.now();
  return offsetFromSample(Date.parse(response.headers.get("date") ?? ""), startedAt, endedAt);
}
