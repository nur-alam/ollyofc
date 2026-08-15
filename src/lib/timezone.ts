export const BANGLADESH_TIME_ZONE = "Asia/Dhaka";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatYmd(parts: Pick<DateParts, "year" | "month" | "day">) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getBangladeshParts(date = new Date()): DateParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGLADESH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const values = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

export function bangladeshTodayYmd(date = new Date()) {
  return formatYmd(getBangladeshParts(date));
}

export function addCalendarDays(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));

  return formatYmd({
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  });
}

export function bangladeshTomorrowYmd(date = new Date()) {
  return addCalendarDays(bangladeshTodayYmd(date), 1);
}

export function parseYmd(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);

  return {
    year,
    month,
    day,
  };
}

/** Asia/Dhaka is UTC+6 year-round (no DST). */
export function bangladeshDateTimeToUtc(ymd: string, time: string) {
  const { year, month, day } = parseYmd(ymd);
  const [hours, minutes] = time.split(":").map(Number);

  return new Date(
    Date.UTC(year, month - 1, day, (hours || 0) - 6, minutes || 0, 0, 0),
  );
}

export function formatBangladeshDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGLADESH_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatBangladeshClock(hours: number, minutes: number) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, hours, minutes)));
}
