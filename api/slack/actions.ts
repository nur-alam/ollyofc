import { slackGamesMessage } from "../_lib/slack/games";
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

type SlackAction = {
  action_id?: string;
  value?: string;
};

type SlackActionPayload = {
  type?: string;
  response_url?: string;
  actions?: SlackAction[];
};

async function replaceGames(responseUrl: string, page: number) {
  try {
    const message = await slackGamesMessage(page);
    await postSlackResponse(responseUrl, { replace_original: true, ...message });
  } catch (error) {
    console.error(error);
    await postSlackResponse(responseUrl, {
      replace_original: true,
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

  let payload: SlackActionPayload;

  try {
    payload = JSON.parse(command.get("payload") ?? "") as SlackActionPayload;
  } catch {
    return slackMessage("That action is not available.");
  }

  if (payload.type !== "block_actions") {
    return new Response(null, { status: 200 });
  }

  const action = payload.actions?.[0];

  if (action?.action_id !== "games-previous" && action?.action_id !== "games-next") {
    return new Response(null, { status: 200 });
  }

  const responseUrl = slackHookUrl(payload.response_url ?? null);

  if (!responseUrl) {
    return slackMessage("Games could not be loaded. Try again in a moment.");
  }

  const delivery = replaceGames(responseUrl, Number(action.value));

  if (!defer(delivery, context)) {
    console.error("Slack games page had no waitUntil, so the reply may not finish");
  }

  return new Response(null, { status: 200 });
}
