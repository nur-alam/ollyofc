export default {
	async scheduled(controller, env) {
		const response = await fetch(env.KICKOFF_REMINDER_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.CRON_SECRET}`,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(`Kickoff reminder failed: ${response.status} ${await response.text()}`);
		}
	},
	async fetch() {
		return new Response('Kickoff reminder worker. Cron only.', { status: 200 });
	},
};
