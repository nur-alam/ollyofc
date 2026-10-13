import { useNow } from "@/features/games/game.hooks";
import { canMarkGamePayment, countPaidParticipants, type Game, type GameParticipant } from "@/types/game";

export function GamePaymentNote({
  game,
  participants,
}: {
  game: Game;
  participants: GameParticipant[];
}) {
  const now = useNow();

  if (!canMarkGamePayment(game, now)) {
    return null;
  }

  const paidCount = countPaidParticipants(participants);

  return (
    <div className="mt-3 rounded-lg border bg-muted/40 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">Payment</h3>
        <p className="text-sm text-muted-foreground">
          {paidCount} of {participants.length} paid
        </p>
      </div>
      <p className="mt-2 text-sm whitespace-pre-wrap">{game.paymentInfo}</p>
    </div>
  );
}
