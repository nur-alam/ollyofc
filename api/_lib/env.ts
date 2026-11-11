export type ServerEnv = {
  CRON_SECRET?: string;
  FIREBASE_SERVICE_ACCOUNT?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  SLACK_SIGNING_SECRET?: string;
  SLACK_BOT_TOKEN?: string;
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
  get SLACK_SIGNING_SECRET() {
    return readEnv("SLACK_SIGNING_SECRET");
  },
  get SLACK_BOT_TOKEN() {
    return readEnv("SLACK_BOT_TOKEN");
  },
};
