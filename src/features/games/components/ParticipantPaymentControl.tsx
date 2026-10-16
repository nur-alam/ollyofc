import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getErrorMessage,
  reviewParticipantPayment,
  submitParticipantPayment,
} from "@/features/games/game.service";
import {
  GAME_PAYMENT_STATUS_LABELS,
  getParticipantPaymentStatus,
  isGuestParticipant,
  MIN_PAYMENT_TRANSACTION_ID_LENGTH,
  type GameParticipant,
} from "@/types/game";

const statusVariant = {
  unpaid: "outline",
  pending: "secondary",
  paid: "default",
  cancelled: "destructive",
} as const;

export function ParticipantPaymentControl({
  gameId,
  participant,
  isStaff,
  profileId,
}: {
  gameId: string;
  participant: GameParticipant;
  isStaff: boolean;
  profileId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [saving, setSaving] = useState(false);
  const status = getParticipantPaymentStatus(participant);
  const trimmedTransactionId = transactionId.trim();
  const transactionIdReady =
    trimmedTransactionId.length >= MIN_PAYMENT_TRANSACTION_ID_LENGTH;
  const isOwn =
    Boolean(profileId) &&
    participant.userId === profileId &&
    !isGuestParticipant(participant);
  const canSubmit =
    Boolean(profileId) && (isStaff || isOwn) && (status === "unpaid" || status === "cancelled");
  const canReview = isStaff && status !== "unpaid";
  const canView = isOwn && status === "pending";
  const payingAgain = status === "cancelled" && isOwn;
  const label = saving ? "Saving..." : payingAgain ? "Pay" : GAME_PAYMENT_STATUS_LABELS[status];
  const variant = payingAgain ? "outline" : statusVariant[status];
  const interactive = canSubmit || canReview || canView;

  const handleSubmit = async () => {
    setSaving(true);

    try {
      await submitParticipantPayment(gameId, participant.userId, transactionId);
      setTransactionId("");
      setOpen(false);
      toast.success("Payment details submitted. Waiting for confirmation.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not submit this payment details."));
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (next: "paid" | "cancelled") => {
    if (!profileId) {
      return;
    }

    setSaving(true);

    try {
      await reviewParticipantPayment(gameId, participant.userId, next, profileId);
      setOpen(false);
      toast.success(next === "paid" ? "Marked as paid" : "Payment cancelled");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update this payment."));
    } finally {
      setSaving(false);
    }
  };

  if (!interactive) {
    return (
      <Button type="button" size="sm" variant={variant} disabled>
        {label}
      </Button>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!saving) {
          setOpen(next);
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            size="sm"
            variant={variant}
            disabled={saving}
          />
        }
      >
        {label}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-3 p-4">
        {canReview ? (
          <div className="grid gap-3">
            <PopoverHeader>
              <PopoverTitle>Check this payment</PopoverTitle>
              <PopoverDescription>
                Match the transaction details, then mark it paid or cancelled.
              </PopoverDescription>
            </PopoverHeader>
            <p className="font-mono text-sm break-all">
              {participant.transactionId || "No transaction details found"}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={saving || status === "paid"}
                onClick={() => void handleReview("paid")}
              >
                Paid
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving || status === "cancelled"}
                onClick={() => void handleReview("cancelled")}
              >
                Cancelled
              </Button>
            </div>
          </div>
        ) : null}

        {canView && !canReview ? (
          <PopoverHeader>
            <PopoverTitle>Pending</PopoverTitle>
            <PopoverDescription>
              Staff will check transaction {participant.transactionId}.
            </PopoverDescription>
          </PopoverHeader>
        ) : null}

        {canSubmit ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            {status === "cancelled" ? (
              <PopoverHeader>
                <PopoverTitle>Submit again</PopoverTitle>
                <PopoverDescription>
                  Staff cancelled
                  {participant.transactionId
                    ? ` transaction ${participant.transactionId}`
                    : " the last payment"}
                  . Enter a new transaction details.
                </PopoverDescription>
              </PopoverHeader>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor={`payment-trx-${participant.userId}`}>
                Transaction ID or details
              </Label>
              <textarea
                id={`payment-trx-${participant.userId}`}
                rows={3}
                value={transactionId}
                onChange={(event) => setTransactionId(event.target.value)}
                placeholder="Paste the transaction ID or details"
                className="min-h-16 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              />
              {trimmedTransactionId.length > 0 && !transactionIdReady ? (
                <p className="text-xs text-muted-foreground">Enter at least 5 characters.</p>
              ) : null}
            </div>
            <Button type="submit" size="sm" disabled={saving || !transactionIdReady}>
              {saving ? "Saving..." : "Submit"}
            </Button>
          </form>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
