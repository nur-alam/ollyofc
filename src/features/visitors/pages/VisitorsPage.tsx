import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { DeviceBreakdown, VisitorList } from "@/features/visitors/components/VisitorList";
import { formatDayHeading } from "@/features/visitors/format";
import {
  useAllTimeVisitorCount,
  useDaySummary,
  useDayVisitors,
  useLiveVisitors,
  useVisitorCalendar,
  useVisitorDates,
} from "@/features/visitors/visitor.hooks";
import {
  deleteVisitorDay,
  deleteVisitorHistory,
  visitorHistoryCutoffYmd,
} from "@/features/visitors/visitor.service";
import { getErrorMessage } from "@/lib/errors";
import {
  BANGLADESH_TIME_ZONE,
  bangladeshDateTimeToUtc,
  formatYmd,
  getBangladeshParts,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  hint,
  live,
}: {
  label: string;
  value: string;
  hint?: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {live ? (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
        ) : null}
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function VisitorsPage() {
  const { today, yesterday } = useVisitorDates();
  const [selectedDate, setSelectedDate] = useState(yesterday);
  const { visitors: liveVisitors, loading: liveLoading, errorMessage: liveError } =
    useLiveVisitors();
  const { visitors: dayVisitors, loading: dayLoading, errorMessage: dayError } =
    useDayVisitors(selectedDate);
  const { summary: todaySummary } = useDaySummary(today);
  const { summary: yesterdaySummary } = useDaySummary(yesterday);
  const {
    count: allTimeVisitors,
    loading: allTimeLoading,
    errorMessage: allTimeError,
  } = useAllTimeVisitorCount();
  const {
    days,
    datesWithVisits,
    loading: calendarLoading,
    errorMessage: calendarError,
  } = useVisitorCalendar();
  const [deleteTarget, setDeleteTarget] = useState<"day" | "all" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const todayParts = getBangladeshParts();
  const selected = bangladeshDateTimeToUtc(selectedDate, "12:00");
  const visitDates = useMemo(
    () => datesWithVisits.map((ymd) => bangladeshDateTimeToUtc(ymd, "12:00")),
    [datesWithVisits],
  );

  const selectedLabel =
    selectedDate === today
      ? "Today"
      : selectedDate === yesterday
        ? "Yesterday"
        : formatDayHeading(selectedDate);
  const historyCutoff = visitorHistoryCutoffYmd(today);
  const selectedDayExists = days.some((day) => day.date === selectedDate);
  const canDeleteDay =
    !dayLoading && !calendarLoading && (dayVisitors.length > 0 || selectedDayExists);
  const canDeleteHistory =
    !calendarLoading && days.some((day) => day.date < historyCutoff);

  const handleDelete = async () => {
    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);

    try {
      if (deleteTarget === "day") {
        await deleteVisitorDay(selectedDate);
        toast.success("Visitor history for this day deleted");
      } else {
        const removed = await deleteVisitorHistory();
        toast.success(
          removed > 0
            ? "Visitor history older than 7 days deleted"
            : "No visitor history older than 7 days",
        );
      }

      setDeleteTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete visitor history."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visitors</h1>
          <p className="text-muted-foreground">
            Live traffic, an all-time total, and any day from the calendar.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canDeleteHistory || deleting}
          title={
            calendarLoading || canDeleteHistory ? undefined : "Nothing older than 7 days"
          }
          onClick={() => setDeleteTarget("all")}
        >
          Delete history
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="All time"
          value={allTimeLoading ? "—" : String(allTimeVisitors ?? 0)}
          hint="Each browser, counted once"
        />
        <StatCard
          label="Live now"
          value={liveLoading ? "—" : String(liveVisitors.length)}
          hint="Open in this tab right now"
          live={!liveLoading && liveVisitors.length > 0}
        />
        <StatCard
          label="Today"
          value={String(todaySummary?.uniqueVisitors ?? 0)}
          hint={`${todaySummary?.signedIn ?? 0} signed in · ${todaySummary?.guests ?? 0} guests`}
        />
        <StatCard
          label="Yesterday"
          value={String(yesterdaySummary?.uniqueVisitors ?? 0)}
          hint={`${yesterdaySummary?.pageViews ?? 0} page views`}
        />
      </div>

      {liveError || allTimeError ? (
        <p className="error-text">{liveError || allTimeError}</p>
      ) : null}

      <section className="rounded-xl border bg-background shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">Live now</h2>
            <p className="text-sm text-muted-foreground">Updates as people open or leave the site.</p>
          </div>
        </div>
        <VisitorList
          visitors={liveVisitors}
          loading={liveLoading}
          empty="Nobody is on the site right now."
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <section className="rounded-xl border bg-background p-3 shadow-sm">
          <div className="mb-3 flex gap-2 px-1">
            <Button
              type="button"
              size="sm"
              variant={selectedDate === yesterday ? "default" : "outline"}
              onClick={() => setSelectedDate(yesterday)}
            >
              Yesterday
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedDate === today ? "default" : "outline"}
              onClick={() => setSelectedDate(today)}
            >
              Today
            </Button>
          </div>
          <Calendar
            mode="single"
            timeZone={BANGLADESH_TIME_ZONE}
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            startMonth={new Date(todayParts.year - 1, 0)}
            endMonth={new Date(todayParts.year, todayParts.month - 1)}
            disabled={{ after: bangladeshDateTimeToUtc(today, "23:59") }}
            modifiers={{ hasVisits: visitDates }}
            modifiersClassNames={{
              hasVisits:
                "after:absolute after:bottom-1 after:left-1/2 after:size-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary",
            }}
            onSelect={(date) => {
              if (!date) {
                return;
              }

              setSelectedDate(formatYmd(getBangladeshParts(date)));
            }}
          />
        </section>

        <section className="rounded-xl border bg-background shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold">{selectedLabel}</h2>
              <p className="text-sm text-muted-foreground">
                {formatDayHeading(selectedDate)}
                {dayVisitors.length
                  ? ` · ${dayVisitors.length} visitor${dayVisitors.length === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canDeleteDay || deleting}
              onClick={() => setDeleteTarget("day")}
            >
              Delete day
            </Button>
          </div>
          {calendarError || dayError ? (
            <p className={cn("error-text px-4 pt-3")}>{calendarError || dayError}</p>
          ) : null}
          <div className="pt-3">
            <DeviceBreakdown visitors={dayVisitors} />
          </div>
          <VisitorList
            visitors={dayVisitors}
            loading={dayLoading}
            empty="No visitors recorded for this day."
          />
        </section>
      </div>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!deleting) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">
              {deleteTarget === "day" ? "Delete this day" : "Delete visitor history"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {deleteTarget === "day"
                ? `Delete visitor history for ${formatDayHeading(selectedDate)}? That day's list and totals will be removed. The all-time count stays. People on the site right now stay in Live now. This cannot be undone.`
                : `Delete visitor history from before 7 days ago? Days before ${formatDayHeading(historyCutoff)} will be removed. That day and every later day stay. The all-time count stays. People on the site right now stay in Live now. This cannot be undone.`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
