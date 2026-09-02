import { useState } from "react";

import { NotifyAllPanel } from "@/features/notifications/components/NotifyAllPanel";
import { NotifyLeaderboardPanel } from "@/features/notifications/components/NotifyLeaderboardPanel";
import { NotifyUsersPanel } from "@/features/notifications/components/NotifyUsersPanel";
import { usePushSubscribers } from "@/features/notifications/notification.hooks";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "all", label: "Notify All" },
  { id: "leaderboard", label: "Notify Leaderboard" },
  { id: "users", label: "Notify Users" },
] as const;

type NotifyTab = (typeof TABS)[number]["id"];

export function NotificationPage() {
  const [tab, setTab] = useState<NotifyTab>("all");
  const { subscribers, peopleCount, deviceCount, loading, errorMessage } =
    usePushSubscribers();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Send a push to everyone, share a leaderboard update, or message
          specific players.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Notification type"
        className="grid grid-cols-3 gap-1 rounded-xl border bg-background p-1 shadow-sm"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn(
              "cursor-pointer rounded-lg px-2 py-2 text-center text-xs font-medium leading-tight transition-colors sm:text-sm",
              tab === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "all" ? (
        <NotifyAllPanel
          subscribers={subscribers}
          peopleCount={peopleCount}
          deviceCount={deviceCount}
          loading={loading}
          errorMessage={errorMessage}
        />
      ) : null}

      {tab === "leaderboard" ? (
        <NotifyLeaderboardPanel peopleCount={peopleCount} loading={loading} />
      ) : null}

      {tab === "users" ? (
        <NotifyUsersPanel
          subscribers={subscribers}
          loading={loading}
          errorMessage={errorMessage}
        />
      ) : null}
    </div>
  );
}
