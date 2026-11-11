import { slackGamesMessage } from "../_lib/slack/games";
import { slackSquadMessage } from "../_lib/slack/squad";
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

async function replaceMessage(
  responseUrl: string,
  page: number,
  load: (page: number) => Promise<{ response_type: "in_channel"; text: string; blocks?: unknown[] }>,
  failure: string,
) {
  try {
    const message = await load(page);
    await postSlackResponse(responseUrl, { replace_original: true, ...message });
  } catch (error) {
    console.error(error);
    await postSlackResponse(responseUrl, {
      replace_original: true,
      response_type: "ephemeral",
      text: failure,
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

  const actionId = action?.action_id;
  const gamesAction = actionId === "games-previous" || actionId === "games-next";
  const squadAction = actionId === "squad-previous" || actionId === "squad-next";

  if (!gamesAction && !squadAction) {
    return new Response(null, { status: 200 });
  }

  const responseUrl = slackHookUrl(payload.response_url ?? null);
  const failure = gamesAction
    ? "Games could not be loaded. Try again in a moment."
    : "The squad could not be loaded. Try again in a moment.";

  if (!responseUrl) {
    return slackMessage(failure);
  }

  const delivery = gamesAction
    ? replaceMessage(responseUrl, Number(action?.value), slackGamesMessage, failure)
    : replaceMessage(responseUrl, Number(action?.value), slackSquadMessage, failure);

  if (!defer(delivery, context)) {
    console.error("Slack page had no waitUntil, so the reply may not finish");
  }

  return new Response(null, { status: 200 });
}
