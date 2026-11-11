import { json } from "../_lib/fcm-http";
import { slackSquadMessage, squadPageFromText } from "../_lib/slack/squad";
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

async function deliverSquad(responseUrl: string, page: number) {
  try {
    const message = await slackSquadMessage(page);
    await postSlackResponse(responseUrl, message);
  } catch (error) {
    console.error(error);
    await postSlackResponse(responseUrl, {
      response_type: "ephemeral",
      text: "The squad could not be loaded. Try again in a moment.",
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

  const page = squadPageFromText(command.get("text"));
  const responseUrl = slackHookUrl(command.get("response_url"));

  if (responseUrl) {
    const delivery = deliverSquad(responseUrl, page);

    if (!defer(delivery, context)) {
      console.error("Slack squad had no waitUntil, so the reply may not finish");
    }

    return slackAck();
  }

  try {
    return json(await slackSquadMessage(page));
  } catch (error) {
    console.error(error);
    return slackMessage("The squad could not be loaded. Try again in a moment.");
  }
}
