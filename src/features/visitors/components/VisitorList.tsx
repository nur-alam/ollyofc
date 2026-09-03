import {
  GlobeIcon,
  LaptopIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { VisitorRecord } from "@/features/visitors/visitor.types";
import { isVisitorLive } from "@/features/visitors/visitor.service";
import {
  formatVisitorLocation,
  formatVisitorRelative,
  formatVisitorTime,
} from "@/features/visitors/format";
import { cn } from "@/lib/utils";

function DeviceIcon({ device }: { device: string }) {
  if (device === "iPhone" || device === "Android" || device === "Mobile") {
    return <SmartphoneIcon className="size-3.5" />;
  }

  if (device === "iPad") {
    return <TabletIcon className="size-3.5" />;
  }

  if (device === "Mac" || device === "Windows" || device === "Linux" || device === "ChromeOS") {
    return <LaptopIcon className="size-3.5" />;
  }

  return <MonitorIcon className="size-3.5" />;
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function VisitorRow({ visitor }: { visitor: VisitorRecord }) {
  const live = isVisitorLive(visitor);
  const name = visitor.displayName || "Guest";
  const location = formatVisitorLocation(visitor);
  const signedIn = Boolean(visitor.userId);

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="relative shrink-0">
        <Avatar>
          <AvatarImage src={visitor.photoURL || undefined} alt={name} />
          <AvatarFallback>{signedIn ? initials(name) : "?"}</AvatarFallback>
        </Avatar>
        {live ? (
          <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{name}</p>
          {live ? (
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Live
            </Badge>
          ) : null}
          {signedIn ? null : (
            <Badge variant="outline">Guest</Badge>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <DeviceIcon device={visitor.device} />
            {visitor.device}
            {visitor.isPwa ? " · App" : ""}
          </span>
          {location ? (
            <span className="inline-flex items-center gap-1">
              <GlobeIcon className="size-3.5" />
              {location}
            </span>
          ) : null}
          {visitor.ip ? <span className="font-mono">{visitor.ip}</span> : null}
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {visitor.pageLabel}
          {visitor.lastSeenAtMs
            ? ` · ${formatVisitorTime(visitor.lastSeenAtMs)} · ${formatVisitorRelative(visitor.lastSeenAtMs)}`
            : null}
        </p>
      </div>
    </li>
  );
}

export function VisitorList({
  visitors,
  loading,
  empty,
}: {
  visitors: VisitorRecord[];
  loading?: boolean;
  empty: string;
}) {
  if (loading) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading visitors...</p>
    );
  }

  if (!visitors.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">{empty}</p>
    );
  }

  return (
    <ul className={cn("divide-y")}>
      {visitors.map((visitor) => (
        <VisitorRow key={visitor.id} visitor={visitor} />
      ))}
    </ul>
  );
}

export function DeviceBreakdown({ visitors }: { visitors: VisitorRecord[] }) {
  if (!visitors.length) {
    return null;
  }

  const counts = new Map<string, number>();

  for (const visitor of visitors) {
    counts.set(visitor.device, (counts.get(visitor.device) ?? 0) + 1);
  }

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {[...counts.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([device, count]) => (
          <Badge key={device} variant="outline" className="gap-1 font-normal">
            <DeviceIcon device={device} />
            {device}
            <span className="tabular-nums text-muted-foreground">{count}</span>
          </Badge>
        ))}
    </div>
  );
}
