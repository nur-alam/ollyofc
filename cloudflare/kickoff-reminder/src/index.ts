export interface Env {
  CRON_SECRET: string;
  KICKOFF_REMINDER_URL: string;
}

async function runKickoffReminder(env: Env) {
  const secret = env.CRON_SECRET?.trim();
  const url = env.KICKOFF_REMINDER_URL?.trim();

  if (!secret || !url) {
    throw new Error("CRON_SECRET or KICKOFF_REMINDER_URL is missing");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Kickoff reminder failed: ${response.status} ${body}`);
  }

  return response;
}

export default {
  async fetch() {
    return new Response("Kickoff reminder worker. Cron only.", { status: 200 });
  },

  async scheduled(_controller: ScheduledController, env: Env) {
    await runKickoffReminder(env);
  },
};
