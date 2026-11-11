import { json } from "../_lib/fcm-http";
import { slackLeaderboardMessage } from "../_lib/slack/leaderboard";
import {
  defer,
  postSlackResponse,
  readSlackCommand,
  slackHookUrl,
  slackMessage,
  type SlackEdgeContext,
} from "../_lib/slack/request";

export const config = {
  runtime: "edge",
};

async function deliverLeaderboard(responseUrl: string) {
  try {
    const message = await slackLeaderboardMessage();
    await postSlackResponse(responseUrl, { replace_original: true, ...message });
  } catch (error) {
    console.error(error);
    await postSlackResponse(responseUrl, {
      response_type: "ephemeral",
      text: "The leaderboard could not be loaded. Try again in a moment.",
    }).catch((postError) => {
      console.error(postError);
    });
  }
}

export default async function handler(request: Request, context: SlackEdgeContext) {
  const command = await readSlackCommand(request);

  if (command instanceof Response) {
    return command;
  }

  const responseUrl = slackHookUrl(command.get("response_url"));

  if (responseUrl) {
    const delivery = deliverLeaderboard(responseUrl);

    if (!defer(delivery, context)) {
      console.error("Slack leaderboard had no waitUntil, so the reply may not finish");
    }

    return slackMessage("Loading the leaderboard…");
  }

  try {
    return json(await slackLeaderboardMessage());
  } catch (error) {
    console.error(error);
    return slackMessage("The leaderboard could not be loaded. Try again in a moment.");
  }
}
