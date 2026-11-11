import { json } from "../_lib/fcm-http";
import { slackLeaderboardMessage } from "../_lib/slack/leaderboard";
import { readSlackCommand, slackMessage } from "../_lib/slack/request";

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request) {
  const command = await readSlackCommand(request);

  if (command instanceof Response) {
    return command;
  }

  try {
    return json(await slackLeaderboardMessage());
  } catch (error) {
    console.error(error);
    return slackMessage("The leaderboard could not be loaded. Try again in a moment.");
  }
}
