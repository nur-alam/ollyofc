import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckIcon, UserRoundCogIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage, setGamePaymentVerifier } from "@/features/games/game.service";
import { useUserMap } from "@/features/players/player.hooks";
import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";

const NONE = "none";

function VerifierOption({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: string;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted",
          selected && "bg-muted font-medium",
        )}
        onClick={onSelect}
      >
        <span className="min-w-0 truncate">{children}</span>
        {selected ? <CheckIcon className="size-4 shrink-0" /> : <span className="size-4 shrink-0" />}
      </button>
    </li>
  );
}

export function PaymentVerifierAssign({
  game,
  isStaff,
}: {
  game: Game;
  isStaff: boolean;
}) {
  const usersById = useUserMap();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(NONE);
  const verifierChoices = useMemo(() => {
    return [...usersById.values()]
      .filter((user) => user.isActive || user.id === game.paymentVerifierId)
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }, [usersById, game.paymentVerifierId]);
  const verifierName = game.paymentVerifierId
    ? usersById.get(game.paymentVerifierId)?.displayName
    : undefined;
  const search = query.trim().toLowerCase();
  const visibleChoices = verifierChoices.filter((user) =>
    user.displayName.toLowerCase().includes(search),
  );
  const currentId = game.paymentVerifierId || NONE;

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery("");
    setSelectedId(currentId);
  }, [open, currentId]);

  const handleSave = async () => {
    if (!isStaff || selectedId === currentId) {
      return;
    }

    setSaving(true);

    try {
      await setGamePaymentVerifier(game.id, selectedId === NONE ? "" : selectedId);
      toast.success(selectedId === NONE ? "Payment verifier cleared" : "Payment verifier assigned");
      setOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not assign the payment verifier."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm">
          Payment verifier: {verifierName ?? "No one assigned"}
        </p>
        {isStaff ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Assign payment verifier"
            onClick={() => setOpen(true)}
          >
            <UserRoundCogIcon />
          </Button>
        ) : null}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => {
            if (!saving) {
              setOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`select-verifier-${game.id}`}
            className="flex max-h-[min(32rem,calc(100dvh-2rem))] w-full max-w-md flex-col rounded-xl border bg-background p-4 shadow-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={`select-verifier-${game.id}`} className="text-lg font-semibold">
              Select Verifier
            </h2>
            <form
              className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSave();
              }}
            >
              <div className="grid min-h-0 gap-2">
                <Label htmlFor={`verifier-search-${game.id}`}>Player</Label>
                <Input
                  id={`verifier-search-${game.id}`}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name"
                  autoComplete="off"
                />
                <ul className="max-h-60 overflow-y-auto rounded-lg border">
                  <VerifierOption
                    selected={selectedId === NONE}
                    onSelect={() => setSelectedId(NONE)}
                  >
                    No one assigned
                  </VerifierOption>
                  {visibleChoices.map((user) => (
                    <VerifierOption
                      key={user.id}
                      selected={selectedId === user.id}
                      onSelect={() => setSelectedId(user.id)}
                    >
                      {user.displayName}
                    </VerifierOption>
                  ))}
                  {search && !visibleChoices.length ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">No players match.</li>
                  ) : null}
                </ul>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || selectedId === currentId}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
