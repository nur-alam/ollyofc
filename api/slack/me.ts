import { json } from "../_lib/fcm-http";
import { slackMeMessage } from "../_lib/slack/me";
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

async function deliverMe(responseUrl: string, userId: string) {
  try {
    const result = await slackMeMessage(userId);
    await postSlackResponse(
      responseUrl,
      result.ok ? result.message : { response_type: "ephemeral", text: result.text },
    );
  } catch (error) {
    console.error(error);
    await postSlackResponse(responseUrl, {
      response_type: "ephemeral",
      text: "Your stats could not be loaded. Try again in a moment.",
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

  const userId = command.get("user_id") ?? "";
  const responseUrl = slackHookUrl(command.get("response_url"));

  if (responseUrl) {
    const delivery = deliverMe(responseUrl, userId);

    if (!defer(delivery, context)) {
      console.error("Slack profile had no waitUntil, so the reply may not finish");
    }

    return slackAck();
  }

  try {
    const result = await slackMeMessage(userId);
    return result.ok ? json(result.message) : slackMessage(result.text);
  } catch (error) {
    console.error(error);
    return slackMessage("Your stats could not be loaded. Try again in a moment.");
  }
}
