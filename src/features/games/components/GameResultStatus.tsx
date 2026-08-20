import { cn } from "@/lib/utils";
import {
  getGameScore,
  getTeamName,
  getWinnerLabel,
  hasMatchEnded,
  isTossFlipping,
  isTossLanded,
  shouldShowLiveToss,
  type Game,
} from "@/types/game";

function getResultStatusMessage(game: Game, now: Date) {
  const showToss = shouldShowLiveToss(game);
  const score = getGameScore(game);
  const finished = hasMatchEnded(game, now);

  if (showToss && isTossFlipping(game.toss, now)) {
    return "Tossing...";
  }

  if (showToss && isTossLanded(game.toss, now) && game.toss) {
    return `${getTeamName(game, game.toss.winner)} wins the toss and will kick off.`;
  }

  if (score.a === 0 && score.b === 0) {
    return finished ? "No goals were scored." : "No goals yet.";
  }

  if (score.a === score.b) {
    return finished ? "The match ended in a draw." : "Currently a draw.";
  }

  const winner = getWinnerLabel(game);
  return finished ? `${winner} WON.` : `${winner} currently winning.`;
}

export function GameResultStatus({ game, now }: { game: Game; now: Date }) {
  const score = getGameScore(game);
  const showToss = shouldShowLiveToss(game);
  const tossing =
    showToss && (isTossFlipping(game.toss, now) || isTossLanded(game.toss, now));
  const isLeader = score.a !== score.b && !tossing;
  const isEven = score.a === score.b && !tossing;

  return (
    <p
      className={cn(
        "text-center text-sm font-bold",
        isLeader && "winner-text",
        isEven && "status-text",
        !isLeader && !isEven && "text-muted-foreground",
      )}
    >
      {getResultStatusMessage(game, now)}
    </p>
  );
}
