import {
  arrayUnion,
  collection,
  doc,
  increment,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  where,
  query,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { isBotUserAgent, parseDevice } from "@/lib/device";
import { getErrorMessage } from "@/lib/errors";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { isStandalonePwa } from "@/lib/pwa";
import { bangladeshTodayYmd } from "@/lib/timezone";

import { pageLabel } from "./page-label";
import type {
  VisitorDaySummary,
  VisitorGeo,
  VisitorPingInput,
  VisitorRecord,
} from "./visitor.types";

const VISITOR_ID_KEY = "ollyfc_visitor_id";
const VISITOR_DAY_KEY = "ollyfc_visitor_day";
const VISITOR_PATH_KEY = "ollyfc_visitor_path";
const VISITOR_INIT_KEY = "ollyfc_visitor_inited";
const VISITOR_GEO_KEY = "ollyfc_visitor_geo";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LIVE_WINDOW_MS = 90_000;

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asBool(value: unknown) {
  return value === true;
}

function timestampMs(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  return 0;
}

function emptyGeo(): VisitorGeo {
  return { ip: "", city: "", region: "", country: "" };
}

function readStoredGeo(): VisitorGeo | null {
  try {
    const raw = sessionStorage.getItem(VISITOR_GEO_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<VisitorGeo>;

    return {
      ip: clip(asString(parsed.ip), 64),
      city: clip(asString(parsed.city), 80),
      region: clip(asString(parsed.region), 80),
      country: clip(asString(parsed.country), 8).toUpperCase(),
    };
  } catch {
    return null;
  }
}

async function loadGeo(): Promise<VisitorGeo> {
  const cached = readStoredGeo();

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch("/api/track-visitor", {
      cache: "no-store",
    });

    if (!response.ok) {
      return emptyGeo();
    }

    const payload = (await response.json()) as Partial<VisitorGeo>;
    const geo: VisitorGeo = {
      ip: clip(asString(payload.ip), 64),
      city: clip(asString(payload.city), 80),
      region: clip(asString(payload.region), 80),
      country: clip(asString(payload.country), 8).toUpperCase(),
    };

    sessionStorage.setItem(VISITOR_GEO_KEY, JSON.stringify(geo));
    return geo;
  } catch {
    return emptyGeo();
  }
}

function visitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);

    if (existing && UUID_PATTERN.test(existing)) {
      return existing;
    }

    const next = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, next);
    return next;
  } catch {
    return "";
  }
}

function parseVisitor(id: string, data: DocumentData): VisitorRecord {
  return {
    id,
    visitorId: asString(data.visitorId) || id,
    userId: asString(data.userId),
    displayName: asString(data.displayName),
    photoURL: asString(data.photoURL),
    userAgent: asString(data.userAgent),
    device: asString(data.device) || "Browser",
    isMobile: asBool(data.isMobile),
    isPwa: asBool(data.isPwa),
    ip: asString(data.ip),
    city: asString(data.city),
    region: asString(data.region),
    country: asString(data.country),
    path: asString(data.path) || "/",
    pageLabel: asString(data.pageLabel) || pageLabel(asString(data.path) || "/"),
    lastSeenDate: asString(data.lastSeenDate),
    pageViews: asNumber(data.pageViews),
    online: asBool(data.online),
    firstSeenAtMs: timestampMs(data.firstSeenAt),
    lastSeenAtMs: timestampMs(data.lastSeenAt),
  };
}

function parseDaySummary(id: string, data: DocumentData): VisitorDaySummary {
  return {
    date: asString(data.date) || id,
    uniqueVisitors: asNumber(data.uniqueVisitors),
    pageViews: asNumber(data.pageViews),
    signedIn: asNumber(data.signedIn),
    guests: asNumber(data.guests),
  };
}

export function isVisitorLive(visitor: VisitorRecord, now = Date.now()) {
  return visitor.online && now - visitor.lastSeenAtMs < LIVE_WINDOW_MS;
}

export function sortVisitors(visitors: VisitorRecord[]) {
  return [...visitors].sort((left, right) => {
    const liveDelta = Number(right.online) - Number(left.online);

    if (liveDelta !== 0) {
      return liveDelta;
    }

    return right.lastSeenAtMs - left.lastSeenAtMs;
  });
}

let pingChain: Promise<void> = Promise.resolve();

export function pingVisitor(input: VisitorPingInput) {
  pingChain = pingChain.then(() => writeVisitorPing(input)).catch(() => undefined);
  return pingChain;
}

async function writeVisitorPing(input: VisitorPingInput) {
  if (!isFirebaseConfigured || typeof window === "undefined") {
    return;
  }

  const userAgent = navigator.userAgent || "";

  if (isBotUserAgent(userAgent)) {
    return;
  }

  const id = visitorId();

  if (!id) {
    return;
  }

  const ymd = bangladeshTodayYmd();
  const lastDay = localStorage.getItem(VISITOR_DAY_KEY);
  const lastPath = sessionStorage.getItem(VISITOR_PATH_KEY);
  const isNewSession = localStorage.getItem(VISITOR_INIT_KEY) !== "1";
  const isNewDay = lastDay !== ymd;
  const isNewPageView = lastPath !== input.path;

  try {
    if (isNewSession) {
      localStorage.setItem(VISITOR_INIT_KEY, "1");
    }

    if (isNewDay) {
      localStorage.setItem(VISITOR_DAY_KEY, ymd);
    }

    if (isNewPageView) {
      sessionStorage.setItem(VISITOR_PATH_KEY, input.path);
    }
  } catch {
    // Private mode can block storage; still record this ping.
  }

  const device = parseDevice(userAgent);
  const geo = await loadGeo();
  const path = clip(input.path || "/", 200);
  const userId = clip(input.userId ?? "", 80);
  const displayName = clip(input.displayName ?? "", 80);
  const photoURL = clip(input.photoURL ?? "", 500);

  const shared = {
    visitorId: id,
    userId,
    displayName,
    photoURL,
    userAgent: clip(userAgent, 350),
    device: device.kind,
    isMobile: device.isMobile,
    isPwa: isStandalonePwa(),
    ip: geo.ip,
    city: geo.city,
    region: geo.region,
    country: geo.country,
    path,
    pageLabel: pageLabel(path),
    lastSeenDate: ymd,
    online: input.online,
    lastSeenAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  const sessionRef = doc(db, "visitorSessions", id);
  const dayRef = doc(db, "visitorDays", ymd);
  const dayVisitorRef = doc(db, "visitorDays", ymd, "visitors", id);

  const sessionData: Record<string, unknown> = { ...shared };

  if (isNewSession) {
    sessionData.firstSeenAt = serverTimestamp();
    sessionData.pageViews = increment(1);
  } else if (isNewPageView) {
    sessionData.pageViews = increment(1);
  }

  const dayVisitorData: Record<string, unknown> = {
    ...shared,
    paths: arrayUnion(path),
  };

  if (isNewDay) {
    dayVisitorData.firstSeenAt = serverTimestamp();
    dayVisitorData.pageViews = increment(1);
  } else if (isNewPageView) {
    dayVisitorData.pageViews = increment(1);
  }

  const dayData: Record<string, unknown> = {
    date: ymd,
    updatedAt: serverTimestamp(),
  };

  if (isNewDay) {
    dayData.uniqueVisitors = increment(1);

    if (userId) {
      dayData.signedIn = increment(1);
    } else {
      dayData.guests = increment(1);
    }
  }

  if (isNewPageView) {
    dayData.pageViews = increment(1);
  }

  batch.set(sessionRef, sessionData, { merge: true });
  batch.set(dayVisitorRef, dayVisitorData, { merge: true });
  batch.set(dayRef, dayData, { merge: true });
  await batch.commit();
}

export function subscribeToLiveVisitors(
  onData: (visitors: VisitorRecord[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "visitorSessions"), where("online", "==", true)),
    (snapshot) => {
      onData(sortVisitors(snapshot.docs.map((item) => parseVisitor(item.id, item.data()))));
    },
    (error) => {
      onData([]);
      onError?.(getErrorMessage(error, "Could not load live visitors."));
    },
  );
}

export function subscribeToDayVisitors(
  ymd: string,
  onData: (visitors: VisitorRecord[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "visitorDays", ymd, "visitors"),
    (snapshot) => {
      onData(sortVisitors(snapshot.docs.map((item) => parseVisitor(item.id, item.data()))));
    },
    (error) => {
      onData([]);
      onError?.(getErrorMessage(error, "Could not load visitors for this day."));
    },
  );
}

export function subscribeToDaySummary(
  ymd: string,
  onData: (summary: VisitorDaySummary | null) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "visitorDays", ymd),
    (snapshot) => {
      onData(snapshot.exists() ? parseDaySummary(snapshot.id, snapshot.data()) : null);
    },
    (error) => {
      onData(null);
      onError?.(getErrorMessage(error, "Could not load visitor totals."));
    },
  );
}

export function subscribeToVisitorDays(
  onData: (days: VisitorDaySummary[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "visitorDays"),
    (snapshot) => {
      onData(
        snapshot.docs
          .map((item) => parseDaySummary(item.id, item.data()))
          .sort((left, right) => right.date.localeCompare(left.date)),
      );
    },
    (error) => {
      onData([]);
      onError?.(getErrorMessage(error, "Could not load visitor calendar."));
    },
  );
}
