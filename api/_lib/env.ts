export type ServerEnv = {
  CRON_SECRET?: string;
  FIREBASE_SERVICE_ACCOUNT?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
};

function readEnv(name: keyof ServerEnv) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export const env: ServerEnv = {
  get CRON_SECRET() {
    return readEnv("CRON_SECRET");
  },
  get FIREBASE_SERVICE_ACCOUNT() {
    return readEnv("FIREBASE_SERVICE_ACCOUNT");
  },
  get FIREBASE_PROJECT_ID() {
    return readEnv("FIREBASE_PROJECT_ID");
  },
  get FIREBASE_CLIENT_EMAIL() {
    return readEnv("FIREBASE_CLIENT_EMAIL");
  },
  get FIREBASE_PRIVATE_KEY() {
    return readEnv("FIREBASE_PRIVATE_KEY");
  },
};
