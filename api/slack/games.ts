import { json } from "../_lib/fcm-http";
import { gamesPageFromText, slackGamesMessage } from "../_lib/slack/games";
import {
  defer,
  postSlackResponse,
  readSlackCommand,
  slackAck,
  slackHookUrl,
  slackMessage,
  type SlackEdgeContext,
} from "../_lib/slack/request";

export const config = {
  runtime: "edge",
};

async function deliverGames(responseUrl: string, page: number) {
  try {
    const message = await slackGamesMessage(page);
    await postSlackResponse(responseUrl, message);
  } catch (error) {
    console.error(error);
    await postSlackResponse(responseUrl, {
      response_type: "ephemeral",
      text: "Games could not be loaded. Try again in a moment.",
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

  const page = gamesPageFromText(command.get("text"));
  const responseUrl = slackHookUrl(command.get("response_url"));

  if (responseUrl) {
    const delivery = deliverGames(responseUrl, page);

    if (!defer(delivery, context)) {
      console.error("Slack games had no waitUntil, so the reply may not finish");
    }

    return slackAck();
  }

  try {
    return json(await slackGamesMessage(page));
  } catch (error) {
    console.error(error);
    return slackMessage("Games could not be loaded. Try again in a moment.");
  }
}
