import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GAME_STATUS_LABELS, type GameStatus } from "@/types/game";

const statusStyles: Record<GameStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  upcoming: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  completed: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

export function GameStatusBadge({
  status,
  className,
}: {
  status: GameStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-semibold", statusStyles[status], className)}
    >
      {GAME_STATUS_LABELS[status]}
    </Badge>
  );
}
