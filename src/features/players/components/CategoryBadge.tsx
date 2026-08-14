import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  type PlayerCategory,
} from "@/types/player";

const categoryStyles: Record<PlayerCategory, string> = {
  A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  B: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  C: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  GK: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
};

export function CategoryBadge({
  category,
  className,
}: {
  category: PlayerCategory;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-semibold", categoryStyles[category], className)}
    >
      {category}
      <span className="hidden sm:inline"> · {CATEGORY_LABELS[category]}</span>
    </Badge>
  );
}
