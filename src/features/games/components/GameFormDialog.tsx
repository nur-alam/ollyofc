import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GameInput } from "@/types/game";

type GameFormDialogProps = {
  open: boolean;
  saving: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (input: GameInput) => Promise<void>;
};

function tomorrowDateValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const emptyForm: GameInput = {
  title: "",
  date: tomorrowDateValue(),
  startTime: "18:00",
  location: "Office Field",
  matchDurationMinutes: 90,
  notes: "",
};

export function GameFormDialog({
  open,
  saving,
  errorMessage,
  onClose,
  onSubmit,
}: GameFormDialogProps) {
  const [form, setForm] = useState<GameInput>(emptyForm);

  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm, date: tomorrowDateValue() });
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.date || !form.startTime || !form.location.trim()) {
      return;
    }

    await onSubmit({
      ...form,
      title: form.title?.trim() || undefined,
      location: form.location.trim(),
      notes: form.notes?.trim() || undefined,
      maxPlayers: form.maxPlayers || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Create game</h2>
            <p className="text-sm text-muted-foreground">
              New games are listed as upcoming until they have been played.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="game-title">Title (optional)</Label>
            <Input
              id="game-title"
              value={form.title ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Friday kickabout"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="game-date">Date</Label>
              <Input
                id="game-date"
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date: event.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="game-time">Start time</Label>
              <Input
                id="game-time"
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="game-location">Location</Label>
            <Input
              id="game-location"
              value={form.location}
              onChange={(event) =>
                setForm((current) => ({ ...current, location: event.target.value }))
              }
              placeholder="Office Field"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="game-duration">Duration (minutes)</Label>
              <Input
                id="game-duration"
                type="number"
                min={10}
                max={180}
                value={form.matchDurationMinutes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    matchDurationMinutes: Number(event.target.value) || 90,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="game-max-players">Max players (optional)</Label>
              <Input
                id="game-max-players"
                type="number"
                min={0}
                value={form.maxPlayers ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    maxPlayers: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="game-notes">Notes</Label>
            <Input
              id="game-notes"
              value={form.notes ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Bring both kits"
            />
          </div>

          {errorMessage && <p className="error-text">{errorMessage}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !form.date || !form.startTime || !form.location.trim()}
            >
              {saving ? "Saving..." : "Create game"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
