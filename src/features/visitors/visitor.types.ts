export type VisitorGeo = {
  ip: string;
  city: string;
  region: string;
  country: string;
};

export type VisitorDaySummary = {
  date: string;
  uniqueVisitors: number;
  pageViews: number;
  signedIn: number;
  guests: number;
};

export type VisitorRecord = {
  id: string;
  visitorId: string;
  userId: string;
  displayName: string;
  photoURL: string;
  userAgent: string;
  device: string;
  isMobile: boolean;
  isPwa: boolean;
  ip: string;
  city: string;
  region: string;
  country: string;
  path: string;
  pageLabel: string;
  lastSeenDate: string;
  pageViews: number;
  online: boolean;
  firstSeenAtMs: number;
  lastSeenAtMs: number;
};

export type VisitorPingInput = {
  path: string;
  userId?: string;
  displayName?: string;
  photoURL?: string;
  online: boolean;
};
