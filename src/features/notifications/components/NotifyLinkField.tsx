import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGames } from "@/features/games/game.hooks";
import {
  gameDetailPath,
  isAppNotificationPath,
  normalizeAppPath,
  NOTIFY_LINK_PRESETS,
  parseGameIdFromPath,
} from "@/features/notifications/notification.constants";
import {
  formatGameDate,
  formatGameTime,
  GAME_STATUS_LABELS,
  getGameListBadge,
  type Game,
} from "@/types/game";

function gameOptionLabel(game: Game) {
  const status = GAME_STATUS_LABELS[getGameListBadge(game)];
  const when = `${formatGameDate(game)} · ${formatGameTime(game.startTime)}`;

  if (game.title?.trim()) {
    return `${game.title.trim()} · ${when} · ${status}`;
  }

  return `${game.location} · ${when} · ${status}`;
}

export function NotifyLinkField({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const { games, loading } = useGames();
  const path = normalizeAppPath(value);
  const selectedGameId = parseGameIdFromPath(path);
  const linkGames = games.filter((game) => game.status !== "cancelled");
  const selectedGame = linkGames.find((game) => game.id === selectedGameId);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Link</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        placeholder="/games"
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex flex-wrap gap-1.5">
        {NOTIFY_LINK_PRESETS.map((preset) => (
          <Button
            key={preset.path}
            type="button"
            variant={path === preset.path ? "default" : "outline"}
            size="xs"
            disabled={disabled}
            onClick={() => onChange(preset.path)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <Select
        value={selectedGameId || "unset"}
        onValueChange={(next) => {
          if (!next || next === "unset") {
            onChange("/games");
            return;
          }

          onChange(gameDetailPath(next));
        }}
      >
        <SelectTrigger className="w-full" disabled={disabled || loading}>
          <SelectValue placeholder={loading ? "Loading games..." : "Select a game"}>
            {selectedGame
              ? gameOptionLabel(selectedGame)
              : selectedGameId
                ? path
                : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unset">No specific game</SelectItem>
          {selectedGameId && !selectedGame ? (
            <SelectItem value={selectedGameId}>{path}</SelectItem>
          ) : null}
          {linkGames.map((game) => (
            <SelectItem key={game.id} value={game.id}>
              {gameOptionLabel(game)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {selectedGameId
          ? "Players open this match when they tap the notification."
          : "Players open this page when they tap the notification. Pick a game to send them to its details."}
        {path && !isAppNotificationPath(path)
          ? " Link must be an app path like /games or /games/…"
          : ""}
      </p>
    </div>
  );
}
